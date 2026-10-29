import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
const url = new URL(
  '../plugins/folia-lyrics-skin/qml/styles/sonnet/scene-graph.mjs',
  import.meta.url,
);
async function adapter() {
  assert.ok(existsSync(url), 'Real immutable native scene adapter must exist');
  return import(url);
}
test('Container preserves Pixi affine pivot/rotation/skew/scale and reparent order', async () => {
  const g = await adapter(),
    p = g.createSceneGraph();
  const a = new p.Container(),
    b = new p.Container(),
    n = new p.Container();
  a.addChild(n);
  b.addChild(n);
  assert.equal(a.children.length, 0);
  assert.equal(b.children[0], n);
  n.position.set(31, -7);
  n.pivot.set(4, 6);
  n.scale.set(-2, 0.6);
  n.rotation = 0.7;
  n.skew.set(0.11, -0.2);
  const c = Math.cos(0.7 - 0.2) * -2,
    s = Math.sin(0.7 - 0.2) * -2,
    x = -Math.sin(0.7 - 0.11) * 0.6,
    y = Math.cos(0.7 - 0.11) * 0.6;
  assert.deepEqual(g.localMatrix(n), [c, x, 31 - 4 * c - 6 * x, s, y, -7 - 4 * s - 6 * y]);
});
test('Graphics records every ordered fill/stroke and source holes as actual source triangles', async () => {
  const g = await adapter(),
    p = g.createSceneGraph(),
    n = new p.Graphics();
  n.rect(0, 0, 100, 100)
    .fill({ color: 0xff0000, alpha: 0.5 })
    .rect(20, 20, 30, 30)
    .cut()
    .moveTo(0, 50)
    .lineTo(100, 50)
    .stroke({ color: 0xffffff, width: 2 });
  const s = g.snapshot(n);
  assert.equal(s.nodes[0].paths.length, 2);
  const fill = s.nodes[0].paths[0];
  assert.equal(fill.fill, '#ff0000');
  assert.equal(fill.alpha, 0.5);
  assert.equal(fill.holeCount, 1);
  assert.ok(fill.path.includes('Z'));
  assert.equal(s.nodes[0].paths[1].stroke, '#ffffff');
  assert.equal(s.nodes[0].paths[1].width, 2);
  assert.equal(fill.area, 9100);
});
test('Text never invents a width and retains full real native font/style inputs', async () => {
  const g = await adapter(),
    p = g.createSceneGraph({
      measureText: ({ text, style }) => ({
        width: text === 'AV' ? 19 : 0,
        height: 23,
        baseline: 17,
      }),
    });
  const text = new p.Text({
    text: 'AV',
    style: new p.TextStyle({
      fontFamily: ['one', 'two'],
      fontSize: 20,
      fontWeight: '300',
      fontStyle: 'italic',
      fill: '#123456',
    }),
  });
  text.anchor.set(0.5);
  assert.equal(text.width, 19);
  assert.equal(text.height, 23);
  assert.deepEqual(text.getLocalBounds(), { x: -9.5, y: -11.5, width: 19, height: 23 });
  const s = g.snapshot(text);
  assert.deepEqual(s.nodes[0].style.fontFamily, ['one', 'two']);
  assert.throws(
    () => new (g.createSceneGraph().Text)({ text: 'AV', style: { fontSize: 20 } }).width,
    /native.*measure/i,
  );
});
test('Geometry and pose snapshot budgets fail explicitly before unbounded publication', async () => {
  const g = await adapter(),
    p = g.createSceneGraph(),
    n = new p.Container();
  for (let i = 0; i < 5; i++) n.addChild(new p.Graphics().circle(i, 0, 2).fill(0xffffff));
  assert.throws(() => g.snapshot(n, { maxNodes: 4 }), /budget/);
  const snapshot = g.snapshot(n);
  n.position.set(10, 20);
  const poses = g.poseSnapshot(n);
  assert.equal(snapshot.nodes.length, poses.length);
  assert.equal(poses[0].matrix[2], 10);
  assert.equal(poses[0].matrix[5], 20);
  assert.equal('paths' in poses[1], false);
});
test('Distinct Graphics primitives retain their own fill alpha and local gradient space', async () => {
  const g = await adapter(),
    p = g.createSceneGraph(),
    n = new p.Graphics();
  n.circle(20, 20, 10).circle(28, 20, 10).fill({ color: 0xffffff, alpha: 0.5 });
  assert.equal(n.paths.length, 2);
  assert.equal(n.paths[0].bounds.x, 10);
  assert.equal(n.paths[1].bounds.x, 18);
  assert.equal(n.paths[0].alpha, 0.5);
});
test('A supplied fill style resets source defaults while omitted style reuses it', async () => {
  const g = await adapter(),
    p = g.createSceneGraph(),
    n = new p.Graphics();
  n.rect(0, 0, 10, 10)
    .fill({ color: 0xffffff, alpha: 0.2 })
    .rect(20, 0, 10, 10)
    .fill({ color: 0xff0000 })
    .rect(40, 0, 10, 10)
    .fill();
  assert.deepEqual(
    n.paths.map((v) => v.alpha),
    [0.2, 1, 1],
  );
});
test('Polygon bounds keep the original capped miter padding', async () => {
  const g = await adapter(),
    p = g.createSceneGraph(),
    n = new p.Graphics();
  n.poly([0, 0, 100, 0, 50, 10]).stroke({ width: 4, miterLimit: 3 });
  const b = n.getLocalBounds();
  assert.deepEqual(b, { x: -6, y: -6, width: 112, height: 22 });
});
test('Primitive rectangle bounds follow Pixi rectangle padding, distinct from polygon miter padding', async () => {
  const g = await adapter(),
    p = g.createSceneGraph(),
    n = new p.Graphics();
  n.rect(0, 0, 100, 10).stroke({ width: 4, miterLimit: 3 });
  assert.deepEqual(n.getLocalBounds(), { x: -2, y: -2, width: 104, height: 14 });
});
test('Native immutable geometry and affine bounds match real pinned Pixi recorded goldens', async () => {
  const g = await adapter(),
    p = g.createSceneGraph();
  for (const fixture of sourceGoldens) {
    const n = new p.Graphics();
    for (const step of fixture.steps) n[step.name].apply(n, step.args);
    const actual = n.getLocalBounds();
    for (const key of ['x', 'y', 'width', 'height'])
      assert.ok(
        Math.abs(actual[key] - fixture.bounds[key]) < 1e-6,
        fixture.name + ' ' + key + ': ' + actual[key] + ' vs ' + fixture.bounds[key],
      );
    assert.deepEqual(
      n.paths.map((v) => ({ fill: v.fill, stroke: v.stroke, width: v.width, alpha: v.alpha })),
      fixture.styles,
      fixture.name,
    );
  }
});
// BEGIN real Pixi scene goldens (generated)
const sourceGoldens = [
  {
    name: 'fill and stroke with actual cut hole',
    steps: [
      { name: 'rect', args: [0, 0, 100, 100] },
      { name: 'fill', args: [{ color: 16711680, alpha: 0.5 }] },
      { name: 'rect', args: [20, 20, 30, 30] },
      { name: 'cut', args: [] },
      { name: 'moveTo', args: [0, 50] },
      { name: 'lineTo', args: [100, 50] },
      { name: 'stroke', args: [{ color: 16777215, width: 2 }] },
    ],
    bounds: { x: -1, y: 0, width: 102, height: 100 },
    styles: [
      { fill: '#ff0000', stroke: 'transparent', width: 0, alpha: 0.5 },
      { fill: 'transparent', stroke: '#ffffff', width: 2, alpha: 1 },
    ],
  },
  {
    name: 'source rectangle stroke padding',
    steps: [
      { name: 'rect', args: [0, 0, 100, 10] },
      { name: 'stroke', args: [{ width: 4, miterLimit: 3 }] },
    ],
    bounds: { x: -2, y: -2, width: 104, height: 14 },
    styles: [{ fill: 'transparent', stroke: '#ffffff', width: 4, alpha: 1 }],
  },
  {
    name: 'source polygon miter cap',
    steps: [
      { name: 'poly', args: [[0, 0, 100, 0, 50, 10]] },
      { name: 'stroke', args: [{ width: 4, miterLimit: 3 }] },
    ],
    bounds: { x: -6, y: -6, width: 112, height: 22 },
    styles: [{ fill: 'transparent', stroke: '#ffffff', width: 4, alpha: 1 }],
  },
  {
    name: 'overlapping circle primitives',
    steps: [
      { name: 'circle', args: [20, 20, 10] },
      { name: 'circle', args: [28, 20, 10] },
      { name: 'fill', args: [{ color: 16777215, alpha: 0.5 }] },
    ],
    bounds: { x: 10, y: 10, width: 28, height: 20 },
    styles: [
      { fill: '#ffffff', stroke: 'transparent', width: 0, alpha: 0.5 },
      { fill: '#ffffff', stroke: 'transparent', width: 0, alpha: 0.5 },
    ],
  },
  {
    name: 'fill resets defaults and omitted fill retains style',
    steps: [
      { name: 'rect', args: [0, 0, 10, 10] },
      { name: 'fill', args: [{ color: 16777215, alpha: 0.2 }] },
      { name: 'rect', args: [20, 0, 10, 10] },
      { name: 'fill', args: [{ color: 16711680 }] },
      { name: 'rect', args: [40, 0, 10, 10] },
      { name: 'fill', args: [] },
    ],
    bounds: { x: 0, y: 0, width: 50, height: 10 },
    styles: [
      { fill: '#ffffff', stroke: 'transparent', width: 0, alpha: 0.2 },
      { fill: '#ff0000', stroke: 'transparent', width: 0, alpha: 1 },
      { fill: '#ff0000', stroke: 'transparent', width: 0, alpha: 1 },
    ],
  },
];
// END real Pixi scene goldens
test('Caller supplied retained-object limit releases slots on idempotent destroy', async () => {
  const g = await adapter();
  const p = g.createSceneGraph({ maxNodes: 2 }),
    a = new p.Container(),
    b = new p.Graphics();
  assert.equal(p.nodeCount, 2);
  assert.throws(() => new p.Text({ text: 'x' }), /retained-object budget/);
  b.destroy();
  b.destroy();
  assert.equal(p.nodeCount, 1);
  const c = new p.Container();
  a.addChild(c);
  a.destroy({ children: true });
  assert.equal(p.nodeCount, 0);
});
