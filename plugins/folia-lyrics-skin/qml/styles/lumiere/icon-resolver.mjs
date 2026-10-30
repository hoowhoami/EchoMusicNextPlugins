// Exact source alias priority over build-time Lucide1.48 ISC vector data, no React runtime.
import { nodes } from './icon-nodes.mjs';
const keysByName = new Map(),
  namesByLowercase = new Map(),
  keys = Object.keys(nodes);
const toPascalCase = (key) => key.replace(/(?:^|-)(\w)/g, (_, char) => char.toUpperCase());
for (const form of [(name) => name, (name) => name + 'Icon', (name) => 'Lucide' + name])
  for (const key of keys) {
    const name = form(toPascalCase(key));
    if (keysByName.has(name)) continue;
    keysByName.set(name, key);
    if (!namesByLowercase.has(name.toLowerCase())) namesByLowercase.set(name.toLowerCase(), name);
  }
export function resolveLucideIcon(name) {
  const key = keysByName.get(typeof name === 'string' ? name.trim() : '');
  return key ? { render: () => ({ props: { icon: { node: nodes[key] } } }) } : null;
}
export function resolveLucideIconNames(names) {
  return Array.from(
    new Set(
      (names || [])
        .map((name) =>
          typeof name === 'string' ? namesByLowercase.get(name.trim().toLowerCase()) : undefined
        )
        .filter((name) => name !== undefined && resolveLucideIcon(name) !== null)
    )
  );
}
