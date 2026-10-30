import { type EchoPluginContext, awaitOperation } from 'echo:plugin-sdk';
async function useHost(ctx: EchoPluginContext) {
  const clock = ctx.player.clock;
  const generation: number = clock.generation;
  const advancing: boolean = clock.isAdvancing;
  const position: number = ctx.player.samplePosition();
  ctx.player.on(
    'clock',
    'clock',
    (snapshot) => {
      void snapshot.clock.sampledAt;
    },
    true,
  );
  const style = await awaitOperation(
    ctx.theme.setOverride(
      'surface',
      { light: { surface: { main: 0.7 } }, dark: { surface: { main: 0.6 } } },
      10,
    ),
  );
  style.dispose();
  const icons = await awaitOperation(
    ctx.appIcons.set('brand', { window: 'icon.png', tray: 'tray.png' }, 20),
  );
  icons.dispose();
  ctx.appIcons.set('bytes', { window: new ArrayBuffer(4) });
  const dir = await awaitOperation(ctx.files.privateDirectory('data'));
  const info = await awaitOperation(ctx.files.metadata(dir.file));
  const genres: readonly string[] | null | undefined = info.media?.genre;
  // @ts-expect-error playback clocks are read-only
  ctx.player.clock.isAdvancing = false;
  // @ts-expect-error unsupported icon target
  ctx.appIcons.set('invalid', { menu: 'icon.png' });
  // @ts-expect-error opacity is numeric
  ctx.theme.setOverride('invalid', { light: { surface: { main: '0.7' } } });
  void [generation, advancing, position, genres];
}
void useHost;
