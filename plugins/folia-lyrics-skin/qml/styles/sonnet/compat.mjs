// ES2016 collection equivalents; preserve iteration order and callback arguments.
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
  const position = Math.trunc(index);
  return values[position < 0 ? values.length + position : position];
}
