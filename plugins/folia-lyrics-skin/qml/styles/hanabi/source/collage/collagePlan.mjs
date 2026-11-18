// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/hanabi/collage/collagePlan.ts
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
import { splitLyricGraphemes } from '../../../../shared/text/graphemeTiming.mjs';
import { segmentLyricWords } from '../../../lumiere/word-segmentation.mjs';
import { createRng } from '../hanabiRandom.mjs';
import { clamp, mixColor } from '../mg/mgMath.mjs';
const FAMILY_RECIPES = {
  uchiage: ['strips', 'scrapbook', 'stickerbomb'],
  kiku: ['echo', 'strips', 'window'],
  botan: ['stickerbomb', 'scrapbook', 'window'],
  yanagi: ['quiet', 'echo'],
  senrin: ['stickerbomb', 'strips', 'scrapbook'],
  hoshikuzu: ['window', 'quiet', 'stickerbomb'],
  obi: ['strips', 'scrapbook', 'echo'],
  senko: ['window', 'echo', 'strips'],
  senkohanabi: ['quiet', 'scrapbook'],
  shakudama: ['echo', 'strips', 'stickerbomb'],
};
const CANDY = [16757713, 12120806, 16773544, 14140671, 16763304, 11066623];
const CANDY_INK = 2826045;
const DEEP_CARD = 1906744;
const HANABI_FALLBACK_ICON = 'Flower';
const ICON_INKS = [16736162, 4174591, 16753434, 10185727, 3066272];
const BUBBLE_LABELS = [
  '\u2661',
  '!!',
  '\u266A',
  'LOVE',
  'yay!',
  '(\u2267\u25BD\u2266)',
  '\u2606\u5F61',
];
const WINDOW_TITLES = [
  '\u2661 hanabi.exe',
  '\u266A lyric.txt',
  '\u2726 night_sky.png',
  '\u2606 summer.mp3',
  '\u2661 kirakira.app',
];
const SHAPES = ['heart', 'star', 'sparkle', 'flower', 'cloud', 'ribbon', 'cat'];
const STRIP_STYLES = ['film', 'cut', 'lace'];
const STRIP_THICKNESS = { film: 0.075, cut: 0.045, lace: 0.06 };
const pick = (list, random) => list[Math.floor(random() * list.length) % list.length];
const pastel = (color, amount = 0.45) => mixColor(color, 16777215, amount);
const LATIN =
  /^[\u{41}-\u{5a}\u{61}-\u{7a}\u{aa}\u{ba}\u{c0}-\u{d6}\u{d8}-\u{f6}\u{f8}-\u{2b8}\u{2e0}-\u{2e4}\u{1d00}-\u{1d25}\u{1d2c}-\u{1d5c}\u{1d62}-\u{1d65}\u{1d6b}-\u{1d77}\u{1d79}-\u{1dbe}\u{1e00}-\u{1eff}\u{2071}\u{207f}\u{2090}-\u{209c}\u{212a}-\u{212b}\u{2132}\u{214e}\u{2160}-\u{2188}\u{2c60}-\u{2c7f}\u{a722}-\u{a787}\u{a78b}-\u{a7dc}\u{a7f1}-\u{a7ff}\u{ab30}-\u{ab5a}\u{ab5c}-\u{ab64}\u{ab66}-\u{ab69}\u{fb00}-\u{fb06}\u{ff21}-\u{ff3a}\u{ff41}-\u{ff5a}\u{10780}-\u{10785}\u{10787}-\u{107b0}\u{107b2}-\u{107ba}\u{1df00}-\u{1df1e}\u{1df25}-\u{1df2a}\u{30}-\u{39}\u{b2}-\u{b3}\u{b9}\u{bc}-\u{be}\u{660}-\u{669}\u{6f0}-\u{6f9}\u{7c0}-\u{7c9}\u{966}-\u{96f}\u{9e6}-\u{9ef}\u{9f4}-\u{9f9}\u{a66}-\u{a6f}\u{ae6}-\u{aef}\u{b66}-\u{b6f}\u{b72}-\u{b77}\u{be6}-\u{bf2}\u{c66}-\u{c6f}\u{c78}-\u{c7e}\u{ce6}-\u{cef}\u{d58}-\u{d5e}\u{d66}-\u{d78}\u{de6}-\u{def}\u{e50}-\u{e59}\u{ed0}-\u{ed9}\u{f20}-\u{f33}\u{1040}-\u{1049}\u{1090}-\u{1099}\u{1369}-\u{137c}\u{16ee}-\u{16f0}\u{17e0}-\u{17e9}\u{17f0}-\u{17f9}\u{1810}-\u{1819}\u{1946}-\u{194f}\u{19d0}-\u{19da}\u{1a80}-\u{1a89}\u{1a90}-\u{1a99}\u{1b50}-\u{1b59}\u{1bb0}-\u{1bb9}\u{1c40}-\u{1c49}\u{1c50}-\u{1c59}\u{2070}\u{2074}-\u{2079}\u{2080}-\u{2089}\u{2150}-\u{2182}\u{2185}-\u{2189}\u{2460}-\u{249b}\u{24ea}-\u{24ff}\u{2776}-\u{2793}\u{2cfd}\u{3007}\u{3021}-\u{3029}\u{3038}-\u{303a}\u{3192}-\u{3195}\u{3220}-\u{3229}\u{3248}-\u{324f}\u{3251}-\u{325f}\u{3280}-\u{3289}\u{32b1}-\u{32bf}\u{a620}-\u{a629}\u{a6e6}-\u{a6ef}\u{a830}-\u{a835}\u{a8d0}-\u{a8d9}\u{a900}-\u{a909}\u{a9d0}-\u{a9d9}\u{a9f0}-\u{a9f9}\u{aa50}-\u{aa59}\u{abf0}-\u{abf9}\u{ff10}-\u{ff19}\u{10107}-\u{10133}\u{10140}-\u{10178}\u{1018a}-\u{1018b}\u{102e1}-\u{102fb}\u{10320}-\u{10323}\u{10341}\u{1034a}\u{103d1}-\u{103d5}\u{104a0}-\u{104a9}\u{10858}-\u{1085f}\u{10879}-\u{1087f}\u{108a7}-\u{108af}\u{108fb}-\u{108ff}\u{10916}-\u{1091b}\u{109bc}-\u{109bd}\u{109c0}-\u{109cf}\u{109d2}-\u{109ff}\u{10a40}-\u{10a48}\u{10a7d}-\u{10a7e}\u{10a9d}-\u{10a9f}\u{10aeb}-\u{10aef}\u{10b58}-\u{10b5f}\u{10b78}-\u{10b7f}\u{10ba9}-\u{10baf}\u{10cfa}-\u{10cff}\u{10d30}-\u{10d39}\u{10d40}-\u{10d49}\u{10e60}-\u{10e7e}\u{10f1d}-\u{10f26}\u{10f51}-\u{10f54}\u{10fc5}-\u{10fcb}\u{11052}-\u{1106f}\u{110f0}-\u{110f9}\u{11136}-\u{1113f}\u{111d0}-\u{111d9}\u{111e1}-\u{111f4}\u{112f0}-\u{112f9}\u{11450}-\u{11459}\u{114d0}-\u{114d9}\u{11650}-\u{11659}\u{116c0}-\u{116c9}\u{116d0}-\u{116e3}\u{11730}-\u{1173b}\u{118e0}-\u{118f2}\u{11950}-\u{11959}\u{11bf0}-\u{11bf9}\u{11c50}-\u{11c6c}\u{11d50}-\u{11d59}\u{11da0}-\u{11da9}\u{11de0}-\u{11de9}\u{11f50}-\u{11f59}\u{11fc0}-\u{11fd4}\u{12400}-\u{1246e}\u{16130}-\u{16139}\u{16a60}-\u{16a69}\u{16ac0}-\u{16ac9}\u{16b50}-\u{16b59}\u{16b5b}-\u{16b61}\u{16d70}-\u{16d79}\u{16e80}-\u{16e96}\u{16ff4}-\u{16ff6}\u{1ccf0}-\u{1ccf9}\u{1d2c0}-\u{1d2d3}\u{1d2e0}-\u{1d2f3}\u{1d360}-\u{1d378}\u{1d7ce}-\u{1d7ff}\u{1e140}-\u{1e149}\u{1e2f0}-\u{1e2f9}\u{1e4f0}-\u{1e4f9}\u{1e5f1}-\u{1e5fa}\u{1e8c7}-\u{1e8cf}\u{1e950}-\u{1e959}\u{1ec71}-\u{1ecab}\u{1ecad}-\u{1ecaf}\u{1ecb1}-\u{1ecb4}\u{1ed01}-\u{1ed2d}\u{1ed2f}-\u{1ed3d}\u{1f100}-\u{1f10c}\u{1fbf0}-\u{1fbf9}'’\- ]+$/u;
const pickCollageKeyword = (line) => {
  if (!line) return null;
  const text = line.fullText.trim();
  const graphemes = splitLyricGraphemes(text).filter((grapheme) => grapheme.trim().length > 0);
  const shout = (word) => (LATIN.test(word) ? word.toLocaleUpperCase() : word);
  if (graphemes.length >= 2 && graphemes.length <= 5) return shout(text);
  let best = null;
  let bestLength = 0;
  segmentLyricWords(line).forEach((part) => {
    const word = part.segment.trim();
    const length = splitLyricGraphemes(word).length;
    if (!part.isWordLike || length < 2 || length > 10) return;
    if (length > bestLength) {
      best = word;
      bestLength = length;
    }
  });
  return best ? shout(best) : null;
};
const chooseCollageRecipe = (family, isBridge, previous, random) => {
  var _a;
  if (isBridge) return 'bridge';
  const preferred =
    (_a = FAMILY_RECIPES[family]) != null ? _a : ['scrapbook', 'strips', 'stickerbomb'];
  const choices = preferred.filter((recipe) => recipe !== previous);
  const list = choices.length > 0 ? choices : preferred;
  const total = (list.length * (list.length + 1)) / 2;
  let roll = random() * total;
  for (let index = 0; index < list.length; index += 1) {
    roll -= list.length - index;
    if (roll < 0) return list[index];
  }
  return list[0];
};
const countOf = (base, amount, min = 1) =>
  amount <= 0 ? 0 : Math.max(min, Math.round(base * amount));
const planShotCollage = (input) => {
  var _a;
  if (input.amount <= 0) return { recipe: null, items: [] };
  const random = createRng(`${input.seed}:collage`);
  const recipe =
    input.isBridge && input.opening
      ? 'opening'
      : chooseCollageRecipe(input.family, input.isBridge, input.previous, random);
  const { bounds, screen, unit, amount } = input;
  const items = [];
  const exit = { exitAt: input.exitAt, exitDuration: input.exitDuration };
  const candy = [
    ...CANDY,
    pastel(input.palette.accent),
    pastel((_a = input.palette.sparks[1]) != null ? _a : input.palette.accent),
  ];
  const candyColor = () => pick(candy, random);
  const railGap = unit * 0.14;
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;
  const sx = screen.x + screen.width / 2;
  const clampX = (x, pad) =>
    clamp(x, screen.x + railGap * 0.5 + pad, screen.x + screen.width - pad);
  const clampY = (y, pad) => clamp(y, screen.y + pad, screen.y + screen.height - pad);
  const signed = () => (random() < 0.5 ? -1 : 1);
  const motifs = input.motifs.length > 0 ? input.motifs : ['HANABI', '\u82B1\u706B'];
  const motif = () => pick(motifs, random);
  const sticker = (shape, x, y, size, delay, layer = 'front', label2 = null) =>
    __spreadValues(
      {
        kind: 'sticker',
        shape,
        x: clampX(x, size * 0.6),
        y: clampY(y, size * 0.6),
        size,
        rotation: (random() - 0.5) * 0.7,
        color: candyColor(),
        label: label2,
        layer,
        at: input.enterAt + delay,
      },
      exit,
    );
  const corner = (index, out) => {
    const dx = index === 0 || index === 3 ? -1 : 1;
    const dy = index < 2 ? -1 : 1;
    return {
      x: (dx < 0 ? bounds.x : bounds.x + bounds.width) + dx * out,
      y: (dy < 0 ? bounds.y : bounds.y + bounds.height) + dy * out * 0.6,
    };
  };
  const strip = (style, side, delay) => {
    const thickness = Math.max(style === 'cut' ? 14 : 18, unit * STRIP_THICKNESS[style]);
    const gap = unit * 0.05 + thickness / 2;
    let y = side < 0 ? bounds.y - gap : bounds.y + bounds.height + gap;
    y = clampY(y, thickness);
    return __spreadValues(
      {
        kind: 'strip',
        style,
        x: sx,
        y,
        length: Math.hypot(screen.width, screen.height) * 1.25,
        thickness,
        rotation: side * (0.06 + random() * 0.1),
        color: candyColor(),
        speed: signed() * unit * (style === 'film' ? 0.12 : 0.05) * (0.8 + random() * 0.4),
        from: signed(),
        at: input.enterAt + delay,
      },
      exit,
    );
  };
  const echo = (axis, side, alpha) => {
    var _a2;
    const text = (_a2 = input.keyword) != null ? _a2 : motif();
    if (!text.trim()) return null;
    const size = unit * (axis === 'x' ? 0.13 : 0.11);
    if (axis === 'x') {
      const y = side < 0 ? bounds.y - size * 0.75 : bounds.y + bounds.height + size * 0.75;
      return __spreadValues(
        {
          kind: 'echo',
          axis,
          text,
          size,
          alpha,
          x: sx,
          y: clampY(y, size * 0.5),
          width: screen.width * 1.3,
          height: size * 1.25,
          rotation: (random() - 0.5) * 0.08,
          color: random() < 0.5 ? input.palette.paper : candyColor(),
          speed: side * unit * 0.07,
          at: input.enterAt - 0.15,
        },
        exit,
      );
    }
    const width = size * Math.max(1, Array.from(text).length) * 0.9 + size * 0.4;
    const free = (screen.width - bounds.width) / 2;
    const x = side < 0 ? bounds.x - width * 0.55 : bounds.x + bounds.width + width * 0.55;
    return __spreadValues(
      {
        kind: 'echo',
        axis,
        text,
        size,
        alpha,
        // 两侧放不下就贴在画面边上（在字后面，淡）；左边让开竖排跑马灯与画框的朱印。
        x: clamp(
          free > width * 0.6 ? x : side < 0 ? -Infinity : Infinity,
          screen.x + railGap + width * 0.5,
          screen.x + screen.width - unit * 0.06 - width * 0.5,
        ),
        y: cy,
        width,
        height: screen.height * 1.3,
        rotation: 0,
        color: random() < 0.5 ? input.palette.paper : candyColor(),
        speed: side * unit * 0.06,
        at: input.enterAt - 0.15,
      },
      exit,
    );
  };
  const patch = (pad, offset, pattern, delay) => {
    const dark = input.block === 'none' || input.block === 'outline' || input.block === 'marker';
    return __spreadValues(
      {
        kind: 'patch',
        x: cx + offset * signed(),
        y: cy + offset * signed() * 0.6,
        width: bounds.width + pad * 2,
        height: bounds.height + pad * 2,
        rotation: (random() - 0.5) * 0.09,
        color: dark ? DEEP_CARD : candyColor(),
        pattern,
        dark,
        at: input.enterAt + delay,
      },
      exit,
    );
  };
  const tape = (index, delay, around) => {
    const length = unit * (0.12 + random() * 0.04);
    const x = index === 0 || index === 3 ? around.x : around.x + around.width;
    const y = index < 2 ? around.y : around.y + around.height;
    const diagonal = index === 0 || index === 2 ? -1 : 1;
    return __spreadValues(
      {
        kind: 'tape',
        x,
        y,
        length,
        width: length * 0.3,
        rotation: diagonal * (0.62 + random() * 0.2),
        color: candyColor(),
        pattern: pick(['stripe', 'dot', 'check'], random),
        at: input.enterAt + delay,
      },
      exit,
    );
  };
  const label = (delay) => {
    const size = Math.max(12, unit * 0.026);
    const text =
      random() < 0.5
        ? `No.${String(input.shotNumber + 1).padStart(2, '0')}`
        : `#${String(input.shotNumber + 1).padStart(2, '0')} ${pick(['\u266A', '\u2661', '\u2726'], random)}`;
    const at = corner(3, size * 0.4);
    return __spreadValues(
      {
        kind: 'label',
        x: clampX(at.x + size * 2.2, size * 3),
        y: clampY(at.y + size * 0.9, size),
        text,
        color: candyColor(),
        size,
        rotation: (random() - 0.5) * 0.2,
        at: input.enterAt + delay,
      },
      exit,
    );
  };
  const stickerSize = () => unit * (0.065 + random() * 0.04);
  switch (recipe) {
    case 'scrapbook': {
      const pad = unit * 0.045;
      const card = patch(pad, unit * 0.012, pick(['grid', 'dots', 'gingham'], random), -0.12);
      items.push(patch(pad * 0.6, unit * 0.04, 'plain', -0.2), card);
      const around = {
        x: card.x - card.width / 2,
        y: card.y - card.height / 2,
        width: card.width,
        height: card.height,
      };
      const first = Math.floor(random() * 2);
      items.push(tape(first, 0.05, around), tape(first + 2, 0.12, around));
      for (let k = 0; k < countOf(1.5, amount); k += 1) {
        const at = corner((first + 1 + k * 2) % 4, unit * 0.03);
        items.push(sticker(pick(SHAPES, random), at.x, at.y, stickerSize(), 0.25 + k * 0.1));
      }
      items.push(label(0.3));
      break;
    }
    case 'strips': {
      const side = random() < 0.5 ? -1 : 1;
      const first = pick(STRIP_STYLES, random);
      items.push(strip(first, side, -0.1));
      if (amount >= 0.75)
        items.push(
          strip(
            pick(
              STRIP_STYLES.filter((style) => style !== first),
              random,
            ),
            side === -1 ? 1 : -1,
            0.05,
          ),
        );
      for (let k = 0; k < countOf(2, amount); k += 1) {
        const at = corner((k * 2 + (side < 0 ? 1 : 0)) % 4, unit * 0.04);
        items.push(
          sticker(
            k % 2 === 0 ? 'sparkle' : 'star',
            at.x,
            at.y,
            stickerSize() * 0.85,
            0.2 + k * 0.12,
          ),
        );
      }
      break;
    }
    case 'echo': {
      const vertical = screen.width - bounds.width > unit * 0.5;
      const first = echo(vertical ? 'y' : 'x', -1, 0.3);
      const second = echo(vertical ? 'y' : 'x', 1, 0.3);
      if (first) items.push(first);
      if (second && amount >= 0.75) items.push(second);
      const at = corner(1, unit * 0.04);
      items.push(
        sticker(
          'bubble',
          at.x,
          at.y,
          stickerSize() * 1.6,
          0.3,
          'front',
          pick(BUBBLE_LABELS, random),
        ),
      );
      break;
    }
    case 'window': {
      const pad = unit * 0.05;
      const bar = Math.max(16, unit * 0.04);
      const width = bounds.width + pad * 2;
      const height = bounds.height + pad * 2 + bar;
      const win = __spreadValues(
        {
          kind: 'window',
          x: cx,
          y: cy - bar / 2,
          width,
          height,
          rotation: (random() - 0.5) * 0.05,
          bar,
          title: pick(WINDOW_TITLES, random),
          at: input.enterAt - 0.18,
        },
        exit,
      );
      items.push(win);
      for (let k = 0; k < countOf(2, amount); k += 1) {
        const at = corner(k === 0 ? 0 : 2, unit * 0.035);
        items.push(sticker(pick(SHAPES, random), at.x, at.y, stickerSize(), 0.25 + k * 0.12));
      }
      break;
    }
    case 'stickerbomb': {
      const count = countOf(4, amount, 2);
      for (let k = 0; k < count; k += 1) {
        const at2 = corner(k % 4, unit * (0.03 + 0.03 * Math.floor(k / 4)));
        const jitter = unit * 0.03;
        items.push(
          sticker(
            pick(SHAPES, random),
            at2.x + (random() - 0.5) * jitter,
            at2.y + (random() - 0.5) * jitter,
            stickerSize(),
            0.15 + k * 0.08,
          ),
        );
      }
      const at = corner(Math.floor(random() * 4), unit * 0.09);
      items.push(
        sticker(
          'bubble',
          at.x,
          at.y,
          stickerSize() * 1.5,
          0.4,
          'front',
          pick(BUBBLE_LABELS, random),
        ),
      );
      break;
    }
    case 'quiet': {
      const row = echo('x', random() < 0.5 ? -1 : 1, 0.16);
      if (row) items.push(row);
      const at = corner(Math.floor(random() * 4), unit * 0.03);
      items.push(sticker('sparkle', at.x, at.y, stickerSize() * 0.7, 0.35));
      break;
    }
    case 'opening': {
      const opening = input.opening;
      const leave = { exitAt: Math.max(input.start + 1.2, input.end - 0.7), exitDuration: 0.5 };
      const titleSize = Math.min(
        unit * 0.11,
        (screen.width * 0.5) / Math.max(4, Array.from(opening.title).length * 0.62),
      );
      const width = Math.min(
        screen.width * 0.72,
        Math.max(unit * 0.6, titleSize * Array.from(opening.title).length * 0.7 + unit * 0.2),
      );
      const bar = Math.max(16, unit * 0.045);
      const height = titleSize * 1.9 + bar + (opening.artist ? unit * 0.06 : 0);
      const y = screen.y + screen.height * 0.42;
      const at = input.start + 0.25;
      items.push(
        __spreadValues(
          {
            kind: 'window',
            x: sx,
            y,
            width,
            height,
            rotation: -0.02,
            bar,
            title: '\u266A now playing',
            at,
          },
          leave,
        ),
        __spreadValues(
          {
            kind: 'headline',
            x: sx,
            y: y + bar / 2 - (opening.artist ? unit * 0.02 : 0),
            text: opening.title,
            color: candyColor(),
            size: titleSize,
            rotation: -0.03,
            at: at + 0.18,
          },
          leave,
        ),
      );
      if (opening.artist) {
        items.push(
          __spreadValues(
            {
              kind: 'label',
              x: sx,
              y: y + height / 2 - unit * 0.045,
              text: opening.artist,
              color: candyColor(),
              size: Math.max(12, unit * 0.028),
              rotation: 0.02,
              at: at + 0.4,
            },
            leave,
          ),
        );
      }
      const card = { x: sx - width / 2, y: y - height / 2, width, height };
      [0, 1, 2, 3].forEach((k) => {
        const x = k === 0 || k === 3 ? card.x : card.x + card.width;
        const cornerY = k < 2 ? card.y : card.y + card.height;
        items.push(
          __spreadValues(
            __spreadProps(
              __spreadValues(
                {},
                sticker(
                  pick(['heart', 'star', 'ribbon', 'sparkle'], random),
                  x,
                  cornerY,
                  unit * 0.075,
                  0,
                ),
              ),
              { at: at + 0.3 + k * 0.08 },
            ),
            leave,
          ),
        );
      });
      const floaters = countOf(5, amount, 2);
      for (let k = 0; k < floaters; k += 1) {
        items.push({
          kind: 'floater',
          shape: pick(['heart', 'star', 'sparkle'], random),
          x: screen.x + screen.width * (0.1 + random() * 0.8),
          y: screen.y + screen.height * 1.08,
          rise: screen.height * (1.25 + random() * 0.3),
          size: unit * (0.045 + random() * 0.04),
          color: candyColor(),
          at: input.start + 0.6 + (k / floaters) * Math.max(0.5, input.end - input.start - 1.5),
          duration: 3.4 + random() * 1.4,
          sway: unit * (0.02 + random() * 0.03),
        });
      }
      break;
    }
    case 'bridge': {
      const film = strip('film', 1, 0);
      film.y = screen.y + screen.height * (0.62 + random() * 0.12);
      film.at = input.start + 0.1;
      items.push(film);
      const floaters = countOf(7, amount, 3);
      const span = Math.max(0.5, input.end - input.start);
      for (let k = 0; k < floaters; k += 1) {
        const at = input.start + (k / floaters) * span * 0.8 + random() * 0.3;
        items.push({
          kind: 'floater',
          shape: pick(['heart', 'star', 'sparkle', 'flower'], random),
          x: screen.x + screen.width * (0.08 + random() * 0.84),
          y: screen.y + screen.height * 1.08,
          rise: screen.height * (1.25 + random() * 0.3),
          size: unit * (0.05 + random() * 0.05),
          color: candyColor(),
          at,
          duration: 3.2 + random() * 1.6,
          sway: unit * (0.02 + random() * 0.03),
        });
      }
      break;
    }
  }
  const icons = input.icons && input.icons.length > 0 ? input.icons : [HANABI_FALLBACK_ICON];
  let iconTurn = Math.floor(random() * icons.length);
  const nextIcon = () => icons[iconTurn++ % icons.length];
  const mains = input.bursts.filter((burst) => burst.main);
  const popped =
    recipe === 'opening'
      ? []
      : input.isBridge
        ? mains.filter((_, index) => index % 2 === 0).slice(0, 5)
        : mains.slice(0, 1);
  popped.forEach((burst) => {
    var _a2, _b, _c;
    if (random() > Math.min(1, 0.55 + 0.35 * amount)) return;
    const size = unit * (input.isBridge ? 0.1 : 0.115) * (0.9 + random() * 0.25);
    const view =
      (_b = (_a2 = input.screenAt) == null ? void 0 : _a2.call(input, burst.at + 0.35)) != null
        ? _b
        : screen;
    const halfWidth = size * 0.6;
    const left = view.x + railGap * 0.5 + halfWidth;
    const right = view.x + view.width - halfWidth - size * 0.3;
    const top = view.y + size * 0.8;
    const bottom = view.y + view.height * 0.8;
    const preferRight = input.isBridge ? burst.x > sx : burst.x >= cx;
    const beside = (dir) => ({
      x:
        dir > 0
          ? bounds.x + bounds.width + halfWidth + size * 0.3
          : bounds.x - halfWidth - size * 0.3,
      y: bounds.y + size * 0.2,
    });
    const candidates = input.isBridge
      ? [
          {
            x: burst.x + (preferRight ? 1 : -1) * burst.radius * 0.45,
            y: burst.y - burst.radius * 0.35,
          },
        ]
      : [
          beside(preferRight ? 1 : -1),
          beside(preferRight ? -1 : 1),
          { x: cx + (random() - 0.5) * bounds.width * 0.3, y: bounds.y - size * 0.75 },
        ];
    const fits = (p) => p.x >= left && p.x <= right && p.y >= top && p.y <= bottom;
    const spot = (_c = candidates.find(fits)) != null ? _c : candidates[0];
    items.push({
      kind: 'pop',
      icon: nextIcon(),
      x: clamp(spot.x, left, Math.max(left, right)),
      y: clamp(spot.y, top, Math.max(top, bottom)),
      color: pick(ICON_INKS, random),
      size,
      rotation: (preferRight ? 1 : -1) * (0.08 + random() * 0.18),
      at: burst.at + 0.04,
      duration: 1.3,
    });
  });
  input.launches.slice(0, 2).forEach((launch) => {
    if (random() > 0.45 + 0.25 * amount) return;
    items.push({
      kind: 'whoosh',
      icon: nextIcon(),
      fromX: launch.fromX,
      fromY: launch.fromY,
      toX: launch.toX,
      toY: launch.toY,
      at: launch.at,
      duration: launch.duration,
      color: pick(ICON_INKS, random),
      size: Math.max(18, unit * 0.055),
    });
  });
  return { recipe, items };
};
export {
  CANDY,
  CANDY_INK,
  DEEP_CARD,
  HANABI_FALLBACK_ICON,
  ICON_INKS,
  STRIP_STYLES,
  chooseCollageRecipe,
  pastel,
  pickCollageKeyword,
  planShotCollage,
};
