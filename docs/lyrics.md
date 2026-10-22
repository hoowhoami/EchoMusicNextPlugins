# 歌词解析与写入

声明 `lyrics` capability，并按使用的接口声明 `lyrics.resolvers`、`lyrics.write` feature。SDK 保持 1.0.0。

`ctx.lyrics`共享宿主的歌词、预览、偏移和文字转换链路；播放页、Mini、桌面歌词和皮肤读取同一模型。

## 提供来源

```ts
ctx.lyrics.registerResolver('catalog', {
  order: 100,
  match: ({ track }) => !!track.id,
  resolve: async ({ track, request }) => {
    const operation = ctx.io.readValue('lyrics-' + track.id);
    request.track(operation);
    const text = await awaitOperation(operation);
    return typeof text === 'string' ? { format: 'lrc', content: text, source: '本地歌词库' } : null;
  },
});
```

此例读取插件私有存储中的歌词文本。使用 SDK 的 `awaitOperation` 等待操作；若改为外部歌词库，网络访问仍需对应 capability，HTTP 的 body 为 ArrayBuffer，需要按来源编码解码。每次回调的 `request.track(operation)` 关联实际网络等操作，切歌、账号变更、替换注册、停用和超时会取消它们。未关联的自行创建任务无法随单次解析自动取消，但仍受插件 scope 回收约束。

resolver 只在 main 激活上下文注册。按 order 升序，再按插件 ID 和注册 ID 排序；首个有效结果进入宿主来源列表及预览。`match`、`resolve`分别最多等待 2500ms，抛错、拒绝、格式错误或超时记录回调错误并继续下一个，最后回退宿主原有来源。`null`、`undefined`、`false`表示跳过；空 content 表示明确的无歌词。注册不会覆盖手动来源。手动选择某个插件来源后，只重试该来源；不可用时保留选择，等待用户重新选择或恢复智能推荐。

## 格式

```ts
{ format: 'lrc', content: '[00:01.000]第一行', source: '来源' }
{ format: 'krc', content: '[1000,1000]<0,500,0>第<500,500,0>一行' }
{ format: 'krc', encoding: 'base64', content: encryptedKrcBase64 }
{ format: 'yrc', content: '[1000,1000](1000,500,0)第(1500,500,0)一行' }
```

LRC 支持普通、增强逐字及双行配对；无时间戳文本作为静态歌词。KRC 支持文本和 krc1 压缩加密文件的 base64；YRC 使用绝对字时间，KRC 字时间相对行开始。可附加 LRC 格式的 `translation`、`romanization`，按原始行时间匹配。原文件偏移只在宿主链路应用一次，再叠加用户的全局和单曲偏移。

正文、译文、音译分别最多 1MiB，来源名最多 1024 字节；整份请求最多 4MiB，解析结果最多 20000 行、100000 字，匹配后的译文和音译合计最多 4MiB。解析在专用原生 worker 执行，不阻塞 GUI 或播放控制。取消后不再交付结果；已开始的有界解码可在 worker 完成，退出时排空线程。

## 临时写入

```ts
const revision = ctx.lyrics.snapshot.revision;
await awaitOperation(
  ctx.lyrics.write(revision, {
    format: 'yrc',
    content: document,
    source: '编辑预览',
  }),
);
await awaitOperation(ctx.lyrics.clear(revision));
```

write 返回真实解析及应用结果，不是文件写入。每个激活/呈现 scope 一层；同一 scope 的成功写入替换旧层，多个 scope 最后成功写入优先。解析失败保留上一层。clear 只撤回当前 scope 的层，停用/重载/实例销毁自动撤回，恢复下一层或原来源；正常停止播放仍保留内容及归属。

切歌或账号变化取消待写入操作并清除旧层。revision 失效返回 `StaleTrack`；用户已选手动来源返回 `ManualSelection`。解析期间发生手动选择也不能晚到覆盖。临时写入不持久化为用户的来源偏好；有持久编辑需求应使用安装私有存储，再通过 resolver 提供。

`reload(revision, preserveCurrent=true)`重新解析当前来源，仍遵守手动优先；返回重载请求是否接受，最终状态通过 snapshot 观察。它不会撤回写入层。恢复智能推荐使用宿主来源面板的正式入口。

## 读取与命令

`ctx.lyrics.snapshot`包含歌词行、revision、来源、manual/loading/errorMessage及原有偏移、转换状态。`model`是宿主同一只读模型。`onSnapshot(id, callback, immediate=true)`返回 scope 注册句柄，合并同一事件循环内的重复状态，dispose 或停用停止回调。避免在观察自己的写入结果时无条件再次写入。

`command`接受 `translation`、`romanization`、`conversion`、`offset`、`resetOffset`、`globalOffset`、`offsetStep`、`copyLyrics`、`seek`，参数与 `player.control` 相同，返回可取消操作。
