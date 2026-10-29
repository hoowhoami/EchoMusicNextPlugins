import { resolveFoliaReference } from './folia-reference.mjs';
// Build-time only. Generated runtime modules contain no Node/Intl dependency.
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { transform } from 'esbuild';
import { format, resolveConfig } from 'prettier';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const { values } = parseArgs({
  options: { reference: { type: 'string' }, 'unicode-only': { type: 'boolean' } },
});
const reference = values['unicode-only']
  ? undefined
  : await resolveFoliaReference(values.reference);
const version = '17.0.0';
if (process.versions.unicode !== '17.0')
  throw new Error(
    `Use Node 24 with Unicode 17; found Node ${process.version}, Unicode ${process.versions.unicode}`,
  );
const output = path.join(root, 'plugins/folia-lyrics-skin/qml/shared/text');
const formatting = await resolveConfig(path.join(output, 'unicode.mjs'));
async function writeRuntime(name, code) {
  await writeFile(path.join(output, name), await format(code, { ...formatting, parser: 'babel' }));
}
const cache = path.join(root, 'build/folia-text/unicode-' + version);
await mkdir(cache, { recursive: true });
await mkdir(output, { recursive: true });
const sources = {
  'UnicodeData.txt': `https://www.unicode.org/Public/${version}/ucd/UnicodeData.txt`,
  'Scripts.txt': `https://www.unicode.org/Public/${version}/ucd/Scripts.txt`,
  'GraphemeBreakProperty.txt': `https://www.unicode.org/Public/${version}/ucd/auxiliary/GraphemeBreakProperty.txt`,
  'GraphemeBreakTest.txt': `https://www.unicode.org/Public/${version}/ucd/auxiliary/GraphemeBreakTest.txt`,
  'DerivedCoreProperties.txt': `https://www.unicode.org/Public/${version}/ucd/DerivedCoreProperties.txt`,
  'emoji-data.txt': `https://www.unicode.org/Public/${version}/ucd/emoji/emoji-data.txt`,
  'LICENSE.txt': 'https://www.unicode.org/license.txt',
};
// Unicode 17.0.0 data and the accompanying Unicode License V3 snapshot already
// distributed with this plugin. The official licence URL is not versioned, so
// restore a missing licence cache from that checked-in snapshot instead.
const expectedHashes = {
  'UnicodeData.txt': '2e1efc1dcb59c575eedf5ccae60f95229f706ee6d031835247d843c11d96470c',
  'Scripts.txt': '9f5e50d3abaee7d6ce09480f325c706f485ae3240912527e651954d2d6b035bf',
  'GraphemeBreakProperty.txt': 'd6b51d1d2ae5c33b451b7ed994b48f1f4dc62b2272a5831e7fd418514a6bae89',
  'GraphemeBreakTest.txt': 'e2d134d2c52919bace503ebb6a551c1855fe1a1faec18478c78fff254a1793ec',
  'DerivedCoreProperties.txt': '24c7fed1195c482faaefd5c1e7eb821c5ee1fb6de07ecdbaa64b56a99da22c08',
  'emoji-data.txt': '2cb2bb9455cda83e8481541ecf5b6dfda66a3bb89efa3fa7c5297eccf607b72b',
  'LICENSE.txt': 'e7a93b009565cfce55919a381437ac4db883e9da2126fa28b91d12732bc53d96',
};
const data = {};
const hashes = {};
for (const [file, url] of Object.entries(sources)) {
  const destination = path.join(cache, file);
  let bytes;
  let downloaded = false;
  try {
    bytes = await readFile(destination);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    // A corresponding source archive carries the exact Unicode input bytes.
    // A pinned Git checkout can still use the fixed official downloads below.
    if (reference) {
      try {
        bytes = await readFile(path.join(reference, 'dependencies/unicode-17.0.0', file));
      } catch (sourceError) {
        if (sourceError.code !== 'ENOENT') throw sourceError;
      }
    }
    if (!bytes && file === 'LICENSE.txt')
      bytes = await readFile(path.join(output, 'UNICODE-LICENSE.txt'));
    else if (!bytes) {
      const result = await fetch(url);
      if (!result.ok) throw new Error(`${url}: ${result.status}`);
      bytes = Buffer.from(await result.arrayBuffer());
    }
    downloaded = true;
  }
  hashes[file] = createHash('sha256').update(bytes).digest('hex');
  if (hashes[file] !== expectedHashes[file])
    throw new Error(
      `Unicode ${version} ${file}: SHA-256 mismatch; expected ${expectedHashes[file]}, found ${hashes[file]}`,
    );
  if (downloaded) await writeFile(destination, bytes);
  data[file] = bytes.toString('utf8');
}
function merge(ranges) {
  const sorted = ranges.sort((a, b) => a[0] - b[0]);
  const result = [];
  for (const [from, to] of sorted) {
    if (result.length && from <= result[result.length - 1] + 1)
      result[result.length - 1] = Math.max(result[result.length - 1], to);
    else result.push(from, to);
  }
  return result;
}
function parseProperties(source, select) {
  const groups = {};
  for (const row of source.split('\n')) {
    const fields = row
      .split('#')[0]
      .trim()
      .split(';')
      .map((field) => field.trim());
    if (!fields[0] || fields.length < 2) continue;
    const key = select(fields);
    if (!key) continue;
    const limits = fields[0].split('..').map((value) => parseInt(value, 16));
    (groups[key] ||= []).push([limits[0], limits[1] ?? limits[0]]);
  }
  return Object.fromEntries(Object.entries(groups).map(([key, ranges]) => [key, merge(ranges)]));
}
const categories = {};
let first = null;
for (const row of data['UnicodeData.txt'].split('\n')) {
  if (!row) continue;
  const [code, name, category] = row.split(';');
  const cp = parseInt(code, 16);
  if (name.endsWith(', First>')) {
    first = cp;
    continue;
  }
  (categories[category] ||= []).push([name.endsWith(', Last>') ? first : cp, cp]);
  first = null;
}
const tables = {
  categories: Object.fromEntries(
    Object.entries(categories).map(([key, ranges]) => [key, merge(ranges)]),
  ),
  scripts: parseProperties(data['Scripts.txt'], (fields) =>
    ['Han', 'Hiragana', 'Katakana', 'Hangul', 'Latin'].includes(fields[1]) ? fields[1] : null,
  ),
  grapheme: parseProperties(data['GraphemeBreakProperty.txt'], (fields) =>
    ['LV', 'LVT'].includes(fields[1]) ? null : fields[1],
  ),
  conjunct: parseProperties(data['DerivedCoreProperties.txt'], (fields) =>
    fields[1] === 'InCB' ? fields[2] : null,
  ),
  emoji: parseProperties(data['emoji-data.txt'], (fields) =>
    fields[1] === 'Extended_Pictographic' ? fields[1] : null,
  ),
};
await writeRuntime(
  'unicode-data.mjs',
  `// Generated by scripts/build-folia-text.mjs from Unicode ${version}.\n// Unicode data license: UNICODE-LICENSE.txt. Do not edit.\nexport const UNICODE_VERSION = ${JSON.stringify(version)};\nexport const TABLES = ${JSON.stringify(tables)};\n`,
);
await writeFile(
  path.join(output, 'unicode-sources.json'),
  JSON.stringify({ version, sources, sha256: hashes }, null, 2) + '\n',
);
await copyFile(path.join(cache, 'LICENSE.txt'), path.join(output, 'UNICODE-LICENSE.txt'));
console.log(
  `Unicode ${version}: ${Buffer.byteLength(JSON.stringify(tables))} bytes of range data; official tests cached in ${cache}`,
);
if (values['unicode-only']) process.exit(0);
// Folia reference modules are prepared below; runtime code is versioned with the plugin.
const pinnedRevision = 'a8da4437cf19723555bd75e4685ca20815fe5b82';
async function source(relative) {
  return readFile(path.join(reference, relative), 'utf8');
}
function replaceOnce(text, from, to) {
  if (!text.includes(from)) throw new Error('Pinned Folia source changed: ' + from.slice(0, 90));
  return text.replace(from, to);
}
async function emit(name, text) {
  if (text.includes('.flatMap(')) {
    for (const object of ['word.syllables', 'boundaries', 'units'])
      text = text.replaceAll(object + '.flatMap(', 'flatMap(' + object + ', ');
    text = "import { flatMap } from './compat.mjs';\n" + text;
  }
  if (text.includes('text.trimEnd()')) {
    text = text.replaceAll('text.trimEnd()', 'trimEnd(text)');
    text = "import { trimEnd } from './compat.mjs';\n" + text;
  }
  const result = await transform(text, {
    loader: 'ts',
    target: 'es2016',
    format: 'esm',
    legalComments: 'inline',
  });
  await writeRuntime(
    name,
    '// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/text-reference.md.\n' +
      result.code,
  );
}
const parserCore = await source('src/utils/lyrics/parserCore.ts');
const fallbackStart = parserCore.indexOf('const buildTimedWords =');
const fallbackEnd = parserCore.indexOf('\nexport const isInterludeLine', fallbackStart);
if (fallbackStart < 0 || fallbackEnd < 0) throw new Error('Pinned line timing source changed');
await emit('../lineTiming.mjs', 'export ' + parserCore.slice(fallbackStart, fallbackEnd));
let timing = await source('src/utils/lyrics/graphemeTiming.ts');
timing = timing.replace(/const graphemeSegmenter =[\s\S]*?(?=const buildEvenGraphemeTimings)/, '');
timing =
  "import { splitLyricGraphemes } from './unicode.mjs';\nexport { splitLyricGraphemes };\n" +
  timing;
