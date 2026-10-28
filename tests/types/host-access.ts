import { awaitOperation, type EchoPluginContext } from 'echo:plugin-sdk';
declare const c: EchoPluginContext;
async function useHost() {
  const page = await awaitOperation(
    c.ui.navigation.navigate({ name: 'search', query: { q: 'Echo', tab: 'song' } }),
  );
  const canBack: boolean = page.canGoBack;
  const prefs = await awaitOperation(c.settings.read('playback'));
  const fade: number = prefs.volumeFadeMs;
  await awaitOperation(c.settings.update('mini', { fontWeight: 780, alwaysOnTop: true }));
  const observer = await awaitOperation(
    c.settings.observe('playback', 'playback', (state) => {
      const n: number = state.autoNextDelaySeconds;
      void n;
    }),
  );
  observer.dispose();
  const fallback = await awaitOperation(
    c.ui.cover.setFallback(
      'icon',
      (context) =>
        context.scope === 'mini'
          ? c.cover.createThemedIconCoverUrl({
              icon: { body: '<path d="M3 3h18v18H3z"/>' },
              color: context.accentColor,
            })
          : undefined,
      20,
    ),
  );
  fallback.dispose();
  const action = c.ui.registerPlayerbarActionDefinition('main', {
    title: 'Search',
    icon: 'search',
    defaultPlacement: 'right',
    trigger: 'hover',
    badge: () => 3,
    disabled: () => !c.active,
    onClick: async () => {
      await awaitOperation(c.ui.navigation.navigate({ name: 'themes' }));
    },
  });
  action?.update({ tooltip: 'Open themes', badge: 'New' });
  action?.cancel();
  action?.refresh();
  action?.dispose();
  // @ts-expect-error no private host routes
  c.ui.navigation.navigate({ name: 'login-internal' });
  // @ts-expect-error navigation query values are strings
  c.ui.navigation.navigate({ name: 'search', query: { q: 1 } });
  // @ts-expect-error finite settings domains
  c.settings.read('credentials');
  // @ts-expect-error fields belong to the selected domain
  c.settings.update('playback', { alwaysOnTop: true });
  // @ts-expect-error settings snapshots are readonly
  prefs.autoNext = true;
  // @ts-expect-error legal acceptance cannot be changed by a plugin
  c.settings.update('shell', { userAgreementAccepted: true });
  c.ui.registerTitlebarActionDefinition('bad', {
    title: 'bad',
    icon: 'music',
    // @ts-expect-error titlebar cannot use player placement
    defaultPlacement: 'left',
    onClick() {},
  });
  // @ts-expect-error fallback callbacks are synchronous
  c.cover.setFallback('bad', async () => 'https://example.com/cover.png');
  // @ts-expect-error layout defaults are not dynamic patches
  action?.update({ order: 2 });
  return { canBack, fade };
}
void useHost;
