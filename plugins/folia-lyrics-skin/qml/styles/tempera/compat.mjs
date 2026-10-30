// ES2016 equivalents, preserving source iteration order and callback arguments.
export function flatMap(values, callback) {
  const result = [];
  values.forEach((value, index) => {
    const mapped = callback(value, index, values);
    if (Array.isArray(mapped)) result.push.apply(result, mapped);
    else result.push(mapped);
  });
  return result;
}
export function flat(values) {
  return flatMap(values, (value) => value);
}
export function at(values, index) {
  const n = Math.trunc(index);
  return values[n < 0 ? values.length + n : n];
}
