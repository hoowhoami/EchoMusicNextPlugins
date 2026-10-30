import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';
import { crc32, createCaptureRun, verifyReadbacks } from './helpers/folia-handoff-readback.mjs';

test('PNG CRC agrees with the fixed IEEE CRC32 check vector', () => {
  assert.equal(crc32(Buffer.from('123456789')), 0xcbf43926);
});

function chunk(type, data) {
  const name = Buffer.from(type);
  const result = Buffer.alloc(data.length + 12);
  result.writeUInt32BE(data.length);
  name.copy(result, 4);
  data.copy(result, 8);
  result.writeUInt32BE(crc32(Buffer.concat([name, data])), data.length + 8);
  return result;
}
function png(width, height) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const pixels = Buffer.alloc((width * 4 + 1) * height, 255);
  for (let y = 0; y < height; y++) pixels[y * (width * 4 + 1)] = 0;
  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(pixels)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
function fixture(t) {
  const parent = mkdtempSync(join(tmpdir(), 'folia-handoff-readback-'));
  t.after(() => rmSync(parent, { recursive: true, force: true }));
  const run = createCaptureRun(parent, 'actual-run', 1);
  const image = png(1100, 820);
  const labels = [
    'initial-fume',
    'paused-handoff-diagnostic',
    'actual-held-A',
    'actual-completed-B',
  ];
  let nonblack = 0;
  for (let y = 10; y < 810; y += 11) for (let x = 10; x < 1090; x += 13) nonblack++;
  const records = labels.map((label) => {
    const path = join(run.directory, `fume-handoff-${label}-dpr1.png`);
    writeFileSync(path, image);
    return {
      label,
      path,
      width: 1100,
      height: 820,
      nonblack,
      requireBright: label !== 'paused-handoff-diagnostic',
      swaps: 1,
    };
  });
  const logPath = join(parent, 'native.log');
  writeFileSync(
    logPath,
    records.map((record) => `QINFO: FUME_HANDOFF_READBACK ${JSON.stringify(record)}`).join('\n'),
  );
  return { parent, run, logPath, records };
}
test('fresh run decodes all four PNGs and retains the original extent and bright-pixel gate', (t) => {
  const f = fixture(t);
  const proof = verifyReadbacks({ directory: f.run.directory, logPath: f.logPath });
  assert.equal(proof.images.length, 4);
  assert.ok(
    proof.images.every(
      (image) => image.crcChunks >= 3 && image.nonblack > 20 && image.sha256.length === 64,
    ),
  );
  assert.equal(proof.run.id, f.run.id);
});
test('an output directory cannot be reused after a failed run', (t) => {
  const f = fixture(t);
  assert.throws(() => createCaptureRun(f.parent, 'actual-run', 1), /already exists|EEXIST/);
});
test('an old PNG is rejected even when its filename and pixels are valid', (t) => {
  const f = fixture(t);
  utimesSync(f.records[0].path, 1, 1);
  assert.throws(
    () => verifyReadbacks({ directory: f.run.directory, logPath: f.logPath }),
    /outside this run/,
  );
});
test('complete PNG CRC, expected extent and native pixel observations are enforced', (t) => {
  const f = fixture(t);
  const path = f.records[0].path;
  const original = readFileSync(path);
  const corrupt = Buffer.from(original);
  corrupt[corrupt.length - 1] ^= 1;
  writeFileSync(path, corrupt);
  assert.throws(() => verifyReadbacks({ directory: f.run.directory, logPath: f.logPath }), /CRC/);
  writeFileSync(path, png(1000, 820));
  assert.throws(
    () => verifyReadbacks({ directory: f.run.directory, logPath: f.logPath }),
    /extent/,
  );
  writeFileSync(path, original);
  f.records[0].nonblack--;
  writeFileSync(
    f.logPath,
    f.records.map((record) => `FUME_HANDOFF_READBACK ${JSON.stringify(record)}`).join('\n'),
  );
  assert.throws(
    () => verifyReadbacks({ directory: f.run.directory, logPath: f.logPath }),
    /pixel observation/,
  );
});
test('a partial run cannot substitute its first saved PNG for full A/B acceptance', (t) => {
  const f = fixture(t);
  writeFileSync(f.logPath, `FUME_HANDOFF_READBACK ${JSON.stringify(f.records[0])}\n`);
  assert.throws(
    () => verifyReadbacks({ directory: f.run.directory, logPath: f.logPath }),
    /four readbacks/,
  );
});
