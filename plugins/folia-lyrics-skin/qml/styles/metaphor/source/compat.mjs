// ES2016 helper; no engine prototype mutation.
export function arrayAt(values, index) {
  return values[index < 0 ? values.length + index : index];
}
export function arrayFlatMap(values, fn) {
  const result = [];
  values.forEach((value, i) => {
    const part = fn(value, i, values);
    if (Array.isArray(part)) result.push.apply(result, part);
    else result.push(part);
  });
  return result;
}
