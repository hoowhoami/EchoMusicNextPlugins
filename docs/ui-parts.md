# 宿主公开区域与样式

manifest的requires.features声明`ui.parts`、`ui.styles`。插件使用同一Qt Quick引擎中的宿主共享控件；这不是CSS/DOM兼容层或安全沙盒。

```ts
export function activate(ctx) {
  const rule = ctx.ui.styles.registerRule(
    'rows',
    { role: 'song.row', surface: 'main' },
    { background: '#18202a', foreground: '#d2eaff', radius: 10 },
    10,
  );
  if (!rule) throw new Error(ctx.ui.styles.errorMessage);
}
```

作用于已存在和后续出现的匹配区域。字段独立比较priority，较大值优先；相同priority按插件ID、规则ID的字典序确定，较大者优先，与异步加载顺序无关。相同插件同规则ID会替换前租约，旧句柄不能撤销新规则。`rule.update(values)`替换整份字段映射，遗漏字段退出贡献；`setPriority()`重新排序；`dispose()`即时撤销。停用、失败、重载、卸载与关闭自动回收scope，恢复下一层贡献或宿主当时的基础绑定，不写入用户主题设置。

颜色支持QColor或Qt颜色字符串；font必须为完整Qt字体（例如ctx.font或QML的Qt.font），fontSize/fontWeight/letterSpacing在完整基础字体上覆盖，保留回退链。radius、borderWidth、opacity等均有原生范围检查。未知属性、无效颜色/数值/selector会拒绝并提供errorMessage；不开放width/x/enabled等任意属性；visible和Layout约束使用下文的有界布局契约。每个part的properties列出实际允许的字段，规则中不适用于该part的字段不参与计算。

`query(selector)`返回第一个实例或null；`queryAll`只返回已存在的实例，role支持精确值、`*`或`control.*`形式，key/surface/window/id精确匹配。空selector为全部已公开实例，按消费者需求发现可扩展结构，不强制创建页面/列表/弹层。

EchoUiPartRef的id/revision是不可重用的实例身份。key是节点语义键，resourceKey限定委托资源；它们不等于实例身份。窗口重建、卸载、虚拟列表池化或key改变会使旧ref.valid=false；旧ref绝不会指向新歌曲。geometry为窗口scene坐标、visuals为宿主声明的基础视觉值与当前覆盖值的合并快照，未声明的字段可缺省；window是引擎内窗口身份，不是系统句柄。引用不公开宿主Item。`invoke(action,args)`仅分发actions中声明的宿主命令，并执行有效/可见/enabled检查；返回操作表示已分发，实际业务仍走宿主服务与原错误反馈。

`observe(id,selector,callback,immediate=true)`返回scope租约，事件为added/changed/removed/event，包含part、event及payload。初始实例可立即排队投递，后续增量观察；同一实例的changed在一轮事件循环内合并，停用后不再投递。removed携带原ref并已失效。直接连接ref.changed/invalidated/eventOccurred时，同样应随插件或自己的组件scope断开。

`mount(id,ref,position,packageRelativeQml,priority=0)`加载包内真实QML，返回active/loaded/errorMessage句柄。组件必须有Item根及typed required属性：

```qml
import QtQuick
import EchoMusic.PluginSdk 1.0
Rectangle {
    required property EchoPluginContext plugin
    required property EchoUiPartRef part
    color: plugin.accent
    opacity: 0.15
}
```

append/prepend插入公开目标的视觉子项末/首；before/after插入其父项中的相邻视觉位置，Qt原生Row/Column/Layout继续管理几何，作者提供implicit尺寸与Layout约束。普通Item父项中的before/after使用共享锚点组，源控件保留原绑定。background/foreground作为填满目标的装饰层；可使用Shape、QML动效或ShaderEffect，遵循宿主减少动效与资源生命周期。replace只允许ref.replaceable=true的公开宿主，填满目标并替换宿主视觉正文，保留公开命令。多个替换者按相同优先级规则仲裁；尚未成功加载的替换者不隐藏原正文。

