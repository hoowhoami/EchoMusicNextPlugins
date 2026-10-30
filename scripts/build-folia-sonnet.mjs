import { withoutBeatAnalysis } from './folia-visual-scope.mjs';
import { resolveFoliaReference } from './folia-reference.mjs';
// Reproducible pinned source port. All compilers are existing build dependencies.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { transform } from 'esbuild';
import ts from 'typescript';
import { format, resolveConfig } from 'prettier';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const { values } = parseArgs({ options: { reference: { type: 'string' } } });
const reference = await resolveFoliaReference(values.reference);
const revision = 'a8da4437cf19723555bd75e4685ca20815fe5b82';
if (process.versions.unicode !== '17.0') throw new Error('Build with Node24 / Unicode17');
const output = path.join(root, 'plugins/folia-lyrics-skin/qml/styles/sonnet');
await mkdir(output, { recursive: true });
const formatting = await resolveConfig(path.join(output, 'kernel.mjs'));
const sha256 = {};
async function source(relative) {
  const code = await readFile(path.join(reference, relative), 'utf8');
  sha256[relative] = createHash('sha256').update(code).digest('hex');
  return code;
}
function portableCollections(code) {
  const used = new Set();
  const tree = ts.createSourceFile('source.ts', code, ts.ScriptTarget.Latest, true);
  const result = ts.transform(tree, [
    (context) => {
      const visit = (node) => {
        if (
          ts.isCallExpression(node) &&
          ts.isPropertyAccessExpression(node.expression) &&
          ['flatMap', 'flat', 'at'].includes(node.expression.name.text)
        ) {
          const name = node.expression.name.text;
          used.add(name);
          return context.factory.createCallExpression(
            context.factory.createIdentifier(name),
            undefined,
            [
              ts.visitNode(node.expression.expression, visit),
              ...node.arguments.map((arg) => ts.visitNode(arg, visit)),
            ],
          );
        }
        return ts.visitEachChild(node, visit, context);
      };
      return (node) => ts.visitNode(node, visit);
    },
  ]);
  const printed = ts.createPrinter().printFile(result.transformed[0]);
  result.dispose();
  return (used.size ? `import {${[...used].join(',')}} from './compat.mjs';\n` : '') + printed;
}
async function emit(
  name,
  code,
  header = '// Derived from Folia a8da4437 (AGPL-3.0-only). See sonnet-reference.md.',
) {
  const js = await transform(portableCollections(withoutBeatAnalysis(code, name)), {
    loader: 'ts',
    target: 'es2016',
    format: 'esm',
    legalComments: 'none',
    minifySyntax: true,
    define: { 'import.meta.env.DEV': 'false' },
  });
  await writeFile(
    path.join(output, name),
    await format(header + '\n' + js.code, { ...formatting, parser: 'babel' }),
  );
}
const prefix = 'src/components/visualizer/sonnet/';
for (const name of [
  'types',
  'sonnetProgram',
  'sonnetSemantic',
  'sonnetRandom',
  'sonnetMotion',
  'sonnetTransitions',
  'sonnetGlyphLayout',
  'sonnetCameraTracking',
  'sonnetTypographyRoles',
  'sonnetPostProcess',
  'sonnetLensFilter',
  'sonnetPrintFilters',
  'sonnetCredits',
  'sonnetSceneFrame',
  'sonnetAnimatedGraphics',
  'sonnetAdditionalShotMg',
  'sonnetSpatialMgGeometry',
  'sonnetBackgroundMgVariants',
  'sonnetShotMgViewport',
  'sonnetThemedShotMg',
  'sonnetThemedShotMgPrimitives',
  'sonnetOpenFrameShotMg',
  'sonnetExtendedShotMg',
  'sonnetShotMgArchitecture',
  'sonnetShotMgBotanical',
  'sonnetShotMgFlora',
  'sonnetShotMgLandscape',
  'sonnetShotMgCelestial',
  'sonnetShotMgMarine',
  'sonnetShotMgMusic',
  'sonnetShotMgCraft',
  'sonnetShotMgKinetic',
  'sonnetStaffNotation',
  'sonnetPosterBlocksLayout',
  'sonnetShotFlowLayouts',
  'sonnetFrameDecor',
  'sonnetTypographyLayout',
  'sonnetPixiResources',
  'sonnetSceneBuilder',
  'sonnetTextViewBuilder',
  'sonnetShotMg',
  'sonnetShotFrame',
  'sonnetGuides',
  'sonnetStaffView',
  'sonnetTextFixedGeo',
  'sonnetFixedGeoVariants',
  'sonnetBackgroundDecor',
  'sonnetGlitchFilter',
  'sonnetFrameOverlay',
  'sonnetDebug',
  'sonnetOutroBlur',
]) {
  let code = await source(prefix + name + '.ts');
  code = code
    .replaceAll("from '../../../utils/lyrics/renderHints'", "from '../../shared/renderHints.mjs'")
    .replaceAll(
      "from '../../../utils/lyrics/graphemeTiming'",
      "from '../../shared/text/graphemeTiming.mjs'",
    )
    .replaceAll(
      "from '../../../utils/lyrics/wordSegmentation'",
      "from '../../shared/text/wordSegmentation.mjs'",
    )
    .replaceAll("from '../../../utils/fontStacks'", "from './font-stacks.mjs'")
    .replaceAll("from '../visualizerSeedHash'", "from './seed-hash.mjs'")
    .replaceAll("from '../pixiFilterVertex'", "from './filter-vertex.mjs'")
    .replaceAll("from '../pixi/pixiDisplayResources'", "from './display-resources.mjs'")
    .replaceAll("from '@chenglou/pretext'", "from './pretext.mjs'")
    .replaceAll("import 'pixi.js/advanced-blend-modes';", '')
    .replace(
      /from '(\.\/[^']+)'/g,
      (_, relative) => `from '${relative.endsWith('.mjs') ? relative : relative + '.mjs'}'`,
    );
  // This is the same re-exported pure predicate, without loading the layout/measurement module.
  if (name === 'sonnetGlyphLayout') {
    code = code.replace(
      "from './sonnetTypographyLayout.mjs'",
      "from './sonnetTypographyRoles.mjs'",
    );
    // Qt6.12 Array.from(string) splits surrogate pairs. Preserve the source's
    // code-point fallback, rather than changing it to an EGC or UTF16 fallback.
    code =
      "import {codePoints} from '../../shared/text/codepoints.mjs';\n" +
      code.replaceAll('Array.from(segment.text)', 'codePoints(segment.text)');
  }
  if (name === 'sonnetTypographyLayout') {
    code =
      "import {codePoints} from '../../shared/text/codepoints.mjs';\n" +
      code.replaceAll('Array.from(segment.text)', 'codePoints(segment.text)');
    // A native provider error must not publish the source's last-resort width estimate.
    code = code.replace(
      '} catch {\n        width = text.length * fontSize * 0.6;\n    }',
      '} catch (error) { throw error; }',
    );
    code += '\nexport const clearLayoutMeasurements=()=>measureCache.clear();\n';
  }
  if (name === 'sonnetShotFrame') {
    code = code.replace(
      'const shotTrackingCache = new WeakMap',
      'let shotTrackingCache = new WeakMap',
    );
    code += '\nexport const clearShotTrackingCache=()=>{shotTrackingCache=new WeakMap();};\n';
  }
  if (name === 'sonnetTextViewBuilder')
    code = ("import {codePoints} from '../../shared/text/codepoints.mjs';\n" + code)
      .replace(
        '} catch {\n        return text.length * fontSize * 0.6;\n    }',
        '} catch (error) { throw error; }',
      )
      .replace('.map(glyph => {', '.map((glyph, glyphIndex) => {')
      .replace(
        '    const glyphs: GlyphView[] = buildSonnetGlyphLayout(',
        `    const tagNativeContext = (node, glyphIndex, instance) => {
        const chars = segment.graphemes.length ? segment.graphemes.map(item => item.char) : codePoints(segment.text);
        node.nativeContext = {key: options.nativeKey, text: segment.text,
            start: chars.slice(0, glyphIndex).join('').length, instance};
        return node;
    };
    const glyphs: GlyphView[] = buildSonnetGlyphLayout(`,
      )
      .replace(
        /const (display|caCyan|caRed|ghost) = new Text\((\{ text: glyph.char, style(?:: ghostStyle)? \})\);/g,
        (_, variable, input) =>
          `const ${variable} = tagNativeContext(new Text(${input}), glyphIndex, '${variable}'${variable === 'ghost' ? '+layer' : ''});`,
      );
  if (name === 'sonnetSceneBuilder')
    code = code.replace(
      'segmentIndex: placement.segmentIndex,',
      'segmentIndex: placement.segmentIndex,\n                    nativeKey: shot.id + ":" + placementIndex,',
    );
  await emit(name + '.mjs', code);
}
// This module's lower section depends only on numeric inputs. Native SVG assets
// replace React/server rendering in the separate icon loader.
const icons = await source(prefix + 'sonnetIcons.ts');
await emit(
  'sonnetIcons.mjs',
  icons.slice(
    icons.indexOf('export const buildSonnetIconParticleIndices'),
    icons.indexOf('export const buildSonnetIconDataUrl'),
  ),
);
for (const [original, target] of [
  ['src/components/visualizer/visualizerSeedHash.ts', 'seed-hash.mjs'],
  ['src/utils/fontStacks.ts', 'font-stacks.mjs'],
  ['src/components/visualizer/pixiFilterVertex.ts', 'filter-vertex.mjs'],
  ['src/components/visualizer/pixi/pixiDisplayResources.ts', 'display-resources.mjs'],
  ['src/components/visualizer/pixi/pixiTextureBudget.ts', 'texture-budget.mjs'],
  ['src/components/visualizer/pixiSceneCache.ts', 'scene-cache.mjs'],
])
  await emit(target, await source(original));
