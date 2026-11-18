# ICU word-break data evaluation

An isolated macOS evaluation of ICU4C 78.3 for the public plugin word-break API. It does not configure the EchoMusicNext host, install system libraries, change the SDK snapshot or load a player.

Run with Python 3.12+, Apple command-line tools and the existing Qt 6.12.0 SDK:

```sh
python3.12 tools/icu-word-eval/evaluate.py --qt /absolute/path/to/Qt/6.12.0/macos --host-source /absolute/path/to/EchoMusicNext
```

The evaluator verifies the official source archive SHA-256, builds static ICU with a macOS 14.4 deployment target, and links the same Qt/C++ probe against three data packages:

| Variant | Data                                                                                              |
| ------- | ------------------------------------------------------------------------------------------------- |
| full    | Original complete ICU data                                                                        |
| break   | All break rules, all script dictionaries and locale bundles, NFKC data and converter aliases      |
| word    | The same dictionaries/locales/dependencies, with non-word boundary entries and rule files removed |

The authoritative word-data recipe is `scripts/icu_word_data.py` in the explicitly selected host source tree; this evaluator does not maintain a second word filter. No language dictionaries are removed. Modified locale resources are rebuilt with ICU's `derb`/`genrb`; unmodified resources retain their original bytes and metadata. ICU's dependency checks must pass without `--ignore-deps`. The word package is only for consumers using `UBRK_WORD`; it is not a general replacement for complete ICU data.

The verification corpus combines authored multilingual and mixed-script text with input sequences from the pinned Unicode 17.0 WordBreakTest. Every text is checked under 30 locale choices. The evaluator compares UTF-16 offsets, complete segments, rule statuses and word-like classification against complete ICU. This is an equivalence check, not a claim that ICU's language tailoring matches every default Unicode test expectation. External file loading is disabled during verification so missing resources cannot be supplied by an unrelated installation.

Performance probes recreate `EchoPluginText`'s native UTF-16 slicing and QVariant result objects. They measure fresh-process first calls, warmed 1/16/64-line batches, the 65,536-unit request ceiling, repeated ceiling-sized batches, RSS and macOS physical footprint. QtConcurrent scheduling, SDK/JS delivery, Folia's subsequent jieba/BudouX work, rendering and playback are outside these measurements. New processes do not imply a cold operating-system file cache.

Results and raw measurements go to `.planning/folia-icu-eval`; disposable source and build files go to `build/folia-icu-eval`. `--runs` controls independent process rounds (default 12), `--jobs` controls ICU build concurrency, and `--reuse-build` reuses this evaluator's existing complete ICU build. Keep raw results and input hashes before removing the disposable build tree.

Sources: [ICU data tooling](https://unicode-org.github.io/icu/userguide/icu_data/buildtool), [ICU 78.3](https://github.com/unicode-org/icu/releases/tag/release-78.3). ICU data retains its upstream license; the benchmark and evaluator follow this repository's MIT license.
