"""CPU integration tests for the actual native runners' process ownership.

Compiler metadata is stubbed. The fixture's Python cold startup has a bounded
test-only ready barrier before the production wait budget. Real Python parents,
children and grandchildren receive real OS signals; no host or GPU runs.
"""

import errno
import json
import os
from pathlib import Path
import shlex
import signal
import subprocess
import sys
import tempfile
import time
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]


def running(pid):
    result = subprocess.run(
        ["ps", "-p", str(pid), "-o", "stat="], capture_output=True, text=True
    )
    return result.returncode == 0 and bool(result.stdout.strip()) and not result.stdout.lstrip().startswith("Z")


@unittest.skipUnless(os.name == "posix", "Native probe process-group cleanup requires POSIX")
class NativeRunnerOwnershipTest(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="folia-owned-process-")
        self.addCleanup(self.temporary.cleanup)
        self.directory = Path(self.temporary.name)
        self.marker = self.directory / "processes"
        self.marker.mkdir()
        self.output = self.directory / "output"
        self.qt = self.directory / "qt"
        (self.qt / "bin").mkdir(parents=True)
        (self.qt / "libexec").mkdir()
        self.build = self.directory / "build"
        self.build.mkdir()
        self.tools = self.directory / "tools"
        self.tools.mkdir()
        self.cpu = self.directory / "cpu-process.py"
        self.cpu.write_text(
            f"#!{sys.executable}\n"
            "import json, os, pathlib, signal, subprocess, sys, time\n"
            "time.sleep(float(os.environ.get('FOLIA_CPU_PROCESS_STARTUP_DELAY', '0')))\n"
            "directory = pathlib.Path(os.environ['FOLIA_CPU_PROCESS_DIRECTORY'])\n"
            "role = sys.argv[1] if len(sys.argv) == 2 and sys.argv[1] in ('child', 'grandchild') else 'parent'\n"
            "(directory / role).write_text(json.dumps({'pid': os.getpid(), 'pgid': os.getpgrp()}))\n"
            "if role != 'parent': signal.signal(signal.SIGTERM, signal.SIG_IGN)\n"
            "if role != 'grandchild': subprocess.Popen([sys.executable, __file__, 'child' if role == 'parent' else 'grandchild'])\n"
            "if role == 'parent':\n"
            "    while not (directory / 'grandchild').exists(): time.sleep(.005)\n"
            "    print('CPU parent and grandchild started', flush=True)\n"
            "    (directory / 'ready').write_text('ready')\n"
            "    if os.environ['FOLIA_CPU_PROCESS_CASE'] == 'normal': sys.exit(0)\n"
            "time.sleep(60)\n"
        )
        self.cpu.chmod(0o755)
        compiler = self.tools / "compiler"
        compiler.write_text(
            f"#!{sys.executable}\n"
            "import os, pathlib, shutil, sys\n"
            "destination = pathlib.Path(sys.argv[sys.argv.index('-o') + 1])\n"
            "if '-c' in sys.argv: destination.write_bytes(b'CPU metadata fixture, not a native object')\n"
            f"else: shutil.copyfile({str(self.cpu)!r}, destination); destination.chmod(0o755)\n"
        )
        compiler.chmod(0o755)
        moc = self.qt / "libexec/moc"
        moc.write_text(
            f"#!{sys.executable}\nimport pathlib, sys\n"
            "pathlib.Path(sys.argv[sys.argv.index('-o') + 1]).write_text('// CPU fixture only')\n"
        )
        moc.chmod(0o755)
        ninja = self.tools / "ninja"
        ninja.write_text(
            f"#!{sys.executable}\n"
            f"print({(': && ' + shlex.quote(str(compiler)) + ' -o unused && :')!r})\n"
        )
        ninja.chmod(0o755)
        # The three fixture interpreters can exceed .6s while npm tests compete
        # for CPU. Complete this test preparation before handing Popen back to
        # the runner, retaining its real .6s wait/timeout and every OS process.
        # Production timeout semantics still include normal executable startup;
        # only this synthetic fixture has the separate, bounded ready barrier.
        (self.tools / "sitecustomize.py").write_text(
            "import json,os,pathlib,subprocess,time\n"
            "_original_popen = subprocess.Popen\n"
            "def _fixture_popen(*args, **kwargs):\n"
            "    process = _original_popen(*args, **kwargs)\n"
            "    environment = kwargs.get('env') or os.environ\n"
            "    directory = environment.get('FOLIA_CPU_PROCESS_DIRECTORY')\n"
            "    if kwargs.get('start_new_session') and directory:\n"
            "        directory = pathlib.Path(directory)\n"
            "        started = time.monotonic()\n"
            "        deadline = started + 5\n"
            "        while not (directory / 'ready').exists() and time.monotonic() < deadline:\n"
            "            if process.poll() is not None: break\n"
            "            time.sleep(.005)\n"
            "        (directory / 'fixture-startup.json').write_text(json.dumps({\n"
            "            'ready': (directory / 'ready').exists(), 'pid': process.pid,\n"
            "            'elapsedSeconds': time.monotonic() - started, 'maxWaitSeconds': 5}))\n"
            "    return process\n"
            "subprocess.Popen = _fixture_popen\n"
        )
        source = self.directory / "host/app/plugins/PluginRuntimeAppearance.cpp"
        (self.build / "compile_commands.json").write_text(json.dumps([
            {"file": str(source), "command": shlex.join([str(compiler), "-o", "unused", "-c", str(source)])},
            {"file": str(self.directory / "SongCatalogModel.cpp"), "command": "unused"},
        ]))
        self.environment = {
            **os.environ,
            "PATH": str(self.tools) + os.pathsep + os.environ["PATH"],
            "PYTHONPATH": str(self.tools) + os.pathsep + os.environ.get("PYTHONPATH", ""),
            "FOLIA_CPU_PROCESS_DIRECTORY": str(self.marker),
        }
        # A separate session is outside the runner's ownership even though it
        # uses the same Python executable and runs alongside every scenario.
        self.unowned = subprocess.Popen(
            [sys.executable, "-c", "import time; time.sleep(60)"],
            start_new_session=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        self.addCleanup(self.cleanup_unowned)
        self.addCleanup(self.cleanup_processes)

    def cleanup_unowned(self):
        if self.unowned.poll() is None:
            self.unowned.kill()
        self.unowned.wait(timeout=3)

    def cleanup_processes(self):
        # Cleanup also makes the intentionally RED old runner safe to execute.
        for name in ("parent", "child", "grandchild"):
            path = self.marker / name
            if path.exists():
                try:
                    os.kill(json.loads(path.read_text())["pid"], signal.SIGKILL)
                except ProcessLookupError:
                    pass

    def command(self, runner, timeout):
        command = [
            sys.executable, str(ROOT / "scripts" / runner),
            "--host-build", str(self.build), "--qt-bin", str(self.qt / "bin"),
            "--output-dir", str(self.output), "--platform", "offscreen",
            "--timeout", str(timeout),
        ]
        if runner == "test-folia-host.py":
            command += ["--package", str(self.directory / "not-a-plugin")]
        else:
            command += ["--input", str(self.directory / "not-a-qml-test")]
        return command

    def record_directory(self, runner):
        return self.output / "offscreen" if runner == "test-folia-host.py" else self.output

    def exercise(self, runner, case, interrupt=None):
        environment = {**self.environment, "FOLIA_CPU_PROCESS_CASE": case}
        process = subprocess.Popen(
            self.command(runner, .6 if interrupt is None else 10),
            env=environment, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
            text=True,
        )
        self.addCleanup(lambda: process.poll() is None and process.kill())
        if interrupt is not None:
            deadline = time.monotonic() + 5
            while not (self.marker / "ready").exists() and process.poll() is None and time.monotonic() < deadline:
                time.sleep(.01)
            self.assertTrue((self.marker / "ready").exists())
            process.send_signal(interrupt)
        stdout, _ = process.communicate(timeout=8)
        self.assertTrue((self.marker / "ready").exists(), stdout)
        startup = json.loads((self.marker / "fixture-startup.json").read_text())
        self.assertTrue(startup["ready"])
        self.assertEqual(startup["maxWaitSeconds"], 5)
        if "FOLIA_CPU_PROCESS_STARTUP_DELAY" in environment:
            self.assertGreaterEqual(
                startup["elapsedSeconds"], 3 * float(environment["FOLIA_CPU_PROCESS_STARTUP_DELAY"])
            )
        identities = {name: json.loads((self.marker / name).read_text()) for name in ("parent", "child", "grandchild")}
        self.assertFalse([name for name, row in identities.items() if running(row["pid"])], stdout)
        self.assertEqual({row["pgid"] for row in identities.values()}, {identities["parent"]["pid"]})
        self.assertNotEqual(identities["parent"]["pgid"], os.getpgrp())
        evidence = self.record_directory(runner)
        self.assertIn("CPU parent and grandchild started", (evidence / "acceptance.log").read_text())
        record = json.loads((evidence / "execution.json").read_text())
        self.assertEqual(record["timeoutSeconds"], .6 if interrupt is None else 10)
        if interrupt is not None:
            self.assertEqual(process.returncode, 128 + interrupt, stdout)
            self.assertEqual(record["interruptedBySignal"], interrupt)
            self.assertFalse(record["timedOut"])
        elif case == "timeout":
            self.assertEqual(process.returncode, 124, stdout)
            self.assertTrue(record["timedOut"])
        else:
            self.assertEqual(process.returncode, 0, stdout)
            self.assertFalse(record["timedOut"])
            self.assertEqual(record["exitCode"], 0)
        self.assertTrue(record["processGroupCleanup"]["killSent"])
        self.assertIsNone(self.unowned.poll(), "Cleanup crossed into a separately owned session")

    def test_host_timeout_cleans_real_descendants(self):
        self.exercise("test-folia-host.py", "timeout")

    def test_host_timeout_after_bounded_slow_fixture_startup(self):
        self.environment["FOLIA_CPU_PROCESS_STARTUP_DELAY"] = ".25"
        self.exercise("test-folia-host.py", "timeout")

    def test_host_normal_exit_cleans_descendants_that_hold_stdout(self):
        self.exercise("test-folia-host.py", "normal")

    def test_host_sigterm_preserves_partial_evidence_and_cleans(self):
        self.exercise("test-folia-host.py", "interrupt", signal.SIGTERM)

    def test_host_sigint_preserves_partial_evidence_and_cleans(self):
        self.exercise("test-folia-host.py", "interrupt", signal.SIGINT)

    def test_qml_timeout_cleans_real_descendants(self):
        self.exercise("test-folia-native-qml.py", "timeout")

    def test_qml_normal_exit_cleans_descendants_that_hold_stdout(self):
        self.exercise("test-folia-native-qml.py", "normal")

    def test_qml_sigterm_preserves_partial_evidence_and_cleans(self):
        self.exercise("test-folia-native-qml.py", "interrupt", signal.SIGTERM)

    def test_qml_sigint_preserves_partial_evidence_and_cleans(self):
        self.exercise("test-folia-native-qml.py", "interrupt", signal.SIGINT)

    def test_qml_rejects_invalid_runtime_limit_before_compilation(self):
        for timeout in ("0", "-1", "nan", "inf"):
            result = subprocess.run(self.command("test-folia-native-qml.py", timeout), capture_output=True, text=True)
            self.assertEqual(result.returncode, 2)
            self.assertIn("finite positive", result.stderr)
        self.assertFalse(self.output.exists())


@unittest.skipUnless(os.name == "posix", "Owned process-group observations require POSIX")
class OwnedGroupObservationTest(unittest.TestCase):
    def setUp(self):
        sys.path.insert(0, str(ROOT / "scripts"))
        import folia_owned_process
        self.addCleanup(sys.path.remove, str(ROOT / "scripts"))
        self.owned = folia_owned_process
        self.temporary = tempfile.TemporaryDirectory(prefix="folia-owned-observation-")
        self.addCleanup(self.temporary.cleanup)
        self.directory = Path(self.temporary.name)
        self.child_marker = self.directory / "child.pid"
        child = (
            "import os,pathlib,signal,time; "
            "signal.signal(signal.SIGTERM,signal.SIG_IGN); "
            f"pathlib.Path({str(self.child_marker)!r}).write_text(str(os.getpid())); "
            "time.sleep(60)"
        )
        parent = (
            "import pathlib,subprocess,sys,time\n"
            f"subprocess.Popen([sys.executable,'-c',{child!r}])\n"
            f"ready=pathlib.Path({str(self.child_marker)!r})\n"
            "deadline=time.monotonic()+5\n"
            "while not ready.exists() and time.monotonic()<deadline: time.sleep(.005)\n"
            "sys.exit(0 if ready.exists() else 2)\n"
        )
        self.process = subprocess.Popen(
            [sys.executable, "-c", parent], start_new_session=True,
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        self.addCleanup(self.cleanup_owned)
        self.assertEqual(self.process.wait(timeout=6), 0)
        self.assertTrue(self.child_marker.exists())
        self.child_pid = int(self.child_marker.read_text())
        self.unowned = subprocess.Popen(
            [sys.executable, "-c", "import time;time.sleep(60)"],
            start_new_session=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        self.addCleanup(self.cleanup_unowned)
        self.real_killpg = os.killpg
        self.calls = []

    def cleanup_owned(self):
        # Known fixture PID only, also protects intentionally RED implementations.
        if self.child_marker.exists():
            try:
                os.kill(int(self.child_marker.read_text()), signal.SIGKILL)
            except ProcessLookupError:
                pass
        if self.process.poll() is None:
            self.process.kill()
        self.process.wait(timeout=3)

    def cleanup_unowned(self):
        if self.unowned.poll() is None:
            self.unowned.kill()
        self.unowned.wait(timeout=3)

    def checked_call(self, pgid, action):
        self.assertEqual(pgid, self.process.pid, "Cleanup signalled a group it did not create")
        self.calls.append(action)

    def assert_sentinel_alive(self):
        self.assertIsNone(self.unowned.poll(), "Cleanup crossed into the unowned session")

    def test_transient_probe_eperm_retries_and_confirms_final_absence(self):
        probes = 0

        def killpg(pgid, action):
            nonlocal probes
            self.checked_call(pgid, action)
            if action == 0:
                probes += 1
                if probes <= 2:
                    raise PermissionError(errno.EPERM, "injected transient observation")
            return self.real_killpg(pgid, action)

        started = time.monotonic()
        with patch.object(self.owned.os, "killpg", side_effect=killpg):
            result = self.owned._retire_owned_group(self.process)
        self.assertLess(time.monotonic() - started, 2.5)
        self.assertFalse(result["groupPresentAfterCleanup"])
        self.assertTrue(result["killSent"])
        self.assertGreater(probes, 2)
        self.assertFalse(running(self.child_pid))
        self.assert_sentinel_alive()

    def test_term_signal_eperm_still_escalates_only_the_owned_group(self):
        def killpg(pgid, action):
            self.checked_call(pgid, action)
            if action == signal.SIGTERM:
                raise PermissionError(errno.EPERM, "injected TERM permission failure")
            return self.real_killpg(pgid, action)

        with patch.object(self.owned.os, "killpg", side_effect=killpg):
            result = self.owned._retire_owned_group(self.process)
        self.assertFalse(result["termSent"])
        self.assertTrue(result["killSent"])
        self.assertFalse(result["groupPresentAfterCleanup"])
        self.assertFalse(running(self.child_pid))
        self.assert_sentinel_alive()

    def test_persistent_probe_eperm_is_bounded_error_after_kill(self):
        def killpg(pgid, action):
            self.checked_call(pgid, action)
            if action == 0:
                raise PermissionError(errno.EPERM, "injected persistent unknown group state")
            return self.real_killpg(pgid, action)

        started = time.monotonic()
        with patch.object(self.owned.os, "killpg", side_effect=killpg):
            with self.assertRaises(PermissionError) as caught:
                self.owned._retire_owned_group(self.process)
        self.assertEqual(caught.exception.errno, errno.EPERM)
        self.assertLess(time.monotonic() - started, 2.5)
        self.assertIn(signal.SIGTERM, self.calls)
        self.assertIn(signal.SIGKILL, self.calls)
        self.assertFalse(running(self.child_pid))
        self.assert_sentinel_alive()

    def test_terminal_active_group_is_error_when_signal_calls_are_ineffective(self):
        def killpg(pgid, action):
            self.checked_call(pgid, action)
            return self.real_killpg(pgid, 0) if action == 0 else None

        started = time.monotonic()
        with patch.object(self.owned.os, "killpg", side_effect=killpg):
            with self.assertRaises(OSError) as caught:
                self.owned._retire_owned_group(self.process)
        self.assertEqual(caught.exception.errno, errno.EBUSY)
        self.assertLess(time.monotonic() - started, 2.5)
        self.assertTrue(running(self.child_pid))
        self.assert_sentinel_alive()

    def test_unknown_final_observation_preserves_partial_log_and_error_record(self):
        created = []
        real_popen = subprocess.Popen

        def popen(*args, **kwargs):
            self.assertTrue(kwargs["start_new_session"])
            process = real_popen(*args, **kwargs)
            created.append(process)
            return process

        def killpg(pgid, action):
            self.assertEqual(len(created), 1)
            self.assertEqual(pgid, created[0].pid)
            if action == 0:
                raise PermissionError(errno.EPERM, "injected final observation remains unknown")
            return self.real_killpg(pgid, action)

        with patch.object(self.owned.subprocess, "Popen", side_effect=popen), patch.object(
            self.owned.os, "killpg", side_effect=killpg
        ):
            with self.assertRaises(PermissionError):
                self.owned.run_owned_test(
                    [sys.executable, "-c", "print('partial before unknown cleanup',flush=True)"],
                    cwd=self.directory, env=os.environ, timeout=.6,
                    log_path=self.directory / "partial.log",
                    record_path=self.directory / "execution.json",
                )
        record = json.loads((self.directory / "execution.json").read_text())
        self.assertEqual(record["runnerExitCode"], 1)
        self.assertEqual(record["exitCode"], 0)
        self.assertEqual(record["error"]["type"], "PermissionError")
        self.assertIn("partial before unknown cleanup", (self.directory / "partial.log").read_text())
        self.assert_sentinel_alive()


if __name__ == "__main__":
    unittest.main()