for (const [original, target] of [
  ['textTokenization', 'pixi-tokenization'],
  ['wordWrap', 'pixi-word-wrap'],
]) {
  const code = (
    await source('node_modules/pixi.js/lib/scene/text/canvas/utils/' + original + '.mjs')
  ).replaceAll("from './textTokenization.mjs'", "from './pixi-tokenization.mjs'");
  await emit(target + '.mjs', code, '// Pixi8.21.0 MIT. See PIXI-TEXT-LICENSE.txt.');
}
await copyFile(
  path.join(reference, 'node_modules/pixi.js/LICENSE'),
  path.join(output, 'PIXI-TEXT-LICENSE.txt'),
);
// Build-time extraction of the pinned Lucide constant nodes, without React at runtime.
function constant(node) {
  if (ts.isStringLiteral(node) || ts.isNumericLiteral(node))
    return ts.isNumericLiteral(node) ? Number(node.text) : node.text;
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(constant);
  if (ts.isObjectLiteralExpression(node))
    return Object.fromEntries(
      node.properties.map((property) => {
        if (!ts.isPropertyAssignment(property)) throw new Error('Nonconstant Lucide icon property');
        return [property.name.text, constant(property.initializer)];
      }),
    );
  throw new Error('Nonconstant Lucide icon data');
}
const iconImports = await source('node_modules/lucide-react/dist/esm/dynamicIconImports.mjs');
const iconAliases = [...iconImports.matchAll(/"([^"]+)": \(\) => import\('\.\/icons\/([^']+)'\)/g)];
const iconDefinitions = {};
for (const file of [...new Set(iconAliases.map((match) => match[2]))]) {
  const code = await source('node_modules/lucide-react/dist/esm/icons/' + file);
  const tree = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true);
  const declaration = tree.statements
    .filter(ts.isVariableStatement)
    .flatMap((statement) => statement.declarationList.declarations)
    .find((item) => item.name.text === '__iconData');
  if (!declaration) throw new Error('Pinned Lucide data missing: ' + file);
  iconDefinitions[file.slice(0, -4)] = constant(declaration.initializer);
}
const aliases = {},
  canonical = {};
