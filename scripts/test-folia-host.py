#!/usr/bin/env python3
"""Link a scoped acceptance test against an existing native Release build.

Reads Ninja/compiler metadata; never configures or mutates the host build tree.
The host's test fixture supplies real services and isolated temporary storage.
"""

import argparse
import json
import math
import os
from pathlib import Path
import shlex
import subprocess
import time

from folia_probe_protocol import build_record_path, sha256
from folia_owned_process import run_owned_test

parser = argparse.ArgumentParser()
parser.add_argument("--host-build", required=True, type=Path)
parser.add_argument("--package", required=True, type=Path)
parser.add_argument("--qt-bin", required=True, type=Path)
parser.add_argument("--platform", choices=["offscreen", "cocoa"], default="offscreen")
parser.add_argument("--source", type=Path, help="Alternative scoped native test source")
parser.add_argument("--output-dir", type=Path, help="Separate runner and evidence directory")
parser.add_argument(
    "--timeout", type=float, default=90, help="Positive total test-process limit in seconds"
)
parser.add_argument(
    "--compile-only", action="store_true", help="Link without opening a native test window"
)
parser.add_argument(
    "--gui-private",
    action="store_true",
    help="Use the current host QtGuiPrivate include metadata for the version-pinned GPU probe",
)
args = parser.parse_args()
if not math.isfinite(args.timeout) or args.timeout <= 0:
    parser.error("--timeout must be a finite positive number")
root = Path(__file__).resolve().parent.parent
host_build = args.host_build.resolve()
output = args.output_dir.resolve() if args.output_dir else root / "build/folia-native"
output.mkdir(parents=True, exist_ok=True)
source = args.source.resolve() if args.source else root / "tests/native/folia-host.cpp"
source_hash = sha256(source)
build_started = time.monotonic()
commands = json.loads((host_build / "compile_commands.json").read_text())
example = next(
    c for c in commands if c["file"].endswith("/plugins/PluginRuntimeAppearance.cpp")
)
host_source = Path(example["file"]).resolve().parents[3]
compile_args = shlex.split(example["command"])
object_file = output / (source.stem + ".cpp.o")
compile_args[compile_args.index("-o") + 1] = str(object_file)
compile_args[compile_args.index("-c") + 1] = str(source)
compile_args += ["-I" + str(Path(example["file"]).parent), "-I" + str(output)]
compile_args += ["-I" + str(host_source / "services/settings")]
compile_args += ["-I" + str(host_source / "modules/EchoMusic/Playback")]
if args.gui_private:
    graphics = next(c for c in commands if c["file"].endswith("/FloatTexture.cpp"))
    graphics_args = shlex.split(graphics["command"])
    private_includes = []
    for index, flag in enumerate(graphics_args[:-1]):
        if (
            flag == "-isystem"
            and "QtGui" in graphics_args[index + 1]
            and any(char.isdigit() for char in Path(graphics_args[index + 1]).name)
        ):
            private_includes.extend([flag, graphics_args[index + 1]])
        elif (
            flag == "-isystem"
            and "QtGui" in graphics_args[index + 1]
            and "/6." in graphics_args[index + 1]
        ):
            private_includes.extend([flag, graphics_args[index + 1]])
    if not private_includes:
        raise RuntimeError("Actual QtGuiPrivate include metadata unavailable")
    compile_args.extend(private_includes)
subprocess.run(
    [
        str(args.qt_bin.resolve().parent / "libexec/moc"),
        str(source),
        "-o",
        str(output / (source.stem + ".moc")),
    ],
    check=True,
)
subprocess.run(compile_args, cwd=host_build, check=True)
compilation_seconds = time.monotonic() - build_started
link_lines = subprocess.check_output(
    ["ninja", "-C", str(host_build), "-t", "commands", "echo-plugin-runtime-test"],
    text=True,
).splitlines()
link = shlex.split(link_lines[-1])
if link[:2] != [":", "&&"] or link[-2:] != ["&&", ":"]:
    raise RuntimeError(
        "Unsupported native link metadata; expected CMake Ninja executable rule"
    )
link = [
    arg
    for arg in link[2:-2]
    if not (arg.endswith(".o") and "CMakeFiles/echo-plugin-runtime-test.dir/" in arg)
]
executable = output / (source.stem + "-test")
sidecar = build_record_path(executable)
sidecar.unlink(missing_ok=True)
link[link.index("-o") + 1] = str(executable)
link.insert(1, str(object_file))
link_started = time.monotonic()
subprocess.run(link, cwd=host_build, check=True)
if sha256(source) != source_hash:
    raise RuntimeError("Native test source changed during compilation; rebuild deliberately")
sidecar.write_text(
    json.dumps(
        {
            "schemaVersion": 1,
            "producer": "test-folia-host.py",
            "source": {"path": str(source), "sha256": source_hash},
            "executable": {"path": str(executable), "sha256": sha256(executable)},
            "hostBuild": str(host_build),
            "compileCommand": compile_args,
            "linkCommand": link,
            "compilationSeconds": compilation_seconds,
            "linkSeconds": time.monotonic() - link_started,
            "dependencyScope": "Top-level native test source and executable only; host libraries and transitive headers require their separate coherent-build record",
        },
        ensure_ascii=False,
        indent=2,
    )
    + "\n"
)
if args.compile_only:
    print(executable)
    raise SystemExit(0)
captures = output / args.platform
if args.source:
    captures = captures / source.stem
captures.mkdir(parents=True, exist_ok=True)
environment = {
    **os.environ,
    "QT_QPA_PLATFORM": args.platform,
    "FOLIA_TEST_PACKAGE": str(args.package.resolve()),
    "FOLIA_CAPTURE_DIR": str(captures),
    "FOLIA_HOST_SOURCE": str(host_source),
}
result = run_owned_test(
    [str(executable)], cwd=root, env=environment, timeout=args.timeout,
    log_path=captures / "acceptance.log", record_path=captures / "execution.json",
)
print(result.stdout, end="", flush=True)
raise SystemExit(result.returncode)
