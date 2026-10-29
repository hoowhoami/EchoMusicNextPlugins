"""Protocol-only CPU regressions. No renderer, model or GPU results are simulated
as performance evidence: the temporary executable is explicitly a protocol stub.
"""

import errno
import importlib.util
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import tempfile
import time
import unittest
from unittest import mock

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from folia_probe_protocol import (  # noqa: E402
    build_record_path,
    sha256,
    validate_build_record,
    validate_result,
)


def report(mode="classic"):
    return {
        "mode": mode,
        "logicalWidth": 720,
        "logicalHeight": 480,
        "primaryFont": "PingFang SC",
        "dpr": 1,
        "wallMs": 6000,
        "presentedFrameIntervals": {"count": 300},
        "repeatedSongOpenCloseCycles": [],
        "sampleValidity": {
            "schemaVersion": 1,
            "valid": True,
            "mode": mode,
            "firstFrame": True,
            "seekAcknowledged": True,
            "readyAfterSeek": True,
            "readyAtSampleStart": True,
            "readyAtSampleEnd": True,
            "stablePresentationIdentity": True,
            "foregroundActive": True,
            "playbackPlaying": True,
            "errorFree": True,
            "observerChecks": 60,
            "observerFailures": [],
        },
    }


def performance_runner():
    spec = importlib.util.spec_from_file_location(
        "folia_performance_runner", ROOT / "scripts/measure-folia-performance.py"
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@unittest.skipUnless(os.name == "posix", "Owned process group cleanup requires POSIX")
class OwnedCleanupTest(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="folia-cleanup-")
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        marker = self.root / "owned.json"
        ready = self.root / "child-ready"
        child = (
            "import pathlib,signal,time;"
            "signal.signal(signal.SIGTERM,signal.SIG_IGN);"
            f"pathlib.Path({str(ready)!r}).write_text('ready');"
            "time.sleep(30)"
        )
        parent = (
            "import json,os,pathlib,subprocess,sys,time;"
            f"child=subprocess.Popen([sys.executable,'-c',{child!r}]);"
            f"pathlib.Path({str(marker)!r}).write_text(json.dumps({{'child':child.pid}}));"
            "time.sleep(30)"
        )
        self.process = subprocess.Popen(
            [sys.executable, "-c", parent], start_new_session=True,
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        self.unowned = subprocess.Popen(
            [sys.executable, "-c", "import time;time.sleep(30)"],
            start_new_session=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        self.child = None
        self.addCleanup(self.cleanup)
        deadline = time.monotonic() + 5
        while not ready.exists() and time.monotonic() < deadline:
            time.sleep(.01)
        self.assertTrue(ready.exists())
        self.child = json.loads(marker.read_text())["child"]
        self.assertEqual(os.getpgid(self.child), self.process.pid)
        self.assertNotEqual(os.getpgid(self.unowned.pid), self.process.pid)

    def running(self, pid):
        row = subprocess.run(
            ["ps", "-p", str(pid), "-o", "stat="], capture_output=True, text=True
        )
        return row.returncode == 0 and bool(row.stdout.strip()) and not row.stdout.lstrip().startswith("Z")

    def cleanup(self):
        for pid in (self.child, self.process.pid):
            if pid is not None and self.running(pid):
                try:
                    os.kill(pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
        self.process.wait(timeout=2)
        if self.unowned.poll() is None:
            self.unowned.kill()
        self.unowned.wait(timeout=2)

    def test_denied_group_probe_does_not_abandon_live_owned_children(self):
        runner = performance_runner()
        original = os.killpg
        calls = []
        denied = False

        def deny_once(pgid, action):
            nonlocal denied
            self.assertEqual(pgid, self.process.pid)
            calls.append(action)
            if action == 0 and not denied:
                denied = True
                raise PermissionError(errno.EPERM, "injected group observation race")
            return original(pgid, action)

        with mock.patch.object(runner.os, "killpg", side_effect=deny_once):
            runner.stop_probe(self.process)
        self.assertTrue(denied)
        self.assertIn(signal.SIGKILL, calls, "The TERM-resistant child must still be retired")
        self.assertFalse(self.running(self.child))
        self.assertIsNotNone(self.process.returncode)
        self.assertIsNone(self.unowned.poll(), "Cleanup crossed its owned process group")

    def test_unresolved_group_observation_is_an_error(self):
        runner = performance_runner()
        original = os.killpg

        def deny_observation(pgid, action):
            self.assertEqual(pgid, self.process.pid)
            if action == 0:
                raise PermissionError(errno.EPERM, "injected persistent observation failure")
            return original(pgid, action)

        with mock.patch.object(runner.os, "killpg", side_effect=deny_observation):
            with self.assertRaises(PermissionError):
                runner.stop_probe(self.process)
        self.assertIsNone(self.unowned.poll())

    def test_active_group_after_ineffective_kill_is_a_cleanup_error(self):
        runner = performance_runner()
        original = os.killpg
        denied = False
        kill_attempted = False

        def ineffective_kill(pgid, action):
            nonlocal denied, kill_attempted
            self.assertEqual(pgid, self.process.pid)
            if action == signal.SIGKILL:
                kill_attempted = True
                return
            if action == 0 and not denied:
                denied = True
                raise PermissionError(errno.EPERM, "injected transient observation failure")
            return original(pgid, action)

        with mock.patch.object(runner.os, "killpg", side_effect=ineffective_kill):
            with self.assertRaisesRegex(OSError, "remains"):
                runner.stop_probe(self.process)
        self.assertTrue(denied)
        self.assertTrue(kill_attempted)
        self.assertIsNotNone(self.process.returncode)
        self.assertTrue(self.running(self.child), "The real child makes the residual group observable")
        self.assertIsNone(self.unowned.poll())


class ResultProtocolTest(unittest.TestCase):
    def check_report(self, value):
        return validate_result(value, "classic", 1, 720, 480, "PingFang SC", 0)

    def test_protocol_fixture_has_all_required_proofs(self):
        self.assertEqual(self.check_report(report()), [])

    def test_fallback_bad_mode_unready_and_late_error_are_rejected(self):
        for key in (
            "firstFrame", "seekAcknowledged", "readyAfterSeek",
            "readyAtSampleStart", "readyAtSampleEnd", "stablePresentationIdentity",
            "playbackPlaying", "errorFree", "foregroundActive",
        ):
            value = report()
            value["sampleValidity"][key] = False
            self.assertTrue(self.check_report(value), key)
        self.assertTrue(self.check_report(report("native")))
        value = report()
        del value["sampleValidity"]
        self.assertTrue(self.check_report(value))
        value = report()
        value["sampleValidity"]["observerFailures"] = ["renderer retired"]
        self.assertTrue(self.check_report(value))

    def test_malformed_or_incomplete_reports_fail_closed(self):
        self.assertTrue(self.check_report(None))
        self.assertTrue(self.check_report([]))
        for field, value in (
            ("dpr", float("nan")), ("dpr", "1"), ("wallMs", 5999),
            ("presentedFrameIntervals", []),
            ("presentedFrameIntervals", {"count": True}),
            ("repeatedSongOpenCloseCycles", None),
        ):
            candidate = report()
            candidate[field] = value
            self.assertTrue(self.check_report(candidate), field)


@unittest.skipUnless(os.name == "posix", "Native performance probe process groups require POSIX")
class RunnerProtocolTest(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="folia-protocol-")
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name).resolve()
        self.executable = self.root / "protocol-stub"
        self.package = self.root / "protocol-package"
        self.package.write_text("Protocol fixture, never an echomod installation")
        self.source = ROOT / "tests/native/folia-performance.cpp"
        self.output = self.root / "evidence"

    def stub(self, body):
        self.executable.write_text(
            f"#!{sys.executable}\n"
            "# Protocol stub only; no native host or GPU executes.\n"
            "import json, os, pathlib, time\n"
            f"result = {report()!r}\n"
            "mode = os.environ['FOLIA_PERF_MODE']\n"
            "result['mode'] = result['sampleValidity']['mode'] = mode\n"
            "destination = pathlib.Path(os.environ['FOLIA_CAPTURE_DIR'])\n"
            + body
            + "\n"
        )
        self.executable.chmod(0o755)
        build_record_path(self.executable).write_text(json.dumps({
            "schemaVersion": 1,
            "producer": "test-folia-host.py",
            "source": {"path": str(self.source), "sha256": sha256(self.source)},
            "executable": {"path": str(self.executable), "sha256": sha256(self.executable)},
        }))

    def command(self, modes="classic"):
        return [
            sys.executable, str(ROOT / "scripts/measure-folia-performance.py"),
            "--executable", str(self.executable), "--package", str(self.package),
            "--output", str(self.output), "--modes", modes, "--scales", "1",
            "--repeats", "1", "--cycles", "0", "--timeout", "5",
        ]

    def summary(self):
        return json.loads((self.output / "summary.json").read_text())

    def test_exit_zero_fallback_is_failure_and_next_protocol_case_runs(self):
        self.stub(
            "if mode == 'classic': result['mode'] = 'native'\n"
            "(destination / ('performance-' + mode + '.json')).write_text(json.dumps(result))"
        )
        completed = subprocess.run(self.command("classic,still"), capture_output=True, text=True)
        self.assertEqual(completed.returncode, 1, completed.stdout + completed.stderr)
        summary = self.summary()
        self.assertTrue(summary["completed"])
        self.assertEqual([run["success"] for run in summary["runs"]], [False, True])
        for run in summary["runs"]:
            self.assertEqual(run["sha256Before"], run["sha256After"])
            self.assertIn("probeSource", run["sha256Before"])

    def test_exit_zero_unready_is_not_success(self):
        self.stub(
            "result['sampleValidity']['readyAfterSeek'] = False\n"
            "(destination / ('performance-' + mode + '.json')).write_text(json.dumps(result))"
        )
        completed = subprocess.run(self.command(), capture_output=True, text=True)
        self.assertEqual(completed.returncode, 1)
        self.assertFalse(self.summary()["runs"][0]["success"])

    def test_malformed_json_is_recorded_and_next_protocol_case_runs(self):
        self.stub(
            "text = '{broken' if mode == 'classic' else json.dumps(result)\n"
            "(destination / ('performance-' + mode + '.json')).write_text(text)"
        )
        completed = subprocess.run(self.command("classic,still"), capture_output=True, text=True)
        self.assertEqual(completed.returncode, 1)
        self.assertEqual([run["success"] for run in self.summary()["runs"]], [False, True])

    def test_mutation_invalidates_the_run_and_stale_build_record(self):
        self.stub(
            "with pathlib.Path(__file__).open('a') as target: target.write('# changed\\n')\n"
            "(destination / ('performance-' + mode + '.json')).write_text(json.dumps(result))"
        )
        completed = subprocess.run(self.command(), capture_output=True, text=True)
        self.assertEqual(completed.returncode, 1)
        summary = self.summary()
        self.assertFalse(summary["inputHashesUnchanged"]["executable"])
        self.assertFalse(summary["runs"][0]["success"])
        with self.assertRaises(ValueError):
            validate_build_record(self.executable, self.source)
        build_record_path(self.executable).write_text("[]")
        with self.assertRaisesRegex(ValueError, "Malformed"):
            validate_build_record(self.executable, self.source)

    def test_interrupt_keeps_partial_summary_and_end_hashes(self):
        self.stub("(destination / 'started').write_text('ready')\ntime.sleep(30)")
        process = subprocess.Popen(self.command(), stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        self.addCleanup(lambda: process.poll() is None and process.kill())
        marker = self.output / "r1-dpr1-classic/started"
        deadline = time.monotonic() + 5
        while not marker.exists() and process.poll() is None and time.monotonic() < deadline:
            time.sleep(0.01)
        self.assertTrue(marker.exists())
        process.send_signal(signal.SIGTERM)
        stdout, stderr = process.communicate(timeout=5)
        self.assertEqual(process.returncode, 128 + signal.SIGTERM, (stdout, stderr))
        summary = self.summary()
        self.assertFalse(summary["completed"])
        self.assertEqual(summary["interruptedBySignal"], signal.SIGTERM)
        self.assertEqual(len(summary["runs"]), 1)
        self.assertFalse(summary["runs"][0]["success"])
        self.assertEqual(summary["sha256End"], summary["runs"][0]["sha256After"])

    def test_cleanup_error_preserves_failed_run_and_end_hashes(self):
        self.stub(
            "(destination / ('performance-' + mode + '.json')).write_text(json.dumps(result))"
        )
        runner = performance_runner()
        original = runner.stop_probe

        def fail_after_owned_cleanup(process):
            original(process)
            raise PermissionError(errno.EPERM, "injected cleanup observation failure")

        with mock.patch.object(runner, "stop_probe", side_effect=fail_after_owned_cleanup):
            with mock.patch.object(sys, "argv", self.command("classic,still")[1:]):
                status = runner.main()
        self.assertEqual(status, 1)
        summary = self.summary()
        self.assertFalse(summary["completed"], "Unknown cleanup must not start the next mode")
        self.assertEqual(len(summary["runs"]), 1)
        self.assertFalse(summary["runs"][0]["success"])
        self.assertTrue(any("cleanup" in value for value in summary["runs"][0]["validationErrors"]))
        self.assertEqual(summary["sha256End"], summary["runs"][0]["sha256After"])

    def test_host_runner_rejects_invalid_timeout_before_build(self):
        for value in ("0", "-1", "nan", "inf"):
            completed = subprocess.run(
                [sys.executable, str(ROOT / "scripts/test-folia-host.py"),
                 "--host-build", str(self.root / "missing"),
                 "--qt-bin", str(self.root / "missing"),
                 "--package", str(self.package), "--timeout", value],
                capture_output=True, text=True,
            )
            self.assertEqual(completed.returncode, 2)
            self.assertIn("finite positive", completed.stderr)


if __name__ == "__main__":
    unittest.main()
