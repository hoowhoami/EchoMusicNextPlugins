// ES2016 library helpers; keep the isolated QML engine's prototypes unchanged.
export function flatMap(values, transform) {
  const result = [];
  values.forEach((value, index) => {
    const mapped = transform(value, index, values);
    if (Array.isArray(mapped)) result.push.apply(result, mapped);
    else result.push(mapped);
  });
  return result;
}
export function trimEnd(text) {
  return text.replace(/\s+$/, '');
}
