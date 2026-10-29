import { resolveFoliaReference, normalizeFoliaBundle } from './folia-reference.mjs';
// Build-time only; no new application dependency. Reference modules are pinned.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { build, transform } from 'esbuild';
import { format, resolveConfig } from 'prettier';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const { values } = parseArgs({ options: { reference: { type: 'string' } } });
const reference = await resolveFoliaReference(values.reference);
const revision = 'a8da4437cf19723555bd75e4685ca20815fe5b82';
if (process.versions.unicode !== '17.0') throw new Error('Build with Node24 / Unicode17');
const output = path.join(root, 'plugins/folia-lyrics-skin/qml/styles/cadenza');
await mkdir(output, { recursive: true });
const formatting = await resolveConfig(path.join(output, 'pretext.mjs'));
const hashes = {};
async function read(relative) {
  const text = await readFile(path.join(reference, relative), 'utf8');
  hashes[relative] = createHash('sha256').update(text).digest('hex');
  return text;
}
async function emit(name, code) {
  await writeFile(path.join(output, name), await format(code, { ...formatting, parser: 'babel' }));
}
const prefix = 'src/components/visualizer/cadenza/';
for (const name of ['VisualizerCadenza.tsx', 'entry.tsx', 'tuning.ts']) await read(prefix + name);
await read('src/types.ts');
for (const [source, destination] of Object.entries({
  cadenzaEnvelopes: 'envelopes',
  cadenzaFragments: 'fragments',
  cadenzaPlacements: 'placements',
  cadenzaPreparedState: 'prepared-state',
})) {
  let code = await read(prefix + source + '.ts');
  code = code
    .replaceAll("from './cadenzaEnvelopes'", "from './envelopes.mjs'")
    .replaceAll("from './cadenzaFragments'", "from './fragments.mjs'")
    .replaceAll("from './cadenzaPlacements'", "from './placements.mjs'")
    .replaceAll("from '@chenglou/pretext'", "from './pretext.mjs'")
    .replaceAll(
      "from '../../../utils/lyrics/graphemeTiming'",
      "from '../../shared/text/graphemeTiming.mjs'",
    )
    .replaceAll("from '../../../utils/lyrics/renderHints'", "from '../../shared/renderHints.mjs'")
    .replaceAll("from '../colorMix'", "from './color.mjs'")
    .replaceAll("from '../wordColoring'", "from './word-coloring.mjs'")
    .replaceAll("from '../../../utils/fontStacks'", "from './font-stacks.mjs'");
  if (source === 'cadenzaEnvelopes') {
    const start = code.indexOf('const graphemeSegmenter =');
    const end = code.indexOf('export const clamp');
    code =
      code.slice(0, start) +
      "import {splitLyricGraphemes as splitGraphemes} from '../../shared/text/unicode.mjs';\nexport {splitGraphemes};\n" +
      code.slice(end);
  }
  // ES2016 runtime has no Array.flatMap. Preserve evaluation and order.
  code = code
    .replaceAll('ranges.flatMap(', 'flatMap(ranges, ')
    .replaceAll('lineData\n        .flatMap(', 'flatMap(lineData, ')
    .replaceAll('lineData.flatMap(', 'flatMap(lineData, ');
  if (code.includes('flatMap(')) code = "import {flatMap} from './compat.mjs';\n" + code;
  const result = await transform(code, {
    loader: 'ts',
    target: 'es2016',
    format: 'esm',
    legalComments: 'none',
  });
  await emit(
    destination + '.mjs',
    '// Generated from Folia a8da4437 (AGPL-3.0-only). See cadenza-reference.md.\n' + result.code,
  );
}
for (const [relative, name] of [
  ['src/components/visualizer/wordColoring.ts', 'word-coloring.mjs'],
  ['src/components/visualizer/colorMix.ts', 'color.mjs'],
  ['src/utils/fontStacks.ts', 'font-stacks.mjs'],
]) {
  let code = await read(relative);
  code = code.replaceAll('wordColors.flatMap<WordColorMatcher>(', 'flatMap(wordColors, ');
  if (code.includes('flatMap(')) code = "import {flatMap} from './compat.mjs';\n" + code;
  code = code.replace("from './textMeasureCache'", "from './compat.mjs'");
  const result = await transform(code, {
    loader: 'ts',
    target: 'es2016',
    format: 'esm',
    legalComments: 'none',
  });
  await emit(name, '// Generated from Folia a8da4437 (AGPL-3.0-only).\n' + result.code);
}
const properties = {
  '/\\p{Script=Arabic}/u': "propertyTest(['Arabic'])",
  '/\\p{M}/u': "propertyTest(['M'])",
  '/\\p{Nd}/u': "propertyTest(['Nd'])",
  '/^\\p{M}+$/u': "propertyTest(['M'],true)",
  '/[\\p{P}\\p{S}\\p{Co}]/u': "propertyTest(['P','S','Co'])",
  '/\\p{Emoji_Presentation}/u': "propertyTest(['Emoji_Presentation'])",
  '/[\\p{L}\\p{N}]/u': "propertyTest(['L','N'])",
  '/\\p{Cf}/u': "propertyTest(['Cf'])",
  '/[\\p{P}\\p{S}]/u': "propertyTest(['P','S'])",
  '/\\p{Emoji_Modifier}/u': "propertyTest(['Emoji_Modifier'])",
  '/[\\p{Emoji_Presentation}\\p{Extended_Pictographic}\\p{Regional_Indicator}\\uFE0F\\u20E3]/u':
    "propertyTest(['Emoji_Presentation','Extended_Pictographic','Regional_Indicator','VariationEmoji','Keycap'])",
};
const pretextPackage = JSON.parse(await read('node_modules/@chenglou/pretext/package.json'));
if (pretextPackage.version !== '0.0.9') throw new Error('Expected @chenglou/pretext0.0.9');
const pretextRoot = path.join(reference, 'node_modules/@chenglou/pretext/dist');
// onLoad runs concurrently; record the established dependency order before
// bundling so provenance does not depend on filesystem scheduling.
for (const file of [
  'layout.js',
  'measurement.js',
  'line-text.js',
  'bidi.js',
  'analysis.js',
  'line-break.js',
  'generated/bidi-data.js',
])
  await read('node_modules/@chenglou/pretext/dist/' + file);
