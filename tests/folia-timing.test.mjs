import { test } from 'node:test';
import assert from 'node:assert/strict';

async function timing() {
  return import('../plugins/folia-lyrics-skin/qml/shared/timing.mjs');
}

test('Folia normal, short and micro presentation hints retain the upstream millisecond boundaries', async () => {
  const { lineProfile } = await timing();
  const profile = (durationMs) =>
    lineProfile(
      { startMs: 0, durationMs, words: [{ text: '词', start_ms: 0, duration_ms: durationMs }] },
      0,
    );
  assert.deepEqual(
    [profile(50).transitionMode, profile(50).revealMode, profile(50).renderEndMs],
    ['none', 'instant', 67],
  );
  assert.deepEqual(
    [profile(150).transitionMode, profile(150).revealMode, profile(150).renderEndMs],
    ['fast', 'fast', 213],
  );
  assert.deepEqual(
    [profile(500).transitionMode, profile(500).revealMode, profile(500).renderEndMs],
    ['normal', 'normal', 740],
  );
  assert.equal(profile(100).transitionMode, 'fast');
  assert.equal(profile(180).transitionMode, 'normal');
});

test('word presentation applies the host offset once and never changes source timestamps', async () => {
  const { lineProfile, wordPresentation } = await timing();
  const row = {
    startMs: 1500,
    durationMs: 500,
    words: [{ text: '词', start_ms: 1000, duration_ms: 500 }],
  };
  const original = structuredClone(row);
  const profile = lineProfile(row, 500);
  const word = wordPresentation(row.words[0], profile, 500);
  assert.equal(word.startMs, 1500);
  assert.equal(word.endMs, 2000);
  assert.equal(profile.renderEndMs, 2240);
  assert.deepEqual(row, original);
});

test('word state is reversible after a seek and preserves long notes and exact end boundaries', async () => {
  const { lineProfile, wordPresentation, wordState } = await timing();
  const row = {
    startMs: 1000,
    durationMs: 4000,
    words: [{ text: '长音', start_ms: 1000, duration_ms: 4000 }],
  };
  const word = wordPresentation(row.words[0], lineProfile(row), 0);
  assert.equal(wordState(word, 849), 'waiting');
  assert.equal(wordState(word, 850), 'active');
  assert.equal(wordState(word, 4999), 'active');
  assert.equal(wordState(word, 5000), 'active');
  assert.equal(wordState(word, 5001), 'passed');
  assert.equal(wordState(word, 500), 'waiting');
  assert.equal(word.displayDurationMs, 4000);
});
