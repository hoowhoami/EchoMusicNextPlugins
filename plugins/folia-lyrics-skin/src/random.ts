// Folia a8da4437 randomVisualizerModes / useRandomVisualizerMode. AGPL-3.0-only.
import { styles } from './styles';

export const builtinModes: readonly string[] = Object.freeze(
  styles.map((style) => style.id).sort(),
);

export function normalizeRandomModes(value: unknown): string[] {
  const selected = new Set(Array.isArray(value) ? value : []);
  const modes = builtinModes.filter((mode) => selected.has(mode));
  return modes.length ? modes : Array.from(builtinModes);
}

export function pickRandomMode(value: unknown, current: string, random = Math.random): string {
  const selected = normalizeRandomModes(value);
  const alternatives = selected.filter((mode) => mode !== current);
  const candidates = alternatives.length ? alternatives : selected;
  return candidates[Math.floor(random() * candidates.length)];
}

interface Selection {
  mode: string;
  randomVisualizerModePerSong: boolean;
  randomVisualizerModes: unknown;
}

// Retained by the activation scope, independent of the playback page's lifetime.
// Metadata/seek/pause notifications share the same identity and never reroll.
export function createRandomSelector(random = Math.random) {
  let observedSong: string | null = null;
  let pending: { song: string | null; from: string; pool: string; next: string } | null = null;
  return {
    observe(song: string | null, settings: Selection): string | null {
      if (!settings.randomVisualizerModePerSong) {
        observedSong = song;
        pending = null;
        return null;
      }
      const changed = song !== null && observedSong !== null && observedSong !== song;
      if (song !== null) observedSong = song;
      const modes = normalizeRandomModes(settings.randomVisualizerModes);
      if (!changed && modes.includes(settings.mode)) {
        pending = null;
        return null;
      }
      const pool = modes.join(',');
      if (
        pending &&
        pending.song === song &&
        pending.from === settings.mode &&
        pending.pool === pool
      )
        return null;
      const next = pickRandomMode(modes, settings.mode, random);
      pending = { song, from: settings.mode, pool, next };
      return next !== settings.mode ? next : null;
    },
  };
}

export function songIdentity(track: unknown): string | null {
  if (!track || typeof track !== 'object') return null;
  const value = track as { id?: unknown; hash?: unknown };
  if (typeof value.id === 'string' && value.id) return value.id;
  if (typeof value.hash === 'string' && value.hash) return value.hash;
  return null;
}
