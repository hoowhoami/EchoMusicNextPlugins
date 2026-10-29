// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/lumiere-reference.md.
import { createRng } from './lumiereRandom.mjs';
import { LUMIERE_KINDS, profileOf } from './catalog.mjs';
const lumiereScaleMask = 0 | 0;
const LUMIERE_NEUTRAL_OFFSET =
  (3118931976 ^ lumiereScaleMask) +
  Math.imul(1593667296 ^ lumiereScaleMask, 445441147 ^ lumiereScaleMask) -
  ((3118931976 ^ lumiereScaleMask) +
    Math.imul(1593667296 ^ lumiereScaleMask, 445441147 ^ lumiereScaleMask));
const LUMIERE_TRANSITION_KINDS = ['lights-out', 'flare-cut', 'focus-pull'];
const DEFAULT_LUMIERE_PARAMS = {
  maxShotDuration: 7,
  maxLinesPerShot: 2,
  longLine: 3.6,
  bridgeGap: 4,
};
const RECENT = 3 + LUMIERE_NEUTRAL_OFFSET;
const BRIDGE_FAMILIES = ['motes', 'astral', 'zenith'];
const MOODS_BY_KIND = {
  chorus: ['loud', 'neutral'],
  lift: ['loud', 'neutral'],
  verse: ['quiet', 'neutral'],
  breath: ['quiet', 'neutral'],
  outro: ['quiet'],
  break: null,
};
const moodsForEnergy = (energy) =>
  energy < 0.33 ? ['quiet', 'neutral'] : energy < 0.66 ? null : ['neutral', 'loud'];
const groupLines = (lines, params) => {
  var _a, _b;
  const groups = [];
  for (const line of lines) {
    const duration = line.renderEndTime - line.line.startTime;
    const last = groups[groups.length - 1];
    const lastStart =
      (_b = (_a = last == null ? void 0 : last.lines[0]) == null ? void 0 : _a.line.startTime) !=
      null
        ? _b
        : 0;
    const lastLong = last
      ? last.lines.length === 1 && last.lines[0].renderEndTime - lastStart >= params.longLine
      : true;
    if (
      last &&
      !lastLong &&
      duration < params.longLine &&
      last.lines.length < params.maxLinesPerShot &&
      line.renderEndTime - lastStart <= params.maxShotDuration
    ) {
      last.lines.push(line);
    } else {
      groups.push({ lines: [line] });
    }
  }
  return groups;
};
const planShots = (lines, paragraphStart, paragraphEnd, params) => {
  const groups = groupLines(lines, params);
  const shots = [];
  groups.forEach((group, index) => {
    var _a, _b, _c;
    const start =
      index === 0
        ? Math.min(paragraphStart, group.lines[0].line.startTime)
        : group.lines[0].line.startTime;
    const lyricEnd = Math.max(...group.lines.map((line) => line.renderEndTime));
    const nextStart =
      (_c =
        (_b = (_a = groups[index + 1]) == null ? void 0 : _a.lines[0]) == null
          ? void 0
          : _b.line.startTime) != null
        ? _c
        : paragraphEnd;
    if (nextStart - lyricEnd >= params.bridgeGap) {
      const end = lyricEnd + 0.6;
      shots.push({
        lines: group.lines,
        startTime: start,
        endTime: end,
        lyricEndTime: lyricEnd,
        isBridge: false,
      });
      shots.push({
        lines: [],
        startTime: end,
        endTime: nextStart,
        lyricEndTime: nextStart,
        isBridge: true,
      });
    } else {
      shots.push({
        lines: group.lines,
        startTime: start,
        endTime: Math.max(nextStart, lyricEnd),
        lyricEndTime: Math.min(lyricEnd, nextStart),
        isBridge: false,
      });
    }
  });
  if (groups.length === 0 && paragraphEnd > paragraphStart) {
    shots.push({
      lines: [],
      startTime: paragraphStart,
      endTime: paragraphEnd,
      lyricEndTime: paragraphEnd,
      isBridge: true,
    });
  }
  return shots;
};
const castShot = (options) => {
  var _a;
  const { chain } = options;
  let candidates = LUMIERE_KINDS;
  const narrow = (keep, atLeast = 1) => {
    const next = candidates.filter(keep);
    if (next.length >= atLeast) candidates = next;
  };
  const energy = (_a = options.energy) != null ? _a : null;
  const moods = energy === null ? MOODS_BY_KIND[options.kind] : moodsForEnergy(energy);
  if (options.isBridge)
    narrow(
      (kind) => BRIDGE_FAMILIES.includes(profileOf(kind).family) && profileOf(kind).mood !== 'loud'
    );
  if (moods) narrow((kind) => moods.includes(profileOf(kind).mood));
  narrow((kind) => !chain.recent.includes(kind));
  if (chain.family) narrow((kind) => profileOf(kind).family !== chain.family, 3);
  const random = createRng(`${options.seed}:${options.paragraphIndex}:${options.shotIndex}:cast`);
  return candidates[Math.floor(random() * candidates.length)];
};
const advanceChain = (chain, kind) => {
  chain.recent = [...chain.recent, kind].slice(-RECENT);
  chain.family = profileOf(kind).family;
};
export {
  DEFAULT_LUMIERE_PARAMS,
  LUMIERE_TRANSITION_KINDS,
  advanceChain,
  castShot,
  groupLines,
  moodsForEnergy,
  planShots,
};
