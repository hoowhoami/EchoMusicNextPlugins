// Preserve the pinned upstream medians exactly, with lazy lossless UTF-16 decoding.
import { nebbiaStrokesPlugin } from './folia-reference/nebbiaStrokesPlugin.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const output = fileURLToPath(
  new URL('../plugins/folia-lyrics-skin/qml/styles/nebbia/assets/', import.meta.url),
);
const assets = new Map();
await nebbiaStrokesPlugin().generateBundle.call({
  emitFile(asset) {
    assets.set(asset.fileName, asset.source);
  },
  warn(message) {
    throw Error(message);
  },
});
if (!assets.has('nebbia-strokes.json'))
  throw Error('Pinned strokes are required for the Folia package');
const original = JSON.parse(assets.get('nebbia-strokes.json'));
const packed = {};
for (const [ch, medians] of Object.entries(original)) {
  if (ch === ' notice') continue;
  const values = [medians.length];
  for (const stroke of medians) {
    values.push(stroke.length);
    for (const [x, y] of stroke) values.push(x + 32, y + 32);
  }
  if (values.some((v) => !Number.isInteger(v) || v < 0 || v > 65535))
    throw Error('Unexpected pinned stroke coordinate');
  packed[ch] = String.fromCharCode(...values);
}
const notice =
  original[' notice'] +
  '\nModified on 2026-11-17 for EchoMusicNext Folia: lossless UTF-16 packing of integer medians and lazy per-character decoding; coordinates and upstream priority are unchanged. This generated data remain under the Arphic Public License.';
await mkdir(output, { recursive: true });
await writeFile(
  path.join(output, 'strokes-data.mjs'),
  '// Generated stroke data — Arphic Public License, not AGPL/MIT. See licenses/nebbia-strokes.\nexport const notice = ' +
    JSON.stringify(notice) +
    ';\nexport const packed = ' +
    JSON.stringify(packed)
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029') +
    ';\n',
);
for (const [name, source] of assets)
  if (name !== 'nebbia-strokes.json') {
    const dest = path.join(output, name);
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, source);
  }
await writeFile(
  path.join(output, 'licenses/nebbia-strokes/ECHOMUSICNEXT-CHANGES.txt'),
  notice + '\n',
);
console.log('Prepared ' + Object.keys(packed).length + ' original AnimCJK characters');