目标隐藏、最小化或完全离开窗口/祖先裁剪区域时销毁完整组件树，恢复显示后按需创建；key变化/卸载/停用后旧挂载永久失效。异步加载中的晚到结果不能重建已撤销实例。加载错误报告为真实插件错误并回退原正文，不伪装为loaded。包内弹层须复用EchoPopupLoader/EchoFileDialogLoader及共享协调器，不能预建隐藏弹层。

当前公开区域及三端验收边界以宿主文档和实际ref为准。parts/styles是局部扩展机制；主题中心候选、完整播放页皮肤选择与Mini统一主题具有独立的选择/配置协议，不能用未选择主题的全局规则代替。

## 通用界面贡献

声明 `ui.composition` 后，`parts.contribute(id, selector, definition)` 持续匹配公开语义区域，包括以后创建的页面和虚拟委托。使用此能力时，宿主按需发现当前引擎的原生 Qt Quick 对象树；普通 Row、Column、Grid、Flow 和 Layout 不需要逐个改造或增加专用插槽。没有消费者时停止结构监听并释放自动节点。它返回可更新、可撤销的 `EchoUiContribution`，`matches` 提供每个实例的状态和错误。选择器新增 `parentId` 和 `owner`（宿主为 `@host`，其它为插件 ID）；引用提供 `parentId/layoutKind/layoutEngine/insertionPositions/automatic/owner/composable/contractVersion`。`insertionPositions` 和 `properties` 列出当前目标的真实能力；`layoutEngine` 区分 Layout 与原生定位器。ID 是本次实例的身份，批量规则可用 role/key/surface，单一位置优先用稳定 address 或 scope/ancestor 限定。

```ts
const panel = ctx.ui.parts.contribute(
  'queue-tools',
  { role: 'layout.playerbar', key: 'rightRow' },
  {
    operation: 'insert',
    position: 'prepend',
    component: 'QueueTools.qml',
    priority: 10,
    layout: { preferredWidth: 96, fillHeight: true },
  },
);
if (!panel) throw new Error(ctx.ui.parts.errorMessage);
```

| operation | 行为                                                                                                                                    |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| insert    | append/prepend 放进原生 Row/Column/Grid/Flow 或 Layout；before/after 在目标所在原生容器中占位；background/foreground 为填满目标的装饰层 |
| wrap      | 在公开内容工厂外组合一层插件 QML，使用 EchoUiHostContent 呈现其内层内容                                                                 |
| replace   | 选择一个新的内容基底；其它插件的 wrap 继续在其外层组合                                                                                  |
| hide      | 临时覆盖 visible，撤销后恢复宿主当前绑定                                                                                                |
| layout    | 临时覆盖公开的 Layout 约束，不直接写 x/y/width/height                                                                                   |
| move      | 把原生容器的子项移动到同一窗口中的另一个原生容器；position 为 append/prepend                                                            |

Layout 布局字段为 preferred/minimum/maximumWidth/Height、fillWidth/Height、alignment、visible；GridLayout 另外支持 row/column 和 rowSpan/columnSpan。原生 Row/Column/Grid/Flow 使用 implicit 尺寸或 preferredWidth/Height，不接受 fill、跨度等 Layout 专属字段。尺寸有界且必须有限；行列/跨度/对齐为整数，最小尺寸不能超过最大尺寸。insert 的 layout 只作用于插入项；其它操作作用于目标。容器仍由 Qt 原生布局计算几何，Item 根提供 implicitWidth/implicitHeight。不能把存在锚点的任意私有子项搬进 Layout；无公开内容工厂的区域拒绝 wrap/replace，并在 matches 中返回 unsupported。

```qml
import QtQuick
import QtQuick.Layouts
import EchoMusic.PluginSdk
Item {
    required property EchoPluginContext plugin
    required property EchoUiPartRef part
    RowLayout {
        anchors.fill: parent
        EchoUiHostContent { part: parent.parent.part; Layout.fillWidth: true; Layout.fillHeight: true }
        // 在此加入插件自己的面板、按钮或 GPU 画布。
        Rectangle { Layout.preferredWidth: 40; Layout.fillHeight: true; color: "teal" }
    }
}
```

