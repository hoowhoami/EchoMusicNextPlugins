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
  assert.equal(data.length, batch.capacity * 24);
  assert.ok(data.subarray(batch.count * 24).every((value) => value === 0));
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

test('Lumiere particle size accessors preserve texture, anchor, zero-size and mirrored scale semantics', async () => {
  const { createLumiereBackend } =
    await import('../plugins/folia-lyrics-skin/qml/styles/lumiere/backend.mjs');
  const { createSceneGraph } =
    await import('../plugins/folia-lyrics-skin/qml/styles/sonnet/scene-graph.mjs');
  const backend = createLumiereBackend(),
    reference = createSceneGraph();
  for (const width of [0, 1, 37.25])
    for (const height of [0, 2, 19.5]) {
      const texture = { width, height };
      const actual = new backend.Sprite(texture),
        expected = new reference.Sprite(texture);
      for (const scale of [-2, -0, 0, 1.25]) {
        actual.scale.set(scale, -scale);
        expected.scale.set(scale, -scale);
        actual.anchor.set(0.37, 0.83);
        expected.anchor.set(0.37, 0.83);
        assert.equal(actual.width, expected.width);
        assert.equal(actual.height, expected.height);
        actual.setSize(26.5, -18.75);
        expected.width = 26.5;
        expected.height = -18.75;
        assert.deepEqual(actual.scale, expected.scale);
        assert.deepEqual(actual.getLocalBounds(), expected.getLocalBounds());
        texture.width = width * 1.7;
        texture.height = height * 0.8;
        assert.equal(actual.width, expected.width);
        assert.equal(actual.height, expected.height);
      }
      actual.destroy();
      expected.destroy();
    }
});

test('Lumiere shares all eight singing samples without changing either spot axis or wrap geometry', async () => {
  const { sampleSingingPositions, resolveSpotPoint, resolveSpotX } =
    await import('../plugins/folia-lyrics-skin/qml/styles/lumiere/source/text/windowTiming.mjs');
  for (const count of [0, 1, 7, 40]) {
    const glyphs = Array.from({ length: count }, (_, i) => ({
      index: count - 1 - i,
      timing: { start: i * 0.117, end: i * 0.117 + 0.263 },
    }));
    for (const window of [-1, 0, 0.3, 0.75])
      for (const time of [-2, 0, 0.2, 0.999, 3, 20]) {
        const positions = sampleSingingPositions(glyphs, time, window);
        assert.equal(positions.length, window <= 0 ? 1 : 8);
        for (const wrap of [0, 1]) {
          const path = Array.from({ length: count }, (_, i) => ({
            x: Math.sin(i * 0.3 + wrap) * 200,
            y: Math.cos(i * 0.7 + wrap) * 100,
          }));
          const expected = {
            x: resolveSpotX(
              glyphs.map((g) => ({ timing: g.timing, center: path[g.index].x })),
              time,
              window,
            ),
            y: resolveSpotX(
              glyphs.map((g) => ({ timing: g.timing, center: path[g.index].y })),
              time,
              window,
            ),
          };
          assert.deepEqual(resolveSpotPoint(glyphs, path, positions), expected);
        }
      }
  }
});

test('Lumiere shared trajectory samples preserve every original glyph value through seeks and overlapping flights', async () => {
  const { createWindowGeometry, toWorld } =
    await import('../plugins/folia-lyrics-skin/qml/styles/lumiere/source/text/windowGeometry.mjs');
  const { originalGlyphLocal } = await import('./fixtures/lumiere-window-glyph-oracle.mjs');
  const decay = { delay: 0.7, strength: 1.3 };
  const heroPx = 61.75;
  const geometry = createWindowGeometry({
    options: { height: 820, region: {}, heroPx, typography: 'horizontal', decay },
    lineCount: 0,
  });
  const original = originalGlyphLocal(heroPx, decay);
  const view = {
    line: { startTime: 3.2 },
    flow: [0, 1].map((o) =>
      [0, 1].map((w) => ({
        points: Array.from({ length: 17 }, (_, i) => ({
          x: (i - 8) * (19.25 + w * 7) * (1 - o),
          y: (i - 8) * (17.5 + w * 9) * o,
        })),
      })),
    ),
  };
  const glyphs = Array.from({ length: 17 }, (_, i) => ({
    index: i,
    vRotation: 0.2 * i,
    flight: {
      delay: i / 100,
      duration: 0.71,
      c1: { x: 25 - i, y: -38 + i },
      c2: { x: 19 + i, y: 31 - i },
      spin: 0.8 - i / 17,
    },
    scatter: { x: i / 17 - 0.5, y: 0.1 - i / 31 },
    drift: { dx: 0.2 - i / 39, dy: i / 42 - 0.1, spin: 0.17, speed: 0.7 + i / 23 },
    timing: { start: 3.2 + i / 8 },
    phase: i / 3,
    scale: 0.8 + i / 53,
  }));
  let comparisons = 0;
  for (const time of [10, 0, -3, 3.2, 3.21, 2.1, 15, 1.9, 3.5])
    for (const phase of [0, 0.001, 0.2, 0.49, 0.5, 0.9, 1])
      for (const fly of [false, true]) {
        const transform = {
          x: 137.25,
          y: -32.7,
          rotation: 0.8,
          scale: 1.27,
          restOrient: 1,
          restWrap: 0,
          moves: [
            { toOrient: 0, toWrap: 1, phase, fly },
            { toOrient: 1, toWrap: 1, phase: phase * 0.7, fly: !fly },
          ],
        };
        const frame = geometry.glyphFrame(view, time, transform);
        for (const glyph of glyphs) {
          const expected = original(view, glyph, time, transform);
          const actual = geometry.glyphLocal(view, glyph, time, transform, frame);
          assert.deepEqual(actual, expected);
          assert.deepEqual(geometry.glyphLocal(view, glyph, time, transform), expected);
          assert.deepEqual(toWorld(transform, actual, frame), toWorld(transform, expected));
          ++comparisons;
        }
      }
  assert.equal(comparisons, 2142);
});

test('native vector line paths retain segment bounds, continuation and signed-zero coordinates', async () => {
  const { createSceneGraph } =
    await import('../plugins/folia-lyrics-skin/qml/styles/sonnet/scene-graph.mjs');
  const { Graphics } = createSceneGraph();
  const line = new Graphics();
  line.moveTo(4, 8).lineTo(-6, -3).lineTo(12, 5).stroke({ width: 1.2, join: 'round' });
  assert.equal(line.paths[0].path, 'M4,8L-6,-3L12,5');
  assert.deepEqual(line.paths[0].bounds, { x: -6, y: -3, width: 18, height: 11 });
  line.lineTo(0, 0).stroke({ width: 2 });
  assert.equal(line.paths[1].path, 'M12,5L0,0');
  assert.deepEqual(line.paths[1].bounds, { x: 0, y: 0, width: 12, height: 5 });
  line.clear().moveTo(-0, -0).lineTo(-0, -0).stroke();
  const bounds = line.paths[0].bounds;
  assert.ok(Object.is(bounds.x, -0));
  assert.ok(Object.is(bounds.y, -0));
  assert.ok(Object.is(bounds.width, 0));
  assert.ok(Object.is(bounds.height, 0));
  line.destroy();
});
