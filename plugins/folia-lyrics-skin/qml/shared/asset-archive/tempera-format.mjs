// Folia a8da4437 temperaImageArchiveFormat / pool editor semantics, AGPL-3.0.
// ZIP parsing, original bytes, limits and file authorization remain native services.
const extensions = new Map([
  ['image/png', 'png'],
  ['image/jpeg', 'jpg'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
  ['image/svg+xml', 'svg'],
]);
const mimeTypes = new Map([
  ['png', 'image/png'],
  ['jpg', 'image/jpeg'],
  ['jpeg', 'image/jpeg'],
  ['webp', 'image/webp'],
  ['gif', 'image/gif'],
  ['svg', 'image/svg+xml'],
]);
const horizontal = new Set(['left', 'center', 'right', 'free']);
const vertical = new Set(['top', 'center', 'bottom', 'free']);
function extension(name) {
  const match = String(name || '')
    .toLowerCase()
    .match(/\.([a-z0-9]+)$/);
  return match && mimeTypes.has(match[1]) ? match[1] : null;
}
function clamp(value, fallback, low, high) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(high, Math.max(low, value))
    : fallback;
}
export function normalizePlacement(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || typeof value.id !== 'string')
    return null;
  const id = value.id.trim();
  if (!id || id.length > 512 || /[\\/\u0000-\u001F]/.test(id)) return null;
  return {
    id,
    name: typeof value.name === 'string' && value.name.trim() ? value.name.trim() : 'image',
    align: horizontal.has(value.align) ? value.align : 'free',
    verticalAlign: vertical.has(value.verticalAlign) ? value.verticalAlign : 'bottom',
    scale: clamp(value.scale, 0.7, 0.05, 2),
    opacity: clamp(value.opacity, 1, 0, 1),
  };
}
export function entryPath(image, mimeType) {
  const ext = extensions.get(mimeType) || extension(image.name);
  if (!ext) throw new Error('Unsupported Tempera image type: ' + (mimeType || image.name));
  return 'images/' + image.id + '.' + ext;
}
export function collectEntries(entries, manifest) {
  const result = [];
  for (const raw of manifest) {
    const image = normalizePlacement(raw);
    if (!image) continue;
    const prefix = 'images/' + image.id;
    const entry = entries.find(
      (item) => item.path === prefix || (item.path.startsWith(prefix + '.') && extension(item.path))
    );
    if (!entry) continue;
    // The native header hint substitutes only source byte sniffing. Source path/name
    // extensions have the same priority, and native decoding validates the real bytes.
    const ext = extension(entry.path) || extension(image.name);
    const mimeType = ext ? mimeTypes.get(ext) : entry.mimeType;
    if (!extensions.has(mimeType)) continue;
    result.push({ image, mimeType, path: entry.path });
  }
  return result;
}
export function importPlan(lease, existingCount) {
  // QVariantMap holds Qt sequences: canonicalize to owned JSON arrays before
  // applying the original Array.isArray manifest guard.
  const json = JSON.parse(JSON.stringify(lease.jsonFiles || {})),
    meta = json['meta.json'];
  if (!meta || meta.kind !== 'folia-tempera-pool' || meta.schemaVersion !== 1)
    throw new Error('这不是 Folia 画布图片备份');
  const pool = json['pool.json'];
  if (!pool || typeof pool !== 'object') throw new Error('备份缺少 pool.json');
  const manifest = Array.isArray(pool.layerImages) ? pool.layerImages : [];
  const valid = collectEntries(Array.from(lease.entries || []), manifest);
  const accepted = valid.slice(0, Math.max(0, 16 - existingCount));
  return {
    rows: accepted,
    selections: accepted.map((row) => ({ path: row.path, name: row.image.name.slice(0, 128) })),
    skipped: manifest.length - valid.length,
    truncated: valid.length - accepted.length,
  };
}
export function acceptImported(plan, assets) {
  if (assets.length !== plan.rows.length) throw new Error('导入返回的图片数量不匹配');
  return plan.rows.map((row, index) => {
    const asset = assets[index];
    if (asset.entryPath !== row.path || !asset.handle) throw new Error('导入返回的图片顺序不匹配');
    return Object.assign({}, row.image, { id: asset.handle, name: asset.name || row.image.name });
  });
}
export function exportPlan(images, assets) {
  const entries = [],
    kept = [],
    paths = new Set();
  for (const image of images) {
    const asset = assets.find((item) => item.handle === image.id);
    if (!asset) continue;
    // Native IDs contain a namespace colon, which is forbidden in portable
    // ZIP paths. Archive-local IDs are independent of reminted native handles.
    const archived = Object.assign({}, image, { id: image.id.replace(/^asset:/, '') });
    const path = entryPath(archived, asset.mimeType);
    if (!paths.has(path)) {
      entries.push({ handle: image.id, path });
      paths.add(path);
    }
    kept.push(archived);
  }
  return {
    entries,
    jsonFiles: {
      'pool.json': { layerImages: kept },
      'meta.json': { kind: 'folia-tempera-pool', schemaVersion: 1, imageCount: kept.length },
    },
    skipped: images.length - kept.length,
    exported: kept.length,
  };
}
export function beginDraft(images, depth, frequency) {
  return { images: images.map((image) => Object.assign({}, image)), depth, frequency, added: [] };
}
export function addImages(draft, assets) {
  const room = Math.max(0, 16 - draft.images.length);
  const added = assets.slice(0, room).map((asset) => ({
    id: asset.handle,
    name: asset.name,
    align: 'free',
    verticalAlign: 'bottom',
    scale: 0.7,
    opacity: 1,
  }));
  return Object.assign({}, draft, {
    images: draft.images.concat(added),
    added: draft.added.concat(assets.map((asset) => asset.handle)),
  });
}
export function removeImage(draft, id) {
  return Object.assign({}, draft, { images: draft.images.filter((image) => image.id !== id) });
}
function sameImages(a, b) {
  return (
    a.length === b.length &&
    a.every((image, index) =>
      ['id', 'align', 'verticalAlign', 'scale', 'opacity'].every(
        (key) => image[key] === b[index][key]
      )
    )
  );
}
export function commitPlan(draft, images, depth, frequency) {
  const retained = draft.images.map((image) => image.id);
  const discarded = Array.from(new Set(images.map((image) => image.id).concat(draft.added))).filter(
    (id) => retained.indexOf(id) < 0
  );
  return {
    patch:
      draft.depth !== depth || draft.frequency !== frequency || !sameImages(draft.images, images)
        ? {
            temperaLayerImages: draft.images,
            temperaLayerImageDepth: draft.depth,
            temperaLayerImageFrequency: draft.frequency,
          }
        : null,
    retained,
    discarded,
  };
}
export function abortPlan(draft) {
  return draft.added.slice();
}
