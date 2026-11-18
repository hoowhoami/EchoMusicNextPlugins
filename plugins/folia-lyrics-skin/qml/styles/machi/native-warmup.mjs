// QSB programs are compiled by the native pipeline; no browser program polling.
export function compileInto(renderer, target, object, camera, scene) {
  renderer.compile(object, camera, scene);
}
export const reportBrokenPrograms = () => {};
export const waitForPrograms = () => Promise.resolve();
export const yieldToMain = () => Promise.resolve();
