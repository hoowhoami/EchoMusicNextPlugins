// Worker-local immutable Canvas preparation. Missing pixels are discovered, never published.
import { SourceCanvas } from '../lumiere/canvas.mjs';
const standardMath = Math;
let randomState = 1;
export const math = {};
for (const key of Object.getOwnPropertyNames(standardMath)) math[key] = standardMath[key];
math.random = () => {
  randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
  return randomState / 4294967296;
};
let cache = new Map(),
  queries = new Map(),
  images = {};
export function configurePixels(values, seed = 1, sourceImages = {}) {
  cache = new Map(values.map((v) => [v.key, v.pixels]));
  queries.clear();
  randomState = seed >>> 0 || 1;
  images = sourceImages;
}
export function pendingPixels() {
  return [...queries.values()];
}
export class ImageData {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
  }
}
export class Image {
  constructor() {
    this.source = '';
    this.width = 0;
    this.height = 0;
    this.pixels = null;
    this.onload = null;
  }
  get src() {
    return this.source;
  }
  set src(value) {
    this.source = value;
    const data = images[value];
    if (!data) throw Error('Nebbia source image not prepared: ' + value);
    Object.assign(this, data);
    if (this.onload) this.onload();
  }
}
class Canvas extends SourceCanvas {
  constructor() {
    super();
    const canvas = this;
    const context = super.getContext('2d');
    context.createImageData = (w, h) => new ImageData(w, h);
    context.strokeRect = (x, y, w, h) => {
      context.beginPath();
      context.rect(x, y, w, h);
      context.stroke();
    };
    const clear = context.clearRect.bind(context),
      fill = context.fillRect.bind(context);
    context.clearRect = (x, y, w, h) => {
      if (x === 0 && y === 0 && w === canvas.width && h === canvas.height) {
        canvas.commands = [];
        canvas.pixels = null;
      }
      clear(x, y, w, h);
    };
    context.fillRect = (x, y, w, h) => {
      if (
        x === 0 &&
        y === 0 &&
        w === canvas.width &&
        h === canvas.height &&
        context.globalAlpha === 1 &&
        context.globalCompositeOperation === 'source-over' &&
        ['#000', '#000000'].includes(context.fillStyle)
      ) {
        canvas.commands = [];
        canvas.pixels = null;
      }
      fill(x, y, w, h);
    };
    context.getImageData = (x, y, w, h) => canvas.readPixels(x, y, w, h);
    context.drawImage = (source, x, y) => {
      if (x !== 0 || y !== 0 || source.width !== canvas.width || source.height !== canvas.height)
        throw Error('Unsupported immutable canvas copy');
      if (source.pixels) canvas.pixels = source.pixels.slice();
      else canvas.commands = canvas.commands.concat(JSON.parse(JSON.stringify(source.commands)));
      const blur = /^blur\(([\d.]+)px\)$/.exec(context.filter || '');
      canvas.pixelBlur = blur ? Number(blur[1]) : 0;
    };
    context.putImageData = (source, x, y) => {
      if (!canvas.pixels) canvas.pixels = new Uint8ClampedArray(canvas.width * canvas.height * 4);
      for (let row = 0; row < source.height; ++row)
        canvas.pixels.set(
          source.data.subarray(row * source.width * 4, (row + 1) * source.width * 4),
          ((y + row) * canvas.width + x) * 4,
        );
    };
  }
  readPixels(x, y, w, h) {
    if (x !== 0 || y !== 0 || w !== this.width || h !== this.height)
      throw Error('Unsupported Nebbia preparation pixel region');
    if (this.pixels) return { data: this.pixels, width: w, height: h };
    const commands = this.commands,
      key = JSON.stringify([w, h, commands, this.pixelBlur || 0]);
    if (key.length > 2 * 1024 * 1024 || w * h > 1024 * 1024)
      throw Error('Nebbia preparation pixel budget exceeded');
    const value = cache.get(key);
    if (value) return { data: new Uint8ClampedArray(value), width: w, height: h };
    if (queries.size >= 4096) throw Error('Nebbia pixel query count exceeded');
    queries.set(key, { key, width: w, height: h, commands, blur: this.pixelBlur || 0 });
    return new ImageData(w, h);
  }
}
export const document = {
  createElement(kind) {
    if (kind !== 'canvas') throw Error('Nebbia requires only immutable canvas preparation');
    return new Canvas();
  },
  fonts: { check: () => true },
};
export const OffscreenCanvas = undefined;
export const globalThis = { devicePixelRatio: 1 };
// Credits use the same exact ICU/native boundaries as the full-song snapshots.
import { portableGraphemeSegmenter, portableWordSegmenter } from '../lumiere/native-measure.mjs';
export const Intl = {
  Segmenter: class Segmenter {
    constructor(locale, options) {
      this.segmenter =
        options.granularity === 'word' ? portableWordSegmenter : portableGraphemeSegmenter;
    }
    segment(text) {
      return this.segmenter.segment(text);
    }
  },
};
