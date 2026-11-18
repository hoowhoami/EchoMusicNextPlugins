// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/machi/engine/programWarmup.ts
import {
  document,
  OffscreenCanvas,
  globalThis,
  Image,
  ImageData,
  math as Math,
  performance,
} from '../../environment.mjs';
const POLL_MS = 12;
const GIVE_UP_MS = 8e3;
const yieldToMain = () => {
  const scheduler = globalThis.scheduler;
  if (typeof (scheduler == null ? void 0 : scheduler.yield) === 'function')
    return scheduler.yield();
  return new Promise((resolve) => setTimeout(resolve, 0));
};
const compileInto = (renderer, target, root, camera, lightsFrom, only) => {
  const subject = only
    ? {
        traverse: (visit) =>
          root.traverse((object) => {
            if (only(object)) visit(object);
          }),
        traverseVisible: () => {},
      }
    : root;
  const previous = renderer.getRenderTarget();
  renderer.setRenderTarget(target);
  try {
    renderer.compile(subject, camera, lightsFrom);
  } finally {
    renderer.setRenderTarget(previous);
  }
};
const programsOf = (renderer) => {
  var _a;
  return (_a = renderer.info.programs) != null ? _a : [];
};
const checkedPrograms = /* @__PURE__ */ new WeakSet();
const reportBrokenPrograms = (renderer) => {
  if (renderer.debug.checkShaderErrors) return;
  const gl = renderer.getContext();
  programsOf(renderer).forEach((entry) => {
    var _a;
    if (checkedPrograms.has(entry) || !entry.isReady()) return;
    checkedPrograms.add(entry);
    if (gl.getProgramParameter(entry.program, gl.LINK_STATUS)) return;
    const shaderLogs = ((_a = gl.getAttachedShaders(entry.program)) != null ? _a : [])
      .filter((shader) => !gl.getShaderParameter(shader, gl.COMPILE_STATUS))
      .map((shader) => gl.getShaderInfoLog(shader));
    console.error(`[Machi] shader program ${entry.name || entry.type} failed to link`, {
      link: gl.getProgramInfoLog(entry.program),
      shaders: shaderLogs,
    });
  });
};
const waitForPrograms = (renderer, signal) =>
  new Promise((resolve, reject) => {
    const startedAt = performance.now();
    const check = () => {
      if (signal == null ? void 0 : signal.aborted) {
        reject(new DOMException('Aborted', 'AbortError'));
        return;
      }
      if (programsOf(renderer).every((program) => program.isReady())) {
        resolve();
        return;
      }
      if (performance.now() - startedAt > GIVE_UP_MS) {
        console.warn(
          `[Machi] shader programs still compiling after ${GIVE_UP_MS} ms, drawing anyway`,
        );
        resolve();
        return;
      }
      setTimeout(check, POLL_MS);
    };
    check();
  });
export { compileInto, reportBrokenPrograms, waitForPrograms, yieldToMain };
