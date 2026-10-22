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
  assert.equal(validate(defaults), true);
  for (const patch of [
    { lyricsFontScale: NaN },
    { lyricsFontScale: 0 },
    { subtitleFontScale: 100 },
    { showText: 'yes' },
    { fontFamilies: [''] },
    { fontFamilies: 'Arial' },
    { mode: 'not-a-renderer' },
    { playerPosition: 1000 },
  ])
    assert.notEqual(validate({ ...defaults, ...patch }), true, JSON.stringify(patch));
  assert.equal(
    validate({ ...defaults, lyricsFontScale: 1.4, hideTranslationSubtitle: true }),
    true,
  );
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
  const ctx = {
    ui: {
      setState(state) {
        assert.ok(state.styles.length > 0);
        return true;
      },
      lyricsPage: {
        registerSkin(definition) {
          registrations.push(definition);
          return { active: true };
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
  assert.ok(manifest.capabilities.includes('lyricsPage'));
});
