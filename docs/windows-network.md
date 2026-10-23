# 插件窗口与网络服务

窗口、TCP 和本地 HTTP/WebSocket 服务分别声明 `windows`、`tcp`、`webServer` capability，并在 `requires.features` 中声明所需的 `windows.custom`、`net.tcp`、`net.webServer`、`net.webSocket`。普通 HTTP 客户端继续使用 `ctx.net.request`。

首次使用会弹出宿主授权确认。授权绑定当前安装和插件包内容；更新了包内容需要重新确认。可提前用 `awaitOperation(ctx.permissions.request('tcp', '连接音乐设备'))` 请求授权，用 `ctx.permissions.granted('tcp')` 查询。拒绝返回 `PermissionDenied`；同一授权的并发调用共用一次确认，取消单个调用不影响其他等待者。等待用户确认不计入插件激活的执行超时；取消全部等待者会关闭未完成的确认。用户可在插件管理页的“插件授权”中撤销；资源立即关闭，不需要停用插件。

能力声明与授权不是进程沙盒。插件应只申请实际需要的能力。

## 独立窗口

在 manifest 声明窗口；声明只登记配方，不创建隐藏窗口：

```json
{
  "windows": [
    {
      "id": "controls",
      "title": "设备控制",
      "component": "ui/Controls.qml",
      "defaultWidth": 480,
      "defaultHeight": 320,
      "minWidth": 240,
      "minHeight": 160,
      "transparent": false,
      "alwaysOnTop": false,
      "skipTaskbar": true,
      "rememberBounds": true
    }
  ]
}
```

组件必须以 `Item` 或其子类为根，接收宿主注入的类型化属性：

```qml
import QtQuick
import EchoMusic.PluginSdk
import EchoMusic.Controls

Rectangle {
    required property EchoPluginContext plugin
    required property EchoPluginWindow window
    color: plugin.dark ? "#202020" : "#fafafa"
    EchoSoftButton {
        text: "关闭"
        onClicked: window.close()
    }
}
```

`awaitOperation(ctx.windows.show('controls'))` 打开窗口并返回句柄。插件管理卡片也有对应窗口入口。`ctx.windows.list()` 查询声明，`ctx.windows.get(id)` 获取句柄；查询不会创建窗口。

`show` 可用 `alwaysOnTop` 和 `allowOutsideWorkArea` 覆盖当前窗口策略，配合 `focus: false` 避免主动抢焦点。句柄提供 `snapshot`、`changed`、`setBounds`、`setIgnoreMouseEvents`、`showOnTop`、`hide` 和 `close`。`showOnTop(false)` 只抬升，不主动抢焦点；不修改长期置顶偏好。`startMove` / `startResize` 从指针按下入口调用，方向支持八个方位。系统不支持时，可使用 `beginMove` / `beginResize`、`updatePointer`、`endPointer` 传递全局逻辑坐标。Wayland 不允许绝对定位时返回 `Unsupported`，使用系统移动/缩放路径。

隐藏、关闭、账号变化、撤权和停用都会释放原生窗口、组件及其展示作用域。再次打开重新构造组件，可按声明恢复几何。业务状态应放在主激活上下文或私有存储，窗口内的定时器、请求和订阅会随窗口回收。最多声明 16 个窗口；尺寸范围为 32–8192 逻辑像素。

## TCP

```ts
const connection = await awaitOperation(
  ctx.net.tcp.connect({
    host: '127.0.0.1',
    port: 9000,
    connectTimeoutMs: 5000,
    writeTimeoutMs: 10000,
    noDelay: true,
    keepAlive: true,
    keepAliveInitialDelayMs: 30000,
  }),
);
await awaitOperation(connection.write(bytes));
const received = await awaitOperation(connection.read()); // ArrayBuffer，null 表示 EOF
await awaitOperation(connection.end()); // 排空写入并发送 FIN，仍可继续读
connection.close();
```

TCP 为直接连接，不使用 HTTP 代理或 TLS。每个作用域最多 16 条连接；每次读最多 64 KiB，只允许一个待完成读；每次写最多 1 MiB，连接写队列最多 4 MiB。写入完成表示本机传输缓冲已排空，不表示对端业务确认。

所有异步调用返回 `EchoPluginOperation`。对连接建立、读、写或 end 调用 `cancel()` 都会关闭整条连接，终止剩余操作。连接建立超时默认 5 秒、写入和 end 默认 10 秒，可配置为 1–120000 毫秒。`end()` 是写半关闭；`close()` 为中止式关闭。账号变化、撤权和作用域退出也会关闭连接。

## 本地 HTTP / WebSocket

```ts
ctx.webServer.onRequest('http', async (request) => ({
  status: 200,
  headers: { 'Content-Type': 'application/json' },
  body: { path: request.path, query: request.query },
}));
ctx.webServer.onUpgrade('upgrade', (request) => ({
  accept: request.path === '/socket',
  protocol: request.protocols.includes('echo') ? 'echo' : undefined,
}));
ctx.webServer.onConnection('connections', (socket) => {
  const message = (data: string | ArrayBuffer, binary: boolean) => {
    if (binary) socket.sendBytes(data as ArrayBuffer);
    else socket.sendText(data as string);
  };
  socket.message.connect(message);
  return () => socket.message.disconnect(message);
});
const server = await awaitOperation(ctx.webServer.listen({ port: 0, path: '/socket' }));
```

HTTP 与 WebSocket 共用一个 IPv4 loopback 端口。`port: 0` 由系统分配；状态和真实端口在返回值与 `status` 属性中。`host` 接受 `127.0.0.1` 或 `localhost`，不对局域网开放。

HTTP 请求包含 method、URL、path、重复参数 query、headers、原始 ArrayBuffer body 和 remoteAddress。支持 Content-Length、chunked 请求与异步处理器；响应可返回字符串、JSON、ArrayBuffer 或 `{ status, headers, body }`。响应完成后关闭该 HTTP 连接。请求体和响应体最多 8 MiB，头部最多 64 KiB；最多 16 个待处理 HTTP 请求，处理截止时间 30 秒。客户端断开取消处理操作，迟到 Promise 不能写入新请求。

WebSocket 升级会检查路径、Host、Origin 和协商协议。升级请求的 `connectionId` 与随后交付的 socket.id 一致，可用于关联异步授权结果。默认只接受同源浏览器及不带 Origin 的原生客户端；`allowCrossOrigin: true` 显式开放其他浏览器来源。`onUpgrade` 支持异步决定，默认截止 10 秒；返回未由客户端提供的协议会拒绝升级。

连接提供 text/binary message、closed、error、pong 信号和 sendText/sendBytes/ping/close。默认最多 16 条连接、单消息 1 MiB、发送缓冲 4 MiB；上限分别为 64、8 MiB、32 MiB。慢消费者的工作线程到插件消息队列也有上限，超过后关闭连接。ping 内容最多 125 字节。

每种 handler 同时保留一个有效注册，替换或 dispose 会撤销旧注册。`onConnection` 可返回清理函数。`awaitOperation(ctx.webServer.close())` 关闭监听、连接和待处理请求；之后可以重新 listen。取消 listen、账号变化、撤权或停用也会关闭资源。停用后的异步结果不会重新打开端口。
