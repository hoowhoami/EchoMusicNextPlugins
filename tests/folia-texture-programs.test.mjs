import './fixtures/qt-binary.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { batchHanabiFrame } from '../plugins/folia-lyrics-skin/qml/styles/hanabi/batch-frame.mjs';
import { retainTexturePrograms } from '../plugins/folia-lyrics-skin/qml/styles/lumiere/texture-programs.mjs';
import { packBytes, unpackBytes } from '../plugins/folia-lyrics-skin/qml/shared/binary.mjs';
test('coalesced pose frames retain a new texture revision until its actor can prepare it', () => {
  const commands = [{ kind: 'fillText', text: '山河' }];
  let bank = new Map();
  const first = retainTexturePrograms(
    { textures: [{ id: 'board', revision: 1, commands }], leaves: [] },
    bank,
  );
  bank = first.retained;
  const latest = retainTexturePrograms(
    { textures: [{ id: 'board', revision: 1 }], leaves: [] },
    bank,
  );
  assert.equal(latest.frame.textures[0].commands, commands);
  assert.equal(
    retainTexturePrograms({ textures: [{ id: 'board', revision: 2 }], leaves: [] }, latest.retained)
      .frame.textures[0].commands,
    undefined,
  );
  assert.equal(
    retainTexturePrograms({ textures: [], leaves: [] }, latest.retained).retained.size,
    0,
  );
  assert.equal(retainTexturePrograms(null, latest.retained).retained.size, 0);
});
test('float frame packets survive JSON with every UTF16 word, including surrogates', () => {
  const words = Uint16Array.from({ length: 65536 }, (_, i) => i);
  const packet = JSON.parse(JSON.stringify(packBytes(words.buffer)));
  assert.deepEqual(new Uint8Array(unpackBytes(packet)), new Uint8Array(words.buffer));
  assert.ok(/^[0-9]+:[A-Za-z0-9+/=]*$/.test(packet));
  assert.ok(packet.length < words.byteLength * 1.4 + 16);
});
test('binary packets retain every tail length and reject truncation or noncanonical padding', () => {
  for (let length = 0; length < 48; ++length) {
    const bytes = Uint8Array.from({ length }, (_, i) => (i * 119 + length) & 255);
    const packet = packBytes(bytes.buffer);
    assert.deepEqual(new Uint8Array(unpackBytes(packet)), bytes);
    assert.throws(() => unpackBytes(packet.slice(1)), /Invalid/);
  }
  const packet = packBytes(new Uint8Array([1]).buffer);
  assert.throws(() => unpackBytes(packet.slice(0, -1) + String.fromCharCode(1024)), /padding/);
  assert.throws(() => unpackBytes('1:AR=='), /padding/);
  assert.throws(() => unpackBytes('2:AQJ='), /padding/);
  assert.throws(() => unpackBytes('01:AQ=='), /length/);
  assert.throws(() => unpackBytes('16777217:'), /length/);
});

test('scene packets retain geometry across coalesced poses and replace reused scene IDs', async () => {
  const { encodeSceneResources, restoreSceneResources } =
    await import('../plugins/folia-lyrics-skin/qml/styles/lumiere/scene-packets.mjs');
  let sent = new Map(),
    received = new Map();
  const paths = [{ path: 'M0,0L10,0' }];
  for (const [geometry, changed] of [
    [paths, true],
    [paths, false],
    [[{ path: 'M1,1' }], true],
  ]) {
    const leaves = [
      { id: 1, kind: 'graphics', paths: geometry },
      { id: 2, kind: 'batch', payload: 'binary-row' },
    ];
    const packet = encodeSceneResources(leaves, sent);
    sent = packet.paths;
    assert.equal(!!leaves[0].paths, changed);
    assert.equal(leaves[1].payload, undefined);
    const wire = JSON.parse(JSON.stringify(leaves));
    received = restoreSceneResources(wire, packet.rows, received);
    assert.deepEqual(wire[0].paths, geometry);
    assert.equal(wire[1].payload, 'binary-row');
  }
  assert.equal(restoreSceneResources([], [], received).size, 0);
});

test('sprite batches retain all six shader texels when the backing texture grows', () => {
  const nodes = Array.from({ length: 17 }, (_, i) => ({
    id: 'sprite-' + i,
    kind: 'solid',
    parent: null,
    filters: [],
    alpha: 0.5,
    matrix: [1, 0, i, 0, 1, 2 * i],
    frame: { x: 0, y: 0, width: 4, height: 8 },
    anchor: [0.5, 0.25],
    blendMode: 'normal',
    tint: 0xff00ff,
  }));
  const {
    leaves: [batch],
  } = batchHanabiFrame({ nodes, textures: [] }, 1100, 820, 1);
  const data = new Float32Array(unpackBytes(batch.payload));
  assert.equal(batch.count, nodes.length);
  assert.equal(data.length, batch.count * 24);
  for (let i = 0; i < batch.count; ++i) {
    assert.deepEqual(Array.from(data.subarray(i * 24, (i + 1) * 24)), [
      1,
      0,
      i,
      0,
      1,
      2 * i,
      4,
      8,
      -2,
      -2,
      -1,
      0.5,
      1,
      0,
      1,
      0,
      0,
      0,
      4,
      8,
      0,
      0,
      1,
      1,
    ]);
  }
});

