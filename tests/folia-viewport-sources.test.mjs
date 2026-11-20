import './fixtures/qt-binary.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { createLumiereBackend } from '../plugins/folia-lyrics-skin/qml/styles/lumiere/backend.mjs';
import { createCanvas } from '../plugins/folia-lyrics-skin/qml/styles/lumiere/canvas.mjs';
import { createBloomFilter } from '../plugins/folia-lyrics-skin/qml/styles/lumiere/source/light/bloomFilter.mjs';
import { snapshotLumiereScene } from '../plugins/folia-lyrics-skin/qml/styles/lumiere/scene-snapshot.mjs';

test('clipped filter sources allocate nothing and republish their preparation program on reentry', () => {
  const pixi = createLumiereBackend(),
    root = new pixi.Container(),
    group = new pixi.Container();
  const canvas = createCanvas();
  canvas.width = 80;
  canvas.height = 40;
  canvas.getContext('2d').fillRect(0, 0, 80, 40);
  const source = pixi.Texture.from(canvas);
  group.addChild(new pixi.Sprite(source));
  group.filters = [
    createBloomFilter(pixi, {
      strength: 1,
      threshold: 0.4,
      knee: 0.2,
      levels: 5,
      spread: 0.8,
      padding: 10,
      tint: [1, 1, 1],
    }),
  ];
  root.addChild(group);
  const options = { viewport: { width: 400, height: 300 }, resolution: 2, textureCache: new Map() };
  let frame = snapshotLumiereScene(root, options);
  assert.equal(frame.textures.length, 1);
  assert.ok(frame.textures[0].commands);
  const first = frame.textures[0].revision;
  frame = snapshotLumiereScene(root, options);
  assert.equal(frame.textures[0].commands, undefined);
  group.position.x = 1000;
  frame = snapshotLumiereScene(root, options);
  assert.equal(frame.leaves.length, 0);
  assert.equal(frame.textures.length, 0);
  assert.equal(options.textureCache.size, 1);
  group.position.x = 0;
  frame = snapshotLumiereScene(root, options);
  assert.ok(frame.textures[0].commands);
  assert.equal(frame.textures[0].revision, first);
  root.destroy({ children: true });
  source.destroy(true);
});

test('offscreen sprites inside a visible filter retain all padded edge contributions', () => {
  const pixi = createLumiereBackend(),
    root = new pixi.Container(),
    group = new pixi.Container();
  const canvas = createCanvas();
  canvas.width = 20;
  canvas.height = 20;
  canvas.getContext('2d').fillRect(0, 0, 20, 20);
  const texture = pixi.Texture.from(canvas),
    sprite = new pixi.Sprite(texture);
  group.addChild(sprite);
  root.addChild(group);
  group.filterArea = new pixi.Rectangle(0, 0, 400, 300);
  group.filters = [
    createBloomFilter(pixi, {
      strength: 1,
      threshold: 0.4,
      knee: 0.2,
      levels: 5,
      spread: 0.8,
      padding: 48,
      tint: [1, 1, 1],
    }),
  ];
  const options = { viewport: { width: 400, height: 300 }, resolution: 2, textureCache: new Map() };
  sprite.position.x = -65;
  let frame = snapshotLumiereScene(root, options);
  assert.equal(frame.leaves.length, 1, 'source overlaps bloom padding');
  sprite.position.x = -72;
  frame = snapshotLumiereScene(root, options);
  assert.equal(frame.groups.length, 1);
  assert.equal(frame.leaves.length, 0);
  assert.equal(frame.textures.length, 0);
  sprite.position.x = 25;
  sprite.rotation = Math.PI / 4;
  frame = snapshotLumiereScene(root, options);
  assert.equal(frame.leaves.length, 1);
  assert.ok(frame.textures[0].commands);
  root.destroy({ children: true });
  texture.destroy(true);
});

