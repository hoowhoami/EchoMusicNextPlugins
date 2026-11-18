// The requested package excludes offline stem/beat analysis. Source frequency fallback remains.
export const getDrumHits = () => null;
export const getVocalEnvelope = () => null;
export const isBeatEffectPlaying = () => false;
export const isBeatFxReady = () => false;
export const getBeatEffectStrength = () => 0;
export const getBeatFxHeard = () => ({ key: null, time: null });
export const getBeatFxEvents = () => [];
export function resolveBeatFxAccentGain() {
  throw Error('Offline beat analysis is excluded');
}
// Pinned drum hit kind IDs; no stem data are loaded.
export const DRUM_KICK = 0,
  DRUM_SNARE = 1,
  DRUM_HAT = 2;
export const getBeatFxTrackScale = () => 1;
export const isGpuAnalysisActive = () => false;
export const reportMachiDegrade = () => {};
export const withdrawMachiDegrade = () => {};
export const reportMachiShownScene = () => {};
export const withdrawMachiShownScene = () => {};
export const useVisualizerSettingsStore = {
  getState: () => ({ smartBeat: 'off', visualizerFrameRate: 0 }),
};
