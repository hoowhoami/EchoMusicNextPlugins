// Runs once per delivered worker frame. Geometry arrays belong to the scene's
// immutable path revision. A recreated scene has new arrays even if IDs repeat.
export function encodeSceneResources(leaves, previous) {
  const paths = new Map(),
    rows = [];
  let bytes = 0;
  for (const node of leaves) {
    if (node.kind === 'graphics') {
      paths.set(node.id, node.paths);
      if (node.paths === previous.get(node.id)) delete node.paths;
    } else if (node.kind === 'batch') {
      rows.push(node.payload);
      bytes += node.payload.length * 2;
      delete node.payload;
    }
  }
  return { paths, rows, bytes };
}

// Restore before the view can coalesce a frame. This also drops retired paths.
export function restoreSceneResources(leaves, rows, previous) {
  const paths = new Map();
  let i = 0;
  for (const node of leaves) {
    if (node.kind === 'graphics') {
      node.paths = node.paths || previous.get(node.id);
      if (!node.paths) throw Error('Missing retained vector geometry');
      node.retainedPaths = true;
      paths.set(node.id, node.paths);
    } else if (node.kind === 'batch') node.payload = rows[i++];
  }
  return paths;
}
