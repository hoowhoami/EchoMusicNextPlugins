import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';

const source = new URL('../plugins/folia-lyrics-skin/src/', import.meta.url);
async function configModule() {
  const result = await build({
    entryPoints: [new URL('config.ts', source).pathname],
    bundle: true,
    write: false,
    format: 'esm',
    target: 'es2016',
    logLevel: 'silent',
  });
  return import(
    `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`
  );
}

test('Folia configuration rejects corrupt values and unknown fields before persistence', async () => {
  const { defaults, validate } = await configModule();
  assert.equal(defaults.mode, 'classic');
  assert.equal(validate(defaults), true);
  for (const patch of [
    { visualizerOpacity: 0.19 },
    { visualizerOpacity: 1.01 },
    { visualizerOpacity: '0.5' },
    { lyricsFontScale: NaN },
    { lyricsFontScale: 0 },
    { subtitleFontScale: 100 },
    { showText: 'yes' },
    { fontFamilies: [''] },
    { fontFamilies: 'Arial' },
    { fontStyle: 'fantasy' },
    { subtitleFontStyle: ['sans'] },
    { mode: 'not-a-renderer' },
    { playerChromeVisibilityMode: 'unknown' },
    { playerChromeVisibilityMode: ['auto-hide'] },
    { playerPosition: 1000 },
  ])
    assert.notEqual(validate({ ...defaults, ...patch }), true, JSON.stringify(patch));
  assert.equal(
    validate({ ...defaults, lyricsFontScale: 1.4, hideTranslationSubtitle: true }),
    true,
  );
  assert.equal(defaults.visualizerOpacity, 1);
  assert.equal(defaults.fontStyle, 'sans');
  assert.equal(defaults.subtitleFontStyle, 'sans');
  for (const fontStyle of ['sans', 'serif', 'mono'])
    assert.equal(validate({ ...defaults, fontStyle, subtitleFontStyle: fontStyle }), true);
  for (const visualizerOpacity of [0.2, 0.55, 1])
    assert.equal(validate({ ...defaults, visualizerOpacity }), true);
  for (const playerChromeVisibilityMode of ['always-hidden', 'always-visible', 'auto-hide'])
    assert.equal(validate({ ...defaults, playerChromeVisibilityMode }), true);
});

test('shared background selection preserves independent original Sora and Latent settings', async () => {
  const { defaults, validate } = await configModule();
  assert.equal(defaults.backgroundMode, 'latent');
  assert.equal(defaults.soraBlank, false);
  assert.equal(validate({ ...defaults, backgroundMode: 'sora', soraBlank: true }), true);
  assert.equal(validate({ ...defaults, backgroundMode: 'nomand' }), true);
  assert.notEqual(validate({ ...defaults, backgroundMode: 'missing' }), true);
  assert.notEqual(validate({ ...defaults, soraBlank: 1 }), true);
});

test('Pendolo settings persist source defaults and resolver bounds independently', async () => {
  const { defaults, validate } = await configModule();
  assert.equal(defaults.pendoloArcRadius, 0.42);
  assert.equal(defaults.pendoloArcAngleDeg, 100);
  assert.equal(defaults.pendoloWheelCenterY, 0.5);
  assert.equal(defaults.pendoloShowGearDecor, 'subtle');
  assert.equal(
    validate({
      ...defaults,
      mode: 'pendolo',
      pendoloWheelCenterX: -0.3,
      pendoloActiveScale: 1.6,
      pendoloShowGearDecor: 'full',
    }),
    true,
  );
  for (const patch of [
    { pendoloArcRadius: 0.249 },
    { pendoloArcAngleDeg: 161 },
    { pendoloWheelCenterX: 0.51 },
    { pendoloWheelCenterY: 0.81 },
    { pendoloTickSnappiness: 0 },
    { pendoloActiveScale: 2 },
    { pendoloShowGearDecor: 'bad' },
    { pendoloEnableLineGlow: 1 },
  ])
    assert.notEqual(validate({ ...defaults, ...patch }), true, JSON.stringify(patch));
});

