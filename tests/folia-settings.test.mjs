import assert from 'node:assert/strict';
import test from 'node:test';
import { compile, project } from '../plugins/folia-lyrics-skin/qml/shared/lyricFilter.mjs';
import {
  appearance,
  renderSettings,
  theme,
} from '../plugins/folia-lyrics-skin/qml/shared/theme/project.mjs';
import {
  extractColorsFromPixels,
  generateBuiltinDualTheme,
  sanitizeDualTheme,
} from '../plugins/folia-lyrics-skin/qml/shared/theme/kernel.mjs';
import { getContrastRatio } from '../plugins/folia-lyrics-skin/qml/shared/theme/color-math.mjs';

test('Folia filtering preserves host identity and timing, substitutes only the first eligible credit', () => {
  const row = Object.freeze({
    lineText: '作词：测试',
    startTime: 1,
    endTime: 4,
    words: [{ text: '作词' }],
    translation: 'credits',
    romanization: 'credit',
    alternateTexts: ['x'],
    filtered: false,
  });
  const matcher = compile('', true);
  const title = project(row, 2, 2, matcher, '歌曲', '歌手');
  assert.equal(title.lineText, '歌曲 - 歌手');
  assert.equal(title.startTime, 1);
  assert.equal(title.endTime, 4);
  assert.deepEqual(title.words, []);
  assert.deepEqual(title.alternateTexts, []);
  assert.equal(title.translation, '');
  assert.equal(title.romanization, '');
  assert.equal(project(row, 3, 2, matcher, '歌曲', '歌手').filtered, true);
  assert.equal(row.filtered, false);
  assert.equal(row.lineText, '作词：测试');
  const rejected = Object.freeze({ ...row, filtered: true });
  assert.equal(project(rejected, 0, 0, matcher, 'a', 'b'), rejected);
  const lyric = { ...row, lineText: '晚风吹过山岗' };
  assert.equal(project(lyric, 4, 2, matcher, 'a', 'b'), lyric);
  assert.equal(project(row, 2, 2, compile('', false), 'a', 'b'), row);
});
test('Folia filtering handles translation-only rows and repeated stateful matching', () => {
  const matcher = /credits/g;
  const row = { lineText: '', translation: 'credits', filtered: false };
  for (let i = 0; i < 4; ++i) assert.equal(project(row, 3, 1, matcher, '', '').filtered, true);
  assert.throws(() => compile('[', true), SyntaxError);
  assert.equal(compile('[', false), null);
});
test('Folia theme projection does not mutate the host palette or persist derived word colors', () => {
  const host = Object.freeze({
    main: '#010203',
    text: '#040506',
    accent: '#070809',
    unrelated: 42,
  });
  const settings = Object.freeze({ themeMode: 'default', themeDaylight: false, wordColors: [] });
  const actual = appearance(host, settings);
  assert.equal(actual.main, '#09090b');
  assert.equal(actual.unrelated, 42);
  assert.equal(host.main, '#010203');
  assert.equal(actual.themeMetadata.description, '');
  assert.equal(theme({ ...settings, themeDaylight: true }).backgroundColor, '#fafafa');
  const custom = {
    light: {
      ...theme({ ...settings, themeDaylight: true }),
      wordColors: [{ word: '风', color: '#abcdef' }],
    },
    dark: theme(settings),
  };
  const derived = renderSettings({
    ...settings,
    themeDaylight: true,
    themeMode: 'custom',
    themeCustom: custom,
  });
  assert.deepEqual(derived.wordColors, custom.light.wordColors);
  assert.deepEqual(settings.wordColors, []);
  const explicit = [{ word: '雨', color: '#123456' }];
  assert.equal(renderSettings({ ...settings, wordColors: explicit }).wordColors, explicit);
});
test('Pinned cover theme extraction ignores transparent pixels and builds readable dual palettes', () => {
  const pixels = [];
  for (let i = 0; i < 400; ++i) pixels.push(30, 130, 230, 255);
  for (let i = 0; i < 400; ++i) pixels.push(250, 20, 20, 0);
  const palette = extractColorsFromPixels(pixels, 5);
  const dual = generateBuiltinDualTheme(palette);
  for (const side of ['light', 'dark']) {
    assert.match(dual[side].backgroundColor, /^#[0-9a-f]{6}$/i);
    assert.ok(getContrastRatio(dual[side].primaryColor, dual[side].backgroundColor) >= 4.5);
  }
  const sanitized = sanitizeDualTheme(
    { light: { backgroundColor: 'bad', primaryColor: '#abc' }, dark: {} },
    dual,
  );
  assert.equal(sanitized.light.backgroundColor, dual.light.backgroundColor);
  assert.equal(sanitized.light.primaryColor, '#aabbcc');
  assert.ok(generateBuiltinDualTheme(extractColorsFromPixels([], 5)).dark);
});
