import { fileURLToPath } from 'node:url';
import { foliaURL } from './folia-source.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const base = new URL('../plugins/folia-lyrics-skin/', import.meta.url);
async function fields() {
  const result = await build({
    entryPoints: [fileURLToPath(new URL('src/settings.ts', base))],
    bundle: true,
    write: false,
    format: 'esm',
    target: 'es2016',
    logLevel: 'silent',
  });
  return (
    await import(
      `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`
    )
  ).settingsFields;
}
test('source dependent settings keep their values but unmount inactive editors', async () => {
  const actual = await fields();
  const contracts = [
    ['classicWordSpacing', 'classicUseLegacyLayout', false],
    ['monetAudioStyle', 'monetShowAudioVisualization', true],
    ['cappellaEmojiPackSource', 'cappellaShowEmoMessages', true],
    ['latentOverlayOpacity', 'latentOverlayEnabled', true],
  ];
  for (const [key, parent, enabled] of contracts) {
    const field = actual.find((entry) => entry.key === key);
    assert.ok(field, key);
    assert.deepEqual(field.when, { key: parent, value: enabled }, key);
  }
});
test('shared harmony settings preserve source defaults, conditional background and subtitle reset', async () => {
  const result = await build({
    entryPoints: [fileURLToPath(new URL('src/config.ts', base))],
    bundle: true,
    write: false,
    format: 'esm',
    target: 'es2016',
    logLevel: 'silent',
  });
  const { defaults, validate } = await import(
    `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`
  );
  const actual = await fields();
  for (const key of ['showHarmonySubtitle', 'harmonySubtitleBackground']) {
    assert.equal(defaults[key], true, key);
    assert.equal(actual.find((field) => field.key === key).group, 'harmony');
    assert.notEqual(validate({ ...defaults, [key]: 'false' }), true);
  }
  assert.deepEqual(actual.find((field) => field.key === 'harmonySubtitleBackground').when, {
    key: 'showHarmonySubtitle',
    value: true,
  });
  const { resetPatch } = await import(new URL('qml/shared/settingsReset.mjs', base));
  const patch = resetPatch(defaults, 'subtitle', 'still', 'latent');
  assert.equal(patch.showHarmonySubtitle, true);
  assert.equal(patch.harmonySubtitleBackground, true);
});
test('source custom image choices require an imported collection and leave descriptors immutable', async () => {
  const { assetField, unavailableSelection } = await import(
    new URL('qml/shared/settingsPolicy.mjs', base)
  );
  const original = (await fields()).find((field) => field.key === 'cappellaAvatarSource');
  const empty = { avatars: false, emojis: false, portrait: false };
  assert.equal(
    assetField(original, empty).options.find((option) => option.value === 'custom').disabled,
    true,
  );
  assert.equal(original.options.find((option) => option.value === 'custom').disabled, undefined);
  assert.equal(
    assetField(original, { avatars: true }).options.find((option) => option.value === 'custom')
      .disabled,
    false,
  );
  for (const [key, collection, fallback] of [
    ['cappellaAvatarSource', 'avatars', 'builtin'],
    ['cappellaEmojiPackSource', 'emojis', 'builtin'],
    ['monetPortraitSource', 'portrait', 'cover'],
  ]) {
    assert.deepEqual(unavailableSelection({ [key]: 'custom' }, empty), { key, collection });
    assert.equal(unavailableSelection({ [key]: 'custom' }, { [collection]: true }), null);
    assert.equal(unavailableSelection({ [key]: fallback }, empty), null);
  }
});
test('shared opacity and original Fume sliders preserve source input increments', async () => {
  const actual = await fields();
  // a8da4437 VisPlaygroundSettingsPanel:467 and settingsPanels:214..264.
  for (const [key, step] of [
    ['subtitleOverlayOpacity', 0.05],
    ['fumeBackgroundObjectOpacity', 0.05],
    ['fumeTextHoldRatio', 0.05],
    ['fumeCameraSpeed', 0.05],
    ['fumeGlowIntensity', 0.05],
    ['fumeHeroScale', 0.02],
  ])
    assert.equal(actual.find((field) => field.key === key).step, step, key);
});
test('Latent settings match the source UI steps as well as resolver ranges', async () => {
  const actual = await fields();
  // a8da4437 LatentBackgroundSettingsCard:80..177.
  for (const [key, step] of [
    ['latentOverlayOpacity', 0.05],
    ['latentDitheringSpeed', 0.1],
    ['latentDitheringAudioSpeed', 0.1],
    ['latentDitheringSize', 0.25],
    ['latentDitheringOpacity', 0.05],
    ['latentMeshSpeed', 0.1],
    ['latentMeshAudioSpeed', 0.1],
    ['latentMeshDistortion', 0.05],
    ['latentMeshSwirl', 0.05],
  ])
    assert.equal(actual.find((field) => field.key === key).step, step, key);
});
test('shared geometry identity follows source song identity across title and transport changes', async () => {
  const { geometrySeed } = await import(new URL('qml/shared/presentationIdentity.mjs', base));
  const pinned = foliaURL('src/components/app/presentation/buildVisualizerTheme.ts');
  const result = await build({
    entryPoints: [fileURLToPath(pinned)],
    bundle: true,
    write: false,
    format: 'esm',
    target: 'es2016',
    logLevel: 'silent',
  });
  const { buildVisualizerTheme } = await import(
    `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`
  );
  const sourceSeed = (id, mode) =>
    String(
      buildVisualizerTheme({
        appStyle: {},
        theme: { backgroundColor: '#111' },
        lyricsFontStyle: 'sans',
        lyricsCustomFontFamily: null,
        currentSongId: id,
        visualizerMode: mode,
      }).visualizerGeometrySeed,
    );
  const first = { songId: '9223372036854775807', id: 'cloud:9223372036854775807', title: '同名' };
  assert.equal(geometrySeed(first, 'fume'), sourceSeed(first.songId, 'fume'));
  assert.equal(
    geometrySeed({ ...first, title: '水化后的标题', revision: '22' }, 'fume'),
    geometrySeed(first, 'fume'),
  );
  assert.notEqual(
    geometrySeed({ ...first, songId: '123', id: 'cloud:123' }, 'fume'),
    geometrySeed(first, 'fume'),
  );
  assert.equal(
    geometrySeed({ songId: '0', id: 'local:曲目A', title: '同名' }, 'tempera'),
    sourceSeed('local:曲目A', 'tempera'),
  );
  assert.equal(
    geometrySeed({ songId: '0', hash: 'stable-local-hash' }, 'fume'),
    'stable-local-hash',
  );
  assert.equal(geometrySeed({}, 'classic'), sourceSeed(null, 'classic'));
});
test('group resets affect only source-owned tuning and retain imported bytes and selection', async () => {
  const { resetPatch } = await import(new URL('qml/shared/settingsReset.mjs', base));
  const result = await build({
    entryPoints: [fileURLToPath(new URL('src/config.ts', base))],
    bundle: true,
    write: false,
    format: 'esm',
    target: 'es2016',
    logLevel: 'silent',
  });
  const { defaults } = await import(
    `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`
  );
  const common = resetPatch(defaults, 'common', 'monet', 'latent');
  assert.equal(common.visualizerOpacity, 1);
  assert.equal(common.fontWeight, null);
  assert.equal(common.lyricsFontScale, 1);
  assert.equal('mode' in common, false);
  assert.equal('showText' in common, false);
  assert.equal('wordColors' in common, false);
  const subtitle = resetPatch(defaults, 'subtitle', 'monet', 'latent');
  assert.equal(subtitle.subtitleContentMode, 'translation');
  assert.equal(subtitle.hideTranslationSubtitle, false);
  assert.equal(subtitle.subtitleFontInheritsLyrics, true);
  assert.equal('fontFamilies' in subtitle, false);
  const poster = resetPatch(defaults, 'style', 'monet', 'latent');
  assert.equal(poster.monetPortraitSource, 'cover');
  assert.equal(poster.monetPortraitOffsetX, 0);
  assert.equal('monetPortraitAsset' in poster, false);
  assert.equal('monetBackgroundSource' in poster, false);
  const picture = resetPatch(defaults, 'style', 'tempera', 'latent');
  assert.deepEqual(picture.temperaLayerImages, []);
  const background = resetPatch(defaults, 'background', 'monet', 'monet');
  assert.equal(background.monetBackgroundSource, 'cover-derived');
  assert.equal('monetPortraitSource' in background, false);
  assert.equal('backgroundMode' in background, false);
  assert.deepEqual(Object.keys(resetPatch(defaults, 'background', 'classic', 'common')).sort(), [
    'commonDisableGeometricBackground',
    'commonDisableVignette',
    'commonOpacity',
    'commonUseCoverColorBg',
  ]);
  common.fontFamilies.push('Menlo');
  assert.deepEqual(defaults.fontFamilies, ['follow']);
});
test('font category and ordered custom fallback resolve both original source stacks', async () => {
  const Native = await import(new URL('qml/shared/typography.mjs', base));
  const result = await build({
    entryPoints: [fileURLToPath(foliaURL('src/utils/fontStacks.ts'))],
    bundle: true,
    write: false,
    format: 'esm',
    target: 'es2016',
    logLevel: 'silent',
  });
  const Original = await import(
    `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`
  );
  const cssFamilies = (text) => Original.normalizeFontFamilyStack(text.split(/,\s*/));
  for (const style of ['sans', 'serif', 'mono']) {
    for (const families of [
      ['follow'],
      ['follow', 'Songti SC', 'Menlo'],
      ['Georgia', 'Songti SC', 'songti sc', 'Menlo'],
    ]) {
      const primary = families[0] === 'follow' ? undefined : families[0];
      const source = { fontStyle: style, fontFamily: primary, fontFamilyStack: families.slice(1) };
      const values = {
        fontStyle: style,
        fontFamilies: families,
        subtitleFontInheritsLyrics: true,
        subtitleFontStyle: 'mono',
        subtitleFontFamilies: ['Menlo'],
      };
      assert.deepEqual(
        Native.resolveFamilies(values, false),
        cssFamilies(Original.resolveThemeFontStack(source)),
      );
      assert.deepEqual(
        Native.resolveFamilies(values, true),
        cssFamilies(Original.resolveThemeTranslationFontStack(source)),
      );
    }
  }
  const values = {
    fontStyle: 'serif',
    fontFamilies: ['Georgia'],
    subtitleFontInheritsLyrics: false,
    subtitleFontStyle: 'mono',
    subtitleFontFamilies: ['Menlo', 'Songti SC'],
  };
  assert.deepEqual(
    Native.resolveFamilies(values, true),
    cssFamilies(
      Original.resolveThemeTranslationFontStack({
        fontStyle: 'mono',
        fontFamily: 'Menlo',
        fontFamilyStack: ['Songti SC'],
      }),
    ),
  );
  assert.deepEqual(
    Native.parseFallbackDraft(' "Songti SC", songti sc\nMenlo'),
    Original.normalizeFontFamilyStack([' "Songti SC"', ' songti sc', 'Menlo']),
  );
  assert.deepEqual(Native.withPrimary(['Georgia', 'Songti SC'], 'Menlo'), ['Menlo', 'Songti SC']);
  assert.deepEqual(Native.withFallback(['Georgia', 'Songti SC'], ['Menlo', 'menlo']), [
    'Georgia',
    'Menlo',
  ]);
  assert.deepEqual(
    Native.availableFamilies(['menlo', 'UNKNOWN', 'SONGTI SC', 'Menlo'], ['Menlo', 'Songti SC']),
    ['Menlo', 'Songti SC'],
  );
});

test('shared background picker exposes the implemented Monet renderer', async () => {
  const actual = await fields();
  assert.ok(
    actual
      .find((field) => field.key === 'backgroundMode')
      .options.some((option) => option.value === 'monet'),
  );
});
