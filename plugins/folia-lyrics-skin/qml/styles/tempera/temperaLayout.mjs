// Derived from Folia a8da4437 (AGPL-3.0-only); see tempera-reference.md.
import { flatMap } from './compat.mjs';
import { temperaHash01 } from './temperaRandom.mjs';
import { resolveTemperaShotProfile } from './temperaShotProfiles.mjs';
import { TEMPERA_ENTER_STYLES } from './temperaEnterStyles.mjs';
import { buildTemperaWordUnit, createTemperaMeasureContext } from './temperaMeasure.mjs';
const TAU = Math.PI * 2;
const isTemperaLayoutSegment = (segment) => segment.text.trim().length > 0;
const resolveRegion = (shotKind, width, height) => {
  const { region } = resolveTemperaShotProfile(shotKind);
  return {
    centerX: region.cx * width,
    centerY: region.cy * height,
    width: region.w * width,
    height: region.h * height,
    align: region.align,
    rotation: region.rotation,
    fontScale: region.fontScale,
  };
};
const resolveEnterVector = (shotKind, fontSize) => {
  const { enter } = resolveTemperaShotProfile(shotKind);
  return { x: enter.x * fontSize, y: enter.y * fontSize };
};
const rotateAbout = (x, y, cx, cy, angle) => {
  if (angle === 0) return { x, y };
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = x - cx;
  const dy = y - cy;
  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
};
const resolveWordScales = (segments, seed, lineIndex) => {
  const lengths = segments.map((segment) => (segment.isWordLike ? segment.graphemes.length : 0));
  const maxLength = Math.max(0, ...lengths);
  const heroCandidates = flatMap(lengths, (length, index) =>
    length > 0 && length >= maxLength - 1 ? [index] : []
  );
  const heroIndex =
    heroCandidates.length > 0
      ? heroCandidates[
          Math.floor(temperaHash01(seed, lineIndex, 101) * heroCandidates.length) %
            heroCandidates.length
        ]
      : -1;
  return segments.map((_, index) =>
    index === heroIndex
      ? 1.34 + temperaHash01(seed, lineIndex * 31 + index, 103) * 0.26
      : 0.7 + temperaHash01(seed, lineIndex * 31 + index, 107) * 0.16
  );
};
const packRows = (words, maxWidth, seed) => {
  const rows = [];
  let current = [];
  let currentWidth = 0;
  const budgetFor = (rowIndex) => maxWidth * (0.72 + temperaHash01(seed, rowIndex, 109) * 0.28);
  const flush = () => {
    if (current.length === 0) return;
    rows.push({ words: current, width: currentWidth, height: 0 });
    current = [];
    currentWidth = 0;
  };
  words.forEach((word) => {
    const newLine = current.length > 0 && word.lineIndex !== current[0].lineIndex;
    const advance = current.length === 0 ? word.width : word.width + word.leadingGap;
    if (newLine || (current.length > 0 && currentWidth + advance > budgetFor(rows.length))) flush();
    currentWidth += current.length === 0 ? word.width : advance;
    current.push(word);
  });
  flush();
  return rows;
};
const buildWordUnits = (ctx, lines, fontSize, seed) =>
  flatMap(lines, (segments, lineIndex) => {
    const scales = resolveWordScales(segments, seed, lineIndex);
    let previousEnd = null;
    return flatMap(segments, (segment, segmentIndex) => {
      const unit = buildTemperaWordUnit(
        ctx,
        segment,
        lineIndex,
        segmentIndex,
        fontSize,
        scales[segmentIndex]
      );
      if (!unit) return [];
      const spaced = previousEnd !== null && segment.startOffset > previousEnd;
      unit.leadingGap = previousEnd === null ? 0 : fontSize * (spaced ? 0.26 : 0.035);
      previousEnd = segment.endOffset;
      return [unit];
    });
  });
