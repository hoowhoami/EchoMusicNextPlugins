export function flatMap(values, callback) {
  let result = [];
  for (let i = 0; i < values.length; i++) result = result.concat(callback(values[i], i, values));
  return result;
}
export function rememberBounded(cache, key, value, limit) {
  cache.set(key, value);
  if (cache.size > limit) cache.delete(cache.keys().next().value);
  return value;
}
