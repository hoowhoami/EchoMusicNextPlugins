import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const base = new URL('../plugins/folia-lyrics-skin/qml/styles/pendolo/', import.meta.url);
async function port(name) {
  const url = new URL(name + '.mjs', base);
  assert.ok(existsSync(url), `The production Pendolo ${name} module must exist`);
  return import(url);
}
let sourceOracle;
async function source(name) {
  if (!sourceOracle)
    sourceOracle = import(
      'data:text/javascript;base64,' + Buffer.from(sourceOracleCode).toString('base64')
    );
  return (await sourceOracle)[name];
}
const tuning = {
  arcRadius: 0.42,
  arcAngleDeg: 100,
  wheelCenterX: 0,
  wheelCenterY: 0.5,
  tickSnappiness: 2,
  activeScale: 1.25,
  showGearDecor: 'subtle',
  showCenterGradient: true,
  showCoverOnWatchFace: false,
  enableLineGlow: false,
};
const input = {
  centerX: 0,
  centerY: 410,
  baseRadius: 344.4,
  lyricRingRadius: 393.6,
  primaryTextColor: '#ffffff',
  accentTextColor: '#ff4f86',
  backgroundColor: '#080b14',
  showGearDecor: 'full',
};
const lines = Array.from({ length: 60 }, (_, index) => ({
  fullText: '歌词 ' + index,
  startTime: index * 4,
  endTime: index * 4 + 3,
  sourceIndex: index,
}));

test('Pendolo preserves the source defaults and full tuning resolver ranges', async () => {
  const kernel = await port('kernel');
  assert.deepEqual(kernel.resolveSettings({}).tuning, tuning);
  const settings = kernel.resolveSettings({
    pendoloArcRadius: 9,
    pendoloArcAngleDeg: 0,
    pendoloWheelCenterX: -9,
    pendoloWheelCenterY: 3,
    pendoloTickSnappiness: 0,
    pendoloActiveScale: 9,
    pendoloShowGearDecor: 'bad',
    fontWeight: 300,
  });
  assert.deepEqual(settings.tuning, {
    ...tuning,
    arcRadius: 0.8,
    arcAngleDeg: 40,
    wheelCenterX: -0.3,
    wheelCenterY: 0.8,
    tickSnappiness: 0.5,
    activeScale: 1.6,
  });
  assert.equal(settings.fontWeight, 300);
});

test('Wheel positions, height collision spacing and fractional gap anchors match original source', async () => {
  const actual = await port('geometry'),
    oracle = await source('pendoloGeometry');
  const heights = lines.map((_, i) => (i % 3 ? 92 : 240));
  for (const index of [-1, 0, 0.5, 12, 28.5, 59, 60]) {
    for (const dimensions of [
      [1100, 820],
      [320, 640],
      [1920, 1080],
    ]) {
      assert.deepEqual(
        actual.calculatePendoloWheelLayout(lines, index, 0.035, ...dimensions, tuning, 32, heights),
        oracle.calculatePendoloWheelLayout(lines, index, 0.035, ...dimensions, tuning, 32, heights),
      );
    }
  }
});

test('Unwrapped edge fading and before/gap/after anchors retain source timing semantics', async () => {
  const actual = await port('timeline'),
    oracle = await source('pendoloTimeline');
  for (const current of [-1, 0, 5, 59])
    for (const time of [0, 2, 6, 240])
      for (const observed of [false, true])
        assert.equal(
          actual.resolvePendoloFallbackAnchorIndex(lines, current, 5, observed, time),
          oracle.resolvePendoloFallbackAnchorIndex(lines, current, 5, observed, time),
        );
  for (const angle of [-200, -110, -109, -95, -82, 0, 82, 95, 109, 110, 200])
    assert.equal(
      actual.resolvePendoloRotatingLineOpacity(angle, 10, 0.62),
      oracle.resolvePendoloRotatingLineOpacity(angle, 10, 0.62),
    );
});

test('Bass regulator, paused state, all intensity profiles and 15-tooth second spring match source', async () => {
  const actual = await port('clockwork-motion'),
    oracle = await source('pendoloClockworkMotion');
  const profiles = await port('motion-profile'),
    sourceProfiles = await source('pendoloMotionProfile');
  for (const intensity of ['calm', 'normal', 'chaotic', 'bad']) {
    const p = profiles.resolvePendoloMotionProfile(intensity);
    assert.deepEqual(p, sourceProfiles.resolvePendoloMotionProfile(intensity));
    for (const chorus of [false, true])
      for (const active of [false, true])
        assert.deepEqual(
          profiles.resolvePendoloChorusPresentation(chorus, active, p),
          sourceProfiles.resolvePendoloChorusPresentation(chorus, active, p),
        );
    const a = actual.createPendoloClockworkMotionState(),
      b = oracle.createPendoloClockworkMotionState();
    for (let frame = 0; frame < 420; frame++) {
      const args = [1 / 60, frame % 160, frame > 140 && frame < 190, p];
      assert.deepEqual(
        actual.stepPendoloClockworkMotion(a, ...args),
        oracle.stepPendoloClockworkMotion(b, ...args),
      );
    }
    assert.deepEqual(a, b);
  }
});

test('All teeth, spokes, jewels, orbiting planets and hairspring triangles match source byte for byte', async () => {
  const actual = await port('clockwork-meshes'),
    oracle = await source('pendoloClockworkMeshes');
  for (const decor of ['none', 'subtle', 'full']) {
    const settings = { ...input, showGearDecor: decor };
    const a = actual.buildPendoloClockworkCachedScene(settings),
      b = oracle.buildPendoloClockworkCachedScene(settings);
    assert.equal(a.key, b.key);
    assert.equal(a.vertexCount, b.vertexCount);
    assert.deepEqual(a.data, b.data);
    assert.equal(a.parts.length, b.parts.length);
    for (const motion of [
      { escapementAngle: 0, phase: 0, bassOscillation: 0, secondGearAngle: 0 },
      { escapementAngle: 3.4, phase: 12, bassOscillation: 0.3, secondGearAngle: 2.1 },
    ]) {
      for (let index = 0; index < a.parts.length; index++) {
        assert.deepEqual(a.parts[index].getOrigin(motion), b.parts[index].getOrigin(motion));
        assert.equal(a.parts[index].getRotation(motion), b.parts[index].getRotation(motion));
      }
    }
    if (decor !== 'none') {
      assert.equal(a.parts.length, 21);
      assert.ok(a.vertexCount > 20000);
    }
  }
});

test('Retained native paths contain the complete source mesh and do not change with motion', async () => {
  const native = await port('native-scene'),
    meshes = await port('clockwork-meshes');
  const original = meshes.buildPendoloClockworkCachedScene(input);
  const scene = native.buildNativeScene(input);
  assert.equal(scene.vertexCount, original.vertexCount);
  assert.equal(scene.parts.length, original.parts.length);
  assert.equal(scene.triangleCount, original.vertexCount / 3);
  assert.ok(scene.pathCount < 500);
  assert.ok(scene.pathBytes < 8 * 1024 * 1024);
  const before = createHash('sha256').update(JSON.stringify(scene)).digest('hex');
  for (let frame = 0; frame < 300; frame++) {
    const transforms = native.resolveTransforms(input, {
      escapementAngle: frame * 0.01,
      phase: frame * 0.02,
      bassOscillation: 0.2,
      secondGearAngle: frame * 0.03,
    });
    assert.equal(transforms.length, scene.parts.length);
    for (let i = 0; i < transforms.length; i++) {
      const expected = original.parts[i];
      const motion = {
        escapementAngle: frame * 0.01,
        phase: frame * 0.02,
        bassOscillation: 0.2,
        secondGearAngle: frame * 0.03,
      };
      const origin = expected.getOrigin(motion);
      assert.deepEqual(transforms[i], {
        x: origin.x,
        y: origin.y,
        rotation: (expected.getRotation(motion) * 180) / Math.PI,
      });
    }
  }
  assert.equal(createHash('sha256').update(JSON.stringify(scene)).digest('hex'), before);
});

test('Window selection stays bounded and uses source indices across filtered lyrics', async () => {
  const kernel = await port('kernel');
  const metadata = Array.from({ length: 10000 }, (_, i) => ({
    sourceIndex: i * 2,
    startTime: i * 2,
    endTime: i * 2 + 1,
  }));
  const a = kernel.windowIndices(metadata, 5000);
  assert.ok(a.length <= 21);
  assert.ok(a.includes(5000));
  assert.ok(a.every((i) => i % 2 === 0));
  assert.deepEqual(kernel.windowIndices([], 0), []);
  const state = kernel.scrollState();
  assert.equal(kernel.scroll(state, 89, 90), 0);
  assert.equal(kernel.scroll(state, 1, 90), 1);
  assert.equal(kernel.scroll(state, -89, 90), 0);
  assert.equal(kernel.scroll(state, -1, 90), -1);
  assert.equal(kernel.scroll(state, 10000, 90), 5);
});

test('Sweep progression uses actual glyph cursor positions and prepared grapheme timing', async () => {
  const kernel = await port('kernel');
  const timings = [
    { startTime: 1, endTime: 2 },
    { startTime: 3, endTime: 4 },
    { startTime: 4, endTime: 5 },
  ];
  const offsets = [0, 8, 30, 45];
  for (const [time, width] of [
    [0, 0],
    [1, 0],
    [1.5, 4],
    [2.5, 8],
    [3.5, 19],
    [4.5, 37.5],
    [6, 45],
  ])
    assert.equal(kernel.fillWidth(timings, offsets, time, 5), width);
  assert.equal(kernel.fillWidth([], offsets, 4, 5), 0);
  assert.equal(kernel.fillWidth([], offsets, 5, 5), 45);
  assert.deepEqual(kernel.sweepMask(28, 20), { start: 8.24, crest: 20, end: 31.759999999999998 });
});

