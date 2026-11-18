// A measurement-only GlyphRun shapes synchronously. Only the fields used by
// the article worker need to leave the native layout.
export function measureArticleBatch(item, queries, from, generation, includeInk) {
  const runs = [];
  let units = 0;
  for (let i = from; i < queries.length && runs.length < 64; ++i) {
    const q = queries[i];
    if (q.text.length > 8192) throw new Error('A shaping query exceeds 8192 UTF16 units');
    if (runs.length && units + q.text.length > 1024) break;
    units += q.text.length;
    runs.push({
      key: 'm' + generation + ':' + i,
      text: q.text,
      size: q.size,
      weight: q.weight,
      spacing: 0,
      maxBlur: 0,
      maxHaloRadius: 0,
    });
  }
  item.runs = runs;
  if (item.errorString) throw new Error(item.errorString);
  const metrics = item.metrics;
  if (metrics.length !== runs.length) throw new Error('Incomplete glyph measurements');
  return runs.map((run, index) => {
    const metric = metrics[index];
    if (metric.key !== run.key || !Number.isFinite(metric.advance))
      throw new Error('Glyph measurement does not match its request');
    const key = queries[from + index].key;
    if (!includeInk) return { key, width: metric.advance };
    if (!Number.isFinite(metric.inkLeft) || !Number.isFinite(metric.inkRight))
      throw new Error('Missing glyph ink bounds');
    return {
      key,
      width: metric.width,
      advance: metric.advance,
      inkLeft: metric.inkLeft,
      inkRight: metric.inkRight,
      inkTop: metric.inkTop,
      inkBottom: metric.inkBottom,
      height: metric.height,
      baseline: metric.baseline,
    };
  });
}
