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

颜色支持QColor或Qt颜色字符串；font必须为完整Qt字体（例如ctx.font或QML的Qt.font），fontSize/fontWeight/letterSpacing在完整基础字体上覆盖，保留回退链。radius、borderWidth、opacity等均有原生范围检查。未知属性、无效颜色/数值/selector会拒绝并提供errorMessage；不开放width/x/visible/enabled等业务与布局属性。每个part的properties列出实际允许的字段，规则中不适用于该part的字段不参与计算。

`query(selector)`返回第一个实例或null；`queryAll`只返回已存在的实例，role支持精确值、`*`或`control.*`形式，key/surface/window/id精确匹配。空selector为全部已公开实例，不扫描私有对象或强制创建页面/列表/弹层。

EchoUiPartRef的id/revision是不可重用的实例身份。key用于业务资源匹配，不等于实例身份。窗口重建、卸载、虚拟列表池化或key改变会使旧ref.valid=false；旧ref绝不会指向新歌曲。geometry为窗口scene坐标、visuals为宿主声明的基础视觉值与当前覆盖值的合并快照，未声明的字段可缺省；window是引擎内窗口身份，不是系统句柄。引用不公开宿主Item。`invoke(action,args)`仅分发actions中声明的宿主命令，并执行有效/可见/enabled检查；返回操作表示已分发，实际业务仍走宿主服务与原错误反馈。

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

append/prepend插入公开目标的视觉子项末/首；before/after插入其父项中的相邻视觉位置，Qt原生Row/Column/Layout继续管理几何，作者提供implicit尺寸与Layout约束。无布局的父项保留Qt普通Item定位规则。background/foreground作为填满目标的装饰层；可使用Shape、QML动效或ShaderEffect，遵循宿主减少动效与资源生命周期。replace只允许ref.replaceable=true的公开宿主，填满目标并替换宿主视觉正文，保留公开命令。多个替换者按相同优先级规则仲裁；尚未成功加载的替换者不隐藏原正文。

目标隐藏、最小化或完全离开窗口/祖先裁剪区域时销毁完整组件树，恢复显示后按需创建；key变化/卸载/停用后旧挂载永久失效。异步加载中的晚到结果不能重建已撤销实例。加载错误报告为真实插件错误并回退原正文，不伪装为loaded。包内弹层须复用EchoPopupLoader/EchoFileDialogLoader及共享协调器，不能预建隐藏弹层。

当前公开区域及三端验收边界以宿主文档和实际ref为准。parts/styles是局部扩展机制；主题中心候选、完整播放页皮肤选择与Mini统一主题具有独立的选择/配置协议，不能用未选择主题的全局规则代替。
