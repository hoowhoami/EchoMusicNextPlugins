# 备份与存储提供者

声明 `backups.operations` / `backups.providers` feature 和 `backups` capability。备份内容包含可跨设备恢复的应用设置、已安装插件及其私有数据；宿主账号凭证、设备身份和外部文件授权留在本机；受管资源随备份迁移，外部授权文件不会自动收集。插件自己保存的凭证仍可能出现在插件私有数据中，归档未加密。

```ts
import { awaitOperation, type EchoPluginContext } from 'echo:plugin-sdk';

export async function saveBackup(ctx: EchoPluginContext) {
  const archive = await awaitOperation(ctx.backups.create({ settings: true, plugins: true }));
  // archive.data: ArrayBuffer; archive.fileName; archive.summary
  await awaitOperation(
    ctx.net.request({
      url: 'https://storage.example/backup',
      method: 'PUT',
      body: archive.data,
    }),
  );
}
```

`create` 的范围缺省均为 true。宿主按存储域自动收集设置和受管文件，新增偏好或资源无需 provider 更新备份字段清单。创建含插件的快照时，宿主短暂冻结插件存储，排空已接受的写入，再对每个受管 SQLite 库生成一致性快照；插件实例和数据库句柄继续有效。冻结期间新增存储操作返回 Busy，持续下载或更新尚未完成时也可能返回 Busy，应在工作完成后重试。创建不是停用再激活插件。

`inspect(data)` 校验归档格式、大小、路径和文件摘要，返回 `{token, summary}`。输入来自内存二进制，不接受文件路径或 URL。令牌绑定当前插件作用域，有效期十分钟，最多保留八个预览。停用、组件销毁或账号会话变化撤销旧预览。

`restore(token, scope?)` 会显示宿主确认界面。用户取消时操作为 Canceled；确认后才准备排空和重启。成功结果 `restartScheduled` 表示已安排恢复，不表示重启后的应用已经运行。令牌确认后只能使用一次；恢复范围只能缩小到归档包含的内容。宿主在所有服务关闭后提交恢复，保留日志以处理失败回滚和中断恢复；成功后由正常重启流程重新打开应用。

插件二进制传输最多 256 MiB；本地文件备份使用有界流式归档。`summary` 包含创建时间、应用版本、范围、设置数量、插件数量与名称。备份格式由宿主维护，provider 不解释或自行修改其内容。

## 接入设置中的备份位置

仅在主激活上下文注册。返回的注册句柄可 `dispose()`，停用插件时宿主也会自动移除。

```ts
export function activate(ctx: EchoPluginContext) {
  ctx.backups.registerProvider('cloud', {
    name: '我的云存储',
    description: '保存和读取远端备份',
    async save(request) {
      await awaitOperation(
        request.context!.net.request({
          url: 'https://storage.example/backup',
          method: 'PUT',
          body: request.data,
        }),
      );
    },
    async list(request) {
      const response = await awaitOperation(
        request.context!.net.request({
          url: 'https://storage.example/backups',
          responseType: 'json',
        }),
      );
      return response.data as { id: string; name: string; createdAt?: string; size?: number }[];
    },
    async load(request) {
      const response = await awaitOperation(
        request.context!.net.request({
          url: 'https://storage.example/backups/' + encodeURIComponent(request.id),
          responseType: 'arrayBuffer',
        }),
      );
      return response.data as ArrayBuffer;
    },
    async remove(request) {
      await awaitOperation(
        request.context!.net.request({
          url: 'https://storage.example/backups/' + encodeURIComponent(request.id),
          method: 'DELETE',
        }),
      );
    },
  });
}
```

网络示例另需 `unrestrictedNetwork` capability。TypeScript/async 由开发工具编译为 Qt 支持的 ES2016；不直接把未转换的代码交给宿主。

- `save` 收到 `data/fileName/summary`，成功完成后宿主才提示已保存。
- `list` 返回最多 500 条 `{id,name,createdAt?,size?,description?}`，重复或无效 ID 会过滤。
- `load` 根据 `id` 返回 ArrayBuffer 或其类型化视图。宿主随后独立检查并显示恢复预览。
- `remove` 可选，提供后界面显示带确认的删除入口。

每次调用的 `request.context` 是独立作用域，里面启动的请求、文件操作和定时器会在完成、取消或停用时回收。用已有 `ctx` 发起操作时，可通过 `request.track(operation)` 显式关联取消。请求的 `active/canceled/changed` 可用于自定义异步任务；完成后数据缓冲区释放，不保留 request 作为长期状态。一次存储调用最多等待两分钟，晚到结果不会更新已关闭的界面或新注册。

设置 → 数据与安全 → 创建备份/恢复备份中的位置选择器会显示注册项。列表按需读取，支持刷新、选择、删除和恢复；关闭相关界面或停用 provider 会取消在途工作。恢复格式、授权确认、令牌和事务始终由宿主负责。
