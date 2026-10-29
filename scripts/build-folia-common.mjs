import { resolveFoliaReference } from './folia-reference.mjs';
// Folia AGPL-3.0-only. Extract the pinned random scene, preserving call order.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { transform } from 'esbuild';
import ts from 'typescript';
import { format, resolveConfig } from 'prettier';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reference = await resolveFoliaReference(process.argv[2]);
const revision = 'a8da4437cf19723555bd75e4685ca20815fe5b82';
const sourcePath = 'src/components/visualizer/backgrounds/common/GeometricBackground.tsx';
const source = await readFile(path.join(reference, sourcePath), 'utf8');
const cssPath = 'src/components/visualizer/backgrounds/common/GeometricBackground.css';
const css = await readFile(path.join(reference, cssPath), 'utf8');
const navigationSourcePath = 'src/utils/playbackNeighbors.ts';
const navigationSource = await readFile(path.join(reference, navigationSourcePath), 'utf8');
const shapes = source.match(
  /const shapes = useMemo<BackgroundShape\[\]>\(\(\) => \{([\s\S]*?)\n  \}, \[seed\]\);/,
);
const particles = source.match(
  /const particles = useMemo<BackgroundParticle\[\]>\(\(\) => \(([\s\S]*?)\n  \), \[seed\]\);/,
);
const scaleKey = source.slice(
  source.indexOf('const getShapeScaleKey ='),
  source.indexOf('const getShapeClipPath ='),
);
if (!shapes || !particles || !scaleKey) throw new Error('Common source boundaries changed');
const output = path.join(root, 'plugins/folia-lyrics-skin/qml/backgrounds/common');
await mkdir(output, { recursive: true });
const code = `// Generated pinned Folia geometric scene, AGPL-3.0-only.\n
${scaleKey}
export function makeShapes(random=Math.random){${shapes[1].replaceAll('Math.random()', 'random()')}}
export function makeParticles(random=Math.random){return (${particles[1].replaceAll('Math.random()', 'random()')});}
export { getShapeScaleKey };
`;
const formatting = await resolveConfig(path.join(output, 'scene.mjs'));
await writeFile(
  path.join(output, 'scene.mjs'),
  await format((await transform(code, { loader: 'ts', format: 'esm', target: 'es2016' })).code, {
    ...formatting,
    parser: 'babel',
  }),
);
await writeFile(
  path.join(output, 'source.json'),
  JSON.stringify(
    {
      revision,
      sourcePath,
      sourceSha256: createHash('sha256').update(source).digest('hex'),
      cssPath,
      navigationSourcePath,
      navigationSourceSha256: createHash('sha256').update(navigationSource).digest('hex'),
      cssSha256: createHash('sha256').update(css).digest('hex'),
      geometry:
        '15 shapes, 20 particles; original Math.random call order. seed resets the scene but is not a seeded PRNG.',
    },
    null,
    2,
  ) + '\n',
);
const qt = process.env.FOLIA_QT_BIN;
for (const name of ['vignette', 'blur', 'overlay', 'fallback']) {
  const file = path.join(output, name + '.frag');
  execFileSync(
    qt ? path.join(qt, 'qsb') : 'qsb',
    ['--glsl', '100 es,120,150', '--hlsl', '50', '--msl', '12', '-o', file + '.qsb', file],
    { stdio: 'inherit' },
  );
}

// Only the two pure manual-navigation functions are needed by the shared capsule.
const navigationTree = ts.createSourceFile(
  'neighbors.ts',
  navigationSource,
  ts.ScriptTarget.Latest,
  true,
);
const navigationDeclarations = [];
for (const statement of navigationTree.statements)
  if (ts.isVariableStatement(statement))
    for (const declaration of statement.declarationList.declarations)
      if (['nextQueueIndex', 'prevQueueIndex'].includes(declaration.name.getText(navigationTree)))
        navigationDeclarations.push(
          'export function ' +
            declaration.name.getText(navigationTree) +
            declaration.initializer.getText(navigationTree).replace(/=>\s*/, '').trim(),
        );
if (navigationDeclarations.length !== 2) throw new Error('Pinned navigation source changed');
await writeFile(
  path.join(root, 'plugins/folia-lyrics-skin/qml/shared/queueNeighbors.mjs'),
  '// Folia a8da4437 playbackNeighbors.ts pure manual-navigation rules (AGPL-3.0-only).\n' +
    (await format(
      (
        await transform(navigationDeclarations.join('\n'), {
          loader: 'ts',
          target: 'es2016',
          format: 'esm',
        })
      ).code
        .replace(/export\s*\{[^}]+\};?\s*$/, '')
        .replace('function nextQueueIndex', 'export function nextQueueIndex')
        .replace('function prevQueueIndex', 'export function prevQueueIndex'),
      { ...formatting, parser: 'babel' },
    )),
);
