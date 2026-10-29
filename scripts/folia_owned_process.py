"""Run one native acceptance process and retire only its newly owned session.

Output goes straight to the evidence file: a surviving helper retaining stdout
must not make an already exited test appear to exceed its runtime deadline.
"""

import errno
import json
import os
from pathlib import Path
import signal
import subprocess
import time


class _Interrupted(Exception):
    pass


def _group_exists(pgid):
    try:
        os.killpg(pgid, 0)
        return True
    except ProcessLookupError:
        return False


def _retire_owned_group(process):
    # The caller created this exact pid == pgid using start_new_session=True.
    # Never infer another process group from a user-supplied pid or process name.
    pgid = process.pid
    result = {"pgid": pgid, "termSent": False, "killSent": False}
    started = time.monotonic()
    # Retain the existing .5s TERM + .5s KILL + 1s reap envelope. EPERM is
    # unknown, never evidence of absence, and cannot restart this budget.
    cleanup_deadline = started + 2
    observation_error = None

    def absent_until(deadline):
        nonlocal observation_error
        while True:
            process.poll()
            try:
                present = _group_exists(pgid)
            except PermissionError as caught:
                observation_error = caught
            else:
                observation_error = None
                if not present:
                    return True
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                return False
            time.sleep(min(.01, remaining))

    for action, field in ((signal.SIGTERM, "termSent"), (signal.SIGKILL, "killSent")):
        try:
            os.killpg(pgid, action)
            result[field] = True
        except ProcessLookupError:
            break
        except PermissionError:
            # Still observe and, if needed, attempt the next owned-group signal.
            pass
        if absent_until(min(time.monotonic() + .5, cleanup_deadline)):
            break
    process.wait(timeout=min(1, max(0, cleanup_deadline - time.monotonic())))
    # Always confirm after reaping: leader exit alone says nothing about helpers.
    if not absent_until(cleanup_deadline):
        if observation_error is not None:
            raise observation_error
        raise OSError(errno.EBUSY, f"Owned process group {pgid} remains after cleanup")
    result["groupPresentAfterCleanup"] = False
    result["elapsedSeconds"] = time.monotonic() - started
    return result


def run_owned_test(command, *, cwd, env, timeout, log_path, record_path):
    """Main-thread POSIX runner; preserve partial evidence on every exit path.

    Return a CompletedProcess with a shell-style runner status: 124 for timeout,
    128 + signal for interruption, otherwise the test's actual exit status.
    The execution record also retains the leader's unmodified exit code.
    """
    log_path, record_path = Path(log_path), Path(record_path)
    log_path.parent.mkdir(parents=True, exist_ok=True)
    record_path.parent.mkdir(parents=True, exist_ok=True)
    started = time.monotonic()
    process = None
    timed_out = False
    interrupted = None
    can_interrupt = False
    cleaning = False
    error = None
    cleanup = None
    process_seconds = 0
    old_handlers = {}

    def interrupt(signum, _frame):
        nonlocal interrupted
        if interrupted is None:
            interrupted = signum
        # Popen must finish assigning the owned handle before an interruption
        # can unwind its caller; otherwise a signal during spawn could orphan it.
        if can_interrupt and not cleaning:
            raise _Interrupted()

    try:
        for action in (signal.SIGTERM, signal.SIGINT):
            old_handlers[action] = signal.signal(action, interrupt)
        with log_path.open("wb") as output:
            try:
                process = subprocess.Popen(
                    command, cwd=cwd, env=env, start_new_session=True,
                    stdin=subprocess.DEVNULL, stdout=output, stderr=subprocess.STDOUT,
                )
                can_interrupt = True
                if interrupted is not None:
                    raise _Interrupted()
                process.wait(timeout=timeout)
            except subprocess.TimeoutExpired:
                timed_out = True
            except _Interrupted:
                pass
            except KeyboardInterrupt:
                interrupted = signal.SIGINT
            except Exception as caught:
                error = caught
            finally:
                process_seconds = time.monotonic() - started
                cleaning = True
                if process is not None:
                    try:
                        cleanup = _retire_owned_group(process)
                    except Exception as caught:
                        error = caught
    finally:
        for action, handler in old_handlers.items():
            signal.signal(action, handler)
    exit_code = process.returncode if process is not None else None
    if interrupted is not None:
        runner_status = 128 + interrupted
    elif timed_out:
        runner_status = 124
    elif error is not None:
        runner_status = 1
    else:
        runner_status = exit_code if exit_code >= 0 else 128 - exit_code
    record = {
        "timedOut": timed_out,
        "timeoutSeconds": timeout,
        "interruptedBySignal": interrupted,
        "elapsedSeconds": time.monotonic() - started,
        "processSeconds": process_seconds,
        "exitCode": exit_code,
        "runnerExitCode": runner_status,
        "processGroupCleanup": cleanup,
    }
    if error is not None:
        record["error"] = {"type": type(error).__name__, "message": str(error)}
    temporary = record_path.with_name(record_path.name + ".tmp")
    temporary.write_text(json.dumps(record, indent=2) + "\n")
    temporary.replace(record_path)
    stdout = log_path.read_text(encoding="utf-8", errors="replace")
    if error is not None:
        print(stdout, end="", flush=True)
        raise error
    return subprocess.CompletedProcess(command, runner_status, stdout)
