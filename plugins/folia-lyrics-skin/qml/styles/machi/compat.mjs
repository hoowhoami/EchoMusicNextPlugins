// Local ES2016 collection helpers, without changing any engine prototype.
export const arrayAt = (values, index) => values[index < 0 ? values.length + index : index];
export const arrayFlatMap = (values, map) =>
  values.reduce((out, value, index) => out.concat(map(value, index, values)), []);
export const fromEntries = (values) => {
  const result = {};
  for (const pair of values)
    Object.defineProperty(result, pair[0], {
      value: pair[1],
      enumerable: true,
      configurable: true,
      writable: true,
    });
  return result;
};

export const arrayFlat = (values, depth = 1) =>
  values.reduce(
    (out, value) =>
      out.concat(Array.isArray(value) && depth > 0 ? arrayFlat(value, depth - 1) : [value]),
    [],
  );

export const trimStart = (value) => String(value).replace(/^\s+/, '');
export const trimEnd = (value) => String(value).replace(/\s+$/, '');
