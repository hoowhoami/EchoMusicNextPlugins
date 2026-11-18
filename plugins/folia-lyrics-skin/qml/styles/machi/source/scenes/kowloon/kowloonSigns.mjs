// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/machi/scenes/kowloon/kowloonSigns.ts
import {
  document,
  OffscreenCanvas,
  globalThis,
  Image,
  ImageData,
  math as Math,
  performance,
  window,
  ResizeObserver,
  requestAnimationFrame,
  cancelAnimationFrame,
  AbortController,
  DOMException,
  Path2D,
} from '../../../environment.mjs';
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value })
    : (obj[key] = value);
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {})) if (__hasOwnProp.call(b, prop)) __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop)) __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __publicField = (obj, key, value) =>
  __defNormalProp(obj, typeof key !== 'symbol' ? key + '' : key, value);
import * as THREE from '../../../three.mjs';
import { mergeGeometries } from '../../../three/BufferGeometryUtils.mjs';
import { adjustLightnessForContrast } from '../../_shared/utils/themeColorMath.mjs';
import { createVisualizerRng } from '../../_shared/components/visualizer/visualizerSeedHash.mjs';
import { prepareWordColorMatchers } from '../../_shared/components/visualizer/wordColoring.mjs';
import { machiNeonGroup } from '../../engine/beatFx.mjs';
import { resolveMachiFlicker } from '../../engine/director.mjs';
import { MachiLedStrip } from '../../engine/ledStrip.mjs';
import { MachiLyricScreen } from '../../engine/lyricScreen.mjs';
import { vivid } from '../../engine/palette.mjs';
import { context2d, createCanvas, createMachiMeasure } from '../../engine/signRaster.mjs';
import { KowloonHologram, resolveKowloonHologramText } from './hologram.mjs';
import { paintKowloonBarSign, paintKowloonSign } from './kowloonSignPaint.mjs';
const VERTICAL_SHOPS = [
  ['\u7FA9\u9AD4\u8A3A\u6240', 'CYBER CLINIC'],
  ['\u591C\u7E3D\u6703', 'NIGHT CLUB'],
  ['\u9EBB\u96C0\u9928'],
  ['\u8DCC\u6253'],
  ['\u5927\u62BC'],
  ['\u65C5\u9928', 'HOTEL'],
  ['\u7259\u79D1', 'DENTAL'],
  ['\u96FB\u8166\u7DAD\u4FEE'],
  ['\u9AEE\u5ECA'],
  ['\u627E\u63DB\u5E97'],
  ['\u7FA9\u80A2'],
  ['\u6851\u62FF'],
];
const HORIZONTAL_SHOPS = [
  '\u51B0\u5BA4',
  '\u9B5A\u86CB\u7C89',
  '\u5361\u62C9OK',
  '\u7576\u8216',
  '\u7DB2\u5427',
  '\u96C0\u9928',
  '\u71D2\u81D8',
  '\u6DBC\u8336',
  '\u96FB\u5B50\u7159',
  '\u8A18\u61B6\u4EA4\u6613',
];
const NEON_COLORS = ['#ff4fb0', '#3fe8ff', '#ffb547', '#57ff9a', '#ff5a4a', '#b38bff'];
const BOX_STYLES = [
  ['#f4efe2', '#c8282c'],
  ['#ffd23f', '#1c1c1c'],
  ['#d8262c', '#fff4d6'],
  ['#1f6fd1', '#ffffff'],
  ['#18a058', '#ffffff'],
];
const PX_PER_METER = { fine: 300, shop: 220 };
const ATLAS_WIDTH = 2048;
const ATLAS_PAD = 6;
const ATLAS_SLOTS = [
  { group: 0, beat: 0 },
  { group: 0, beat: 1 },
  { group: 0, beat: 2 },
  { group: 1, beat: 1 },
  { group: 2, beat: 2 },
];
const packAtlas = (sizes) => {
  const order = sizes
    .map((size, index) => __spreadProps(__spreadValues({}, size), { index }))
    .sort((a, b) => b.height - a.height);
  const rects = new Array(sizes.length);
  let x = ATLAS_PAD;
  let y = ATLAS_PAD;
  let row = 0;
  order.forEach((size) => {
    if (x + size.width + ATLAS_PAD > ATLAS_WIDTH) {
      x = ATLAS_PAD;
      y += row + ATLAS_PAD;
      row = 0;
    }
    rects[size.index] = { x, y, width: size.width, height: size.height };
    x += size.width + ATLAS_PAD;
    row = Math.max(row, size.height);
  });
  return { rects, height: Math.ceil((y + row + ATLAS_PAD) / 4) * 4 };
};
const atlasFace = (placement, rect, atlasHeight) => {
  const geometry = new THREE.PlaneGeometry(placement.width, placement.height);
  const uv = geometry.getAttribute('uv');
  const u0 = rect.x / ATLAS_WIDTH;
  const u1 = (rect.x + rect.width) / ATLAS_WIDTH;
  const vTop = 1 - rect.y / atlasHeight;
  const vBottom = 1 - (rect.y + rect.height) / atlasHeight;
  for (let index = 0; index < uv.count; index += 1) {
    uv.setXY(index, u0 + uv.getX(index) * (u1 - u0), vBottom + uv.getY(index) * (vTop - vBottom));
  }
  geometry.rotateY(placement.rotationY);
  geometry.translate(placement.position.x, placement.position.y, placement.position.z);
  return geometry;
};
const resolveKowloonTickerText = (target, lines, song) => {
  var _a;
  const current = target.kind === 'line' ? lines[target.index] : void 0;
  if ((_a = current == null ? void 0 : current.translation) == null ? void 0 : _a.trim())
    return `\u25C6 ${current.translation.trim()}   `;
  return `\u266A ${song.title || 'KOWLOON'}${song.artist ? ` \u2014 ${song.artist}` : ''}   \u25C6   \u4E5D\u9F8D\u57CE\u5BE8   \u25C6   OPEN ALL NIGHT   \u25C6   `;
};
class KowloonSigns {
  constructor(materials, blend, placements, seed) {
    __publicField(this, 'blend', blend);
    __publicField(this, 'seed', seed);
    __publicField(this, 'group', new THREE.Group());
    __publicField(this, 'screen');
    __publicField(this, 'ticker');
    __publicField(this, 'hologram');
    __publicField(this, 'canvas');
    __publicField(this, 'texture');
    __publicField(this, 'atlasMaterials');
    __publicField(this, 'entries');
    __publicField(this, 'geometries', []);
    __publicField(this, 'content', null);
    __publicField(this, 'boardTarget', null);
    __publicField(this, 'lines', []);
    __publicField(this, 'tickerDirty', true);
    this.group.name = 'Signs';
    const { screen, ticker, hologram } = placements;
    this.screen = new MachiLyricScreen(materials, blend, screen.width, screen.height);
    this.group.add(this.screen.createFace(screen.position, screen.rotationY, 'Bar/screen'));
    this.ticker = new MachiLedStrip(materials, blend, ticker.width, ticker.height, 9);
    this.group.add(this.ticker.createFace(ticker.position, ticker.rotationY, 'Bar/ticker'));
    this.hologram = new KowloonHologram(materials, hologram.base, hologram.panel);
    this.group.add(this.hologram.group);
    const random = createVisualizerRng(`kowloon:signs:${seed}`);
    const verticalPool = [...VERTICAL_SHOPS];
    const horizontalPool = [...HORIZONTAL_SHOPS];
    const take = (pool) => pool.splice(Math.floor(random() * pool.length), 1)[0];
    const neon = () => {
      const color = NEON_COLORS[Math.floor(random() * NEON_COLORS.length)];
      return {
        kind: 'neon',
        color,
        border: random() < 0.5 ? color : NEON_COLORS[Math.floor(random() * NEON_COLORS.length)],
      };
    };
    const box = () => {
      const [background, ink] = BOX_STYLES[Math.floor(random() * BOX_STYLES.length)];
      return { kind: 'box', background, ink };
    };
    const entries = [];
    entries.push({
      placement: placements.barSign,
      group: 0,
      fine: true,
      paint: (context, content) =>
        paintKowloonBarSign(context, this.rectOf(0), {
          font: content.font,
          title: content.song.title || content.song.album || 'KOWLOON',
          neon: content.palette.neon,
          glass: '#3fe8ff',
          mark: '#ff4fb0',
        }),
    });
    placements.boards.forEach((board) => {
      const index = entries.length;
      if (board.role === 'artist') {
        entries.push({
          placement: board,
          group: 0,
          fine: true,
          paint: (context, content) => {
            const background = '#f4efe2';
            const ink = adjustLightnessForContrast(
              vivid(content.palette.brand[0], 0.62, 0.3, 0.46),
              background,
              4.5,
            );
            paintKowloonSign(context, this.rectOf(index), {
              font: content.font,
              text:
                content.song.artist || content.song.album || content.song.title || '\u6B4C\u624B',
              vertical: true,
              style: { kind: 'box', background, ink },
            });
          },
        });
        return;
      }
      let text;
      let caption;
      let style;
      if (board.role === 'billboard') {
        text = '\u4E5D\u9F8D\u57CE\u5BE8';
        style = { kind: 'neon', color: '#ff4a5a', border: '#3fe8ff' };
      } else if (board.role === 'stall') {
        text = '\u5927\u724C\u6A94';
        style = { kind: 'box', background: '#f3ead6', ink: '#c6282c' };
      } else if (board.vertical) {
        [text, caption] = take(verticalPool);
        style = random() < 0.55 ? neon() : box();
      } else {
        text = take(horizontalPool);
        style = random() < 0.6 ? neon() : box();
      }
      const group =
        board.role === 'shop' && style.kind === 'neon' && random() < 0.45
          ? 1 + Math.floor(random() * 2)
          : 0;
      entries.push({
        placement: board,
        group,
        fine: board.role === 'billboard',
        paint: (context) =>
          paintKowloonSign(context, this.rectOf(index), {
            font: { stack: this.content.font.stack, weight: 800 },
            text,
            vertical: board.vertical,
            style,
            caption,
          }),
      });
    });
    const packed = packAtlas(
      entries.map((entry) => {
        const density = entry.fine ? PX_PER_METER.fine : PX_PER_METER.shop;
        return {
          width: Math.round(entry.placement.width * density),
          height: Math.round(entry.placement.height * density),
        };
      }),
    );
    this.entries = entries.map((entry, index) =>
      __spreadProps(__spreadValues({}, entry), { rect: packed.rects[index] }),
    );
    this.canvas = createCanvas(ATLAS_WIDTH, packed.height);
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 8;
    this.atlasMaterials = ATLAS_SLOTS.map((slot) => {
      const material = materials.track(new THREE.MeshBasicMaterial({ map: this.texture }));
      material.name = `machi:glow:neon${slot.group}-${slot.beat}`;
      return material;
    });
    const faces = ATLAS_SLOTS.map(() => []);
    let steady = 0;
    this.entries.forEach((entry) => {
      const slot =
        entry.group === 0
          ? steady++ % 3
          : ATLAS_SLOTS.findIndex((candidate) => candidate.group === entry.group);
      faces[slot].push(atlasFace(entry.placement, entry.rect, packed.height));
    });
    this.atlasMaterials.forEach((material, slotIndex) => {
      const slotFaces = faces[slotIndex];
      if (slotFaces.length === 0) return;
      const merged = mergeGeometries(slotFaces, false);
      slotFaces.forEach((face) => face.dispose());
      this.geometries.push(merged);
      const result = new THREE.Mesh(merged, material);
      const slot = ATLAS_SLOTS[slotIndex];
      result.name = `Neon/${slot.group}-${slot.beat}`;
      this.group.add(result);
    });
  }
  rectOf(index) {
    return this.entries[index].rect;
  }
  /** 换歌 / 换主题：重画图集里所有的招牌、屏幕的字面。 */
  setContent(content) {
    this.content = content;
    const context = context2d(this.canvas);
    context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.entries.forEach((entry) => entry.paint(context, content));
    this.texture.needsUpdate = true;
    const { palette, song, font } = content;
    this.screen.setContent({
      palette,
      font,
      measure: createMachiMeasure(font),
      matchers: prepareWordColorMatchers(content.theme.wordColors),
      cardTitle: `\u266A ${song.title || 'KOWLOON'}`,
      cardSubtitle: song.artist || song.album || '',
    });
    this.ticker.invalidate();
    this.hologram.invalidate();
    this.tickerDirty = true;
  }
  showBoard(target, lines, immediate, showText = true) {
    this.lines = lines;
    this.boardTarget = target;
    this.screen.show(target, lines, immediate, showText);
    this.tickerDirty = true;
    const content = this.content;
    if (content) {
      const text = resolveKowloonHologramText(
        showText ? target : { kind: 'card' },
        lines,
        content.song,
      );
      this.hologram.setText(text, content.font, immediate);
    }
  }
  preheat(target, lines, showText) {
    this.screen.preheat(target, lines, showText);
  }
  update(frame) {
    const content = this.content;
    if (!content) return;
    this.screen.update(frame);
    const chorus = this.screen.chorus;
    if (this.tickerDirty && this.boardTarget) {
      this.tickerDirty = false;
      this.ticker.setText(
        resolveKowloonTickerText(this.boardTarget, this.lines, content.song),
        content.font,
      );
    }
    this.ticker.update({
      delta: frame.delta,
      staticMode: frame.staticMode,
      speed: 0.8 + 0.4 * chorus,
      audio: frame.audio,
    });
    const neon = Math.pow(frame.artificial, 1.4) * (1 + 0.1 * chorus);
    const steady = neon * (0.93 + 0.07 * frame.flicker);
    const broken = (salt, offset) => {
      if (frame.staticMode) return neon;
      const flicker = resolveMachiFlicker(frame.ambientTime + offset, `${this.seed}:${salt}`, 1.8);
      return neon * (flicker < 1 ? 0.12 + 0.3 * (flicker - 0.5) : 1);
    };
    const levels = [steady, broken('neonA', 1.3), broken('neonB', 3.7)];
    this.atlasMaterials.forEach((material, index) => {
      const slot = ATLAS_SLOTS[index];
      material.color.setScalar(levels[slot.group] * machiNeonGroup(frame.beat, slot.beat));
    });
    this.hologram.update({
      time: frame.ambientTime,
      delta: frame.delta,
      staticMode: frame.staticMode,
      level: (0.3 + 0.7 * (1 - frame.daylight)) * (0.9 + 0.1 * frame.flicker) * (1 + 0.15 * chorus),
      color: this.blend.get('holo'),
    });
  }
  get busy() {
    return this.screen.busy || this.hologram.busy;
  }
  dispose() {
    this.screen.dispose();
    this.ticker.dispose();
    this.hologram.dispose();
    this.texture.dispose();
    this.geometries.forEach((geometry) => geometry.dispose());
  }
}
export { KowloonSigns, resolveKowloonTickerText };