宿主原有 UI 的 QObject 所有权不转交给插件。原生内容由宿主借入包装层，撤销时归还；路由上下文、业务服务和原有原生内容不会为了包裹而复制。页面、歌词视口、标题栏、侧栏、播放栏和 Mini 提供内容工厂；任意插件 QML 可导入宿主 Controls 模块，并使用 EchoUiRegion（组件工厂）或 EchoUiPartHost（保留内容工厂）公开自己的区域。Qt Row/Column/GridLayout 的语义包装分别为 EchoUiRow/Column/Grid。

`when` 对公开 state 做精确字段匹配，不满足时撤下视觉和布局贡献，继续观察条件。规则不匹配自身插件创建的节点，插件内部直接使用 QML 组合。每条贡献最多持有 256 个实时匹配目标；页面销毁、实例身份变化、账号切换和停用使旧引用失效。隐藏、最小化和离开裁剪区域会暂停插件呈现，恢复后按需创建；GPU 资源沿插件呈现 scope 回收和重建。插件可保存纯 UI 状态到自己的存储，不能依赖视觉对象长期存活。

替换、布局和移动按用户区域偏好、priority、插件 ID、贡献 ID 仲裁；包裹按相同顺序从内到外组合，插入按相同顺序排位，异步加载先后不决定顺序。移动拒绝跨窗口和父子环。撤销恢复下一位贡献者或原父布局与原相邻位置。`update` 接受一次新修订的异步准备，语法或构造失败保留上一版；用 errorMessage/matches/changed 观察结果，不把返回 true 当作构造完成。

插件管理页的“界面扩展检查器”显示语义树、目标契约、布局、贡献来源和失败原因，可恢复某一区域或调整贡献优先级。Ctrl+Shift+F12（macOS 也支持 Command+Shift+F12）先关闭界面贡献并打开检查器；全局开关与稳定地址的区域偏好按当前账号持久化。检查器本身不接受插件贡献。窗口透明、毛玻璃和普通界面合成不属于此 API 的控制范围。

作者可运行 `echo-plugin test-host --host /absolute/echomusicnext --runtime-test /absolute/echo-plugin-runtime-test --suite ui`，用真实 Qt 宿主和构建包验证布局、回收、更新和正式频谱。完整宿主回归使用默认的 `--suite all`；离屏通过不等于三端视觉验收。

### 在现有按钮旁插入动作

直接选择稳定的按钮 key，不需要宿主为它添加插槽。下面的贡献随页面创建、关闭及重建生效；原翻译按钮不可见时，新增按钮仍按所在 Column 的正常可见性参与布局。

```js
ctx.ui.parts.contribute(
  'lyric-action',
  { key: 'lyricTextAction-translation', surface: 'playback' },
  {
    operation: 'insert',
    position: 'after',
    component: 'LyricAction.qml',
    layout: { preferredWidth: 36, preferredHeight: 36 },
  },
);
```

```qml
import QtQuick
import EchoMusic.Controls
import EchoMusic.PluginSdk

EchoSoftButton {
    id: action
    required property EchoPluginContext plugin
    required property EchoUiPartRef part
    text: "新"
    colors: EchoUiPartPalette { part: action.part }
    onClicked: plugin.executeCommand("open-tool")
}
```

`EchoUiPartPalette` 复用目标当前的类型化呈现色板，跟随播放页封面配色、主题及 Mini，而不是强行使用全局颜色。`part.palette` 仅返回颜色值，不暴露宿主对象。

需要选择匿名按钮组时可用 `{ parentOf: { key: 'lyricTextAction-translation', surface: 'playback' } }`；最多嵌套八层，结构变更后重新匹配。匿名节点的 `@` key 仅在对象存活期间稳定，持久规则应由稳定的语义节点或命名控件作锚点。`automatic` 表示自动发现的节点。样式可作用于原生 Rectangle、Text、字体及容器间距，仍只接受 `properties` 列出的字段；优先级结束后恢复原 QML 绑定，随后主题或数据变化继续生效。

`wrap/replace` 的原生内容组合要求 `composable` 内容工厂；普通叶子节点的插入、隐藏、样式及原生布局能力不因此受限。没有内容工厂时明确返回 `unsupported`，不会用截图、空代理或重建业务页面冒充原生内容保留。

匿名节点的 `@` 前缀保留给实例键；检查器对它的优先选择仅在对象存活期间生效，不写入账号偏好，避免重启后命中其它对象。具有唯一持久地址的语义节点选择按账号持久化。

