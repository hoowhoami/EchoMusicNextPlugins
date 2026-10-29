// ES2016 object library equivalents; do not mutate global prototypes.
export function fromEntries(entries) {
  const result = {};
  for (const [key, value] of entries)
    Object.defineProperty(result, key, {
      value,
      writable: true,
      enumerable: true,
      configurable: true,
    });
  return result;
}
export function values(object) {
  return Object.keys(object).map((key) => object[key]);
}
export function entries(object) {
  return Object.keys(object).map((key) => [key, object[key]]);
}
