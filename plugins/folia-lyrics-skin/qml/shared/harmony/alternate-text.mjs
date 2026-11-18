// Folia a8da4437 (AGPL-3.0-only). See docs/folia/harmony-reference.md.
const resolveSingleTrackSubtitleMode = (mode) => (mode === 'both' ? 'translation' : mode);
const findAlternateText = (alternateTexts, role) => {
  var _a, _b;
  return (_b =
    (_a =
      alternateTexts == null
        ? void 0
        : alternateTexts.find((entry) => entry.role === role && entry.text.trim())) == null
      ? void 0
      : _a.text.trim()) != null
    ? _b
    : null;
};
const resolveTrackText = (source, role) => {
  const directText = role === 'translation' ? source.translation : source.romanization;
  return (
    (directText == null ? void 0 : directText.trim()) ||
    findAlternateText(source.alternateTexts, role)
  );
};
const resolveLyricAlternateText = (source, mode) => {
  const singleTrackMode = resolveSingleTrackSubtitleMode(mode);
  if (!source || singleTrackMode === 'none') {
    return null;
  }
  return resolveTrackText(source, singleTrackMode);
};
const resolveLyricSubtitleTracks = (source, mode, isReadable = () => true) => {
  if (!source || mode === 'none') {
    return [];
  }
  const roles = mode === 'both' ? ['romanization', 'translation'] : [mode];
  const tracks = [];
  for (const role of roles) {
    const text = resolveTrackText(source, role);
    if (!text || !isReadable(text)) {
      continue;
    }
    if (tracks.some((track) => track.text === text)) {
      continue;
    }
    tracks.push({ role, text });
  }
  return tracks;
};
const resolveSubtitleContentMode = (mode, legacyShowTranslation = true) =>
  mode != null ? mode : legacyShowTranslation ? 'translation' : 'none';
const cycleSubtitleContentMode = (mode) => {
  if (mode === 'translation') return 'romanization';
  if (mode === 'romanization') return 'both';
  return 'translation';
};
export {
  cycleSubtitleContentMode,
  resolveLyricAlternateText,
  resolveLyricSubtitleTracks,
  resolveSingleTrackSubtitleMode,
  resolveSubtitleContentMode,
};
