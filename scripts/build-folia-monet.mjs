import { resolveFoliaReference } from './folia-reference.mjs';
// Build-time only. Source algorithms pinned to Folia; no application dependency.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { build, transform } from 'esbuild';
import { format, resolveConfig } from 'prettier';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const { values } = parseArgs({
  options: { reference: { type: 'string' }, 'qt-bin': { type: 'string' } },
});
const reference = await resolveFoliaReference(values.reference);
const revision = 'a8da4437cf19723555bd75e4685ca20815fe5b82';
if (process.versions.unicode !== '17.0') throw new Error('Build with Node24 / Unicode17');
const output = path.join(root, 'plugins/folia-lyrics-skin/qml/styles/monet');
await mkdir(output, { recursive: true });
const formatting = await resolveConfig(path.join(output, 'model.mjs'));
const sha256 = {};
async function source(relative) {
  const code = await readFile(path.join(reference, relative), 'utf8');
  sha256[relative] = createHash('sha256').update(code).digest('hex');
  return code;
}
async function emit(name, code, loader = 'ts') {
  const result = await transform(code, {
    loader,
    target: 'es2016',
    format: 'esm',
    legalComments: 'none',
  });
  const notice =
    name === 'pretext.mjs'
      ? '// @chenglou/pretext0.0.9 MIT; portable Unicode17/native ICU/measurement adapter. PRETEXT-LICENSE.txt.\n'
      : name === 'icons.mjs'
        ? '// Lucide1.48.0 ISC vector data; LUCIDE-LICENSE.txt.\n'
        : '// Derived from Folia a8da4437 (AGPL-3.0-only). See monet-reference.md.\n';
  await writeFile(
    path.join(output, name),
    await format(notice + result.code, { ...formatting, parser: 'babel' }),
  );
}
const prefix = 'src/components/visualizer/monet/';
for (const [original, target] of Object.entries({
  monetLyricsModel: 'model',
  monetRailLayout: 'rail-layout',
  monetLyricMotion: 'lyric-motion',
  monetRailMasks: 'rail-masks',
  monetSongHandoff: 'song-handoff',
  monetPortraitCrossfade: 'portrait-crossfade',
})) {
  let code = await source(prefix + original + '.ts');
  for (const [from, to] of Object.entries({
    monetLyricsModel: 'model',
    monetLyricMotion: 'lyric-motion',
  }))
    code = code.replaceAll("from './" + from + "'", "from './" + to + ".mjs'");
  code = code
    .replaceAll("from '@chenglou/pretext'", "from './pretext.mjs'")
    .replaceAll("from '@chenglou/pretext/rich-inline'", "from './pretext.mjs'")
    .replaceAll("from '../../../utils/lyrics/alternateText'", "from './alternate-text.mjs'")
    .replaceAll("from '../../../utils/lyrics/subtitleTrackStyle'", "from './subtitle-style.mjs'")
    .replaceAll(
      "from '../../../utils/lyrics/graphemeTiming'",
      "from '../../shared/text/graphemeTiming.mjs'",
    )
    .replaceAll("from '../../../utils/lyrics/renderHints'", "from '../../shared/renderHints.mjs'")
    .replaceAll("from '../textMeasureCache'", "from './text-cache.mjs'")
    .replaceAll("from '../colorMix'", "from '../cadenza/color.mjs'")
    .replaceAll("from '../wordColoring'", "from '../cadenza/word-coloring.mjs'");
  if (original === 'monetLyricsModel') {
    const a = code.indexOf('const graphemeSegmenter ='),
      b = code.indexOf('export {', a);
    code =
      code.slice(0, a) +
      "import {splitLyricGraphemes} from '../../shared/text/unicode.mjs';\nimport {propertyTest} from '../cadenza/unicode-properties.mjs';\nimport {getMeasureContext} from './native-measure.mjs';\nlet viewportWidth=1280;\nexport function configureViewport(width:number){viewportWidth=width>0?width:1280;}\n" +
      code.slice(b);
    code = code.replace(
      "typeof window !== 'undefined' ? window.innerWidth : VIEWPORT_WIDTH_FALLBACK_PX",
      'viewportWidth',
    );
    code = code
      .replace(
        "const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : VIEWPORT_WIDTH_FALLBACK_PX;",
        'const currentViewportWidth=viewportWidth;',
      )
      .replace('viewportWidth * (preferredVw / 100)', 'currentViewportWidth * (preferredVw / 100)');
    const c = code.indexOf('export const splitMonetGraphemes ='),
      d = code.indexOf('/**', c);
    code =
      code.slice(0, c) +
      'export const splitMonetGraphemes=splitLyricGraphemes;\n\n' +
      code.slice(d);
    const e = code.indexOf('const getMonetVerticalMeasureContext ='),
      f = code.indexOf('/**', e);
    code =
      code.slice(0, e) +
      'const getMonetVerticalMeasureContext=getMeasureContext;\n\n' +
      code.slice(f);
    code = code.replace('/[\\p{L}\\p{N}]/u.test(text)', "propertyTest(['L','N']).test(text)");
  }
  code = code.replaceAll('offsets.at(-1)', 'offsets[offsets.length-1]');
  await emit(target + '.mjs', code);
}
for (const [relative, target] of [
  ['src/utils/lyrics/alternateText.ts', 'alternate-text.mjs'],
  ['src/utils/lyrics/subtitleTrackStyle.ts', 'subtitle-style.mjs'],
  ['src/components/visualizer/textMeasureCache.ts', 'text-cache.mjs'],
])
  await emit(target, await source(relative));
