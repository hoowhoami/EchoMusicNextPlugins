import type { JsonValue } from 'echo:plugin-sdk';
export const DEFAULT_SETTINGS = {
  enabled: true,
  showPlayerBar: false,
  showMiniPlayer: false,
  showLyricControls: true,
  showBackdrop: false,
  fps: 15,
  binCount: 64,
  fftSize: 1024,
  smoothing: 72,
  scale: 'log',
  mode: 'bars',
  palette: 'theme',
  fill: 84,
  opacity: 56,
  lyricHeight: 82,
  mistIntensity: 78,
  mistSoftness: 72,
  mistMotion: 42,
  centeredBarWidth: 2,
  hdrHighlights: false,
  hdrIntensity: 45,
};

export type Settings = typeof DEFAULT_SETTINGS & Record<string, JsonValue>;
const clamp = (value: unknown, min: number, max: number) =>
  Math.max(min, Math.min(max, Number(value) || 0));
export const normalizeSettings = (value: unknown): Settings => {
  const source = (value && typeof value === 'object' ? value : {}) as Partial<Settings>;
  const fps = Math.round(Number(source.fps ?? DEFAULT_SETTINGS.fps));
  const binCount = Math.round(Number(source.binCount ?? DEFAULT_SETTINGS.binCount));
  const fftSize = Math.round(Number(source.fftSize ?? DEFAULT_SETTINGS.fftSize));
  return {
    ...DEFAULT_SETTINGS,
    ...source,
    hdrHighlights: source.hdrHighlights === true,
    hdrIntensity: clamp(source.hdrIntensity ?? DEFAULT_SETTINGS.hdrIntensity, 0, 100),
    enabled: source.enabled ?? DEFAULT_SETTINGS.enabled,
    showPlayerBar: source.showPlayerBar ?? DEFAULT_SETTINGS.showPlayerBar,
    showMiniPlayer: source.showMiniPlayer ?? DEFAULT_SETTINGS.showMiniPlayer,
    showLyricControls: source.showLyricControls ?? DEFAULT_SETTINGS.showLyricControls,
    showBackdrop: source.showBackdrop ?? DEFAULT_SETTINGS.showBackdrop,
    fps: [15, 24, 30].includes(fps) ? fps : DEFAULT_SETTINGS.fps,
    binCount: [32, 64, 96, 128].includes(binCount) ? binCount : DEFAULT_SETTINGS.binCount,
    fftSize: [1024, 2048, 4096, 8192].includes(fftSize) ? fftSize : DEFAULT_SETTINGS.fftSize,
    smoothing: clamp(source.smoothing ?? DEFAULT_SETTINGS.smoothing, 0, 95),
    scale: ['log', 'mel', 'linear'].includes(String(source.scale))
      ? String(source.scale)
      : DEFAULT_SETTINGS.scale,
    mode: ['bars', 'wave', 'hybrid', 'mist', 'centered'].includes(String(source.mode))
      ? String(source.mode)
      : DEFAULT_SETTINGS.mode,
    palette: ['theme', 'aurora', 'ember', 'ice', 'mono'].includes(String(source.palette))
      ? String(source.palette)
      : DEFAULT_SETTINGS.palette,
    fill: clamp(source.fill ?? DEFAULT_SETTINGS.fill, 35, 100),
    opacity: clamp(source.opacity ?? DEFAULT_SETTINGS.opacity, 18, 92),
    lyricHeight: clamp(source.lyricHeight ?? DEFAULT_SETTINGS.lyricHeight, 48, 150),
    mistIntensity: clamp(source.mistIntensity ?? DEFAULT_SETTINGS.mistIntensity, 35, 100),
    mistSoftness: clamp(source.mistSoftness ?? DEFAULT_SETTINGS.mistSoftness, 20, 100),
    mistMotion: clamp(source.mistMotion ?? DEFAULT_SETTINGS.mistMotion, 0, 100),
    centeredBarWidth: clamp(source.centeredBarWidth ?? DEFAULT_SETTINGS.centeredBarWidth, 1, 8),
  };
};
