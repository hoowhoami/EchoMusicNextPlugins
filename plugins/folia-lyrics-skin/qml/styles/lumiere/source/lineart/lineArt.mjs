// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/lumiere-reference.md.
import { compressLight, lightAt } from '../light/rig.mjs';
const lumiereScaleMask = 0 | 0;
const LUMIERE_NEUTRAL_OFFSET =
  (998123833 ^ lumiereScaleMask) +
  Math.imul(2021278663 ^ lumiereScaleMask, 4898 ^ lumiereScaleMask) -
  ((998123833 ^ lumiereScaleMask) +
    Math.imul(2021278663 ^ lumiereScaleMask, 4898 ^ lumiereScaleMask));
const LINE_ART_UNLOAD_AFTER = 2 + LUMIERE_NEUTRAL_OFFSET;
const LINE_ART_UNLOAD_LEAD = 4;
const shouldUnloadLineArt = (hiddenSince, time, nextUse) =>
  time - hiddenSince >= LINE_ART_UNLOAD_AFTER && nextUse - time >= LINE_ART_UNLOAD_LEAD;
const cumulative = (points) => {
  const lengths = [0];
  for (let i = 1; i < points.length; i += 1) {
    const [ax, ay] = points[i - 1];
    const [bx, by] = points[i];
    lengths.push(lengths[i - 1] + Math.hypot(bx - ax, by - ay));
  }
  return lengths;
};
const clamp01 = (value) => Math.min(1, Math.max(0, value));
const createLineArt = (pixi, options) => {
  const { height, spec } = options;
  const view = new pixi.Container();
  const pathsHolder = new pixi.Container({ isRenderGroup: true });
  const nodesHolder = new pixi.Container();
  view.addChild(pathsHolder, nodesHolder);
  const paths = spec.paths
    .filter((path) => path.points.length > 1)
    .map((path) => {
      const graphics = new pixi.Graphics();
      pathsHolder.addChild(graphics);
      const lengths = cumulative(path.points);
      const mid = path.points[Math.floor(path.points.length / 2)];
      return {
        spec: path,
        graphics,
        lengths,
        total: lengths[lengths.length - 1],
        drawn: -1,
        midpoint: mid,
      };
    });
  const nodes = spec.nodes.map((node) => {
    const sprite = new pixi.Sprite(options.starTexture);
    sprite.anchor.set(0.5);
    sprite.position.set(node.at[0] * height, node.at[1] * height);
    nodesHolder.addChild(sprite);
    return { spec: node, sprite };
  });
  const redraw = (path, amount) => {
    const g = path.graphics;
    g.clear();
    if (amount <= 0) return;
    const { points, dash } = path.spec;
    const limit = Math.min(amount, path.total);
    const period = dash ? dash[0] + dash[1] : 0;
    const at = (index, distance) => {
      const [ax, ay] = points[index - 1];
      const [bx, by] = points[index];
      const segment = path.lengths[index] - path.lengths[index - 1];
      const f = segment > 0 ? (distance - path.lengths[index - 1]) / segment : 0;
      return [(ax + (bx - ax) * f) * height, (ay + (by - ay) * f) * height];
    };
    g.moveTo(points[0][0] * height, points[0][1] * height);
    for (let i = 1; i < points.length; i += 1) {
      const start = path.lengths[i - 1];
      const end = Math.min(path.lengths[i], limit);
      if (start >= limit) break;
      if (!dash) {
        const [x, y] = at(i, end);
        g.lineTo(x, y);
        continue;
      }
      for (let k = Math.floor(start / period); k * period < end; k += 1) {
        const from = Math.max(start, k * period);
        const to = Math.min(end, k * period + dash[0]);
        if (to <= from) continue;
        const [ax, ay] = at(i, from);
        const [bx, by] = at(i, to);
        g.moveTo(ax, ay);
        g.lineTo(bx, by);
      }
    }
    const px = path.spec.width * height;
    g.stroke({ width: px * 3.2, color: 16777215, alpha: 0.12, cap: 'round', join: 'round' });
    g.stroke({ width: px, color: 16777215, alpha: 1, cap: 'round', join: 'round' });
  };
  let resident = false;
  let hiddenSince = Number.NaN;
  const update = (time, draw, fade, beams, color) => {
    resident = true;
    hiddenSince = Number.NaN;
    for (const path of paths) {
      const { delay, span } = path.spec;
      const local = clamp01((draw - delay) / Math.max(span, 1e-3));
      const eased = 1 - (1 - local) ** 3;
      const amount = eased * path.total;
      if (Math.abs(amount - path.drawn) > 1e-5) {
        redraw(path, amount);
        path.drawn = amount;
      }
      const lit = compressLight(lightAt(beams, path.midpoint[0], path.midpoint[1]));
      path.graphics.alpha = Math.min(1, path.spec.alpha * fade * (0.55 + 0.9 * lit));
      path.graphics.tint = color;
    }
    for (const { spec: node, sprite } of nodes) {
      const appear = clamp01((draw - node.delay) / 0.08);
      const lit = compressLight(lightAt(beams, node.at[0], node.at[1]));
      const twinkle = 0.55 + 0.45 * Math.sin(time * 2.3 + node.twinklePhase);
      const alpha = appear * fade * (0.25 + 0.75 * lit) * twinkle;
      sprite.visible = alpha > 4e-3;
      if (!sprite.visible) continue;
      const pop = 1 + (1 - appear) * 1.5;
      const px = node.size * height * pop * (0.8 + 0.2 * twinkle);
      sprite.width = px;
      sprite.height = px;
      sprite.alpha = alpha;
      sprite.tint = color;
    }
  };
  const idle = (time, nextUse) => {
    if (!resident) return;
    if (!(hiddenSince <= time)) hiddenSince = time;
    if (!shouldUnloadLineArt(hiddenSince, time, nextUse)) return;
    for (const path of paths) path.graphics.context.unload();
    resident = false;
  };
  return {
    view,
    update,
    idle,
    // context: true 必须带上：Pixi 8 的 Graphics.destroy 只要收到选项对象、却没写 context: true，就不销毁它自己建的
    // GraphicsContext。那个 context 还挂在渲染器的 GraphicsContextSystem 里，连同它的 GPU 批数据（一个 batcher、
    // 两块顶点 / 索引缓冲）要等 Pixi 的 GC 空闲 60 秒后才回收；单元换得勤时，WebGL 缓冲会一直涨到那个窗口的量。
    destroy: () => view.destroy({ children: true, context: true }),
  };
};
const showLineArtLayer = (holder, layers, index, shown) => {
  const view = layers[index].view;
  if (shown === (view.parent === holder)) return;
  if (!shown) {
    holder.removeChild(view);
    return;
  }
  let position = 0;
  for (let k = 0; k < index; k += 1) if (layers[k].view.parent === holder) position += 1;
  holder.addChildAt(view, position);
};
export {
  LINE_ART_UNLOAD_AFTER,
  LINE_ART_UNLOAD_LEAD,
  createLineArt,
  shouldUnloadLineArt,
  showLineArtLayer,
};
