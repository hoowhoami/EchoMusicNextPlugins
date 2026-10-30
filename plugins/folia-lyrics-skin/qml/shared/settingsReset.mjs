// Folia a8da4437 VisPlayground handleResetCommonSettings / handleResetSubtitleSettings,
// style tuning reset and each selected background entry's resetSettings.
const commonKeys = [
  'fontStyle',
  'fontFamilies',
  'fontWeight',
  'lyricsFontScale',
  'visualizerOpacity',
];
const subtitleKeys = [
  'hideTranslationSubtitle',
  'subtitleContentMode',
  'subtitleOverlayOpacity',
  'subtitleOverlayBackground',
  'subtitleUpcomingLyricsBlur',
  'showHarmonySubtitle',
  'harmonySubtitleBackground',
  'subtitleFontInheritsLyrics',
  'subtitleFontStyle',
  'subtitleFontFamilies',
  'subtitleFontWeight',
  'subtitleFontScale',
];
export function resetPatch(defaults, section, mode, backgroundMode) {
  const all = Object.keys(defaults || {});
  let keys = [];
  if (section === 'common') keys = commonKeys;
  else if (section === 'subtitle') keys = subtitleKeys;
  else if (section === 'style' && mode && mode !== 'still')
    keys = all.filter(
      (key) =>
        key.indexOf(mode) === 0 &&
        !(
          mode === 'monet' &&
          (key.indexOf('monetBackground') === 0 || key === 'monetPortraitAsset')
        )
    );
  else if (section === 'background' && backgroundMode) {
    const prefix = backgroundMode === 'monet' ? 'monetBackground' : backgroundMode;
    keys = all.filter((key) => key.indexOf(prefix) === 0);
  }
  const patch = {};
  for (const key of keys)
    if (Object.prototype.hasOwnProperty.call(defaults, key))
      patch[key] = JSON.parse(JSON.stringify(defaults[key]));
  return patch;
}
