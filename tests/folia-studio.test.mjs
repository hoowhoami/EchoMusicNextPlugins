import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const bundle = await build({
  entryPoints: [
    fileURLToPath(new URL('../plugins/folia-lyrics-skin/src/studio.ts', import.meta.url)),
  ],
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
  plugins: [
    {
      name: 'operations',
      setup(builder) {
        builder.onResolve({ filter: /^echo:plugin-sdk$/ }, () => ({
          path: 'sdk',
          namespace: 'fixture',
        }));
        builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({
          contents: 'export function awaitOperation(operation) { return operation.promise; }',
        }));
      },
    },
  ],
});
const { registerStudio } = await import(
  'data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64')
);
function signal() {
  const callbacks = new Set();
  return {
    connect: (fn) => callbacks.add(fn),
    disconnect: (fn) => callbacks.delete(fn),
    emit: () => {
      for (const fn of [...callbacks]) fn();
    },
  };
}
function fixture() {
  const commands = new Map(),
    operations = [],
    disposers = [];
  const ctx = {
    active: true,
    ui: {
      state: {},
      setState(next) {
        this.state = next;
        return true;
      },
      showDialog() {
        let resolve, reject;
        const operation = {
          state: 1,
          errorCode: '',
          errorMessage: '',
          promise: new Promise((yes, no) => {
            resolve = yes;
            reject = no;
          }),
        };
        operation.succeed = (value) => {
          operation.state = 2;
          resolve(value);
        };
        operation.fail = (state, code, message) => {
          Object.assign(operation, { state, errorCode: code, errorMessage: message });
          reject(new Error(message));
        };
        operations.push(operation);
        return operation;
      },
    },
    registerCommand(name, fn) {
      commands.set(name, fn);
      return true;
    },
    onDispose(fn) {
      disposers.push(fn);
      return true;
    },
  };
  const config = {
    values: {},
    active: true,
    changed: signal(),
    busyChanged: signal(),
    errorChanged: signal(),
    patch: () => true,
  };
  registerStudio(ctx, config);
  return {
    ctx,
    operations,
    open: () => commands.get('folia.studio.open')(),
    dispose: () => disposers.forEach((fn) => fn()),
  };
}
function dialog() {
  return {
    active: true,
    closed: signal(),
    close() {
      this.active = false;
      this.closed.emit();
    },
  };
}
test('repeated studio opens share a pending shell and an active dialog', async () => {
  const f = fixture(),
    first = f.open();
  assert.equal(await f.open(), false);
  assert.equal(f.operations.length, 1);
  const handle = dialog();
  f.operations[0].succeed(handle);
  assert.equal(await first, true);
  assert.equal(await f.open(), true);
  assert.equal(f.operations.length, 1);
  handle.close();
  assert.equal(f.ctx.ui.state.foliaStudioOpen, false);
  f.dispose();
});
test('closing before the asynchronous studio body is ready cancels quietly and permits reopen', async () => {
  const f = fixture(),
    pending = f.open();
  f.operations[0].fail(4, 'Canceled', 'Operation canceled');
  assert.equal(await pending, false);
  assert.equal(f.ctx.ui.state.foliaStudioOpen, false);
  const next = f.open(),
    handle = dialog();
  f.operations[1].succeed(handle);
  assert.equal(await next, true);
  f.dispose();
  assert.equal(handle.active, false);
});
test('real dialog failures retain diagnostic details but reject with an action-specific message', async (t) => {
  const warnings = [];
  t.mock.method(console, 'warn', (...args) => warnings.push(args));
  const f = fixture(),
    pending = f.open();
  f.operations[0].fail(3, 'ComponentError', 'private loader diagnostic');
  await assert.rejects(pending, { message: '无法打开歌词样式设置，请重试' });
  assert.deepEqual(warnings, [
    ['Folia studio open failed:', 'ComponentError', 'private loader diagnostic'],
  ]);
  assert.equal(f.ctx.ui.state.foliaStudioOpen, false);
  f.dispose();
});
test('retiring while the dialog opens closes a late handle without reviving studio state', async () => {
  const f = fixture(),
    pending = f.open(),
    handle = dialog();
  f.dispose();
  f.operations[0].succeed(handle);
  assert.equal(await pending, false);
  assert.equal(handle.active, false);
});
