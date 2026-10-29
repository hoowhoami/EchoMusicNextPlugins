// Derived from Folia a8da4437 (AGPL-3.0-only); see diorama-reference.md.
import { measureText } from './native-measure.mjs';
let serial = 1;
const fields = [
  'font',
  'textAlign',
  'textBaseline',
  'fillStyle',
  'globalCompositeOperation',
  'shadowColor',
  'shadowBlur',
  'shadowOffsetX',
  'shadowOffsetY',
];
class TextCanvas {
  constructor() {
    ((this.id = 'diorama-canvas-' + serial++),
      (this._width = 1),
      (this._height = 1),
      (this.commands = []),
      (this.context = {
        canvas: this,
        font: '10px sans-serif',
        textAlign: 'left',
        textBaseline: 'alphabetic',
        fillStyle: '#000000',
        globalCompositeOperation: 'source-over',
        shadowColor: 'transparent',
        shadowBlur: 0,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        stack: [],
        measureText(text) {
          return measureText(this.font, text);
        },
        save() {
          const state = {};
          for (const key of fields) state[key] = this[key];
          this.stack.push(state);
        },
        restore() {
          Object.assign(this, this.stack.pop() || {});
        },
        fillText(text, x, y) {
          const style = {};
          for (const key of fields) style[key] = this[key];
          this.canvas.commands.push({ text, x, y, style });
        },
      }));
  }
  get width() {
    return this._width;
  }
  set width(value) {
    ((this._width = value), (this.commands = []));
  }
  get height() {
    return this._height;
  }
  set height(value) {
    ((this._height = value), (this.commands = []));
  }
  getContext(type) {
    if (type !== '2d') throw Error('Diorama recorder accepts Canvas2D text only');
    return this.context;
  }
}
const document = {
  createElement(kind) {
    if (kind !== 'canvas') throw Error('Diorama source requested unsupported DOM element');
    return new TextCanvas();
  },
};
export { document };
