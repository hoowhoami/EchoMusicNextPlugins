import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveSubtitleContent,
  subtitleGeometry,
  subtitleSize,
} from '../plugins/folia-lyrics-skin/qml/shared/subtitle.mjs';

test('shared subtitles preserve ordered tracks, deduplication, alternate text and marker filtering', () => {
  const active = { translation: '在海边', romanization: 'hǎi biān', fullText: '海边' };
  assert.deepEqual(
    resolveSubtitleContent({ subtitleContentMode: 'both' }, active, null, []).tracks,
    [
      { role: 'romanization', text: 'hǎi biān' },
      { role: 'translation', text: '在海边' },
    ],
  );
  assert.deepEqual(
    resolveSubtitleContent(
      { subtitleContentMode: 'both' },
      { translation: 'hello', romanization: 'hello' },
      null,
      [],
    ).tracks,
    [{ role: 'romanization', text: 'hello' }],
  );
  assert.deepEqual(
    resolveSubtitleContent(
      {},
      { translation: ' // ●— ' },
      { alternateTexts: [{ role: 'translation', text: ' 海边 ' }] },
      [],
    ).tracks,
    [{ role: 'translation', text: '海边' }],
  );
});
test('hide translation suppresses the entire overlay while mode none retains readable next-line previews', () => {
  const next = [{ fullText: ' // ●— ' }, { fullText: 'Another morning' }];
  const hidden = resolveSubtitleContent({ hideTranslationSubtitle: true }, {}, null, next);
  assert.equal(hidden.shouldRender, false);
  assert.deepEqual(hidden.upcoming, []);
  assert.deepEqual(
    resolveSubtitleContent({ subtitleContentMode: 'none' }, {}, null, next).upcoming,
    [next[1]],
  );
  assert.deepEqual(resolveSubtitleContent({}, null, null, next).upcoming, []);
});
test('shared subtitle font clamps and capsule presence use exact Folia values', () => {
  assert.deepEqual(subtitleGeometry(1100, 1, 1, 32, 1), {
    translation: 20,
    upcoming: 16,
    bottom: 112,
  });
  assert.deepEqual(subtitleGeometry(320, 1, 1, 100, 0), {
    translation: 18,
    upcoming: 14,
    bottom: 32,
  });
  assert.equal(subtitleGeometry(1100, 1.4, 1.4, 100, 0.5).translation, 39.2);
  assert.equal(subtitleGeometry(1100, 1, 1, 100, 0.5).bottom, 106);
});

test('Partita and Claddagh preserve their own source subtitle size overrides', () => {
  assert.equal(subtitleSize(1100, 1, 1, false, 1, 'partita'), 19.2);
  assert.equal(subtitleSize(200, 1, 1, false, 1, 'partita'), 16.8);
  assert.equal(subtitleSize(1100, 1, 1, true, 1, 'partita'), 16);
  assert.equal(subtitleSize(1100, 1, 1, false, 1, 'claddagh'), 23.2);
  assert.equal(subtitleSize(1100, 1.4, 1, false, 1, 'claddagh'), 23.2);
  assert.equal(subtitleSize(200, 1, 1, true, 1, 'claddagh'), 15.2);
});