### 地址、复用与自由锚点组

`queryUnique(selector)` 要求恰好一个匹配，零匹配或重名时返回 null 并说明数量；`query/queryAll` 保留首项/批量查询语义。`part.address` 标识具体语义区域，包含呈现、窗口和所有权范围；`part.scope` 可限定同一区域，`ancestor` 可匹配稳定祖先，`resourceKey` 表示当前委托资源。`persistent=false` 的地址仅用于当前实例，不能跨重建保存。空名和重复地址自动使用实例地址；检查器对此只保存临时偏好。移动或包裹不会改变原生内容的逻辑所有权地址。

原生 ListView/GridView/TableView 的池化、复用和资源代际会退休整棵语义子树；旧引用不会转指新资源。自定义委托可用 Controls 的 `EchoUiScope.resourceKey` 声明自己的稳定资源键。宿主已统一标记插件页面、皮肤、surface、设置、dialog 和独立窗口的归属，无需逐处声明。

普通 Item 中的相邻动作使用 `before/after`，可指定 `axis: 'horizontal' | 'vertical'` 和 `gap`。宿主用原生 RowLayout/ColumnLayout 安排新增项，并以可撤销的呈现变换对齐源槽位；源控件的父项、anchors 和业务对象保留。组受父区域及相邻盒约束，右/下/居中锚点保留对应组对齐；文本输入的边缘动作统一预留内边距，停用恢复原绑定。无法满足最小尺寸时，matches返回constrained并保留宿主原位置；空间恢复后自动重新排列。更新无法满足约束时恢复旧修订。已有原生布局仍决定自己的方向与间距。模型型 Tab/菜单/列表内容的增加属于各自模型协议，不应通过自由锚点组伪造数据项。

```ts
ctx.ui.parts.contribute(
  'input-action',
  { key: 'clearTextAction', scope: inputScope },
  {
    operation: 'insert',
    position: 'before',
    axis: 'horizontal',
    gap: 4,
    component: 'InputAction.qml',
    layout: { preferredWidth: 28, preferredHeight: 28 },
  },
);
```

background/foreground 始终为不参与原生排位的装饰层；它们不会撑大 Row/Grid/Layout 的自然尺寸。

## 原生控件契约

引用的 `stateSchema` 描述当前公开状态类型，`actionSchema` 描述动作参数。常见控件提供 checked、hovered、pressed、value、currentIndex、编辑选择及滚动状态；编辑文本和密码不进入快照。`invoke` 支持原生焦点、激活、范围值、选择、滚动和普通编辑动作，以各引用的 actions/schema 为准。状态选择器也可用于样式规则：

```ts
ctx.ui.styles.registerRule(
  'checked-spacing',
  { role: 'control.*', state: { checked: true } },
  { padding: 12, opacity: 0.9 },
);
```

`mapPoint({x,y}, 'window')` 将目标局部坐标转为逻辑窗口坐标，`'local'` 做反向转换；失败返回 `{valid:false}`。插件内容仍使用 Qt 的 Keys、Accessible、Drag/DropArea 和输入法机制。原生控件的 contentItem/background/indicator 在受管工厂中借入，动作、QObject 所有权和宿主绑定保留；撤下组合恢复原父项。系统原生窗口、检查器和不能安全借入的自绘叶节点保持既有能力边界，以 composable 和 preflight 为准。

`visualSources` 按字段给出当前获胜的 owner/id/priority/value/selector。`preflight(selector, definition)` 返回目标数、逐目标兼容性及唯一选择器；组件准备或实际布局仍可能报告更晚的错误。检查器的拾取按钮可直接选中公开节点并高亮，Esc 取消；选择器优先使用其生成的唯一语义地址。

## 模型内容贡献

声明 `ui.models`，使用 `contributeModel(id, selector, definition)` 注册模型内容，句柄支持 update/dispose，matches 报告每个目标的状态与错误。一次定义为 1–256 个唯一 key，同一视图最多 1024 个扩展条目。优先级及区域偏好复用已有顺序机制。

