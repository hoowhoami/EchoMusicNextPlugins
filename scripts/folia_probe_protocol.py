"""CPU-only provenance and result validation shared by real native QA runners.

This module validates evidence, not rendering or GPU behavior. A passing JSON
protocol test never substitutes for running the compiled native probe.
"""

import hashlib
import json
import math
from pathlib import Path


def sha256(path):
    digest = hashlib.sha256()
    with Path(path).open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def input_hashes(paths):
    return {
        name: sha256(path) if Path(path).is_file() else None
        for name, path in paths.items()
    }


def build_record_path(executable):
    return Path(str(executable) + ".build.json")


def validate_build_record(executable, source):
    path = build_record_path(executable)
    record = json.loads(path.read_text())
    if (
        not isinstance(record, dict)
        or not isinstance(record.get("source"), dict)
        or not isinstance(record.get("executable"), dict)
    ):
        raise ValueError("Malformed native build sidecar")
    if (
        record.get("schemaVersion") != 1
        or record.get("producer") != "test-folia-host.py"
        or record.get("source", {}).get("path") != str(Path(source).resolve())
        or record.get("executable", {}).get("path")
        != str(Path(executable).resolve())
        or record["source"].get("sha256") != sha256(source)
        or record["executable"].get("sha256") != sha256(executable)
    ):
        raise ValueError("Native build sidecar does not bind this source and executable")
    return record


def validate_result(result, mode, scale, width, height, font, cycles):
    """Return concrete rejection reasons; malformed/legacy reports fail closed."""
    errors = []
    if not isinstance(result, dict):
        return ["Native result is missing or not an object"]
    expected = {
        "mode": mode,
        "logicalWidth": width,
        "logicalHeight": height,
        "primaryFont": font,
    }
    for key, value in expected.items():
        if result.get(key) != value:
            errors.append(f"Native result {key} differs")
    dpr = result.get("dpr")
    if (
        not isinstance(dpr, (int, float))
        or isinstance(dpr, bool)
        or not math.isfinite(dpr)
        or abs(dpr - scale) >= 0.01
    ):
        errors.append("Native DPR differs")
    validity = result.get("sampleValidity")
    if not isinstance(validity, dict):
        errors.append("Native sample validity proof is missing")
    else:
        if validity.get("schemaVersion") != 1 or validity.get("mode") != mode:
            errors.append("Native sample validity version/mode differs")
        for key in (
            "valid",
            "firstFrame",
            "seekAcknowledged",
            "readyAfterSeek",
            "readyAtSampleStart",
            "readyAtSampleEnd",
            "stablePresentationIdentity",
            "foregroundActive",
            "playbackPlaying",
            "errorFree",
        ):
            if validity.get(key) is not True:
                errors.append(f"Native sample validity {key} is not true")
        checks = validity.get("observerChecks")
        if not isinstance(checks, int) or isinstance(checks, bool) or checks < 2:
            errors.append("Native validity observers did not run")
        if validity.get("observerFailures") != []:
            errors.append("Native validity observers reported failure")
    wall = result.get("wallMs")
    if not isinstance(wall, (int, float)) or not math.isfinite(wall) or wall < 6000:
        errors.append("Native six-second steady sample is incomplete")
    intervals = result.get("presentedFrameIntervals")
    frames = intervals.get("count", 0) if isinstance(intervals, dict) else 0
    if not isinstance(frames, int) or isinstance(frames, bool) or frames <= 2:
        errors.append("Native presentation frames are missing")
    completed_cycles = result.get("repeatedSongOpenCloseCycles")
    if not isinstance(completed_cycles, list) or len(completed_cycles) != cycles:
        errors.append("Native requested lifecycle cycles are incomplete")
    return errors
