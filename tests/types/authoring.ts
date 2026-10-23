import { awaitOperation, pluginService } from 'echo:plugin-sdk';
import type { EchoPluginContext } from 'echo:plugin-sdk';

export function activate(ctx: EchoPluginContext): Promise<void> {
  ctx.registerCommand('answer', () => Promise.resolve({ value: 42 }));
  ctx.onDispose(() => {});
  return awaitOperation(ctx.io.writeValue('enabled', true)).then(() => {
    ctx.ui.registerTitlebarAction('pause', 'Pause', 'music', () => ctx.player.pause());
  });
}

function checkReadonlyContract(ctx: EchoPluginContext): void {
  // @ts-expect-error The host owns playback state.
  ctx.player.volume = 30;
  // @ts-expect-error Domain methods accept typed positions, not arbitrary routing.
  ctx.player.seek('/song/url');
  // @ts-expect-error The application database/credentials are not SDK fields.
  ctx.account;
}
void checkReadonlyContract;

function checkPluginServiceContract(ctx: EchoPluginContext): void {
  ctx.plugins.isAvailable('audio-library');
  // @ts-expect-error Plugin collaboration has one public facade.
  ctx.mods.isAvailable('audio-library');
  const volume = pluginService<{
    set: { arguments: { percent: number }; result: { percent: number } };
  }>(ctx, 'audio-library', 'volume', '>=1.0.0 <2.0.0');
  volume.call('set', { percent: 50 }).then((result) => result.percent.toFixed(0));
  // @ts-expect-error The service has no arbitrary method or host string route.
  volume.call('reset', {});
  // @ts-expect-error Service arguments retain their declared numeric type.
  volume.call('set', { percent: 'loud' });
}
void checkPluginServiceContract;

// @ts-expect-error Browser APIs are not part of the Qt plugin environment.
fetch('https://example.com');
// @ts-expect-error Plugin packages do not have a Node.js runtime.
process.exit(0);
// @ts-expect-error Business UI is Qt Quick, with no DOM.
document.createElement('div');

export function spectrumTypes(ctx: EchoPluginContext) {
  const sub = ctx.audio.spectrum.subscribe({
    fps: 30,
    binCount: 128,
    scale: 'mel',
    includeWaveform: true,
  });
  sub?.setPaused(true);
  // @ts-expect-error unknown frequency scale must not silently enter the API
  ctx.audio.spectrum.subscribe({ scale: 'custom' });
  // @ts-expect-error fixed native presentation targets
  ctx.ui.registerSurface('arbitrary', 'whole-application', 'Layer.qml');
  // @ts-expect-error player remains read only
  ctx.player.playing = true;
  sub?.dispose();
}

// Public UI references never expose the host Item or arbitrary property writes.
import type { EchoPluginContext as UiContext } from 'echo:plugin-sdk';
function publicUiAuthoring(context: UiContext) {
  const rule = context.ui.styles.registerRule(
    'song-paint',
    { role: 'song.row', surface: 'main' },
    { foreground: '#ff6600', fontWeight: 600, radius: 10 },
    20,
  );
  rule?.update({ foreground: context.accent });
  rule?.setPriority(10);
  const observation = context.ui.parts.observe('mini', { surface: 'mini' }, (event) => {
    if (event.type === 'added' && event.part.replaceable)
      context.ui.parts.mount('mini-decoration', event.part, 'foreground', 'MiniDecoration.qml');
    if (event.type === 'removed') event.part.valid satisfies boolean;
  });
  observation?.dispose();
  // @ts-expect-error geometry is a read-only Qt value
  context.ui.parts.query({ role: 'song.row' })!.geometry.width = 10;
  // @ts-expect-error raw Item access is not part of the SDK
  context.ui.parts.query({})!.target.visible = false;
  // @ts-expect-error layout geometry is not a visual style property
  context.ui.styles.registerRule('bad', {}, { width: 500 });
  // @ts-expect-error no arbitrary CSS selector is accepted
  context.ui.parts.query({ selector: '#main > button' });
}
void publicUiAuthoring;

