import { awaitOperation } from 'echo:plugin-sdk';
import type { EchoPluginContext } from 'echo:plugin-sdk';
export async function ecosystemContract(c: EchoPluginContext) {
  const hot = await awaitOperation(c.kugou.request('searchHot'));
  hot.forEach((group) => group.keywords.forEach((keyword) => keyword.keyword));
  const songs = await awaitOperation(c.kugou.request('search', { kind: 'song', keyword: '音乐' }));
  if (songs.kind === 'songs') songs.page.items.forEach((song) => song.title);
  c.kugou.request('songMetadata', { ids: ['9007199254740993'] });
  // @ts-expect-error credentials are owned by the host
  c.kugou.request('search', { kind: 'song', keyword: '音乐', token: 'override' });
  // @ts-expect-error arbitrary native dispatch is not public business API
  c.kugou.request('submit', { operation: 'arbitrary' });
  // @ts-expect-error wrong result shape cannot be invented
  hot.nonexistent;
  c.ui.registerSidebarItem('entry', { title: '入口', pageId: 'tools' });
  c.ui.registerSongMenuItem('track', {
    label: '曲目',
    onSelect: (context) => {
      c.toast.info(context.track.title);
    },
  });
  const task = c.tasks.registerTask('work', {
    name: '任务',
    status: 'pending',
    retention: 'transient',
  });
  task?.start({ progress: { done: 1, total: 4 } });
  task?.finish('completed');
  c.shortcuts.registerShortcut('key', 'Ctrl+Alt+K', () => {
    c.toast.info('快捷键');
  });
  const container = c.scroll.current();
  if (container) {
    c.scroll.snapshot(container)?.maximum;
    c.scroll.bottom(container);
  }
  c.lyricEffects.registerEffect('effect', {
    scopes: ['page', 'desktop'],
    style: { scale: 1.05 },
    autoScroll: (context) => {
      return context.request.browsing;
    },
  });
  const line = c.ui.parts.query({ role: 'lyrics.line' });
  if (line) {
    const snapshot = c.lyricEffects.snapshot(line);
    if (snapshot?.role === 'lyrics.line') snapshot.glyphs.forEach((g) => g.rect.width);
  }
}