const pascal = (key) => key.replace(/(?:^|-)(\w)/g, (_, char) => char.toUpperCase());
for (const form of [(name) => name, (name) => name + 'Icon', (name) => 'Lucide' + name])
  for (const match of iconAliases) {
    const name = form(pascal(match[1]));
    if (Object.hasOwn(aliases, name)) continue;
    aliases[name] = match[2].slice(0, -4);
    if (!Object.hasOwn(canonical, name.toLowerCase())) canonical[name.toLowerCase()] = name;
  }
await emit(
  'icons-data.mjs',
  `export const definitions=${JSON.stringify(iconDefinitions)};export const aliases=${JSON.stringify(aliases)};export const canonical=${JSON.stringify(canonical)};`,
  '// Lucide1.48.0 constant SVG nodes, ISC/MIT. See LUCIDE-LICENSE.txt; no React runtime.',
);
await copyFile(
  path.join(reference, 'node_modules/lucide-react/LICENSE'),
  path.join(output, 'LUCIDE-LICENSE.txt'),
);
// Keep independent measurement/cache state while the previous renderer exits.
// This existing MIT pretext port is already generated from the pinned dependency.
const sharedPretext = await readFile(
  path.join(root, 'plugins/folia-lyrics-skin/qml/styles/fume/pretext.mjs'),
  'utf8',
);
sha256['shared:styles/fume/pretext.mjs'] = createHash('sha256').update(sharedPretext).digest('hex');
await emit(
  'pretext.mjs',
  sharedPretext,
  '// @chenglou/pretext0.0.9 MIT; PRETEXT-LICENSE.txt; isolated Sonnet native provider.',
);
await copyFile(
  path.join(reference, 'node_modules/@chenglou/pretext/LICENSE'),
  path.join(output, 'PRETEXT-LICENSE.txt'),
);
const types = await source('src/types.ts');
const defaults = types
  .slice(
    types.indexOf('export const DEFAULT_SONNET_TUNING'),
    types.indexOf('\n};', types.indexOf('export const DEFAULT_SONNET_TUNING')) + 3,
  )
  .replace('DEFAULT_SONNET_TUNING', 'DEFAULTS');