test('Folia registers one complete skin without choosing it or creating a player', async () => {
  const entry = await build({
    entryPoints: [new URL('entry.ts', source).pathname],
    bundle: true,
    write: false,
    format: 'esm',
    target: 'es2016',
    logLevel: 'silent',
  });
  const { activate } = await import(
    `data:text/javascript;base64,${Buffer.from(entry.outputFiles[0].text).toString('base64')}`
  );
  const registrations = [];
  const signals = [];
  const signal = () => {
    const callbacks = new Set();
    signals.push(callbacks);
    return {
      connect(callback) {
        callbacks.add(callback);
      },
      disconnect(callback) {
        callbacks.delete(callback);
      },
    };
  };
  const playerRegistrations = [];
  let dispose;
  const ctx = {
    active: false, // Real activation registrations are staged until commit.
    activeChanged: signal(),
    onPlayerChanged(id, callback) {
      playerRegistrations.push({ id, callback });
      return { active: false };
    },
    registerCommand() {
      return { active: false };
    },
    onDispose(callback) {
      dispose = callback;
      return { active: false };
    },
    ui: {
      setState(state) {
        assert.ok(state.styles.length > 0);
        return true;
      },
      lyricsPage: {
        registerSkin(definition) {
          registrations.push(definition);
          return {
            active: true,
            configuration: {
              active: true,
              busy: false,
              values: definition.defaults,
              changed: signal(),
              busyChanged: signal(),
              patch() {
                throw new Error('Staged activation must not write configuration');
              },
            },
          };
        },
        get useSkin() {
          throw new Error('Activation must preserve user selection');
        },
      },
    },
    get player() {
      throw new Error('Activation must not create or read playback state');
    },
  };
  activate(ctx);
  assert.equal(registrations.length, 1);
  const [skin] = registrations;
  assert.equal(skin.id, 'folia');
  assert.equal(skin.component, 'qml/FoliaPage.qml');
  assert.equal(skin.settingsComponent, 'qml/Settings.qml');
  assert.equal(skin.validate(skin.defaults), true);
  const manifest = JSON.parse(await readFile(new URL('../manifest.json', source), 'utf8'));
  assert.ok(manifest.requires.features.includes('ui.lyricsPage'));
  assert.ok(manifest.requires.features.includes('ui.presentationClosing'));
  assert.ok(manifest.capabilities.includes('lyricsPage'));
  assert.deepEqual(
    playerRegistrations.map(({ id }) => id),
    ['folia.random.perSong'],
  );
  assert.equal(
    signals.reduce((count, callbacks) => count + callbacks.size, 0),
    3,
  );
  dispose();
  assert.equal(
    signals.reduce((count, callbacks) => count + callbacks.size, 0),
    0,
    'scope cleanup disconnects every direct Qt signal callback',
  );
});

test('Monet retains independent source poster settings and only a native asset handle', async () => {
  const { defaults, validate } = await configModule();
  assert.equal(defaults.monetFontScale, 1.2);
  assert.equal(defaults.monetPortraitSource, 'cover');
  assert.equal(defaults.monetPortraitAsset, '');
  assert.equal(
    validate({
      ...defaults,
      monetFontScale: 0.7,
      monetPortraitOffsetX: -14.5,
      monetAudioStyle: 'line',
      monetPortraitStyle: 'rectangular',
      monetPortraitAsset: 'asset:' + 'a'.repeat(32),
    }),
    true,
  );
  for (const patch of [
    { monetFontScale: 1.51 },
    { monetPortraitOffsetX: -151 },
    { monetPortraitSource: 'url' },
    { monetPortraitAsset: 'file:///tmp/portrait.png' },
    { monetShowAudioVisualization: 1 },
  ])
    assert.notEqual(validate({ ...defaults, ...patch }), true, JSON.stringify(patch));
});

