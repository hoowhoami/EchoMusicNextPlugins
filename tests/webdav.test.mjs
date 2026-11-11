import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'node:http';
import { build } from 'esbuild';

const bundled = await build({
  entryPoints: [new URL('../plugins/webdav-backup/src/entry.ts', import.meta.url).pathname],
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
  plugins: [
    {
      name: 'sdk-fixture',
      setup(b) {
        b.onResolve({ filter: /^echo:plugin-sdk$/ }, () => ({ path: 'sdk', namespace: 'fixture' }));
        b.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({
          contents:
            'export function awaitOperation(op){return op && op.promise ? op.promise : Promise.resolve(op)}',
        }));
      },
    },
  ],
});
const api = await import(
  'data:text/javascript;base64,' + Buffer.from(bundled.outputFiles[0].text).toString('base64')
);
const config = {
  enabled: true,
  url: 'https://dav.example/dav/',
  username: 'user',
  password: 'secret',
  directory: 'EchoMusicNext/Backups',
  rememberPassword: false,
};

test('WebDAV configuration and authentication use Qt-compatible primitives', () => {
  assert.equal(api.directoryUrl(config), 'https://dav.example/dav/EchoMusicNext/Backups/');
  assert.equal(
    api.directoryUrl({ ...config, directory: '我的备份/a b' }),
    'https://dav.example/dav/%E6%88%91%E7%9A%84%E5%A4%87%E4%BB%BD/a%20b/',
  );
  assert.equal(
    api.basicAuthorization('中文', '密:码'),
    'Basic ' + Buffer.from('中文:密:码').toString('base64'),
  );
  assert.equal(
    api
      .fileUrl(config, '中文 1.echonext-backup')
      .endsWith('%E4%B8%AD%E6%96%87%201.echonext-backup'),
    true,
  );
  for (const patch of [
    { url: 'file:///tmp' },
    { url: 'https://user:pass@dav.example/' },
    { url: 'https://dav.example/?token=a' },
    { directory: '../escape' },
    { username: 'a:b' },
    { password: '' },
    { url: 'https://dav.example/%2e%2e/' },
  ])
    assert.throws(() => api.resolveConfig({ ...config, ...patch }));
  assert.throws(() => api.fileUrl(config, '../escape.echonext-backup'));
  assert.throws(() => api.fileUrl(config, 'old.echomusic-backup'));
});

const responseXml = (href, props, code = 200) =>
  `<d:response><d:href>${href}</d:href><d:propstat><d:prop>${props}</d:prop><d:status>HTTP/1.1 ${code} OK</d:status></d:propstat></d:response>`;
test('DAV listing honors successful propstat and only returns direct Next backup files', () => {
  const base = api.directoryUrl(config),
    path = '/dav/EchoMusicNext/Backups/';
  const xml =
    '<d:multistatus xmlns:d="DAV:">' +
    responseXml(
      path + 'good%20%26%20file.echonext-backup',
      '<d:getcontentlength>123</d:getcontentlength><d:getlastmodified>Wed, 11 Nov 2026 10:00:00 GMT</d:getlastmodified>',
    ) +
    responseXml('https://evil.example/x.echonext-backup', '') +
    responseXml(path + 'sub/nested.echonext-backup', '') +
    responseXml(path + '%2e%2e%2fescape.echonext-backup', '') +
    responseXml(
      path + 'folder.echonext-backup/',
      '<d:resourcetype><d:collection/></d:resourcetype>',
    ) +
    responseXml(path + 'old.echomusic-backup', '') +
    responseXml(
      path + 'metadata.echonext-backup',
      '<d:getcontentlength>999</d:getcontentlength>',
      404,
    ) +
    '</d:multistatus>';
  const list = api.parseEntries(xml, base);
  assert.equal(list.length, 2);
  assert.equal(list[0].name, 'good & file.echonext-backup');
  assert.equal(list[0].size, 123);
  assert.equal(list[1].size, undefined);
  assert.throws(() => api.parseEntries('<html>Login</html>', base));
  assert.throws(() => api.parseEntries('<d:multistatus>', base));
  assert.throws(() => api.parseEntries('<!DOCTYPE x><multistatus></multistatus>', base));
});

