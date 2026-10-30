// Data-only Canvas2D for the original source's one-time textures/text draw instructions.
// Native complete-string metrics supply measureText; this module never estimates advances.
import { multiply } from '../sonnet/scene-graph.mjs';
import { getMeasureContext } from './native-measure.mjs';
let nextCanvas = 1;
const defaults = () => ({
  font: '10px sans-serif',
  textBaseline: 'alphabetic',
  fillStyle: '#000000',
  strokeStyle: '#000000',
  globalAlpha: 1,
  globalCompositeOperation: 'source-over',
  lineWidth: 1,
  lineCap: 'butt',
  lineJoin: 'miter',
  matrix: [1, 0, 0, 0, 1, 0],
});
class Context {
  constructor(canvas) {
    this.canvas = canvas;
    this.reset();
  }
  reset() {
    Object.assign(this, defaults());
    this.stack = [];
    this.path = [];
    this.canvas.commands = [];
  }
  save() {
    const state = {};
    for (const key of Object.keys(defaults()))
      state[key] = Array.isArray(this[key]) ? this[key].slice() : this[key];
    this.stack.push(state);
  }
  restore() {
    if (this.stack.length) Object.assign(this, this.stack.pop());
  }
  resetTransform() {
    this.matrix = [1, 0, 0, 0, 1, 0];
  }
  setTransform(a, b, c, d, e, f) {
    this.matrix = [a, c, e, b, d, f];
  }
  transform(a, b, c, d, e, f) {
    this.matrix = multiply(this.matrix, [a, c, e, b, d, f]);
  }
  translate(x, y) {
    this.transform(1, 0, 0, 1, x, y);
  }
  rotate(angle) {
    const c = Math.cos(angle),
      s = Math.sin(angle);
    this.transform(c, s, -s, c, 0, 0);
  }
  scale(x, y) {
    this.transform(x, 0, 0, y, 0, 0);
  }
  measureText(text) {
    const context = getMeasureContext();
    context.font = this.font.replace(/^normal normal /, '');
    return context.measureText(text);
  }
  createRadialGradient(...points) {
    return {
      type: 'radial',
      points,
      stops: [],
      addColorStop(position, color) {
        this.stops.push({ position, color });
      },
    };
  }
  createLinearGradient(...points) {
    return {
      type: 'linear',
      points,
      stops: [],
      addColorStop(position, color) {
        this.stops.push({ position, color });
      },
    };
  }
  beginPath() {
    this.path = [];
  }
  closePath() {
    this.path.push(['closePath']);
  }
  moveTo(x, y) {
    this.path.push(['moveTo', x, y]);
  }
  lineTo(x, y) {
    this.path.push(['lineTo', x, y]);
  }
  arc(x, y, r, a, b, ccw = false) {
    this.path.push(['arc', x, y, r, a, b, ccw]);
  }
  record(kind, values) {
    const style = {};
    for (const key of Object.keys(defaults()))
      style[key] = Array.isArray(this[key]) ? this[key].slice() : this[key];
    this.canvas.commands.push(Object.assign({ kind, style }, values));
  }
  fill() {
    this.record('path', { path: this.path.map((part) => part.slice()), stroke: false });
  }
  stroke() {
    this.record('path', { path: this.path.map((part) => part.slice()), stroke: true });
  }
  fillRect(x, y, width, height) {
    this.record('rect', { x, y, width, height });
  }
  clearRect(x, y, width, height) {
    this.record('clear', { x, y, width, height });
  }
  fillText(text, x, y) {
    this.record('text', { text, x, y, stroke: false });
  }
  strokeText(text, x, y) {
    this.record('text', { text, x, y, stroke: true });
  }
}
export class SourceCanvas {
  constructor() {
    this.id = 'canvas-' + nextCanvas++;
    this.commands = [];
    this._width = 300;
    this._height = 150;
    this.context = new Context(this);
  }
  get width() {
    return this._width;
  }
  set width(value) {
    this._width = Math.max(0, Math.floor(value));
    this.context.reset();
  }
  get height() {
    return this._height;
  }
  set height(value) {
    this._height = Math.max(0, Math.floor(value));
    this.context.reset();
  }
  getContext(kind) {
    if (kind !== '2d') throw new Error('Lumiere source requires Canvas2D');
    return this.context;
  }
}
export function createCanvas() {
  return new SourceCanvas();
}
