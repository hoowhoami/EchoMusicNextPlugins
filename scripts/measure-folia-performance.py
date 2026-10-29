#!/usr/bin/env python3
"""Run an already linked real Release probe, sequentially and without rebuilding.

The C++ probe owns the audio, lyrics, window, native CPU/footprint counters and
presentation samples. This runner isolates each process, records provenance and
observes helper processes. A failed mode is recorded and the next mode runs.
"""

import argparse
import errno
import json
import math
import os
from pathlib import Path
import platform
import signal
import subprocess
import time

from folia_probe_protocol import (
    build_record_path,
    input_hashes,
    validate_build_record,
    validate_result,
)

MODES = (
    "native",
    "classic",
    "cadenza",
    "partita",
    "tilt",
    "claddagh",
    "cappella",
    "monet",
    "pendolo",
    "fume",
    "tempera",
    "lumiere",
    "sonnet",
    "diorama",
    "still",
)


def stop_probe(process):
    """Retire only the process group created for this one probe, including helpers."""
    group_absent = False
    for action, grace in ((signal.SIGTERM, 1.0), (signal.SIGKILL, 1.0)):
        try:
            os.killpg(process.pid, action)
        except ProcessLookupError:
            break
        deadline = time.monotonic() + grace
        while time.monotonic() < deadline:
            process.poll()
            try:
                os.killpg(process.pid, 0)
            except ProcessLookupError:
                group_absent = True
                break
            except PermissionError:
                # macOS can deny this observation while the owned leader is
                # becoming a zombie. Unknown is not absent: keep the bounded
                # grace period and still escalate for any surviving helpers.
                pass
            time.sleep(0.02)
        if group_absent:
            break
    process.wait(timeout=1)
    try:
        os.killpg(process.pid, 0)
    except ProcessLookupError:
        return
    # A denied observation propagates; a successful observation of remaining
    # members is also a cleanup error, even when the owned leader was reaped.
    raise OSError(errno.EBUSY, f"Owned probe process group {process.pid} remains after cleanup")


