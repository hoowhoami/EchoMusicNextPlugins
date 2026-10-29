// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/lumiere-reference.md.
import { fromEntries } from '../compat.mjs';
import { LUMIERE_TRANSITION_KINDS } from './program.mjs';
const smooth = (value) => {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
};
const LABELS = {
  'lights-out': '\u7184\u706F',
  'flare-cut': '\u95EA\u767D',
  'focus-pull': '\u62C9\u7126',
};
const LUMIERE_TRANSITIONS = fromEntries(
  LUMIERE_TRANSITION_KINDS.map((kind) => [
    kind,
    {
      kind,
      label: LABELS[kind],
      duration: (gap) =>
        kind === 'focus-pull'
          ? Math.min(0.6, Math.max(0.35, gap > 0 ? gap * 0.5 : 0.45))
          : Math.min(1.1, Math.max(0.5, gap > 0 ? gap * 0.6 : 0.8)),
      enterClamp: kind === 'focus-pull' ? [0.3, 0.6] : [0.4, 0.9],
      resolveFrame: (phase, progress) => {
        const near = phase === 'exit' ? smooth(progress) : 1 - smooth(progress);
        if (kind === 'lights-out') return { alpha: 1 - near, scale: 1, blur: 0 };
        if (kind === 'flare-cut')
          return { scale: 1 + 0.03 * near, blur: 7 * near * near, alpha: 1 - 0.35 * near * near };
        return { alpha: 1, blur: 12 * near, scale: 1 + 0.015 * near };
      },
    },
  ])
);
const resolveLumiereEnterDuration = (kind, startTime, endTime) => {
  const [min, max] = LUMIERE_TRANSITIONS[kind].enterClamp;
  return Math.max(min, Math.min(max, endTime - startTime));
};
const chooseLumiereTransition = (seed, paragraphIndex, previous) => {
  const choices = LUMIERE_TRANSITION_KINDS.filter((kind) => kind !== previous);
  let hash = 0;
  for (const char of `${seed}:${paragraphIndex}:transition`)
    hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return choices[Math.abs(hash) % choices.length];
};
export { LUMIERE_TRANSITIONS, chooseLumiereTransition, resolveLumiereEnterDuration };
