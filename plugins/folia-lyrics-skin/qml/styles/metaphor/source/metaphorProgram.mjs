// Copyright (c) 2026 chthollyphile. Derived from Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935; AGPL-3.0-only.
// Source: src/components/visualizer/metaphor/metaphorProgram.ts
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
import { arrayAt } from './compat.mjs';
import { createVisualizerRng } from './visualizerSeedHash.mjs';
const METAPHOR_PREROLL = 0.6;
const METAPHOR_TAIL = 2;
const INTERLUDE_MIN = 2.4;
const MIN_SHOT = 0.6;
const MIN_CUE = 0.15;
const LOOP_SECONDS = 48;
const INTERLUDE_SEGMENT = 24;
const INTERLUDE_SPLIT = 36;
const INTERLUDE_HORIZON = 720;
const INTENSITY_PACE = { calm: 0.75, normal: 1, chaotic: 1.3 };
const SAME_ONSET = 0.3;
const SCREEN_ANGLES = [0.26, 0.52, 0.79, 1.31];
const CJK = /[぀-ヿ㐀-鿿가-힯ｦ-ﾟ]/u;
const pick = (rng, weights, avoid) => {
  const entries = Object.entries(weights).filter(([key, weight]) => weight > 0 && key !== avoid);
  const pool = entries.length > 0 ? entries : Object.entries(weights);
  const total = pool.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = rng() * total;
  for (const [key, weight] of pool) {
    roll -= weight;
    if (roll <= 0) return key;
  }
  return pool[pool.length - 1][0];
};
const FIRST_SHOT = { wide: 3, close: 2, dutch: 1.5, void: 0.8, follow: 1.5 };
const MIDDLE_SHOT = { close: 3, follow: 2, macro: 2, dutch: 1.5, wide: 1, void: 0.6 };
const INTERLUDE_SHOT = { void: 3, macro: 2, pullback: 1.5, wide: 1.5, dutch: 1 };
const span = (rng, min, max) => min + rng() * (max - min);
const sign = (rng) => (rng() < 0.5 ? -1 : 1);
const shotPose = (kind, rng) => {
  switch (kind) {
    case 'wide':
      return { roll: span(rng, -0.05, 0.05), offsetX: 0, offsetY: 0 };
    case 'close':
      return {
        roll: span(rng, -0.07, 0.07),
        offsetX: span(rng, -0.08, 0.08),
        offsetY: span(rng, -0.05, 0.05),
      };
    case 'follow':
      return { roll: span(rng, -0.03, 0.03), offsetX: 0, offsetY: 0 };
    case 'macro':
      return {
        roll: sign(rng) * span(rng, 0.25, 0.6),
        offsetX: span(rng, -0.12, 0.12),
        offsetY: span(rng, -0.12, 0.12),
      };
    case 'dutch':
      return { roll: sign(rng) * span(rng, 0.2, 0.4), offsetX: span(rng, -0.1, 0.1), offsetY: 0 };
    case 'void':
      return {
        roll: span(rng, -0.04, 0.04),
        offsetX: sign(rng) * span(rng, 0.18, 0.3),
        offsetY: sign(rng) * span(rng, 0.1, 0.22),
      };
    case 'pullback':
      return { roll: span(rng, -0.1, 0.1), offsetX: 0, offsetY: 0 };
    case 'pushin':
      return { roll: span(rng, -0.12, 0.12), offsetX: 0, offsetY: 0 };
  }
};
const makeShot = (context, start, end, kind) => {
  const { rng } = context;
  const chance = context.negative ? (context.chorus ? 0.34 : 0.2) : 0;
  const roll = rng();
  const invert = context.inverted < 2 && roll < chance;
  context.inverted = invert ? context.inverted + 1 : 0;
  context.lastKind = kind;
  let angle = SCREEN_ANGLES[Math.floor(rng() * SCREEN_ANGLES.length)];
  if (angle === context.lastAngle)
    angle = SCREEN_ANGLES[(SCREEN_ANGLES.indexOf(angle) + 1) % SCREEN_ANGLES.length];
  context.lastAngle = angle;
  return __spreadProps(__spreadValues({ start, end, kind }, shotPose(kind, rng)), {
    invert,
    screenAngle: angle,
    seed: rng(),
  });
};
const planCuts = (start, end, count, onsets) => {
  const cuts = [];
  const spacing = (end - start) / count;
  for (let index = 1; index < count; index += 1) {
    const ideal = start + spacing * index;
    const near = onsets.reduce(
      (best, onset) => (Math.abs(onset - ideal) < Math.abs(best - ideal) ? onset : best),
      Number.POSITIVE_INFINITY,
    );
    const at = Math.abs(near - ideal) <= spacing * 0.4 ? near : ideal;
    const previous = cuts.length > 0 ? cuts[cuts.length - 1] : start;
    if (at - previous >= MIN_SHOT && end - at >= MIN_SHOT) cuts.push(at);
  }
  return cuts;
};
const lineShots = (context, cue, line, pace) => {
  const duration = cue.end - cue.start;
  const count = Math.max(
    1,
    Math.min(7, Math.round((duration * pace * (context.chorus ? 1.25 : 1)) / 2.6)),
  );
  const onsets = line.words
    .map((word) => word.startTime)
    .filter((time) => time > cue.start + MIN_SHOT && time < cue.end - MIN_SHOT);
  const edges = [cue.start, ...planCuts(cue.start, cue.end, count, onsets), cue.end];
  return edges.slice(0, -1).map((start, index) => {
    var _a, _b;
    const end = edges[index + 1];
    const last = index === edges.length - 2;
    let weights = index === 0 ? FIRST_SHOT : MIDDLE_SHOT;
    if (index === 0 && cue.transition === 'smash') return makeShot(context, start, end, 'pushin');
    if (last && index > 0 && end - start >= 1.4)
      weights = __spreadProps(__spreadValues({}, weights), { pullback: 5 });
    if (context.chorus)
      weights = __spreadProps(__spreadValues({}, weights), {
        macro: ((_a = weights.macro) != null ? _a : 0) + 1.5,
        dutch: ((_b = weights.dutch) != null ? _b : 0) + 1,
      });
    return makeShot(context, start, end, pick(context.rng, weights, context.lastKind));
  });
};
const interludeShots = (context, start, end, pace) => {
  const shots = [];
  let at = start;
  while (end - at > 0.01) {
    const length = span(context.rng, 4.5, 8) / pace;
    const next = end - (at + length) < 2.5 ? end : at + length;
    shots.push(makeShot(context, at, next, pick(context.rng, INTERLUDE_SHOT, context.lastKind)));
    at = next;
  }
  return shots;
};
const pickComposition = (rng, text, previous) => {
  const chars = Array.from(text.replace(/\s+/gu, ''));
  const cjk = chars.filter((char) => CJK.test(char)).length / Math.max(1, chars.length);
  const words = cjk > 0.5 ? chars.length / 2 : text.trim().split(/\s+/u).length;
  return pick(
    rng,
    {
      block: 2,
      justify: words >= 3 ? 3 : 0,
      stair: chars.length >= 6 ? 2 : 0,
      hero: words >= 2 ? 2.5 : 0,
      column: cjk > 0.7 && chars.length >= 2 && chars.length <= 16 ? 2 : 0,
      scatter: words >= 3 ? 1.5 : 0,
    },
    previous,
  );
};
const pickTransition = (rng, enabled, intoChorus) => {
  if (!enabled) return 'cut';
  return intoChorus
    ? pick(rng, { flood: 3, smash: 3, cut: 1.5 })
    : pick(rng, { cut: 5.5, flood: 1.5, smash: 1.2 });
};
const sungLines = (lines) => {
  const kept = [];
  lines
    .map((line, lineIndex) => ({ line, lineIndex }))
    .filter(
      ({ line }) =>
        /[\u{30}-\u{39}\u{41}-\u{5a}\u{61}-\u{7a}\u{aa}\u{b2}-\u{b3}\u{b5}\u{b9}-\u{ba}\u{bc}-\u{be}\u{c0}-\u{d6}\u{d8}-\u{f6}\u{f8}-\u{2c1}\u{2c6}-\u{2d1}\u{2e0}-\u{2e4}\u{2ec}\u{2ee}\u{370}-\u{374}\u{376}-\u{377}\u{37a}-\u{37d}\u{37f}\u{386}\u{388}-\u{38a}\u{38c}\u{38e}-\u{3a1}\u{3a3}-\u{3f5}\u{3f7}-\u{481}\u{48a}-\u{52f}\u{531}-\u{556}\u{559}\u{560}-\u{588}\u{5d0}-\u{5ea}\u{5ef}-\u{5f2}\u{620}-\u{64a}\u{660}-\u{669}\u{66e}-\u{66f}\u{671}-\u{6d3}\u{6d5}\u{6e5}-\u{6e6}\u{6ee}-\u{6fc}\u{6ff}\u{710}\u{712}-\u{72f}\u{74d}-\u{7a5}\u{7b1}\u{7c0}-\u{7ea}\u{7f4}-\u{7f5}\u{7fa}\u{800}-\u{815}\u{81a}\u{824}\u{828}\u{840}-\u{858}\u{860}-\u{86a}\u{870}-\u{887}\u{889}-\u{88f}\u{8a0}-\u{8c9}\u{904}-\u{939}\u{93d}\u{950}\u{958}-\u{961}\u{966}-\u{96f}\u{971}-\u{980}\u{985}-\u{98c}\u{98f}-\u{990}\u{993}-\u{9a8}\u{9aa}-\u{9b0}\u{9b2}\u{9b6}-\u{9b9}\u{9bd}\u{9ce}\u{9dc}-\u{9dd}\u{9df}-\u{9e1}\u{9e6}-\u{9f1}\u{9f4}-\u{9f9}\u{9fc}\u{a05}-\u{a0a}\u{a0f}-\u{a10}\u{a13}-\u{a28}\u{a2a}-\u{a30}\u{a32}-\u{a33}\u{a35}-\u{a36}\u{a38}-\u{a39}\u{a59}-\u{a5c}\u{a5e}\u{a66}-\u{a6f}\u{a72}-\u{a74}\u{a85}-\u{a8d}\u{a8f}-\u{a91}\u{a93}-\u{aa8}\u{aaa}-\u{ab0}\u{ab2}-\u{ab3}\u{ab5}-\u{ab9}\u{abd}\u{ad0}\u{ae0}-\u{ae1}\u{ae6}-\u{aef}\u{af9}\u{b05}-\u{b0c}\u{b0f}-\u{b10}\u{b13}-\u{b28}\u{b2a}-\u{b30}\u{b32}-\u{b33}\u{b35}-\u{b39}\u{b3d}\u{b5c}-\u{b5d}\u{b5f}-\u{b61}\u{b66}-\u{b6f}\u{b71}-\u{b77}\u{b83}\u{b85}-\u{b8a}\u{b8e}-\u{b90}\u{b92}-\u{b95}\u{b99}-\u{b9a}\u{b9c}\u{b9e}-\u{b9f}\u{ba3}-\u{ba4}\u{ba8}-\u{baa}\u{bae}-\u{bb9}\u{bd0}\u{be6}-\u{bf2}\u{c05}-\u{c0c}\u{c0e}-\u{c10}\u{c12}-\u{c28}\u{c2a}-\u{c39}\u{c3d}\u{c58}-\u{c5a}\u{c5c}-\u{c5d}\u{c60}-\u{c61}\u{c66}-\u{c6f}\u{c78}-\u{c7e}\u{c80}\u{c85}-\u{c8c}\u{c8e}-\u{c90}\u{c92}-\u{ca8}\u{caa}-\u{cb3}\u{cb5}-\u{cb9}\u{cbd}\u{cdc}-\u{cde}\u{ce0}-\u{ce1}\u{ce6}-\u{cef}\u{cf1}-\u{cf2}\u{d04}-\u{d0c}\u{d0e}-\u{d10}\u{d12}-\u{d3a}\u{d3d}\u{d4e}\u{d54}-\u{d56}\u{d58}-\u{d61}\u{d66}-\u{d78}\u{d7a}-\u{d7f}\u{d85}-\u{d96}\u{d9a}-\u{db1}\u{db3}-\u{dbb}\u{dbd}\u{dc0}-\u{dc6}\u{de6}-\u{def}\u{e01}-\u{e30}\u{e32}-\u{e33}\u{e40}-\u{e46}\u{e50}-\u{e59}\u{e81}-\u{e82}\u{e84}\u{e86}-\u{e8a}\u{e8c}-\u{ea3}\u{ea5}\u{ea7}-\u{eb0}\u{eb2}-\u{eb3}\u{ebd}\u{ec0}-\u{ec4}\u{ec6}\u{ed0}-\u{ed9}\u{edc}-\u{edf}\u{f00}\u{f20}-\u{f33}\u{f40}-\u{f47}\u{f49}-\u{f6c}\u{f88}-\u{f8c}\u{1000}-\u{102a}\u{103f}-\u{1049}\u{1050}-\u{1055}\u{105a}-\u{105d}\u{1061}\u{1065}-\u{1066}\u{106e}-\u{1070}\u{1075}-\u{1081}\u{108e}\u{1090}-\u{1099}\u{10a0}-\u{10c5}\u{10c7}\u{10cd}\u{10d0}-\u{10fa}\u{10fc}-\u{1248}\u{124a}-\u{124d}\u{1250}-\u{1256}\u{1258}\u{125a}-\u{125d}\u{1260}-\u{1288}\u{128a}-\u{128d}\u{1290}-\u{12b0}\u{12b2}-\u{12b5}\u{12b8}-\u{12be}\u{12c0}\u{12c2}-\u{12c5}\u{12c8}-\u{12d6}\u{12d8}-\u{1310}\u{1312}-\u{1315}\u{1318}-\u{135a}\u{1369}-\u{137c}\u{1380}-\u{138f}\u{13a0}-\u{13f5}\u{13f8}-\u{13fd}\u{1401}-\u{166c}\u{166f}-\u{167f}\u{1681}-\u{169a}\u{16a0}-\u{16ea}\u{16ee}-\u{16f8}\u{1700}-\u{1711}\u{171f}-\u{1731}\u{1740}-\u{1751}\u{1760}-\u{176c}\u{176e}-\u{1770}\u{1780}-\u{17b3}\u{17d7}\u{17dc}\u{17e0}-\u{17e9}\u{17f0}-\u{17f9}\u{1810}-\u{1819}\u{1820}-\u{1878}\u{1880}-\u{1884}\u{1887}-\u{18a8}\u{18aa}\u{18b0}-\u{18f5}\u{1900}-\u{191e}\u{1946}-\u{196d}\u{1970}-\u{1974}\u{1980}-\u{19ab}\u{19b0}-\u{19c9}\u{19d0}-\u{19da}\u{1a00}-\u{1a16}\u{1a20}-\u{1a54}\u{1a80}-\u{1a89}\u{1a90}-\u{1a99}\u{1aa7}\u{1b05}-\u{1b33}\u{1b45}-\u{1b4c}\u{1b50}-\u{1b59}\u{1b83}-\u{1ba0}\u{1bae}-\u{1be5}\u{1c00}-\u{1c23}\u{1c40}-\u{1c49}\u{1c4d}-\u{1c7d}\u{1c80}-\u{1c8a}\u{1c90}-\u{1cba}\u{1cbd}-\u{1cbf}\u{1ce9}-\u{1cec}\u{1cee}-\u{1cf3}\u{1cf5}-\u{1cf6}\u{1cfa}\u{1d00}-\u{1dbf}\u{1e00}-\u{1f15}\u{1f18}-\u{1f1d}\u{1f20}-\u{1f45}\u{1f48}-\u{1f4d}\u{1f50}-\u{1f57}\u{1f59}\u{1f5b}\u{1f5d}\u{1f5f}-\u{1f7d}\u{1f80}-\u{1fb4}\u{1fb6}-\u{1fbc}\u{1fbe}\u{1fc2}-\u{1fc4}\u{1fc6}-\u{1fcc}\u{1fd0}-\u{1fd3}\u{1fd6}-\u{1fdb}\u{1fe0}-\u{1fec}\u{1ff2}-\u{1ff4}\u{1ff6}-\u{1ffc}\u{2070}-\u{2071}\u{2074}-\u{2079}\u{207f}-\u{2089}\u{2090}-\u{209c}\u{2102}\u{2107}\u{210a}-\u{2113}\u{2115}\u{2119}-\u{211d}\u{2124}\u{2126}\u{2128}\u{212a}-\u{212d}\u{212f}-\u{2139}\u{213c}-\u{213f}\u{2145}-\u{2149}\u{214e}\u{2150}-\u{2189}\u{2460}-\u{249b}\u{24ea}-\u{24ff}\u{2776}-\u{2793}\u{2c00}-\u{2ce4}\u{2ceb}-\u{2cee}\u{2cf2}-\u{2cf3}\u{2cfd}\u{2d00}-\u{2d25}\u{2d27}\u{2d2d}\u{2d30}-\u{2d67}\u{2d6f}\u{2d80}-\u{2d96}\u{2da0}-\u{2da6}\u{2da8}-\u{2dae}\u{2db0}-\u{2db6}\u{2db8}-\u{2dbe}\u{2dc0}-\u{2dc6}\u{2dc8}-\u{2dce}\u{2dd0}-\u{2dd6}\u{2dd8}-\u{2dde}\u{2e2f}\u{3005}-\u{3007}\u{3021}-\u{3029}\u{3031}-\u{3035}\u{3038}-\u{303c}\u{3041}-\u{3096}\u{309d}-\u{309f}\u{30a1}-\u{30fa}\u{30fc}-\u{30ff}\u{3105}-\u{312f}\u{3131}-\u{318e}\u{3192}-\u{3195}\u{31a0}-\u{31bf}\u{31f0}-\u{31ff}\u{3220}-\u{3229}\u{3248}-\u{324f}\u{3251}-\u{325f}\u{3280}-\u{3289}\u{32b1}-\u{32bf}\u{3400}-\u{4dbf}\u{4e00}-\u{a48c}\u{a4d0}-\u{a4fd}\u{a500}-\u{a60c}\u{a610}-\u{a62b}\u{a640}-\u{a66e}\u{a67f}-\u{a69d}\u{a6a0}-\u{a6ef}\u{a717}-\u{a71f}\u{a722}-\u{a788}\u{a78b}-\u{a7dc}\u{a7f1}-\u{a801}\u{a803}-\u{a805}\u{a807}-\u{a80a}\u{a80c}-\u{a822}\u{a830}-\u{a835}\u{a840}-\u{a873}\u{a882}-\u{a8b3}\u{a8d0}-\u{a8d9}\u{a8f2}-\u{a8f7}\u{a8fb}\u{a8fd}-\u{a8fe}\u{a900}-\u{a925}\u{a930}-\u{a946}\u{a960}-\u{a97c}\u{a984}-\u{a9b2}\u{a9cf}-\u{a9d9}\u{a9e0}-\u{a9e4}\u{a9e6}-\u{a9fe}\u{aa00}-\u{aa28}\u{aa40}-\u{aa42}\u{aa44}-\u{aa4b}\u{aa50}-\u{aa59}\u{aa60}-\u{aa76}\u{aa7a}\u{aa7e}-\u{aaaf}\u{aab1}\u{aab5}-\u{aab6}\u{aab9}-\u{aabd}\u{aac0}\u{aac2}\u{aadb}-\u{aadd}\u{aae0}-\u{aaea}\u{aaf2}-\u{aaf4}\u{ab01}-\u{ab06}\u{ab09}-\u{ab0e}\u{ab11}-\u{ab16}\u{ab20}-\u{ab26}\u{ab28}-\u{ab2e}\u{ab30}-\u{ab5a}\u{ab5c}-\u{ab69}\u{ab70}-\u{abe2}\u{abf0}-\u{abf9}\u{ac00}-\u{d7a3}\u{d7b0}-\u{d7c6}\u{d7cb}-\u{d7fb}\u{f900}-\u{fa6d}\u{fa70}-\u{fad9}\u{fb00}-\u{fb06}\u{fb13}-\u{fb17}\u{fb1d}\u{fb1f}-\u{fb28}\u{fb2a}-\u{fb36}\u{fb38}-\u{fb3c}\u{fb3e}\u{fb40}-\u{fb41}\u{fb43}-\u{fb44}\u{fb46}-\u{fbb1}\u{fbd3}-\u{fd3d}\u{fd50}-\u{fd8f}\u{fd92}-\u{fdc7}\u{fdf0}-\u{fdfb}\u{fe70}-\u{fe74}\u{fe76}-\u{fefc}\u{ff10}-\u{ff19}\u{ff21}-\u{ff3a}\u{ff41}-\u{ff5a}\u{ff66}-\u{ffbe}\u{ffc2}-\u{ffc7}\u{ffca}-\u{ffcf}\u{ffd2}-\u{ffd7}\u{ffda}-\u{ffdc}\u{10000}-\u{1000b}\u{1000d}-\u{10026}\u{10028}-\u{1003a}\u{1003c}-\u{1003d}\u{1003f}-\u{1004d}\u{10050}-\u{1005d}\u{10080}-\u{100fa}\u{10107}-\u{10133}\u{10140}-\u{10178}\u{1018a}-\u{1018b}\u{10280}-\u{1029c}\u{102a0}-\u{102d0}\u{102e1}-\u{102fb}\u{10300}-\u{10323}\u{1032d}-\u{1034a}\u{10350}-\u{10375}\u{10380}-\u{1039d}\u{103a0}-\u{103c3}\u{103c8}-\u{103cf}\u{103d1}-\u{103d5}\u{10400}-\u{1049d}\u{104a0}-\u{104a9}\u{104b0}-\u{104d3}\u{104d8}-\u{104fb}\u{10500}-\u{10527}\u{10530}-\u{10563}\u{10570}-\u{1057a}\u{1057c}-\u{1058a}\u{1058c}-\u{10592}\u{10594}-\u{10595}\u{10597}-\u{105a1}\u{105a3}-\u{105b1}\u{105b3}-\u{105b9}\u{105bb}-\u{105bc}\u{105c0}-\u{105f3}\u{10600}-\u{10736}\u{10740}-\u{10755}\u{10760}-\u{10767}\u{10780}-\u{10785}\u{10787}-\u{107b0}\u{107b2}-\u{107ba}\u{10800}-\u{10805}\u{10808}\u{1080a}-\u{10835}\u{10837}-\u{10838}\u{1083c}\u{1083f}-\u{10855}\u{10858}-\u{10876}\u{10879}-\u{1089e}\u{108a7}-\u{108af}\u{108e0}-\u{108f2}\u{108f4}-\u{108f5}\u{108fb}-\u{1091b}\u{10920}-\u{10939}\u{10940}-\u{10959}\u{10980}-\u{109b7}\u{109bc}-\u{109cf}\u{109d2}-\u{10a00}\u{10a10}-\u{10a13}\u{10a15}-\u{10a17}\u{10a19}-\u{10a35}\u{10a40}-\u{10a48}\u{10a60}-\u{10a7e}\u{10a80}-\u{10a9f}\u{10ac0}-\u{10ac7}\u{10ac9}-\u{10ae4}\u{10aeb}-\u{10aef}\u{10b00}-\u{10b35}\u{10b40}-\u{10b55}\u{10b58}-\u{10b72}\u{10b78}-\u{10b91}\u{10ba9}-\u{10baf}\u{10c00}-\u{10c48}\u{10c80}-\u{10cb2}\u{10cc0}-\u{10cf2}\u{10cfa}-\u{10d23}\u{10d30}-\u{10d39}\u{10d40}-\u{10d65}\u{10d6f}-\u{10d85}\u{10e60}-\u{10e7e}\u{10e80}-\u{10ea9}\u{10eb0}-\u{10eb1}\u{10ec2}-\u{10ec7}\u{10f00}-\u{10f27}\u{10f30}-\u{10f45}\u{10f51}-\u{10f54}\u{10f70}-\u{10f81}\u{10fb0}-\u{10fcb}\u{10fe0}-\u{10ff6}\u{11003}-\u{11037}\u{11052}-\u{1106f}\u{11071}-\u{11072}\u{11075}\u{11083}-\u{110af}\u{110d0}-\u{110e8}\u{110f0}-\u{110f9}\u{11103}-\u{11126}\u{11136}-\u{1113f}\u{11144}\u{11147}\u{11150}-\u{11172}\u{11176}\u{11183}-\u{111b2}\u{111c1}-\u{111c4}\u{111d0}-\u{111da}\u{111dc}\u{111e1}-\u{111f4}\u{11200}-\u{11211}\u{11213}-\u{1122b}\u{1123f}-\u{11240}\u{11280}-\u{11286}\u{11288}\u{1128a}-\u{1128d}\u{1128f}-\u{1129d}\u{1129f}-\u{112a8}\u{112b0}-\u{112de}\u{112f0}-\u{112f9}\u{11305}-\u{1130c}\u{1130f}-\u{11310}\u{11313}-\u{11328}\u{1132a}-\u{11330}\u{11332}-\u{11333}\u{11335}-\u{11339}\u{1133d}\u{11350}\u{1135d}-\u{11361}\u{11380}-\u{11389}\u{1138b}\u{1138e}\u{11390}-\u{113b5}\u{113b7}\u{113d1}\u{113d3}\u{11400}-\u{11434}\u{11447}-\u{1144a}\u{11450}-\u{11459}\u{1145f}-\u{11461}\u{11480}-\u{114af}\u{114c4}-\u{114c5}\u{114c7}\u{114d0}-\u{114d9}\u{11580}-\u{115ae}\u{115d8}-\u{115db}\u{11600}-\u{1162f}\u{11644}\u{11650}-\u{11659}\u{11680}-\u{116aa}\u{116b8}\u{116c0}-\u{116c9}\u{116d0}-\u{116e3}\u{11700}-\u{1171a}\u{11730}-\u{1173b}\u{11740}-\u{11746}\u{11800}-\u{1182b}\u{118a0}-\u{118f2}\u{118ff}-\u{11906}\u{11909}\u{1190c}-\u{11913}\u{11915}-\u{11916}\u{11918}-\u{1192f}\u{1193f}\u{11941}\u{11950}-\u{11959}\u{119a0}-\u{119a7}\u{119aa}-\u{119d0}\u{119e1}\u{119e3}\u{11a00}\u{11a0b}-\u{11a32}\u{11a3a}\u{11a50}\u{11a5c}-\u{11a89}\u{11a9d}\u{11ab0}-\u{11af8}\u{11bc0}-\u{11be0}\u{11bf0}-\u{11bf9}\u{11c00}-\u{11c08}\u{11c0a}-\u{11c2e}\u{11c40}\u{11c50}-\u{11c6c}\u{11c72}-\u{11c8f}\u{11d00}-\u{11d06}\u{11d08}-\u{11d09}\u{11d0b}-\u{11d30}\u{11d46}\u{11d50}-\u{11d59}\u{11d60}-\u{11d65}\u{11d67}-\u{11d68}\u{11d6a}-\u{11d89}\u{11d98}\u{11da0}-\u{11da9}\u{11db0}-\u{11ddb}\u{11de0}-\u{11de9}\u{11ee0}-\u{11ef2}\u{11f02}\u{11f04}-\u{11f10}\u{11f12}-\u{11f33}\u{11f50}-\u{11f59}\u{11fb0}\u{11fc0}-\u{11fd4}\u{12000}-\u{12399}\u{12400}-\u{1246e}\u{12480}-\u{12543}\u{12f90}-\u{12ff0}\u{13000}-\u{1342f}\u{13441}-\u{13446}\u{13460}-\u{143fa}\u{14400}-\u{14646}\u{16100}-\u{1611d}\u{16130}-\u{16139}\u{16800}-\u{16a38}\u{16a40}-\u{16a5e}\u{16a60}-\u{16a69}\u{16a70}-\u{16abe}\u{16ac0}-\u{16ac9}\u{16ad0}-\u{16aed}\u{16b00}-\u{16b2f}\u{16b40}-\u{16b43}\u{16b50}-\u{16b59}\u{16b5b}-\u{16b61}\u{16b63}-\u{16b77}\u{16b7d}-\u{16b8f}\u{16d40}-\u{16d6c}\u{16d70}-\u{16d79}\u{16e40}-\u{16e96}\u{16ea0}-\u{16eb8}\u{16ebb}-\u{16ed3}\u{16f00}-\u{16f4a}\u{16f50}\u{16f93}-\u{16f9f}\u{16fe0}-\u{16fe1}\u{16fe3}\u{16ff2}-\u{16ff6}\u{17000}-\u{18cd5}\u{18cff}-\u{18d1e}\u{18d80}-\u{18df2}\u{1aff0}-\u{1aff3}\u{1aff5}-\u{1affb}\u{1affd}-\u{1affe}\u{1b000}-\u{1b122}\u{1b132}\u{1b150}-\u{1b152}\u{1b155}\u{1b164}-\u{1b167}\u{1b170}-\u{1b2fb}\u{1bc00}-\u{1bc6a}\u{1bc70}-\u{1bc7c}\u{1bc80}-\u{1bc88}\u{1bc90}-\u{1bc99}\u{1ccf0}-\u{1ccf9}\u{1d2c0}-\u{1d2d3}\u{1d2e0}-\u{1d2f3}\u{1d360}-\u{1d378}\u{1d400}-\u{1d454}\u{1d456}-\u{1d49c}\u{1d49e}-\u{1d49f}\u{1d4a2}\u{1d4a5}-\u{1d4a6}\u{1d4a9}-\u{1d4ac}\u{1d4ae}-\u{1d4b9}\u{1d4bb}\u{1d4bd}-\u{1d4c3}\u{1d4c5}-\u{1d505}\u{1d507}-\u{1d50a}\u{1d50d}-\u{1d514}\u{1d516}-\u{1d51c}\u{1d51e}-\u{1d539}\u{1d53b}-\u{1d53e}\u{1d540}-\u{1d544}\u{1d546}\u{1d54a}-\u{1d550}\u{1d552}-\u{1d6a5}\u{1d6a8}-\u{1d6c0}\u{1d6c2}-\u{1d6da}\u{1d6dc}-\u{1d6fa}\u{1d6fc}-\u{1d714}\u{1d716}-\u{1d734}\u{1d736}-\u{1d74e}\u{1d750}-\u{1d76e}\u{1d770}-\u{1d788}\u{1d78a}-\u{1d7a8}\u{1d7aa}-\u{1d7c2}\u{1d7c4}-\u{1d7cb}\u{1d7ce}-\u{1d7ff}\u{1df00}-\u{1df1e}\u{1df25}-\u{1df2a}\u{1e030}-\u{1e06d}\u{1e100}-\u{1e12c}\u{1e137}-\u{1e13d}\u{1e140}-\u{1e149}\u{1e14e}\u{1e290}-\u{1e2ad}\u{1e2c0}-\u{1e2eb}\u{1e2f0}-\u{1e2f9}\u{1e4d0}-\u{1e4eb}\u{1e4f0}-\u{1e4f9}\u{1e5d0}-\u{1e5ed}\u{1e5f0}-\u{1e5fa}\u{1e6c0}-\u{1e6de}\u{1e6e0}-\u{1e6e2}\u{1e6e4}-\u{1e6e5}\u{1e6e7}-\u{1e6ed}\u{1e6f0}-\u{1e6f4}\u{1e6fe}-\u{1e6ff}\u{1e7e0}-\u{1e7e6}\u{1e7e8}-\u{1e7eb}\u{1e7ed}-\u{1e7ee}\u{1e7f0}-\u{1e7fe}\u{1e800}-\u{1e8c4}\u{1e8c7}-\u{1e8cf}\u{1e900}-\u{1e943}\u{1e94b}\u{1e950}-\u{1e959}\u{1ec71}-\u{1ecab}\u{1ecad}-\u{1ecaf}\u{1ecb1}-\u{1ecb4}\u{1ed01}-\u{1ed2d}\u{1ed2f}-\u{1ed3d}\u{1ee00}-\u{1ee03}\u{1ee05}-\u{1ee1f}\u{1ee21}-\u{1ee22}\u{1ee24}\u{1ee27}\u{1ee29}-\u{1ee32}\u{1ee34}-\u{1ee37}\u{1ee39}\u{1ee3b}\u{1ee42}\u{1ee47}\u{1ee49}\u{1ee4b}\u{1ee4d}-\u{1ee4f}\u{1ee51}-\u{1ee52}\u{1ee54}\u{1ee57}\u{1ee59}\u{1ee5b}\u{1ee5d}\u{1ee5f}\u{1ee61}-\u{1ee62}\u{1ee64}\u{1ee67}-\u{1ee6a}\u{1ee6c}-\u{1ee72}\u{1ee74}-\u{1ee77}\u{1ee79}-\u{1ee7c}\u{1ee7e}\u{1ee80}-\u{1ee89}\u{1ee8b}-\u{1ee9b}\u{1eea1}-\u{1eea3}\u{1eea5}-\u{1eea9}\u{1eeab}-\u{1eebb}\u{1f100}-\u{1f10c}\u{1fbf0}-\u{1fbf9}\u{20000}-\u{2a6df}\u{2a700}-\u{2b81d}\u{2b820}-\u{2cead}\u{2ceb0}-\u{2ebe0}\u{2ebf0}-\u{2ee5d}\u{2f800}-\u{2fa1d}\u{30000}-\u{3134a}\u{31350}-\u{33479}]/u.test(
          line.fullText,
        ) && Number.isFinite(line.startTime),
    )
    .sort((a, b) => a.line.startTime - b.line.startTime || a.lineIndex - b.lineIndex)
    .forEach((entry) => {
      const previous = arrayAt(kept, -1);
      if (!previous || entry.line.startTime - previous.line.startTime >= SAME_ONSET)
        kept.push(entry);
    });
  return kept;
};
const compileMetaphorProgram = (lines, options) => {
  var _a, _b, _c;
  const rng = createVisualizerRng(`metaphor:${options.seed}`);
  const composeRng = createVisualizerRng(`metaphor:${options.seed}:compose`);
  const transitionRng = createVisualizerRng(`metaphor:${options.seed}:transition`);
  const splitRng = createVisualizerRng(`metaphor:${options.seed}:split`);
  const pace = options.cutPace * ((_a = INTENSITY_PACE[options.intensity]) != null ? _a : 1);
  const context = {
    rng,
    negative: options.negative,
    chorus: false,
    inverted: 0,
    lastKind: null,
    lastAngle: -1,
  };
  const cues = [];
  const title = (_c = (_b = options.title) == null ? void 0 : _b.trim()) != null ? _c : '';
  const pushInterludeCue = (start, end, text, loop = 0) => {
    context.chorus = false;
    const shotsEnd = loop > 0 ? start + loop : end;
    cues.push({
      lineIndex: -1,
      start,
      end,
      singStart: start,
      singEnd: end,
      composition: 'block',
      shots: interludeShots(context, start, shotsEnd, pace),
      transition:
        cues.length === 0 ? 'cut' : pickTransition(transitionRng, options.transitions, false),
      chorus: false,
      text,
      loop,
    });
  };
  const pushInterlude = (start, end, text) => {
    const endless = !Number.isFinite(end);
    const stop = endless ? start + INTERLUDE_HORIZON : end;
    const length = stop - start;
    const count = length > INTERLUDE_SPLIT ? Math.round(length / INTERLUDE_SEGMENT) : 1;
    let from = start;
    for (let index = 1; index <= count; index += 1) {
      const to = index === count ? stop : start + (length * index) / count + (splitRng() - 0.5) * 6;
      pushInterludeCue(from, to, index === 1 ? text : '');
      from = to;
    }
    if (endless) pushInterludeCue(stop, Number.POSITIVE_INFINITY, '', LOOP_SECONDS);
  };
  const sung = sungLines(lines);
  if (sung.length === 0) {
    pushInterlude(0, Number.POSITIVE_INFINITY, title);
    return { cues };
  }
  let cursor = 0;
  let composition = null;
  sung.forEach(({ line, lineIndex }, order) => {
    var _a2;
    const begin = Math.max(cursor, line.startTime - METAPHOR_PREROLL);
    if (begin - cursor >= INTERLUDE_MIN || (order === 0 && begin - cursor >= 1.2)) {
      pushInterlude(cursor, begin, order === 0 ? title : '');
      cursor = begin;
    }
    const start = cursor;
    const next = (_a2 = arrayAt(sung, order + 1)) == null ? void 0 : _a2.line;
    const singEnd = Number.isFinite(line.endTime)
      ? Math.max(line.endTime, line.startTime + 0.2)
      : line.startTime + 0.2;
    const hold = singEnd + METAPHOR_TAIL;
    const nextBegin = next ? next.startTime - METAPHOR_PREROLL : Number.POSITIVE_INFINITY;
    const end = nextBegin - hold >= INTERLUDE_MIN ? hold : Math.max(nextBegin, start);
    if (end - start < MIN_CUE) return;
    const chorus = Boolean(line.isChorus);
    const transition =
      cues.length === 0
        ? 'cut'
        : pickTransition(transitionRng, options.transitions, chorus && !context.chorus);
    context.chorus = chorus;
    composition = pickComposition(composeRng, line.fullText, composition);
    const cue = {
      lineIndex,
      start,
      end,
      singStart: line.startTime,
      singEnd,
      composition,
      shots: [],
      transition,
      chorus,
      text: '',
      loop: 0,
    };
    cue.shots = lineShots(context, cue, line, pace);
    cues.push(cue);
    cursor = end;
  });
  pushInterlude(cursor, Number.POSITIVE_INFINITY, '');
  return { cues };
};
const findMetaphorCue = (program, time) => {
  const { cues } = program;
  let low = 0;
  let high = cues.length - 1;
  while (low < high) {
    const middle = (low + high + 1) >> 1;
    if (cues[middle].start <= time) low = middle;
    else high = middle - 1;
  }
  return low;
};
const resolveMetaphorCueTime = (cue, time) =>
  cue.loop > 0 ? cue.start + ((((time - cue.start) % cue.loop) + cue.loop) % cue.loop) : time;
const findMetaphorShot = (cue, cueTime) => {
  const { shots } = cue;
  for (let index = shots.length - 1; index > 0; index -= 1) {
    if (shots[index].start <= cueTime) return shots[index];
  }
  return shots[0];
};
export {
  METAPHOR_PREROLL,
  METAPHOR_TAIL,
  compileMetaphorProgram,
  findMetaphorCue,
  findMetaphorShot,
  resolveMetaphorCueTime,
};
