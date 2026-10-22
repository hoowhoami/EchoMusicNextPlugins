// Adapted from Folia a8da4437: renderHints.ts, glowWordTiming.ts and GlowWord.tsx (AGPL-3.0).
// All values here are milliseconds. This is a view-local projection, never a playback clock.
function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function lineProfile(row, offsetMs = 0) {
  const start = row.startMs;
  const duration = Math.max(0, row.durationMs);
  const end = start + duration;
  const micro = duration < 100;
  const short = !micro && duration < 180;
  const words = row.words || [];
  const last = words.length ? words[words.length - 1] : null;
  const lastWordEnd = last ? last.start_ms + last.duration_ms + offsetMs : end;
  const enter = micro
    ? 0
    : short
      ? clamp(duration * 0.45, 45, 60)
      : clamp(duration * 0.34, 220, 420);
  const exit = micro
    ? 0
    : short
      ? clamp(duration * 0.22, 30, 40)
      : clamp(duration * 0.18, 180, 320);
  const pass = Math.max(lastWordEnd, start) + (micro ? 0 : short ? 30 : 60);
  const exitStart = short
    ? Math.max(start + enter + 10, pass, end - exit)
    : Math.max(pass, end - exit);
  return {
    transitionMode: micro ? 'none' : short ? 'fast' : 'normal',
    revealMode: micro ? 'instant' : short ? 'fast' : 'normal',
    lookaheadMs: micro ? 30 : short ? 80 : 150,
    renderEndMs: micro ? Math.max(end, start + 67) : Math.max(end, exitStart + exit),
  };
}

export function wordPresentation(word, profile, offsetMs = 0) {
  const start = word.start_ms + offsetMs;
  const sourceEnd = start + word.duration_ms;
  const instant = profile.revealMode === 'instant';
  const fast = profile.revealMode === 'fast';
  const end = instant
    ? profile.renderEndMs
    : fast
      ? Math.min(profile.renderEndMs, Math.max(sourceEnd, start + 120))
      : sourceEnd;
  return {
    startMs: start,
    endMs: end,
    lookaheadMs: profile.lookaheadMs,
    displayDurationMs: Math.max(end - start, instant ? 80 : fast ? 120 : 100),
  };
}

export function wordState(word, timeMs) {
  if (timeMs >= word.startMs - word.lookaheadMs && timeMs <= word.endMs) return 'active';
  return timeMs > word.endMs ? 'passed' : 'waiting';
}
