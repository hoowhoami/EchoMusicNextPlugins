# 音源与队列

声明 feature `playback.audioSource`、`playback.queues`；音源注册及无曲库 hash 的自定义曲目还需 capability `audioSource`。API 属于 SDK 1.0.0。

## 音源注册

通过 `ctx.player.audioSource.registerResolver(id, definition)` 注册，返回可撤销租约。只允许主激活上下文注册，激活提交后生效，同 ID 替换使旧租约失效；停用或更新自动撤销。最多同时 128 个贡献。

`position` 为 `before-catalog`（默认）、`after-catalog` 或 `final-fallback`。正常顺序为：插件前置 → 曲库 → 插件曲库后置 → 云盘 → 插件最终兜底。显式云盘来源仍优先云盘；本地文件、一起听专用地址和 MV 保留宿主专用流程。曲库/云盘返回的每个可用候选也会进入转换链。正常播放和预加载共用这条管线，预加载不提前更改当前曲目。

同阶段按 `order` 升序（默认 1000），再按插件/注册 ID 稳定排序。可提供 `match`、`resolve`、`transform`；至少有一个 resolve/transform。回调接受同步值或 Promise。每次 match/resolve/transform 最长 2500ms，异常、拒绝、超时或无效候选会记录具体插件错误并继续后续解析，转换出错保留已有候选。

上下文包含 `track`、`quality`、`effect`、`forceReload` 和 `preloading`。resolve 另有 `position`；transform 另有 `stage` 和只读 `source`。曲目/时长单位均为毫秒。`forceReload` 表示宿主要求重新取址，例如音质/音效切换；不要只按曲目 ID 缓存一个永久流地址。

```ts
const registration = ctx.player.audioSource.registerResolver('radio', {
  order: 100,
  position: 'before-catalog',
  match: ({ track }) => track.sourceId === `${ctx.id}/station`,
  resolve: ({ track }) =>
    lookupStream(track.id).then((url) => ({
      urls: [url],
      quality: 'standard',
      effect: 'none',
      sourceKind: 'plugin',
    })),
});
```

上例的 `lookupStream` 由插件实现，不是宿主方法。网络仍通过 `ctx.io` 的已授权请求 API。回调上下文的 `request.track(operation)` 将请求/操作绑定到本次回调；切歌、超时、租约撤销等取消会真正终止这些传输。`request.canceled` 与 `canceledChanged` 用于其它资源清理。回调完成同样关闭作用域并取消未完成的关联操作，最多跟踪 128 个。

候选允许 `url`、`urls`、`sources`（每项 `url` 与可选 `audioTrackId`）、`quality`、`effect`、`durationMs`、`sourceKind`、`noticeCode`、`loudness`。音轨为 FFmpeg audio ordinal，0 表示默认，范围 0..256。最多 32 个流，URL 支持 HTTP/HTTPS/file；每个 URL 最多 16384 字符。同一地址的不同音轨保持为独立备用流。响度为 `lufs/gain/peak` 数值，沿用宿主响度归一化设置；`noticeCode` 从播放器 snapshot.sourceNoticeCode 读取。

转换的 `transformStages` 可选上述三个插件阶段与 `catalog`、`cloud`；默认全部。返回规则：

- `null/undefined`：不改当前候选；resolve 表示未匹配到结果。
- `false`：拒绝候选，尝试同阶段下一解析器或宿主后备来源。
- 字符串：替换全部地址并重置显式音轨，保留其它有效元信息。
- 对象：局部覆盖。只更新 `url/urls` 会替换旧流与音轨；只更新 `sources` 则从新流生成地址。

切歌、账号变化、来源替换、预加载失效、注册撤销或插件停用会取消相应回调等待；迟到结果不会回写新曲目。已加载的音频与用户队列不因注销自动删除。

## 自定义曲目与多队列

`ctx.playlist` 操作唯一宿主队列目录。`snapshot` 是最多四个真实来源的头部快照，含 `key/title/count/currentIndex/revision/active`；`changed` 通知目录或歌曲变更。`tracks(key, offset=0, limit=100)` 分页读取，单次最多 500 条。

`replace(id, title, tracks, startIndex=-1)` 创建或替换本插件的来源，实际 key 为 `plugin/<插件ID>/<id>`。默认仅保存队列、不抢占当前播放；非负 startIndex 为显式开始播放。替换正在播放的队列但不指定开始位置时，停止其已移除的曲目并清空旧歌词。队列遵守宿主四来源容量、候播、持久化与跨账号共用规则。

```ts
awaitOperation(
  ctx.playlist.replace(
    'radio',
    '网络电台',
    [{ id: 'live', title: '电台', sourceId: 'station' }],
    0,
  ),
);
```

曲库曲目提供稳定 `id/hash`，可选 `title/artist/album/cover/albumId/songId/durationMs/data`；ID 数字使用十进制字符串。自定义曲目不提供 hash，改用 `sourceId`，由音源解析器取址。宿主为自定义曲目和 sourceId 增加插件内部身份，回读后可原样再次入队；`data` 是一并持久化和传给解析器的有界 JSON 对象，不要在其中放临时流地址或凭证。不会保存解析结果中的临时流 URL。一次提交最多 10000 条、JSON 4MiB。

`play(key,index)` 在指定宿主队列开始播放；`append(key, tracks, placement)` 支持 `last`（普通追加）、`next`（插入候播头）与 `after`（候播尾）。`remove(key,revision,index)`、`move(key,revision,from,to)`、`clear(key,revision)` 使用快照的 revision。命令执行前若队列被替换/移除或行序发生变化，返回 `StaleQueue`，应重新读取快照，而不是盲目重试旧索引。账号切换、scope结束与调用者取消也会阻止排队命令。

操作成功代表宿主接受命令；实际取址/解码/播放状态仍从 `ctx.player` 观察。插件不能通过队列输入写入宿主凭证、原始服务对象或临时地址。
