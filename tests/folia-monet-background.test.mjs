import { foliaPath } from './folia-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import ts from 'typescript';
let api;
try {
  api = await import('../plugins/folia-lyrics-skin/qml/backgrounds/monet/api.mjs');
} catch (error) {
  if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
}
const base = foliaPath();
function variable(text, name) {
  const tree = ts.createSourceFile(
    'source.ts',
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const statement = tree.statements.find(
    (node) =>
      ts.isVariableStatement(node) &&
      node.declarationList.declarations.some((value) => value.name.getText(tree) === name),
  );
  assert.ok(statement, name + ' source declaration missing');
  return statement.getText(tree);
}
let original;
async function source() {
  if (original) return original;
  const types = await readFile(path.join(base, 'src/types.ts'), 'utf8'),
    tuning = await readFile(
      path.join(base, 'src/components/visualizer/backgrounds/monet/tuning.ts'),
      'utf8',
    ),
    pipeline = await readFile(
      path.join(base, 'src/components/visualizer/monet/monetBackgroundPipeline.ts'),
      'utf8',
    ),
    layer = await readFile(
      path.join(base, 'src/components/visualizer/backgrounds/monet/MonetBackgroundLayer.tsx'),
      'utf8',
    );
  const contents = [
    variable(types, 'DEFAULT_MONET_BACKGROUND_TUNING'),
    tuning.slice(
      tuning.indexOf('const backgroundSource ='),
      tuning.indexOf('export default defineBackgroundTuning'),
    ),
    variable(pipeline, 'resolveSourceUrl'),
    variable(pipeline, 'getMonetBackgroundCacheKey'),
    variable(layer, 'resolveMonetSourceUrl'),
    "export * from './src/components/visualizer/backgrounds/monet/monetBackgroundDrift.ts';export * from './src/components/visualizer/monet/monetBackgroundPaint.ts';",
  ].join('\n');
  const output = await build({
    stdin: { contents, loader: 'ts', resolveDir: base },
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
  });
  return (original = await import(
    'data:text/javascript;base64,' + Buffer.from(output.outputFiles[0].text).toString('base64')
  ));
}
function available() {
  assert.ok(api, 'Monet background source modules are missing');
}
test('Monet slider metadata retains the actual source Card ranges and steps', async () => {
  available();
  const card = await readFile(
    path.join(base, 'src/components/visualizer/backgrounds/monet/MonetBackgroundSettingsCard.tsx'),
    'utf8',
  );
  const expected = {};
  for (const match of card.matchAll(/<SliderRow\b[\s\S]*?\/>/g)) {
    const text = match[0],
      key = /value=\{resolvedTuning\.(\w+)\}/.exec(text)[1];
    expected[key] = Object.fromEntries(
      ['min', 'max', 'step'].map((name) => [
        name,
        Number(new RegExp('\\b' + name + '=\\{([\\d.-]+)\\}').exec(text)[1]),
      ]),
    );
  }
  assert.equal(Object.keys(expected).length, 7);
  assert.equal(expected.backgroundOverlayOpacity.step, 0.02);
  assert.equal(expected.backgroundSaturation.step, 0.05);
  assert.deepEqual(api.MONET_BACKGROUND_SLIDERS, expected);
});
test('Monet background retains every original drift keyframe and exact loop/overscan budget', async () => {
  available();
  const expected = await source();
  for (const strength of [-1, 0, 0.01, 0.5, 1, 2]) {
    assert.deepEqual(api.buildMonetDriftTrack(strength), expected.buildMonetDriftTrack(strength));
    const track = api.buildMonetDriftTrack(strength);
    assert.equal(track.keyframes.length, 157);
    assert.equal(track.durationMs, 240000);
    assert.equal(track.keyframes[0].transform, track.keyframes[156].transform);
    assert.ok(track.minScale >= 1 + track.maxTravelPercent * 0.02);
  }
});
test('Monet background stores the original thirteen defaults, normalization and source/cache identity', async () => {
  available();
  const expected = await source();
  assert.equal(Object.keys(api.DEFAULT_MONET_BACKGROUND_TUNING).length, 13);
  assert.deepEqual(api.DEFAULT_MONET_BACKGROUND_TUNING, expected.DEFAULT_MONET_BACKGROUND_TUNING);
  for (const input of [
    {},
    {
      backgroundBlurPx: 90,
      backgroundSaturation: -1,
      backgroundHalfPaneOffsetX: -90,
      backgroundDriftStrength: 2,
    },
    {
      backgroundWashCustomColor: 'ABC123',
      backgroundSource: 'uploaded-global',
      backgroundLayout: 'half-pane-gradient',
      backgroundWashColorMode: 'custom',
    },
    { backgroundBlurPx: NaN, backgroundOverlayOpacity: Infinity, backgroundStreaksEnabled: false },
  ])
    assert.deepEqual(
      api.resolveStoredMonetBackgroundTuning(input),
      expected.resolveStoredMonetBackgroundTuning(input),
    );
  for (const uploaded of [null, { id: 'asset-1', url: 'upload://one' }])
    for (const cover of [null, '', 'cover://one'])
      for (const backgroundSource of ['cover-derived', 'uploaded-global']) {
        const options = {
          coverUrl: cover,
          monetBackgroundImage: uploaded,
          theme: { backgroundColor: '#123456', accentColor: '#f80', primaryColor: '#fff' },
          tuning: { ...api.DEFAULT_MONET_BACKGROUND_TUNING, backgroundSource },
        };
        assert.equal(
          api.resolveMonetSourceUrl(cover, uploaded, options.tuning),
          expected.resolveMonetSourceUrl(cover, uploaded, options.tuning),
        );
        assert.equal(
          api.getMonetBackgroundCacheKey(options),
          expected.getMonetBackgroundCacheKey(options),
        );
        for (const patch of [
          { backgroundLayout: 'half-pane-gradient' },
          { backgroundDriftStrength: 0.9, backgroundDriftEnabled: false },
          { backgroundHalfPaneOffsetX: 40 },
        ])
          assert.equal(
            api.getMonetBackgroundCacheKey(options),
            api.getMonetBackgroundCacheKey({ ...options, tuning: { ...options.tuning, ...patch } }),
          );
        assert.notEqual(
          api.getMonetBackgroundCacheKey(options),
          api.getMonetBackgroundCacheKey({
            ...options,
            tuning: { ...options.tuning, backgroundStreaksEnabled: false },
          }),
        );
      }
});
function context() {
  const commands = [],
    data = new Uint8ClampedArray(32 * 18 * 4);
  for (let i = 0; i < data.length; i++) data[i] = (i * 37 + 11) % 256;
  for (let i = 3; i < data.length; i += 28) data[i] = 0;
  return {
    canvas: { width: 32, height: 18 },
    filter: 'none',
    fillStyle: null,
    commands,
    data,
    stack: [],
    save() {
      this.stack.push({ filter: this.filter, fillStyle: this.fillStyle });
    },
    restore() {
      Object.assign(this, this.stack.pop());
    },
    drawImage(image, x, y, width, height) {
      commands.push({ kind: 'image', filter: this.filter, x, y, width, height });
    },
    fillRect(x, y, width, height) {
      commands.push({
        kind: 'rect',
        filter: this.filter,
        fillStyle: JSON.parse(JSON.stringify(this.fillStyle)),
        x,
        y,
        width,
        height,
      });
    },
    getImageData() {
      return { data };
    },
    putImageData(image) {
      this.data = image.data;
    },
    createLinearGradient(...points) {
      return {
        kind: 'linear',
        points,
        stops: [],
        addColorStop(position, color) {
          this.stops.push({ position, color });
        },
      };
    },
    createRadialGradient(...points) {
      return {
        kind: 'radial',
        points,
        stops: [],
        addColorStop(position, color) {
          this.stops.push({ position, color });
        },
      };
    },
  };
}
test('Monet original painter preserves crop, blur ordering, byte-quantized wash, all gradients and eighteen streaks', async () => {
  available();
  const expected = await source();
  assert.equal(api.MONET_BACKGROUND_WIDTH, 1920);
  assert.equal(api.MONET_BACKGROUND_HEIGHT, 1080);
  for (const grayscale of [0, 0.4, 1])
    for (const saturation of [0, 0.9999, 2])
      for (const wash of [0, 0.34, 1])
        for (const blur of [null, 6]) {
          const tuning = {
              ...api.DEFAULT_MONET_BACKGROUND_TUNING,
              backgroundGrayscale: grayscale,
              backgroundSaturation: saturation,
              backgroundWash: wash,
              backgroundWashColorMode: 'custom',
            },
            theme = { backgroundColor: '#f0e0d0', primaryColor: '#123456', accentColor: '#cc5533' },
            a = context(),
            b = context(),
            image = { width: 450, height: 600 };
          api.paintMonetBackground(a, image, theme, tuning, blur);
          expected.paintMonetBackground(b, image, theme, tuning, blur);
          assert.deepEqual(a.commands, b.commands);
          assert.deepEqual(a.data, b.data);
          assert.equal(a.commands.filter((command) => command.kind === 'rect').length, 22);
          assert.equal(a.commands[1].filter, blur === null ? 'none' : 'blur(6px)');
        }
});

function environment() {
  const workers = [],
    closed = [],
    revoked = [];
  class Image {
    set src(value) {
      this.url = value;
    }
    async decode() {}
  }
  class Worker {
    constructor() {
      workers.push(this);
      this.jobs = [];
      this.terminated = false;
    }
    postMessage(value) {
      this.jobs.push(value);
    }
    terminate() {
      this.terminated = true;
    }
  }
  class Url extends URL {
    static createObjectURL(picture) {
      return 'blob:' + picture.id;
    }
    static revokeObjectURL(url) {
      revoked.push(url);
    }
  }
  return {
    workers,
    closed,
    revoked,
    Image,
    Worker,
    URL: Url,
    createImageBitmap: async (image) => ({
      url: image.url,
      width: 300,
      height: 200,
      close() {
        closed.push(this.url);
      },
    }),
    document: {
      createElement() {
        return {
          getContext() {
            return {
              filter: 'none',
              fillRect() {},
              getImageData() {
                return { data: [255] };
              },
            };
          },
        };
      },
    },
  };
}
async function turns() {
  for (let i = 0; i < 12; i++) await Promise.resolve();
}
test('Monet original asynchronous cache deduplicates holders, serializes paint and drops an unwanted queued image', async () => {
  available();
  assert.equal(
    typeof api.createMonetPipeline,
    'function',
    'source asynchronous pipeline factory is missing',
  );
  const env = environment(),
    pipeline = api.createMonetPipeline(env),
    options = (source) => ({
      coverUrl: source,
      theme: { backgroundColor: '#123456', accentColor: '#f80', primaryColor: '#fff' },
      tuning: api.DEFAULT_MONET_BACKGROUND_TUNING,
    });
  const a = pipeline.wantMonetBackgroundUrl(options('A')),
    same = pipeline.wantMonetBackgroundUrl(options('A'));
  await turns();
  assert.equal(env.workers.length, 1);
  assert.equal(env.workers[0].jobs.length, 1);
  a.release();
  const b = pipeline.wantMonetBackgroundUrl(options('B')),
    c = pipeline.wantMonetBackgroundUrl(options('C'));
  b.release();
  await turns();
  assert.equal(env.workers[0].jobs.length, 1);
  const worker = env.workers[0],
    first = worker.jobs[0];
  worker.onmessage({ data: { id: first.id, picture: { id: 'A' } } });
  await turns();
  assert.equal(worker.jobs.length, 2);
  assert.equal(worker.jobs[1].image.url, 'C');
  assert.equal(await b.url, null);
  assert.equal(await same.url, 'blob:A');
  assert.ok(env.closed.includes('B'));
  const third = worker.jobs[1];
  worker.onmessage({ data: { id: third.id, picture: { id: 'C' } } });
  assert.equal(await c.url, 'blob:C');
  same.release();
  c.release();
  const cached = pipeline.wantMonetBackgroundUrl(options('A'));
  assert.equal(await cached.url, 'blob:A');
  assert.equal(worker.jobs.length, 2);
  cached.release();
  pipeline.dispose();
  assert.equal(worker.terminated, true);
  await turns();
  assert.deepEqual(env.revoked.sort(), ['blob:A', 'blob:C']);
  assert.throws(() => pipeline.wantMonetBackgroundUrl(options('D')), /released/);
});

function scheduler() {
  let now = 0,
    next = 0;
  const tasks = new Map();
  return {
    get now() {
      return now;
    },
    setTimeout(callback, delay) {
      const id = ++next;
      tasks.set(id, { at: now + delay, callback });
      return id;
    },
    clearTimeout(id) {
      tasks.delete(id);
    },
    async advance(to) {
      for (;;) {
        const due = [...tasks]
          .filter(([, task]) => task.at <= to)
          .sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        now = due[1].at;
        tasks.delete(due[0]);
        due[1].callback();
        await turns();
      }
      now = to;
      await turns();
    },
    get size() {
      return tasks.size;
    },
  };
}
function leaseStore() {
  const entries = new Map(),
    calls = [];
  return {
    calls,
    getMonetBackgroundCacheKey: api.getMonetBackgroundCacheKey,
    wantMonetBackgroundUrl(options) {
      const key = api.getMonetBackgroundCacheKey(options);
      let entry = entries.get(key);
      if (!entry) {
        let resolve;
        const url = new Promise((done) => {
          resolve = done;
        });
        entry = { url, resolve, holders: 0 };
        entries.set(key, entry);
      }
      entry.holders++;
      const call = { key, released: false };
      calls.push(call);
      return {
        url: entry.url,
        release() {
          if (!call.released) {
            call.released = true;
            entry.holders--;
          }
        },
      };
    },
    resolve(options, url) {
      entries.get(api.getMonetBackgroundCacheKey(options)).resolve(url);
    },
    get holders() {
      return [...entries.values()].reduce((n, value) => n + value.holders, 0);
    },
  };
}
async function reactLayerOracle(store, clock) {
  const hooks = new Map(),
    effects = new Map();
  let cursor = 0,
    dirty = false,
    props,
    draws = 0,
    mounted = true,
    renderedTree = null;
  const react = {
    createElement(type, props, ...children) {
      return { type, props, children };
    },
    useState(initial) {
      const id = cursor++;
      if (!hooks.has(id)) hooks.set(id, initial);
      return [
        hooks.get(id),
        (value) => {
          const old = hooks.get(id),
            next = typeof value === 'function' ? value(old) : value;
          if (!Object.is(old, next)) {
            hooks.set(id, next);
            dirty = true;
          }
        },
      ];
    },
    useRef(initial) {
      const id = cursor++;
      if (!hooks.has(id)) hooks.set(id, { current: initial });
      return hooks.get(id);
    },
    useMemo(fn) {
      cursor++;
      return fn();
    },
    useEffect(fn, deps) {
      const id = cursor++,
        previous = effects.get(id);
      if (!previous || deps.some((value, index) => !Object.is(value, previous.deps[index])))
        effects.set(id, { fn, deps, cleanup: previous && previous.cleanup, pending: true });
    },
  };
  globalThis.__monetLayerOracle = {
    react,
    pipeline: store,
    pictureDrawn() {
      draws++;
    },
  };
  const built = await build({
    entryPoints: [
      path.join(base, 'src/components/visualizer/backgrounds/monet/MonetBackgroundLayer.tsx'),
    ],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
    jsx: 'transform',
    plugins: [
      {
        name: 'actual-react-effect-harness',
        setup(build) {
          build.onResolve(
            {
              filter:
                /^(react(?:\/jsx-runtime)?|framer-motion)$|monetBackgroundPipeline$|useReducedMotionFor$|styleTransition\/firstFrame$/,
            },
            (args) => ({ path: args.path, namespace: 'monet-effect-harness' }),
          );
          build.onLoad({ filter: /.*/, namespace: 'monet-effect-harness' }, (args) => {
            if (args.path === 'react')
              return {
                contents:
                  'const r=globalThis.__monetLayerOracle.react;export default r;export const useEffect=r.useEffect,useMemo=r.useMemo,useRef=r.useRef,useState=r.useState;',
              };
            if (args.path === 'react/jsx-runtime')
              return {
                contents:
                  'const r=globalThis.__monetLayerOracle.react;export const jsx=(type,props,key)=>r.createElement(type,{...props,key}),jsxs=jsx;',
              };
            if (args.path === 'framer-motion')
              return {
                contents: 'export const AnimatePresence="presence",motion={div:"motion.div"};',
              };
            if (args.path.endsWith('monetBackgroundPipeline'))
              return {
                contents:
                  'const p=globalThis.__monetLayerOracle.pipeline;export const getMonetBackgroundCacheKey=p.getMonetBackgroundCacheKey,wantMonetBackgroundUrl=p.wantMonetBackgroundUrl.bind(p),checkCanvasFilterSupport=()=>true;',
              };
            if (args.path.endsWith('useReducedMotionFor'))
              return { contents: 'export const useReducedMotionFor=()=>false;' };
            return {
              contents:
                'export const useFirstFrameDrawn=()=>globalThis.__monetLayerOracle.pictureDrawn;',
            };
          });
        },
      },
    ],
  });
  const { default: Layer } = await import(
    'data:text/javascript;base64,' +
      Buffer.from(built.outputFiles[0].text).toString('base64') +
      '#' +
      Math.random()
  );
  function render() {
    if (!mounted) return;
    globalThis.window = clock;
    for (let round = 0; round < 10; round++) {
      dirty = false;
      cursor = 0;
      renderedTree = Layer(props);
      for (const effect of effects.values())
        if (effect.pending) {
          effect.pending = false;
          if (effect.cleanup) effect.cleanup();
          effect.cleanup = effect.fn();
        }
      if (!dirty) return;
    }
    throw new Error('source React hook harness did not settle');
  }
  return {
    update(value) {
      props = value;
      render();
    },
    get tree() {
      if (dirty) render();
      return renderedTree;
    },
    get snapshot() {
      if (dirty) render();
      const sourceUrl = api.resolveMonetSourceUrl(
        props.coverUrl,
        props.monetBackgroundImage,
        props.tuning,
      );
      return {
        pipelineUrl: hooks.get(0),
        isPipelinePending: hooks.get(1),
        firstPicture: hooks.get(2),
        shownSource: hooks.get(3).current,
        sourceUrl,
        pictureKey: hooks.get(0) || sourceUrl || 'fallback',
        draws,
      };
    },
    dispose() {
      mounted = false;
      for (const effect of effects.values()) if (effect.cleanup) effect.cleanup();
    },
  };
}
test('Monet layer matches actual React effect at 180ms, first picture, same-source slider debounce and stale results', async () => {
  available();
  assert.equal(
    typeof api.createMonetLayerState,
    'function',
    'Monet source layer lifecycle is missing',
  );
  const aClock = scheduler(),
    bClock = scheduler(),
    aStore = leaseStore(),
    bStore = leaseStore();
  let draws = 0;
  const actual = api.createMonetLayerState({
      pipeline: aStore,
      setTimeout: aClock.setTimeout,
      clearTimeout: aClock.clearTimeout,
      pictureDrawn() {
        draws++;
      },
    }),
    original = await reactLayerOracle(bStore, bClock),
    options = (source, patch = {}) => ({
      coverUrl: source,
      theme: { backgroundColor: '#123456', accentColor: '#f80', primaryColor: '#fff' },
      tuning: { ...api.DEFAULT_MONET_BACKGROUND_TUNING, ...patch },
    });
  let current = options('A');
  function same() {
    assert.deepEqual({ ...actual.snapshot, draws }, original.snapshot);
    assert.deepEqual(aStore.calls, bStore.calls);
    assert.equal(aStore.holders, bStore.holders);
    assert.equal(aClock.size, bClock.size);
  }
  function update(value) {
    current = value;
    actual.update(value);
    original.update(value);
    same();
  }
  async function advance(to) {
    await aClock.advance(to);
    await bClock.advance(to);
    same();
  }
  async function resolve(value, url) {
    aStore.resolve(value, url);
    bStore.resolve(value, url);
    await turns();
    same();
  }
  update(current);
  assert.equal(aStore.calls.length, 1);
  await resolve(current, 'blob:first');
  assert.equal(actual.snapshot.pipelineUrl, null);
  await advance(179);
  await advance(180);
  assert.equal(actual.snapshot.pipelineUrl, 'blob:first');
  assert.equal(actual.snapshot.firstPicture, 'blob:first');
  assert.equal(draws, 1);
  await advance(200);
  update({ ...current, tuning: { ...current.tuning, backgroundWash: 0.4 } });
  assert.equal(aStore.calls.length, 2);
  await advance(300);
  update({ ...current, tuning: { ...current.tuning, backgroundWash: 0.6 } });
  await advance(479);
  assert.equal(aStore.calls.length, 2);
  await advance(480);
  assert.equal(aStore.calls.length, 3);
  await resolve(current, 'blob:retuned');
  assert.equal(actual.snapshot.firstPicture, 'blob:first');
  assert.equal(actual.snapshot.pipelineUrl, 'blob:retuned');
  update({
    ...current,
    tuning: {
      ...current.tuning,
      backgroundLayout: 'half-pane-gradient',
      backgroundDriftStrength: 0.8,
    },
  });
  assert.equal(aStore.calls.length, 3);
  update(options('B'));
  const stale = current;
  await advance(500);
  update(options('C'));
  await resolve(stale, 'blob:stale');
  assert.equal(actual.snapshot.pipelineUrl, 'blob:retuned');
  await advance(680);
  await resolve(current, null);
  assert.equal(actual.snapshot.shownSource, 'C');
  assert.equal(actual.snapshot.pictureKey, 'C');
  update({ ...current, transparentBackground: true });
  assert.equal(actual.snapshot.isPipelinePending, false);
  update({ ...current, transparentBackground: false });
  assert.equal(aStore.calls.length, 6);
  await advance(860);
  assert.equal(actual.snapshot.pipelineUrl, null);
  same();
  original.dispose();
  actual.dispose();
  assert.equal(aStore.holders, 0);
  assert.equal(bStore.holders, 0);
  assert.equal(aClock.size, 0);
  delete globalThis.__monetLayerOracle;
  delete globalThis.window;
});
test('Monet image lease disposal cannot start a late painter after the source decode finishes', async () => {
  available();
  const env = environment(),
    decodes = [];
  env.Image = class {
    set src(url) {
      this.url = url;
    }
    decode() {
      return new Promise((resolve) => decodes.push(resolve));
    }
  };
  const pipeline = api.createMonetPipeline(env),
    options = {
      coverUrl: 'late decode',
      theme: { backgroundColor: '#123456', accentColor: '#f80', primaryColor: '#fff' },
      tuning: api.DEFAULT_MONET_BACKGROUND_TUNING,
    },
    lease = pipeline.wantMonetBackgroundUrl(options);
  assert.equal(decodes.length, 1);
  pipeline.dispose();
  decodes[0]();
  await turns();
  assert.equal(
    env.workers.length,
    0,
    'a disposed pipeline must not start a worker after asynchronous source decode',
  );
  assert.deepEqual(env.closed, ['late decode']);
  assert.equal(await lease.url, null);
  assert.equal(pipeline.cacheEntries, 0);
});
test('Monet image cache has a real lease bound and releases only zero-holder entries', async () => {
  available();
  const env = environment(),
    pipeline = api.createMonetPipeline(env, { maxEntries: 2 }),
    options = (source) => ({
      coverUrl: source,
      theme: { backgroundColor: '#123456', accentColor: '#f80', primaryColor: '#fff' },
      tuning: api.DEFAULT_MONET_BACKGROUND_TUNING,
    });
  const a = pipeline.wantMonetBackgroundUrl(options('held A')),
    b = pipeline.wantMonetBackgroundUrl(options('held B'));
  await turns();
  assert.throws(() => pipeline.wantMonetBackgroundUrl(options('C')), /lease budget/);
  assert.equal(pipeline.cacheEntries, 2);
  const worker = env.workers[0];
  worker.onmessage({ data: { id: worker.jobs[0].id, picture: { id: 'A' } } });
  await turns();
  worker.onmessage({ data: { id: worker.jobs[1].id, picture: { id: 'B' } } });
  await turns();
  assert.equal(await a.url, 'blob:A');
  assert.equal(await b.url, 'blob:B');
  a.release();
  a.release();
  const c = pipeline.wantMonetBackgroundUrl(options('C'));
  await turns();
  assert.deepEqual(env.revoked, ['blob:A']);
  assert.equal(pipeline.cacheEntries, 2);
  worker.onmessage({ data: { id: worker.jobs[2].id, picture: { id: 'C' } } });
  await turns();
  assert.equal(await c.url, 'blob:C');
  pipeline.dispose();
  await turns();
  assert.deepEqual(env.revoked.sort(), ['blob:A', 'blob:B', 'blob:C']);
  assert.equal(worker.onmessage, null);
  assert.equal(worker.onerror, null);
});

// Actual original WAAPI keyframes; Google Chrome 155.0.8059.86, 1920x1080, paused currentTime.
const waapiDriftReference = [
  { strength: 0, ms: 0, x: 0, y: 0, scale: 1.01 },
  { strength: 0, ms: 1, x: 0, y: 0, scale: 1.01 },
  { strength: 0, ms: 1538.4615384615386, x: 0, y: 0, scale: 1.01 },
  { strength: 0, ms: 17000, x: 0, y: 0, scale: 1.01 },
  { strength: 0, ms: 239999, x: 0, y: 0, scale: 1.01 },
  { strength: 0, ms: 240000, x: 0, y: 0, scale: 1.01 },
  { strength: 0, ms: 257000, x: 0, y: 0, scale: 1.01 },
  { strength: 0.5, ms: 0, x: -30.1171, y: 15.5941, scale: 1.05831 },
  { strength: 0.5, ms: 1, x: -30.1058, y: 15.5835, scale: 1.05831 },
  { strength: 0.5, ms: 1538.4615384615386, x: -12.72, y: -0.6912, scale: 1.05633 },
  { strength: 0.5, ms: 17000, x: -3.78557, y: -1.62977, scale: 1.0497 },
  { strength: 0.5, ms: 239999, x: -30.103, y: 15.5832, scale: 1.05831 },
  { strength: 0.5, ms: 240000, x: -30.1171, y: 15.5941, scale: 1.05831 },
  { strength: 0.5, ms: 257000, x: -3.78557, y: -1.62977, scale: 1.0497 },
  { strength: 1, ms: 0, x: -60.2342, y: 31.1872, scale: 1.10662 },
  { strength: 1, ms: 1, x: -60.2116, y: 31.166, scale: 1.10662 },
  { strength: 1, ms: 1538.4615384615386, x: -25.4419, y: -1.3824, scale: 1.10266 },
  { strength: 1, ms: 17000, x: -7.57114, y: -3.25955, scale: 1.08939 },
  { strength: 1, ms: 239999, x: -60.2059, y: 31.1652, scale: 1.10662 },
  { strength: 1, ms: 240000, x: -60.2342, y: 31.1872, scale: 1.10662 },
  { strength: 1, ms: 257000, x: -7.57114, y: -3.25955, scale: 1.08939 },
];
test('Monet native phase interpolation matches actual Chrome WAAPI over all loop boundaries', async () => {
  available();
  assert.equal(typeof api.prepareMonetDrift, 'function', 'native drift preparation is missing');
  for (const row of waapiDriftReference) {
    const track = api.prepareMonetDrift(row.strength),
      phase = ((row.ms % track.durationMs) / track.durationMs) * 156,
      pose = api.sampleMonetDrift(track, phase);
    assert.ok(Math.abs(pose.xPercent * 19.2 - row.x) <= 0.0001, JSON.stringify({ row, pose }));
    assert.ok(Math.abs(pose.yPercent * 10.8 - row.y) <= 0.0001, JSON.stringify({ row, pose }));
    assert.ok(Math.abs(pose.scale - row.scale) <= 0.0000051, JSON.stringify({ row, pose }));
    assert.equal(track.frames.length, 157);
    assert.equal(track.durationMs, 240000);
  }
});

test('Monet native endpoints drive the unmodified serial queue and release even during decode', async () => {
  const { createNativeMonetEnvironment } =
    await import('../plugins/folia-lyrics-skin/qml/backgrounds/monet/native-environment.mjs');
  const painted = [],
    decoded = [],
    released = [];
  let cancelled = 0;
  const environment = createNativeMonetEnvironment({
    decode(source) {
      decoded.push(source);
      return Promise.resolve({
        width: source.startsWith('capture:') ? 1920 : 64,
        height: source.startsWith('capture:') ? 1080 : 48,
      });
    },
    paint(request) {
      painted.push(request);
      return Promise.resolve({ url: 'capture:' + request.id });
    },
    cancelPaint() {
      cancelled++;
    },
    releasePicture(picture) {
      released.push(picture.url);
    },
  });
  const pipeline = api.createMonetPipeline(environment),
    options = {
      coverUrl: 'cover:original',
      theme: { backgroundColor: '#172331', primaryColor: '#f3e7d1', accentColor: '#93b9f1' },
      tuning: api.DEFAULT_MONET_BACKGROUND_TUNING,
    };
  const one = pipeline.wantMonetBackgroundUrl(options),
    two = pipeline.wantMonetBackgroundUrl(options);
  assert.equal(await one.url, 'capture:1');
  assert.equal(await two.url, 'capture:1');
  assert.equal(painted.length, 1);
  assert.equal(painted[0].blurPx, 6);
  assert.equal(painted[0].image.width, 64);
  assert.equal(painted[0].image.height, 48);
  assert.deepEqual(decoded, ['cover:original', 'capture:1']);
  one.release();
  two.release();
  pipeline.dispose();
  environment.dispose();
  assert.deepEqual(released, ['capture:1']);
  assert.equal(cancelled, 1);

  let finish;
  const pendingEnvironment = createNativeMonetEnvironment({
    decode() {
      return new Promise((resolve) => (finish = resolve));
    },
    paint() {
      assert.fail('disposed metadata cannot start a GPU painter');
    },
    cancelPaint() {},
    releasePicture() {},
  });
  const pending = api.createMonetPipeline(pendingEnvironment),
    held = pending.wantMonetBackgroundUrl(options);
  pending.dispose();
  pendingEnvironment.dispose();
  finish({ width: 64, height: 48 });
  const result = await Promise.race([
    held.url,
    new Promise((resolve) => setTimeout(() => resolve('hung'), 100)),
  ]);
  assert.equal(result, null, 'original decode fallback must settle after owner shutdown');
});

test('Monet native presentation geometry agrees with the original JSX, masks and CSS stops', async () => {
  const presentation =
    await import('../plugins/folia-lyrics-skin/qml/backgrounds/monet/presentation.mjs');
  const cases = [
    { name: 'full', layout: 'full-overlay', width: 640, daylight: false, offset: 0 },
    { name: 'half639', layout: 'half-pane-gradient', width: 639, daylight: false, offset: -40 },
    { name: 'half640', layout: 'half-pane-gradient', width: 640, daylight: true, offset: 40 },
    { name: 'half1024', layout: 'half-pane-gradient', width: 1024, daylight: false, offset: 0 },
  ];
  const theme = { backgroundColor: '#172331', primaryColor: '#f3e7d1', accentColor: '#93b9f1' };
  const css =
    '.absolute{position:absolute}.inset-0{inset:0}.inset-y-0{top:0;bottom:0}.left-0{left:0}.overflow-hidden{overflow:hidden}[class~="w-[72%]"]{width:72%}@media(min-width:640px){[class~="sm:w-[68%]"]{width:68%}}@media(min-width:1024px){[class~="lg:w-[60%]"]{width:60%}}';
  function nodes(tree) {
    if (!tree) return [];
    if (Array.isArray(tree)) return tree.flatMap(nodes);
    if (typeof tree !== 'object') return [];
    return [
      tree,
      ...nodes(
        tree.children && tree.children.length ? tree.children : tree.props && tree.props.children,
      ),
    ];
  }
  function html(tree) {
    if (tree == null || tree === false) return '';
    if (Array.isArray(tree)) return tree.map(html).join('');
    if (typeof tree !== 'object') return String(tree);
    const props = tree.props || {},
      children = html(tree.children && tree.children.length ? tree.children : props.children || []);
    if (tree.type === 'presence') return children;
    const style = Object.assign(
      {},
      props.style,
      props.animate && props.animate.opacity !== undefined
        ? { opacity: props.animate.opacity }
        : {},
    );
    const serialized = Object.entries(style)
      .map(([key, value]) => key.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase()) + ':' + value)
      .join(';');
    return (
      '<div class="' +
      (props.className || '') +
      '" style="' +
      serialized +
      '">' +
      children +
      '</div>'
    );
  }
  for (const spec of cases) {
    const clock = scheduler(),
      store = leaseStore(),
      oracle = await reactLayerOracle(store, clock);
    const tuning = Object.assign({}, api.DEFAULT_MONET_BACKGROUND_TUNING, {
      backgroundLayout: spec.layout,
      backgroundHalfPaneOffsetX: spec.offset,
    });
    const props = {
      coverUrl: 'input.png',
      theme,
      tuning,
      isDaylight: spec.daylight,
      staticMode: true,
    };
    oracle.update(props);
    await clock.advance(180);
    store.resolve(props, 'chrome-6.png');
    await turns();
    assert.equal(oracle.snapshot.pipelineUrl, 'chrome-6.png');
    const tree = oracle.tree,
      all = nodes(tree),
      picture = all.find(
        (node) =>
          node.props &&
          node.props.style &&
          node.props.style.backgroundSize === 'cover' &&
          node.type === 'motion.div',
      );
    assert.ok(picture);
    assert.equal(
      picture.props.animate.opacity,
      spec.layout === 'full-overlay' ? 1 : presentation.imageOpacity(spec.daylight, tuning),
    );
    assert.equal(
      picture.props.style.backgroundPosition,
      spec.layout === 'full-overlay'
        ? 'center'
        : presentation.imagePosition(tuning) * 100 + '% center',
    );
    if (spec.layout === 'half-pane-gradient') {
      const pane = all.find((node) => node.props && node.props.style && node.props.style.maskImage);
      assert.equal(
        pane.props.style.maskImage,
        'linear-gradient(90deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0.94) 48%, rgba(0,0,0,0.46) 74%, rgba(0,0,0,0) 100%)',
      );
      assert.equal(
        presentation.paneFraction(spec.width),
        spec.width < 640 ? 0.72 : spec.width < 1024 ? 0.68 : 0.6,
      );
    }
    if (process.env.FOLIA_WRITE_MONET_CSS_ORACLE) {
      const dir = path.resolve('build/folia-monet-background-oracle');
      await mkdir(dir, { recursive: true });
      await writeFile(
        path.join(dir, 'css-' + spec.name + '.html'),
        '<!doctype html><style>html,body{margin:0;width:100%;height:100%}' +
          css +
          '</style><div style="position:relative;width:' +
          spec.width +
          'px;height:360px">' +
          html(tree) +
          '</div>',
      );
    }
    oracle.dispose();
  }
});

test('Monet painter budget and base fill keep original aspect, alpha and declared GPU storage', async () => {
  const { planMonetPainter } =
    await import('../plugins/folia-lyrics-skin/qml/backgrounds/monet/gpu-plan.mjs');
  const p = planMonetPainter(
    12000,
    6000,
    { backgroundColor: 'rgba(20,40,60,0.25)', primaryColor: '#fff', accentColor: '#80b0ff' },
    { backgroundBlurPx: 60 },
  );
  assert.equal(p.inputWidth, 4096);
  assert.equal(p.inputHeight, 2048);
  assert.equal(p.padding, 240);
  assert.equal(p.fboBytes, 1920 * (1080 + 480) * 8);
  assert.deepEqual(p.baseFill, [(20 / 255) * 0.25, (40 / 255) * 0.25, (60 / 255) * 0.25, 0.25]);
  assert.ok(p.totalBytes < 128 * 1024 * 1024);
  for (const dims of [
    [0, 10],
    [10, Infinity],
    [32769, 2],
  ])
    assert.match(planMonetPainter(...dims, {}, {}).error, /dimensions/);
});
