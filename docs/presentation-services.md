# 播放时钟、临时外观与应用图标

## 播放时钟

声明 `playback.clock`。`ctx.player.clock` 是宿主 PlaybackService 的同一份只读采样锚点，设置页、自定义窗口、播放页及 Mini 呈现上下文共用它，不创建独立播放器。

- `positionMs`、`sampledAt` 对应一次锚定；读取不会更新采样时间。
- `isPlaying` 表达播放状态；`isAdvancing` 才表示当前允许推进。加载、seek、缓冲、暂停和错误期间不应继续外推。
- `generation` 在切歌、换源、seek 和时间轴重置时更新；`seekTimestamp` 记录最近的 seek 请求。
- `trackSeq`、`sourceRevision` 区分重复播放和音源代际。
- `samplePosition()` 使用宿主单调时钟投影，最多外推一秒，避免失去上报后无限前进。不要每帧用 `Date.now()` 重建另一份锚点。

```ts
ctx.player.on(
  'clock-state',
  'clock',
  (state) => {
    const { displayState, generation, isAdvancing } = state.clock;
    // 根据新状态更新自己的显示；动画帧读取 ctx.player.samplePosition()。
  },
  true,
);
```

`clockChanged` 和 `snapshotChanged` 供 QML 绑定；`EchoPluginLyricsView` 已使用宿主时钟。隐藏时停止自己的帧动画，重新显示直接读取当前锚点。事件租约随呈现上下文和插件停用撤销。

## 临时外观

声明 feature `appearance.overrides` 和 capability `appearance`。首次调用经过宿主授权，可从插件管理的授权入口撤销。

```ts
import { awaitOperation } from 'echo:plugin-sdk';
const lease = await awaitOperation(
  ctx.theme.setOverride(
    'glass',
    {
      light: { surface: { main: 0.85, card: 0.9 } },
      dark: {
        surface: { main: 0.8 },
        accentGradient: { color: '#336699', opacity: 0.25, height: 60 },
        pageTransition: { enabled: true, durationMs: 180, enterOpacity: 0 },
      },
    },
    10,
  ),
);
lease.dispose();
```

使用现有 `ThemeVariant` 配方，包括主界面、浮层和 Mini 配色、背景及过渡。图片/视频背景只接受包内相对路径。未提供的深浅色变体不产生贡献。

合并规则：先解析用户当前选择的主题，再逐属性应用临时贡献；优先级范围 -10000…10000，数值高者胜出，相同优先级以最后发布为准。同一 scope 的相同 ID 替换旧租约；旧租约再次 dispose 不会撤销新贡献。撤下后重新解析当前有效的宿主值，不恢复过期快照，不写用户主题偏好。

主题中心展示生效中的插件名称，并提供插件管理入口。账号切换、授权撤销、呈现上下文销毁、停用和激活失败均撤销对应贡献。最多同时保留 128 条贡献。

## 应用图标

声明 feature `app.icons` 和 capability `appIcons`。图标可以是包内相对路径，也可以是从已授权文件读取的 ArrayBuffer。包内单文件/一次内联数据不超过 4 MiB、源尺寸不超过 2048×2048；宿主后台解码为有界图像。不得传入未授权的任意本地路径。

```ts
const icons = await awaitOperation(
  ctx.appIcons.set(
    'brand',
    {
      window: 'assets/icon.png',
      tray: 'assets/tray.png',
    },
    20,
  ),
);
// 停用自动撤销，也可以提前释放。
icons.dispose();
```

用户选图时额外声明 `localFiles`，组合已有授权链路：

```ts
const picked = await awaitOperation(
  ctx.files.requestFiles({ purpose: '选择应用图标', access: 'read' }),
);
if (picked.files?.length) {
  const image = await awaitOperation(ctx.files.readBytes(picked.files[0].file));
  await awaitOperation(ctx.appIcons.set('selected-image', { window: image.bytes }));
}
```

目标按属性独立竞争，优先级与临时外观相同。`window` 对应应用/窗口图标（macOS Dock），`tray` 对应实际托盘；macOS 托盘仍使用 template 着色，建议提供单色图形。普通窗口和新创建的 Mini/插件窗口共用宿主图标所有者。

`desktop` 支持 Windows 桌面快捷方式和 Linux 桌面启动器；`taskbar` 支持 Windows 固定任务栏快捷方式。使用 `snapshot.desktop/taskbar` 检查平台能力。只修改属于当前可执行文件的已有入口，不创建假快捷方式或改写安装目录。宿主保留原图标字段，撤销时保留其他字段及用户后续修改；多文件写入失败回退本次修改。