test('Folia persists capsule position, both slots and track navigation preference', async () => {
  const { defaults, validate } = await configModule();
  assert.equal(defaults.playerBottomBarOffset, 32);
  assert.equal(defaults.playerControlSlotPrimary, 'loop');
  assert.equal(defaults.playerControlSlotSecondary, 'lyrics-timeline');
  assert.equal(defaults.alwaysShowTrackSwitchButtons, false);
  for (const action of ['loop', 'prev', 'next', 'like', 'lyrics-timeline', 'volume', 'queue']) {
    assert.equal(validate({ ...defaults, playerControlSlotPrimary: action }), true);
    assert.equal(validate({ ...defaults, playerControlSlotSecondary: action }), true);
  }
  for (const patch of [
    { playerBottomBarOffset: 31 },
    { playerBottomBarOffset: 32.5 },
    { playerBottomBarOffset: Infinity },
    { playerBottomBarOffset: '64' },
    { playerControlSlotPrimary: 'unknown' },
    { playerControlSlotSecondary: null },
    { alwaysShowTrackSwitchButtons: 1 },
  ])
    assert.notEqual(validate({ ...defaults, ...patch }), true);
  assert.equal(
    validate({ ...defaults, playerBottomBarOffset: 368, alwaysShowTrackSwitchButtons: true }),
    true,
  );
});

test('Folia persists source subtitle typography and independent mode tuning with strict bounds', async () => {
  const { defaults, validate } = await configModule();
  assert.equal(defaults.subtitleContentMode, 'translation');
  assert.equal(defaults.subtitleOverlayOpacity, 0.6);
  assert.equal(defaults.subtitleOverlayBackground, true);
  assert.equal(defaults.subtitleUpcomingLyricsBlur, true);
  assert.equal(defaults.fontWeight, null);
  assert.equal(defaults.subtitleFontWeight, null);
  assert.equal(defaults.subtitleFontInheritsLyrics, true);
  assert.equal(defaults.animationIntensity, 'normal');
  assert.equal(defaults.classicWordSpacing, 0.7);
  assert.equal(defaults.tiltSplitProbability, 0.75);
  assert.equal(defaults.tiltStyleProbability, 0.35);
  assert.equal(defaults.claddaghFocusScaleRatio, 0.65);
  assert.deepEqual(defaults.wordColors, []);
  for (const patch of [
    {
      subtitleContentMode: 'both',
      subtitleFontInheritsLyrics: false,
      subtitleFontFamilies: ['Menlo'],
    },
    { fontWeight: 900, subtitleFontWeight: 100 },
    { classicWordSpacing: 2, classicEnableWordRotation: false, classicUseLegacyLayout: true },
    { tiltSplitProbability: 0, tiltStyleProbability: 1, tiltColorScheme: 'accentAll' },
    {
      claddaghFocusScaleRatio: 1.5,
      claddaghRadiusScale: 0.5,
      claddaghEllipseTiltDeg: 60,
      claddaghLetterSpacingOffset: -5,
    },
    {
      wordColors: [
        { word: 'constructor', color: '#ff0044' },
        { word: '海洋', color: '#123456' },
      ],
    },
  ])
    assert.equal(validate({ ...defaults, ...patch }), true, JSON.stringify(patch));
  for (const patch of [
    { subtitleContentMode: 'typo' },
    { subtitleOverlayOpacity: 0.19 },
    { subtitleOverlayBackground: 'true' },
    { subtitleFontFamilies: [] },
    { fontWeight: 95 },
    { subtitleFontWeight: 101 },
    { animationIntensity: 'slow' },
    { classicWordSpacing: 2.01 },
    { classicBreathingFloatMultiplier: -0.01 },
    { tiltSplitProbability: -1 },
    { tiltStyleProbability: 1.01 },
    { tiltColorScheme: 'pink' },
    { claddaghRadiusScale: 2 },
    { claddaghLetterSpacingOffset: 21 },
    { wordColors: [{ word: '', color: '#ff0044' }] },
    { wordColors: [{ word: '海洋', color: 'url(example)' }] },
    { wordColors: [{ word: '海洋', color: '#123456', script: 'x' }] },
  ])
    assert.notEqual(validate({ ...defaults, ...patch }), true, JSON.stringify(patch));
});
