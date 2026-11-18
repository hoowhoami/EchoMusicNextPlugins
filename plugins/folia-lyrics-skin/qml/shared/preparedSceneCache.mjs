// One immutable prepared scene per plugin engine, bounded to 4 MiB. Page-owned
// verifiers compare every source row before reuse. Workers and GPU objects retire.
let cached = null;
export function get(key) {
  return cached && cached.key === key ? cached : null;
}
export function remember(key, rows, result) {
  const serialized = JSON.stringify({ key, rows, result });
  cached = serialized.length * 2 <= 4 * 1024 * 1024 ? JSON.parse(serialized) : null;
}