test('Source provenance and primary glyph/scene files are present without a browser render backend', async () => {
  const manifest = JSON.parse(readFileSync(new URL('sources.json', base), 'utf8'));
  assert.equal(manifest.revision, 'a8da4437cf19723555bd75e4685ca20815fe5b82');
  for (const name of [
    'pendoloClockworkDraw2d.ts',
    'pendoloClockworkWebGL.ts',
    'PendoloActiveLyricSweep.tsx',
  ])
    assert.match(manifest.sha256['src/components/visualizer/pendolo/' + name], /^[a-f0-9]{64}$/);
  const qml = readFileSync(new URL('Pendolo.qml', base), 'utf8');
  assert.doesNotMatch(qml, /Canvas\s*\{|WebView|Math\.random/);
  assert.match(qml, /signal seekRequested/);
});

test('Native retained tooth outlines reproduce every source Canvas gear in world coordinates', async () => {
  const native = await port('native-scene'),
    draw = await source('pendoloClockworkDraw2d');
  let state = { x: 0, y: 0, angle: 0 },
    stack = [],
    points = [],
    closed = false;
  const strokes = [];
  const ctx = {
    save() {
      stack.push({ ...state });
    },
    restore() {
      state = stack.pop();
    },
    translate(x, y) {
      state.x += x * Math.cos(state.angle) - y * Math.sin(state.angle);
      state.y += x * Math.sin(state.angle) + y * Math.cos(state.angle);
    },
    rotate(a) {
      state.angle += a;
    },
    beginPath() {
      points = [];
      closed = false;
    },
    moveTo(x, y) {
      this.lineTo(x, y);
    },
    lineTo(x, y) {
      points.push({
        x: state.x + x * Math.cos(state.angle) - y * Math.sin(state.angle),
        y: state.y + x * Math.sin(state.angle) + y * Math.cos(state.angle),
      });
    },
    closePath() {
      closed = true;
    },
    arc() {},
    clip() {},
    fill() {},
    stroke() {
      if (closed && points.length >= 40) strokes.push(points);
    },
  };
  draw.drawPendoloClockwork2d(ctx, {
    ...input,
    escapementAngle: 0,
    phase: 0,
    bassOscillation: 0,
    secondGearAngle: 0,
    showCenterGradient: false,
    showCover: false,
    coverImage: null,
  });
  const scene = native.buildNativeScene(input),
    transforms = native.resolveTransforms(input, {
      escapementAngle: 0,
      phase: 0,
      bassOscillation: 0,
      secondGearAngle: 0,
    });
  const expected = [
    'main-esc',
    'main-sun',
    'planet-0-gear',
    'planet-1-gear',
    'planet-2-gear',
    'balance-gear',
    'trans-spin',
    'second-spin',
    'idler-spin',
  ];
  assert.equal(strokes.length, expected.length);
  for (let i = 0; i < expected.length; i++) {
    const index = scene.parts.findIndex((p) => p.key === expected[i]),
      part = scene.parts[index],
      pose = transforms[index];
    const outline = part.paths.find(
      (p) =>
        p.stroke &&
        p.path.endsWith('Z') &&
        (p.path.match(/[ML]/g) || []).length === strokes[i].length,
    );
    assert.ok(outline, expected[i] + ' has all trapezoidal teeth');
    const vertices = Array.from(
      outline.path.matchAll(/[ML](-?[\d.e+\-]+),(-?[\d.e+\-]+)/g),
      (m) => ({ x: Number(m[1]), y: Number(m[2]) }),
    );
    for (let j = 0; j < vertices.length; j++) {
      const angle = (pose.rotation * Math.PI) / 180,
        x = pose.x + vertices[j].x * Math.cos(angle) - vertices[j].y * Math.sin(angle),
        y = pose.y + vertices[j].x * Math.sin(angle) + vertices[j].y * Math.cos(angle);
      assert.ok(
        Math.abs(x - strokes[i][j].x) < 1e-9 && Math.abs(y - strokes[i][j].y) < 1e-9,
        expected[i] + ' tooth ' + j,
      );
    }
  }
});

test('Worker windows contain only source fields needed for layout and timed sweep', async () => {
  const kernel = await port('kernel');
  const timeline = [{ char: '词', startTime: 1, endTime: 2, wordIndex: 0 }];
  const prepared = {
    line: {
      id: 'line',
      fullText: '歌词',
      startTime: 1,
      endTime: 3,
      renderEndTime: 3.2,
      translation: 'translation',
      romanization: 'romanization',
      isChorus: true,
      words: new Array(4000).fill({ text: 'unused' }),
    },
    timeline,
    layoutUnits: new Array(4000).fill({ text: 'unused' }),
    displayWords: new Array(4000).fill({ text: 'unused' }),
  };
  const result = kernel.packPrepared(12, 6, prepared);
  assert.deepEqual(Object.keys(result.prepared).sort(), ['line', 'timeline']);
  assert.deepEqual(result.prepared.timeline, timeline);
  assert.deepEqual(result.prepared.line, {
    id: 'line',
    fullText: '歌词',
    startTime: 1,
    endTime: 3,
    renderEndTime: 3.2,
    translation: 'translation',
    romanization: 'romanization',
    isChorus: true,
  });
  assert.ok(JSON.stringify(result).length < 1024);
  assert.equal(result.sourceIndex, 12);
  assert.equal(result.position, 6);
  assert.equal(prepared.line.words.length, 4000);
});

test('Subtitle weight follows the source theme inheritance before per-track fallbacks', async () => {
  const kernel = await port('kernel'),
    theme = await source('visualizerTheme'),
    fonts = await source('fontStacks'),
    tracks = await source('pendoloSubtitleTracks');
  for (const settings of [
    { fontWeight: 300, subtitleFontWeight: 800 },
    { fontWeight: null, subtitleFontWeight: 800 },
    { fontWeight: 300, subtitleFontInheritsLyrics: false, subtitleFontWeight: 800 },
  ]) {
    const expectedTheme = theme.buildVisualizerTheme({
      appStyle: {},
      theme: {},
      lyricsFontStyle: 'sans',
      lyricsFontWeight: settings.fontWeight,
      lyricsCustomFontFamily: null,
      subtitleFontInheritsLyrics: settings.subtitleFontInheritsLyrics,
      subtitleFontWeight: settings.subtitleFontWeight,
      visualizerMode: 'pendolo',
    }).visualizerSubtitleTheme;
    const sourceTracks = tracks.resolvePendoloSubtitleTracks(
      { translation: 'translation', romanization: 'romanization' },
      { mode: 'both', hidden: false, focal: true, subtitleFontScale: 1 },
    );
    const config = kernel.resolveSettings(settings);
    assert.deepEqual(
      sourceTracks.map((track) =>
        config.subtitleFontWeight === null ? track.fontWeightFallback : config.subtitleFontWeight,
      ),
      sourceTracks.map((track) =>
        fonts.resolveThemeFontWeight(expectedTheme, track.fontWeightFallback),
      ),
    );
  }
});

// BEGIN Folia a8da4437 source oracle (generated)
const sourceOracleCode =
  'var Ze=Object.defineProperty,tt=Object.defineProperties;var rt=Object.getOwnPropertyDescriptors;var Qe=Object.getOwnPropertySymbols;var ot=Object.prototype.hasOwnProperty,it=Object.prototype.propertyIsEnumerable;var qe=(e,n,t)=>n in e?Ze(e,n,{enumerable:!0,configurable:!0,writable:!0,value:t}):e[n]=t,Z=(e,n)=>{for(var t in n||(n={}))ot.call(n,t)&&qe(e,t,n[t]);if(Qe)for(var t of Qe(n))it.call(n,t)&&qe(e,t,n[t]);return e},Ce=(e,n)=>tt(e,rt(n));var $=(e,n)=>{for(var t in n)Ze(e,t,{get:n[t],enumerable:!0})};var Ge={};$(Ge,{calculatePendoloWheelLayout:()=>L0,measurePendoloLineWidth:()=>O0});var en=["BN","BN","BN","BN","BN","BN","BN","BN","BN","S","B","S","WS","B","BN","BN","BN","BN","BN","BN","BN","BN","BN","BN","BN","BN","BN","BN","B","B","B","S","WS","ON","ON","ET","ET","ET","ON","ON","ON","ON","ON","ES","CS","ES","CS","CS","EN","EN","EN","EN","EN","EN","EN","EN","EN","EN","CS","ON","ON","ON","ON","ON","ON","L","L","L","L","L","L","L","L","L","L","L","L","L","L","L","L","L","L","L","L","L","L","L","L","L","L","ON","ON","ON","ON","ON","ON","L","L","L","L","L","L","L","L","L","L","L","L","L","L","L","L","L","L","L","L","L","L","L","L","L","L","ON","ON","ON","ON","BN","BN","BN","BN","BN","BN","B","BN","BN","BN","BN","BN","BN","BN","BN","BN","BN","BN","BN","BN","BN","BN","BN","BN","BN","BN","BN","BN","BN","BN","BN","BN","BN","CS","ON","ET","ET","ET","ET","ON","ON","ON","ON","L","ON","ON","BN","ON","ON","ET","ET","EN","EN","ON","L","ON","ON","ON","EN","L","ON","ON","ON","ON","ON","L","L","L","L","L","L","L","L","L","L","L","L","L","L","L","L","L","L","L","L","L","L","L","ON","L","L","L","L","L","L","L","L","L","L","L","L","L","L","L","L","L","L","L","L","L","L","L","L","L","L","L","L","L","L","L","ON","L","L","L","L","L","L","L","L"],Ee=[[697,698,"ON"],[706,719,"ON"],[722,735,"ON"],[741,749,"ON"],[751,767,"ON"],[768,879,"NSM"],[884,885,"ON"],[894,894,"ON"],[900,901,"ON"],[903,903,"ON"],[1014,1014,"ON"],[1155,1161,"NSM"],[1418,1418,"ON"],[1421,1422,"ON"],[1423,1423,"ET"],[1424,1424,"R"],[1425,1469,"NSM"],[1470,1470,"R"],[1471,1471,"NSM"],[1472,1472,"R"],[1473,1474,"NSM"],[1475,1475,"R"],[1476,1477,"NSM"],[1478,1478,"R"],[1479,1479,"NSM"],[1480,1535,"R"],[1536,1541,"AN"],[1542,1543,"ON"],[1544,1544,"AL"],[1545,1546,"ET"],[1547,1547,"AL"],[1548,1548,"CS"],[1549,1549,"AL"],[1550,1551,"ON"],[1552,1562,"NSM"],[1563,1610,"AL"],[1611,1631,"NSM"],[1632,1641,"AN"],[1642,1642,"ET"],[1643,1644,"AN"],[1645,1647,"AL"],[1648,1648,"NSM"],[1649,1749,"AL"],[1750,1756,"NSM"],[1757,1757,"AN"],[1758,1758,"ON"],[1759,1764,"NSM"],[1765,1766,"AL"],[1767,1768,"NSM"],[1769,1769,"ON"],[1770,1773,"NSM"],[1774,1775,"AL"],[1776,1785,"EN"],[1786,1808,"AL"],[1809,1809,"NSM"],[1810,1839,"AL"],[1840,1866,"NSM"],[1867,1957,"AL"],[1958,1968,"NSM"],[1969,1983,"AL"],[1984,2026,"R"],[2027,2035,"NSM"],[2036,2037,"R"],[2038,2041,"ON"],[2042,2044,"R"],[2045,2045,"NSM"],[2046,2069,"R"],[2070,2073,"NSM"],[2074,2074,"R"],[2075,2083,"NSM"],[2084,2084,"R"],[2085,2087,"NSM"],[2088,2088,"R"],[2089,2093,"NSM"],[2094,2136,"R"],[2137,2139,"NSM"],[2140,2143,"R"],[2144,2191,"AL"],[2192,2193,"AN"],[2194,2198,"AL"],[2199,2207,"NSM"],[2208,2249,"AL"],[2250,2273,"NSM"],[2274,2274,"AN"],[2275,2306,"NSM"],[2362,2362,"NSM"],[2364,2364,"NSM"],[2369,2376,"NSM"],[2381,2381,"NSM"],[2385,2391,"NSM"],[2402,2403,"NSM"],[2433,2433,"NSM"],[2492,2492,"NSM"],[2497,2500,"NSM"],[2509,2509,"NSM"],[2530,2531,"NSM"],[2546,2547,"ET"],[2555,2555,"ET"],[2558,2558,"NSM"],[2561,2562,"NSM"],[2620,2620,"NSM"],[2625,2626,"NSM"],[2631,2632,"NSM"],[2635,2637,"NSM"],[2641,2641,"NSM"],[2672,2673,"NSM"],[2677,2677,"NSM"],[2689,2690,"NSM"],[2748,2748,"NSM"],[2753,2757,"NSM"],[2759,2760,"NSM"],[2765,2765,"NSM"],[2786,2787,"NSM"],[2801,2801,"ET"],[2810,2815,"NSM"],[2817,2817,"NSM"],[2876,2876,"NSM"],[2879,2879,"NSM"],[2881,2884,"NSM"],[2893,2893,"NSM"],[2901,2902,"NSM"],[2914,2915,"NSM"],[2946,2946,"NSM"],[3008,3008,"NSM"],[3021,3021,"NSM"],[3059,3064,"ON"],[3065,3065,"ET"],[3066,3066,"ON"],[3072,3072,"NSM"],[3076,3076,"NSM"],[3132,3132,"NSM"],[3134,3136,"NSM"],[3142,3144,"NSM"],[3146,3149,"NSM"],[3157,3158,"NSM"],[3170,3171,"NSM"],[3192,3198,"ON"],[3201,3201,"NSM"],[3260,3260,"NSM"],[3276,3277,"NSM"],[3298,3299,"NSM"],[3328,3329,"NSM"],[3387,3388,"NSM"],[3393,3396,"NSM"],[3405,3405,"NSM"],[3426,3427,"NSM"],[3457,3457,"NSM"],[3530,3530,"NSM"],[3538,3540,"NSM"],[3542,3542,"NSM"],[3633,3633,"NSM"],[3636,3642,"NSM"],[3647,3647,"ET"],[3655,3662,"NSM"],[3761,3761,"NSM"],[3764,3772,"NSM"],[3784,3790,"NSM"],[3864,3865,"NSM"],[3893,3893,"NSM"],[3895,3895,"NSM"],[3897,3897,"NSM"],[3898,3901,"ON"],[3953,3966,"NSM"],[3968,3972,"NSM"],[3974,3975,"NSM"],[3981,3991,"NSM"],[3993,4028,"NSM"],[4038,4038,"NSM"],[4141,4144,"NSM"],[4146,4151,"NSM"],[4153,4154,"NSM"],[4157,4158,"NSM"],[4184,4185,"NSM"],[4190,4192,"NSM"],[4209,4212,"NSM"],[4226,4226,"NSM"],[4229,4230,"NSM"],[4237,4237,"NSM"],[4253,4253,"NSM"],[4957,4959,"NSM"],[5008,5017,"ON"],[5120,5120,"ON"],[5760,5760,"WS"],[5787,5788,"ON"],[5906,5908,"NSM"],[5938,5939,"NSM"],[5970,5971,"NSM"],[6002,6003,"NSM"],[6068,6069,"NSM"],[6071,6077,"NSM"],[6086,6086,"NSM"],[6089,6099,"NSM"],[6107,6107,"ET"],[6109,6109,"NSM"],[6128,6137,"ON"],[6144,6154,"ON"],[6155,6157,"NSM"],[6158,6158,"BN"],[6159,6159,"NSM"],[6277,6278,"NSM"],[6313,6313,"NSM"],[6432,6434,"NSM"],[6439,6440,"NSM"],[6450,6450,"NSM"],[6457,6459,"NSM"],[6464,6464,"ON"],[6468,6469,"ON"],[6622,6655,"ON"],[6679,6680,"NSM"],[6683,6683,"NSM"],[6742,6742,"NSM"],[6744,6750,"NSM"],[6752,6752,"NSM"],[6754,6754,"NSM"],[6757,6764,"NSM"],[6771,6780,"NSM"],[6783,6783,"NSM"],[6832,6877,"NSM"],[6880,6891,"NSM"],[6912,6915,"NSM"],[6964,6964,"NSM"],[6966,6970,"NSM"],[6972,6972,"NSM"],[6978,6978,"NSM"],[7019,7027,"NSM"],[7040,7041,"NSM"],[7074,7077,"NSM"],[7080,7081,"NSM"],[7083,7085,"NSM"],[7142,7142,"NSM"],[7144,7145,"NSM"],[7149,7149,"NSM"],[7151,7153,"NSM"],[7212,7219,"NSM"],[7222,7223,"NSM"],[7376,7378,"NSM"],[7380,7392,"NSM"],[7394,7400,"NSM"],[7405,7405,"NSM"],[7412,7412,"NSM"],[7416,7417,"NSM"],[7616,7679,"NSM"],[8125,8125,"ON"],[8127,8129,"ON"],[8141,8143,"ON"],[8157,8159,"ON"],[8173,8175,"ON"],[8189,8190,"ON"],[8192,8202,"WS"],[8203,8205,"BN"],[8207,8207,"R"],[8208,8231,"ON"],[8232,8232,"WS"],[8233,8233,"B"],[8234,8238,"BN"],[8239,8239,"CS"],[8240,8244,"ET"],[8245,8259,"ON"],[8260,8260,"CS"],[8261,8286,"ON"],[8287,8287,"WS"],[8288,8303,"BN"],[8304,8304,"EN"],[8308,8313,"EN"],[8314,8315,"ES"],[8316,8318,"ON"],[8320,8329,"EN"],[8330,8331,"ES"],[8332,8334,"ON"],[8352,8399,"ET"],[8400,8432,"NSM"],[8448,8449,"ON"],[8451,8454,"ON"],[8456,8457,"ON"],[8468,8468,"ON"],[8470,8472,"ON"],[8478,8483,"ON"],[8485,8485,"ON"],[8487,8487,"ON"],[8489,8489,"ON"],[8494,8494,"ET"],[8506,8507,"ON"],[8512,8516,"ON"],[8522,8525,"ON"],[8528,8543,"ON"],[8585,8587,"ON"],[8592,8721,"ON"],[8722,8722,"ES"],[8723,8723,"ET"],[8724,9013,"ON"],[9083,9108,"ON"],[9110,9257,"ON"],[9280,9290,"ON"],[9312,9351,"ON"],[9352,9371,"EN"],[9450,9899,"ON"],[9901,10239,"ON"],[10496,11123,"ON"],[11126,11263,"ON"],[11493,11498,"ON"],[11503,11505,"NSM"],[11513,11519,"ON"],[11647,11647,"NSM"],[11744,11775,"NSM"],[11776,11869,"ON"],[11904,11929,"ON"],[11931,12019,"ON"],[12032,12245,"ON"],[12272,12287,"ON"],[12288,12288,"WS"],[12289,12292,"ON"],[12296,12320,"ON"],[12330,12333,"NSM"],[12336,12336,"ON"],[12342,12343,"ON"],[12349,12351,"ON"],[12441,12442,"NSM"],[12443,12444,"ON"],[12448,12448,"ON"],[12539,12539,"ON"],[12736,12773,"ON"],[12783,12783,"ON"],[12829,12830,"ON"],[12880,12895,"ON"],[12924,12926,"ON"],[12977,12991,"ON"],[13004,13007,"ON"],[13175,13178,"ON"],[13278,13279,"ON"],[13311,13311,"ON"],[19904,19967,"ON"],[42128,42182,"ON"],[42509,42511,"ON"],[42607,42610,"NSM"],[42611,42611,"ON"],[42612,42621,"NSM"],[42622,42623,"ON"],[42654,42655,"NSM"],[42736,42737,"NSM"],[42752,42785,"ON"],[42888,42888,"ON"],[43010,43010,"NSM"],[43014,43014,"NSM"],[43019,43019,"NSM"],[43045,43046,"NSM"],[43048,43051,"ON"],[43052,43052,"NSM"],[43064,43065,"ET"],[43124,43127,"ON"],[43204,43205,"NSM"],[43232,43249,"NSM"],[43263,43263,"NSM"],[43302,43309,"NSM"],[43335,43345,"NSM"],[43392,43394,"NSM"],[43443,43443,"NSM"],[43446,43449,"NSM"],[43452,43453,"NSM"],[43493,43493,"NSM"],[43561,43566,"NSM"],[43569,43570,"NSM"],[43573,43574,"NSM"],[43587,43587,"NSM"],[43596,43596,"NSM"],[43644,43644,"NSM"],[43696,43696,"NSM"],[43698,43700,"NSM"],[43703,43704,"NSM"],[43710,43711,"NSM"],[43713,43713,"NSM"],[43756,43757,"NSM"],[43766,43766,"NSM"],[43882,43883,"ON"],[44005,44005,"NSM"],[44008,44008,"NSM"],[44013,44013,"NSM"],[64285,64285,"R"],[64286,64286,"NSM"],[64287,64296,"R"],[64297,64297,"ES"],[64298,64335,"R"],[64336,64450,"AL"],[64451,64466,"ON"],[64467,64829,"AL"],[64830,64847,"ON"],[64848,64911,"AL"],[64912,64913,"ON"],[64914,64967,"AL"],[64968,64975,"ON"],[64976,65007,"BN"],[65008,65020,"AL"],[65021,65023,"ON"],[65024,65039,"NSM"],[65040,65049,"ON"],[65056,65071,"NSM"],[65072,65103,"ON"],[65104,65104,"CS"],[65105,65105,"ON"],[65106,65106,"CS"],[65108,65108,"ON"],[65109,65109,"CS"],[65110,65118,"ON"],[65119,65119,"ET"],[65120,65121,"ON"],[65122,65123,"ES"],[65124,65126,"ON"],[65128,65128,"ON"],[65129,65130,"ET"],[65131,65131,"ON"],[65136,65278,"AL"],[65279,65279,"BN"],[65281,65282,"ON"],[65283,65285,"ET"],[65286,65290,"ON"],[65291,65291,"ES"],[65292,65292,"CS"],[65293,65293,"ES"],[65294,65295,"CS"],[65296,65305,"EN"],[65306,65306,"CS"],[65307,65312,"ON"],[65339,65344,"ON"],[65371,65381,"ON"],[65504,65505,"ET"],[65506,65508,"ON"],[65509,65510,"ET"],[65512,65518,"ON"],[65520,65528,"BN"],[65529,65533,"ON"],[65534,65535,"BN"],[65793,65793,"ON"],[65856,65932,"ON"],[65936,65948,"ON"],[65952,65952,"ON"],[66045,66045,"NSM"],[66272,66272,"NSM"],[66273,66299,"EN"],[66422,66426,"NSM"],[67584,67870,"R"],[67871,67871,"ON"],[67872,68096,"R"],[68097,68099,"NSM"],[68100,68100,"R"],[68101,68102,"NSM"],[68103,68107,"R"],[68108,68111,"NSM"],[68112,68151,"R"],[68152,68154,"NSM"],[68155,68158,"R"],[68159,68159,"NSM"],[68160,68324,"R"],[68325,68326,"NSM"],[68327,68408,"R"],[68409,68415,"ON"],[68416,68863,"R"],[68864,68899,"AL"],[68900,68903,"NSM"],[68904,68911,"AL"],[68912,68921,"AN"],[68922,68927,"AL"],[68928,68937,"AN"],[68938,68968,"R"],[68969,68973,"NSM"],[68974,68974,"ON"],[68975,69215,"R"],[69216,69246,"AN"],[69247,69290,"R"],[69291,69292,"NSM"],[69293,69311,"R"],[69312,69327,"AL"],[69328,69336,"ON"],[69337,69369,"AL"],[69370,69375,"NSM"],[69376,69423,"R"],[69424,69445,"AL"],[69446,69456,"NSM"],[69457,69487,"AL"],[69488,69505,"R"],[69506,69509,"NSM"],[69510,69631,"R"],[69633,69633,"NSM"],[69688,69702,"NSM"],[69714,69733,"ON"],[69744,69744,"NSM"],[69747,69748,"NSM"],[69759,69761,"NSM"],[69811,69814,"NSM"],[69817,69818,"NSM"],[69826,69826,"NSM"],[69888,69890,"NSM"],[69927,69931,"NSM"],[69933,69940,"NSM"],[70003,70003,"NSM"],[70016,70017,"NSM"],[70070,70078,"NSM"],[70089,70092,"NSM"],[70095,70095,"NSM"],[70191,70193,"NSM"],[70196,70196,"NSM"],[70198,70199,"NSM"],[70206,70206,"NSM"],[70209,70209,"NSM"],[70367,70367,"NSM"],[70371,70378,"NSM"],[70400,70401,"NSM"],[70459,70460,"NSM"],[70464,70464,"NSM"],[70502,70508,"NSM"],[70512,70516,"NSM"],[70587,70592,"NSM"],[70606,70606,"NSM"],[70608,70608,"NSM"],[70610,70610,"NSM"],[70625,70626,"NSM"],[70712,70719,"NSM"],[70722,70724,"NSM"],[70726,70726,"NSM"],[70750,70750,"NSM"],[70835,70840,"NSM"],[70842,70842,"NSM"],[70847,70848,"NSM"],[70850,70851,"NSM"],[71090,71093,"NSM"],[71100,71101,"NSM"],[71103,71104,"NSM"],[71132,71133,"NSM"],[71219,71226,"NSM"],[71229,71229,"NSM"],[71231,71232,"NSM"],[71264,71276,"ON"],[71339,71339,"NSM"],[71341,71341,"NSM"],[71344,71349,"NSM"],[71351,71351,"NSM"],[71453,71453,"NSM"],[71455,71455,"NSM"],[71458,71461,"NSM"],[71463,71467,"NSM"],[71727,71735,"NSM"],[71737,71738,"NSM"],[71995,71996,"NSM"],[71998,71998,"NSM"],[72003,72003,"NSM"],[72148,72151,"NSM"],[72154,72155,"NSM"],[72160,72160,"NSM"],[72193,72198,"NSM"],[72201,72202,"NSM"],[72243,72248,"NSM"],[72251,72254,"NSM"],[72263,72263,"NSM"],[72273,72278,"NSM"],[72281,72283,"NSM"],[72330,72342,"NSM"],[72344,72345,"NSM"],[72544,72544,"NSM"],[72546,72548,"NSM"],[72550,72550,"NSM"],[72752,72758,"NSM"],[72760,72765,"NSM"],[72850,72871,"NSM"],[72874,72880,"NSM"],[72882,72883,"NSM"],[72885,72886,"NSM"],[73009,73014,"NSM"],[73018,73018,"NSM"],[73020,73021,"NSM"],[73023,73029,"NSM"],[73031,73031,"NSM"],[73104,73105,"NSM"],[73109,73109,"NSM"],[73111,73111,"NSM"],[73459,73460,"NSM"],[73472,73473,"NSM"],[73526,73530,"NSM"],[73536,73536,"NSM"],[73538,73538,"NSM"],[73562,73562,"NSM"],[73685,73692,"ON"],[73693,73696,"ET"],[73697,73713,"ON"],[78912,78912,"NSM"],[78919,78933,"NSM"],[90398,90409,"NSM"],[90413,90415,"NSM"],[92912,92916,"NSM"],[92976,92982,"NSM"],[94031,94031,"NSM"],[94095,94098,"NSM"],[94178,94178,"ON"],[94180,94180,"NSM"],[113821,113822,"NSM"],[113824,113827,"BN"],[117760,117973,"ON"],[118e3,118009,"EN"],[118010,118012,"ON"],[118016,118451,"ON"],[118458,118480,"ON"],[118496,118512,"ON"],[118528,118573,"NSM"],[118576,118598,"NSM"],[119143,119145,"NSM"],[119155,119162,"BN"],[119163,119170,"NSM"],[119173,119179,"NSM"],[119210,119213,"NSM"],[119273,119274,"ON"],[119296,119361,"ON"],[119362,119364,"NSM"],[119365,119365,"ON"],[119552,119638,"ON"],[120513,120513,"ON"],[120539,120539,"ON"],[120571,120571,"ON"],[120597,120597,"ON"],[120629,120629,"ON"],[120655,120655,"ON"],[120687,120687,"ON"],[120713,120713,"ON"],[120745,120745,"ON"],[120771,120771,"ON"],[120782,120831,"EN"],[121344,121398,"NSM"],[121403,121452,"NSM"],[121461,121461,"NSM"],[121476,121476,"NSM"],[121499,121503,"NSM"],[121505,121519,"NSM"],[122880,122886,"NSM"],[122888,122904,"NSM"],[122907,122913,"NSM"],[122915,122916,"NSM"],[122918,122922,"NSM"],[123023,123023,"NSM"],[123184,123190,"NSM"],[123566,123566,"NSM"],[123628,123631,"NSM"],[123647,123647,"ET"],[124140,124143,"NSM"],[124398,124399,"NSM"],[124643,124643,"NSM"],[124646,124646,"NSM"],[124654,124655,"NSM"],[124661,124661,"NSM"],[124928,125135,"R"],[125136,125142,"NSM"],[125143,125251,"R"],[125252,125258,"NSM"],[125259,126063,"R"],[126064,126143,"AL"],[126144,126207,"R"],[126208,126287,"AL"],[126288,126463,"R"],[126464,126703,"AL"],[126704,126705,"ON"],[126706,126719,"AL"],[126720,126975,"R"],[126976,127019,"ON"],[127024,127123,"ON"],[127136,127150,"ON"],[127153,127167,"ON"],[127169,127183,"ON"],[127185,127221,"ON"],[127232,127242,"EN"],[127243,127247,"ON"],[127279,127279,"ON"],[127338,127343,"ON"],[127405,127405,"ON"],[127584,127589,"ON"],[127744,128728,"ON"],[128732,128748,"ON"],[128752,128764,"ON"],[128768,128985,"ON"],[128992,129003,"ON"],[129008,129008,"ON"],[129024,129035,"ON"],[129040,129095,"ON"],[129104,129113,"ON"],[129120,129159,"ON"],[129168,129197,"ON"],[129200,129211,"ON"],[129216,129217,"ON"],[129232,129240,"ON"],[129280,129623,"ON"],[129632,129645,"ON"],[129648,129660,"ON"],[129664,129674,"ON"],[129678,129734,"ON"],[129736,129736,"ON"],[129741,129756,"ON"],[129759,129770,"ON"],[129775,129784,"ON"],[129792,129938,"ON"],[129940,130031,"ON"],[130032,130041,"EN"],[130042,130042,"ON"],[131070,131071,"BN"],[196606,196607,"BN"],[262142,262143,"BN"],[327678,327679,"BN"],[393214,393215,"BN"],[458750,458751,"BN"],[524286,524287,"BN"],[589822,589823,"BN"],[655358,655359,"BN"],[720894,720895,"BN"],[786430,786431,"BN"],[851966,851967,"BN"],[917502,917759,"BN"],[917760,917999,"NSM"],[918e3,921599,"BN"],[983038,983039,"BN"],[1048574,1048575,"BN"],[1114110,1114111,"BN"]];function st(e){if(e<=255)return en[e];let n=0,t=Ee.length-1;for(;n<=t;){let r=n+t>>1,o=Ee[r];if(e<o[0]){t=r-1;continue}if(e>o[1]){n=r+1;continue}return o[2]}return"L"}function at(e){let n=e.length;if(n===0)return null;let t=new Array(n),r=!1,o=0,i=null;for(let l=0;l<n;){let a=e.charCodeAt(l),s=a,x=1;if(a>=55296&&a<=56319&&l+1<n){let c=e.charCodeAt(l+1);c>=56320&&c<=57343&&(s=(a-55296<<10)+(c-56320)+65536,x=2)}let f=st(s);(f==="R"||f==="AL"||f==="AN")&&(r=!0);for(let c=0;c<x;c++)t[l+c]=f;f==="B"&&(r&&(i!=null||(i=new Int8Array(n)),i[l]=nn(t,i,o,l)),o=l+x,r=!1),l+=x}return r&&(i!=null||(i=new Int8Array(n)),nn(t,i,o,n)),i}function nn(e,n,t,r){let o=0;for(let s=t;s<r;s++){let x=e[s];if(x==="L"){o=0;break}if(x==="R"||x==="AL"){o=1;break}}let i=o&1?"R":"L",l=i,a=l;for(let s=t;s<r;s++)e[s]==="NSM"?e[s]=a:a=e[s];a=l;for(let s=t;s<r;s++){let x=e[s];x==="EN"?e[s]=a==="AL"?"AN":"EN":(x==="R"||x==="L"||x==="AL")&&(a=x)}for(let s=t;s<r;s++)e[s]==="AL"&&(e[s]="R");for(let s=t+1;s<r-1;s++)e[s]==="ES"&&e[s-1]==="EN"&&e[s+1]==="EN"&&(e[s]="EN"),e[s]==="CS"&&(e[s-1]==="EN"||e[s-1]==="AN")&&e[s+1]===e[s-1]&&(e[s]=e[s-1]);for(let s=t;s<r;s++){if(e[s]!=="EN")continue;let x;for(x=s-1;x>=t&&e[x]==="ET";x--)e[x]="EN";for(x=s+1;x<r&&e[x]==="ET";x++)e[x]="EN"}for(let s=t;s<r;s++){let x=e[s];(x==="WS"||x==="ES"||x==="ET"||x==="CS")&&(e[s]="ON")}a=l;for(let s=t;s<r;s++){let x=e[s];x==="EN"?e[s]=a==="L"?"L":"EN":(x==="R"||x==="L")&&(a=x)}for(let s=t;s<r;s++){if(e[s]!=="ON")continue;let x=s+1;for(;x<r&&e[x]==="ON";)x++;let f=s>t?e[s-1]:l,c=x<r?e[x]:l,u=f!=="L"?"R":"L";if(u===(c!=="L"?"R":"L"))for(let m=s;m<x;m++)e[m]=u;s=x-1}for(let s=t;s<r;s++)e[s]==="ON"&&(e[s]=i);for(let s=t;s<r;s++){let x=e[s],f=o;(o&1)===0?x==="R"?f++:(x==="AN"||x==="EN")&&(f+=2):(x==="L"||x==="AN"||x==="EN")&&f++,n[s]=f}return o}function tn(e,n){let t=at(e);if(t===null)return null;let r=new Int8Array(n.length);for(let o=0;o<n.length;o++)r[o]=t[n[o]];return r}var lt=/[ \\t\\n\\r\\f]+/g,xt=/[\\t\\n\\r\\f]| {2,}|^ | $/;function ut(e){if(!xt.test(e))return e;let n=e.replace(lt," ");return n.charCodeAt(0)===32&&(n=n.slice(1)),n.length>0&&n.charCodeAt(n.length-1)===32&&(n=n.slice(0,-1)),n}function ct(e){return/[\\r\\f]/.test(e)?e.replace(/\\r\\n/g,`\n`).replace(/[\\r\\f]/g,`\n`):e}var be=null;function J(){return be===null&&(be=new Intl.Segmenter(void 0,{granularity:"grapheme"})),be}var Be=null,ft;function Ft(){return Be===null&&(Be=new Intl.Segmenter(ft,{granularity:"word"})),Be}var ht=new RegExp("\\\\p{Script=Arabic}","u"),U=new RegExp("\\\\p{M}","u"),he=new RegExp("\\\\p{Nd}","u");function rn(e){return ht.test(e)}var dt=/[\\u3000-\\u30FF\\u3130-\\u318F\\u3400-\\u4DBF\\u4E00-\\u9FFF\\uAC00-\\uD7AF\\uF900-\\uFAFF\\uFF00-\\uFFEF\\u{20000}-\\u{2A6DF}\\u{2A700}-\\u{2EE5D}\\u{2F800}-\\u{2FA1F}\\u{30000}-\\u{33479}]/u;function z(e){return dt.test(e)}function St(e){let n=de(e);return n!==null&&(Le.has(n)||ee.has(n))}var Nt=new Set(["\\xA0","\\u202F","\\u2060","\\uFEFF"]),pt=new Set(["-","\\u2010","\\u2013","\\u2014"]);function At(e){let n=de(e);return n!==null&&Nt.has(n)}function mt(e){let n=de(e);return n!==null&&pt.has(n)}function un(e,n){return At(e)?!1:n?!(St(e)||mt(e)):!0}var Le=new Set(["\\uFF0C","\\uFF0E","\\uFF01","\\uFF1A","\\uFF1B","\\uFF1F","\\u3001","\\u3002","\\u30FB","\\uFF09","\\u3015","\\u3009","\\u300B","\\u300D","\\u300F","\\u3011","\\u3017","\\u3019","\\u301B","\\u30FC","\\u3005","\\u303B","\\u309D","\\u309E","\\u30FD","\\u30FE"]),pe=new Set([\'"\',"(","[","{","\\xA1","\\xBF","\\u201C","\\u2018","\\u201A","\\u201E","\\xAB","\\u2039","\\u2E18","\\uFF08","\\u3014","\\u3008","\\u300A","\\u300C","\\u300E","\\u3010","\\u3016","\\u3018","\\u301A"]),Oe=new Set(["\'","\\u2019"]),ee=new Set([".",",","!","?",":",";","\\u060C","\\u061B","\\u061F","\\u0964","\\u0965","\\u104A","\\u104B","\\u104C","\\u104D","\\u104F",")","]","}","%",\'"\',"\\u201D","\\u2019","\\xBB","\\u203A","\\u2026"]),gt=new Set([":",".","\\u060C","\\u061B"]),Mt=new Set(["\\u104F"]),Ct=new Set(["\\u201D","\\u2019","\\xBB","\\u203A","\\u300D","\\u300F","\\u3011","\\u300B","\\u3009","\\u3015","\\uFF09"]);function Et(e){if(ye(e))return!0;let n=!1;for(let t of e){if(ee.has(t)||ne(t)){n=!0;continue}if(!(n&&U.test(t)))return!1}return n}function bt(e){for(let n of e)if(!Le.has(n)&&!ee.has(n))return!1;return e.length>0}function Bt(e){if(ye(e))return!0;for(let n of e)if(!pe.has(n)&&!Oe.has(n)&&!U.test(n)&&!ne(n))return!1;return e.length>0}function ye(e){let n=!1;for(let t of e)if(!(t==="\\\\"||U.test(t))){if(pe.has(t)||ee.has(t)||Oe.has(t)){n=!0;continue}return!1}return n}function ie(e,n){let t=n-1;if(t<=0)return Math.max(t,0);let r=e.charCodeAt(t);if(r<56320||r>57343)return t;let o=t-1;if(o<0)return t;let i=e.charCodeAt(o);return i>=55296&&i<=56319?o:t}function de(e){if(e.length===0)return null;let n=ie(e,e.length);return e.slice(n)}function kt(e){for(let n of e)if(!U.test(n))return n;return null}function Te(e,n=e.length){for(;n>0;){let t=ie(e,n),r=e.slice(t,n);if(!U.test(r))return r;n=t}return null}var Dt=[36,37,43,43,92,92,162,165,176,177,1423,1423,1545,1547,1642,1642,2046,2047,2546,2547,2553,2555,2801,2801,3065,3065,3449,3449,3647,3647,6107,6107,8240,8247,8279,8279,8352,8399,8451,8451,8457,8457,8470,8470,8722,8723,43064,43064,65020,65020,65129,65130,65284,65285,65504,65505,65509,65510,73693,73696,123647,123647,126124,126124,126128,126128];function Pt(e,n){for(let t=0;t<n.length;t+=2)if(e>=n[t]&&e<=n[t+1])return!0;return!1}function ne(e){let n=e.codePointAt(0);return n!==void 0&&Pt(n,Dt)}function Lt(e){let n=Te(e);return n!==null&&ne(n)}function Ot(e){let n=kt(e);return n!==null&&he.test(n)}function yt(e){let n=e.length;for(;n>0;){let t=ie(e,n),r=e.slice(t,n);if(U.test(r)||pe.has(r)||Oe.has(r)){n=t;continue}break}return n<=0||n===e.length?null:{head:e.slice(0,n),tail:e.slice(n)}}function Tt(e,n,t){return t==="text"&&!n&&e.length===1&&e!=="-"&&e!=="\\u2014"?e:null}function on(e,n){return e&&n!==null&&gt.has(n)}function Rt(e){let n=de(e);return n!==null&&Mt.has(n)}function wt(e){if(e.length<2||e[0]!==" ")return null;let n=e.slice(1);return new RegExp("^\\\\p{M}+$","u").test(n)?{space:" ",marks:n}:null}function De(e){let n=e.length;for(;n>0;){let t=ie(e,n),r=e.slice(t,n);if(Ct.has(r))return!0;if(!ee.has(r))return!1;n=t}return!1}function It(e,n){if(n==="pre-wrap"){if(e===" ")return"preserved-space";if(e==="\t")return"tab";if(e===`\n`)return"hard-break"}return e===" "?"space":e==="\\xA0"||e==="\\u202F"||e==="\\u2060"||e==="\\uFEFF"?"glue":e==="\\u200B"?"zero-width-break":e==="\\xAD"?"soft-hyphen":"text"}var vt=/[\\x20\\t\\n\\xA0\\xAD\\u200B\\u202F\\u2060\\uFEFF]/;function Q(e){return e.length===1?e[0]:e.join("")}function sn(e,n){let t=[];for(let r=e.length-1;r>=0;r--)t.push(e[r]);return t.push(n),Q(t)}function Gt(e,n,t,r){if(!vt.test(e))return[{text:e,isWordLike:n,kind:"text",start:t}];let o=[],i=null,l=0,a=!1,s=0;for(let x of e){let f=It(x,r),c=f==="text"&&n;if(i!==null&&f===i&&c===a){s+=x.length;continue}i!==null&&o.push({text:e.slice(l,s),isWordLike:a,kind:i,start:t+l}),i=f,l=s,a=c,s+=x.length}return i!==null&&o.push({text:e.slice(l),isWordLike:a,kind:i,start:t+l}),o}function ke(e){return e==="space"||e==="preserved-space"||e==="zero-width-break"||e==="hard-break"}var Wt=/^[A-Za-z][A-Za-z0-9+.-]*:$/;function an(e,n){let t=e.texts[n];return t.startsWith("www.")?!0:Wt.test(t)&&n+1<e.len&&e.kinds[n+1]==="text"&&e.texts[n+1]==="//"}function _t(e){return e.includes("?")&&(e.includes("://")||e.startsWith("www."))}function jt(e,n,t){let r=[],o=[],i=[],l=[];for(let a=0;a<e.len;a++){let s=e.starts[a],x=e.texts[a],f=e.isWordLike[a],c=e.kinds[a],u=-1;if(c==="text"&&an(e,a)){let S=[x],F=a+1;for(;F<e.len&&!ke(e.kinds[F])&&Y(n,e.starts[F],t)!==!1;){u<0&&an(e,F)&&(u=e.starts[F]);let E=e.texts[F];if(S.push(E),f=!0,F++,E.includes("?"))break}x=Q(S),a=F-1}if(r.push(x),o.push(f),i.push(c),l.push(s),!_t(x))continue;let h=a+1;if(h>=e.len||ke(e.kinds[h]))continue;let m=[],N=u<0?e.starts[h]:u,M=h;for(;M<e.len&&!ke(e.kinds[M])&&Y(n,e.starts[M],t)!==!1;)m.push(e.texts[M]),M++;m.length>0&&(r.push(Q(m)),o.push(!0),i.push("text"),l.push(N),a=M-1)}return{len:r.length,texts:r,isWordLike:o,kinds:i,starts:l}}var Kt=new Set([":","-","/","\\xD7",",",".","+","\\u2013","\\u2014"]),Ht=/[\\p{P}\\p{S}\\p{Co}]/u,cn=new RegExp("\\\\p{Emoji_Presentation}","u"),zt=new Set(["?","\\u058A","-","\\u2010","\\u2012","\\u2013","\\u2014","\\u2026","\\u203C","\\u203D","\\u2049"]);function Jt(e){return e>=33&&e<=47&&e!==45||e>=58&&e<=64&&e!==63||e>=91&&e<=96||e>=123&&e<=126}function fn(e){let n=e.charCodeAt(0);return n<128?Jt(n):!zt.has(e)&&!cn.test(e)&&Ht.test(e)}function ln(e){let n=!1;for(let t of e)if(!U.test(t)){if(!fn(t))return!1;n=!0}return n}function Vt(e){for(let n=e.length;n>0;){let t=ie(e,n),r=e.slice(t,n);if(U.test(r)){n=t;continue}return fn(r)||ne(r)}return!1}var Pe=/[A-Za-z#&*<=>@^_`~]/;function Fn(e,n){return e.charCodeAt(0)<128&&n.charCodeAt(0)<128}function Y(e,n,t){if(!t.geckoAsciiLineBreaks||n<=0||n>=e.length)return null;let r=Te(e,n),o=String.fromCodePoint(e.codePointAt(n));if(r===null||!Fn(r,o))return null;let i=ne(r),l=ne(o);return!i&&!l?null:!!(o===")"||o==="]"||o==="}"||"!,.:;?/".includes(o)||"([{".includes(r)||r===\'"\'||r==="\'"||o===\'"\'||o==="\'"||o==="|"||o==="-"||i&&Pe.test(o)||Pe.test(r)&&l||l&&(")]}".includes(r)||/[0-9]/.test(r))||i&&("([{".includes(o)||/[0-9]/.test(o)))}function Ne(e,n,t,r=e.length){let o=n[0];if(o===void 0||!"([{".includes(o))return null;let i=Te(e,r);return i===null?null:t.geckoAsciiLineBreaks&&Fn(i,o)?Pe.test(i)||he.test(i)||`"\'([{`.includes(i)||ne(i):i.charCodeAt(0)>=128?!z(i)&&/[\\p{L}\\p{N}]/u.test(i)?!0:null:/[A-Za-z0-9]/.test(i)||"$\'(/<@[^_`{".includes(i)}function $t(e,n,t,r,o){if(t[0]==="-"&&z(e))return!0;if(z(e)||z(t))return!1;let i=Ne(e,t,o);if(i!==null)return i;let l=!n&&ln(e),a=!r&&ln(t),s=Lt(e),x=(n||s)&&Vt(e);return!l&&!a&&!x?!1:(n||l||s)&&(r||a)}function xn(e){for(let n of e)if(he.test(n))return!0;return!1}function Fe(e){if(e.length===0)return!1;for(let n of e)if(!(he.test(n)||Kt.has(n)))return!1;return!0}function Yt(e,n,t){let r=[],o=[],i=[],l=[];function a(s,x){if(s.includes("-")){let f=s.split("-"),c=f.length>1;for(let u=0;u<f.length;u++){let h=f[u];if(!c)break;(h.length===0||!xn(h)||!Fe(h))&&(c=!1)}if(c){let u=0;for(let h=0;h<f.length;h++){let m=f[h],N=h<f.length-1?`${m}-`:m;r.push(N),o.push(!0),i.push("text"),l.push(x+u),u+=N.length}return}}r.push(s),o.push(!0),i.push("text"),l.push(x)}for(let s=0;s<e.len;s++){let x=e.texts[s],f=e.kinds[s];if(f==="text"&&Fe(x)&&xn(x)){let c=[x],u=s+1;for(;u<e.len&&e.kinds[u]==="text"&&Fe(e.texts[u])&&Y(n,e.starts[u],t)!==!1;)c.push(e.texts[u]),u++;a(Q(c),e.starts[s]),s=u-1;continue}r.push(x),o.push(e.isWordLike[s]),i.push(f),l.push(e.starts[s])}return{len:r.length,texts:r,isWordLike:o,kinds:i,starts:l}}function Ut(e,n,t){var s;let r=[],o=[],i=[],l=[],a=0;for(;a<e.len;){let x=e.texts[a],f=e.kinds[a],c=e.isWordLike[a];if(f==="text"){let u=[x],h=a+1,m=c;for(;h<e.len&&e.kinds[h]==="text"&&((s=Y(n,e.starts[h],t))!=null?s:$t(e.texts[h-1],e.isWordLike[h-1],e.texts[h],e.isWordLike[h],t));){let N=e.texts[h];u.push(N),m=m||e.isWordLike[h],h++}if(h>a+1){r.push(Q(u)),o.push(m),i.push("text"),l.push(e.starts[a]),a=h;continue}}r.push(x),o.push(c),i.push(f),l.push(e.starts[a]),a++}return{len:r.length,texts:r,isWordLike:o,kinds:i,starts:l}}function Xt(e){let n=[],t=[],r=[],o=[],i=0;for(;i<e.len;){let l=[e.texts[i]],a=e.isWordLike[i],s=e.kinds[i],x=e.starts[i];if(s==="glue"){let f=[l[0]],c=x;for(i++;i<e.len&&e.kinds[i]==="glue";)f.push(e.texts[i]),i++;let u=Q(f);if(i<e.len&&e.kinds[i]==="text")l[0]=u,l.push(e.texts[i]),a=e.isWordLike[i],s="text",x=c,i++;else{n.push(u),t.push(!1),r.push("glue"),o.push(c);continue}}else i++;if(s==="text")for(;i<e.len&&e.kinds[i]==="glue";){let f=[];for(;i<e.len&&e.kinds[i]==="glue";)f.push(e.texts[i]),i++;let c=Q(f);if(i<e.len&&e.kinds[i]==="text"){l.push(c,e.texts[i]),a=a||e.isWordLike[i],i++;continue}l.push(c)}n.push(Q(l)),t.push(a),r.push(s),o.push(x)}return{len:n.length,texts:n,isWordLike:t,kinds:r,starts:o}}function Qt(e){let{texts:n,kinds:t,starts:r}=e;for(let o=0;o<n.length-1;o++){if(t[o]!=="text"||t[o+1]!=="text"||!z(n[o])||!z(n[o+1]))continue;let i=yt(n[o]);i!==null&&(n[o]=i.head,n[o+1]=i.tail+n[o+1],r[o+1]=r[o]+i.head.length)}}function qt(e,n,t){var D,T,R,w,P;let r=Ft(),o=0,i=[],l=[],a=[],s=[],x=!1,f=0,c=0,u=!1,h="text",m=null,N=!1,M=!1,S=!1,F=!1,E=!1;for(let p of r.segment(e))for(let b of Gt(p.segment,(D=p.isWordLike)!=null?D:!1,p.index,t)){let C=b.kind==="text",A=Tt(b.text,b.isWordLike,b.kind),L=z(b.text),O=rn(b.text),I=de(b.text),G=De(b.text),_=Rt(b.text),j=b.start+b.text.length,K=(T=Y(e,b.start,n))!=null?T:N||L?null:Ne(e,b.text,n,b.start),W=!1;if(n.carryCJKAfterClosingQuote&&C&&x&&h==="text"&&L&&N&&S)W=!0;else if(C&&x&&h==="text"&&bt(b.text)&&N)W=!0;else if(C&&x&&h==="text"&&F)W=!0;else if(C&&x&&h==="text"&&b.isWordLike&&O&&E)W=!0;else if(A!==null&&x&&h==="text"&&m===A&&K!==!1){c=j;continue}else C&&!b.isWordLike&&x&&h==="text"&&!N&&(Et(b.text)||b.text==="-"&&u)&&(W=!0);C&&x&&h==="text"&&K!==null&&(W=K),W?(c=j,u=u||b.isWordLike,m=null,N=N||L,M=M||O,S=G,F=_,E=on(M,I)):(x&&(i[o]=e.slice(f,c),l[o]=u,a[o]=h,s[o]=f,o++),x=!0,f=b.start,c=j,u=b.isWordLike,h=b.kind,m=A,N=L,M=O,S=G,F=_,E=on(O,I))}x&&(i[o]=e.slice(f,c),l[o]=u,a[o]=h,s[o]=f,o++);for(let p=1;p<o;p++)a[p]==="text"&&!l[p]&&ye(i[p])&&a[p-1]==="text"&&!z(i[p-1])&&((R=Y(e,s[p],n))!=null?R:Ne(e,i[p],n,s[p]))!==!1&&(i[p-1]+=i[p],l[p-1]=l[p-1]||l[p],i[p]="");let d=-1,g=null;for(let p=o-1;p>=0;p--){let b=i[p];if(b.length===0)continue;let C=(w=g==null?void 0:g.at(-1))!=null?w:d>=0?i[d]:null;if(a[p]==="text"&&!l[p]&&C!==null&&a[d]==="text"&&(((P=Y(e,s[p]+b.length,n))!=null?P:Bt(b)&&Ne(b,C,n)!==!1)||b==="-"&&Ot(C))){g===null&&(g=[]),g.push(b),s[d]=s[p],i[p]="";continue}g!==null&&(i[d]=sn(g,i[d]),g=null),d=p}g!==null&&(i[d]=sn(g,i[d]));let B=0;for(let p=0;p<o;p++){let b=i[p];b.length!==0&&(B!==p&&(i[B]=b,l[B]=l[p],a[B]=a[p],s[B]=s[p]),B++)}i.length=B,l.length=B,a.length=B,s.length=B;let y=Xt({len:B,texts:i,isWordLike:l,kinds:a,starts:s}),k=Ut(Yt(jt(y,e,n),e,n),e,n);Qt(k);for(let p=0;p<k.len-1;p++){let b=wt(k.texts[p]);b!==null&&(k.kinds[p]!=="space"&&k.kinds[p]!=="preserved-space"||k.kinds[p+1]!=="text"||!rn(k.texts[p+1])||(k.texts[p]=b.space,k.isWordLike[p]=!1,k.kinds[p]=k.kinds[p]==="preserved-space"?"preserved-space":"space",k.texts[p+1]=b.marks+k.texts[p+1],k.starts[p+1]=k.starts[p]+b.space.length))}return k}function Zt(e,n,t){if(n.len<=1)return n;let r=[],o=[],i=[],l=[],a=-1,s=!1;function x(u){r.push(n.texts[u]),o.push(n.isWordLike[u]),i.push("text"),l.push(n.starts[u])}function f(u,h){let m=!1;for(let S=u;S<h;S++)m=m||n.isWordLike[S];let N=n.starts[u],M=h<n.len?n.starts[h]:e.length;r.push(e.slice(N,M)),o.push(m),i.push("text"),l.push(N)}function c(u){if(!(a<0)){if(s)a+1===u?x(a):f(a,u);else for(let h=a;h<u;h++)x(h);a=-1,s=!1}}for(let u=0;u<n.len;u++){let h=n.texts[u],m=n.kinds[u];if(m==="text"){a>=0&&(!un(n.texts[u-1],t.breakKeepAllAfterPunctuation)||Y(e,n.starts[u],t)===!1)&&c(u),a<0&&(a=u),s=s||z(h);continue}c(u),r.push(h),o.push(n.isWordLike[u]),i.push(m),l.push(n.starts[u])}return c(n.len),{len:r.length,texts:r,isWordLike:o,kinds:i,starts:l}}function hn(e,n){let t=e.charCodeAt(n+1);if(t<128){if(t<48||t>57)return!1}else{let r=e.codePointAt(n+1);if(r===void 0||!he.test(String.fromCodePoint(r)))return!1}for(let r=n;r>0;){let o=ie(e,r),i=e.slice(o,r);if(!U.test(i))return z(i)||!/[\\p{L}\\p{N}]/u.test(i);r=o}return!0}function e0(e,n){let t=[],r=0,o=0,i=!1,l=!1,a=!1,s=!1,x=!1;function f(){o!==r&&(t.push({text:e.slice(r,o),start:r,overflow:i?s?"grapheme":"none":"word-like"}),r=o,i=!1,l=!1,a=!1,s=!1,x=!1)}function c(h,m,N){r=m,o=m+h.length,i=N,s=h==="-",l=De(h),a=pe.has(h)}function u(h,m){o+=h.length,i=i||m,s=s||h==="-";let N=De(h);h.length===1&&ee.has(h)?l=l||N:l=N,a=!1}for(let h of J().segment(e)){let m=h.segment,N=z(m);if(o===r){c(m,h.index,N);continue}let M=m==="-"&&i;if(M&&hn(e,h.index)&&(x=!0),a||Le.has(m)||ee.has(m)||M||x&&!N||n.carryCJKAfterClosingQuote&&N&&l){u(m,N);continue}if(!i&&!N){u(m,N);continue}f(),c(m,h.index,N)}return f(),t}function n0(e,n,t){if(n.length<=1)return n;let r=[],o=-1,i=!1;function l(s,x){let f=n[s].start,c=x<n.length?n[x].start:e.length;r.push({text:e.slice(f,c),start:f,overflow:"word-like"})}function a(s){if(!(o<0)){if(i)o+1===s?r.push(n[o]):l(o,s);else for(let x=o;x<s;x++)r.push(n[x]);o=-1,i=!1}}for(let s=0;s<n.length;s++){let x=n[s];o>=0&&(!un(n[s-1].text,t.breakKeepAllAfterPunctuation)||Y(e,x.start,t)===!1)&&a(s),o<0&&(o=s),i=i||z(x.text)}return a(n.length),r}function dn(e,n,t){let r=e0(e,n);return t==="keep-all"?n0(e,r,n):r}function t0(e){return e==="-"||e==="\\u058A"||e==="\\u2010"||e==="\\u2012"||e==="\\u2013"||e==="\\u2014"}function Sn(e){if(e.length===0||new RegExp("\\\\p{Cf}","u").test(e))return!1;for(let{segment:n}of J().segment(e)){let t=String.fromCodePoint(n.codePointAt(0));if(!/[\\p{P}\\p{S}]/u.test(t)||cn.test(t)||n.includes("\\uFE0F")||new RegExp("\\\\p{Emoji_Modifier}","u").test(t))return!1}return!0}function Nn(e){if(!/[-\\u058A\\u2010\\u2012\\u2013\\u2014]/u.test(e))return null;let n=[],t=0;for(let r of J().segment(e)){t++;let o=r.segment==="-"&&hn(e,r.index);t0(r.segment)&&!o&&n.push(t)}return n.length===0?null:n}function pn(e,n,t="normal",r="normal"){let o=t==="pre-wrap"?ct(e):ut(e);if(o.length===0)return{normalized:o,len:0,texts:[],isWordLike:[],kinds:[],starts:[]};let i=qt(o,n,t),l=r==="keep-all"?Zt(o,i,n):i;return Z({normalized:o},l)}var se=null,An=new Map,ae=null,r0=96,o0=new RegExp("\\\\p{Emoji_Presentation}","u"),i0=/[\\p{Emoji_Presentation}\\p{Extended_Pictographic}\\p{Regional_Indicator}\\uFE0F\\u20E3]/u,mn=new Map;function Re(){if(se!==null)return se;if(typeof OffscreenCanvas!="undefined")return se=new OffscreenCanvas(1,1).getContext("2d"),se;if(typeof document!="undefined")return se=document.createElement("canvas").getContext("2d"),se;throw new Error("Text measurement requires OffscreenCanvas or a DOM canvas context.")}function s0(e){let n=An.get(e);return n||(n=new Map,An.set(e,n)),n}function X(e,n){let t=n.get(e);return t===void 0&&(t={width:Re().measureText(e).width},n.set(e,t)),t}function le(){if(ae!==null)return ae;if(typeof navigator=="undefined")return ae={geckoAsciiLineBreaks:!1,lineFitEpsilon:.005,carryCJKAfterClosingQuote:!1,breakKeepAllAfterPunctuation:!0,preferPrefixWidthsForBreakableRuns:!1},ae;let e=navigator.userAgent,t=navigator.vendor==="Apple Computer, Inc."&&e.includes("Safari/")&&!e.includes("Chrome/")&&!e.includes("Chromium/")&&!e.includes("CriOS/")&&!e.includes("FxiOS/")&&!e.includes("EdgiOS/"),r=e.includes("Chrome/")||e.includes("Chromium/")||e.includes("CriOS/")||e.includes("Edg/");return ae={geckoAsciiLineBreaks:e.includes("Firefox/")&&!e.includes("FxiOS/"),lineFitEpsilon:t?1/64:.005,carryCJKAfterClosingQuote:r,breakKeepAllAfterPunctuation:!t,preferPrefixWidthsForBreakableRuns:t},ae}function a0(e){let n=e.match(/(?:^|\\D)(\\d+(?:\\.\\d+)?)\\s*px/);return n?parseFloat(n[1]):16}function l0(e){return o0.test(e)||e.includes("\\uFE0F")}function gn(e){return i0.test(e)}function x0(e){let n=mn.get(e);if(n!==void 0)return n;let t=a0(e),r=Re();r.font=e;let o=r.measureText("\\u{1F600}").width;if(n=0,o>t+.5&&typeof document!="undefined"&&document.body!==null){let i=document.createElement("span");i.style.font=e,i.style.display="inline-block",i.style.visibility="hidden",i.style.position="absolute",i.textContent="\\u{1F600}",document.body.appendChild(i);let l=i.getBoundingClientRect().width;document.body.removeChild(i),o-l>.5&&(n=o-l)}return mn.set(e,n),n}function u0(e){let n=0,t=J();for(let r of t.segment(e))l0(r.segment)&&n++;return n}function c0(e,n){return n.emojiCount===void 0&&(n.emojiCount=u0(e)),n.emojiCount}function q(e,n,t){return t===0?n.width:n.width-c0(e,n)*t}function Mn(e,n,t,r,o){if(n.breakableFitAdvances!==void 0&&n.breakableFitMode===o)return n.breakableFitAdvances;n.breakableFitMode=o;let i=J(),l=[];for(let f of i.segment(e))l.push(f.segment);if(l.length<=1)return n.breakableFitAdvances=null,n.breakableFitAdvances;if(o==="sum-graphemes"){let f=[];for(let c of l){let u=X(c,t);f.push(q(c,u,r))}return n.breakableFitAdvances=f,n.breakableFitAdvances}if(o==="pair-context"||l.length>r0){let f=[],c=null,u=0;for(let h of l){let m=X(h,t),N=q(h,m,r);if(c===null)f.push(N);else{let M=c+h,S=X(M,t);f.push(q(M,S,r)-u)}c=h,u=N}return n.breakableFitAdvances=f,n.breakableFitAdvances}let a=[],s="",x=0;for(let f of l){s+=f;let c=X(s,t),u=q(s,c,r);a.push(u-x),x=u}return n.breakableFitAdvances=a,n.breakableFitAdvances}function Cn(e,n){let t=Re();t.font=e;let r=s0(e),o=n?x0(e):0;return{cache:r,emojiCorrection:o}}function Ie(e,n,t){return t===0&&n>0&&n<e.length&&e[n-1]==="soft-hyphen"}function f0(e){return e==="space"||e==="zero-width-break"||e==="soft-hyphen"}function Bn(e){return e==="space"||e==="preserved-space"||e==="tab"||e==="zero-width-break"||e==="soft-hyphen"}function kn(e,n,t=e.widths.length){for(;n<t;){let r=e.kinds[n];if(!f0(r))break;n++}return n}function F0(e,n){if(n<=0)return 0;let t=e%n;return Math.abs(t)<=1e-6?n:n-t}function h0(e,n,t){return e.letterSpacing!==0&&n&&e.spacingGraphemeCounts[t]>0?e.letterSpacing:0}function ve(e,n){return n===0?0:e+n}function d0(e,n){return e.letterSpacing!==0&&e.spacingGraphemeCounts[n]>0?e.letterSpacing:0}function S0(e,n,t,r,o){let i=n==="tab"?o+d0(e,t):e.lineEndFitAdvances[t];return ve(r,i)}function En(e,n,t,r){let o=n==="tab"?0:e.lineEndFitAdvances[t];return ve(r,o)}function bn(e,n,t,r,o){let i=n==="tab"?o:e.lineEndPaintAdvances[t];return ve(r,i)}function N0(e,n,t){return e.letterSpacing!==0&&n?t+e.letterSpacing:t}function p0(e,n){return e.letterSpacing===0?n:n+e.letterSpacing}function we(e,n,t){let r=n;if(r>=e.length||e[r]>=t)return r;let o=e.length;for(r++;r<o;){let i=Math.floor((r+o)/2);e[i]<t?r=i+1:o=i}return r}function A0(e,n,t,r,o){if(e.letterSpacing===0)return 0;if(o>0)return e.spacingGraphemeCounts[r]>0?e.letterSpacing:0;if(Ie(e.kinds,r,o))return 0;for(let i=r-1;i>=n;i--){let l=e.kinds[i];if(!(l==="space"||l==="zero-width-break"||l==="hard-break"||l==="soft-hyphen"))return i===n&&t>0||e.spacingGraphemeCounts[i]>0?e.letterSpacing:0}return 0}function m0(e,n,t,r,o,i){return n+A0(e,t,r,o,i)}function g0(e,n){let t=0,r=e.chunks.length;for(;t<r;){let o=Math.floor((t+r)/2);n<e.chunks[o].consumedEndSegmentIndex?r=o:t=o+1}return t<e.chunks.length?t:-1}function Dn(e,n,t){let r=t.segmentIndex;if(t.graphemeIndex>0)return n;for(let o=n;o<e.chunks.length;o++){let i=e.chunks[o];if(i.startSegmentIndex===i.endSegmentIndex&&r===i.startSegmentIndex||(r<i.startSegmentIndex&&(r=i.startSegmentIndex),r=kn(e,r,i.endSegmentIndex),r<i.endSegmentIndex))return t.segmentIndex=r,t.graphemeIndex=0,o;if(i.consumedEndSegmentIndex>=e.widths.length)return-1;r=i.consumedEndSegmentIndex,t.segmentIndex=r,t.graphemeIndex=0}return-1}function Pn(e,n){if(n.segmentIndex>=e.widths.length)return-1;let t=g0(e,n.segmentIndex);return t<0?-1:Dn(e,t,n)}function M0(e,n,t){if(t.segmentIndex>=e.widths.length)return-1;let r=n;for(;r<e.chunks.length&&t.segmentIndex>=e.chunks[r].consumedEndSegmentIndex;)r++;return r>=e.chunks.length?-1:Dn(e,r,t)}function C0(e,n,t){let{widths:r,kinds:o,breakableFitAdvances:i,breakablePreferredBreaks:l}=e;if(r.length===0)return 0;let s=le().lineFitEpsilon,x=n+s,f=0,c=0,u=!1,h=0,m=0,N=0,M=0,S=-1,F=0;function E(){S=-1,F=0}function d(T=N,R=M,w=c){f++,t==null||t(w,h,m,T,R),c=0,u=!1,E()}function g(T,R){u=!0,h=T,m=0,N=T+1,M=0,c=R}function B(T,R,w){u=!0,h=T,m=R,N=T,M=R+1,c=w}function y(T,R){if(!u){g(T,R);return}c+=R,N=T+1,M=0}function k(T,R){var L;let w=i[T],P=(L=l[T])!=null?L:null,p=P===null?-1:we(P,0,R+1),b=-1,C=0,A=R;for(;A<w.length;){let O=w[A];if(!u)B(T,A,O);else if(c+O>x){if(P!==null&&b>R){d(T,b,C),A=b,p=we(P,p,A+1),b=-1,C=0;continue}d(),B(T,A,O)}else c+=O,N=T,M=A+1;let I=A+1;P!==null&&P[p]===I&&(b=I,C=c,p++),A++}u&&N===T&&M===w.length&&(N=T+1,M=0)}let D=0;for(;D<r.length&&!(!u&&(D=kn(e,D),D>=r.length));){let T=r[D],R=o[D],w=Bn(R);if(!u){T>x&&i[D]!==null?k(D,0):g(D,T),w&&(S=D+1,F=c-T),D++;continue}if(c+T>x){if(w){y(D,T),d(D+1,0,c-T),D++;continue}if(S>=0){if(N>S||N===S&&M>0){d();continue}d(S,0,F);continue}if(T>x&&i[D]!==null){d(),k(D,0),D++;continue}d();continue}y(D,T),w&&(S=D+1,F=c-T),D++}return u&&d(),f}function Ln(e,n,t){if(e.simpleLineWalkFastPath)return C0(e,n,t);let r={segmentIndex:0,graphemeIndex:0},o=Pn(e,r);return E0(e,r,o,n,t).lineCount}function E0(e,n,t,r,o,i=Number.POSITIVE_INFINITY){let{widths:l,kinds:a,breakableFitAdvances:s,breakablePreferredBreaks:x,discretionaryHyphenWidth:f}=e,u=le().lineFitEpsilon,h=r+u,m,N,M,S,F,E,d,g,B,y;function k(){return y==="soft-hyphen"&&d===F&&E===0?B:M}function D(A=F,L=E,O=k()){return S?(n.segmentIndex=A,n.graphemeIndex=L,m0(e,O,m,N,A,L)):null}function T(A,L){S=!0,F=A+1,E=0,M=L}function R(A,L,O){S=!0,F=A,E=L+1,M=O}function w(A,L){if(!S){T(A,L);return}M+=L,F=A+1,E=0}function P(A,L,O,I,G,_){if(!L)return;let j=En(e,A,O,G),K=bn(e,A,O,G,I);d=O+1,g=M-_+j,B=M-_+K,y=A}function p(A,L){var K;let O=s[A],I=(K=x[A])!=null?K:null,G=I===null?-1:we(I,0,L+1),_=-1,j=0;for(let W=L;W<O.length;W++){let fe=O[W];if(!S)R(A,W,fe);else{let V=N0(e,!0,fe),Se=M+V;if(p0(e,Se)>h)return I!==null&&_>L?D(A,_,j):D();M=Se,F=A,E=W+1}let Me=W+1;I!==null&&I[G]===Me&&(_=Me,j=M,G++)}return S&&F===A&&E===O.length&&(F=A+1,E=0),null}let b=0,C=null;for(;t>=0&&b<i;){m=n.segmentIndex,N=n.graphemeIndex,M=0,S=!1,F=n.segmentIndex,E=n.graphemeIndex,d=-1,g=0,B=0,y=null;let A=e.chunks[t],L=null;if(A.startSegmentIndex===A.endSegmentIndex)n.segmentIndex=A.consumedEndSegmentIndex,n.graphemeIndex=0,L=0;else{e:for(let O=n.segmentIndex;O<A.endSegmentIndex;O++){let I=a[O],G=Bn(I),_=O===n.segmentIndex?n.graphemeIndex:0,j=h0(e,S,O),K=I==="tab"?F0(M+j,e.tabStopAdvance):l[O],W=j+K,fe=S0(e,I,O,j,K);if(I==="soft-hyphen"&&_===0){S&&(F=O+1,E=0,O+1<A.endSegmentIndex&&(d=O+1,g=M+f,B=M+f,y=I));continue}if(!S){if(_>0){let V=p(O,_);if(V!==null){L=V;break e}}else if(fe>h&&s[O]!==null){let V=p(O,0);if(V!==null){L=V;break e}}else T(O,K);P(I,G,O,K,j,W);continue}if(M+fe>h){let V=M+En(e,I,O,j),Se=M+bn(e,I,O,j,K);if(G&&V<=h){w(O,W),L=D(O+1,0,Se);break e}if(d>=0&&g<=h){if(F>d||F===d&&E>0){L=D();break e}L=D(d,0,B);break e}L=D();break e}w(O,W),P(I,G,O,K,j,W)}L===null&&(L=d===A.consumedEndSegmentIndex&&E===0?D(A.consumedEndSegmentIndex,0,B):D(A.consumedEndSegmentIndex,0,M))}if(L===null)break;C=L,b++,o==null||o(L,m,N,n.segmentIndex,n.graphemeIndex),b<i&&(t=M0(e,t,n))}return{lineCount:b,lastLineWidth:C}}var On=new WeakMap;function yn(e,n,t){let r=t.get(e);if(r!==void 0)return r;r=[0];let o=J();for(let i of o.segment(n[e]))r.push(i.index+i.segment.length);return t.set(e,r),r}function Tn(e){let n=On.get(e);return n!==void 0||(n=new Map,On.set(e,n)),n}function Rn(e,n,t,r,o,i){let l="";for(let a=t;a<o;a++)if(!(e.kinds[a]==="soft-hyphen"||e.kinds[a]==="hard-break"))if(a===t&&r>0){let s=yn(a,e.segments,n);l+=e.segments[a].slice(s[r])}else l+=e.segments[a];if(i>0){let a=yn(o,e.segments,n);l+=e.segments[o].slice(a[t===o?r:0],a[i])}return Ie(e.kinds,o,i)?l+"-":l}function b0(e){return e?{widths:[],lineEndFitAdvances:[],lineEndPaintAdvances:[],kinds:[],simpleLineWalkFastPath:!0,segLevels:null,breakableFitAdvances:[],breakablePreferredBreaks:[],letterSpacing:0,spacingGraphemeCounts:[],discretionaryHyphenWidth:0,tabStopAdvance:0,chunks:[],segments:[]}:{widths:[],lineEndFitAdvances:[],lineEndPaintAdvances:[],kinds:[],simpleLineWalkFastPath:!0,segLevels:null,breakableFitAdvances:[],breakablePreferredBreaks:[],letterSpacing:0,spacingGraphemeCounts:[],discretionaryHyphenWidth:0,tabStopAdvance:0,chunks:[]}}function wn(e,n){if(n==="zero-width-break"||n==="soft-hyphen"||n==="hard-break")return 0;if(n==="tab")return 1;let t=0,r=J();for(let o of r.segment(e))t++;return t}function B0(e,n,t){return n>1?e+(n-1)*t:e}function k0(e,n,t,r,o){let i=le(),{cache:l,emojiCorrection:a}=Cn(n,gn(e.normalized)),s=q("-",X("-",l),a)+(o===0?0:o*2),f=q(" ",X(" ",l),a)*8,c=o!==0;if(e.len===0)return b0(t);let u=[],h=[],m=[],N=[],M=!c,S=t?[]:null,F=[],E=[],d=[],g=t?[]:null,B=[],y=0;function k(R,w,P,p,b,C,A,L,O){b!=="text"&&b!=="space"&&b!=="zero-width-break"&&(M=!1),u.push(w),h.push(P),m.push(p),N.push(b),S==null||S.push(C),F.push(A),E.push(L),c&&d.push(O),g!==null&&g.push(R)}function D(R,w,P,p,b){let C=c?wn(R,P):0,A=B0(q(R,w,a),C,o),L=P==="space"||P==="preserved-space"||P==="zero-width-break"?0:A,O=L===0?0:L+(C>0?o:0),I=P==="space"||P==="zero-width-break"?0:A;if(b&&R.length>1){let G="sum-graphemes";o!==0?G="segment-prefixes":Fe(R)?G="pair-context":i.preferPrefixWidthsForBreakableRuns&&(G="segment-prefixes");let _=Mn(R,w,l,a,G),j=_===null||r==="keep-all"?null:Nn(R);k(R,A,O,I,P,p,_,j,C);return}k(R,A,O,I,P,p,null,null,C)}for(let R=0;R<e.len;R++){let w=e.texts[R],P=e.kinds[R],p=e.starts[R];if(P==="soft-hyphen"){k(w,0,s,s,P,p,null,null,0);continue}if(P==="hard-break"){let b=u.length;k(w,0,0,0,P,p,null,null,0),B.push({startSegmentIndex:y,endSegmentIndex:b,consumedEndSegmentIndex:u.length}),y=u.length;continue}if(P==="tab"){k(w,0,0,0,P,p,null,null,c?wn(w,P):0);continue}if(P==="text"&&z(w)){let b=dn(w,i,r);for(let C=0;C<b.length;C++){let A=b[C],L=X(A.text,l);D(A.text,L,"text",p+A.start,A.overflow==="grapheme"||e.isWordLike[R]&&(r==="keep-all"||A.overflow==="word-like"))}continue}D(w,X(w,l),P,p,P==="text"&&(e.isWordLike[R]||Sn(w)))}y<u.length&&B.push({startSegmentIndex:y,endSegmentIndex:u.length,consumedEndSegmentIndex:u.length});let T=S===null?null:tn(e.normalized,S);return g!==null?{widths:u,lineEndFitAdvances:h,lineEndPaintAdvances:m,kinds:N,simpleLineWalkFastPath:M,segLevels:T,breakableFitAdvances:F,breakablePreferredBreaks:E,letterSpacing:o,spacingGraphemeCounts:d,discretionaryHyphenWidth:s,tabStopAdvance:f,chunks:B,segments:g}:{widths:u,lineEndFitAdvances:h,lineEndPaintAdvances:m,kinds:N,simpleLineWalkFastPath:M,segLevels:T,breakableFitAdvances:F,breakablePreferredBreaks:E,letterSpacing:o,spacingGraphemeCounts:d,discretionaryHyphenWidth:s,tabStopAdvance:f,chunks:B}}function D0(e,n,t,r){var a,s;let o=(a=r==null?void 0:r.wordBreak)!=null?a:"normal",i=(s=r==null?void 0:r.letterSpacing)!=null?s:0,l=pn(e,le(),r==null?void 0:r.whiteSpace,o);return k0(l,n,t,o,i)}function In(e,n,t){return D0(e,n,!0,t)}function P0(e,n,t,r,o,i,l){return{text:Rn(e,n,r,o,i,l),width:t,start:{segmentIndex:r,graphemeIndex:o},end:{segmentIndex:i,graphemeIndex:l}}}function vn(e,n,t){let r=[];if(e.widths.length===0)return{lineCount:0,height:0,lines:r};let o=Tn(e),i=Ln(e,n,(l,a,s,x,f)=>{r.push(P0(e,o,l,a,s,x,f))});return{lineCount:i,height:i*t,lines:r}}function L0(e,n,t,r,o,i,l=0,a){var B,y,k,D,T,R,w;let s=r*i.wheelCenterX,x=o*i.wheelCenterY,f=Math.min(r,o)*i.arcRadius+l,h=i.arcAngleDeg*Math.PI/180/Math.max(1,9-1),N=Number.isInteger(n)&&n>=0&&n<e.length?n:-1,M=N>=0,S=[],F=Math.max(0,Math.min(e.length-1,Math.floor(n>=0?n:0))),E=Math.max(0,F-8),d=Math.min(e.length-1,F+8),g=new Map;if(Number.isInteger(n)&&n>=E&&n<=d){let P=n;g.set(P,0);for(let p=P+1;p<=d;p+=1){let b=(B=a==null?void 0:a[p-1])!=null?B:0,C=(y=a==null?void 0:a[p])!=null?y:0,A=Math.max(h,(b+C+24)/(2*f));g.set(p,((k=g.get(p-1))!=null?k:0)+A)}for(let p=P-1;p>=E;p-=1){let b=(D=a==null?void 0:a[p+1])!=null?D:0,C=(T=a==null?void 0:a[p])!=null?T:0,A=Math.max(h,(b+C+24)/(2*f));g.set(p,((R=g.get(p+1))!=null?R:0)-A)}}for(let P=E;P<=d;P++){let p=e[P];if(!p)continue;let b=P-n,C=((w=g.get(P))!=null?w:b*h)+t;if(Math.abs(C)>=Math.PI/2)continue;let A=s+f*Math.cos(C),L=x+f*Math.sin(C),O=M&&P===N,I=Math.abs(b),G=Math.max(.12,Math.pow(Math.cos(C*.75),2.5)*(1-I*.18)),_=O?i.activeScale:Math.max(.7,1-I*.08);S.push({line:p,index:P,angleRad:C,angleDeg:C*180/Math.PI,x:A,y:L,isActive:O,distanceFromActive:I,alpha:G,scale:_})}return S}function O0(e,n){var t,r;if(!e)return 0;try{let o=In(e,n);return(r=(t=vn(o,2e3,32).lines[0])==null?void 0:t.width)!=null?r:0}catch(o){return e.length*16}}var We={};$(We,{resolvePendoloFallbackAnchorIndex:()=>y0,resolvePendoloRotatingLineOpacity:()=>T0});var y0=(e,n,t,r,o)=>{var a,s;if(n>=0&&n<e.length)return n;if(!r)return-1;let i=e.at(-1),l=(s=(a=i==null?void 0:i.renderHints)==null?void 0:a.renderEndTime)!=null?s:i==null?void 0:i.endTime;return l!==void 0&&o>l?e.length:t+.5};var T0=(e,n,t)=>{let r=Math.abs(e+n);if(r>=110)return 0;let o=Math.min(1,(110-r)/28);return t*o};var _e={};$(_e,{resolvePendoloChorusPresentation:()=>w0,resolvePendoloMotionProfile:()=>R0});var Gn={calm:{balanceSpeedMultiplier:.72,balanceAmplitudeMultiplier:.58,bassResponseMultiplier:.62,escapementSpringMultiplier:.72,escapementDampingMultiplier:1.2,chorusHaloOpacity:.22,chorusHaloScale:1.012,chorusGlowMultiplier:.72,chorusTransitionDuration:.52},normal:{balanceSpeedMultiplier:1,balanceAmplitudeMultiplier:1,bassResponseMultiplier:1,escapementSpringMultiplier:1,escapementDampingMultiplier:1,chorusHaloOpacity:.34,chorusHaloScale:1.026,chorusGlowMultiplier:1,chorusTransitionDuration:.42},chaotic:{balanceSpeedMultiplier:1.3,balanceAmplitudeMultiplier:1.42,bassResponseMultiplier:1.38,escapementSpringMultiplier:1.3,escapementDampingMultiplier:.84,chorusHaloOpacity:.5,chorusHaloScale:1.045,chorusGlowMultiplier:1.42,chorusTransitionDuration:.3}},R0=e=>e==="calm"||e==="chaotic"?Gn[e]:Gn.normal,w0=(e,n,t)=>{let r=!!(e&&n);return{isActive:r,accentMix:r?.58:.32,haloOpacity:r?t.chorusHaloOpacity:0,haloScale:r?t.chorusHaloScale:1,glowMultiplier:r?t.chorusGlowMultiplier:0,transitionDuration:t.chorusTransitionDuration}};var je={};$(je,{createPendoloClockworkMotionState:()=>I0,normalizePendoloBass:()=>Wn,stepPendoloClockworkMotion:()=>v0});var I0=()=>({phase:0,smoothedBass:.15,secondGearElapsed:0,secondGearStep:0,secondGearAngle:0,secondGearVelocity:0,balanceDirection:1,balanceAmplitude:0,balanceAngle:0,balanceVelocity:0,transBeatTarget:0,transBeatAngle:0,transBeatVelocity:0});var Wn=e=>{let n=e>1?e/255:e;return Math.max(0,Math.min(1,n))},v0=(e,n,t,r,o,i)=>{let l=Wn(t);e.smoothedBass+=(l-e.smoothedBass)*Math.min(.24,.12*o.bassResponseMultiplier);let a=e.smoothedBass;if(!r)if(e.phase+=n*(2.8+a*3.5*o.bassResponseMultiplier)*o.balanceSpeedMultiplier,i){i.downbeats>0?(e.transBeatTarget+=Math.PI*2,e.secondGearStep-=15):i.beats>0&&(e.transBeatTarget+=Math.PI*2/24,e.secondGearStep-=1);let x=e.secondGearStep*(Math.PI*2/15),f=Math.exp(-19*n);if(e.secondGearVelocity+=(x-e.secondGearAngle)*260*n,e.secondGearVelocity*=f,e.secondGearAngle+=e.secondGearVelocity*n,e.transBeatVelocity+=(e.transBeatTarget-e.transBeatAngle)*260*n,e.transBeatVelocity*=f,e.transBeatAngle+=e.transBeatVelocity*n,i.beats>0||i.downbeats>0){e.balanceDirection=-e.balanceDirection;let u=i.downbeats>0?i.downbeatGain:i.beatGain;e.balanceAmplitude=(.25+.6*Math.min(1,u))*o.balanceAmplitudeMultiplier}let c=e.balanceDirection*e.balanceAmplitude;e.balanceVelocity+=(c-e.balanceAngle)*140*n,e.balanceVelocity*=Math.exp(-9*n),e.balanceAngle+=e.balanceVelocity*n}else{e.secondGearElapsed+=n;let x=Math.floor(e.secondGearElapsed);x>0&&(e.secondGearStep+=x,e.secondGearElapsed-=x);let c=e.secondGearStep*(Math.PI*2/15)-e.secondGearAngle;e.secondGearVelocity+=c*92*o.escapementSpringMultiplier*n,e.secondGearVelocity*=Math.exp(-13*o.escapementDampingMultiplier*n),e.secondGearAngle+=e.secondGearVelocity*n}let s=i?e.balanceAngle:Math.sin(e.phase)*(.15+a*.7*o.bassResponseMultiplier)*o.balanceAmplitudeMultiplier;return{bass:a,bassOscillation:s,secondGearAngle:e.secondGearAngle,transBeatAngle:i?e.transBeatAngle:0,phase:e.phase}};var ze={};$(ze,{PENDOLO_MAX_PARTS:()=>Jn,PENDOLO_MESH_STRIDE:()=>zn,buildPendoloClockworkCacheKey:()=>Vn,buildPendoloClockworkCachedScene:()=>V0,fillPendoloTransformTables:()=>$0});var _n=(e,n,t,r)=>{if(!e.has(n)&&e.size>=r){let o=e.keys().next();o.done||e.delete(o.value)}return e.set(n,t),t};var Ae=(e,n,t)=>Math.max(n,Math.min(t,e));var G0={r:255,g:255,b:255},W0=e=>Number.isFinite(e),_0=(e,n)=>`rgba(${Math.round(Ae(e.r,0,255))}, ${Math.round(Ae(e.g,0,255))}, ${Math.round(Ae(e.b,0,255))}, ${n})`,j0=e=>{if(!e)return"fallback";if(e.startsWith("#")){let t=e.slice(1),r=o=>Number.parseInt(o,16);return/^[0-9a-fA-F]{3}$/.test(t)?{r:r(t[0]+t[0]),g:r(t[1]+t[1]),b:r(t[2]+t[2])}:/^[0-9a-fA-F]{6}$/.test(t)?{r:r(t.slice(0,2)),g:r(t.slice(2,4)),b:r(t.slice(4,6))}:"fallback"}let n=e.match(/^rgba?\\(([^)]+)\\)$/);if(n){let[t,r,o]=n[1].split(",").slice(0,3).map(i=>Number.parseFloat(i.trim()));return[t,r,o].every(W0)?{r:t,g:r,b:o}:"fallback"}return"passthrough"},jn=new Map,K0=512,Kn=e=>{let n=typeof e=="string"?e.trim():"",t=jn.get(n);return t===void 0&&(t=_n(jn,n,j0(n),K0)),{normalized:n,parsed:t}},v=(e,n)=>{let t=Ae(n,0,1),{normalized:r,parsed:o}=Kn(e);return o==="passthrough"?r:_0(o==="fallback"?G0:o,t)},Hn=e=>{let{parsed:n}=Kn(e);return typeof n=="string"?null:Z({},n)};var me=(e,n,t)=>{let o=t==="full"?1:.6;return{decorOpacityMultiplier:o,primaryAlpha10:v(e,.1*o),primaryAlpha15:v(e,.15*o),accentAlpha35:v(n,.35*o),gearPrimaryAlpha:v(e,.42*o),gearPrimarySubtleAlpha:v(e,.32*o),gearAccentAlpha:v(n,.58*o),gearAccentStrongAlpha:v(n,.72*o),planetGearAlpha:v(e,.24*o),jewelFillColor:v(n,.28*o),jewelStrokeColor:v(n,.65*o),mainGearFill:v(n,.08*o),balanceGearFill:v(n,.1*o),secondGearFill:v(n,.06*o),bevelRing:v(e,.18*o),rivetStroke:v(e,.25*o),guillocheAlt:v(e,.07*o),genevaAlt:v(e,.06*o),idlerStroke:v(e,.28*o),idlerInner:v(e,.18*o)}},ge=e=>{let{centerX:n,centerY:t,baseRadius:r,lyricRingRadius:o}=e,i=n+r*.2,l=t-r*.75,a=r*.28,s=n+r*.32,x=t+r*.78,f=r*.34,c=n+r*.68,u=t+r*.76,h=r*.16,m=(s+c)*.5+r*.04,N=(x+u)*.5-r*.02,M=r*.08,S=Math.min(o-Math.max(14,r*.025));return{balanceCx:i,balanceCy:l,balanceR:a,transCx:s,transCy:x,transR:f,secondGearCx:c,secondGearCy:u,secondGearR:h,idlerCx:m,idlerCy:N,idlerR:M,focalAxisEndRadius:S,orbitR:r*.52,planetR:r*.16,coverRadius:r*.88,gradientR:r*1.65}};var zn=7,Jn=32,H0=10,He=class{constructor(){this.data=[];this.activePartId=0}get vertexCount(){return this.data.length/zn}toFloat32(){return new Float32Array(this.data)}setActivePartId(n){this.activePartId=n}pushVert(n,t,r,o,i,l){this.data.push(n,t,r,o,i,l,this.activePartId)}pushTri(n,t,r,o,i,l,a,s,x,f){this.pushVert(n,t,a,s,x,f),this.pushVert(r,o,a,s,x,f),this.pushVert(i,l,a,s,x,f)}appendLine(n,t,r,o,i,l,a=0){let s=r-n,x=o-t,f=Math.hypot(s,x);if(f<1e-6)return;let c=s/f,u=x/f,h=i*.5,m=-u*h,N=c*h,M=n-c*a,S=t-u*a,F=r+c*a,E=o+u*a,[d,g,B,y]=l;this.pushTri(M+m,S+N,M-m,S-N,F+m,E+N,d,g,B,y),this.pushTri(M-m,S-N,F-m,E-N,F+m,E+N,d,g,B,y)}appendPolyline(n,t,r,o=!1){let i=n.filter((F,E)=>{let d=E>0?n[E-1]:null;return!d||Math.hypot(F.x-d.x,F.y-d.y)>1e-6});if(o&&i.length>2){let F=i[0],E=i[i.length-1];Math.hypot(F.x-E.x,F.y-E.y)<=1e-6&&i.pop()}let l=i.length;if(l<2)return;let a=t*.5,s=o?l:l-1,x=[];for(let F=0;F<s;F++){let E=i[F],d=i[(F+1)%l],g=Math.hypot(d.x-E.x,d.y-E.y);x.push({x:-(d.y-E.y)/g,y:(d.x-E.x)/g})}let f=[],c=[],u=[];for(let F=0;F<s;F++)f.push({x:x[F].x*a,y:x[F].y*a}),c.push({x:x[F].x*a,y:x[F].y*a});let h=o?l:l-2;for(let F=0;F<h;F++){let E=o?(F+s-1)%s:F,d=o?F:F+1,g=i[o?F:F+1],B=x[E],y=x[d],k=B.x+y.x,D=B.y+y.y,T=Math.hypot(k,D),R=T/2;if(T>1e-6&&1/R<=H0){let w=a/R/T,P={x:k*w,y:D*w};c[E]=P,f[d]=P}else{let P=B.x*y.y-B.y*y.x>0?-1:1;u.push({point:g,from:{x:B.x*a*P,y:B.y*a*P},to:{x:y.x*a*P,y:y.y*a*P}})}}let[m,N,M,S]=r;for(let F=0;F<s;F++){let E=i[F],d=i[(F+1)%l],g=f[F],B=c[F];this.pushTri(E.x+g.x,E.y+g.y,E.x-g.x,E.y-g.y,d.x+B.x,d.y+B.y,m,N,M,S),this.pushTri(E.x-g.x,E.y-g.y,d.x-B.x,d.y-B.y,d.x+B.x,d.y+B.y,m,N,M,S)}for(let F of u){let{point:E,from:d,to:g}=F;this.pushTri(E.x,E.y,E.x+d.x,E.y+d.y,E.x+g.x,E.y+g.y,m,N,M,S)}}appendCircleStroke(n,t,r,o,i,l=64){if(r<=0||o<=0)return;let a=o*.5,s=Math.max(0,r-a),x=r+a,f=Math.max(l,Math.ceil(r*1.25)),[c,u,h,m]=i;for(let N=0;N<f;N++){let M=N*Math.PI*2/f,S=(N+1)*Math.PI*2/f,F=Math.cos(M),E=Math.sin(M),d=Math.cos(S),g=Math.sin(S);this.pushTri(n+x*F,t+x*E,n+s*F,t+s*E,n+x*d,t+x*g,c,u,h,m),this.pushTri(n+s*F,t+s*E,n+s*d,t+s*g,n+x*d,t+x*g,c,u,h,m)}}appendFilledPolygonFromCenter(n,t,r,o){if(r.length<3)return;let[i,l,a,s]=o;for(let x=0;x<r.length;x++){let f=r[x],c=r[(x+1)%r.length];this.pushTri(n,t,f.x,f.y,c.x,c.y,i,l,a,s)}}appendArrowHead(n,t,r){let[o,i,l,a]=r;this.pushTri(n,t-4,n+8,t,n,t+4,o,i,l,a)}},H=e=>{let n=e.match(/rgba?\\(\\s*([\\d.]+)\\s*,\\s*([\\d.]+)\\s*,\\s*([\\d.]+)\\s*(?:,\\s*([\\d.]+)\\s*)?\\)/i);if(n)return[Number(n[1])/255,Number(n[2])/255,Number(n[3])/255,n[4]===void 0?1:Number(n[4])];let t=Hn(e);return t?[t.r/255,t.g/255,t.b/255,1]:[1,1,1,1]},Vn=e=>[e.centerX,e.centerY,Math.round(e.baseRadius*10),Math.round(e.lyricRingRadius*10),e.showGearDecor,e.primaryTextColor,e.accentTextColor].join("|"),z0=(e,n,t)=>{let r=e-t,o=e,i=Math.PI*2/n,l=[];for(let a=0;a<n;a++){let s=a*i,x=[s-i*.22,s-i*.12,s+i*.12,s+i*.22],f=[r,o,o,r];for(let c=0;c<4;c++)l.push({x:f[c]*Math.cos(x[c]),y:f[c]*Math.sin(x[c])})}return l},te=(e,n,t,r,o,i,l)=>{let a=z0(n,t,r);l&&e.appendFilledPolygonFromCenter(0,0,a,H(l)),e.appendPolyline(a,i,H(o),!0)},Ke=(e,n,t,r,o,i)=>{let l=H(o);e.appendCircleStroke(0,0,n,i,l),e.appendCircleStroke(0,0,t,i,l);let a=Math.PI*2/r;for(let f=0;f<r;f++){let c=f*a;e.appendLine(n*Math.cos(c),n*Math.sin(c),t*Math.cos(c),t*Math.sin(c),i,l)}let s=(n+t)*.5,x=(t-n)*.22;for(let f=0;f<r;f++){let c=f*a+a*.5;e.appendCircleStroke(s*Math.cos(c),s*Math.sin(c),x,i,l,24)}},J0=(e,n,t,r,o,i)=>{let l=r*Math.PI*2,a=Math.round(r*60),s=[];for(let x=0;x<=a;x++){let f=x/a,c=f*l,u=n+(t-n)*Math.pow(f,.9);s.push({x:u*Math.cos(c),y:u*Math.sin(c)})}e.appendPolyline(s,i,H(o),!1)},xe=(e,n,t,r,o,i,l)=>{e.appendCircleStroke(0,0,n,i,H(r),28),e.appendCircleStroke(0,0,t,l,H(o),20)},ue=(e,n)=>()=>({x:e,y:n}),re=e=>()=>e,V0=e=>{let n=Vn(e),t=new He,r=[],o=new Map;if(e.showGearDecor==="none")return{key:n,data:t.toFloat32(),parts:r,vertexCount:0};let{centerX:i,centerY:l,baseRadius:a,primaryTextColor:s,accentTextColor:x,showGearDecor:f}=e,c=ge(e),u=me(s,x,f),h=u.decorOpacityMultiplier,m=ue(i,l),N=(d,g,B,y)=>{let k=o.get(d);if(k===void 0){if(r.length>=Jn){console.warn("[pendoloClockworkMeshes] exceeded PENDOLO_MAX_PARTS");return}k=r.length,o.set(d,k),r.push({getOrigin:B,getRotation:y})}t.setActivePartId(k),g()};N("main-static",()=>{let d=H(u.primaryAlpha15);for(let B of[.3,.6,.85,1.15,1.4].map(y=>a*y))t.appendCircleStroke(0,0,B,1,d);let g=H(u.bevelRing);t.appendCircleStroke(0,0,a*.88,.8,g),t.appendCircleStroke(0,0,a*.92,.8,g),xe(t,4.5,2.5,u.jewelStrokeColor,u.jewelFillColor,1.2,.8)},m,re(0)),N("main-ticks",()=>{let d=a*1.15;for(let g=0;g<60;g++){let B=g*Math.PI*2/60,y=g%5===0,k=y?12:6;t.appendLine(d*Math.cos(B),d*Math.sin(B),(d+k)*Math.cos(B),(d+k)*Math.sin(B),y?1.5:1,H(y?u.accentAlpha35:u.primaryAlpha15))}},m,d=>d.escapementAngle*.2),N("main-esc",()=>{te(t,a+8,36,10,u.gearAccentAlpha,2.2,u.mainGearFill),Ke(t,a*.2,a*.85,6,u.gearPrimaryAlpha,1.8);let d=a*.62,g=a*.83;for(let k=0;k<48;k++){let D=k*Math.PI*2/48,T=k%2===0?d:d+(g-d)*.3;t.appendLine(T*Math.cos(D),T*Math.sin(D),g*Math.cos(D),g*Math.sin(D),.7,H(k%2===0?u.primaryAlpha10:u.guillocheAlt))}let B=a*.96,y=H(u.rivetStroke);for(let k=0;k<12;k++){let D=k*Math.PI*2/12;t.appendCircleStroke(B*Math.cos(D),B*Math.sin(D),2.2,.8,y,16)}},m,d=>d.escapementAngle),N("main-sun",()=>te(t,a*.22,12,6,u.gearAccentStrongAlpha,2.1),m,d=>-d.escapementAngle*2.5);for(let d=0;d<3;d++){let g=d,B=y=>{let k=y.escapementAngle*.4+g*Math.PI*2/3;return{x:i+c.orbitR*Math.cos(k),y:l+c.orbitR*Math.sin(k)}};N(`planet-${g}-gear`,()=>te(t,c.planetR,14,5,u.planetGearAlpha,1.7),B,y=>-y.escapementAngle*3+g*.5),N(`planet-${g}-jewel`,()=>xe(t,3.5,1.8,u.jewelStrokeColor,u.jewelFillColor,1,.7),B,re(0))}let M=ue(c.balanceCx,c.balanceCy);N("balance-gear",()=>te(t,c.balanceR,20,7,u.gearAccentStrongAlpha,2.1,u.balanceGearFill),M,d=>d.phase*.1),N("balance-static",()=>{t.appendCircleStroke(0,0,c.balanceR*.52,1.8,H(u.gearPrimarySubtleAlpha)),xe(t,3.5,1.8,u.jewelStrokeColor,u.jewelFillColor,1,.7)},M,re(0)),N("hairspring",()=>J0(t,c.balanceR*.56,c.balanceR*.88,3.5,v(x,.3*h),.8),M,d=>d.bassOscillation*.6+d.phase*.1*.3);let S=ue(c.transCx,c.transCy);N("trans-spin",()=>{te(t,c.transR,24,7,u.gearPrimaryAlpha,1.8),Ke(t,c.transR*.25,c.transR*.85,5,u.gearPrimarySubtleAlpha,1.5);let d=c.transR*1.6,g=d/10,B=c.transR*.8;for(let y=1;y<=9;y++){let k=-d*.5+y*g,D=Math.sqrt(Math.max(0,B*B-k*k));D<.5||t.appendLine(-D,k,D,k,.7,H(y%2===0?u.primaryAlpha10:u.genevaAlt))}},S,d=>{var g;return-d.escapementAngle*1.4+((g=d.transBeatAngle)!=null?g:0)}),N("trans-jewel",()=>xe(t,3.5,1.8,u.jewelStrokeColor,u.jewelFillColor,1,.7),S,re(0));let F=ue(c.secondGearCx,c.secondGearCy);N("second-spin",()=>te(t,c.secondGearR,15,5,u.gearAccentAlpha,1.8,u.secondGearFill),F,d=>d.secondGearAngle),N("second-spoke",()=>Ke(t,c.secondGearR*.28,c.secondGearR*.76,4,u.gearPrimarySubtleAlpha,1.3),F,d=>-d.secondGearAngle),N("second-jewel",()=>xe(t,2.8,1.5,u.jewelStrokeColor,u.jewelFillColor,.8,.6),F,re(0));let E=ue(c.idlerCx,c.idlerCy);return N("idler-spin",()=>te(t,c.idlerR,10,3.5,u.idlerStroke,1.3),E,d=>d.escapementAngle*2.2),N("idler-static",()=>{t.appendCircleStroke(0,0,c.idlerR*.45,.8,H(u.idlerInner)),xe(t,2.2,1.2,u.jewelStrokeColor,u.jewelFillColor,.7,.5)},E,re(0)),N("axis",()=>{let d=H(u.gearAccentStrongAlpha);t.appendLine(i+a*.8,l,i+c.focalAxisEndRadius,l,2,d),t.appendArrowHead(i+c.focalAxisEndRadius,l,d)},ue(0,0),re(0)),{key:n,data:t.toFloat32(),parts:r,vertexCount:t.vertexCount}},$0=(e,n,t,r)=>{for(let o=0;o<e.length;o++){let i=e[o].getOrigin(n);t[o*2]=i.x,t[o*2+1]=i.y,r[o]=e[o].getRotation(n)}};var Ve={};$(Ve,{drawPendoloClockwork2d:()=>U0});function oe(e,n,t,r,o,i,l,a,s,x){e.save(),e.translate(n,t),e.rotate(l);let f=r-i,c=r,u=Math.PI*2/o;e.beginPath();for(let h=0;h<o;h++){let m=h*u,N=m-u*.22,M=m-u*.12,S=m+u*.12,F=m+u*.22,E=f*Math.cos(N),d=f*Math.sin(N),g=c*Math.cos(M),B=c*Math.sin(M),y=c*Math.cos(S),k=c*Math.sin(S),D=f*Math.cos(F),T=f*Math.sin(F);h===0?e.moveTo(E,d):e.lineTo(E,d),e.lineTo(g,B),e.lineTo(y,k),e.lineTo(D,T)}e.closePath(),x&&(e.fillStyle=x,e.fill()),e.strokeStyle=a,e.lineWidth=s,e.stroke(),e.restore()}function Je(e,n,t,r,o,i,l,a,s){e.save(),e.translate(n,t),e.rotate(l),e.strokeStyle=a,e.lineWidth=s,e.beginPath(),e.arc(0,0,r,0,Math.PI*2),e.stroke(),e.beginPath(),e.arc(0,0,o,0,Math.PI*2),e.stroke();let x=Math.PI*2/i;for(let u=0;u<i;u++){let h=u*x;e.beginPath(),e.moveTo(r*Math.cos(h),r*Math.sin(h)),e.lineTo(o*Math.cos(h),o*Math.sin(h)),e.stroke()}let f=(r+o)*.5,c=(o-r)*.22;for(let u=0;u<i;u++){let h=u*x+x*.5;e.beginPath(),e.arc(f*Math.cos(h),f*Math.sin(h),c,0,Math.PI*2),e.stroke()}e.restore()}function Y0(e,n,t,r,o,i,l,a,s){e.save(),e.translate(n,t),e.rotate(l),e.strokeStyle=a,e.lineWidth=s;let x=i*Math.PI*2,f=i*60;e.beginPath();for(let c=0;c<=f;c++){let u=c/f,h=u*x,m=r+(o-r)*Math.pow(u,.9),N=m*Math.cos(h),M=m*Math.sin(h);c===0?e.moveTo(N,M):e.lineTo(N,M)}e.stroke(),e.restore()}function ce(e,n,t,r,o,i,l,a,s){e.strokeStyle=i,e.lineWidth=a,e.beginPath(),e.arc(n,t,r,0,Math.PI*2),e.stroke(),e.strokeStyle=l,e.lineWidth=s,e.beginPath(),e.arc(n,t,o,0,Math.PI*2),e.stroke()}var U0=(e,n)=>{let{centerX:t,centerY:r,baseRadius:o,escapementAngle:i,phase:l,bassOscillation:a,secondGearAngle:s,transBeatAngle:x=0,primaryTextColor:f,accentTextColor:c,backgroundColor:u,showGearDecor:h,showCenterGradient:m,showCover:N,coverImage:M}=n,S=ge(n);if(m){let C=u||"#000000",A=e.createRadialGradient(t,r,0,t,r,S.gradientR);A.addColorStop(0,v(C,.72)),A.addColorStop(.35,v(C,.52)),A.addColorStop(.7,v(C,.2)),A.addColorStop(1,v(C,0)),e.fillStyle=A,e.beginPath(),e.arc(t,r,S.gradientR,0,Math.PI*2),e.fill()}if(N&&M){let C=S.coverRadius;e.save(),e.beginPath(),e.arc(t,r,C,0,Math.PI*2),e.clip();let A=h==="full";e.globalAlpha=.42*(A?1:.6);let L=C*2;e.drawImage(M,t-C,r-C,L,L),e.restore()}if(h==="none")return;let F=me(f,c,h),E=F.decorOpacityMultiplier;e.strokeStyle=F.primaryAlpha15,e.lineWidth=1,[o*.3,o*.6,o*.85,o*1.15,o*1.4].forEach(C=>{e.beginPath(),e.arc(t,r,C,0,Math.PI*2),e.stroke()});let g=60,B=o*1.15;for(let C=0;C<g;C++){let A=C*Math.PI*2/g+i*.2,L=C%5===0,O=L?12:6;e.strokeStyle=L?F.accentAlpha35:F.primaryAlpha15,e.lineWidth=L?1.5:1,e.beginPath(),e.moveTo(t+B*Math.cos(A),r+B*Math.sin(A)),e.lineTo(t+(B+O)*Math.cos(A),r+(B+O)*Math.sin(A)),e.stroke()}oe(e,t,r,o+8,36,10,i,F.gearAccentAlpha,2.2,F.mainGearFill),Je(e,t,r,o*.2,o*.85,6,i,F.gearPrimaryAlpha,1.8),e.strokeStyle=F.bevelRing,e.lineWidth=.8,e.beginPath(),e.arc(t,r,o*.88,0,Math.PI*2),e.stroke(),e.beginPath(),e.arc(t,r,o*.92,0,Math.PI*2),e.stroke(),e.save(),e.translate(t,r),e.rotate(i);let y=o*.62,k=o*.83;for(let C=0;C<48;C++){let A=C*Math.PI*2/48,L=C%2===0?y:y+(k-y)*.3;e.strokeStyle=C%2===0?F.primaryAlpha10:F.guillocheAlt,e.lineWidth=.7,e.beginPath(),e.moveTo(L*Math.cos(A),L*Math.sin(A)),e.lineTo(k*Math.cos(A),k*Math.sin(A)),e.stroke()}e.restore();let D=o*.96;for(let C=0;C<12;C++){let A=C*Math.PI*2/12+i;e.strokeStyle=F.rivetStroke,e.lineWidth=.8,e.beginPath(),e.arc(t+D*Math.cos(A),r+D*Math.sin(A),2.2,0,Math.PI*2),e.stroke()}oe(e,t,r,o*.22,12,6,-i*2.5,F.gearAccentStrongAlpha,2.1),ce(e,t,r,4.5,2.5,F.jewelStrokeColor,F.jewelFillColor,1.2,.8);let T=i*.4;for(let C=0;C<3;C++){let A=T+C*Math.PI*2/3,L=t+S.orbitR*Math.cos(A),O=r+S.orbitR*Math.sin(A);oe(e,L,O,S.planetR,14,5,-i*3+C*.5,F.planetGearAlpha,1.7),ce(e,L,O,3.5,1.8,F.jewelStrokeColor,F.jewelFillColor,1,.7)}let R=l*.1;oe(e,S.balanceCx,S.balanceCy,S.balanceR,20,7,R,F.gearAccentStrongAlpha,2.1,F.balanceGearFill),e.strokeStyle=F.gearPrimarySubtleAlpha,e.lineWidth=1.8,e.beginPath(),e.arc(S.balanceCx,S.balanceCy,S.balanceR*.52,0,Math.PI*2),e.stroke(),Y0(e,S.balanceCx,S.balanceCy,S.balanceR*.56,S.balanceR*.88,3.5,a*.6+R*.3,v(c,.3*E),.8),ce(e,S.balanceCx,S.balanceCy,3.5,1.8,F.jewelStrokeColor,F.jewelFillColor,1,.7);let w=-i*1.4+x;oe(e,S.transCx,S.transCy,S.transR,24,7,w,F.gearPrimaryAlpha,1.8),Je(e,S.transCx,S.transCy,S.transR*.25,S.transR*.85,5,w,F.gearPrimarySubtleAlpha,1.5),e.save(),e.translate(S.transCx,S.transCy),e.rotate(w),e.beginPath(),e.arc(0,0,S.transR*.8,0,Math.PI*2),e.clip();let P=S.transR*1.6,p=P/10;for(let C=1;C<=9;C++){let A=-P*.5+C*p;e.strokeStyle=C%2===0?F.primaryAlpha10:F.genevaAlt,e.lineWidth=.7,e.beginPath(),e.moveTo(-S.transR,A),e.lineTo(S.transR,A),e.stroke()}e.restore(),ce(e,S.transCx,S.transCy,3.5,1.8,F.jewelStrokeColor,F.jewelFillColor,1,.7),oe(e,S.secondGearCx,S.secondGearCy,S.secondGearR,15,5,s,F.gearAccentAlpha,1.8,F.secondGearFill),Je(e,S.secondGearCx,S.secondGearCy,S.secondGearR*.28,S.secondGearR*.76,4,-s,F.gearPrimarySubtleAlpha,1.3),ce(e,S.secondGearCx,S.secondGearCy,2.8,1.5,F.jewelStrokeColor,F.jewelFillColor,.8,.6),oe(e,S.idlerCx,S.idlerCy,S.idlerR,10,3.5,i*2.2,F.idlerStroke,1.3),e.strokeStyle=F.idlerInner,e.lineWidth=.8,e.beginPath(),e.arc(S.idlerCx,S.idlerCy,S.idlerR*.45,0,Math.PI*2),e.stroke(),ce(e,S.idlerCx,S.idlerCy,2.2,1.2,F.jewelStrokeColor,F.jewelFillColor,.7,.5),e.strokeStyle=F.gearAccentStrongAlpha,e.lineWidth=2,e.beginPath(),e.moveTo(t+o*.8,r),e.lineTo(t+S.focalAxisEndRadius,r),e.stroke();let b=t+S.focalAxisEndRadius;e.fillStyle=F.gearAccentStrongAlpha,e.beginPath(),e.moveTo(b,r-4),e.lineTo(b+8,r),e.lineTo(b,r+4),e.closePath(),e.fill()};var $e={};$($e,{buildPendoloSubtitleFontSpec:()=>xr,isPendoloReadableSubtitle:()=>Yn,resolvePendoloSubtitleTracks:()=>lr,sumPendoloSubtitleTrackHeights:()=>ur});var X0=(e,n)=>{var t,r;return(r=(t=e==null?void 0:e.find(o=>o.role===n&&o.text.trim()))==null?void 0:t.text.trim())!=null?r:null},Q0=(e,n)=>{let t=n==="translation"?e.translation:e.romanization;return(t==null?void 0:t.trim())||X0(e.alternateTexts,n)};var $n=(e,n,t=()=>!0)=>{if(!e||n==="none")return[];let r=n==="both"?["romanization","translation"]:[n],o=[];for(let i of r){let l=Q0(e,i);!l||!t(l)||o.some(a=>a.text===l)||o.push({role:i,text:l})}return o};var tr=16,rr=12,or=.25,ir=500,sr=1.5,ar=/[\\p{L}\\p{N}]/u,Yn=e=>ar.test(e),lr=(e,{mode:n,hidden:t,focal:r,subtitleFontScale:o})=>{if(t)return[];let i=(r?tr:rr)*o;return $n(e,n,Yn).map((l,a)=>{let s=a>0,x=Math.round(s?i*.88:i);return{role:l.role,text:l.text,fontPx:x,lineHeightPx:x*sr,fontWeightFallback:s?400:ir,gapEm:s?.25:or,opacityFactor:s?.82:1}})},xr=(e,n,t)=>`${n} ${e.fontPx}px ${t}`,ur=(e,n)=>{let t=0;for(let r of e)t+=n(r)+r.gapEm*r.fontPx;return t};var Ye={};$(Ye,{buildVisualizerTheme:()=>cr});var cr=({appStyle:e,theme:n,lyricsFontStyle:t,lyricsFontWeight:r,lyricsCustomFontFamily:o,lyricsFontFallbackFamilies:i,subtitleFontInheritsLyrics:l,subtitleFontStyle:a,subtitleFontWeight:s,subtitleFontFamily:x,subtitleFontFallbackFamilies:f,currentSongId:c,visualizerMode:u})=>{var M;let h=String((M=e["--bg-color"])!=null?M:n.backgroundColor),m=Ce(Z({},n),{fontStyle:t,fontWeight:r!=null?r:void 0,fontFamily:o!=null?o:void 0,fontFamilyStack:i,backgroundColor:h}),N=l==null||l?m:Ce(Z({},n),{fontStyle:a!=null?a:"sans",fontWeight:s!=null?s:void 0,fontFamily:x!=null?x:void 0,fontFamilyStack:f,backgroundColor:h});return{visualizerTheme:m,visualizerSubtitleTheme:N,visualizerGeometrySeed:c!=null?c:`geometry-${u}`}};var Xe={};$(Xe,{BUILTIN_FONT_STACKS:()=>Ue,FONT_WEIGHT_STEP:()=>hr,MAX_FONT_WEIGHT:()=>Fr,MIN_FONT_WEIGHT:()=>fr,getBuiltinThemeFontStack:()=>nt,normalizeFontFamilyStack:()=>Zn,normalizeFontWeight:()=>Xn,resolveThemeFontStack:()=>Ar,resolveThemeFontWeight:()=>dr,resolveThemeTranslationFontStack:()=>mr});var fr=100,Fr=900,hr=10,Xn=e=>{if(typeof e!="number"||!Number.isFinite(e))return null;let n=Math.min(900,Math.max(100,e));return Math.round(n/10)*10},dr=(e,n)=>{var t;return(t=Xn(e==null?void 0:e.fontWeight))!=null?t:n},Qn=\'"\\u7345\\u5C3E\\u56DB\\u5B63\\u6625\\u52A0\\u7CD6SC"\',Ue={sans:\'"Inter", "Noto Sans CJK SC", "Noto Sans JP", "Source Han Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif\',serif:`${Qn}, "Iowan Old Style", "Noto Serif CJK SC", "Noto Serif JP", "Source Han Serif SC", "Songti SC", "STSong", "Georgia", serif`,mono:\'"IBM Plex Mono", "Sarasa Mono SC", "Noto Sans Mono CJK SC", "Noto Sans Mono", "SFMono-Regular", Consolas, monospace\'},Un={sans:\'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", "Helvetica Neue", Arial, "Noto Sans CJK SC", "Source Han Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans JP", "Source Han Sans JP", "Hiragino Sans", "Yu Gothic", Meiryo, sans-serif\',serif:`${Qn}, "Folia Noto Serif SC", "Iowan Old Style", Georgia, "Times New Roman", "Noto Serif CJK SC", "Source Han Serif SC", "Songti SC", "STSong", "SimSun", "Noto Serif JP", "Source Han Serif JP", "Yu Mincho", "MS PMincho", serif`,mono:\'Consolas, "IBM Plex Mono", "SFMono-Regular", Menlo, Monaco, "Sarasa Mono SC", "Noto Sans Mono CJK SC", "SimHei", "DengXian", "Microsoft YaHei UI", "Microsoft YaHei", "Noto Sans Mono CJK JP", "MS Gothic", monospace\'},Sr=new Set(["serif","sans-serif","monospace","cursive","fantasy","system-ui","ui-serif","ui-sans-serif","ui-monospace","ui-rounded","emoji","math","fangsong"]),Nr=e=>`"${e.replace(/["\\\\]/g,"\\\\$&")}"`,qn=e=>e.trim().replace(/^[\'"]|[\'"]$/g,"").trim(),pr=e=>{let n=qn(e);return n?Sr.has(n.toLowerCase())?n:Nr(n):null},Zn=e=>{let n=new Set,t=[];return e==null||e.forEach(r=>{let o=qn(r!=null?r:"");if(!o)return;let i=o.toLocaleLowerCase();n.has(i)||(n.add(i),t.push(o))}),t},et=e=>{var t;let n=[...e.fontFamily?[e.fontFamily]:[],...(t=e.fontFamilyStack)!=null?t:[]];return n.length===0?[]:Zn(n).map(pr).filter(r=>!!r)},nt=e=>{var n;return(n=Ue[e])!=null?n:Ue.sans},Ar=e=>{let n=nt(e.fontStyle),t=et(e);return t.length===0?n:`${t.join(", ")}, ${n}`},mr=e=>{var r;let n=(r=Un[e.fontStyle])!=null?r:Un.sans,t=et(e);return t.length===0?n:`${t.join(", ")}, ${n}`};export{Xe as fontStacks,Ve as pendoloClockworkDraw2d,ze as pendoloClockworkMeshes,je as pendoloClockworkMotion,Ge as pendoloGeometry,_e as pendoloMotionProfile,$e as pendoloSubtitleTracks,We as pendoloTimeline,Ye as visualizerTheme};\n';
// END Folia source oracle