function appearanceAuthoring(ctx: EchoPluginContext) {
  const theme = ctx.theme.registerTheme({
    id: 'night',
    title: 'Night',
    light: { palette: { main: '#f0f0f0' } },
    dark: { palette: { main: '#101820' }, mini: { background: '#182830' } },
    miniComponent: 'Mini.qml',
    settingsComponent: 'Settings.qml',
    defaults: { glow: true },
    validate: (values) => typeof values.glow === 'boolean',
  });
  theme?.configuration?.patch({ glow: false });
  ctx.ui.lyricsPage.registerSkin({
    id: 'wide',
    title: 'Wide',
    component: 'Page.qml',
    titlebar: 'none',
    tools: 'none',
  });
  ctx.player.on('current', 'play', (state) => state.track.id, true);
  ctx.player.control('quality', { value: 'hi_res' });
  ctx.fonts.build(['follow'], 28, 650);
  ctx.windows.command('mini', 'show');
  // @ts-expect-error appearance is a read-only host snapshot
  ctx.appearance.snapshot.dark = true;
  // @ts-expect-error no arbitrary raw player mutation
  ctx.player.snapshot.track.title = 'modified';
  // @ts-expect-error raw Qt windows are never returned
  ctx.windows.window.setFlags(0);
  // @ts-expect-error full skins must provide real package QML
  ctx.ui.lyricsPage.registerSkin({ id: 'bad', title: 'Missing content' });
  // @ts-expect-error typed visual fields exclude CSS strings and geometry
  ctx.theme.registerTheme({ id: 'bad', title: 'Bad', dark: { palette: { width: '100px' } } });
}
void appearanceAuthoring;

function sourceAndQueues(ctx: EchoPluginContext): void {
  ctx.player.audioSource.registerResolver('remote', {
    order: 10,
    position: 'after-catalog',
    transformStages: ['catalog', 'cloud'],
    match: (c) => {
      c.request.track(ctx.net.request({ url: 'https://example.test' }));
      return Promise.resolve(c.track.title !== '');
    },
    resolve: (c) => ({
      sources: [{ url: 'https://example.test/audio', audioTrackId: 2 }],
      durationMs: c.track.durationMs,
    }),
    transform: (c) => (c.stage === 'cloud' ? false : { ...c.source, loudness: { gain: 0 } }),
  });
  ctx.playlist.replace('radio', 'Radio', [{ id: 'one', sourceId: 'station', title: 'One' }], 0);
  const queue = ctx.playlist.snapshot[0];
  if (queue) {
    ctx.playlist.append(queue.key, ctx.playlist.tracks(queue.key), 'after');
    ctx.playlist.move(queue.key, queue.revision, 0, 1);
    // @ts-expect-error Queue rows are immutable host snapshots.
    queue.count = 1;
    // @ts-expect-error No raw queue model or arbitrary host action.
    ctx.playlist.clear(queue.key, 42);
  }
  // @ts-expect-error The five source stages are a closed contract.
  ctx.player.audioSource.registerResolver('bad', { position: 'arbitrary', resolve: () => false });
  ctx.player.audioSource.registerResolver('bad2', {
    // @ts-expect-error Native audio ordinals are numbers.
    resolve: () => ({ sources: [{ url: 'https://example.test', audioTrackId: '2' }] }),
  });
}
void sourceAndQueues;

export function lyricAuthoring(ctx: import('echo:plugin-sdk').EchoPluginContext) {
  ctx.lyrics.registerResolver('lyrics', {
    order: 10,
    match: async ({ track }) => !!track.id,
    resolve: async ({ request, track }) => {
      const operation = ctx.net.request({ url: 'https://lyrics.example/' + track.id });
      request.track(operation);
      return { format: 'yrc', content: '[1000,500](1000,500,0)Text', source: 'Source' };
    },
  });
  ctx.lyrics.onSnapshot(
    'display',
    (snapshot) => {
      if (!snapshot.manual)
        ctx.lyrics.write(snapshot.revision, { format: 'lrc', content: '[00:01]Text' });
    },
    false,
  );
  ctx.lyrics.write(ctx.lyrics.snapshot.revision, {
    format: 'krc',
    encoding: 'base64',
    content: '...',
  });
  ctx.lyrics.clear(ctx.lyrics.snapshot.revision);
  ctx.lyrics.reload(ctx.lyrics.snapshot.revision, true);
  ctx.lyrics.command('offset', { value: 100 });
  // @ts-expect-error Unsupported format.
  ctx.lyrics.write('1', { format: 'txt', content: 'text' });
  // @ts-expect-error Only KRC accepts encrypted binary content.
  ctx.lyrics.write('1', { format: 'yrc', encoding: 'base64', content: 'text' });
  // @ts-expect-error A resolver cannot return an untyped URL/string.
  ctx.lyrics.registerResolver('bad', { resolve: () => 'url' });
  // @ts-expect-error Required explicit content.
  ctx.lyrics.write('1', { format: 'lrc' });
  // @ts-expect-error Lyrics commands do not accept unrelated player operations.
  ctx.lyrics.command('next');
}

