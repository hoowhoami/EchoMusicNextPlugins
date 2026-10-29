import { resolveFoliaReference, normalizeFoliaBundle } from './folia-reference.mjs';
// Inline the same locked triangulator Pixi uses; no external runtime dependency is added.
import { readFile, writeFile, rename } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { format, resolveConfig } from 'prettier';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url))),
  reference = await resolveFoliaReference(),
  file = path.join(root, 'plugins/folia-lyrics-skin/qml/styles/sonnet/scene-graph.mjs');
const packageHash = createHash('sha256')
  .update(await readFile(path.join(reference, 'node_modules/earcut/src/earcut.js')))
  .digest('hex');
const pkg = JSON.parse(
  await readFile(path.join(reference, 'node_modules/earcut/package.json'), 'utf8'),
);
if (pkg.version !== '3.2.3' || pkg.license !== 'ISC') throw Error('Locked Pixi earcut mismatch');
const result = await build({
  stdin: {
    contents: "import earcut from 'earcut';export {earcut as sourceEarcut};",
    resolveDir: reference,
  },
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2016',
  write: false,
  legalComments: 'none',
});
const license = await readFile(path.join(reference, 'node_modules/earcut/LICENSE'), 'utf8');
const code = await readFile(file, 'utf8'),
  a = '// BEGIN pinned earcut 3.2.3 (ISC) generated',
  b = '// END pinned earcut';
if (!code.includes(a) || !code.includes(b)) throw Error('Missing triangulator seam');
const complete = await format(
  code.slice(0, code.indexOf(a)) +
    a +
    '\n// Pixi8.21.0 / earcut3.2.3 SHA256 ' +
    packageHash +
    '\n/*\n' +
    license +
    '*/\n' +
    normalizeFoliaBundle(result.outputFiles[0].text, reference)
      .replace(/export \{[\s\S]*?\};/, '')
      .replace('function earcut(', 'function sourceEarcut(') +
    '\n' +
    b +
    code.slice(code.indexOf(b) + b.length),
  { ...(await resolveConfig(file)), parser: 'babel' },
);
await writeFile(file + '.graph-tmp', complete);
await rename(file + '.graph-tmp', file);
const Pixi = await import(
  new URL('file://' + path.join(reference, 'node_modules/pixi.js/lib/index.mjs'))
);
const fixtures = [
  {
    name: 'fill and stroke with actual cut hole',
    steps: [
      { name: 'rect', args: [0, 0, 100, 100] },
      { name: 'fill', args: [{ color: 0xff0000, alpha: 0.5 }] },
      { name: 'rect', args: [20, 20, 30, 30] },
      { name: 'cut', args: [] },
      { name: 'moveTo', args: [0, 50] },
      { name: 'lineTo', args: [100, 50] },
      { name: 'stroke', args: [{ color: 0xffffff, width: 2 }] },
    ],
  },
  {
    name: 'source rectangle stroke padding',
    steps: [
      { name: 'rect', args: [0, 0, 100, 10] },
      { name: 'stroke', args: [{ width: 4, miterLimit: 3 }] },
    ],
  },
  {
    name: 'source polygon miter cap',
    steps: [
      { name: 'poly', args: [[0, 0, 100, 0, 50, 10]] },
      { name: 'stroke', args: [{ width: 4, miterLimit: 3 }] },
    ],
  },
  {
    name: 'overlapping circle primitives',
    steps: [
      { name: 'circle', args: [20, 20, 10] },
      { name: 'circle', args: [28, 20, 10] },
      { name: 'fill', args: [{ color: 0xffffff, alpha: 0.5 }] },
    ],
  },
  {
    name: 'fill resets defaults and omitted fill retains style',
    steps: [
      { name: 'rect', args: [0, 0, 10, 10] },
      { name: 'fill', args: [{ color: 0xffffff, alpha: 0.2 }] },
      { name: 'rect', args: [20, 0, 10, 10] },
      { name: 'fill', args: [{ color: 0xff0000 }] },
      { name: 'rect', args: [40, 0, 10, 10] },
      { name: 'fill', args: [] },
    ],
  },
];
const goldens = fixtures.map((f) => {
  const n = new Pixi.Graphics();
  for (const step of f.steps) n[step.name].apply(n, step.args);
  const box = n.getLocalBounds();
  const styles = [];
  for (const instruction of n.context.instructions)
    for (const primitive of instruction.data.path.shapePath.shapePrimitives) {
      const s = instruction.data.style;
      styles.push({
        fill:
          instruction.action === 'fill'
            ? '#' + ('000000' + s.color.toString(16)).slice(-6)
            : 'transparent',
        stroke:
          instruction.action === 'stroke'
            ? '#' + ('000000' + s.color.toString(16)).slice(-6)
            : 'transparent',
        width: instruction.action === 'stroke' ? s.width : 0,
        alpha: s.alpha,
      });
    }
  return {
    name: f.name,
    steps: f.steps,
    bounds: { x: box.minX, y: box.minY, width: box.maxX - box.minX, height: box.maxY - box.minY },
    styles,
  };
});
const testFile = path.join(root, 'tests/folia-scene-graph.test.mjs'),
  test = await readFile(testFile, 'utf8'),
  start = '// BEGIN real Pixi scene goldens (generated)',
  end = '// END real Pixi scene goldens';
if (!test.includes(start) || !test.includes(end)) throw Error('Missing real Pixi oracle seam');
const tests = await format(
  test.slice(0, test.indexOf(start)) +
    start +
    '\nconst sourceGoldens=' +
    JSON.stringify(goldens) +
    ';\n' +
    end +
    test.slice(test.indexOf(end) + end.length),
  { ...(await resolveConfig(testFile)), parser: 'babel' },
);
await writeFile(testFile + '.graph-tmp', tests);
await rename(testFile + '.graph-tmp', testFile);
