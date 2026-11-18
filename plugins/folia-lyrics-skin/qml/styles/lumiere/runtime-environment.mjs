// No playback clock: source presentation timers advance only from caller-supplied nowMs.
let active = null,
  nextTimer = 1;
export function createRuntimeEnvironment(resolution) {
  return { resolution, now: 0, timers: new Map() };
}
export function withRuntimeEnvironment(environment, run) {
  const before = active;
  active = environment;
  try {
    return run();
  } finally {
    active = before;
  }
}
export function setRuntimeTimeout(callback, delay = 0) {
  if (!active) throw new Error('Lumiere runtime environment is missing');
  const id = nextTimer++;
  active.timers.set(id, { callback, due: active.now + delay });
  return id;
}
export function clearRuntimeTimeout(id) {
  if (active) active.timers.delete(id);
}
export const runtimeWindow = {
  get devicePixelRatio() {
    return active ? active.resolution : 1;
  },
  setTimeout: setRuntimeTimeout,
  clearTimeout: clearRuntimeTimeout,
};
export const runtimePerformance = {
  now() {
    return active ? active.now : 0;
  },
};
export function advanceRuntimeEnvironment(environment, now) {
  if (!Number.isFinite(now) || now < environment.now)
    throw new Error('Invalid Lumiere presentation time');
  environment.now = now;
  withRuntimeEnvironment(environment, () => {
    let count = 0;
    while (true) {
      const entry = [...environment.timers].find(([, timer]) => timer.due <= now);
      if (!entry) break;
      if (++count > 64) throw new Error('Lumiere presentation timer budget exceeded');
      environment.timers.delete(entry[0]);
      entry[1].callback();
    }
  });
}
