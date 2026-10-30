// Canvas draw-command adapter for Folia a8da4437. Geometry remains vector data;
// no canvas, pixel buffer, or per-frame bitmap upload is used at runtime.
import { drawFumeBackground } from './background.mjs';

const identity = () => [1, 0, 0, 1, 0, 0];
const point = (x, y) => x + ',' + y;
function polygon(points) {
  return 'M' + points.map((p) => point(p[0], p[1])).join('L') + 'Z';
}
// A closed Canvas polygon uses miter joins. Offset each incident line and
// intersect them; reverse the inner contour for the non-zero winding fill.
function offset(points, distance) {
  return points.map((p, i) => {
    const previous = points[(i + points.length - 1) % points.length];
    const next = points[(i + 1) % points.length];
    const ax = p[0] - previous[0],
      ay = p[1] - previous[1];
    const bx = next[0] - p[0],
      by = next[1] - p[1];
    const al = Math.hypot(ax, ay),
      bl = Math.hypot(bx, by);
    const nx = ay / al + by / bl,
      ny = -ax / al - bx / bl;
    const divisor = (nx * by) / bl - (ny * bx) / bl;
    return [p[0] + (distance * nx) / divisor, p[1] + (distance * ny) / divisor];
  });
}
export function strokeOutline(path, width) {
  const half = width * 0.5;
  if (path.arc) {
    const a = path.arc,
      r = a[2],
      start = a[3],
      end = a[4];
    const at = (radius, angle) =>
      point(a[0] + radius * Math.cos(angle), a[1] + radius * Math.sin(angle));
    const large = end - start > Math.PI ? 1 : 0;
    return (
      'M' +
      at(r + half, start) +
      'A' +
      point(r + half, r + half) +
      ' 0 ' +
      large +
      ' 1 ' +
      at(r + half, end) +
      'A' +
      point(half, half) +
      ' 0 0 1 ' +
      at(r - half, end) +
      'A' +
      point(r - half, r - half) +
      ' 0 ' +
      large +
      ' 0 ' +
      at(r - half, start) +
      'A' +
      point(half, half) +
      ' 0 0 1 ' +
      at(r + half, start) +
      'Z'
    );
  }
  if (!path.closed || path.points.length < 3) throw new Error('Unsupported Fume vector path');
  return polygon(offset(path.points, half)) + polygon(offset(path.points, -half).reverse());
}
export function createRecorder() {
  let matrix = identity(),
    stack = [],
    path = { points: [], closed: false };
  const context = {
    commands: [],
    lineWidth: 1,
    lineCap: 'butt',
    shadowBlur: 0,
    shadowColor: 'transparent',
    strokeStyle: 'black',
    reset() {
      this.commands = [];
      matrix = identity();
      stack = [];
    },
    save() {
      stack.push({
        matrix: matrix.slice(),
        lineWidth: this.lineWidth,
        lineCap: this.lineCap,
        shadowBlur: this.shadowBlur,
        shadowColor: this.shadowColor,
        strokeStyle: this.strokeStyle,
      });
    },
    restore() {
      const state = stack.pop();
      matrix = state.matrix;
      delete state.matrix;
      Object.assign(this, state);
    },
    translate(x, y) {
      matrix[4] += matrix[0] * x + matrix[2] * y;
      matrix[5] += matrix[1] * x + matrix[3] * y;
    },
    scale(x, y) {
      matrix[0] *= x;
      matrix[1] *= x;
      matrix[2] *= y;
      matrix[3] *= y;
    },
    rotate(angle) {
      const c = Math.cos(angle),
        s = Math.sin(angle),
        m = matrix.slice();
      matrix[0] = m[0] * c + m[2] * s;
      matrix[1] = m[1] * c + m[3] * s;
      matrix[2] = m[2] * c - m[0] * s;
      matrix[3] = m[3] * c - m[1] * s;
    },
    beginPath() {
      path = { points: [], closed: false };
    },
    moveTo(x, y) {
      path.points.push([x, y]);
    },
    lineTo(x, y) {
      path.points.push([x, y]);
    },
    closePath() {
      path.closed = true;
    },
    rect(x, y, width, height) {
      path = {
        points: [
          [x, y],
          [x + width, y],
          [x + width, y + height],
          [x, y + height],
        ],
        closed: true,
      };
    },
    ellipse(x, y, rx, ry, rotation, start, end) {
      if (rx !== ry || rotation !== 0) throw new Error('Unsupported Fume ellipse');
      path.arc = [x, y, rx, start, end];
    },
    createLinearGradient(x1, y1, x2, y2) {
      return {
        x1,
        y1,
        x2,
        y2,
        stops: [],
        addColorStop(position, color) {
          this.stops.push({ position, color });
        },
      };
    },
    stroke() {
      const radius = path.arc
        ? path.arc[2]
        : Math.max.apply(
            null,
            path.points.map((p) => Math.max(Math.abs(p[0]), Math.abs(p[1])))
          );
      const gradient = this.strokeStyle;
      const style =
        typeof gradient === 'object'
          ? {
              x1: gradient.x1,
              y1: gradient.y1,
              x2: gradient.x2,
              y2: gradient.y2,
              stops: gradient.stops,
            }
          : gradient;
      this.commands.push({
        matrix: matrix.slice(),
        path,
        outline: strokeOutline(path, this.lineWidth),
        radius: radius + this.lineWidth * 2,
        style,
        blur: this.shadowBlur,
        shadow: this.shadowColor,
      });
    },
  };
  return context;
}
export function recordBackground(context, options, projection) {
  context.reset();
  context.translate(projection.x, projection.y);
  context.scale(projection.scale, projection.scale);
  drawFumeBackground(Object.assign({}, options, { context }));
  return context.commands;
}
export function sparkGeometry(command, dpr) {
  const scale = Math.hypot(command.matrix[0], command.matrix[1]);
  const angle = Math.atan2(command.matrix[1], command.matrix[0]);
  const sigma = command.blur / (2 * Math.max(dpr, 0.001));
  const extent =
    command.radius * scale * (Math.abs(Math.cos(angle)) + Math.abs(Math.sin(angle))) +
    Math.ceil(sigma * 3 + 2);
  const size = Math.ceil(extent * 2),
    physicalSize = Math.max(1, Math.ceil(size * dpr));
  return {
    scale,
    angle,
    sigma,
    extent,
    size,
    physicalSize,
    bytes: physicalSize * physicalSize * 8,
  };
}
