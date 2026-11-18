// Preserve painter order and filter parents; consecutive sprites use one native draw.
import { packBytes } from '../../shared/binary.mjs';
import { flattenLumiereScene } from '../lumiere/frame-plan.mjs';
// sprites.vert reads six RGBA texels per instance.
const floatsPerSprite = 6 * 4;
const identity = [1, 0, 0, 0, 1, 0];
export function batchHanabiFrame(snapshot, width, height, resolution) {
  const result = snapshot.leaves
      ? snapshot
      : flattenLumiereScene(snapshot, width, height, resolution),
    specs = new Map(result.textures.map((t) => [t.id, t]));
  const leaves = [];
  let batch = null,
    floats = null,
    lastOrder = -1;
  function finish() {
    if (!batch) return;
    batch.capacity = floats.length / floatsPerSprite;
    const used = batch.count * floatsPerSprite * Float32Array.BYTES_PER_ELEMENT;
    batch.payload = packBytes(
      used === floats.byteLength ? floats.buffer : floats.buffer.slice(0, used),
    );
    leaves.push(batch);
    batch = null;
    floats = null;
  }
  for (const node of result.leaves) {
    if (node.kind !== 'sprite' && node.kind !== 'solid') {
      finish();
      leaves.push(node);
      continue;
    }
    const source = node.kind === 'solid' ? null : node.texture.source;
    if (
      !batch ||
      batch.parent !== node.parent ||
      batch.blendMode !== node.blendMode ||
      lastOrder + 1 !== node.order ||
      batch.count >= 2048 ||
      (source && !batch.sources.includes(source) && batch.sources.length === 8)
    ) {
      finish();
      floats = new Float32Array(16 * floatsPerSprite);
      batch = {
        id: 'batch-' + node.id,
        kind: 'batch',
        parent: node.parent,
        order: node.order,
        matrix: identity,
        alpha: 1,
        blendMode: node.blendMode,
        sources: [],
        count: 0,
      };
    }
    if (source && !batch.sources.includes(source)) batch.sources.push(source);
    const slot = source ? batch.sources.indexOf(source) : -1;
    const texture = source ? specs.get(source) : { width: 1, height: 1 };
    const rect = node.texture ? node.texture.frame : node.frame;
    const w = node.tile ? node.tile.width : rect.width,
      h = node.tile ? node.tile.height : rect.height;
    const m = node.matrix,
      tint = node.tint,
      tile = node.tile;
    const offset = batch.count * floatsPerSprite;
    if (offset === floats.length) {
      const larger = new Float32Array(floats.length * 2);
      larger.set(floats);
      floats = larger;
    }
    floats.set(m, offset);
    floats[offset + 6] = w;
    floats[offset + 7] = h;
    floats[offset + 8] = -node.anchor[0] * w;
    floats[offset + 9] = -node.anchor[1] * h;
    floats[offset + 10] = slot;
    floats[offset + 11] = node.alpha;
    floats[offset + 12] = ((tint >> 16) & 255) / 255;
    floats[offset + 13] = ((tint >> 8) & 255) / 255;
    floats[offset + 14] = (tint & 255) / 255;
    floats[offset + 15] = tile ? 1 : 0;
    floats[offset + 16] = rect.x / texture.width;
    floats[offset + 17] = rect.y / texture.height;
    floats[offset + 18] = rect.width / texture.width;
    floats[offset + 19] = rect.height / texture.height;
    floats[offset + 20] = tile ? tile.x : 0;
    floats[offset + 21] = tile ? tile.y : 0;
    floats[offset + 22] = tile ? texture.width * tile.scaleX : 1;
    floats[offset + 23] = tile ? texture.height * tile.scaleY : 1;
    ++batch.count;
    lastOrder = node.order;
  }
  finish();
  return Object.assign({}, result, { leaves });
}
