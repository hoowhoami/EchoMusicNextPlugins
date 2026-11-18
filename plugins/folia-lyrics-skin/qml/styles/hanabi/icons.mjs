import { definitions, aliases } from '../sonnet/icons-data.mjs';
import { iconPath } from '../sonnet/icons.mjs';
export function resolveLucideIconNode(name) {
  const key = aliases[name];
  return key ? { name, node: definitions[key].node } : null;
}
export function lucideIconPath2d(value) {
  return { path: [['svg', iconPath(value.name)]] };
}
