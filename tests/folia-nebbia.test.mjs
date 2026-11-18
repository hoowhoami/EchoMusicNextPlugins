import './fixtures/qt-binary.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { createNebbiaGlRecorder } from '../plugins/folia-lyrics-skin/qml/styles/nebbia/gl-record.mjs';
import {
  configurePixels,
  pendingPixels,
} from '../plugins/folia-lyrics-skin/qml/styles/nebbia/environment.mjs';
import { NebbiaGl } from '../plugins/folia-lyrics-skin/qml/styles/nebbia/source/nebbiaGl.mjs';
import { NebbiaSegments } from '../plugins/folia-lyrics-skin/qml/styles/nebbia/source/nebbiaSegments.mjs';
const sprite = { width: 2, height: 2, pixels: new Array(16).fill(255) };
for (const scene of ['night', 'aquarium'])
  for (const glass of ['rain', 'dew', 'snow'])
    test(`Nebbia ${scene}/${glass} original GL programs resolve to native shader interfaces`, () => {
      configurePixels([], 123, { 'nebbiaRaindrop.png': sprite });
      const recorded = createNebbiaGlRecorder(640, 480);
      const native = new NebbiaGl({ getContext: () => recorded.gl }, false, scene, glass);
      assert.equal(native.ready, true);
      native.resize(640, 480, 1);
      const segments = new NebbiaSegments();
      segments.push(10, 10, 100, 80, 12, 0.7);
      const field = [200, 120, 8, 8, 0.7, 1];
      native.render(
        segments,
        null,
        [],
        field,
        {
          time: 0,
          mist: 0.5,
          edge: 1,
          refract: 1,
          bus: 1,
          glint: 1,
          neon: 1,
          glassShift: [0, 0],
          sceneShift: [0, 0],
          spotSrc: [0, 0],
          spotSrc2: [0, 0],
          spotTgt: [0, 0],
          spotR: 0.2,
          spotI: 0,
          scenery: 31,
          dewGlint: 1,
          aqua: null,
        },
        true,
      );
      const frame = recorded.drain();
      assert.ok(frame.commands.some((c) => c.type === 'draw' && c.composition === 'max'));
      assert.ok(frame.commands.some((c) => c.type === 'draw' && c.composition === 'exclusion'));
      assert.ok(frame.events.some((e) => e.type === 'texture' && e.format === 'rgba16f'));
      assert.ok(recorded.resourceCount() < 128);
      assert.equal(pendingPixels().length, 0);
      native.destroy();
    });

import { getNebbiaStrokeMedians } from '../plugins/folia-lyrics-skin/qml/styles/nebbia/strokes.mjs';
test('Nebbia decodes canonical medians lazily with separate results', () => {
  const first = getNebbiaStrokeMedians('山');
  assert.ok(first.length >= 3);
  assert.deepEqual(getNebbiaStrokeMedians('山'), first);
  first[0][0][0] = -10000;
  assert.notEqual(getNebbiaStrokeMedians('山')[0][0][0], -10000);
  assert.equal(getNebbiaStrokeMedians('\u{10ffff}'), null);
});

import { packBytes, unpackBytes } from '../plugins/folia-lyrics-skin/qml/shared/binary.mjs';
import { createObjectCache } from '../plugins/folia-lyrics-skin/qml/shared/objectCache.mjs';
test('native image/buffer packets preserve every byte through JSON without numeric arrays', () => {
  const bytes = new Uint8Array(2 * 1024 * 1024 + 13);
  for (let i = 0; i < bytes.length; ++i) bytes[i] = (i * 73 + (i % 251)) & 255;
  const packet = packBytes(bytes.buffer),
    received = JSON.parse(JSON.stringify({ packet })).packet;
  assert.ok(received.length < bytes.length * 1.4 + 16);
  assert.deepEqual(new Uint8Array(unpackBytes(received)), bytes);
  assert.throws(() => unpackBytes('\0'));
  assert.throws(() => unpackBytes('\uD800'));
});

test('Nebbia retains coalesced texture declarations until the consumer acknowledges them', () => {
  const recorder = createNebbiaGlRecorder(32, 32),
    gl = recorder.gl;
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 4, 4, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  const first = recorder.drain();
  assert.equal(first.events.length, 1);
  assert.deepEqual(recorder.drain().events, first.events);
  assert.equal(recorder.drain(first.resourceRevision).events.length, 0);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 8, 8, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  const replacement = recorder.drain(first.resourceRevision);
  assert.equal(replacement.events.length, 1);
  assert.equal(replacement.events[0].width, 8);
  gl.deleteTexture(texture);
  const retired = recorder.drain(first.resourceRevision);
  assert.equal(retired.events.length, 1);
  assert.equal(retired.events[0].type, 'retire');
  assert.equal(recorder.drain(retired.resourceRevision).events.length, 0);
  const other = createNebbiaGlRecorder(32, 32),
    secondGl = other.gl;
  secondGl.bindTexture(secondGl.TEXTURE_2D, secondGl.createTexture());
  secondGl.texImage2D(
    secondGl.TEXTURE_2D,
    0,
    secondGl.RGBA,
    2,
    2,
    0,
    secondGl.RGBA,
    secondGl.UNSIGNED_BYTE,
    null,
  );
  assert.equal(other.drain(retired.resourceRevision).events.length, 1);
});
test('native numerical cache follows its owner without exposing cache fields to snapshots', () => {
  const owner = { seed: 'native' },
    cache = createObjectCache();
  cache.set(owner, { value: 123 });
  assert.equal(cache.get(owner).value, 123);
  assert.deepEqual(Object.keys(owner), ['seed']);
  assert.equal(JSON.stringify(owner), '{"seed":"native"}');
  assert.ok(cache.delete(owner));
  assert.equal(cache.get(owner), undefined);
  assert.equal(cache.delete(owner), false);
  assert.throws(() => cache.set(1, {}));
});