def process_tree(root_pid):
    rows = {}
    output = subprocess.check_output(["ps", "-axo", "pid=,ppid=,rss=,comm="], text=True)
    for line in output.splitlines():
        values = line.split(None, 3)
        if len(values) == 4:
            pid, parent, rss, command = values
            rows[int(pid)] = (int(parent), int(rss) * 1024, command)
    selected = {root_pid} if root_pid in rows else set()
    while True:
        children = {pid for pid, row in rows.items() if row[0] in selected}
        if children <= selected:
            break
        selected.update(children)
    return {
        "rssSumBytes": sum(rows[pid][1] for pid in selected),
        "helperCount": max(0, len(selected) - 1),
        "helpers": sorted({rows[pid][2] for pid in selected if pid != root_pid}),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--executable", required=True, type=Path)
    parser.add_argument("--package", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--modes", default=",".join(MODES))
    parser.add_argument("--scales", default="1,2")
    parser.add_argument("--repeats", default=2, type=int)
    parser.add_argument("--cycles", default=3, type=int)
    parser.add_argument("--font", default="PingFang SC")
    parser.add_argument("--width", default=720, type=int)
    parser.add_argument("--height", default=480, type=int)
    # Four fresh whole-track preparations (initial + three song cycles) are
    # distinct from the six-second steady sample and retain their real cost.
    parser.add_argument("--timeout", default=240, type=float)
    args = parser.parse_args()
    executable, package = args.executable.resolve(), args.package.resolve()
    modes = args.modes.split(",")
    scales = [float(value) for value in args.scales.split(",")]
    if (
        not modes
        or set(modes) - set(MODES)
        or len(set(modes)) != len(modes)
        or not scales
        or any(scale not in (1, 1.5, 2) for scale in scales)
        or len(set(scales)) != len(scales)
        or args.repeats < 1
        or args.cycles < 0
        or args.cycles > 10
        or not math.isfinite(args.timeout)
        or args.timeout <= 0
        or not 320 <= args.width <= 4096
        or not 240 <= args.height <= 4096
    ):
        parser.error("Invalid modes, scales, repeat count or timeout")
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    summary_path = output / "summary.json"
    if summary_path.exists():
        parser.error("Choose a new output directory; existing evidence is retained")
    root = Path(__file__).resolve().parent.parent
    source = root / "tests/native/folia-performance.cpp"
    try:
        build_record = validate_build_record(executable, source)
    except (OSError, ValueError, KeyError, TypeError) as error:
        parser.error(f"Rebuild the native probe with test-folia-host.py: {error}")
    paths = {
        "executable": executable,
        "package": package,
        "probeSource": source,
        "runnerSource": Path(__file__).resolve(),
        "protocolSource": Path(__file__).with_name("folia_probe_protocol.py"),
        "buildRecord": build_record_path(executable),
    }
    hashes = input_hashes(paths)
    if any(value is None for value in hashes.values()):
        parser.error("A required probe input is missing")
    summary = {
        "platform": platform.platform(),
        "executable": str(executable),
        "package": str(package),
        "sha256": hashes,
        "buildRecord": build_record,
        "completed": False,
        "requestedRunCount": args.repeats * len(scales) * len(modes),
        "timeoutScope": "Per native process, not a whole-matrix deadline",
        "requestedLogicalViewport": {"width": args.width, "height": args.height},
        "helperMemoryScope": "250ms process-tree RSS sum; shared pages may be counted more than once; not physical footprint, driver memory or a guaranteed transient peak",
        "samplingInterference": "runner samples ps outside the measured process; native CPU excludes the runner but includes the native 4ms heartbeat, 100ms memory/validity checks and frame timestamp/vector/mutex work",
        "provenanceScope": "Build sidecar binds top-level source to executable. Every run records pre/post input hashes; coherent host libraries and transitive headers have separate build evidence. These hashes do not monitor every instant within a run.",
        "runs": [],
    }
    interrupted = 0

    def save_summary():
        summary["sha256End"] = input_hashes(paths)
        summary["inputHashesUnchanged"] = {
            name: summary["sha256End"][name] == value
            for name, value in hashes.items()
        }
        temporary = summary_path.with_suffix(".json.tmp")
        temporary.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n")
        temporary.replace(summary_path)

    def request_stop(signum, _frame):
        nonlocal interrupted
        interrupted = signum

    previous_handlers = {
        signum: signal.signal(signum, request_stop)
        for signum in (signal.SIGINT, signal.SIGTERM)
    }
    all_ok = True
    save_summary()
    try:
        for repeat in range(1, args.repeats + 1):
            # Each scale has its own native baseline in each repeat.
            for scale in scales:
                for mode in modes:
                    if interrupted:
                        summary["interruptedBySignal"] = interrupted
                        return 128 + interrupted
                    tag = f"r{repeat}-dpr{scale:g}-{mode}"
                    destination = output / tag
                    destination.mkdir()
                    environment = {
                        **os.environ,
                        "QT_QPA_PLATFORM": "cocoa",
                        "QSG_RHI_BACKEND": "metal",
                        "QT_SCALE_FACTOR": f"{scale:g}",
                        "FOLIA_PERF_MODE": mode,
                        "FOLIA_PERF_CYCLES": str(args.cycles),
                        "FOLIA_PERF_FONT": args.font,
                        "FOLIA_PERF_WIDTH": str(args.width),
                        "FOLIA_PERF_HEIGHT": str(args.height),
                        "FOLIA_TEST_PACKAGE": str(package),
                        "FOLIA_CAPTURE_DIR": str(destination),
                    }
                    environment.pop("FOLIA_PREVIEW_ONLY", None)
                    environment.pop("FOLIA_PREVIEW_STACK_PROBE", None)
                    before = input_hashes(paths)
                    started = time.monotonic()
                    peak_rss, peak_helpers, helpers = 0, 0, set()
                    timed_out = False
                    exit_code = None
                    result = None
                    errors = []
                    cleanup_failed = False
                    process = None
                    if before != hashes:
                        errors.append("Inputs changed before this run")
                    with (destination / "acceptance.log").open("w") as log:
                        try:
                            if not errors:
                                process = subprocess.Popen(
                                    [str(executable)],
                                    cwd=root,
                                    env=environment,
                                    stdout=log,
                                    stderr=subprocess.STDOUT,
                                    start_new_session=True,
                                )
                                while process.poll() is None:
                                    if interrupted:
                                        break
                                    if time.monotonic() - started > args.timeout:
                                        timed_out = True
                                        break
                                    tree = process_tree(process.pid)
                                    peak_rss = max(peak_rss, tree["rssSumBytes"])
                                    peak_helpers = max(peak_helpers, tree["helperCount"])
                                    helpers.update(tree["helpers"])
                                    time.sleep(0.25)
                        except (OSError, ValueError, subprocess.SubprocessError) as error:
                            errors.append(f"Probe execution failed: {error}")
                        finally:
                            if process is not None:
                                try:
                                    stop_probe(process)
                                except (OSError, subprocess.SubprocessError) as error:
                                    errors.append(f"Owned probe cleanup failed: {error}")
                                    cleanup_failed = True
                                exit_code = process.poll()
                    after = input_hashes(paths)
                    if after != before or after != hashes:
                        errors.append("Inputs changed during or after this run")
                    result_file = destination / f"performance-{mode}.json"
                    try:
                        if result_file.exists():
                            result = json.loads(result_file.read_text())
                    except (OSError, ValueError) as error:
                        errors.append(f"Native result cannot be read: {error}")
                    errors.extend(
                        validate_result(
                            result, mode, scale, args.width, args.height,
                            args.font, args.cycles,
                        )
                    )
                    success = (
                        exit_code == 0 and not timed_out and not interrupted and not errors
                    )
                    all_ok = all_ok and success
                    run = {
                        "tag": tag,
                        "repeat": repeat,
                        "requestedScale": scale,
                        "elapsedSeconds": time.monotonic() - started,
                        "exitCode": exit_code,
                        "timedOut": timed_out,
                        "interruptedBySignal": interrupted or None,
                        "sha256Before": before,
                        "sha256After": after,
                        "validationErrors": errors,
                        "success": success,
                        "sampledProcessTreeRssPeakBytes": peak_rss,
                        "sampledHelperCountPeak": peak_helpers,
                        "observedHelpers": sorted(helpers),
                        "result": result,
                    }
                    summary["runs"].append(run)
                    save_summary()
                    print(
                        f"{tag}: {'PASS' if success else 'FAIL'} ({run['elapsedSeconds']:.1f}s)",
                        flush=True,
                    )
                    if interrupted:
                        summary["interruptedBySignal"] = interrupted
                        return 128 + interrupted
                    if cleanup_failed:
                        return 1
        summary["completed"] = True
        return 0 if all_ok and all(summary["inputHashesUnchanged"].values()) else 1
    finally:
        save_summary()
        for signum, handler in previous_handlers.items():
            signal.signal(signum, handler)


if __name__ == "__main__":
    raise SystemExit(main())
