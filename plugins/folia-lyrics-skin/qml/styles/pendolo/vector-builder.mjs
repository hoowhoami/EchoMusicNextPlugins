// Source mesh construction seam: retain its original local outlines for Qt's GPU path renderer.
// Same teeth/spokes/engravings and part ordering; Qt keeps analytic circle arcs instead of tessellated triangles.
export class VectorBuilder {
  constructor() {
    this.commands = [];
    this.part = 0;
  }
  setActivePartId(id) {
    this.part = id;
  }
  get vertexCount() {
    return 0;
  }
  toFloat32() {
    return this.commands;
  }
  push(path, width, stroke, fill) {
    this.commands.push({
      part: this.part,
      path,
      width,
      stroke: stroke || null,
      fill: fill || null,
    });
  }
  appendLine(x0, y0, x1, y1, width, rgba, extend) {
    const dx = x1 - x0,
      dy = y1 - y0,
      len = Math.hypot(dx, dy);
    if (len < 1e-6) return;
    const e = extend || 0;
    this.push(
      'M' +
        (x0 - (dx / len) * e) +
        ',' +
        (y0 - (dy / len) * e) +
        'L' +
        (x1 + (dx / len) * e) +
        ',' +
        (y1 + (dy / len) * e),
      width,
      rgba,
      null
    );
  }
  appendPolyline(points, width, rgba, closed) {
    const pts = points.filter(
      (p, i) => !i || Math.hypot(p.x - points[i - 1].x, p.y - points[i - 1].y) > 1e-6
    );
    if (
      closed &&
      pts.length > 2 &&
      Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].y - pts[pts.length - 1].y) <= 1e-6
    )
      pts.pop();
    if (pts.length < 2) return;
    this.push(
      pts.map((p, i) => (i ? 'L' : 'M') + p.x + ',' + p.y).join('') + (closed ? 'Z' : ''),
      width,
      rgba,
      null
    );
  }
  appendCircleStroke(cx, cy, r, width, rgba) {
    if (r <= 0 || width <= 0) return;
    this.push(
      'M' +
        (cx + r) +
        ',' +
        cy +
        'A' +
        r +
        ',' +
        r +
        ' 0 1 0 ' +
        (cx - r) +
        ',' +
        cy +
        'A' +
        r +
        ',' +
        r +
        ' 0 1 0 ' +
        (cx + r) +
        ',' +
        cy +
        'Z',
      width,
      rgba,
      null
    );
  }
  appendFilledPolygonFromCenter(cx, cy, points, rgba) {
    if (points.length < 3) return;
    this.push(
      points.map((p, i) => (i ? 'L' : 'M') + p.x + ',' + p.y).join('') + 'Z',
      0,
      null,
      rgba
    );
  }
  appendArrowHead(x, y, rgba) {
    this.push(
      'M' + x + ',' + (y - 4) + 'L' + (x + 8) + ',' + y + 'L' + x + ',' + (y + 4) + 'Z',
      0,
      null,
      rgba
    );
  }
}