const MIN_SETTLE_SECONDS = 0.34;
const DEFAULT_SETTLE_STRETCH = 0.5;
const applyGlyphTiming = (placements, settleStretch) => {
  if (placements.length === 0) return placements;
  const stretch = Number.isFinite(settleStretch)
    ? Math.min(1, Math.max(0, settleStretch))
    : DEFAULT_SETTLE_STRETCH;
  const lineSpans = /* @__PURE__ */ new Map();
  placements.forEach((placement) => {
    var _a;
    const current = (_a = lineSpans.get(placement.lineIndex)) != null ? _a : 0;
    lineSpans.set(placement.lineIndex, Math.max(current, placement.endTime));
  });
  const lineStarts = /* @__PURE__ */ new Map();
  placements.forEach((placement) => {
    var _a;
    const current =
      (_a = lineStarts.get(placement.lineIndex)) != null ? _a : Number.POSITIVE_INFINITY;
    lineStarts.set(placement.lineIndex, Math.min(current, placement.startTime));
  });
  const shotLyricEnd = placements.reduce((latest, p) => Math.max(latest, p.endTime), 0);
  placements.forEach((placement) => {
    const reach = Math.max(0, shotLyricEnd - placement.startTime - MIN_SETTLE_SECONDS);
    placement.settleTime = placement.startTime + MIN_SETTLE_SECONDS + reach * stretch;
  });
  const centerX = placements.reduce((sum, placement) => sum + placement.x, 0) / placements.length;
  const centerY = placements.reduce((sum, placement) => sum + placement.y, 0) / placements.length;
  placements.forEach((placement) => {
    var _a, _b;
    const span = Math.max(
      0.5,
      ((_a = lineSpans.get(placement.lineIndex)) != null ? _a : placement.endTime) -
        ((_b = lineStarts.get(placement.lineIndex)) != null ? _b : placement.startTime)
    );
    placement.releaseTime = Math.max(placement.endTime, placement.settleTime) + span;
    placement.trackingX = placement.x - centerX;
    placement.trackingY = placement.y - centerY;
  });
  return placements;
};
const resolveTemperaLayout = ({
  lines,
  shotKind,
  width,
  height,
  baseFontSize,
  fontFamily,
  fontWeight,
  seed,
  segmentColors,
  settleStretch = DEFAULT_SETTLE_STRETCH,
}) => {
  const region = resolveRegion(shotKind, width, height);
  const ctx = createTemperaMeasureContext(fontFamily, fontWeight);
  let fontSize = Math.max(14, baseFontSize * region.fontScale);
  let rows = [];
  let blockHeight = 0;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    rows = packRows(buildWordUnits(ctx, lines, fontSize, seed), region.width, seed);
    rows.forEach((row, rowIndex) => {
      const tallest = Math.max(...row.words.map((word) => word.scale));
      row.height = fontSize * tallest * (1.02 + temperaHash01(seed, rowIndex, 113) * 0.1);
    });
    blockHeight = rows.reduce((sum, row) => sum + row.height, 0);
    const maxRowWidth = Math.max(1, ...rows.map((row) => row.width));
    const fit = Math.min(
      1,
      blockHeight > region.height ? region.height / blockHeight : 1,
      maxRowWidth > region.width ? region.width / maxRowWidth : 1
    );
    if (fit >= 0.999) break;
    fontSize *= fit;
  }
  const base = resolveEnterVector(shotKind, fontSize);
  const baseAngle = Math.atan2(base.y, base.x);
  const baseMagnitude = Math.hypot(base.x, base.y);
  const placements = [];
  let cursorY = region.centerY - blockHeight / 2;
  rows.forEach((row, rowIndex) => {
    const rowCenterY = cursorY + row.height / 2;
    cursorY += row.height;
    const drift = (temperaHash01(seed, rowIndex, 127) - 0.5) * region.width * 0.06;
    const rowRotation = (temperaHash01(seed, rowIndex, 131) - 0.5) * 0.06;
    const rowLeft =
      region.align === 'center'
        ? region.centerX - row.width / 2 + drift
        : region.align === 'left'
          ? region.centerX - region.width / 2 + Math.abs(drift) * 0.6
          : region.centerX + region.width / 2 - row.width - Math.abs(drift) * 0.6;
    const rowCenterX = rowLeft + row.width / 2;
    let cursorX = rowLeft;
    row.words.forEach((word, wordIndex) => {
      const salt = rowIndex * 37 + wordIndex;
      const enterStyle =
        TEMPERA_ENTER_STYLES[
          Math.floor(temperaHash01(seed, salt, 193) * TEMPERA_ENTER_STYLES.length) %
            TEMPERA_ENTER_STYLES.length
        ];
      const wordRotation = (temperaHash01(seed, salt, 137) - 0.5) * 0.07;
      const wordShiftY = (temperaHash01(seed, salt, 139) - 0.5) * fontSize * 0.09;
      const wordLeft = cursorX + (wordIndex === 0 ? 0 : word.leadingGap);
      cursorX = wordLeft + word.width;
      const wordCenterX = wordLeft + word.width / 2;
      const wordCenterY = rowCenterY + wordShiftY;
      const glyphSize = fontSize * word.scale;
      word.glyphs.forEach((glyph, glyphIndex) => {
        var _a, _b;
        if (glyph.char.trim().length === 0) return;
        const localX = wordLeft + glyph.offset + glyph.width / 2;
        const rotatedWord = rotateAbout(
          localX,
          wordCenterY,
          wordCenterX,
          wordCenterY,
          wordRotation
        );
        const rotatedRow = rotateAbout(
          rotatedWord.x,
          rotatedWord.y,
          rowCenterX,
          rowCenterY,
          rowRotation
        );
        const finalPoint = rotateAbout(
          rotatedRow.x,
          rotatedRow.y,
          region.centerX,
          region.centerY,
          region.rotation
        );
        const glyphSalt = salt * 53 + glyphIndex;
        const spread = (temperaHash01(seed, glyphSalt, 149) - 0.5) * 1.7;
        const magnitude = baseMagnitude * (0.55 + temperaHash01(seed, glyphSalt, 151) * 1.05);
        const angle = baseAngle + spread;
        placements.push({
          char: glyph.char,
          lineIndex: word.lineIndex,
          segmentIndex: word.segmentIndex,
          x: finalPoint.x,
          y: finalPoint.y,
          rotation: region.rotation + rowRotation + wordRotation,
          startTime: glyph.startTime,
          endTime: glyph.endTime,
          settleTime: glyph.endTime,
          fontSize: glyphSize,
          color:
            (_b =
              (_a = segmentColors == null ? void 0 : segmentColors[word.lineIndex]) == null
                ? void 0
                : _a[word.segmentIndex]) != null
              ? _b
              : null,
          enterX: Math.cos(angle) * magnitude,
          enterY: Math.sin(angle) * magnitude,
          enterRotation: (temperaHash01(seed, glyphSalt, 157) - 0.5) * 0.7,
          enterScale: 0.6 + temperaHash01(seed, glyphSalt, 163) * 0.3,
          enterStyle,
          releaseTime: 0,
          trackingX: 0,
          trackingY: 0,
        });
      });
    });
  });
  return applyGlyphTiming(placements, settleStretch);
};
export { isTemperaLayoutSegment, resolveTemperaLayout };
