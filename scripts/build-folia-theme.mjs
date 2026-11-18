// Extract pure theme/color routines from the pinned EchoMusic Folia reference.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
const root = fileURLToPath(new URL('../', import.meta.url));
const referenceArg = process.argv.indexOf('--reference');
if (referenceArg < 0 || !process.argv[referenceArg + 1])
  throw new Error(
    'Pass --reference <folia-style checkout> at revision 7506e1f3a054e1c4739c1fde09cfc8fa80e3000d',
  );
const reference = path.join(path.resolve(process.argv[referenceArg + 1]), 'folia/runtime');
const output = path.join(root, 'plugins/folia-lyrics-skin/qml/shared/theme');
await mkdir(output, { recursive: true });
const color = await readFile(path.join(reference, 'theme-color-math.js'), 'utf8');
const dual = await readFile(path.join(reference, 'dual-theme.js'), 'utf8');
const expected = {
  'dual-theme.js': '2e3aed93f2df654b5e1ff98da1bd6e465fe39dd835fa6d43d0f5f0d32e4c13dd',
  'theme-color-math.js': 'd0edb5725690a1c6ca55aef9757b1ea938615bf3eb3599a326dd490d13ebc282',
};
for (const [name, source] of [
  ['dual-theme.js', dual],
  ['theme-color-math.js', color],
])
  if (createHash('sha256').update(source).digest('hex') !== expected[name])
    throw new Error('Pinned source mismatch: ' + name);
const unwrap = (text) =>
  text.slice(
    text.indexOf('  var FALLBACK_THEME_COLOR'),
    text.indexOf('  window.FoliaThemeColorMath ='),
  );
const colors = [
  'clamp01',
  'normalizeHue',
  'parseThemeColor',
  'rgbToHex',
  'rgbToHsl',
  'hslToRgb',
  'hexToHsl',
  'hslToHex',
  'mixHexColors',
  'getRelativeLuminance',
  'getContrastRatio',
  'getHueDistance',
  'adjustLightnessForContrast',
];
const colorCode = unwrap(color).replace(
  "clampChannel(channel).toString(16).padStart(2, '0')",
  "('0' + clampChannel(channel).toString(16)).slice(-2)",
);
await writeFile(
  path.join(output, 'color-math.mjs'),
  '// EchoMusic folia-style 7506e1f3 · AGPL-3.0-only\n' +
    colorCode +
    '\nexport { ' +
    colors.join(', ') +
    ' };\n',
);
const part = (begin, end) => dual.slice(dual.indexOf(begin), dual.indexOf(end));
let code =
  "import * as ColorMath from './color-math.mjs';\n" +
  part('  var DEFAULT_DARK_THEME', '  function readJson') +
  part('  var HEX_COLOR_PATTERN', '  // ===== 封面取色') +
  part('  var MIN_SUPPORT_SATURATION', '  // ===== 状态与解析');
const tree = ts.createSourceFile(
  'dual-theme.js',
  dual,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.JS,
);
let callback = null;
function visit(node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === 'extractColors') {
    function find(child) {
      if (
        ts.isCallExpression(child) &&
        ts.isPropertyAccessExpression(child.expression) &&
        child.expression.name.text === 'then'
      )
        callback = child.arguments[0];
      ts.forEachChild(child, find);
    }
    find(node);
  }
  ts.forEachChild(node, visit);
}
visit(tree);
if (!callback || !ts.isFunctionExpression(callback))
  throw new Error('Pinned color extraction changed');
const body = callback.body
  .getText(tree)
  .slice(1, -1)
  .replace("v.toString(16).padStart(2, '0')", "('0' + v.toString(16)).slice(-2)");
code += '\nfunction extractColorsFromPixels(pixels, count = 5) {\n' + body + '\n}\n';
code +=
  '\nexport { DEFAULT_DARK_THEME, DEFAULT_LIGHT_THEME, FALLBACK_AI_DUAL_THEME, sanitizeTheme, sanitizeDualTheme, generateBuiltinDualTheme, extractColorsFromPixels };\n';
await writeFile(
  path.join(output, 'kernel.mjs'),
  '// EchoMusic folia-style 7506e1f3 · AGPL-3.0-only\n' + code,
);
await writeFile(
  path.join(output, 'reference.json'),
  JSON.stringify(
    {
      repository: 'https://github.com/EchoMusic-org/folia-style',
      revision: '7506e1f3a054e1c4739c1fde09cfc8fa80e3000d',
      inputs: {
        'folia/runtime/dual-theme.js': createHash('sha256').update(dual).digest('hex'),
        'folia/runtime/theme-color-math.js': createHash('sha256').update(color).digest('hex'),
      },
      adaptations: [
        'Pure math/sanitizer/generator extracted; no browser, storage or DOM runtime.',
        'Native public sampleImage supplies the original 50x50 RGBA pixel input.',
        'Persistence stays in the skin configuration; no host theme preference is changed.',
        'String padStart replaced with equivalent two-digit hex expression.',
      ],
    },
    null,
    2,
  ) + '\n',
);