test('WebDAV methods perform a real HTTP save/list/load/delete round trip', async () => {
  const files = new Map(),
    directories = new Set(['/dav/']),
    requests = [];
  const server = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    requests.push({ method: req.method, path: req.url, depth: req.headers.depth });
    assert.equal(
      req.headers.authorization,
      'Basic ' + Buffer.from('user:secret').toString('base64'),
    );
    const body = Buffer.concat(chunks);
    if (req.method === 'PROPFIND') {
      if (!directories.has(req.url)) {
        res.writeHead(404).end();
        return;
      }
      const entries =
        req.headers.depth === '1'
          ? [...files]
              .map(([path, bytes]) =>
                responseXml(path, `<d:getcontentlength>${bytes.length}</d:getcontentlength>`),
              )
              .join('')
          : '';
      res
        .writeHead(207, { 'Content-Type': 'application/xml' })
        .end(`<d:multistatus xmlns:d="DAV:">${entries}</d:multistatus>`);
    } else if (req.method === 'MKCOL') {
      directories.add(req.url);
      res.writeHead(201).end();
    } else if (req.method === 'PUT') {
      files.set(req.url, body);
      res.writeHead(201).end();
    } else if (req.method === 'GET') {
      res.writeHead(files.has(req.url) ? 200 : 404).end(files.get(req.url));
    } else if (req.method === 'DELETE') {
      files.delete(req.url);
      res.writeHead(204).end();
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const client = api.createClient({
      ...config,
      url: `http://127.0.0.1:${server.address().port}/dav/`,
    });
    const seen = [];
    const send = async (options) => {
      seen.push(options);
      const response = await fetch(options.url, {
        method: options.method,
        headers: options.headers,
        body: options.body,
        redirect: 'manual',
      });
      return {
        status: response.status,
        data:
          options.responseType === 'arrayBuffer'
            ? await response.arrayBuffer()
            : await response.text(),
      };
    };
    const bytes = new Uint8Array([0, 1, 127, 255]).buffer;
    await client.test(send);
    await client.save(send, 'test.echonext-backup', bytes);
    assert.equal(seen.find((r) => r.method === 'PUT').maxRequestBytes, bytes.byteLength);
    assert.equal((await client.list(send))[0].name, 'test.echonext-backup');
    assert.deepEqual(
      new Uint8Array(await client.load(send, 'test.echonext-backup')),
      new Uint8Array(bytes),
    );
    await client.remove(send, 'test.echonext-backup');
    assert.equal(files.size, 0);
    assert.equal(requests.filter((r) => r.method === 'MKCOL').length, 2);
    assert.equal(
      seen.every((r) => r.maxRedirects === 0),
      true,
    );
    await assert.rejects(client.load(send, 'missing.echonext-backup'), /HTTP 404/);
    await assert.rejects(
      api.createClient(config).test(async () => ({ status: 401 })),
      /HTTP 401/,
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('connection tests reject HTML login pages and redirects', async () => {
  await assert.rejects(
    api.createClient(config).test(async () => ({ status: 200, data: '<html>login</html>' })),
    /DAV XML/,
  );
  await assert.rejects(
    api.createClient(config).test(async () => ({ status: 302, data: 'secret response body' })),
    (error) => /HTTP 302/.test(error.message) && !error.message.includes('secret response body'),
  );
});

function signal() {
  const callbacks = [];
  return { connect: (f) => callbacks.push(f), emit: () => callbacks.forEach((f) => f()) };
}
function host(stored) {
  const commands = new Map(),
    providers = [],
    writes = [],
    sessionInvalidated = signal();
  const ctx = {
    active: true,
    sessionInvalidated,
    io: {
      readValue: () => stored,
      writeValue(key, value) {
        writes.push(value);
        return undefined;
      },
    },
    ui: {
      setState(value) {
        this.state = value;
      },
      registerSettings: () => ({}),
    },
    registerCommand: (key, cb) => commands.set(key, cb),
    backups: {
      registerProvider(id, definition) {
        const lease = {
          active: true,
          dispose() {
            this.active = false;
          },
        };
        providers.push({ id, definition, lease });
        return lease;
      },
    },
    onDispose() {},
  };
  return { ctx, commands, providers, writes };
}
test('password stays in memory by default and registration follows saved settings', async () => {
  const h = host(undefined);
  await api.activate(h.ctx);
  assert.equal(h.providers.length, 0);
  await h.commands.get('settings.save')({ config });
  assert.equal(h.writes[0].password, '');
  assert.equal(h.commands.get('settings.read')().password, 'secret');
  assert.equal(JSON.stringify(h.ctx.ui.state).includes('secret'), false);
  assert.equal(h.providers[0].lease.active, true);
  const restarted = host(h.writes[0]);
  await api.activate(restarted.ctx);
  assert.equal(restarted.providers.length, 0);
  assert.equal(restarted.ctx.ui.state.kind, 'error');
  await h.commands.get('settings.save')({ config: { ...config, rememberPassword: true } });
  assert.equal(h.writes[1].password, 'secret');
  assert.equal(h.providers[0].lease.active, false);
  await h.commands.get('settings.save')({ config: { ...config, enabled: false } });
  assert.equal(h.providers[1].lease.active, false);
});
test('connection-test cancellation aborts the real operation and prevents later stages', async () => {
  let reject,
    canceled = 0,
    calls = 0;
  const ctx = {
    active: true,
    net: {
      request() {
        calls++;
        return {
          promise: new Promise((resolve, fail) => {
            reject = fail;
          }),
          cancel() {
            canceled++;
            reject(Error('Canceled'));
          },
        };
      },
    },
  };
  const task = api.createConnectionTest(ctx, config);
  task.cancel();
  await assert.rejects(task.promise, /Canceled/);
  assert.equal(canceled, 1);
  assert.equal(calls, 1);
});
