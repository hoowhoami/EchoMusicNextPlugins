// Derived from Folia a8da4437 (AGPL-3.0-only). See sonnet-reference.md.
const EMPTY_SONNET_LINES = [];
function buildInstrumentalLines(isInstrumental) {
  if (!isInstrumental) return EMPTY_SONNET_LINES;
  const generated = [];
  for (let i = 0; i < 60; i++)
    generated.push({
      id: `virtual-staff-${i}`,
      startTime: i * 8,
      endTime: i * 8 + 6,
      fullText: '\u266A',
      words: [],
      isChorus: !1,
    });
  return generated;
}
export { buildInstrumentalLines };
