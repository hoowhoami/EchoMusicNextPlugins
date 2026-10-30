import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { parse } from 'acorn';

async function runtimeModules(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directory);
    if (entry.isDirectory()) result.push(...(await runtimeModules(path)));
    else if (entry.name.endsWith('.mjs')) result.push(path);
  }
  return result;
}
test('all raw Folia QML modules remain valid package ES2016 after formatting', async () => {
  const modules = await runtimeModules(
    new URL('../plugins/folia-lyrics-skin/qml/', import.meta.url),
  );
  assert.ok(modules.length > 10);
  for (const module of modules) {
    const source = await readFile(module, 'utf8');
    assert.ok(source.length > 0, module.pathname);
    const tree = parse(source, { ecmaVersion: 2016, sourceType: 'module', locations: true });
    const pending = [tree];
    while (pending.length) {
      const node = pending.pop();
      if (!node || typeof node !== 'object') continue;
      if (Array.isArray(node)) {
        pending.push(...node);
        continue;
      }
      if (Array.isArray(node.params)) {
        const patterns = node.params.filter(
          (parameter) =>
            parameter.type === 'ObjectPattern' ||
            (parameter.type === 'AssignmentPattern' && parameter.left.type === 'ObjectPattern'),
        );
        assert.ok(
          patterns.length < 2,
          `${module.pathname}:${node.loc.start.line}: Qt6.12 misbinds two object-pattern parameters; lower this source function without changing its logic`,
        );
      }
      for (const [key, value] of Object.entries(node)) if (key !== 'loc') pending.push(value);
    }
  }
});
