#!/usr/bin/env python3
"""Link a scoped acceptance test against an existing native Release build.

Reads Ninja/compiler metadata; never configures or mutates the host build tree.
The host's test fixture supplies real services and isolated temporary storage.
"""
import argparse
import json
import os
from pathlib import Path
import shlex
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument("--host-build", required=True, type=Path)
parser.add_argument("--package", required=True, type=Path)
parser.add_argument("--qt-bin", required=True, type=Path)
parser.add_argument("--platform", choices=["offscreen", "cocoa"], default="offscreen")
args = parser.parse_args()
root = Path(__file__).resolve().parent.parent
host_build = args.host_build.resolve()
output = root / "build/folia-native"
output.mkdir(parents=True, exist_ok=True)
source = root / "tests/native/folia-host.cpp"
commands = json.loads((host_build / "compile_commands.json").read_text())
example = next(c for c in commands if c["file"].endswith("/plugins/PluginRuntimeAppearance.cpp"))
compile_args = shlex.split(example["command"])
object_file = output / "folia-host.cpp.o"
compile_args[compile_args.index("-o") + 1] = str(object_file)
compile_args[compile_args.index("-c") + 1] = str(source)
compile_args += ["-I" + str(Path(example["file"]).parent), "-I" + str(output)]
subprocess.run([str(args.qt_bin.resolve().parent / "libexec/moc"), str(source),
                "-o", str(output / "folia-host.moc")], check=True)
subprocess.run(compile_args, cwd=host_build, check=True)
link_lines = subprocess.check_output(
    ["ninja", "-C", str(host_build), "-t", "commands", "echo-plugin-runtime-test"],
    text=True).splitlines()
link = shlex.split(link_lines[-1])
if link[:2] != [":", "&&"] or link[-2:] != ["&&", ":"]:
    raise RuntimeError("Unsupported native link metadata; expected CMake Ninja executable rule")
link = [arg for arg in link[2:-2]
        if not (arg.endswith(".o") and "CMakeFiles/echo-plugin-runtime-test.dir/" in arg)]
executable = output / "folia-host-test"
link[link.index("-o") + 1] = str(executable)
link.insert(1, str(object_file))
subprocess.run(link, cwd=host_build, check=True)
captures = output / args.platform
captures.mkdir(exist_ok=True)
environment = {**os.environ, "QT_QPA_PLATFORM": args.platform,
               "FOLIA_TEST_PACKAGE": str(args.package.resolve()),
               "FOLIA_CAPTURE_DIR": str(captures)}
result = subprocess.run([str(executable)], cwd=root, env=environment, timeout=90,
                        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
(captures / "acceptance.log").write_text(result.stdout)
print(result.stdout, end="", flush=True)
result.check_returncode()
