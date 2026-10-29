// Ported from Folia a8da4437, AGPL-3.0-only. See docs/folia/cappella-reference.md.
import { createCappellaAgentSenderResolver } from './senders.mjs';
import {
  AVATAR_GRID_SIZE,
  INTERLUDE_TEXT,
  LEFT_AVATAR_INDICES,
  RIGHT_AVATAR_INDEX,
  SHORT_LINE_CHAR_LIMIT,
} from './constants.mjs';
const getLineRenderEndTime = (line) => line.renderEndTime;
const getLineRenderHints = (line) => line;
const hashString = (input) => {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};
const seededUnit = (...parts) => hashString(parts.join('|')) / 4294967295;
const pickStableEmoImage = (imagePool, ...seedParts) => {
  var _a;
  if (imagePool.length === 0) {
    return null;
  }
  const index = Math.floor(seededUnit(...seedParts) * imagePool.length) % imagePool.length;
  return (_a = imagePool[index]) != null ? _a : imagePool[0];
};
const getEffectiveRenderEndTime = (line, nextLine) => {
  var _a;
  return Math.min(
    getLineRenderEndTime(line),
    (_a = nextLine == null ? void 0 : nextLine.startTime) != null ? _a : Number.POSITIVE_INFINITY
  );
};
const buildMessages = (lines, titleText, config, tuning, emoImagePool, forcePreviewEmo) => {
  var _a;
  const messages = [
    {
      id: 'title',
      kind: 'title',
      text: titleText,
      side: 'right',
      avatarIndex: AVATAR_GRID_SIZE * AVATAR_GRID_SIZE - 1,
    },
  ];
  const showEmoMessages = tuning.showEmoMessages && emoImagePool.length > 0;
  if (lines.length === 0) {
    const fallbackEmo = showEmoMessages
      ? pickStableEmoImage(
          emoImagePool,
          'no-lyrics',
          titleText,
          config.sequencing.forceRightEveryLines
        )
      : null;
    if (fallbackEmo && showEmoMessages) {
      messages.push({
        id: 'emo-no-lyrics',
        kind: 'emo',
        line: {
          words: [],
          startTime: 0,
          endTime: 0,
          fullText: INTERLUDE_TEXT,
        },
        lineIndex: 0,
        side: 'right',
        avatarIndex: AVATAR_GRID_SIZE * AVATAR_GRID_SIZE - 1,
        emoImageUrl: fallbackEmo.url,
        activationStartTime: 0,
        activationEndTime: 999999,
      });
    }
    return messages;
  }
  let sideSequenceCursor = 0;
  let nextLeftAvatarCursor = 0;
  let lastLyricSender = null;
  let lyricMessagesSinceRandomEmo = Number.POSITIVE_INFINITY;
  let randomEmoCount = 0;
  const randomEmoCap = Math.floor(lines.length * config.sequencing.maxRandomEmoRatio);
  const agentSenderResolver = createCappellaAgentSenderResolver(lines, {
    rightAvatarIndex: RIGHT_AVATAR_INDEX,
    leftAvatarCount: LEFT_AVATAR_INDICES.length,
  });
  lines.forEach((line, lineIndex) => {
    var _a2;
    const nextLine = lines[lineIndex + 1];
    const sourceIndex = line.sourceIndex;
    const isShortLine = line.compactCodepointCount <= SHORT_LINE_CHAR_LIMIT;
    const agentSender =
      (_a2 = agentSenderResolver == null ? void 0 : agentSenderResolver.resolve(line)) != null
        ? _a2
        : null;
    const shouldForceRight =
      !agentSender && (lineIndex + 1) % config.sequencing.forceRightEveryLines === 0;
    const shouldCarrySender = Boolean(
      !agentSender &&
      isShortLine &&
      lastLyricSender &&
      seededUnit('carry', line.startTime, sourceIndex) <= config.sequencing.shortLineCarryChance
    );
    const baseSide =
      config.sequencing.sideSequence[sideSequenceCursor % config.sequencing.sideSequence.length];
    const shouldFlipSide =
      !shouldForceRight &&
      seededUnit('flip', line.startTime, sourceIndex) < config.sequencing.sideFlipChance;
    const resolvedSide = shouldFlipSide ? (baseSide === 'left' ? 'right' : 'left') : baseSide;
    let sender;
    if (agentSender) {
      sender = agentSender;
    } else if (shouldForceRight) {
      sender = {
        side: 'right',
        avatarIndex: RIGHT_AVATAR_INDEX,
      };
    } else if (shouldCarrySender && lastLyricSender) {
      sender = lastLyricSender;
    } else {
      sender = {
        side: resolvedSide,
        avatarIndex: resolvedSide === 'left' ? nextLeftAvatarCursor : RIGHT_AVATAR_INDEX,
      };
    }
    const isInterlude = line.isInterlude;
    const emoImage =
      isInterlude && showEmoMessages
        ? pickStableEmoImage(emoImagePool, 'interlude', line.startTime, sourceIndex)
        : null;
    const effectiveRenderEndTime = getEffectiveRenderEndTime(line, nextLine);
    if (isInterlude && emoImage && showEmoMessages) {
      messages.push({
        id: `emo-${line.startTime}-${sourceIndex}`,
        kind: 'emo',
        line,
        lineIndex: sourceIndex,
        side: sender.side,
        avatarIndex: sender.avatarIndex,
        emoImageUrl: emoImage.url,
        activationStartTime: line.startTime,
        activationEndTime: Math.max(line.startTime + 0.12, effectiveRenderEndTime),
      });
    } else {
      messages.push({
        id: `line-${line.startTime}-${sourceIndex}`,
        kind: 'lyric',
        line,
        lineIndex: sourceIndex,
        side: sender.side,
        avatarIndex: sender.avatarIndex,
      });
    }
    lyricMessagesSinceRandomEmo += 1;
    const renderHints = getLineRenderHints(line);
    const canAppendRandomEmo =
      !isInterlude &&
      showEmoMessages &&
      config.sequencing.randomEmoChance > 0 &&
      randomEmoCount < randomEmoCap &&
      lyricMessagesSinceRandomEmo >= config.sequencing.minLinesBetweenRandomEmos &&
      (renderHints == null ? void 0 : renderHints.timingClass) === 'normal';
    if (canAppendRandomEmo) {
      const score = seededUnit(
        'random-emo',
        line.startTime,
        line.endTime,
        sourceIndex,
        config.sequencing.randomEmoChance
      );
      if (score < config.sequencing.randomEmoChance) {
        const reactionImage = pickStableEmoImage(
          emoImagePool,
          'reaction',
          line.startTime,
          line.endTime,
          sourceIndex,
          sender.side
        );
        if (reactionImage) {
          messages.push({
            id: `emo-reaction-${line.startTime}-${sourceIndex}`,
            kind: 'emo',
            line,
            lineIndex: sourceIndex,
            side: sender.side,
            avatarIndex: sender.avatarIndex,
            emoImageUrl: reactionImage.url,
            activationStartTime: line.endTime,
            activationEndTime: Math.max(line.endTime + 0.08, effectiveRenderEndTime),
          });
          randomEmoCount += 1;
          lyricMessagesSinceRandomEmo = 0;
        }
      }
    }
    if (agentSender) {
      lastLyricSender = sender;
    } else if (shouldForceRight) {
      sideSequenceCursor = 0;
      lastLyricSender = null;
    } else if (!shouldCarrySender) {
      if (sender.side === 'left') {
        nextLeftAvatarCursor += 1;
      }
      sideSequenceCursor += 1;
      lastLyricSender = sender;
    } else {
      lastLyricSender = sender;
    }
  });
  if (forcePreviewEmo && showEmoMessages && !messages.some((message) => message.kind === 'emo')) {
    const previewLine =
      (_a = lines[0]) != null
        ? _a
        : {
            words: [],
            startTime: 0,
            endTime: 0,
            fullText: INTERLUDE_TEXT,
          };
    const previewEmo = pickStableEmoImage(emoImagePool, 'preview-emo', titleText, lines.length);
    if (previewEmo) {
      messages.splice(1, 0, {
        id: 'emo-preview',
        kind: 'emo',
        line: previewLine,
        lineIndex: -1,
        side: 'right',
        avatarIndex: RIGHT_AVATAR_INDEX,
        emoImageUrl: previewEmo.url,
        activationStartTime: 0,
        activationEndTime: Number.POSITIVE_INFINITY,
      });
    }
  }
  return messages;
};
export { buildMessages };
