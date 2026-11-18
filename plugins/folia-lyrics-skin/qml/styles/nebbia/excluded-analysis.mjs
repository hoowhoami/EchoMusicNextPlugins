// The requested package excludes offline stem/beat analysis. Source frequency fallback remains.
export const getDrumHits = () => null;
export const getVocalEnvelope = () => null;
export const isBeatEffectPlaying = () => false;
export const isBeatFxReady = () => false;
export const getBeatEffectStrength = () => 0;
export const getBeatFxHeard = () => ({ key: null, time: null });
export const getBeatFxEvents = () => [];
// Pinned source units/constants; these do not start or retain an analysis service.
export const VOCAL_FPS = 50;
export const DRUM_KICK = 0;
