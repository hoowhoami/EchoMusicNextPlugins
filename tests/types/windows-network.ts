import {
  awaitOperation,
  type EchoPluginContext,
  type EchoPluginWindow,
  type WebServerRequest,
} from 'echo:plugin-sdk';

export async function networkAndWindows(ctx: EchoPluginContext, bytes: ArrayBuffer) {
  const window: EchoPluginWindow = await awaitOperation(
    ctx.windows.show('controls', { focus: false }),
  );
  await awaitOperation(window.setBounds({ width: 480, height: 320 }));
  window.beginResize('se', 100, 100);
  window.updatePointer(120, 130);
  window.endPointer();
  window.hide();
  const tcp = await awaitOperation(ctx.net.tcp.connect({ host: '127.0.0.1', port: 9000 }));
  await awaitOperation(tcp.write(bytes));
  const received: ArrayBuffer | null = await awaitOperation(tcp.read());
  await awaitOperation(tcp.end());
  tcp.close();
  ctx.webServer.onRequest('http', (request: WebServerRequest) => ({
    status: 200,
    headers: { 'Content-Type': 'application/octet-stream' },
    body: request.body,
  }));
  ctx.webServer.onUpgrade('upgrade', (request) => ({
    accept: request.protocols.includes('echo'),
    protocol: 'echo',
  }));
  ctx.webServer.onConnection('connections', (socket) => {
    const message = (data: string | ArrayBuffer, binary: boolean) => {
      if (binary) socket.sendBytes(data as ArrayBuffer);
      else socket.sendText(data as string);
    };
    socket.message.connect(message);
    return () => socket.message.disconnect(message);
  });
  await awaitOperation(ctx.webServer.listen({ port: 0, path: '/socket' }));
  await awaitOperation(ctx.webServer.close());
  // @ts-expect-error TCP port must be a number.
  ctx.net.tcp.connect({ host: '127.0.0.1', port: '9000' });
  // @ts-expect-error Host services only bind loopback.
  ctx.webServer.listen({ host: '0.0.0.0' });
  // @ts-expect-error Only supported resource capabilities can be requested.
  ctx.permissions.request('arbitraryNativeCode');
  return received;
}
