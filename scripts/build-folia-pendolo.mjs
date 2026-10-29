import { resolveFoliaReference } from './folia-reference.mjs';
// Reproducible Folia source port; application runtime uses Qt/QML only.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile as writeRaw, mkdir, rename } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { transform, build } from 'esbuild';
import { format, resolveConfig } from 'prettier';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const { values } = parseArgs({ options: { reference: { type: 'string' } } });
const reference = await resolveFoliaReference(values.reference);
const revision = 'a8da4437cf19723555bd75e4685ca20815fe5b82';
const output = path.join(root, 'plugins/folia-lyrics-skin/qml/styles/pendolo');
await mkdir(output, { recursive: true });
const config = await resolveConfig(path.join(output, 'kernel.mjs'));
const sha256 = {};
async function writeFile(file, data) {
  const temp = file + '.pendolo-tmp';
  await writeRaw(temp, data);
  await rename(temp, file);
}
async function source(relative) {
  const code = await readFile(path.join(reference, relative), 'utf8');
  sha256[relative] = createHash('sha256').update(code).digest('hex');
  return code;
}
async function emit(name, code) {
  const js = await transform(code, {
    loader: 'ts',
    target: 'es2016',
    format: 'esm',
    legalComments: 'none',
  });
  await writeFile(
    path.join(output, name),
    await format(
      '// Derived from Folia a8da4437 (AGPL-3.0-only). See pendolo-reference.md.\n' + js.code,
      { ...config, parser: 'babel' },
    ),
  );
}
const prefix = 'src/components/visualizer/pendolo/';
const names = {
  pendoloGeometry: 'geometry',
  pendoloTimeline: 'timeline',
  pendoloMotionProfile: 'motion-profile',
  pendoloClockworkMotion: 'clockwork-motion',
  pendoloClockworkScene: 'clockwork-scene',
  pendoloClockworkMeshes: 'clockwork-meshes',
  pendoloTextLayout: 'text-layout',
  pendoloColorRuns: 'color-runs',
  pendoloSubtitleTracks: 'subtitle-tracks',
};
for (const [original, name] of Object.entries(names)) {
  let code = await source(prefix + original + '.ts');
  for (const [from, to] of Object.entries(names))
    code = code.replaceAll("from './" + from + "'", "from './" + to + ".mjs'");
  code = code
    .replaceAll("from '../colorMix'", "from '../cadenza/color.mjs'")
    .replaceAll("from '@chenglou/pretext'", "from './pretext.mjs'")
    .replaceAll(
      "from '../../../utils/lyrics/graphemeTiming'",
      "from '../../shared/text/graphemeTiming.mjs'",
    )
    .replaceAll("from '../../../utils/lyrics/alternateText'", "from './alternate-text.mjs'")
    .replaceAll("from '../../../utils/lyrics/subtitleTrackStyle'", "from './subtitle-style.mjs'");
  if (original === 'pendoloTimeline')
    code = code.replace('lines.at(-1)', 'lines[lines.length - 1]');
  if (original === 'pendoloSubtitleTracks')
    code = code
      .replace('/[\\p{L}\\p{N}]/u', "propertyTest(['L','N'])")
      .replace(
        'const READABLE_TEXT_PATTERN =',
        "import {propertyTest} from '../cadenza/unicode-properties.mjs';\nconst READABLE_TEXT_PATTERN =",
      );
  if (original === 'pendoloClockworkMeshes')
    code = code.replace(
      'parts.push({ getOrigin, getRotation });',
      'parts.push({ getOrigin, getRotation, transformKey });',
    );
  await emit(name + '.mjs', code);
  if (original === 'pendoloClockworkMeshes') {
    const start = code.indexOf('class PendoloMeshBuilder'),
      end = code.indexOf('/** Parses CSS color strings', start);
    if (start < 0 || end < start) throw new Error('Mesh builder seam changed');
    await emit(
      'clockwork-vectors.mjs',
      code.slice(0, start) +
        "import {VectorBuilder as PendoloMeshBuilder} from './vector-builder.mjs';\n" +
        code.slice(end),
    );
  }
}
for (const [file, name] of [
  ['src/utils/lyrics/alternateText.ts', 'alternate-text.mjs'],
  ['src/utils/lyrics/subtitleTrackStyle.ts', 'subtitle-style.mjs'],
])
  await emit(name, await source(file));
for (const file of [
  'VisualizerPendolo.tsx',
  'PendoloClockworkCanvas.tsx',
  'PendoloActiveLyricSweep.tsx',
  'PendoloRotatingLine.tsx',
  'pendoloClockworkDraw2d.ts',
  'pendoloClockworkWebGL.ts',
  'PendoloSettingsPanel.tsx',
  'tuning.ts',
  'entry.tsx',
])
  await source(prefix + file);
