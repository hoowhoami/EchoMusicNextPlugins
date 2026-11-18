// Folia a8da4437 (AGPL-3.0-only). See docs/folia/harmony-reference.md.
const buildHarmonyTextParts = (vocal) => {
  const parts = [];
  let cursor = 0;
  vocal.words.forEach((word, index) => {
    const matchIndex = vocal.text.indexOf(word.text, cursor);
    if (matchIndex < 0) {
      return;
    }
    if (matchIndex > cursor) {
      parts.push({ key: `static-${cursor}`, text: vocal.text.slice(cursor, matchIndex) });
    }
    parts.push({ key: `word-${index}-${word.startTime}`, text: word.text, word });
    cursor = matchIndex + word.text.length;
  });
  if (cursor < vocal.text.length) {
    parts.push({ key: `static-${cursor}`, text: vocal.text.slice(cursor) });
  }
  return parts.length > 0 ? parts : [{ key: 'full', text: vocal.text }];
};
function fillWidth(vocal, graphemeTimings, graphemeOffsets, latest) {
  var _a, _b, _c;
  const fullWidth = (_a = graphemeOffsets[graphemeOffsets.length - 1]) != null ? _a : 0;
  if (latest <= vocal.startTime) return 0;
  if (latest >= vocal.endTime) return fullWidth;
  const timingCount = Math.min(graphemeTimings.length, graphemeOffsets.length - 1);
  for (let index = 0; index < timingCount; index += 1) {
    const timing = graphemeTimings[index];
    const start = Math.max(vocal.startTime, timing.startTime);
    const end = Math.max(start, timing.endTime);
    const startWidth = (_b = graphemeOffsets[index]) != null ? _b : 0;
    const endWidth = (_c = graphemeOffsets[index + 1]) != null ? _c : startWidth;
    if (latest < start) return startWidth;
    if (latest <= end) {
      return (
        startWidth + (endWidth - startWidth) * ((latest - start) / Math.max(1e-3, end - start))
      );
    }
  }
  return fullWidth;
}
export { buildHarmonyTextParts, fillWidth };
