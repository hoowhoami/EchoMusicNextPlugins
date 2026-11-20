// Immutable source images may be recreated by separate original scene entries.
// Share only an exactly equal raster program, including extent and all paint
// state. This ledger owns metadata, never GPU objects or shaping allocations.
export function createTextureIdentityLedger(maxBytes = 2 * 1024 * 1024, idleFrames = 60) {
  const entries = new Map();
  let serial = 0,
    frame = 0,
    bytes = 0;
  return {
    begin() {
      ++frame;
    },
    intern(texture) {
      if (!texture.commands) return texture;
      const key = JSON.stringify([
        texture.kind,
        texture.width,
        texture.height,
        texture.pixelWidth,
        texture.pixelHeight,
        texture.resolution,
        texture.commands,
      ]);
      let entry = entries.get(key);
      if (!entry) {
        const id = 'shared-texture:' + ++serial;
        entry = { texture: { ...texture, id, revision: serial }, bytes: key.length * 2, frame };
        entries.set(key, entry);
        bytes += entry.bytes;
      }
      entry.frame = frame;
      return entry.texture;
    },
    finish() {
      for (const [key, entry] of entries)
        if (frame - entry.frame > idleFrames) {
          entries.delete(key);
          bytes -= entry.bytes;
        }
      if (bytes > maxBytes)
        for (const [key, entry] of [...entries].sort((a, b) => a[1].frame - b[1].frame)) {
          if (bytes <= maxBytes) break;
          entries.delete(key);
          bytes -= entry.bytes;
        }
    },
    get bytes() {
      return bytes;
    },
  };
}
export function shareTextureIdentities(frame, ledger) {
  if (!frame) return null;
  ledger.begin();
  const aliases = new Map(),
    unique = new Map();
  for (const texture of frame.textures) {
    const shared = ledger.intern(texture);
    aliases.set(texture.id, shared.id);
    unique.set(shared.id, shared);
  }
  const leaves =
    frame.leaves &&
    frame.leaves.map((node) => {
      if (node.kind === 'batch')
        return { ...node, sources: node.sources.map((id) => aliases.get(id) ?? id) };
      if (node.kind === 'sprite')
        return {
          ...node,
          texture: {
            ...node.texture,
            source: aliases.get(node.texture.source) ?? node.texture.source,
          },
        };
      return node;
    });
  ledger.finish();
  return { ...frame, textures: [...unique.values()], ...(leaves ? { leaves } : {}) };
}
