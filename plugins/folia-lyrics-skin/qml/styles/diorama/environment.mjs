// Derived from Folia a8da4437 (AGPL-3.0-only); see diorama-reference.md.
let active = null,
  serial = 1;
function createEnvironment() {
  return { raf: /* @__PURE__ */ new Map(), timers: /* @__PURE__ */ new Map(), now: 0 };
}
function withEnvironment(value, run) {
  const old = active;
  active = value;
  try {
    return run();
  } finally {
    active = old;
  }
}
function requestAnimationFrame(callback) {
  if (!active) throw Error('Missing Diorama presentation environment');
  const id = serial++;
  return (active.raf.set(id, callback), id);
}
function cancelAnimationFrame(id) {
  active && active.raf.delete(id);
}
const runtimeWindow = {
  setTimeout(callback, delay) {
    const id = serial++;
    return (active.timers.set(id, { callback, due: active.now + delay }), id);
  },
  clearTimeout(id) {
    active && active.timers.delete(id);
  },
};
function advanceEnvironment(value, now) {
  value.now = now;
  const callbacks = Array.from(value.raf.values());
  (value.raf.clear(),
    withEnvironment(value, () => {
      for (const cb of callbacks) cb(now);
      for (const [id, timer] of Array.from(value.timers))
        timer.due <= now && (value.timers.delete(id), timer.callback());
    }));
}
export {
  advanceEnvironment,
  cancelAnimationFrame,
  createEnvironment,
  requestAnimationFrame,
  runtimeWindow,
  withEnvironment,
};
