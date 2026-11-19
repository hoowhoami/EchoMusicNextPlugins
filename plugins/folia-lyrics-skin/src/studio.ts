import {
  awaitOperation,
  type AppearanceConfiguration,
  type EchoPluginContext,
  type EchoPluginDialog,
  type JsonValue,
} from 'echo:plugin-sdk';

// The host configuration is the sole persisted settings owner. The studio reads
// a JSON projection and submits patches through the activation's public command
// scope, so closing the entry drawer cannot retire its independent dialog.
export function registerStudio(
  ctx: EchoPluginContext,
  configuration: AppearanceConfiguration,
): void {
  let disposed = false;
  let opening = false;
  let handle: EchoPluginDialog | null = null;
  let generation = 0;
  const publish = (patch: Record<string, JsonValue>) => {
    if (!disposed && ctx.active && !ctx.ui.setState({ ...ctx.ui.state, ...patch }))
      throw new Error('无法更新 Folia 设置界面');
  };
  const sync = () =>
    publish({
      foliaConfiguration: {
        values: configuration.values,
        busy: configuration.busy,
        errorMessage: configuration.errorMessage,
        active: configuration.active,
      },
    });
  configuration.changed.connect(sync);
  configuration.busyChanged.connect(sync);
  configuration.errorChanged.connect(sync);
  sync();
  const open = async () => {
    if (disposed || opening || handle?.active) return;
    const revision = ++generation;
    opening = true;
    publish({ foliaStudioOpen: true });
    try {
      const next = await awaitOperation(
        ctx.ui.showDialog({
          component: 'qml/studio/Studio.qml',
          title: '歌词样式设置',
          width: 960,
          height: 608,
          modal: true,
          closeOnMask: true,
        }),
      );
      if (disposed || revision !== generation) {
        next.close();
        return;
      }
      handle = next;
      const closed = () => {
        next.closed.disconnect(closed);
        if (revision === generation) {
          handle = null;
          publish({ foliaStudioOpen: false });
        }
      };
      next.closed.connect(closed);
      if (!next.active) closed();
    } catch (error) {
      if (revision === generation) publish({ foliaStudioOpen: false });
      throw error;
    } finally {
      if (revision === generation) opening = false;
    }
  };
  if (
    !ctx.registerCommand('folia.studio.open', open) ||
    !ctx.registerCommand('folia.studio.patch', (patch) => {
      if (!configuration.active || !configuration.patch(patch))
        throw new Error(configuration.errorMessage || '未能保存 Folia 设置');
    }) ||
    !ctx.onDispose(() => {
      disposed = true;
      ++generation;
      configuration.changed.disconnect(sync);
      configuration.busyChanged.disconnect(sync);
      configuration.errorChanged.disconnect(sync);
      handle?.close();
      handle = null;
    })
  )
    throw new Error('无法注册 Folia 设置窗口');
}
