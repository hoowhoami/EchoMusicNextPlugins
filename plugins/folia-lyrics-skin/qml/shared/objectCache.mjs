// Cache values live on their owning numerical object, never in a global strong-key map.
// QV4's weak-table key lookup failed during repeated native presentation retirement.
let sequence = 0;
export function createObjectCache() {
  const slot = '__foliaNativeCache' + ++sequence;
  const cache = {
    get(key) {
      return key && Object.prototype.hasOwnProperty.call(key, slot) ? key[slot] : undefined;
    },
    has(key) {
      return !!key && Object.prototype.hasOwnProperty.call(key, slot);
    },
    set(key, value) {
      if (!key || (typeof key !== 'object' && typeof key !== 'function'))
        throw Error('Object cache requires an owning object');
      Object.defineProperty(key, slot, { value, writable: true, configurable: true });
      return cache;
    },
    delete(key) {
      if (!cache.has(key)) return false;
      return delete key[slot];
    },
  };
  return cache;
}

export function createObjectSet() {
  const cache = createObjectCache();
  const set = {
    has: (key) => cache.has(key),
    delete: (key) => cache.delete(key),
    add(key) {
      cache.set(key, true);
      return set;
    },
  };
  return set;
}
