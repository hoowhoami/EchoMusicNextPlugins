// Pose-frame coalescing may skip a first revision, but never its immutable program.
// The ledger keeps only textures referenced by the current incoming frame.
export function retainTexturePrograms(frame, previous) {
  const retained = new Map();
  if (!frame) return { frame: null, retained };
  const textures = frame.textures.map((texture) => {
    const revision = texture.revision;
    const old = previous.get(texture.id);
    const commands = texture.commands || (old && old.revision === revision ? old.commands : null);
    if (commands) retained.set(texture.id, { revision, commands });
    return commands && !texture.commands ? Object.assign({}, texture, { commands }) : texture;
  });
  return { frame: Object.assign({}, frame, { textures }), retained };
}