test('Lumiere streams nested transforms, filter groups and paint order identically to a retained snapshot', async () => {
  const { snapshotLumiereScene } =
    await import('../plugins/folia-lyrics-skin/qml/styles/lumiere/scene-snapshot.mjs');
  const { flattenLumiereScene } =
    await import('../plugins/folia-lyrics-skin/qml/styles/lumiere/frame-plan.mjs');
  function node(id, kind, extra = {}) {
    return {
      id,
      kind,
      x: id,
      y: 2,
      rotation: 0.15,
      skew: { x: 0, y: 0 },
      scale: { x: 1, y: 0.8 },
      pivot: { x: 0, y: 0 },
      visible: true,
      renderable: true,
      alpha: 0.8,
      zIndex: id,
      blendMode: 'normal',
      children: [],
      paths: [],
      ...extra,
    };
  }
  const root = node(1, 'container', { sortableChildren: true });
  const group = node(2, 'container', {
    filterArea: { x: 0, y: 0, width: 64, height: 64 },
    filters: [{ kind: 'copy', alpha: 0.7, resolution: 1, enabled: true }],
  });
  const shape = node(3, 'graphics', { paths: [{ path: 'M0,0L10,0Z' }] });
  const nested = node(4, 'graphics');
  root.children.push(node(5, 'graphics'), group);
  group.parent = root;
  group.children.push(shape);
  shape.parent = group;
  shape.children.push(nested);
  nested.parent = shape;
  const options = { resolution: 2, inheritBlend: true };
  const expected = flattenLumiereScene(snapshotLumiereScene(root, options), 240, 180, 2);
  const streamed = snapshotLumiereScene(root, {
    ...options,
    viewport: { width: 240, height: 180 },
  });
  assert.deepEqual(streamed, expected);
  assert.deepEqual(
    streamed.leaves.map((n) => n.id),
    [3, 4, 5],
  );
  assert.deepEqual(
    streamed.leaves.map((n) => n.parent),
    [2, 2, null],
  );
});

test('Fume sparks retain the complete shadow quad when it intersects a viewport edge', async () => {
  const { sparkGeometry, visibleSpark } =
    await import('../plugins/folia-lyrics-skin/qml/styles/fume/vector.mjs');
  for (const dpr of [1, 1.25, 2]) {
    const command = { matrix: [1, 0, 0, 1, 0, 50], radius: 24, blur: 12 };
    const geometry = sparkGeometry(command, dpr);
    command.matrix[4] = 100 + geometry.extent + 0.5 / dpr;
    assert.deepEqual(visibleSpark(command, dpr, 100, 100), geometry);
    command.matrix[4] += 2 / dpr;
    assert.equal(visibleSpark(command, dpr, 100, 100), null);
  }
});

test('Fume cached outlines follow original shape, width and stroke, independent of camera translation', async () => {
  const { createRecorder, strokeOutline, sparkTextures } =
    await import('../plugins/folia-lyrics-skin/qml/styles/fume/vector.mjs');
  const r = createRecorder(),
    original = {};
  for (const [w, pen, translation] of [
    [80, 0.5, 0],
    [80, 0.5, 30],
    [80, 2, 0],
    [95, 0.5, -5],
  ]) {
    r.reset();
    r.setStrokeShape(original, w, 12);
    r.translate(translation, 10);
    r.lineWidth = pen;
    r.beginPath();
    r.rect(0, 0, w, 12);
    r.stroke();
    assert.equal(r.commands[0].outline, strokeOutline(r.commands[0].path, pen));
    assert.equal(r.commands[0].matrix[4], translation);
  }
  const commands = [{ matrix: [1, 0, 0, 1, 40, 40], radius: 15, blur: 11 }];
  const roomy = sparkTextures(commands, 2, 100, 100, 32 * 1024 * 1024)[0];
  assert.ok(roomy.storageSize >= roomy.physicalSize);
  assert.equal(roomy.storageSize % 64, 0);
  assert.equal(roomy.bytes, roomy.storageSize ** 2 * 8);
  const exact = sparkTextures(commands, 2, 100, 100, 8 * roomy.physicalSize ** 2)[0];
  assert.equal(exact.bytes, 8 * exact.physicalSize ** 2);
  assert.equal(sparkTextures(commands, 1.25, 100, 100, 32 * 1024 * 1024)[0].storageSize, undefined);
});
