import { rangeContains } from './contract.mjs';

// Publication-time validation uses the complete source set. Runtime decisions
// still belong to the host and include enabled state and activation failures.
export function dependencyOrder(manifests) {
  const nodes = new Map(manifests.map((manifest) => [manifest.id, manifest]));
  if (nodes.size !== manifests.length) throw new Error('Duplicate plugin ID');
  const before = new Map(manifests.map((manifest) => [manifest.id, new Set()]));
  for (const manifest of manifests) {
    for (const [id, range] of Object.entries(manifest.dependencies ?? {})) {
      if (!nodes.has(id))
        throw new Error(`Missing plugin dependency: ${manifest.id} requires ${id} ${range}`);
      if (!rangeContains(range, nodes.get(id).version))
        throw new Error(
          `Plugin dependency version mismatch: ${manifest.id} requires ${id} ${range}`,
        );
      before.get(manifest.id).add(id);
    }
    for (const [id, range] of Object.entries(manifest.optionalDependencies ?? {})) {
      if (!nodes.has(id)) continue;
      if (!rangeContains(range, nodes.get(id).version))
        throw new Error(`Optional plugin dependency version mismatch: ${id}`);
      before.get(manifest.id).add(id);
    }
    for (const [id, range] of Object.entries(manifest.conflicts ?? {}))
      if (nodes.has(id) && rangeContains(range, nodes.get(id).version))
        throw new Error(`Conflicting plugins: ${manifest.id} and ${id}`);
    for (const id of manifest.loadAfter ?? []) if (nodes.has(id)) before.get(manifest.id).add(id);
    for (const id of manifest.loadBefore ?? []) if (nodes.has(id)) before.get(id).add(manifest.id);
  }
  const order = [],
    pending = new Set(nodes.keys());
  while (pending.size) {
    const ready = [...pending]
      .sort()
      .filter((id) => ![...before.get(id)].some((dependency) => pending.has(dependency)));
    if (!ready.length)
      throw new Error(`Cyclic plugin dependency/load order: ${[...pending].sort().join(' -> ')}`);
    for (const id of ready) {
      order.push(id);
      pending.delete(id);
    }
  }
  return order;
}
