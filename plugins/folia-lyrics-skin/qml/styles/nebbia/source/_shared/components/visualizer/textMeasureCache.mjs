// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/textMeasureCache.ts
const rememberBounded = (cache, key, value, limit) => {
  if (!cache.has(key) && cache.size >= limit) {
    const oldest = cache.keys().next();
    if (!oldest.done) cache.delete(oldest.value);
  }
  cache.set(key, value);
  return value;
};
const measurePrefixOffsets = (graphemes, measurePrefix) => {
  const offsets = new Array(graphemes.length + 1).fill(0);
  for (let count = 1; count <= graphemes.length; count += 1) {
    offsets[count] = measurePrefix(graphemes.slice(0, count).join(''), count, offsets[count - 1]);
  }
  return offsets;
};
export { measurePrefixOffsets, rememberBounded };
