// Component initial properties may expose Qt sequences rather than JS Arrays.
// Compare their complete values without treating numeric indexes as map keys.
export function canonical(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value) || (typeof value.length === 'number' && typeof value.map === 'function'))
    return Array.from(value, canonical);
  const result = {};
  for (const key of Object.keys(value).sort()) result[key] = canonical(value[key]);
  return result;
}
