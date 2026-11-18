// Qt 6.12 Array.from(string) visits UTF-16 units; for..of preserves ECMAScript code points.
export function codePoints(text) {
  const result = [];
  for (const point of text) result.push(point);
  return result;
}