test('allocation-free sprite culling retains every rotated, mirrored and tiled capture intersection', async () => {
  const { spriteIntersectsCapture } =
    await import('../plugins/folia-lyrics-skin/qml/styles/lumiere/frame-plan.mjs');
  for (let i = 0; i < 1000; i++) {
    const angle = i * 0.731,
      m = [
        Math.cos(angle) * (i % 2 ? -1 : 1),
        -Math.sin(angle),
        (i % 83) - 40,
        Math.sin(angle),
        Math.cos(angle) * (i % 3 ? -1 : 1),
        (i % 67) - 30,
      ];
    const node = {
      kind: 'sprite',
      texture: { frame: { width: 20, height: 30 } },
      anchor: [(i % 5) / 4, (i % 7) / 6],
    };
    if (i % 11 === 0) node.tile = { width: 45, height: 15 };
    const clip = { x: 0, y: 0, width: 40, height: 35, resolution: 1 + (i % 5) / 4 };
    const w = node.tile ? node.tile.width : 20,
      h = node.tile ? node.tile.height : 30,
      x = -node.anchor[0] * w,
      y = -node.anchor[1] * h;
    const points = [
        [x, y],
        [x + w, y],
        [x, y + h],
        [x + w, y + h],
      ].map(([x, y]) => [m[0] * x + m[1] * y + m[2], m[3] * x + m[4] * y + m[5]]),
      xs = points.map((p) => p[0]),
      ys = points.map((p) => p[1]),
      margin = 2 / clip.resolution;
    const reference =
      Math.max(...xs) >= -margin &&
      Math.min(...xs) <= clip.width + margin &&
      Math.max(...ys) >= -margin &&
      Math.min(...ys) <= clip.height + margin;
    assert.equal(spriteIntersectsCapture(node, { matrix: m, capture: clip }), reference);
  }
});

test('streamed sprite packets match retained snapshots byte for byte across groups and paint barriers', async () => {
  const { batchHanabiFrame } =
    await import('../plugins/folia-lyrics-skin/qml/styles/hanabi/batch-frame.mjs');
  const pixi = createLumiereBackend(),
    root = new pixi.Container(),
    group = new pixi.Container();
  group.position.set(13, 7);
  group.scale.set(0.7, 1.2);
  group.rotation = 0.3;
  group.filterArea = new pixi.Rectangle(0, 0, 400, 300);
  group.filters = [
    createBloomFilter(pixi, {
      strength: 1,
      threshold: 0.4,
      knee: 0.2,
      levels: 5,
      spread: 0.8,
      padding: 12,
      tint: [1, 1, 1],
    }),
  ];
  root.addChild(group);
  const canvas = createCanvas();
  canvas.width = 40;
  canvas.height = 30;
  canvas.getContext('2d').fillRect(0, 0, 40, 30);
  const texture = pixi.Texture.from(canvas);
  for (let i = 0; i < 120; i++) {
    const sprite = new pixi.Sprite(i % 3 ? texture : pixi.Texture.WHITE);
    sprite.position.set(((i * 37) % 480) - 40, ((i * 19) % 360) - 30);
    sprite.rotation = i * 0.17;
    sprite.scale.set(i % 2 ? -1 : 1, 0.75);
    sprite.anchor.set(0.5, 0.25);
    sprite.tint = 0x406080 + i;
    sprite.alpha = i % 9 ? 0.6 : 0;
    sprite.blendMode = i % 7 ? 'normal' : 'add';
    (i % 2 ? group : root).addChild(sprite);
    if (i % 13 === 0) {
      const barrier = new pixi.Container();
      barrier.kind = 'graphics';
      barrier.paths = [{ path: 'M0,0L10,0L0,10Z' }];
      (i % 2 ? group : root).addChild(barrier);
    }
  }
  const options = { viewport: { width: 400, height: 300 }, resolution: 2, inheritBlend: true };
  const reference = batchHanabiFrame(snapshotLumiereScene(root, options), 400, 300, 2);
  const actual = snapshotLumiereScene(root, { ...options, batchSprites: true });
  assert.deepEqual(actual, reference);
  root.destroy({ children: true });
  texture.destroy(true);
});

test('scratch affine matrices retain every bit, including aliasing and signed zero', async () => {
  const { localMatrix, multiply } =
    await import('../plugins/folia-lyrics-skin/qml/styles/sonnet/scene-graph.mjs');
  for (let i = 0; i < 300; i++) {
    const node = {
      rotation: i % 3 ? i * 0.0123 : -0,
      skew: { x: i % 5 ? 0.17 : -0, y: i % 7 ? 0.29 : 0 },
      scale: { x: i % 2 ? -1 : 1.3, y: 0.91 },
      pivot: { x: i % 13, y: i % 17 },
      x: i % 5 ? -i : -0,
      y: i * 0.2,
    };
    const expected = localMatrix(node),
      scratch = [];
    assert.equal(localMatrix(node, scratch), scratch);
    assert.deepEqual(scratch, expected);
    const parent = localMatrix({ ...node, x: i + 10, rotation: i * 0.22 }),
      result = multiply(parent, expected);
    assert.deepEqual(multiply(parent, scratch, scratch), result);
    const alias = parent.slice();
    assert.deepEqual(multiply(alias, expected, alias), result);
  }
});