`set()` 返回注册租约。快捷方式的异步呈现状态通过 `snapshot.busy/error` 与 `changed` 通知；失败会撤下相关贡献。窗口图标可用 `setRuntimeWindowIcon(path, priority)`；`restoreDefaultWindowIcon()` 只撤下调用 scope 的窗口贡献。`restoreDefaultDesktopIcon()`、`restoreDefaultTaskbarIcon()` 通过后台事务恢复默认；其他插件仍占有相同目标时返回 Conflict，平台不支持返回 Unsupported。`refresh()` 重新应用当前贡献，可重试快捷方式刷新。

账号切换、授权撤销和停用立即撤下运行时贡献，后台恢复纳入宿主排空。受管快捷方式图像使用宿主缓存，不依赖安装包在卸载后的路径。

## 音频文件元数据

声明 `files.audioMetadata`，并使用已有 `localFiles` 能力与文件引用链路：

```ts
const selected = await awaitOperation(
  ctx.files.requestFiles({
    purpose: '选择要读取标签的音乐',
    access: 'read',
  }),
);
for (const grant of selected.files ?? []) {
  const result = await awaitOperation(ctx.files.metadata(grant.file));
  const { title, artist, album, durationMs, year, track, disk, genre } = result.media ?? {};
}
```

FFmpeg reader 在文件工作线程一次读取，沿用已有格式支持，不启动播放器、不导出封面、不发网络请求。`track`/`disk` 取 index/total 的序号部分；日期取年份，流派返回数组，未知标签保持 null。元数据结果仍包含原有文件状态和图片尺寸。

读取复用文件授权、引用和取消机制；换账号、切歌绑定失效、撤销文件授权、关闭和停用都阻止旧请求交付。插件自己的私有文件与偏好按安装身份隔离并继续跨账号保存；其他插件不能使用这些引用。

## 主题目录、预览与材质

`ctx.theme.themes()` / `skins()` 返回与主题中心同一目录的值快照，包括内置项、选中状态与失败原因。`useTheme('echo')` 选择内置Echo；空字符串仅撤下扩展主题并恢复当前宿主配方；`useSkin('cover' | 'portrait')` 选择内置播放页。完整主题/播放页/Mini组件仍通过原有注册入口提供，不限制为插槽。

`previewTheme()` 不保存选择；`cancelPreview()` 只撤销当前调用者的预览，不能取消另一呈现或用户在主题中心的新预览。选择主题、预览所属呈现销毁、账号改变与停用清理相关预览。临时外观仍按逐属性优先级合并，撤下后恢复当前偏好。

`ThemeVariant.material` 提供临时 `windowFrosted` / `floatingFrosted`、浮层 `blurSigma`（0..64）与 `backdropFillOpacity`（0..1）；走宿主已有材质实现，不改变窗口格式或HDR边界。`surface.floating` / `surface.dialog` 分别调整普通浮层及对话框背景透明度，正文透明度不变。`floating.background` 与主界面 `palette.elevated` 独立。`pageTransition` 支持 `appear`、四点三次Bezier `easing:[x1,y1,x2,y2]`、原有时长/模式/位移/缩放；隐藏、最小化和减少动效立即停止。

`snapshot` 包含实际 `mode` / `themeKey`、预览状态、独立floating与Mini配色。`onSnapshot(id, callback, immediate=true)` 合并同一事件周期的状态通知并提供清理租约；全局外观观察持续到停用，账号变化读取当前状态，不缓存旧账号快照。候选注册不自动选中，用户偏好与临时覆盖分别保存/回收。

## 浮窗

`ctx.windows` 的Mini/桌面歌词操作和自定义窗口统一使用 `windows` capability与可撤销授权。读取快照不触发授权；`command` 的设置/位置参数有类型，Mini置顶沿用 `command('mini','settings',{alwaysOnTop:true})`，展开沿用 `command('mini','panel',{value:'lyric'})`。播放、定位、音量继续使用同一 `ctx.player`，不会创建第二个播放器。

`onSnapshot(id, callback, immediate=true)` 观察实际几何、Mini缩放、是否可全局定位、解锁按钮状态等，窗口移动通知按事件周期合并。独立窗口句柄提供 `setAlwaysOnTop`、`setOpacity`（0..1）、`setTitle`、`minimize`、`restore`，其快照同步原生激活/最小化/透明度/标题状态。隐藏/关闭释放完整窗口树，最小化保留当前窗口并暂停GPU；账号变化恢复清单定义的临时标题/外观，安装级窗口位置仍按原策略记忆。

透明度快照通过 `opacityMode` 区分原生窗口透明度、透明插件窗口的内容层回退与不支持；不支持的后端对不透明窗口返回明确错误。

已提交的宿主偏好/显式Mini操作按宿主语义保存；撤权、账号变化和停用取消在途操作、关闭插件自己的窗口。全局浮窗状态观察读取当前状态，随插件停用回收，窗口自身的呈现观察随窗口回收。不会把插件的一次Mini设置动作当作永久持有宿主窗口的租约。Wayland无法全局定位时明确返回不支持；跨平台原生外观需对应设备验证。