async function filesAndRequest(ctx: EchoPluginContext): Promise<void> {
  const selected = await awaitOperation(
    ctx.files.requestDirectory({
      purpose: 'Save music',
      access: 'read-write',
      persist: true,
    }),
  );
  if (selected.canceled || !selected.directory) return;
  const target = { ...selected.directory.file, path: 'music.flac' };
  const job = await awaitOperation(
    ctx.downloads.start({
      url: 'https://example.test/music',
      target,
      lifetime: 'scope',
      checksum: { algorithm: 'sha256', value: 'a'.repeat(64) },
    }),
  );
  job.changed.connect(() => job.snapshot.receivedBytes.toFixed(0));
  const downloaded = await awaitOperation(job.wait());
  const media = await awaitOperation(ctx.files.openMedia(downloaded.file, { lifetime: 'track' }));
  media.url.toString();
  media.dispose();
  const response = await awaitOperation(
    ctx.net.request({
      url: 'https://example.test',
      method: 'PATCH',
      headers: { Host: 'custom.test' },
      body: { enabled: true },
      responseType: 'json',
      revision: ctx.player.revision,
    }),
  );
  response.status.toFixed(0);
  // @ts-expect-error File paths alone are not references.
  ctx.files.readText('/tmp/arbitrary');
  // @ts-expect-error Networking has one entry point.
  ctx.io.get('https://example.test');
  // @ts-expect-error No historical restricted fetch facade.
  ctx.net.fetch('https://example.test');
  ctx.downloads.start({
    url: 'https://example.test',
    target,
    // @ts-expect-error Checksum algorithm is part of the real host contract.
    checksum: { algorithm: 'md5', value: '' },
  });
}
void filesAndRequest;

async function sqliteStorage(ctx: EchoPluginContext): Promise<void> {
  const db = await awaitOperation(
    ctx.sqlite.open({
      name: 'library',
      migrations: [{ version: 1, sql: ['CREATE TABLE t(id INTEGER, blob BLOB);'] }],
    }),
  );
  const run = await awaitOperation(
    db.run('INSERT INTO t VALUES(?,?)', [
      { type: 'int64', data: '9223372036854775807' },
      { type: 'hex', data: '00ff' },
    ]),
  );
  run.changes.toFixed(0);
  const first = await awaitOperation(db.get('SELECT id FROM t'));
  if (first && typeof first.id === 'object' && first.id?.type === 'int64')
    first.id.data.toUpperCase();
  await awaitOperation(db.transaction([{ sql: 'DELETE FROM t' }]));
  await awaitOperation(db.close());
  const all = await awaitOperation(ctx.sqlite.listDatabases());
  all[0]?.name.toUpperCase();
  // @ts-expect-error No database paths or raw host DB access.
  ctx.sqlite.open({ path: '/tmp/host.sqlite' });
  // @ts-expect-error BLOB encodings are explicit.
  db.run('SELECT ?', [{ type: 'utf8', data: 'x' }]);
  // @ts-expect-error Bind parameters must be an array.
  db.all('SELECT ?', { id: 1 });
}
void sqliteStorage;

async function backups(ctx: EchoPluginContext): Promise<void> {
  const archive = await awaitOperation(ctx.backups.create({ settings: true, plugins: true }));
  const inspected = await awaitOperation(ctx.backups.inspect(archive.data));
  inspected.summary.pluginCount.toFixed();
  await awaitOperation(ctx.backups.restore(inspected.token, { plugins: false }));
  ctx.backups.registerProvider('cloud', {
    name: 'Cloud',
    save: async (request) => {
      if (!request.context) return;
      await awaitOperation(
        request.context.net.request({
          url: 'https://example.test',
          method: 'PUT',
          body: request.data,
        }),
      );
    },
    list: () => [{ id: 'a', name: 'Backup' }],
    load: async (request) => {
      const result = await awaitOperation(
        request.context!.net.request({
          url: 'https://example.test/' + request.id,
          responseType: 'arrayBuffer',
        }),
      );
      return result.data as ArrayBuffer;
    },
  });
  // @ts-expect-error Must inspect archive bytes, not a path or URL.
  ctx.backups.inspect('/tmp/backup');
  // @ts-expect-error Storage backends need save/list/load.
  ctx.backups.registerProvider('bad', { name: 'Bad', list: () => [] });
  // @ts-expect-error Scope keys are defined by the host.
  ctx.backups.create({ credentials: true });
}
void backups;
