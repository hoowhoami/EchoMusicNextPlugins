import { readFile, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

export const sdkRoot = fileURLToPath(
  new URL('./', import.meta.resolve('@echomusicnext/plugin-sdk/manifest.schema.json')),
);
const execute = promisify(execFile);
export const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
export const loadContract = () => readJson(`${sdkRoot}host-contract.json`);

export async function contractFromHost(host) {
  const { stdout } = await execute(host, ['--export-plugin-sdk'], {
    timeout: 15000,
    maxBuffer: 2 * 1024 * 1024,
  });
  const contract = JSON.parse(stdout);
  if (contract.schemaVersion !== 1 || contract.module !== 'echo:plugin-sdk')
    throw new Error('Host did not export an SDK v1 contract');
  return contract;
}

export function rangeContains(range, version) {
  const parts = range.split(/ +/).filter(Boolean);
  if (!parts.length) return false;
  const target = version.split('.').map(BigInt);
  if (target.length !== 3) return false;
  return parts.every((part) => {
    const match = /^(>=|<=|>|<|=)?([0-9]+\.[0-9]+\.[0-9]+)$/.exec(part);
    if (!match) return false;
    const value = match[2].split('.').map(BigInt);
    let comparison = 0;
    for (let i = 0; i < 3 && !comparison; i++)
      comparison = target[i] < value[i] ? -1 : target[i] > value[i] ? 1 : 0;
    return {
      '>=': comparison >= 0,
      '<=': comparison <= 0,
      '>': comparison > 0,
      '<': comparison < 0,
      '=': comparison === 0,
      '': comparison === 0,
    }[match[1] ?? ''];
  });
}

const nativeScriptDefinitions = new Set([
  'GpuData',
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
]);

export function compatibleType(qtType, type, bindings, depth = 0, seen = new Set()) {
  if (!type || depth > 16) return false;
  const native = qtType.replace('EchoMusic::', '').replace(/\s*\*$/, '');
  const text = type.getText();
  if (native === 'State' || native === 'EchoPluginOperation::State')
    return text === 'OperationState';
  // Callback-bearing definitions are explicitly native-validated QJSValue contracts.
  // Keep these names before expanding aliases such as Partial<Omit<...>>.
  if (
    native === 'QJSValue' &&
    ts.isTypeReferenceNode(type) &&
    nativeScriptDefinitions.has(type.typeName.getText())
  )
    return true;
  const nested = (part, aliases = seen) =>
    compatibleType(qtType, part, bindings, depth + 1, aliases);
  if (ts.isParenthesizedTypeNode(type)) return nested(type.type);
  if (ts.isTypeReferenceNode(type)) {
    if (
      ['Readonly', 'Partial'].includes(type.typeName.getText()) &&
      type.typeArguments?.length === 1
    )
      return nested(type.typeArguments[0]);
    const name = type.typeName.getText();
    const declaration = bindings.declaredTypes.get(name);
    if (declaration && ts.isTypeAliasDeclaration(declaration) && !type.typeArguments?.length) {
      if (seen.has(name)) return false;
      return nested(declaration.type, new Set([...seen, name]));
    }
  }
  if (native === 'QString')
    return (
      text === 'string' ||
      (ts.isLiteralTypeNode(type) && ts.isStringLiteral(type.literal)) ||
      (ts.isUnionTypeNode(type) && type.types.every((part) => nested(part)))
    );
  if (native === 'bool') return text === 'boolean';
  if (['int', 'qint64', 'qlonglong', 'quint64', 'qulonglong', 'double', 'qreal'].includes(native))
    return text === 'number';
  if (native === 'void') return text === 'void';
  if (bindings.nativeTypes.has(native)) {
    const exact = (part) => ts.isTypeReferenceNode(part) && part.typeName.getText() === native;
    return (
      exact(type) ||
      (ts.isUnionTypeNode(type) &&
        type.types.some(exact) &&
        type.types.every(
          (part) =>
            exact(part) ||
            (ts.isLiteralTypeNode(part) && part.literal.kind === ts.SyntaxKind.NullKeyword),
        ))
    );
  }
  if (native === 'QFont') return text === 'QtFont';
  if (native === 'QColor') return text === 'QtColor';
  if (native === 'QRectF') return text === 'QtRect';
  if (native === 'QQuickItem') return text === 'QtQuickItem';
  const record =
    ts.isTypeReferenceNode(type) &&
    type.typeName.getText() === 'Record' &&
    type.typeArguments?.[0]?.kind === ts.SyntaxKind.StringKeyword;
  if (native === 'QStringList') {
    const array = ts.isTypeOperatorNode(type) ? type.type : type;
    return ts.isArrayTypeNode(array) && array.elementType.kind === ts.SyntaxKind.StringKeyword;
  }
  if (native === 'QVariantList') {
    const array = ts.isTypeOperatorNode(type) ? type.type : type;
    return ts.isArrayTypeNode(array);
  }
  if (native === 'QVariantMap') {
    if (ts.isUnionTypeNode(type)) return type.types.every((part) => nested(part));
    const declaration = ts.isTypeReferenceNode(type)
      ? bindings.declaredTypes.get(type.typeName.getText())
      : undefined;
    return (
      (ts.isTypeLiteralNode(type) &&
        type.members.every((member) => ts.isPropertySignature(member))) ||
      record ||
      (declaration &&
        ts.isInterfaceDeclaration(declaration) &&
        declaration.members.every((member) => ts.isPropertySignature(member))) ||
      (ts.isIntersectionTypeNode(type) && type.types.some((part) => nested(part)))
    );
  }
  if (native === 'QByteArray') return text.includes('ArrayBuffer');
  if (native === 'QUrl') return text === 'string' || text.includes('toString');
  if (native === 'QJSValue')
    return (
      ts.isFunctionTypeNode(type) ||
      (record && ts.isFunctionTypeNode(type.typeArguments[1])) ||
      nativeScriptDefinitions.has(text) ||
      // FloatTexture validates these two concrete data transports natively.
      text === 'ArrayBuffer' ||
      text === 'string'
    );
  // QVariant carries API-specific JSON or operation generic results.
  if (native === 'QVariant') return true;
  return false;
}

export async function checkBindings(contract) {
  contract ??= await loadContract();
  const source = ts.createSourceFile(
    'index.d.ts',
    await readFile(`${sdkRoot}index.d.ts`, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const interfaces = new Map();
  const aliases = new Map();
  const visit = (node) => {
    if (ts.isInterfaceDeclaration(node)) interfaces.set(node.name.text, node);
    if (ts.isTypeAliasDeclaration(node)) aliases.set(node.name.text, node);
    ts.forEachChild(node, visit);
  };
  visit(source);
  const bindings = {
    nativeTypes: new Set(Object.keys(contract.types)),
    declaredTypes: new Map([...interfaces, ...aliases]),
  };
  const pkg = await readJson(`${sdkRoot}package.json`);
  if (pkg.version !== contract.sdkVersion) throw new Error('SDK package/host version mismatch');
  for (const [name, native] of Object.entries(contract.types)) {
    const declared = interfaces.get(name);
    if (!declared) throw new Error(`SDK lacks native type ${name}`);
    const members = new Map(declared.members.map((member) => [member.name?.getText(), member]));
    const names = new Set();
    for (const property of native.properties) {
      names.add(property.name);
      const member = members.get(property.name);
      if (
        !member ||
        !ts.isPropertySignature(member) ||
        !compatibleType(property.type, member.type, bindings)
      )
        throw new Error(`SDK property type differs: ${name}.${property.name} (${property.type})`);
      const readonly = member.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.ReadonlyKeyword,
      );
      if (!property.writable && !readonly)
        throw new Error(`SDK must be readonly: ${name}.${property.name}`);
    }
    const methods = new Map();
    for (const method of native.methods) {
      const previous = methods.get(method.name);
      if (!previous || previous.parameters.length < method.parameters.length)
        methods.set(method.name, method);
    }
    for (const [methodName, method] of methods) {
      names.add(methodName);
      const member = members.get(methodName);
      if (method.signal) {
        if (!member?.type?.getText().startsWith('QtSignal'))
          throw new Error(`SDK lacks signal ${name}.${methodName}`);
        const tuple = member.type.typeArguments?.[0];
        const parameters = tuple?.elements ?? [];
        if (
          parameters.length !== method.parameters.length ||
          parameters.some(
            (parameter, index) =>
              !compatibleType(
                method.parameters[index],
                ts.isNamedTupleMember(parameter) ? parameter.type : parameter,
                bindings,
              ),
          )
        )
          throw new Error(`SDK signal arguments differ: ${name}.${methodName}`);
      } else {
        if (
          !member ||
          !ts.isMethodSignature(member) ||
          member.parameters.length !== method.parameters.length ||
          !compatibleType(method.returnType, member.type, bindings) ||
          member.parameters.some(
            (parameter, index) =>
              !compatibleType(method.parameters[index], parameter.type, bindings),
          )
        )
          throw new Error(`SDK method differs: ${name}.${methodName}`);
      }
    }
    for (const declaredName of members.keys())
      if (!declaredName.startsWith('__') && !names.has(declaredName))
        throw new Error(`SDK advertises unavailable member ${name}.${declaredName}`);
  }
  const business = interfaces.get('KugouMethods');
  if (contract.businessMethods) {
    const actual = [...contract.businessMethods].sort();
    const declared = business?.members.map((member) => member.name?.getText()).sort();
    if (JSON.stringify(actual) !== JSON.stringify(declared))
      throw new Error('Business catalog differs from the actual host');
    const overloads = interfaces
      .get('EchoPluginKugou')
      ?.members.filter((m) => m.name?.getText() === 'request');
    const advertised = overloads?.map((m) => m.parameters[0]?.type?.literal?.text).sort();
    if (JSON.stringify(actual) !== JSON.stringify(advertised))
      throw new Error('Business request overloads differ from the actual host');
  }
  const state = aliases.get('OperationState')?.type;
  const values =
    state && ts.isUnionTypeNode(state) ? state.types.map((value) => Number(value.getText())) : [];
  const expected = Object.values(
    contract.types.EchoPluginOperation.enums.find((value) => value.name === 'State').values,
  );
  if (values.length !== expected.length || values.some((value) => !expected.includes(value)))
    throw new Error('SDK operation state values differ');
}

function ordered(value) {
  if (Array.isArray(value)) return value.map(ordered);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, ordered(value[key])]),
    );
  return value;
}

export async function checkHost(host, sync = false) {
  const current = await contractFromHost(host);
  await checkBindings(current);
  if (sync) {
    await writeFile(`${sdkRoot}host-contract.json`, `${JSON.stringify(current, null, 2)}\n`);
  } else if (JSON.stringify(ordered(current)) !== JSON.stringify(ordered(await loadContract()))) {
    throw new Error('Qt host contract changed; update SDK bindings and run sdk-sync deliberately');
  }
  return current;
}
