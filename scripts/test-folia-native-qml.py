#!/usr/bin/env python3
"""Run QML tests with actual static host modules, without changing its build tree."""

import argparse
import json
import math
import os
from pathlib import Path
import shlex
import shutil
import tempfile
import subprocess

from folia_owned_process import run_owned_test

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--host-build", required=True, type=Path)
parser.add_argument("--qt-bin", required=True, type=Path)
parser.add_argument("--input", required=True, type=Path)
parser.add_argument(
    "--plugin-root",
    type=Path,
    help="Run original QML tests against a built Folia package, including baked shaders",
)
parser.add_argument(
    "--output-dir", type=Path, help="Separate runner for parallel scoped tests"
)
parser.add_argument("--platform", choices=["offscreen", "cocoa"], default="cocoa")
parser.add_argument(
    "--timeout",
    type=float,
    default=300,
    help="Positive total test-process limit in seconds",
)
parser.add_argument(
    "--compile-only",
    action="store_true",
    help="Link the runner without opening a test window",
)
args = parser.parse_args()
if not math.isfinite(args.timeout) or args.timeout <= 0:
    parser.error("--timeout must be a finite positive number")
root = Path(__file__).resolve().parent.parent
host_build = args.host_build.resolve()
qt = args.qt_bin.resolve().parent
output = (
    args.output_dir.resolve() if args.output_dir else root / "build/folia-native-qml"
)
output.mkdir(parents=True, exist_ok=True)
source = root / "tests/native/folia-qml.cpp"
commands = json.loads((host_build / "compile_commands.json").read_text())
example = next(
    c for c in commands if c["file"].endswith("/plugins/PluginRuntimeAppearance.cpp")
)
compile_args = shlex.split(example["command"])
object_file = output / "folia-qml.cpp.o"
compile_args[compile_args.index("-o") + 1] = str(object_file)
compile_args[compile_args.index("-c") + 1] = str(source)
compile_args += [
    "-I" + str(output),
    "-I" + str(qt / "include/QtQuickTest"),
    "-I" + str(Path(example["file"]).parent),
    "-I"
    + str(
        Path(
            next(
                c["file"]
                for c in commands
                if c["file"].endswith("/SongCatalogModel.cpp")
            )
        ).parent
    ),
]
subprocess.run(
    [str(qt / "libexec/moc"), str(source), "-o", str(output / "folia-qml.moc")],
    check=True,
)
subprocess.run(compile_args, cwd=host_build, check=True)
link_lines = subprocess.check_output(
    ["ninja", "-C", str(host_build), "-t", "commands", "echo-plugin-runtime-test"],
    text=True,
).splitlines()
link = shlex.split(link_lines[-1])
if link[:2] != [":", "&&"] or link[-2:] != ["&&", ":"]:
    raise RuntimeError("Unsupported CMake Ninja executable link metadata")
link = [
    arg
    for arg in link[2:-2]
    if not (arg.endswith(".o") and "CMakeFiles/echo-plugin-runtime-test.dir/" in arg)
]
executable = output / "folia-qml-test"
link[link.index("-o") + 1] = str(executable)
link.insert(1, str(object_file))
if (qt / "lib/QtQuickTest.framework").is_dir():
    link += ["-framework", "QtQuickTest"]
else:
    link += ["-L" + str(qt / "lib"), "-lQt6QuickTest"]
subprocess.run(link, cwd=host_build, check=True)
if args.compile_only:
    print(executable)
    raise SystemExit(0)
test_input = args.input.resolve()
plugin_root = args.plugin_root.resolve() if args.plugin_root else None
if plugin_root:
    manifest = json.loads((plugin_root / "manifest.json").read_text())
    if manifest.get("id") != "folia-lyrics-skin":
        raise ValueError("--plugin-root must be the built Folia package")
    # Keep the tests and their relative imports unchanged. The plugin in this
    # isolated view is the actual baker output, never an ad-hoc source QSB copy.
    relative_input = test_input.relative_to(root / "tests")
    view = Path(tempfile.mkdtemp(prefix="built-plugin-view-", dir=output))
    shutil.copytree(
        root / "tests", view / "tests", ignore=shutil.ignore_patterns("__pycache__")
    )
    (view / "plugins").mkdir()
    (view / "plugins/folia-lyrics-skin").symlink_to(
        plugin_root, target_is_directory=True
    )
    (view / "build").symlink_to(root / "build", target_is_directory=True)
    test_input = view / "tests" / relative_input
environment = {**os.environ, "QT_QPA_PLATFORM": args.platform}
if plugin_root:
    environment["FOLIA_GPU_ASSET_ROOT"] = str(plugin_root)
if args.platform == "cocoa":
    environment["QSG_RHI_BACKEND"] = "metal"
result = run_owned_test(
    [str(executable), "-input", str(test_input), "-o", "-,txt"],
    cwd=root,
    env=environment,
    timeout=args.timeout,
    log_path=output / "acceptance.log",
    record_path=output / "execution.json",
)
print(result.stdout, end="", flush=True)
raise SystemExit(result.returncode)