const tuning = await source(prefix + 'tuning.ts');
const resolve = tuning.slice(
  tuning.indexOf('const switchOr ='),
  tuning.indexOf('\nexport default'),
);
await emit(
  'kernel.mjs',
  [
    "export * from './sonnetProgram.mjs';export * from './sonnetMotion.mjs';export * from './sonnetTransitions.mjs';export * from './sonnetGlyphLayout.mjs';export * from './sonnetPostProcess.mjs';",
    defaults,
    "const numberWithin=(value,fallback,min,max)=>typeof value==='number'&&Number.isFinite(value)?Math.max(min,Math.min(max,value)):fallback;",
    resolve,
    "export function tuning(settings={}){const input={};for(const key of Object.keys(DEFAULTS))input[key]=settings['sonnet'+key[0].toUpperCase()+key.slice(1)];return resolve(input,DEFAULTS);}",
  ].join('\n'),
);
// Keep the actual source render loop; native preparation only supplies its scene cache.
const runtimeSource = await source(prefix + 'createSonnetPixiRuntime.ts');
const runtimeTree = ts.createSourceFile('runtime.ts', runtimeSource, ts.ScriptTarget.Latest, true);
const runtimeClass = runtimeTree.statements.find(
  (node) => ts.isClassDeclaration(node) && node.name.text === 'SonnetPixiRuntime',
);
const render = runtimeClass.members.find((node) => node.name?.text === 'renderFrame');
if (!render?.initializer?.body) throw Error('Pinned Sonnet renderFrame missing');
await emit(
  'runtime-frame.mjs',
  [
    "import {findSonnetParagraphIndexAtTime} from './sonnetProgram.mjs';",
    "import {resolveSonnetCreditsFrame} from './sonnetCredits.mjs';",
    "import {sonnetDebugState} from './sonnetDebug.mjs';",
    "import {unloadSonnetDisplayTree} from './sonnetPixiResources.mjs';",
    "import {updateSonnetShot} from './sonnetShotFrame.mjs';",
    "import {findSonnetActiveShotIndex,resolveSonnetSceneTransitionFrame} from './sonnetSceneFrame.mjs';",
    'export function renderSourceFrame()' + render.initializer.body.getText(runtimeTree),
  ].join('\n'),
);
const gateRaw = await source('src/components/visualizer/songHandover.ts');
const gatePure = gateRaw
  .slice(0, gateRaw.indexOf('export interface UseVisualizerSongCommitOptions'))
  .replace(/^import[^\n]*\n/gm, '');
// Qt6.12 misbinds two object-pattern parameters. Lower binding syntax only;
// preserve the pinned decision and numeric expressions verbatim.
await emit(
  'song-handover.mjs',
  ts.transpileModule(gatePure, {
    compilerOptions: { target: ts.ScriptTarget.ES5, module: ts.ModuleKind.ESNext },
  }).outputText,
);
const visualizer = await source(prefix + 'VisualizerSonnet.tsx');
const visualTree = ts.createSourceFile(
  'VisualizerSonnet.tsx',
  visualizer,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
let virtualBody;
function findVirtual(node) {
  if (ts.isVariableDeclaration(node) && node.name.text === 'virtualLines')
    virtualBody = node.initializer.arguments[0].body.getText(visualTree);
  ts.forEachChild(node, findVirtual);
}
findVirtual(visualTree);
if (!virtualBody) throw Error('Pinned Sonnet virtual staff source missing');
await emit(
  'instrumental.mjs',
  'const EMPTY_SONNET_LINES=[];export function buildInstrumentalLines(isInstrumental)' +
    virtualBody,
);
for (const file of [
  'VisualizerSonnet.tsx',
  'createSonnetPixiRuntime.ts',
  'sonnetSceneBuilder.ts',
  'sonnetTextViewBuilder.ts',
  'SonnetSettingsPanel.tsx',
  'entry.tsx',
])
  await source(prefix + file);
await writeFile(
  path.join(output, 'sources.json'),
  JSON.stringify({ revision, unicode: '17.0.0', sha256 }, null, 2) + '\n',
);
console.log(
  'Generated pinned Sonnet paragraph, camera, typography timing and post-process kernels.',
);
