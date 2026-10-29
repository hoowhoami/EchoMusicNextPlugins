// The original DOM/WebGL installation path is deliberately unavailable in native Qt.
function unavailable() {
  throw new Error(
    'Lumiere browser Application installation is unavailable; use the native runtime adapter'
  );
}
export const loadPixi = unavailable,
  linkPixiPrograms = unavailable,
  makePixiContext = unavailable;
