import assert from 'node:assert/strict';
import test from 'node:test';
import { retainMeasuredScenes } from '../plugins/folia-lyrics-skin/qml/styles/lumiere/measurement-retention.mjs';

test('new metrics invalidate only affected entries, including repeated unresolved reads and staged scenes', () => {
  let revision = 0,
    creditsRetired = 0,
    stagedRetired = 0;
  const removed = [];
  const runtime = {
    buildEntry(_, id) {
      if (id === 'new') ++revision;
      return {
        id,
        unit: {
          update(missing) {
            if (missing) ++revision;
          },
        },
      };
    },
    destroyEntry(entry) {
      removed.push(entry.id);
    },
    sceneCache: {
      scenes: new Map(),
      forEach(fn) {
        this.scenes.forEach(fn);
      },
    },
    credits: {
      build(missing) {
        if (missing) ++revision;
      },
      invalidate() {
        ++creditsRetired;
      },
    },
    songSwap: {
      staged: null,
      dropStaged() {
        ++stagedRetired;
        this.staged = null;
      },
    },
  };
  const tracked = retainMeasuredScenes(runtime, () => revision);
  const stable = runtime.buildEntry(null, 'stable'),
    next = runtime.buildEntry(null, 'new');
  runtime.sceneCache.scenes.set(0, stable);
  runtime.sceneCache.scenes.set(1, next);
  tracked.refresh();
  assert.deepEqual(removed, ['new']);
  assert.equal(runtime.sceneCache.scenes.get(0), stable);
  assert.equal(creditsRetired, 0);
  const affected = runtime.buildEntry(null, 'active');
  runtime.sceneCache.scenes.set(2, affected);
  affected.unit.update(true);
  runtime.songSwap.staged = runtime.buildEntry(null, 'new');
  runtime.credits.build(true);
  tracked.refresh();
  assert.deepEqual(removed, ['new', 'active']);
  assert.equal(stagedRetired, 1);
  assert.equal(creditsRetired, 1);
  tracked.refresh();
  assert.equal(creditsRetired, 1);
  assert.equal(runtime.sceneCache.scenes.get(0), stable);
  tracked.clear();
});
