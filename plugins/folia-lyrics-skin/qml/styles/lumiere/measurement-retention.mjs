// Re-measure only scenes that read provisional metrics. Unaffected source
// scenes keep their original identities, clocks and immutable glyph textures.
export function retainMeasuredScenes(runtime, revision) {
  const pending = new Set();
  let creditsPending = false;
  const build = runtime.buildEntry.bind(runtime);
  runtime.buildEntry = (...args) => {
    const before = revision(),
      entry = build(...args);
    if (revision() !== before) pending.add(entry);
    const update = entry.unit.update.bind(entry.unit);
    entry.unit.update = (...values) => {
      const before = revision();
      try {
        return update(...values);
      } finally {
        if (revision() !== before) pending.add(entry);
      }
    };
    return entry;
  };
  const credits = runtime.credits.build.bind(runtime.credits);
  runtime.credits.build = (...args) => {
    const before = revision();
    try {
      return credits(...args);
    } finally {
      if (revision() !== before) creditsPending = true;
    }
  };
  return {
    refresh() {
      runtime.sceneCache.forEach((entry, index) => {
        if (!pending.has(entry)) return;
        runtime.sceneCache.scenes.delete(index);
        runtime.destroyEntry(entry);
      });
      if (runtime.songSwap.staged && pending.has(runtime.songSwap.staged))
        runtime.songSwap.dropStaged();
      if (creditsPending) runtime.credits.invalidate();
      pending.clear();
      creditsPending = false;
    },
    clear() {
      pending.clear();
      creditsPending = false;
    },
  };
}
