// Derived from Folia a8da4437 (AGPL-3.0-only). See sonnet-reference.md.
var EMPTY_COMMITTED_LINES = [],
  DEFAULT_INSTRUMENTAL_COMMIT_SECONDS = 2,
  DEFAULT_READY_GRACE_MS = 8e3,
  hashWordSegments = function (lines) {
    var hash = 2166136261,
      mix = function (value) {
        hash = Math.imul(hash ^ value, 16777619);
      };
    return (
      lines.forEach(function (line, index) {
        var _a,
          segments =
            (_a = line.wordSegments) !== null && _a !== void 0 ? _a : line.autoWordSegments;
        segments &&
          (mix(index),
          mix(line.wordSegments ? 1 : 2),
          segments.forEach(function (segment) {
            return mix(segment.length);
          }));
      }),
      hash >>> 0
    );
  },
  getLyricsSignature = function (lines) {
    var _a, _b;
    return lines.length === 0
      ? ''
      : ''
          .concat(lines.length, '|')
          .concat(
            (_b = (_a = lines[0]) === null || _a === void 0 ? void 0 : _a.fullText) !== null &&
              _b !== void 0
              ? _b
              : '',
            '|'
          )
          .concat(hashWordSegments(lines));
  },
  decideSongCommit = function (_a) {
    var seed = _a.seed,
      committedSeed = _a.committedSeed,
      lyricsSignature = _a.lyricsSignature,
      committedSignature = _a.committedSignature,
      isCommittedInstrumental = _a.isCommittedInstrumental;
    return seed === committedSeed
      ? lyricsSignature === ''
        ? isCommittedInstrumental
          ? { action: 'idle' }
          : { action: 'watch' }
        : lyricsSignature !== committedSignature
          ? { action: 'commit', isInstrumental: !1 }
          : { action: 'idle' }
      : lyricsSignature !== '' && lyricsSignature !== committedSignature
        ? { action: 'commit', isInstrumental: !1 }
        : { action: 'watch' };
  },
  isInstrumentalConfirmed = function (_a, _b) {
    var sawPlaybackReset = _a.sawPlaybackReset,
      playbackTime = _a.playbackTime,
      elapsedMs = _a.elapsedMs,
      instrumentalCommitSeconds = _b.instrumentalCommitSeconds,
      readyGraceMs = _b.readyGraceMs;
    return (
      (sawPlaybackReset && playbackTime >= instrumentalCommitSeconds) || elapsedMs >= readyGraceMs
    );
  };
export {
  DEFAULT_INSTRUMENTAL_COMMIT_SECONDS,
  DEFAULT_READY_GRACE_MS,
  decideSongCommit,
  getLyricsSignature,
  isInstrumentalConfirmed,
};
