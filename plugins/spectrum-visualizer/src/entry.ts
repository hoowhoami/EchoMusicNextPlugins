import { awaitOperation, type EchoPluginContext, type JsonValue } from 'echo:plugin-sdk';
import { DEFAULT_SETTINGS, normalizeSettings, type Settings } from './config';
export { paint, centered, mist, blurFor, palette, backdrop } from './drawing.js';
export { scene } from './scene.js';
export { normalizeSettings, DEFAULT_SETTINGS } from './config';
let desired: Settings = normalizeSettings(DEFAULT_SETTINGS);
let writes: Promise<unknown> = Promise.resolve();
export function activate(ctx: EchoPluginContext) {
  return awaitOperation(ctx.io.readValue('settings')).then((value) => {
    desired = normalizeSettings(value);
    if (!ctx.active) return;
    ctx.ui.setState(desired);
    const save = (value: Record<string, JsonValue>) => {
      desired = normalizeSettings(value);
      const snapshot = desired;
      const next = writes
        .then(() => awaitOperation(ctx.io.writeValue('settings', snapshot)))
        .then(() => {
          if (ctx.active) ctx.ui.setState(snapshot);
          return snapshot;
        });
      writes = next.catch(() => undefined);
      return next;
    };
    ctx.registerCommand('settings.get', () => ctx.ui.state);
    ctx.registerCommand('settings.patch', (args) => save({ ...desired, ...args }));
    ctx.registerCommand('settings.reset', () => save(normalizeSettings(DEFAULT_SETTINGS)));
    ctx.ui.registerSettings('Settings.qml');
    for (const placement of ['playerbar.background', 'mini.background', 'lyrics.aboveControls']) {
      const contribution = ctx.ui.parts.contribute(
        placement,
        { role: 'extension.surface', key: placement },
        {
          operation: 'insert',
          position: 'foreground',
          component: 'Layer.qml',
        },
      );
      if (!contribution) throw new Error(ctx.ui.parts.errorMessage);
    }
  });
}
export function deactivate() {
  writes = Promise.resolve();
}
