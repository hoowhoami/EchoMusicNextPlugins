// Derived from Folia a8da4437 (AGPL-3.0-only); see tempera-reference.md.
const DAYLIGHT_TOKENS = {
  textPrimary: '#18181b',
  textSecondary: '#52525b',
  accent: '#18181b',
  line: 'rgba(0,0,0,0.12)',
  lineStrong: 'rgba(0,0,0,0.28)',
  gridLine: 'rgba(0,0,0,0.08)',
  surface: 'rgba(0,0,0,0.04)',
  hoverSurfaceClass: 'hover:bg-black/[0.06]',
  markerBorder: 'rgba(0,0,0,0.35)',
  markerFill: 'rgba(255,255,255,0.7)',
  markerHalo: '0 0 0 3px rgba(255,255,255,0.85)',
  checkerTint: 'rgba(0,0,0,0.07)',
  overlayButtonClass: 'bg-white/75 hover:bg-white',
};
const NIGHT_TOKENS = {
  textPrimary: '#fafafa',
  textSecondary: '#a1a1aa',
  accent: '#fafafa',
  line: 'rgba(255,255,255,0.12)',
  lineStrong: 'rgba(255,255,255,0.18)',
  gridLine: 'rgba(255,255,255,0.06)',
  surface: 'rgba(255,255,255,0.05)',
  hoverSurfaceClass: 'hover:bg-white/10',
  markerBorder: 'rgba(255,255,255,0.45)',
  markerFill: 'rgba(0,0,0,0.2)',
  markerHalo: '0 0 0 3px rgba(0,0,0,0.35)',
  checkerTint: 'rgba(255,255,255,0.07)',
  overlayButtonClass: 'bg-black/50 hover:bg-black/70',
};
const temperaDialogTokens = (isDaylight) => (isDaylight ? DAYLIGHT_TOKENS : NIGHT_TOKENS);
const temperaDialogTextVars = (tokens) => ({
  '--text-primary': tokens.textPrimary,
  '--text-secondary': tokens.textSecondary,
  '--text-accent': tokens.accent,
  color: tokens.textPrimary,
});
export { temperaDialogTextVars, temperaDialogTokens };
