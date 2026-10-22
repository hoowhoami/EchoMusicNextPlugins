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

export function appearanceTypes(ctx: EchoPluginContext): void {
  const skin = ctx.ui.lyricsPage.registerSkin({
    id: 'skin',
    title: 'Skin',
    component: 'Page.qml',
    defaults: { mode: 'still' },
    validate: (values) => typeof values.mode === 'string',
  });
  skin?.configuration.patch({ mode: 'classic' });
  ctx.fonts.build(['follow'], 40, 700);
  ctx.player.lyrics.row(0);
  // @ts-expect-error Full skins require a package QML component.
  ctx.ui.lyricsPage.registerSkin({ id: 'missing', title: 'Missing' });
  ctx.ui.lyricsPage.registerSkin({
    id: 'bad',
    title: 'Bad',
    component: 'Page.qml',
    // @ts-expect-error Chrome ownership is a closed host protocol.
    tools: 'custom',
  });
  // @ts-expect-error Configuration is host-owned and changes only through patch/reset.
  if (skin) skin.configuration.values = {};
  // @ts-expect-error The font chain is a string list, not a CSS stack.
  ctx.fonts.build('Arial, sans-serif');
}
