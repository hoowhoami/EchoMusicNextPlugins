# 文件、媒体与网络

文件能力声明 `localFiles`，按需要求 `files.dialogs`、`files.references`、`files.io`、`files.media`。下载声明 `downloads` capability 和 `net.downloads`；普通 HTTP 声明 `unrestrictedNetwork` 和 `net.request`。

## 文件与授权

```ts
import { awaitOperation } from 'echo:plugin-sdk';

async function save(ctx: import('echo:plugin-sdk').EchoPluginContext) {
  const selection = await awaitOperation(
    ctx.files.requestDirectory({
      purpose: '保存歌词',
      access: 'read-write',
      persist: true,
    }),
  );
  if (selection.canceled || !selection.directory) return;
  const file = { ...selection.directory.file, path: 'lyrics/song.lrc' };
  await awaitOperation(ctx.files.mkdir({ ...file, path: 'lyrics' }, { recursive: true }));
  await awaitOperation(ctx.files.writeText(file, '[00:01.00]歌词', { conflict: 'replace' }));
  const content = await awaitOperation(ctx.files.readText(file));
  return content.text;
}
```

文件选择使用原生对话框，必须在激活提交后由实际交互触发。取消返回 `canceled: true`。`requestFiles`支持多个文件和扩展名过滤；`requestDirectory`授权整个所选目录。`persist`默认为true；临时授权随当前scope结束。`privateDirectory('data' | 'cache')`无需选择，返回安装私有目录。

后续操作只接受`FileReference { grantId, revision, path }`。path为目录内相对路径，选中文件只能使用空path。显示路径不是读写凭证；禁止父级越界和符号链接。授权按安装隔离；`reauthorize`保留授权ID但替换revision，旧引用始终失效。`listGrants/revoke`和插件管理页的授权入口访问同一份账本。撤销/移除记录不会删除用户文件。

`stat/metadata/listFiles/readText/readBytes/writeText/writeBytes/mkdir/copyFile/deleteFile`均真实执行文件操作。列表默认200项、最多5000项，深度0–32；结果带truncated。读取默认1MiB、最多8MiB，支持offset/maxBytes；写入最多8MiB。更大文件使用流式复制、媒体租约或下载。文本支持utf-8（默认）、utf-16le、utf-16be、latin1。冲突默认fail，可选rename/replace；写入和复制使用同目录临时文件原子提交；删除目录只允许空目录。媒体metadata返回图片尺寸或音频标题/歌手/专辑/时长，不返回内部媒体路径或宿主DTO。

文件IO运行在宿主worker。可传`revision: ctx.player.revision`绑定曲目，切歌取消；不传时允许跨曲目。取消不能撤销已经完成的文件提交。停用、重载、退出与账号变化取消在途操作并排空worker；用户授权目录不随插件更新回滚。

## 媒体租约

```ts
const lease = await awaitOperation(ctx.files.openMedia(file));
// 把lease.url.toString()交给音源resolver或Qt媒体组件。
// 不再使用时释放，或交给默认的曲目生命周期。
lease.dispose();
```

租约返回本进程loopback URL，支持GET/HEAD及单段Range，不暴露file URL。默认lifetime为track，可选择scope。到期后active为false、url清空；撤销授权、停用或账号变化立即关闭流和文件句柄。宿主正在播放该URL时同时停止对应音源；已解码的数据无法通过关闭HTTP流撤回。

## 下载

```ts
const job = await awaitOperation(
  ctx.downloads.start({
    url: 'https://example.org/song.flac',
    target: file,
    conflict: 'rename',
    idempotencyKey: 'song-download',
    checksum: { algorithm: 'sha256', value: expectedHash },
  }),
);
const result = await awaitOperation(job.wait());
```

job提供snapshot/changed、pause/resume/retry/cancel/wait；下载显示在任务中心，任务取消会中断传输。`wait().cancel()`只取消等待。流式下载不经过内存HTTP响应；默认上限8GiB、可设至64GiB。全局最多4个活动传输，历史全局256项、每安装64项；`list/get/attach/remove`管理历史和重新附着。remove仅清理终止任务的历史/分片，不删除成功文件。

暂停或停用保留私有分片；重新激活后attach并resume。Range配合强ETag或Last-Modified校验，服务器返回200时重写分片；长度、校验和或Range不符时不会发布最终文件。重试与续传可传新的URL/headers/target；账本不保存认证请求头。同一安装的idempotencyKey重复调用返回同一任务；更换源或目标必须使用新key。默认lifetime为scope，显式track或revision绑定切歌取消；撤销目标授权会中断任务，重新授权后需传新的目标引用。

目标冲突默认fail，可选rename/replace。取消/校验失败不留下半截最终文件；已完成的目标不因停用或取消而删除。

## HTTP request

```ts
const response = await awaitOperation(
  ctx.net.request({
    url: 'https://example.org/search',
    method: 'POST',
    headers: { 'User-Agent': 'MyPlugin', 'X-Token': token },
    body: { query: 'music' },
    responseType: 'json',
    timeoutMs: 30000,
  }),
);
```

唯一入口为`ctx.net.request(options)`。不限制域名，不注入宿主账号凭证；支持自定义HTTP方法、请求头、文本/JSON/ArrayBuffer正文。HTTP状态码（包括4xx/5xx）通过response返回，传输错误使操作失败。返回url/status/statusText/headers/data；responseType为json（默认）、text或arrayBuffer。响应头名称小写，重复值返回数组。

支持maxRedirects（默认5，0关闭）、decompress（默认true）、tls.rejectUnauthorized（默认true）和tls.servername。自动压缩协商由Qt处理；显式Accept-Encoding时由调用方解释对应的wire正文。timeoutMs默认30000、0关闭；maxResponseBytes默认32MiB，可设至128MiB，必须为正数；请求正文最多8MiB、头部32KiB、每scope最多16个在途请求。这些预算防止进程内扩展无限积压，不是域名或请求权限分级。

网络运行在独立worker，沿用宿主统一代理路由。取消、停用、重载、退出、账号变化会中断实际reply；传revision可绑定切歌，也可使用resolver的request.track(operation)。`ctx.io`只保存插件私有JSON数据。