let audio = await source(prefix + 'AudioOverlay.tsx');
let audioHelpers = audio.slice(
  audio.indexOf('const BAR_COUNT ='),
  audio.indexOf('const AudioOverlay:'),
);
for (const name of [
  'buildSpectrumAnchors',
  'sampleSpectrumProfile',
  'sampleRawSpectrumProfile',
  'drawStaticBars',
])
  audioHelpers = audioHelpers.replace('const ' + name + ' =', 'export const ' + name + ' =');
let draw = audio.slice(
  audio.indexOf('        const draw = () => {') + '        const draw = () => {'.length,
  audio.indexOf('        const handleResize ='),
);
draw = draw.slice(0, draw.lastIndexOf('        };'));
draw = draw
  .replace('            const width = canvasWidth;\n            const height = canvasHeight;', '')
  .replace(
    /            const bands = \[[\s\S]*?            const hasRawSpectrum =/,
    '            const hasRawSpectrum =',
  )
  .replace('audioPower.get() / 255', 'audioPower')
  .replaceAll('performance.now()', 'now');
const gradients = audio
  .slice(audio.indexOf('        const resolveGradients ='), audio.indexOf('        const draw ='))
  .replace('        const resolveGradients =', 'const resolveGradients =');
await emit(
  'audio.mjs',
  "import {colorWithAlpha} from '../cadenza/color.mjs';\n" +
    audioHelpers +
    '\nexport function drawAudioFrame(context,width,height,theme,mode,audioPower,bands,rawSpectrum,now){\nlet gradientSize="",inkGradient=null,areaGradient=null;\n' +
    gradients +
    draw +
    '\n}',
);
const floating = await source(prefix + 'MonetFloatingDecor.tsx');
await emit(
  'decor.mjs',
  'export ' +
    floating
      .slice(
        floating.indexOf('const PARTICLE_COUNT'),
        floating.indexOf('const MonetFloatingDecor:'),
      )
      .replace('const buildParticles', 'export const buildParticles'),
);
// The complete pretext layout and rich-inline module share one portable measurement cache.
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
const pretextPackage = JSON.parse(await source('node_modules/@chenglou/pretext/package.json'));
for (const file of [
  'rich-inline.js',
  'layout.js',
  'line-text.js',
  'measurement.js',
  'analysis.js',
  'bidi.js',
  'line-break.js',
  'generated/bidi-data.js',
])
  await source('node_modules/@chenglou/pretext/dist/' + file);
if (pretextPackage.version !== '0.0.9') throw new Error('pretext0.0.9 required');
const bundled = await build({
  stdin: {
    contents: "export * from './layout.js';export * from './rich-inline.js';",
    resolveDir: path.join(reference, 'node_modules/@chenglou/pretext/dist'),
  },
  bundle: true,
  write: false,
  target: 'es2016',
  format: 'esm',
  legalComments: 'none',
  external: ['./native-measure.mjs', '../cadenza/unicode-properties.mjs'],
  plugins: [
    {
      name: 'portable-pretext',
      setup(builder) {
        builder.onLoad({ filter: /\/pretext\/dist\/.*\.js$/ }, async (args) => {
          let code = await source(path.relative(reference, args.path));
          if (args.path.endsWith('/analysis.js'))
            code =
              "import {portableGraphemeSegmenter,portableWordSegmenter} from './native-measure.mjs';\n" +
              code
                .replaceAll(
                  "new Intl.Segmenter(undefined, { granularity: 'grapheme' })",
                  'portableGraphemeSegmenter',
                )
                .replaceAll(
                  "new Intl.Segmenter(segmenterLocale, { granularity: 'word' })",
                  'portableWordSegmenter',
                );
          if (args.path.endsWith('/measurement.js')) {
            let a = code.indexOf('export function getMeasureContext()'),
              b = code.indexOf('export function getSegmentMetricCache', a);
            code = code.slice(0, a) + 'export {getMeasureContext};\n' + code.slice(b);
            a = code.indexOf('export function getEngineProfile()');
            b = code.indexOf('export function parseFontSize', a);
            code =
              code.slice(0, a) +
              'export function getEngineProfile(){return {geckoAsciiLineBreaks:false,lineFitEpsilon:.005,carryCJKAfterClosingQuote:true,breakKeepAllAfterPunctuation:true,preferPrefixWidthsForBreakableRuns:false};}\n' +
              code.slice(b);
            a = code.indexOf('function getEmojiCorrection(font)');
            b = code.indexOf('function countEmojiGraphemes', a);
            code =
              code.slice(0, a) + 'function getEmojiCorrection(font){return 0;}\n' + code.slice(b);
            code = "import {getMeasureContext} from './native-measure.mjs';\n" + code;
          }
          if (args.path.endsWith('/line-text.js'))
            code = code.replaceAll(
              'sharedLineTextCaches = new WeakMap()',
              'sharedLineTextCaches = new Map()',
            );
          code = code
            .replaceAll('prepared.kinds.at(-1)', 'prepared.kinds[prepared.kinds.length-1]')
            .replaceAll(
              'forwardStickyPrefixParts?.at(-1)',
              'forwardStickyPrefixParts?.[forwardStickyPrefixParts.length-1]',
            );
          for (const [from, to] of Object.entries(properties)) code = code.replaceAll(from, to);
          if (code.includes('propertyTest('))
            code = "import {propertyTest} from '../cadenza/unicode-properties.mjs';\n" + code;
          if (code.includes('\\p{') || code.includes('new Intl'))
            throw new Error('Unported dependency ' + args.path);
          return { contents: code, loader: 'js' };
        });
      },
    },
  ],
});
await emit('pretext.mjs', bundled.outputFiles[0].text, 'js');
await copyFile(
  path.join(reference, 'node_modules/@chenglou/pretext/LICENSE'),
  path.join(output, 'PRETEXT-LICENSE.txt'),
);
for (const file of [
  'VisualizerMonet.tsx',
  'MonetLyricsRail.tsx',
  'MonetRailLine.tsx',
  'MonetRailTokens.tsx',
  'MonetSettingsPanel.tsx',
  'MonetPortraitImage.tsx',
  'entry.tsx',
  'tuning.ts',
])
  await source(prefix + file);
await source('src/types.ts');
const rotate = await source('node_modules/lucide-react/dist/esm/icons/rotate-ccw.mjs');
await emit(
  'icons.mjs',
  'export const rotateCcwPaths=' +
    JSON.stringify(Array.from(rotate.matchAll(/d: "([^"]+)"/g), (match) => match[1])) +
    ';',
);
await copyFile(
  path.join(reference, 'node_modules/lucide-react/LICENSE'),
  path.join(output, 'LUCIDE-LICENSE.txt'),
);
const qsb = path.join(
  values['qt-bin'] || path.join(root, '../EchoMusicNext/build/qt-official/6.12.0/macos/bin'),
  'qsb',
);
for (const name of ['sweep', 'line-mask', 'rail-mask', 'portrait-frame'])
  execFileSync(qsb, [
    '--glsl',
    '100 es,120,150',
    '--hlsl',
    '50',
    '--msl',
    '12',
    '-o',
    path.join(output, name + '.frag.qsb'),
    path.join(output, name + '.frag'),
  ]);
for (const name of ['backdrop-compose', 'backdrop-blur']) {
  const shader = path.join(root, 'plugins/folia-lyrics-skin/qml/shaders', name + '.frag');
  execFileSync(qsb, [
    '--glsl',
    '100 es,120,150',
    '--hlsl',
    '50',
    '--msl',
    '12',
    '-o',
    shader + '.qsb',
    shader,
  ]);
}
await writeFile(
  path.join(output, 'sources.json'),
  JSON.stringify(
    {
      revision,
      pretext: '0.0.9',
      unicode: '17.0.0',
      lucide: '1.48.0',
      compatibility: ['round-local line-text strong Map, original clearCache boundary'],
      sha256,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  'Generated complete Monet rail/model, rich-inline pretext, portrait and audio source kernels.',
);
