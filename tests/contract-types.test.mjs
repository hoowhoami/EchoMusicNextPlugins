import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { compatibleType, sdkRoot } from '../packages/tools/contract.mjs';

const source = ts.createSourceFile(
  'index.d.ts',
  await readFile(`${sdkRoot}index.d.ts`, 'utf8'),
  ts.ScriptTarget.Latest,
  true,
);
const declaredTypes = new Map();
const visit = (node) => {
  if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
    assert.equal(declaredTypes.has(node.name.text), false, `duplicate ${node.name.text}`);
    declaredTypes.set(node.name.text, node);
  }
  ts.forEachChild(node, visit);
};
visit(source);
// This exercises the checker only; it does not describe an exported host contract.
const bindings = {
  declaredTypes,
  nativeTypes: new Set([
    'EchoPluginOperation',
    'EchoPluginPlayer',
    'EchoPluginReadModel',
    'GlyphRun',
    'EchoGpuGlyphAtlas',
  ]),
};
function type(text) {
  return ts.createSourceFile('type.ts', `type Probe = ${text};`, ts.ScriptTarget.Latest, true)
    .statements[0].type;
}
function accepts(native, text, context = bindings) {
  return compatibleType(native, type(text), context);
}

test('callback-bearing upstream and Folia definitions preserve the explicit QJS allowlist', () => {
  for (const name of [
    'HostActionDefinition',
    'HostTitlebarActionDefinition',
    'HostPlayerbarActionDefinition',
    'HostActionPatch',
    'HostInterceptorDefinition',
    'ThemeDefinition',
    'SkinDefinition',
    'AudioSourceDefinition',
    'BackupProviderDefinition',
    'LyricResolverDefinition',
    'TaskDefinition',
    'TaskPatch',
    'SidebarDefinition',
    'SongMenuDefinition',
    'LyricEffectDefinition',
  ]) {
    assert.ok(declaredTypes.has(name), name);
    assert.equal(accepts('QJSValue', name), true, name);
  }
  assert.equal(accepts('QJSValue', 'HostActionDefinitionFake'), false);
  assert.equal(accepts('QJSValue', 'Record<string, number>'), false);
  assert.equal(accepts('QJSValue', 'any'), false);
  assert.equal(accepts('QJSValue', 'ArrayBuffer'), true);
  assert.equal(accepts('QJSValue', 'string'), true);
});

test('native pointers require the exact name, including nullable and generic read models', () => {
  for (const text of ['EchoPluginPlayer', 'EchoPluginPlayer | null', '(EchoPluginPlayer | null)'])
    assert.equal(accepts('EchoMusic::EchoPluginPlayer *', text), true, text);
  assert.equal(accepts('EchoPluginReadModel*', 'EchoPluginReadModel<LyricRow>'), true);
  for (const native of ['GlyphRun', 'EchoGpuGlyphAtlas']) {
    assert.equal(accepts(`EchoMusic::${native}*`, native), true);
    assert.equal(accepts(`EchoMusic::${native}*`, `${native} | null`), true);
    assert.equal(accepts(`EchoMusic::${native}*`, `${native}Fake`), false);
    assert.equal(accepts(`EchoMusic::${native}*`, `${native} | string`), false);
  }
  for (const text of [
    'EchoPluginPlayerFake',
    'EchoPluginPlayer | string',
    'EchoPluginPlayer | undefined',
    'EchoPluginPlayer | EchoPluginOperation',
    'Record<string, unknown>',
    'any',
  ])
    assert.equal(accepts('EchoMusic::EchoPluginPlayer *', text), false, text);
});

test('map unions validate every arm while typed Partial settings and readonly lists work', () => {
  for (const text of [
    'Partial<HostPlaybackSettings>',
    'Readonly<HostPlaybackSettings>',
    'HostApiPatch | HostTransportPatch',
    'Record<string, JsonValue> & HostMetadataOptions',
  ])
    assert.equal(accepts('QVariantMap', text), true, text);
  for (const text of [
    'HostApiPatch | number',
    'HostApiPatch | (() => void)',
    'HostInterceptorDefinition',
  ])
    assert.equal(accepts('QVariantMap', text), false, text);
  assert.equal(accepts('QStringList', 'readonly string[]'), true);
  assert.equal(accepts('QStringList', 'readonly number[]'), false);
  assert.equal(accepts('QVariantList', 'readonly LyricRow[]'), true);
});

test('recursive aliases stay bounded and primitive aliases never broaden the native type', () => {
  const aliases = ts.createSourceFile(
    'aliases.ts',
    "type Text = ('left' | 'right'); type Loop = Loop; type A = B; type B = A;",
    ts.ScriptTarget.Latest,
    true,
  );
  const context = {
    ...bindings,
    declaredTypes: new Map([
      ...declaredTypes,
      ...aliases.statements.map((node) => [node.name.text, node]),
    ]),
  };
  assert.equal(accepts('QString', 'Text', context), true);
  assert.equal(accepts('int', 'Text', context), false);
  assert.equal(accepts('QString', 'Loop', context), false);
  assert.equal(accepts('QVariantMap', 'A', context), false);
  assert.equal(accepts('qreal', 'number'), true);
  assert.equal(accepts('qulonglong', 'string'), false);
  assert.equal(accepts('State', 'OperationState'), true);
  assert.equal(accepts('State', 'number'), false);
});
