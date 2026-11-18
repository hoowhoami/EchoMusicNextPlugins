// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/lumiere-reference.md.
const IDENTITY = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };
const fromParams = ({ x, y, pivotX, pivotY, scale, rotation }) => {
  const cos = Math.cos(rotation) * scale;
  const sin = Math.sin(rotation) * scale;
  return {
    a: cos,
    b: sin,
    c: -sin,
    d: cos,
    tx: x - (cos * pivotX - sin * pivotY),
    ty: y - (sin * pivotX + cos * pivotY),
  };
};
const multiply = (m, n) => ({
  a: m.a * n.a + m.c * n.b,
  b: m.b * n.a + m.d * n.b,
  c: m.a * n.c + m.c * n.d,
  d: m.b * n.c + m.d * n.d,
  tx: m.a * n.tx + m.c * n.ty + m.tx,
  ty: m.b * n.tx + m.d * n.ty + m.ty,
});
const invert = (m) => {
  const det = m.a * m.d - m.b * m.c || 1e-12;
  return {
    a: m.d / det,
    b: -m.b / det,
    c: -m.c / det,
    d: m.a / det,
    tx: (m.c * m.ty - m.d * m.tx) / det,
    ty: (m.b * m.tx - m.a * m.ty) / det,
  };
};
const applyAffine = (m, x, y) => ({ x: m.a * x + m.c * y + m.tx, y: m.b * x + m.d * y + m.ty });
const cameraBetween = (rest, current) => multiply(fromParams(current), invert(fromParams(rest)));
export { IDENTITY, applyAffine, cameraBetween, fromParams, invert, multiply };