const bundled = await build({
  entryPoints: [path.join(pretextRoot, 'layout.js')],
  bundle: true,
  write: false,
  target: 'es2016',
  format: 'esm',
  legalComments: 'none',
  external: ['./pretext-adapter.mjs', './unicode-properties.mjs'],
  plugins: [
    {
      name: 'portable-pretext',
      setup(builder) {
        builder.onLoad({ filter: /\/pretext\/dist\/.*\.js$/ }, async (args) => {
          let code = await read(path.relative(reference, args.path));
          // Qt 6.12's actual QV4 replay corrupts this round-local WeakMap lookup.
          // clearLineTextCaches still resets both declarations at every clearCache.
          code = code
            .replaceAll('sharedLineTextCaches = new WeakMap()', 'sharedLineTextCaches = new Map()')
            .replaceAll(
              'forwardStickyPrefixParts?.at(-1)',
              'forwardStickyPrefixParts?.[forwardStickyPrefixParts.length - 1]',
            )
            .replaceAll(
              'forwardStickyPrefixParts.at(-1)',
              'forwardStickyPrefixParts[forwardStickyPrefixParts.length - 1]',
            );
          if (args.path.endsWith('/analysis.js')) {
            code = code
              .replaceAll(
                "new Intl.Segmenter(undefined, { granularity: 'grapheme' })",
                'portableGraphemeSegmenter',
              )
              .replaceAll(
                "new Intl.Segmenter(segmenterLocale, { granularity: 'word' })",
                'portableWordSegmenter',
              );
            code =
              "import {portableGraphemeSegmenter,portableWordSegmenter} from './pretext-adapter.mjs';\n" +
              code;
          }
          if (args.path.endsWith('/measurement.js')) {
            const a = code.indexOf('export function getMeasureContext()');
            const b = code.indexOf('export function getSegmentMetricCache', a);
            code = code.slice(0, a) + 'export {getMeasureContext};\n' + code.slice(b);
            const c = code.indexOf('export function getEngineProfile()');
            const d = code.indexOf('export function parseFontSize', c);
            code =
              code.slice(0, c) +
              `export function getEngineProfile(){return {geckoAsciiLineBreaks:false,lineFitEpsilon:.005,carryCJKAfterClosingQuote:true,breakKeepAllAfterPunctuation:true,preferPrefixWidthsForBreakableRuns:false};}\n` +
              code.slice(d);
            const e = code.indexOf('function getEmojiCorrection(font)');
            const f = code.indexOf('function countEmojiGraphemes', e);
            code =
              code.slice(0, e) + 'function getEmojiCorrection(font){return 0;}\n' + code.slice(f);
            code = "import {getMeasureContext} from './pretext-adapter.mjs';\n" + code;
          }
          for (const [from, to] of Object.entries(properties)) code = code.replaceAll(from, to);
          if (code.includes('propertyTest('))
            code = "import {propertyTest} from './unicode-properties.mjs';\n" + code;
          if (code.includes('\\p{') || code.includes('new Intl'))
            throw new Error('Unported Unicode/Intl dependency ' + args.path);
          return { contents: code, loader: 'js' };
        });
      },
    },
  ],
});
let portablePretext = normalizeFoliaBundle(bundled.outputFiles[0].text, reference);
// These independent literal sets can precede their consumers; initialization
// remains unchanged while Qt's static used-before-declared warning disappears.
let punctuationDeclarations = '';
for (const name of ['kinsokuStart', 'leftStickyPunctuation']) {
  const start = portablePretext.indexOf('var ' + name + ' =');
  const end = portablePretext.indexOf('\n]);', start) + 5;
  if (start < 0 || end < start) throw new Error('Missing pretext punctuation set ' + name);
  punctuationDeclarations += portablePretext.slice(start, end) + '\n';
  portablePretext = portablePretext.slice(0, start) + portablePretext.slice(end);
}
portablePretext = portablePretext.replace(
  'function endsWithLineStartProhibitedText(text) {',
  punctuationDeclarations + 'function endsWithLineStartProhibitedText(text) {',
);
await emit(
  'pretext.mjs',
  '// @chenglou/pretext 0.0.9 MIT; portable Unicode17/explicit ICU/native measurement adapter.\n// Source algorithm retained. PRETEXT-LICENSE.txt; cadenza-reference.md.\n' +
    portablePretext,
);
const tables = {};
for (const [file, wanted] of [
  ['Scripts.txt', ['Arabic']],
  ['emoji-data.txt', ['Emoji_Presentation', 'Emoji_Modifier', 'Extended_Pictographic']],
]) {
  const cache = path.join(root, 'build/folia-cadenza/unicode-17.0.0');
  await mkdir(cache, { recursive: true });
  let text;
  for (const candidate of [
    path.join(cache, file),
    path.join(root, 'build/folia-text/unicode-17.0.0', file),
  ]) {
    try {
      text = await readFile(candidate, 'utf8');
      break;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  if (text === undefined) {
    const url =
      'https://www.unicode.org/Public/17.0.0/ucd/' +
      (file === 'emoji-data.txt' ? 'emoji/' : '') +
      file;
    const response = await fetch(url);
    if (!response.ok) throw new Error(url + ': ' + response.status);
    text = await response.text();
  }
  await writeFile(path.join(cache, file), text);
  hashes['unicode17/' + file] = createHash('sha256').update(text).digest('hex');
  for (const row of text.split('\n')) {
    const fields = row
      .split('#')[0]
      .trim()
      .split(';')
      .map((v) => v.trim());
    if (fields.length < 2 || !wanted.includes(fields[1])) continue;
    const ranges = fields[0].split('..').map((v) => parseInt(v, 16));
    (tables[fields[1]] ||= []).push(ranges[0], ranges[1] ?? ranges[0]);
  }
}
await emit(
  'unicode-properties-data.mjs',
  '// Unicode17.0 official UCD ranges. License: ../../shared/text/UNICODE-LICENSE.txt\nexport const ranges=' +
    JSON.stringify(tables) +
    ';\n',
);
await copyFile(
  path.join(reference, 'node_modules/@chenglou/pretext/LICENSE'),
  path.join(output, 'PRETEXT-LICENSE.txt'),
);
await writeFile(
  path.join(output, 'sources.json'),
  JSON.stringify({ revision, pretext: '0.0.9', unicode: '17.0.0', sha256: hashes }, null, 2) + '\n',
);
console.log(
  'Generated pinned Cadenza kernels and full pretext0.0.9; no application dependencies added.',
);
