import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as api from '../plugins/folia-lyrics-skin/qml/backgrounds/latent/gpu.mjs';
import {
  createState,
  stepFrame,
  tuning,
  pixelBudget,
} from '../plugins/folia-lyrics-skin/qml/backgrounds/latent/state.mjs';
const base = new URL('../plugins/folia-lyrics-skin/qml/backgrounds/latent/', import.meta.url);

test('Latent packs an explicit RHI std140 ABI with source sRGB premultiplication', () => {
  assert.equal(typeof api.packUniforms, 'function', 'RHI uniform packer must exist');
  const options = tuning({ latentDisplayMode: 'dithering', latentOverlayOpacity: 0.42 });
  const state = stepFrame(
    createState(false),
    { bass: 0.8, lowMid: 0.3, mid: 0.4, vocal: 0.6, treble: 0.2, audioPower: 0.5 },
    options,
    false,
    16,
    true,
  );
  const colors = Array.from({ length: 9 }, (_, i) => ({
    r: (i + 1) / 10,
    g: 0.3,
    b: 0.7,
    a: i ? 1 : 0.25,
  }));
  const p = api.packUniforms(pixelBudget(800, 400, 2), options, state, colors);
  assert.ok(p instanceof Float32Array);
  assert.equal(p.byteLength, 208);
  assert.deepEqual(Array.from(p.slice(0, 4)), [1358, 679, Math.fround(1358 / 800), 0]);
  const expected = [
    state.ditherTime,
    state.meshTime,
    Math.max(0.5, options.ditheringSize - state.bass * options.ditheringSize * 0.34),
    options.meshDistortion + state.power * 0.62,
    options.meshSwirl + state.mid * 0.38,
    Math.min(1, options.ditheringOpacity + state.bass * 0.25),
    state.ditherScale,
    state.meshScale,
    state.saturation,
    state.brightness,
    2,
    0.42,
  ];
  assert.deepEqual(Array.from(p.slice(4, 16)), expected.map(Math.fround));
  assert.deepEqual(Array.from(p.slice(16, 20)), [0.025, 0.075, 0.175, 0.25].map(Math.fround));
  assert.deepEqual(Array.from(p.slice(48, 52)), [0.9, 0.3, 0.7, 1].map(Math.fround));
});

test('Latent source plans share uniforms and each render only to their bounded surface', () => {
  assert.equal(typeof api.createSourcePlans, 'function');
  const plans = api.createSourcePlans({
    parameters: 'u',
    meshPipeline: 'pm',
    ditherPipeline: 'pd',
  });
  for (const [name, pipeline] of [
    ['mesh', 'pm'],
    ['dither', 'pd'],
  ]) {
    assert.deepEqual(plans[name], {
      passes: [
        {
          type: 'render',
          pipeline,
          target: 'surface',
          loadOp: 'clear',
          clear: [0, 0, 0, 0],
          bindings: [
            { binding: 0, kind: 'uniform', resource: 'frame' },
            { binding: 1, kind: 'uniform', resource: 'u' },
          ],
          draws: [{ count: 3 }],
        },
      ],
    });
  }
});

test('RHI adaptation preserves original Paper functions and explicit color/direction boundaries', async () => {
  for (const [original, adapted, marker] of [
    ['mesh.frag', 'gpu/mesh.frag', '#define m_TWO_PI'],
    ['dithering.frag', 'gpu/dithering.frag', 'vec3 d_permute'],
  ]) {
    const old = await readFile(new URL(original, base), 'utf8');
    const current = await readFile(new URL(adapted, base), 'utf8');
    assert.ok(
      current.includes(old.slice(old.indexOf(marker), old.lastIndexOf('void main()'))),
      'Paper algorithm body remains intact',
    );
  }
  const composition = await readFile(new URL('gpu/composition.frag', base), 'utf8');
  assert.equal(
    composition,
    await readFile(new URL('latent.frag', base), 'utf8'),
    'Quick composition retains the exact original encoded-color ABI and formula',
  );
  const conversion = await readFile(new URL('gpu/color.glsl', base), 'utf8');
  assert.match(conversion, /srgbToLinear\(straight\)\s*\*\s*color\.a/);
  const config = JSON.parse(await readFile(new URL('../../../plugin.config.json', base), 'utf8'));
  assert.equal(
    config.shaders.find((s) => s.source.endsWith('gpu/composition.frag')).target,
    'quick',
  );
});

test('pinned source rebuild reproduces the RHI shaders without reviving packaged Quick QSB', async () => {
  const { mkdtemp, mkdir, copyFile, symlink, access, rm } = await import('node:fs/promises');
  const { promisify } = await import('node:util');
  const { execFile } = await import('node:child_process');
  const path = await import('node:path');
  const os = await import('node:os');
  const { fileURLToPath } = await import('node:url');
  const { foliaPath } = await import('./folia-source.mjs');
  const repository = fileURLToPath(new URL('..', import.meta.url));
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'latent-source-rebuild-'));
  try {
    await mkdir(path.join(temporary, 'scripts'));
    for (const name of [
      'build-folia-backgrounds.mjs',
      'folia-reference.mjs',
      'folia-visual-scope.mjs',
    ])
      await copyFile(path.join(repository, 'scripts', name), path.join(temporary, 'scripts', name));
    await copyFile(
      path.join(repository, '.prettierrc.json'),
      path.join(temporary, '.prettierrc.json'),
    );
    await symlink(
      path.join(repository, 'node_modules'),
      path.join(temporary, 'node_modules'),
      'dir',
    );
    await promisify(execFile)(
      process.execPath,
      [path.join(temporary, 'scripts/build-folia-backgrounds.mjs'), foliaPath()],
      {
        env: {
          ...process.env,
          FOLIA_QT_BIN: path.join(temporary, 'no-native-compiler'),
        },
        timeout: 45000,
      },
    );
    const generated = path.join(temporary, 'plugins/folia-lyrics-skin/qml/backgrounds/latent');
    for (const name of [
      'mesh.frag.qsb',
      'dithering.frag.qsb',
      'latent.frag.qsb',
      'gpu/fullscreen.vert.qsb',
      'gpu/mesh.frag.qsb',
      'gpu/dithering.frag.qsb',
      'gpu/composition.frag.qsb',
    ])
      await assert.rejects(
        access(path.join(generated, name)),
        { code: 'ENOENT' },
        'source rebuild must leave baking to plugin.config.json',
      );
    for (const name of [
      'mesh.frag',
      'dithering.frag',
      'latent.frag',
      'gpu/fullscreen.vert',
      'gpu/frame.glsl',
      'gpu/parameters.glsl',
      'gpu/color.glsl',
      'gpu/mesh.frag',
      'gpu/dithering.frag',
      'gpu/composition.frag',
      'helpers.mjs',
      'palette.mjs',
      'defaults.mjs',
      'sources.json',
      'PAPER-LICENSE.txt',
      'PAPER-NOTICE.txt',
    ])
      assert.deepEqual(
        await readFile(path.join(generated, name)),
        await readFile(new URL(name, base)),
        name + ' must be byte-reproducible',
      );
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});
