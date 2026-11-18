// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/services/beatFx/beatEffects.ts
const BEAT_EFFECT_STRENGTH_MAX = 2;
const BEAT_EFFECT_DEFAULT = { on: true, strength: 1 };
const BEAT_EFFECT_IDS = {
  sonnetLensTear: 'sonnet.lensTear',
  dioramaRipple: 'diorama.ripple',
  pendoloDrumhead: 'pendolo.drumhead',
  pendoloGearBeats: 'pendolo.gearBeats',
  latentPulse: 'latent.pulse',
  hanabiBeatBursts: 'hanabi.beatBursts',
  hanabiBeatPulse: 'hanabi.beatPulse',
  temperaInkFlash: 'tempera.inkFlash',
  machiNeonPulse: 'machi.neonPulse',
  machiDrumRipple: 'machi.drumRipple',
  machiScreenFlash: 'machi.screenFlash',
  nebbiaDrizzleRide: 'nebbia.drizzleRide',
  nebbiaAquaBeat: 'nebbia.aquaBeat',
  metaphorAnnihilation: 'metaphor.annihilation',
};
const LEGACY_BEAT_LIST_EFFECT_IDS = [BEAT_EFFECT_IDS.sonnetLensTear, BEAT_EFFECT_IDS.dioramaRipple];
const beatEffectPartId = (id, part) => `${id}:${part}`;
const resolveBeatEffectPartStrength = (setting, part) => {
  var _a, _b;
  return (_b = (_a = setting.parts) == null ? void 0 : _a[part]) != null ? _b : 1;
};
const resolveBeatEffectSetting = (settings, id) => {
  var _a;
  return (_a = settings.effects[id]) != null ? _a : BEAT_EFFECT_DEFAULT;
};
const DRUM_BEAT_EFFECT_IDS = [
  BEAT_EFFECT_IDS.pendoloDrumhead,
  BEAT_EFFECT_IDS.temperaInkFlash,
  BEAT_EFFECT_IDS.machiDrumRipple,
  BEAT_EFFECT_IDS.machiScreenFlash,
];
const anyDrumBeatEffectOn = (settings) =>
  DRUM_BEAT_EFFECT_IDS.some((id) => resolveBeatEffectSetting(settings, id).on);
const smartBeatActive = (settings) => settings.mode !== 'off';
const smartBeatMayAnalyse = (settings) => settings.mode === 'on';
const isBeatEffectLive = (settings, effect) =>
  smartBeatActive(settings) && !effect.retired && resolveBeatEffectSetting(settings, effect.id).on;
const offeredBeatEffects = (effects) =>
  (effects != null ? effects : []).filter((effect) => !effect.retired);
export {
  BEAT_EFFECT_DEFAULT,
  BEAT_EFFECT_IDS,
  BEAT_EFFECT_STRENGTH_MAX,
  DRUM_BEAT_EFFECT_IDS,
  LEGACY_BEAT_LIST_EFFECT_IDS,
  anyDrumBeatEffectOn,
  beatEffectPartId,
  isBeatEffectLive,
  offeredBeatEffects,
  resolveBeatEffectPartStrength,
  resolveBeatEffectSetting,
  smartBeatActive,
  smartBeatMayAnalyse,
};
