import {
  awaitOperation,
  type EchoPluginContext,
  type EchoPluginBackupRequest,
  type EchoPluginRegistration,
  type JsonValue,
} from 'echo:plugin-sdk';
import {
  createClient,
  normalizeConfig,
  persistedConfig,
  resolveConfig,
  type WebDavConfig,
  type Send,
} from './webdav';

export {
  createClient,
  normalizeConfig,
  persistedConfig,
  resolveConfig,
  directoryUrl,
  fileUrl,
  basicAuthorization,
  parseEntries,
} from './webdav';
export { awaitOperation } from 'echo:plugin-sdk';

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));
const sendFor =
  (context: EchoPluginContext): Send =>
  (options) => {
    if (!context.active) return Promise.reject(new Error('操作已取消'));
    return awaitOperation(context.net.request(options));
  };
// The host settings view can use the activation context. Keep an explicit
// cancellation handle so destroying the view aborts replies and later stages.
export function createConnectionTest(context: EchoPluginContext, config: unknown) {
  let active = true;
  const pending = new Set<
    import('echo:plugin-sdk').EchoPluginOperation<import('echo:plugin-sdk').NetworkResponse>
  >();
  const send: Send = (options) => {
    if (!active || !context.active) return Promise.reject(new Error('连接测试已取消'));
    const operation = context.net.request(options);
    pending.add(operation);
    return awaitOperation(operation).then(
      (value) => {
        pending.delete(operation);
        return value;
      },
      (error) => {
        pending.delete(operation);
        throw error;
      },
    );
  };
  const client = createClient(config);
  return {
    promise: client.test(send),
    cancel: () => {
      active = false;
      for (const operation of pending) operation.cancel();
      pending.clear();
    },
  };
}
export function activate(ctx: EchoPluginContext) {
  let config = normalizeConfig(undefined),
    lease: EchoPluginRegistration | null = null;
  let epoch = 0,
    saving = false;
  let status = {
    kind: 'disabled',
    label: '未启用',
    detail: '启用并保存后，可在主程序备份与恢复中选择此位置。',
  };
  const publish = () => {
    if (ctx.active) ctx.ui.setState({ ...status });
  };
  const retire = () => {
    const previous = lease;
    lease = null;
    previous?.dispose();
  };
  const apply = () => {
    retire();
    status = {
      kind: 'disabled',
      label: '未启用',
      detail: '启用并保存后，可在主程序备份与恢复中选择此位置。',
    };
    if (config.enabled) {
      try {
        const client = createClient(config);
        const send = (r: EchoPluginBackupRequest) => {
          if (!r.active || !r.context) throw new Error('备份操作已取消');
          return sendFor(r.context);
        };
        lease = ctx.backups.registerProvider('webdav', {
          name: 'WebDAV 备份',
          description: client.description,
          save: (r) => client.save(send(r), r.fileName, r.data),
          list: (r) => client.list(send(r)),
          load: (r) => client.load(send(r), r.id),
          remove: (r) => client.remove(send(r), r.id),
        });
        if (!lease) throw new Error('宿主备份服务当前不可用');
        status = {
          kind: 'active',
          label: '已接入',
          detail: '可在主程序“备份与恢复”中选择 WebDAV 存储位置。',
        };
      } catch (error) {
        status = { kind: 'error', label: '待配置', detail: message(error) };
      }
    }
    publish();
  };
  return awaitOperation(ctx.io.readValue('settings')).then((stored) => {
    if (!ctx.active) return;
    config = normalizeConfig(stored);
    ctx.registerCommand('settings.read', () => ({ ...config }));
    ctx.registerCommand('settings.save', (args) => {
      if (saving) throw new Error('设置正在保存');
      const next = normalizeConfig(args.config);
      if (next.enabled) resolveConfig(next);
      const generation = epoch;
      saving = true;
      return awaitOperation(
        ctx.io.writeValue('settings', persistedConfig(next) as unknown as JsonValue),
      )
        .then(() => {
          if (!ctx.active || generation !== epoch) throw new Error('设置保存已取消');
          config = next;
          apply();
          return { ...config };
        })
        .then(
          (value) => {
            saving = false;
            return value;
          },
          (error) => {
            saving = false;
            throw error;
          },
        );
    });
    if (!ctx.ui.registerSettings('Settings.qml')) throw new Error('无法注册 WebDAV 设置面板');
    ctx.sessionInvalidated.connect(() => {
      epoch += 1;
      apply();
    });
    ctx.onDispose(() => {
      epoch += 1;
      retire();
      config.password = '';
    });
    apply();
  });
}
