// No offline analysis is loaded in this plugin. The native orchestrator passes no beat table.
export function resolveBeatFxAccentGain() {
  throw new Error('Offline beat analysis is excluded');
}
