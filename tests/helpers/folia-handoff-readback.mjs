// External acceptance for QuickTest image.save(), whose return type is void.
// Node standard library only. This intentionally accepts the RGB/RGBA8 PNGs
// emitted by the actual Qt readback, rather than trusting a filename or header.
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import {
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  writeFileSync,
} from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { inflateSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';

const labels = ['initial-fume', 'paused-handoff-diagnostic', 'actual-held-A', 'actual-completed-B'];
const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
export function crc32(bytes) {
  let crc = 0xffffffff;
  for (const value of bytes) crc = crcTable[(crc ^ value) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
export function createCaptureRun(parent, label, dpr) {
  assert.ok(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(label), 'Invalid run label');
  assert.ok(dpr === 1 || dpr === 2, 'Expected DPR1 or DPR2');
  const directory = resolve(parent, label);
  mkdirSync(directory); // EEXIST is fatal: never inherit a failed run's images.
  const run = {
    id: randomUUID(),
    directory: realpathSync(directory),
    dpr,
    createdAtMs: Date.now(),
  };
  writeFileSync(join(directory, 'capture-run.json'), `${JSON.stringify(run, null, 2)}\n`, {
    flag: 'wx',
  });
  return run;
}
function paeth(left, above, corner) {
  const prediction = left + above - corner;
  const a = Math.abs(prediction - left),
    b = Math.abs(prediction - above),
    c = Math.abs(prediction - corner);
  return a <= b && a <= c ? left : b <= c ? above : corner;
}
function decodePng(bytes, expectedWidth, expectedHeight) {
  assert.ok(bytes.length <= 32 * 1024 * 1024, 'PNG exceeds the actual capture byte bound');
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'Invalid PNG signature');
  let offset = 8,
    header = null,
    ended = false,
    crcChunks = 0;
  const data = [];
  while (offset < bytes.length) {
    assert.ok(offset + 12 <= bytes.length, 'Truncated PNG chunk');
    const length = bytes.readUInt32BE(offset),
      end = offset + length + 12;
    assert.ok(end <= bytes.length, 'Truncated PNG payload');
    const type = bytes.subarray(offset + 4, offset + 8).toString('ascii');
    const payload = bytes.subarray(offset + 8, end - 4);
    assert.equal(
      crc32(bytes.subarray(offset + 4, end - 4)),
      bytes.readUInt32BE(end - 4),
      `PNG ${type} CRC mismatch`,
    );
    crcChunks++;
    if (type === 'IHDR') {
      assert.ok(header === null && offset === 8 && length === 13, 'Invalid PNG IHDR');
      const width = payload.readUInt32BE(),
        height = payload.readUInt32BE(4);
      assert.ok(
        width === expectedWidth && height === expectedHeight,
        `PNG extent ${width}x${height} differs from actual expected readback`,
      );
      assert.ok(
        payload[8] === 8 &&
          [2, 6].includes(payload[9]) &&
          payload[10] === 0 &&
          payload[11] === 0 &&
          payload[12] === 0,
        'Expected noninterlaced RGB/RGBA8 Qt capture',
      );
      header = { width, height, channels: payload[9] === 6 ? 4 : 3 };
    } else if (type === 'IDAT') {
      assert.ok(header !== null, 'PNG data precedes header');
      data.push(payload);
    } else if (type === 'IEND') {
      assert.equal(length, 0, 'Invalid PNG IEND');
      assert.equal(end, bytes.length, 'Unexpected PNG trailing bytes');
      ended = true;
    } else {
      assert.ok((bytes[offset + 4] & 32) !== 0, `Unsupported critical PNG chunk ${type}`);
    }
    offset = end;
    if (ended) break;
  }
  assert.ok(header && ended && data.length > 0, 'Incomplete PNG');
  const { width, height, channels } = header,
    stride = width * channels;
  const packed = inflateSync(Buffer.concat(data), { maxOutputLength: (stride + 1) * height });
  assert.equal(packed.length, (stride + 1) * height, 'Truncated PNG pixel data');
  const pixels = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = packed[y * (stride + 1)];
    assert.ok(filter <= 4, 'Invalid PNG filter');
    for (let x = 0; x < stride; x++) {
      const index = y * stride + x;
      const left = x >= channels ? pixels[index - channels] : 0;
      const above = y > 0 ? pixels[index - stride] : 0;
      const corner = x >= channels && y > 0 ? pixels[index - stride - channels] : 0;
      const predictor =
        filter === 0
          ? 0
          : filter === 1
            ? left
            : filter === 2
              ? above
              : filter === 3
                ? Math.floor((left + above) / 2)
                : paeth(left, above, corner);
      pixels[index] = (packed[y * (stride + 1) + x + 1] + predictor) & 255;
    }
  }
  let nonblack = 0;
  // Identical coordinates and RGB >96 threshold to the live QML readback.
  for (let y = 10; y < height - 10; y += 11) {
    for (let x = 10; x < width - 10; x += 13) {
      const index = (y * width + x) * channels;
      assert.ok(
        channels === 3 || pixels[index + 3] === 255,
        'Expected opaque actual window readback',
      );
      if (pixels[index] + pixels[index + 1] + pixels[index + 2] > 96) nonblack++;
    }
  }
  return { width, height, nonblack, crcChunks };
}
// Date.now() truncates fractional milliseconds; +1 is its exclusive upper edge.
export function verifyReadbacks({ directory, logPath, endedAtMs = Date.now() + 1 }) {
  const root = realpathSync(directory);
  const run = JSON.parse(readFileSync(join(root, 'capture-run.json'), 'utf8'));
  assert.ok(
    run.id &&
      run.directory === root &&
      [1, 2].includes(run.dpr) &&
      Number.isFinite(run.createdAtMs) &&
      endedAtMs >= run.createdAtMs,
    'Invalid capture run identity/time',
  );
  const marker = 'FUME_HANDOFF_READBACK ';
  const records = readFileSync(logPath, 'utf8')
    .split('\n')
    .filter((line) => line.includes(marker))
    .map((line) => JSON.parse(line.slice(line.indexOf(marker) + marker.length)));
  assert.equal(
    records.length,
    labels.length,
    'Expected all four readbacks from this completed A/B run',
  );
  const observed = new Set(),
    images = [];
  for (const record of records) {
    assert.ok(
      labels.includes(record.label) && !observed.has(record.label),
      'Unexpected or duplicate readback',
    );
    observed.add(record.label);
    const name = `fume-handoff-${record.label}-dpr${run.dpr}.png`,
      file = join(root, name);
    assert.equal(resolve(record.path), file, 'Readback path belongs to a different run');
    const info = lstatSync(file);
    assert.ok(
      info.isFile() &&
        !info.isSymbolicLink() &&
        info.mtimeMs >= run.createdAtMs &&
        info.mtimeMs < endedAtMs,
      `PNG timestamp is outside this run: ${info.mtimeMs} not in [${run.createdAtMs}, ${endedAtMs})`,
    );
    const bytes = readFileSync(file),
      decoded = decodePng(bytes, 1100 * run.dpr, 820 * run.dpr);
    assert.equal(record.width, decoded.width, 'Native width differs from PNG extent');
    assert.equal(record.height, decoded.height, 'Native height differs from PNG extent');
    assert.equal(
      record.nonblack,
      decoded.nonblack,
      'Native pixel observation differs from the decoded PNG',
    );
    const requireBright = record.label !== 'paused-handoff-diagnostic';
    assert.equal(record.requireBright, requireBright, 'Original bright-content gate changed');
    assert.ok(record.swaps > 0, 'Readback has no real native frame swap');
    if (requireBright)
      assert.ok(decoded.nonblack > 20, 'Actual handoff readback has no bright content');
    images.push({
      file,
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      ...decoded,
    });
  }
  assert.deepEqual(
    readdirSync(root)
      .filter((name) => name.endsWith('.png'))
      .sort(),
    images.map((image) => basename(image.file)).sort(),
    'Unlogged PNG in capture directory',
  );
  return {
    run,
    endedAtMs,
    logPath: resolve(logPath),
    logSha256: createHash('sha256').update(readFileSync(logPath)).digest('hex'),
    images,
  };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [directory, logPath, ended] = process.argv.slice(2);
  assert.ok(
    directory && logPath,
    'Usage: node tests/helpers/folia-handoff-readback.mjs fresh-capture-directory native.log [owned-run-ended-at-ms]',
  );
  const endedAtMs = ended === undefined ? Date.now() + 1 : Number(ended);
  assert.ok(Number.isFinite(endedAtMs), 'Invalid owned-run completion time');
  console.log(JSON.stringify(verifyReadbacks({ directory, logPath, endedAtMs }), null, 2));
}
