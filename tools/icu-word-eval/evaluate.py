"""Build and compare isolated full/break/word ICU78.3 static data on macOS.

No host build, system installation, SDK snapshot or playback code is changed.
The full and filtered probes link the same ICU code, differing only in data.
"""

import argparse
import gzip
import importlib.util
import hashlib
import json
import os
from pathlib import Path
import platform
import shutil
import statistics
import subprocess
import tarfile
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
SHA256 = "3a2e7a47604ba702f345878308e6fefeca612ee895cf4a5f222e7955fabfe0c0"
URL = "https://github.com/unicode-org/icu/releases/download/release-78.3/icu4c-78.3-sources.tgz"


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--qt", type=Path, required=True)
    parser.add_argument(
        "--host-source",
        type=Path,
        required=True,
        help="EchoMusicNext source owning the ICU word-data recipe",
    )
    parser.add_argument("--runs", type=int, default=12)
    parser.add_argument("--jobs", type=int, default=6)
    parser.add_argument("--reuse-build", action="store_true")
    args = parser.parse_args()
    if (
        platform.system() != "Darwin"
        or not 3 <= args.runs <= 30
        or not 1 <= args.jobs <= 16
    ):
        parser.error("macOS is required; runs=3..30 and jobs=1..16")
    work = ROOT / "build/folia-icu-eval"
    evidence = ROOT / ".planning/folia-icu-eval"
    work.mkdir(parents=True, exist_ok=True)
    evidence.mkdir(parents=True, exist_ok=True)
    commands = []
    environment = dict(os.environ, MACOSX_DEPLOYMENT_TARGET="14.4")
    environment["ICU_DATA"] = str(work / "empty-data")
    (work / "empty-data").mkdir(exist_ok=True)
    environment.update(
        CFLAGS="-O2 -mmacosx-version-min=14.4", CXXFLAGS="-O2 -mmacosx-version-min=14.4"
    )

    def run(command, cwd=None, capture=False):
        command = [str(x) for x in command]
        commands.append({"argv": command, "cwd": str(cwd or ROOT)})
        with (evidence / "commands.jsonl").open("a") as log:
            log.write(json.dumps(commands[-1]) + "\n")
        if capture:
            return subprocess.check_output(
                command, cwd=cwd or ROOT, env=environment, text=True
            )
        with (evidence / "build.log").open("a") as log:
            subprocess.run(
                command,
                cwd=cwd or ROOT,
                env=environment,
                stdout=log,
                stderr=subprocess.STDOUT,
                check=True,
            )

    archive = work / "downloads/icu4c-78.3-sources.tgz"
    archive.parent.mkdir(exist_ok=True)
    if not archive.exists():
        urllib.request.urlretrieve(URL, archive)
    if digest(archive) != SHA256:
        raise RuntimeError("Official source archive checksum mismatch")
    source = work / "source/icu/source"
    if not source.exists():
        with tarfile.open(archive) as package:
            package.extractall(work / "source", filter="data")
    full = work / "full"
    build = work / "compile-full"
    if not args.reuse_build or not (full / "lib/libicuuc.a").exists():
        build.mkdir(exist_ok=True)
        run(
            [
                source / "configure",
                "--prefix=" + str(full),
                "--disable-shared",
                "--enable-static",
                "--disable-tests",
                "--disable-samples",
                "--with-data-packaging=static",
            ],
            cwd=build,
        )
        run(["make", "-j" + str(args.jobs)], cwd=build)
        run(["make", "install"], cwd=build)
    print("ICU78.3 code ready", flush=True)
    icupkg = full / "sbin/icupkg"
    data = source / "data/in/icudt78l.dat"
    inventory = run([icupkg, "-l", data], capture=True).splitlines()
    (evidence / "full-data-items.txt").write_text("\n".join(inventory) + "\n")
    # Keep every script dictionary and locale bundle, plus CJK NFKC normalization
    # and converter aliases. No language pruning and no --ignore-deps escape.
    keep = [
        x
        for x in inventory
        if x.startswith("brkitr/") or x in ("nfkc.nrm", "cnvalias.icu")
    ]
    keep_file = evidence / "break-items.txt"
    keep_file.write_text("\n".join(keep) + "\n")
    extracted = work / "extracted"
    extracted.mkdir(exist_ok=True)
    run([icupkg, "-x", keep_file, "-d", extracted, data])
    variants = {"full": {"data": data, "lib": full / "lib/libicudata.a"}}
    recipe_file = args.host_source.resolve() / "scripts/icu_word_data.py"
    spec = importlib.util.spec_from_file_location("icu_word_data", recipe_file)
    recipe = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(recipe)
    for variant in ("break", "word"):
        folder = work / variant
        if folder.exists():
            shutil.rmtree(folder)
        if variant == "word":
            recipe.create_word_data(data, full, folder)
            selected = folder / "items"
            listed = folder / "items.txt"
            dat = folder / data.name
        else:
            folder.mkdir()
            selected = folder / "items"
            shutil.copytree(extracted, selected)
            names = sorted(
                str(x.relative_to(selected)) for x in selected.rglob("*") if x.is_file()
            )
            listed = folder / "items.txt"
            listed.write_text("\n".join(names) + "\n")
            dat = folder / data.name
            run([icupkg, "-s", selected, "-a", listed, "new", dat])
            run([icupkg, "-l", dat], capture=True)
        variants[variant] = {"data": dat}
        packaged = folder / "lib"
        packaged.mkdir(exist_ok=True)
        run(
            [
                full / "bin/pkgdata",
                "-p",
                "icudt78l",
                "-e",
                "icudt78",
                "-L",
                "icudata",
                "-m",
                "static",
                "-O",
                full / "lib/icu/current/pkgdata.inc",
                "-s",
                selected,
                "-d",
                packaged,
                "-T",
                packaged,
                listed,
            ]
        )
        variants[variant]["lib"] = packaged / "libicudata.a"
        shutil.copy2(listed, evidence / (variant + "-data-items.txt"))
    print("Filtered ICU data built with dependency validation", flush=True)
    synthetic = json.loads((HERE / "corpus.json").read_text())
    verification = dict(synthetic)
    official_cases = []
    for line in (source / "test/testdata/WordBreakTest.txt").read_text().splitlines():
        text = line.split("#")[0].strip()
        if text:
            official_cases.append(
                "".join(chr(int(x, 16)) for x in text.split() if x not in ("÷", "×"))
            )
    verification["texts"] = synthetic["texts"] + official_cases
    write_json(evidence / "verification-corpus.json", verification)
    qt = args.qt.resolve()
    compile_base = [
        "clang++",
        "-std=c++20",
        "-O2",
        "-mmacosx-version-min=14.4",
        "-Wl,-dead_strip",
        "-F" + str(qt / "lib"),
        "-I" + str(qt / "lib/QtCore.framework/Headers"),
        "-I" + str(qt / "include"),
        "-framework",
        "QtCore",
        "-Wl,-rpath," + str(qt / "lib"),
        HERE / "benchmark.cpp",
    ]
    control = work / "probe-control"
    run(compile_base + ["-o", control])
    binaries = {"control": control}
    for name, variant in variants.items():
        binary = work / ("probe-" + name)
        run(
            compile_base
            + [
                "-DWORD_EVAL_ICU=1",
                "-I" + str(full / "include"),
                full / "lib/libicui18n.a",
                full / "lib/libicuuc.a",
                variant["lib"],
                "-o",
                binary,
            ]
        )
        binaries[name] = binary
        run(["strip", "-x", binary])
    print("Static Qt/ICU probes linked", flush=True)
    reference = None
    verify_results = {}
    for name in variants:
        output = json.loads(
            run(
                [binaries[name], evidence / "verification-corpus.json", "verify"],
                capture=True,
            )
        )
        write_json(evidence / (name + "-verification.json"), output)
        fingerprints = output["locales"]
        if reference is None:
            reference = fingerprints
        elif fingerprints != reference:
            raise RuntimeError(name + " word boundaries differ from complete ICU")
        verify_results[name] = {
            k: output[k]
            for k in ("line_locale_cases", "boundaries", "static_data_only")
        }
    print("All filtered outputs match complete ICU", flush=True)
    records = {name: [] for name in binaries}
    for index in range(args.runs):
        order = list(binaries)
        if index % 2:
            order.reverse()
        for name in order:
            started = time.perf_counter()
            result = json.loads(
                run(
                    [
                        binaries[name],
                        HERE / "corpus.json",
                        "control" if name == "control" else "run",
                    ],
                    capture=True,
                )
            )
            result["spawn_to_exit_ms"] = (time.perf_counter() - started) * 1000
            records[name].append(result)
        print(f"Performance process round {index + 1}/{args.runs}", flush=True)
    write_json(evidence / "raw-performance.json", records)
    sizes = {}
    for name, binary in binaries.items():
        sizes[name] = {
            "executable_bytes": binary.stat().st_size,
            "executable_gzip9_bytes": len(
                gzip.compress(binary.read_bytes(), compresslevel=9, mtime=0)
            ),
            "executable_sha256": digest(binary),
        }
        if name in variants:
            dat = variants[name]["data"]
            sizes[name].update(
                data_bytes=dat.stat().st_size,
                data_gzip9_bytes=len(
                    gzip.compress(dat.read_bytes(), compresslevel=9, mtime=0)
                ),
                data_sha256=digest(dat),
            )
    summary = {
        "environment": {
            "platform": platform.platform(),
            "architecture": platform.machine(),
            "compiler": run(["clang++", "--version"], capture=True).splitlines()[0],
            "qt": str(qt),
            "icu_version": "78.3",
            "macos_minimum": "14.4",
            "source_sha256": SHA256,
            "runs": args.runs,
        },
        "sizes": sizes,
        "verification": verify_results,
        "performance": {},
    }
    for name, results in records.items():
        entry = {}
        for stage in (
            "before",
            "after_first",
            "after_dictionaries",
            "after_stress",
            "final",
        ):
            if stage in results[0]:
                entry[stage] = {
                    key: statistics.median(row[stage][key] for row in results)
                    for key in results[0][stage]
                }
        for metric in (
            "ready_ms",
            "first_call_ms",
            "first_mixed64_ms",
            "spawn_to_exit_ms",
        ):
            if metric in results[0]:
                values = sorted(row[metric] for row in results)
                entry[metric] = {
                    "median": statistics.median(values),
                    "p95": values[min(len(values) - 1, int(len(values) * 0.95))],
                }
        if "stress_cycles" in results[0]:
            entry["stress_cycle_footprint_bytes"] = [
                statistics.median(
                    row["stress_cycles"][i]["physical_footprint_bytes"]
                    for row in results
                )
                for i in range(8)
            ]
        if "workloads" in results[0]:
            entry["workloads"] = {
                key: {
                    metric: statistics.median(
                        row["workloads"][key][metric] for row in results
                    )
                    for metric in results[0]["workloads"][key]
                }
                for key in results[0]["workloads"]
            }
        summary["performance"][name] = entry
    write_json(evidence / "summary.json", summary)
    write_json(evidence / "commands.json", commands)
    write_json(
        evidence / "inputs.json",
        {
            "archive": {"url": URL, "sha256": SHA256},
            "authored_corpus_sha256": digest(HERE / "corpus.json"),
            "unicode_wordbreak_tests": len(official_cases),
            "locale_count": len(synthetic["locales"]),
            "benchmark_sha256": digest(HERE / "benchmark.cpp"),
            "evaluator_sha256": digest(Path(__file__)),
            "host_recipe_sha256": digest(recipe_file),
            "libraries": {
                p.name: {"bytes": p.stat().st_size, "sha256": digest(p)}
                for p in [full / "lib/libicuuc.a", full / "lib/libicui18n.a"]
            },
        },
    )
    shutil.copy2(source.parent / "LICENSE", evidence / "ICU-LICENSE.txt")
    (evidence / "word-data.dat.gz").write_bytes(
        gzip.compress(variants["word"]["data"].read_bytes(), compresslevel=9, mtime=0)
    )
    print("Evidence: " + str(evidence / "summary.json"))


if __name__ == "__main__":
    main()
