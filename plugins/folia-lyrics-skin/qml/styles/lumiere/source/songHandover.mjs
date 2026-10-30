// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/lumiere-reference.md.
var EMPTY_COMMITTED_LINES = [];
var DEFAULT_INSTRUMENTAL_COMMIT_SECONDS = 2;
var DEFAULT_READY_GRACE_MS = 8e3;
var hashWordSegments = function (lines) {
  var hash = 2166136261;
  var mix = function (value) {
    hash = Math.imul(hash ^ value, 16777619);
  };
  lines.forEach(function (line, index) {
    var _a;
    var segments = (_a = line.wordSegments) !== null && _a !== void 0 ? _a : line.autoWordSegments;
    if (!segments) {
      return;
    }
    mix(index);
    mix(line.wordSegments ? 1 : 2);
    segments.forEach(function (segment) {
      return mix(segment.length);
    });
  });
  return hash >>> 0;
};
var getLyricsSignature = function (lines) {
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
};
var decideSongCommit = function (_a) {
  var seed = _a.seed,
    committedSeed = _a.committedSeed,
    lyricsSignature = _a.lyricsSignature,
    committedSignature = _a.committedSignature,
    isCommittedInstrumental = _a.isCommittedInstrumental;
  if (seed === committedSeed) {
    if (lyricsSignature === '') {
      if (isCommittedInstrumental) {
        return { action: 'idle' };
      }
      return { action: 'watch' };
    }
    if (lyricsSignature !== committedSignature) {
      return { action: 'commit', isInstrumental: false };
    }
    return { action: 'idle' };
  }
  if (lyricsSignature !== '' && lyricsSignature !== committedSignature) {
    return { action: 'commit', isInstrumental: false };
  }
  return { action: 'watch' };
};
var isInstrumentalConfirmed = function (_a, _b) {
  var sawPlaybackReset = _a.sawPlaybackReset,
    playbackTime = _a.playbackTime,
    elapsedMs = _a.elapsedMs;
  var instrumentalCommitSeconds = _b.instrumentalCommitSeconds,
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