await emit('graphemeTiming.mjs', timing);
let words = await source('src/utils/lyrics/wordSegmentation.ts');
words = replaceOnce(words, "from './graphemeTiming'", "from './graphemeTiming.mjs'");
words = replaceOnce(
  words,
  'const PUNCTUATION_ONLY = /^[\\s\\p{P}\\p{S}]+$/u;',
  "import { isPunctuationOnly } from './unicode.mjs';",
);
words = replaceOnce(words, '!PUNCTUATION_ONLY.test(text)', '!isPunctuationOnly(text)');
const segmentStart = words.indexOf('export const segmentTextWords =');
const segmentEnd = words.indexOf('\n/**', segmentStart);
words =
  words.slice(0, segmentStart) +
  `export const segmentTextWords = (text: string): LyricWordSegment[] => {
    // This is Folia's explicit no-Segmenter grapheme fallback. It is not ICU word segmentation.
    return text ? segmentsFromBoundaries(splitLyricGraphemes(text)) : [];
};
` +
  words.slice(segmentEnd);
words = replaceOnce(
  words,
  'const EDGE_WHITESPACE = /^(\\s*)(.*?)(\\s*)$/su;',
  'const EDGE_WHITESPACE = /^(\\s*)([\\s\\S]*?)(\\s*)$/u;',
);
await emit('wordSegmentation.mjs', words);
let cjk = await source('src/utils/lyrics/cjkSemanticLayout.ts');
cjk = replaceOnce(cjk, "from './wordSegmentation'", "from './wordSegmentation.mjs'");
cjk = replaceOnce(
  cjk,
  'const TRAILING_WORD_CHAR_REGEX = /[\\p{L}\\p{N}]$/u;',
  "import { endsWithLetterOrNumber, hasInlineContraction as hasInlineContractionText } from './unicode.mjs';",
);
cjk = replaceOnce(
  cjk,
  "const INLINE_CONTRACTION_REGEX = /[\\p{L}\\p{N}]+['’](s|t|m|d|ll|re|ve|em)/iu;",
  '',
);
cjk = replaceOnce(
  cjk,
  'TRAILING_WORD_CHAR_REGEX.test(text.trimEnd())',
  'endsWithLetterOrNumber(text.trimEnd())',
);
cjk = replaceOnce(
  cjk,
  'INLINE_CONTRACTION_REGEX.test(unit.text)',
  'hasInlineContractionText(unit.text)',
);
await emit('cjkSemanticLayout.mjs', cjk);
let segmenter = await source('src/utils/lyrics/icuFolia/segmenter.ts');
segmenter = replaceOnce(segmenter, "from './lexicon'", "from './lexicon.mjs'");
segmenter = segmenter.replace(
  /const CJ_PIECE =[\s\S]*?(?=\/\/ ASCII hyphen-minus)/,
  "import { isCjPiece, hasKana, isAlphabeticWord } from './unicode.mjs';\n",
);
segmenter = segmenter.replace(
  /\/\*\* A word written in an alphabet[\s\S]*?(?=\/\*\* An engine's answer)/,
  `const icuWordPieces = (text: string, pieces?: string[]): string[] => {
    if (!Array.isArray(pieces) || pieces.some(piece => typeof piece !== 'string') || pieces.join('') !== text) {
        throw new Error('Exact ICU word pieces are required; Qt/UAX29 words are not interchangeable with Intl.Segmenter');
    }
    return pieces;
};

`,
);
segmenter = replaceOnce(segmenter, 'KANA.test(run)', 'hasKana(run)');
segmenter = segmenter.replaceAll('CJ_PIECE.test(pieces[index])', 'isCjPiece(pieces[index])');
segmenter = replaceOnce(
  segmenter,
  'engines: IcuFoliaEngines | null): string[] => {\n    if (!text)',
  'engines: IcuFoliaEngines | null, basePieces?: string[]): string[] => {\n    if (!text)',
);
segmenter = replaceOnce(segmenter, 'icuWordPieces(text)', 'icuWordPieces(text, basePieces)');
await emit('icuFolia.mjs', segmenter);
await emit('lexicon.mjs', await source('src/utils/lyrics/icuFolia/lexicon.ts'));
await emit('jiebaLexicon.mjs', await source('src/utils/lyrics/icuFolia/jiebaLexicon.ts'));
let jieba = await source('src/utils/lyrics/icuFolia/jieba.ts');
jieba =
  "import { codePoints } from './codepoints.mjs';\n" +
  jieba.replace(/Array\.from\((chars|block\.text|word|text|piece\.text)\)/g, 'codePoints($1)');
jieba = replaceOnce(
  jieba,
  'const decodeBase64 = (base64: string): Uint8Array => {',
  "import { decodeBase64 as portableDecodeBase64 } from './base64.mjs';\nconst decodeBase64 = (base64: string): Uint8Array => {",
);
jieba = jieba.replace(
  /    const binary = atob\(base64\);[\s\S]*?    return bytes;/,
  '    return portableDecodeBase64(base64);',
);
await emit('jieba.mjs', jieba);
const { icuFoliaDataPlugin } = await import(
  pathToFileURL(path.join(reference, 'dev/icuFolia/icuFoliaDataPlugin.mjs'))
);
const plugin = icuFoliaDataPlugin();
const pluginContext = { addWatchFile() {} };
for (const kind of ['dict', 'hmm']) {
  const content = plugin.load.call(pluginContext, '\0virtual:icu-folia-' + kind);
  await writeRuntime(
    'jieba-' + kind + '.mjs',
    '// Generated from Folia pinned jieba/OpenCC data. See text-reference.md and bundled licenses.\n' +
      content +
      '\n',
  );
}
const parser = await source('node_modules/budoux/module/parser.js');
// Array.flatMap is a library method, not an ES2016 syntax transform.
const portableParser = parser.replace(
  '.flatMap((group) => [...group.values()])',
  '.reduce((all, group) => all.concat([...group.values()]), [])',
);
await emit('budoux-parser.mjs', portableParser);
await writeRuntime('budoux-ja.mjs', await source('node_modules/budoux/module/data/models/ja.js'));
await copyFile(
  path.join(reference, 'dev/icuFolia/jieba/LICENSE'),
  path.join(output, 'JIEBA-LICENSE.txt'),
);
await copyFile(
  path.join(reference, 'node_modules/opencc-js/LICENSE'),
  path.join(output, 'OPENCC-JS-LICENSE.txt'),
);
await copyFile(
  path.join(reference, 'node_modules/opencc-js/THIRD_PARTY_LICENSES.md'),
  path.join(output, 'OPENCC-THIRD-PARTY-LICENSES.txt'),
);
await copyFile(
  path.join(reference, 'node_modules/opencc-js/LICENSES/Apache-2.0.txt'),
  path.join(output, 'OPENCC-DATA-LICENSE.txt'),
);
console.log(
  'Prepared Folia grapheme timing, saved segments, CJK layout, jieba, BudouX and explicit ICU-piece pipeline.',
);

const corpusSource = await transform(await source('test/unit/lyrics/icuFolia/corpus.ts'), {
  loader: 'ts',
  target: 'es2016',
  format: 'esm',
});
const corpus = await import(
  'data:text/javascript;base64,' + Buffer.from(corpusSource.code).toString('base64')
);
await writeFile(
  path.join(root, 'build/folia-text/folia-corpus.json'),
  JSON.stringify({ GOLDEN: corpus.GOLDEN, KNOWN_GAPS: corpus.KNOWN_GAPS }, null, 2) + '\n',
);
const graphemeCases = [];
for (const row of data['GraphemeBreakTest.txt'].split('\n')) {
  const body = row.split('#')[0].trim();
  if (!body) continue;
  let text = '';
  const offsets = [];
  for (const token of body.split(/\s+/)) {
    if (token === '÷') offsets.push(text.length);
    else if (token !== '×') text += String.fromCodePoint(parseInt(token, 16));
  }
  graphemeCases.push({ text, offsets });
}
const wordSegmenter = new Intl.Segmenter(undefined, { granularity: 'word' });
const wordCases = Object.values(corpus.GOLDEN)
  .flat()
  .concat(corpus.KNOWN_GAPS.map((item) => ({ text: item.text, expected: item.current })))
  .map((item) => ({
    text: item.text,
    expected: item.expected,
    pieces: Array.from(wordSegmenter.segment(item.text), (part) => ({
      segment: part.segment,
      index: part.index,
      isWordLike: part.isWordLike,
    })),
  }));
await writeFile(
  path.join(root, 'build/folia-text/qml-fixtures.mjs'),
  `export const graphemeCases = ${JSON.stringify(graphemeCases)};\nexport const wordCases = ${JSON.stringify(wordCases)};\n`,
);

const budouxLicenseCache = path.join(root, 'build/folia-text/BUDOUX-LICENSE.txt');
let budouxLicense;
try {
  budouxLicense = await readFile(budouxLicenseCache);
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  budouxLicense = await readFile(path.join(output, 'BUDOUX-LICENSE.txt'));
}
if (
  createHash('sha256').update(budouxLicense).digest('hex') !==
  'cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30'
)
  throw new Error('Bundled BudouX Apache-2.0 license SHA-256 mismatch');
await writeFile(budouxLicenseCache, budouxLicense);
await writeFile(path.join(output, 'BUDOUX-LICENSE.txt'), budouxLicense);
await writeFile(
  path.join(output, 'BUDOUX-NOTICE.txt'),
  'BudouX 0.9.3\nCopyright 2021 Google LLC\nhttps://github.com/google/budoux\nApache-2.0. Parser and Japanese model only; no HTML processor or other language models are included.\n',
);
