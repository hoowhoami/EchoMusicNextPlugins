import type { EchoPluginContext, JsonValue, PluginDirectorySnapshot } from 'echo:plugin-sdk';
export function directory(context: EchoPluginContext): PluginDirectorySnapshot {
  const api = context.plugins;
  api.onChanged('availability', (value) => {
    value.dependencies.forEach((dependency) => {
      dependency.services.forEach((service) => service.methods.forEach((method) => void method));
      dependency.commands.forEach((command) => void command.version);
    });
  });
  api.registerCommand('normalize', '1.0.0', async (args) => ({ normalized: args.value ?? null }), {
    title: 'Normalize',
    description: 'Return JSON',
  });
  api.callCommand<JsonValue>('library', 'normalize', '>=1.0.0', { value: 'hello' });
  // @ts-expect-error the public directory is immutable.
  api.snapshot.dependencies.push({ id: 'untrusted' });
  // @ts-expect-error callbacks cannot return host Qt objects across plugin boundaries.
  api.registerCommand('unsafe', '1.0.0', () => context.player);
  // @ts-expect-error native pointers are not valid cross-plugin argument data.
  api.callCommand('library', 'normalize', '>=1.0.0', { host: context.player });
  // @ts-expect-error metadata uses the typed public declaration.
  api.registerCommand('invalid', '1.0.0', () => null, { private: true });
  return api.snapshot;
}