- `rows`：为原生 ListView/GridView/TableView 追加行；原数据与原生索引不变。支持 C++ item model、数值、字符串/值列表和 JS 数组，保留原委托与数据绑定。
- `columns`：为原生 TableView 追加列，保留宿主列 provider 与显式内容尺寸，扩展列使用自己的尺寸。
- `menu`：为共享 EchoMenu 增加原生 Action 或分隔项，走现有键盘、勾选与命令路径。
- `tabs`：为共享 EchoTabBar / EchoDetailTabs 增加标签及正文；插件标签使用独立选择身份，不把其索引发给宿主 picked。contentTarget 必须在同一窗口中唯一解析到可组合正文区域。
- `settings`：将章节加入现有设置目录及搜索，选择后通过同一正文 Loader 加载；撤下选中章节恢复之前的宿主章节。

```ts
const rows = ctx.ui.parts.contributeModel(
  'summary',
  { key: 'results' },
  {
    kind: 'rows',
    entries: [{ key: 'summary', component: 'Summary.qml', height: 40 }],
  },
);
ctx.ui.parts.contributeModel(
  'commands',
  { role: 'model.menu' },
  {
    kind: 'menu',
    entries: [
      { key: 'separator', separator: true },
      { key: 'toggle', label: '显示详情', command: 'toggle-details', checkable: true },
    ],
  },
);
ctx.ui.parts.contributeModel(
  'page',
  { key: 'detailTabs' },
  {
    kind: 'tabs',
    entries: [
      {
        key: 'details',
        label: '扩展详情',
        component: 'Details.qml',
        contentTarget: { key: 'detailBody' },
      },
    ],
  },
);
ctx.ui.parts.contributeModel(
  'settings',
  { role: 'model.settings' },
  {
    kind: 'settings',
    entries: [{ key: 'display', label: '扩展显示', component: 'Settings.qml', keywords: '频谱' }],
  },
);
```

单元 QML 提供 typed plugin/part，按需声明 `row` 和 `entry` 两个 var 属性；row 包含 index/column/values，entry 包含自身定义。Table 行按单元调用，使用 row.column 区分列。提供 implicitWidth/implicitHeight，或在条目中声明正的 width/height（至多 16384）。额外 values 必须为有限 JSON，单次定义至多 1 MiB、嵌套至多 16 层；宿主行值有 64 KiB 预算，不传递宿主 QObject。菜单的 command 是本插件注册的命令，勾选动作的参数包含 checked。

同一模型贡献任一目标不兼容或超出容量时撤下该贡献的全部目标，`matches` 和 `errorMessage` 返回原因；目标集合/容量变化后重新评估，更新定义也可重试。不会保留一部分目标的新修订。

虚拟单元池化、换资源、隐藏、账号切换及停用会退休呈现作用域，恢复时重新创建；需要保留的业务状态归插件状态/存储，不依赖离屏单元的 QML 对象。

## 成组界面提交

声明 `ui.transactions`，`applyBatch` 对当前匹配的节点身份执行一次成组准备与发布。每组 1–64 条、至多 256 个目标、定义至多 1 MiB；可见组件先在隐藏作用域中创建，必需属性、目标兼容性、预算或布局容量失败时，更新保留旧组。隐藏内容遵循原有显示时创建的生命周期。组更新不扩大现有 128 个呈现作用域上限。

```ts
const group = ctx.ui.parts.applyBatch('translation-tools', [
  { id: 'spacing', selector: { key: 'lyricToolbar' }, style: { spacing: 8 } },
  {
    id: 'action',
    selector: { key: 'translation' },
    definition: { operation: 'insert', position: 'after', component: 'Action.qml' },
  },
]);
group?.rejected.connect((message) => console.log(message));
// update 返回是否接受准备；以 pending/state/errorMessage 或 committed/rejected 观察结果。
group?.update([{ id: 'spacing', selector: { key: 'lyricToolbar' }, style: { spacing: 12 } }]);
group?.cancel(); // 取消待提交更新，保留已提交组。
group?.dispose(); // 撤销整组。
```

快照不会自动选中新建页面；持续跟随未来实例使用 contribute/observe。账号切换、停用或作用域退休撤销整组及准备中的工作。事务覆盖界面贡献，组件自身发起的业务命令仍遵循对应 API 的取消与权限契约。