await source('src/components/app/presentation/buildVisualizerTheme.ts');
await source('src/utils/fontStacks.ts');
const types = await source('src/types.ts');
const defaults = types.match(/export const DEFAULT_PENDOLO_TUNING[^=]*= (\{[\s\S]*?\n\});/);
if (!defaults) throw new Error('Missing Pendolo defaults');
await emit('defaults.mjs', 'export const defaults=' + defaults[1] + ';');
const provenance = JSON.parse(await readFile(path.join(output, '../cadenza/sources.json'), 'utf8'));
if (
  provenance.revision !== revision ||
  provenance.pretext !== '0.0.9' ||
  provenance.unicode !== '17.0.0'
)
  throw new Error('Portable pretext provenance mismatch');
let pretext = await readFile(path.join(output, '../cadenza/pretext.mjs'), 'utf8');
pretext = pretext
  .replaceAll("'./pretext-adapter.mjs'", "'./native-measure.mjs'")
  .replaceAll("'./unicode-properties.mjs'", "'../cadenza/unicode-properties.mjs'");
// Qt 6.12 real-message replay crashes inside this round cache WeakMap.get.
// Keep its prepared keys strongly until the unchanged clearCache boundary.
pretext = pretext.replaceAll(
  'sharedLineTextCaches = /* @__PURE__ */ new WeakMap()',
  'sharedLineTextCaches = /* @__PURE__ */ new Map()',
);
pretext = pretext.replace(
  'forwardStickyPrefixParts.at(-1)',
  'forwardStickyPrefixParts[forwardStickyPrefixParts.length - 1]',
);
const declaration = pretext.match(
  /function endsWithLineStartProhibitedText\(text\) \{[\s\S]*?\n\}/,
);
if (!declaration) throw new Error('Missing line-start punctuation seam');
pretext = pretext
  .replace(declaration[0] + '\n', '')
  .replace(
    'function isLeftStickyPunctuationSegment(segment) {',
    declaration[0] + '\nfunction isLeftStickyPunctuationSegment(segment) {',
  );
await writeFile(
  path.join(output, 'pretext.mjs'),
  await format(pretext, { ...config, parser: 'babel' }),
);
await writeFile(
  path.join(output, 'PRETEXT-LICENSE.txt'),
  await readFile(path.join(output, '../cadenza/PRETEXT-LICENSE.txt')),
);
await writeFile(
  path.join(output, 'sources.json'),
  JSON.stringify({ revision, pretext: '0.0.9', unicode: '17.0.0', sha256 }, null, 2) + '\n',
);
const qt =
  process.env.FOLIA_QT_BIN ||
  path.resolve(root, '../EchoMusicNext/build/qt-official/6.12.0/macos/bin');
for (const name of ['gaussian', 'shadow', 'sweep', 'watchface', 'gradient', 'chorus']) {
  const shader = path.join(output, name + '.frag'),
    temp = shader + '.qsb.pendolo-tmp';
  execFileSync(
    path.join(qt, 'qsb'),
    ['--glsl', '150,300es', '--hlsl', '50', '--msl', '12', '-o', temp, shader],
    { stdio: 'inherit' },
  );
  await rename(temp, shader + '.qsb');
}

// Freeze the independent original-source oracle inside the Node test, so CI needs no reference checkout.
const oracleNames = [
  'pendoloGeometry',
  'pendoloTimeline',
  'pendoloMotionProfile',
  'pendoloClockworkMotion',
  'pendoloClockworkMeshes',
  'pendoloClockworkDraw2d',
  'pendoloSubtitleTracks',
];
const oracle = await build({
  stdin: {
    contents: oracleNames
      .map(
        (name) =>
          'export * as ' + name + ' from ' + JSON.stringify('./' + prefix + name + '.ts') + ';',
      )
      .concat(
        "export * as visualizerTheme from './src/components/app/presentation/buildVisualizerTheme.ts';",
        "export * as fontStacks from './src/utils/fontStacks.ts';",
      )
      .join('\n'),
    resolveDir: reference,
  },
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
  target: 'es2016',
  minify: true,
  legalComments: 'none',
  logLevel: 'silent',
});
const testFile = path.join(root, 'tests/folia-pendolo.test.mjs'),
  testCode = await readFile(testFile, 'utf8');
const start = '// BEGIN Folia a8da4437 source oracle (generated)',
  end = '// END Folia source oracle';
if (!testCode.includes(start) || !testCode.includes(end))
  throw new Error('Missing source oracle markers');
const oracleBlock =
  start + '\nconst sourceOracleCode = ' + JSON.stringify(oracle.outputFiles[0].text) + ';\n' + end;
await writeFile(
  testFile,
  await format(
    testCode.slice(0, testCode.indexOf(start)) +
      oracleBlock +
      testCode.slice(testCode.indexOf(end) + end.length),
    { ...(await resolveConfig(testFile)), parser: 'babel' },
  ),
);
