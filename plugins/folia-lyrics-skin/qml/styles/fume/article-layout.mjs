// Derived from Folia a8da4437 (AGPL-3.0-only). See fume-reference.md.
var __assign = function () {
  __assign =
    Object.assign ||
    function (t) {
      for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
      }
      return t;
    };
  return __assign.apply(this, arguments);
};
var __generator = function (thisArg, body) {
  var t;
  var _ = {
      label: 0,
      sent: function () {
        if (t[0] & 1) throw t[1];
        return t[1];
      },
      trys: [],
      ops: [],
    },
    f,
    y,
    g = Object.create((typeof Iterator === 'function' ? Iterator : Object).prototype);
  return (
    (g.next = verb(0)),
    (g['throw'] = verb(1)),
    (g['return'] = verb(2)),
    typeof Symbol === 'function' &&
      (g[Symbol.iterator] = function () {
        return this;
      }),
    g
  );
  function verb(n) {
    return function (v) {
      return step([n, v]);
    };
  }
  function step(op) {
    if (f) throw new TypeError('Generator is already executing.');
    while ((g && ((g = 0), op[0] && (_ = 0)), _))
      try {
        if (
          ((f = 1),
          y &&
            (t =
              op[0] & 2
                ? y['return']
                : op[0]
                  ? y['throw'] || ((t = y['return']) && t.call(y), 0)
                  : y.next) &&
            !(t = t.call(y, op[1])).done)
        )
          return t;
        if (((y = 0), t)) op = [op[0] & 2, t.value];
        switch (op[0]) {
          case 0:
          case 1:
            t = op;
            break;
          case 4:
            _.label++;
            return { value: op[1], done: false };
          case 5:
            _.label++;
            y = op[1];
            op = [0];
            continue;
          case 7:
            op = _.ops.pop();
            _.trys.pop();
            continue;
          default:
            if (
              !((t = _.trys), (t = t.length > 0 && t[t.length - 1])) &&
              (op[0] === 6 || op[0] === 2)
            ) {
              _ = 0;
              continue;
            }
            if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
              _.label = op[1];
              break;
            }
            if (op[0] === 6 && _.label < t[1]) {
              _.label = t[1];
              t = op;
              break;
            }
            if (t && _.label < t[2]) {
              _.label = t[2];
              _.ops.push(op);
              break;
            }
            if (t[2]) _.ops.pop();
            _.trys.pop();
            continue;
        }
        op = body.call(thisArg, _);
      } catch (e) {
        op = [6, e];
        y = 0;
      } finally {
        f = t = 0;
      }
    if (op[0] & 5) throw op[1];
    return { value: op[0] ? op[1] : void 0, done: true };
  }
};
var __values = function (o) {
  var s = typeof Symbol === 'function' && Symbol.iterator,
    m = s && o[s],
    i = 0;
  if (m) return m.call(o);
  if (o && typeof o.length === 'number')
    return {
      next: function () {
        if (o && i >= o.length) o = void 0;
        return { value: o && o[i++], done: !o };
      },
    };
  throw new TypeError(s ? 'Object is not iterable.' : 'Symbol.iterator is not defined.');
};
var __read = function (o, n) {
  var m = typeof Symbol === 'function' && o[Symbol.iterator];
  if (!m) return o;
  var i = m.call(o),
    r,
    ar = [],
    e;
  try {
    while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
  } catch (error) {
    e = { error };
  } finally {
    try {
      if (r && !r.done && (m = i['return'])) m.call(i);
    } finally {
      if (e) throw e.error;
    }
  }
  return ar;
};
var __spreadArray = function (to, from, pack) {
  if (pack || arguments.length === 2)
    for (var i = 0, l = from.length, ar; i < l; i++) {
      if (ar || !(i in from)) {
        if (!ar) ar = Array.prototype.slice.call(from, 0, i);
        ar[i] = from[i];
      }
    }
  return to.concat(ar || Array.prototype.slice.call(from));
};
import { layoutWithLines } from './pretext.mjs';
import { resolveThemeFontStack } from '../cadenza/font-stacks.mjs';
import { getLineRenderEndTime } from '../../shared/renderHints.mjs';
import { clamp, hashString, seeded, splitGraphemes } from './math.mjs';
import { buildWordRangesFromWords } from './reveal.mjs';
import {
  buildFontSpec,
  buildGlyphOffsets,
  buildRenderSegments,
  buildSegmentMetas,
  buildWordRangeIndexByOffset,
  chooseSingleLineFontPx,
  countRenderableGraphemes,
  cursorToGlobalOffset,
  lineMeasuresFor,
  prepareLineAt,
} from './text-measure.mjs';
var nowMs = function () {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
};
var createFumeLayoutTiming = function () {
  return {
    lines: 0,
    prepareLayoutMs: 0,
    placementMs: 0,
    renderDetailsMs: 0,
  };
};
var roundMs = function (value) {
  return Number(value.toFixed(2));
};
var LAYOUT_SLICE_MS = 8;
var chooseNaturalBlockVariant = function (line, index, total) {
  var graphemeCount = countRenderableGraphemes(line.fullText);
  if (graphemeCount === 0) {
    return 'body';
  }
  if (line.isChorus && graphemeCount <= 22) {
    return 'hero';
  }
  var shortEnough = graphemeCount >= 4 && graphemeCount <= 28;
  var centered = Math.abs(index - total / 2) / Math.max(total, 1);
  var random = seeded(''.concat(line.fullText, ':').concat(index));
  return shortEnough && centered < 0.72 && ((index + 1) % 6 === 0 || random > 0.965)
    ? 'hero'
    : 'body';
};
var chooseFallbackHeroBlockIndex = function (entries) {
  if (entries.length === 0) {
    return -1;
  }
  var hasNaturalHero = entries.some(function (_a, blockIndex) {
    var line = _a.line;
    return chooseNaturalBlockVariant(line, blockIndex, entries.length) === 'hero';
  });
  if (hasNaturalHero) {
    return -1;
  }
  var bestIndex = -1;
  var bestScore = Number.NEGATIVE_INFINITY;
  entries.forEach(function (_a, blockIndex) {
    var line = _a.line;
    var graphemeCount = countRenderableGraphemes(line.fullText);
    if (graphemeCount === 0) {
      return;
    }
    var isComfortableHeroLength = graphemeCount >= 4 && graphemeCount <= 28;
    var isAcceptableFallbackLength = graphemeCount <= 36;
    if (!isComfortableHeroLength && !isAcceptableFallbackLength) {
      return;
    }
    var centered = Math.abs(blockIndex - entries.length / 2) / Math.max(entries.length, 1);
    var centerScore = 1 - centered;
    var lengthScore =
      graphemeCount >= 6 && graphemeCount <= 22 ? 1 : graphemeCount <= 28 ? 0.72 : 0.36;
    var chorusScore = line.isChorus ? 0.28 : 0;
    var stableJitter =
      seeded(''.concat(line.fullText, ':').concat(blockIndex, ':fallback-hero')) * 0.04;
    var score = centerScore * 0.62 + lengthScore * 0.34 + chorusScore + stableJitter;
    if (score > bestScore) {
      bestScore = score;
      bestIndex = blockIndex;
    }
  });
  if (bestIndex >= 0) {
    return bestIndex;
  }
  var shortestIndex = -1;
  var shortestCount = Number.POSITIVE_INFINITY;
  entries.forEach(function (_a, blockIndex) {
    var line = _a.line;
    var graphemeCount = countRenderableGraphemes(line.fullText);
    if (graphemeCount > 0 && graphemeCount < shortestCount) {
      shortestCount = graphemeCount;
      shortestIndex = blockIndex;
    }
  });
  return shortestIndex;
};
var chooseBlockVariant = function (line, index, total, forcedHeroIndex) {
  return index === forcedHeroIndex ? 'hero' : chooseNaturalBlockVariant(line, index, total);
};
var chooseFontPx = function (line, variant, width, lyricsFontScale, densityScale) {
  var graphemeCount = Math.max(countRenderableGraphemes(line.fullText), 1);
  var density = graphemeCount + line.words.length * 1.4;
  var base =
    variant === 'hero'
      ? width / Math.max(Math.sqrt(density) * 1.5, 4.5)
      : width / Math.max(Math.sqrt(density) * 2.25, 7);
  var scaled = base * lyricsFontScale * densityScale;
  return variant === 'hero' ? clamp(scaled, 24, 54) : clamp(scaled, 14, 28);
};
var buildLayoutCacheKey = function (lines, viewport, layoutTheme, lyricsFontScale, fumeTuning) {
  var e_1, _a;
  var _b, _c, _d, _e;
  var linesHash = 2166136261;
  try {
    for (
      var lines_1 = __values(lines), lines_1_1 = lines_1.next();
      !lines_1_1.done;
      lines_1_1 = lines_1.next()
    ) {
      var line = lines_1_1.value;
      var lineKey = ''
        .concat(line.startTime, ':')
        .concat(line.endTime, ':')
        .concat(line.fullText, ':')
        .concat(line.words.length, ':')
        .concat(line.isChorus ? 1 : 0);
      linesHash ^= hashString(lineKey);
      linesHash = Math.imul(linesHash, 16777619);
    }
  } catch (e_1_1) {
    e_1 = { error: e_1_1 };
  } finally {
    try {
      if (lines_1_1 && !lines_1_1.done && (_a = lines_1.return)) _a.call(lines_1);
    } finally {
      if (e_1) throw e_1.error;
    }
  }
  return [
    Math.round(viewport.width),
    Math.round(viewport.height),
    layoutTheme.fontStyle,
    (_b = layoutTheme.fontFamily) !== null && _b !== void 0 ? _b : '',
    (_d = (_c = layoutTheme.fontFamilyStack) === null || _c === void 0 ? void 0 : _c.join(',')) !==
      null && _d !== void 0
      ? _d
      : '',
    (_e = layoutTheme.fontWeight) !== null && _e !== void 0 ? _e : 'auto',
    layoutTheme.name,
    lyricsFontScale.toFixed(4),
    fumeTuning.heroScale.toFixed(4),
    lines.length,
    linesHash >>> 0,
  ].join('|');
};
function buildArticleLayoutAttempt(
  lines,
  viewport,
  layoutTheme,
  lyricsFontScale,
  fumeTuning,
  options,
  lineMeasures
) {
  var paperWidth,
    viewportHeight,
    columns,
    gap,
    densityScale,
    seedKey,
    _a,
    mode,
    timing,
    shouldBuildRenderDetails,
    horizontalMargin,
    verticalMargin,
    columnWidth,
    fontFamily,
    filteredLines,
    blocks,
    columnHeights,
    bodyColumnTieCursor,
    heroPlacementTieCursor,
    forcedHeroIndex,
    _loop_1,
    _b,
    _c,
    _d,
    blockIndex,
    _e,
    line,
    index,
    e_2_1,
    articleHeight,
    metrics,
    chronologicalBlocks,
    blockBySourceLineIndex,
    chronologicalBlocks_1,
    chronologicalBlocks_1_1,
    block,
    firstRenderableStartTime,
    lastChronologicalRenderEndTime;
  var e_2, _f, e_3, _g;
  var _h, _j, _k, _l, _m, _o;
  return __generator(this, function (_p) {
    switch (_p.label) {
      case 0:
        if (viewport.width <= 0 || viewport.height <= 0 || lines.length === 0) {
          return [2, null];
        }
        ((paperWidth = options.paperWidth),
          (viewportHeight = options.viewportHeight),
          (columns = options.columns),
          (gap = options.gap),
          (densityScale = options.densityScale),
          (seedKey = options.seedKey),
          (_a = options.mode),
          (mode = _a === void 0 ? 'render' : _a),
          (timing = options.timing));
        shouldBuildRenderDetails = mode === 'render';
        horizontalMargin = Math.max(viewport.width * 0.86, 280);
        verticalMargin = Math.max(viewport.height * 0.82, 220);
        columnWidth = (paperWidth - gap * (columns - 1)) / columns;
        fontFamily = resolveThemeFontStack(layoutTheme);
        filteredLines = lines
          .map(function (line2, index2) {
            return {
              line: line2,
              index: Number.isInteger(line2.sourceIndex) ? line2.sourceIndex : index2,
            };
          })
          .filter(function (entry) {
            return entry.line.fullText.trim().length > 0;
          })
          .sort(function (left, right) {
            var leftSeed = seeded(
              ''.concat(seedKey, ':').concat(left.index, ':').concat(left.line.fullText)
            );
            var rightSeed = seeded(
              ''.concat(seedKey, ':').concat(right.index, ':').concat(right.line.fullText)
            );
            return leftSeed - rightSeed;
          });
        blocks = [];
        columnHeights = Array.from({ length: columns }, function () {
          return verticalMargin;
        });
        bodyColumnTieCursor = 0;
        heroPlacementTieCursor = 0;
        forcedHeroIndex = chooseFallbackHeroBlockIndex(filteredLines);
        _loop_1 = function (blockIndex2, line2, index2) {
          var variant,
            heroSpanColumns,
            heroSpanWidth,
            blockWidth,
            paddingX,
            paddingY,
            innerWidth,
            prepareLayoutStart,
            measures,
            _q,
            fontPx,
            lineCount,
            lineHeight,
            blockGap,
            blockHeight,
            x,
            y,
            placementStart,
            bestHeight,
            candidateStarts,
            startColumn,
            coveredHeight,
            columnIndex,
            targetStart,
            columnIndex,
            targetColumn,
            minHeight,
            candidateColumns,
            columnIndex,
            height,
            renderDetailsStart,
            prepared_1,
            layout,
            fontSpec_1,
            _r,
            graphemes,
            segmentMetas_1,
            wordRanges,
            wordRangeIndexByOffset,
            colorRangeIndexByOffset,
            renderLines;
          return __generator(this, function (_s) {
            switch (_s.label) {
              case 0:
                if (!(blockIndex2 > 0)) return [3, 2];
                return [
                  4,
                  /*yield*/
                ];
              case 1:
                _s.sent();
                _s.label = 2;
              case 2:
                timing && (timing.lines += 1);
                variant = chooseBlockVariant(
                  line2,
                  blockIndex2,
                  filteredLines.length,
                  forcedHeroIndex
                );
                heroSpanColumns = variant === 'hero' ? Math.min(columns, columns <= 1 ? 1 : 2) : 1;
                heroSpanWidth =
                  heroSpanColumns > 1
                    ? columnWidth * heroSpanColumns + gap * (heroSpanColumns - 1)
                    : paperWidth;
                blockWidth =
                  variant === 'hero'
                    ? heroSpanColumns === 1
                      ? paperWidth
                      : columns === 2
                        ? columnWidth * 1.5 + gap * 0.5
                        : heroSpanWidth
                    : columnWidth;
                paddingX = 0;
                paddingY = 0;
                innerWidth = Math.max(blockWidth - paddingX * 2, 120);
                prepareLayoutStart = timing ? nowMs() : 0;
                measures = lineMeasuresFor(
                  lineMeasures,
                  line2.fullText,
                  variant,
                  fontFamily,
                  layoutTheme
                );
                ((_q = chooseSingleLineFontPx(
                  measures,
                  innerWidth,
                  lyricsFontScale,
                  densityScale,
                  fumeTuning.heroScale
                )),
                  (fontPx = _q.fontPx),
                  (lineCount = _q.lineCount));
                if (timing) {
                  timing.prepareLayoutMs += nowMs() - prepareLayoutStart;
                }
                lineHeight = Math.round(fontPx * (variant === 'hero' ? 1.02 : 1.06));
                blockGap =
                  variant === 'hero'
                    ? Math.max(Math.round(lineHeight * 0.2), 6)
                    : Math.max(Math.round(lineHeight * 0.08), 2);
                blockHeight = paddingY * 2 + lineCount * lineHeight;
                x = 0;
                y = 0;
                placementStart = timing ? nowMs() : 0;
                if (variant === 'hero') {
                  if (heroSpanColumns === 1) {
                    y = Math.max.apply(Math, __spreadArray([], __read(columnHeights), false));
                    x = horizontalMargin;
                    columnHeights[0] = y + blockHeight + blockGap;
                  } else {
                    bestHeight = Number.POSITIVE_INFINITY;
                    candidateStarts = [];
                    for (
                      startColumn = 0;
                      startColumn <= columns - heroSpanColumns;
                      startColumn += 1
                    ) {
                      coveredHeight = 0;
                      for (
                        columnIndex = startColumn;
                        columnIndex < startColumn + heroSpanColumns;
                        columnIndex += 1
                      ) {
                        coveredHeight = Math.max(
                          coveredHeight,
                          (_h = columnHeights[columnIndex]) !== null && _h !== void 0 ? _h : 0
                        );
                      }
                      if (coveredHeight < bestHeight) {
                        bestHeight = coveredHeight;
                        candidateStarts = [startColumn];
                      } else if (coveredHeight === bestHeight) {
                        candidateStarts.push(startColumn);
                      }
                    }
                    targetStart =
                      candidateStarts.length > 0
                        ? candidateStarts[heroPlacementTieCursor % candidateStarts.length]
                        : 0;
                    heroPlacementTieCursor += 1;
                    y = bestHeight;
                    x =
                      horizontalMargin +
                      targetStart * (columnWidth + gap) +
                      Math.max((heroSpanWidth - blockWidth) * 0.5, 0);
                    for (
                      columnIndex = targetStart;
                      columnIndex < targetStart + heroSpanColumns;
                      columnIndex += 1
                    ) {
                      columnHeights[columnIndex] = y + blockHeight + blockGap;
                    }
                  }
                } else {
                  targetColumn = 0;
                  minHeight = (_j = columnHeights[0]) !== null && _j !== void 0 ? _j : 0;
                  candidateColumns = [0];
                  for (columnIndex = 1; columnIndex < columns; columnIndex += 1) {
                    height = (_k = columnHeights[columnIndex]) !== null && _k !== void 0 ? _k : 0;
                    if (height < minHeight) {
                      minHeight = height;
                      candidateColumns.length = 0;
                      candidateColumns.push(columnIndex);
                    } else if (height === minHeight) {
                      candidateColumns.push(columnIndex);
                    }
                  }
                  targetColumn =
                    (_l = candidateColumns[bodyColumnTieCursor % candidateColumns.length]) !==
                      null && _l !== void 0
                      ? _l
                      : 0;
                  bodyColumnTieCursor += 1;
                  x = horizontalMargin + targetColumn * (columnWidth + gap);
                  y = columnHeights[targetColumn];
                  columnHeights[targetColumn] = y + blockHeight + blockGap;
                }
                if (timing) {
                  timing.placementMs += nowMs() - placementStart;
                }
                if (shouldBuildRenderDetails) {
                  renderDetailsStart = timing ? nowMs() : 0;
                  prepared_1 = prepareLineAt(measures, fontPx);
                  layout = layoutWithLines(prepared_1, innerWidth, lineHeight);
                  fontSpec_1 = buildFontSpec(fontPx, variant, fontFamily, layoutTheme);
                  ((_r = buildSegmentMetas(prepared_1)),
                    (graphemes = _r.graphemes),
                    (segmentMetas_1 = _r.segmentMetas));
                  wordRanges = buildWordRangesFromWords(line2, graphemes);
                  wordRangeIndexByOffset = buildWordRangeIndexByOffset(
                    graphemes.length,
                    wordRanges
                  );
                  colorRangeIndexByOffset = buildWordRangeIndexByOffset(
                    graphemes.length,
                    wordRanges,
                    'color'
                  );
                  renderLines = layout.lines.map(function (layoutLine, lineIndex) {
                    var start = cursorToGlobalOffset(layoutLine.start, segmentMetas_1);
                    var end = cursorToGlobalOffset(layoutLine.end, segmentMetas_1);
                    var lineGraphemes = splitGraphemes(layoutLine.text);
                    return {
                      id: ''.concat(line2.startTime, '-').concat(lineIndex),
                      text: layoutLine.text,
                      start,
                      end,
                      graphemes: lineGraphemes,
                      glyphOffsets: buildGlyphOffsets(
                        prepared_1,
                        segmentMetas_1,
                        start,
                        lineGraphemes.length
                      ),
                      segments: buildRenderSegments(
                        prepared_1,
                        segmentMetas_1,
                        start,
                        end,
                        fontSpec_1
                      ),
                      left:
                        variant === 'hero'
                          ? Math.max((blockWidth - layoutLine.width) * 0.08, 0)
                          : 0,
                      top: paddingY + lineIndex * lineHeight,
                      width: layoutLine.width,
                    };
                  });
                  blocks.push({
                    id: 'fume-'.concat(line2.startTime, '-').concat(index2),
                    sourceLineIndex: index2,
                    line: line2,
                    variant,
                    x,
                    y,
                    width: blockWidth,
                    height: blockHeight,
                    innerWidth,
                    fontPx,
                    lineHeight,
                    prepared: prepared_1,
                    layout,
                    graphemes,
                    segmentMetas: segmentMetas_1,
                    wordRanges,
                    wordRangeIndexByOffset,
                    colorRangeIndexByOffset,
                    renderLines,
                  });
                  if (timing) {
                    timing.renderDetailsMs += nowMs() - renderDetailsStart;
                  }
                }
                return [
                  2,
                  /*return*/
                ];
            }
          });
        };
        _p.label = 1;
      case 1:
        _p.trys.push([1, 6, 7, 8]);
        ((_b = __values(filteredLines.entries())), (_c = _b.next()));
        _p.label = 2;
      case 2:
        if (!!_c.done) return [3, 5];
        ((_d = __read(_c.value, 2)),
          (blockIndex = _d[0]),
          (_e = _d[1]),
          (line = _e.line),
          (index = _e.index));
        return [5, _loop_1(blockIndex, line, index)];
      case 3:
        _p.sent();
        _p.label = 4;
      case 4:
        _c = _b.next();
        return [3, 2];
      case 5:
        return [3, 8];
      case 6:
        e_2_1 = _p.sent();
        e_2 = { error: e_2_1 };
        return [3, 8];
      case 7:
        try {
          if (_c && !_c.done && (_f = _b.return)) _f.call(_b);
        } finally {
          if (e_2) throw e_2.error;
        }
        return [
          7,
          /*endfinally*/
        ];
      case 8:
        articleHeight =
          Math.max.apply(Math, __spreadArray([0], __read(columnHeights), false)) + verticalMargin;
        metrics = {
          width: paperWidth + horizontalMargin * 2,
          height: articleHeight,
          viewportHeight,
          columns,
          gap,
          paperBounds: {
            left: horizontalMargin,
            top: verticalMargin,
            right: horizontalMargin + paperWidth,
            bottom: Math.max(articleHeight - verticalMargin, verticalMargin),
          },
        };
        if (!shouldBuildRenderDetails) {
          return [2, metrics];
        }
        chronologicalBlocks = __spreadArray([], __read(blocks), false).sort(function (left, right) {
          return left.sourceLineIndex - right.sourceLineIndex;
        });
        blockBySourceLineIndex = /* @__PURE__ */ new Map();
        try {
          for (
            chronologicalBlocks_1 = __values(chronologicalBlocks),
              chronologicalBlocks_1_1 = chronologicalBlocks_1.next();
            !chronologicalBlocks_1_1.done;
            chronologicalBlocks_1_1 = chronologicalBlocks_1.next()
          ) {
            block = chronologicalBlocks_1_1.value;
            blockBySourceLineIndex.set(block.sourceLineIndex, block);
          }
        } catch (e_3_1) {
          e_3 = { error: e_3_1 };
        } finally {
          try {
            if (
              chronologicalBlocks_1_1 &&
              !chronologicalBlocks_1_1.done &&
              (_g = chronologicalBlocks_1.return)
            )
              _g.call(chronologicalBlocks_1);
          } finally {
            if (e_3) throw e_3.error;
          }
        }
        firstRenderableStartTime =
          (_o =
            (_m = chronologicalBlocks[0]) === null || _m === void 0
              ? void 0
              : _m.line.startTime) !== null && _o !== void 0
            ? _o
            : Number.POSITIVE_INFINITY;
        lastChronologicalRenderEndTime =
          chronologicalBlocks.length > 0
            ? getLineRenderEndTime(chronologicalBlocks[chronologicalBlocks.length - 1].line)
            : Number.NEGATIVE_INFINITY;
        return [
          2,
          __assign(__assign({}, metrics), {
            blocks,
            blockBySourceLineIndex,
            chronologicalBlocks,
            firstRenderableStartTime,
            lastChronologicalRenderEndTime,
          }),
        ];
    }
  });
}
function buildArticleLayout(lines, viewport, layoutTheme, lyricsFontScale, fumeTuning) {
  var paperWidth,
    viewportHeight,
    maxColumns,
    targetHeight,
    layoutSeedKey,
    bestOptions,
    bestScore,
    bestHeight,
    totalStart,
    measureTiming,
    renderTiming,
    measureColumnTimings,
    measureAttemptCount,
    lineMeasures,
    columns,
    low,
    high,
    gap,
    columnTiming,
    iteration,
    densityScale,
    attemptOptions,
    layout,
    coveragePenalty,
    overflowPenalty,
    score,
    renderStart,
    article,
    _a,
    renderMs,
    totalMs;
  var _b, _c, _d, _e, _f;
  return __generator(this, function (_g) {
    switch (_g.label) {
      case 0:
        if (viewport.width <= 0 || viewport.height <= 0 || lines.length === 0) {
          return [2, null];
        }
        paperWidth = clamp(Math.max(viewport.width * 1.95, viewport.width + 520), 920, 2400);
        viewportHeight = Math.max(viewport.height, 240);
        maxColumns = paperWidth >= 1120 ? 4 : paperWidth >= 760 ? 3 : paperWidth >= 500 ? 2 : 1;
        targetHeight = viewportHeight * 2.45;
        layoutSeedKey = layoutTheme.name;
        bestOptions = null;
        bestScore = Number.POSITIVE_INFINITY;
        bestHeight = 0;
        totalStart = nowMs();
        measureTiming = createFumeLayoutTiming();
        renderTiming = createFumeLayoutTiming();
        measureColumnTimings = /* @__PURE__ */ new Map();
        measureAttemptCount = 0;
        lineMeasures = /* @__PURE__ */ new Map();
        columns = maxColumns;
        _g.label = 1;
      case 1:
        if (!(columns >= 1)) return [3, 7];
        low = 0.82;
        high = 1.42;
        gap = clamp(
          Math.round(paperWidth * (columns >= 4 ? 65e-4 : columns === 3 ? 85e-4 : 0.0115)),
          6,
          14
        );
        columnTiming = createFumeLayoutTiming();
        measureColumnTimings.set(columns, columnTiming);
        iteration = 0;
        _g.label = 2;
      case 2:
        if (!(iteration < 8)) return [3, 5];
        densityScale = (low + high) / 2;
        measureAttemptCount += 1;
        attemptOptions = {
          paperWidth,
          viewportHeight,
          columns,
          gap,
          densityScale,
          seedKey: ''.concat(layoutSeedKey, ':').concat(columns, ':').concat(paperWidth),
          mode: 'measure',
          timing: columnTiming,
        };
        return [
          5,
          __values(
            buildArticleLayoutAttempt(
              lines,
              viewport,
              layoutTheme,
              lyricsFontScale,
              fumeTuning,
              attemptOptions,
              lineMeasures
            )
          ),
        ];
      case 3:
        layout = _g.sent();
        if (!layout) {
          return [3, 4];
        }
        coveragePenalty = Math.abs(layout.height - targetHeight);
        overflowPenalty = layout.height < targetHeight ? 0 : (layout.height - targetHeight) * 0.14;
        score = coveragePenalty + overflowPenalty;
        if (score < bestScore) {
          bestScore = score;
          bestHeight = layout.height;
          bestOptions = {
            paperWidth,
            viewportHeight,
            columns,
            gap,
            densityScale,
            seedKey: ''.concat(layoutSeedKey, ':').concat(columns, ':').concat(paperWidth),
            mode: 'render',
            timing: renderTiming,
          };
        }
        if (layout.height < targetHeight) {
          low = densityScale;
        } else {
          high = densityScale;
        }
        _g.label = 4;
      case 4:
        iteration += 1;
        return [3, 2];
      case 5:
        measureTiming.lines += columnTiming.lines;
        measureTiming.prepareLayoutMs += columnTiming.prepareLayoutMs;
        measureTiming.placementMs += columnTiming.placementMs;
        measureTiming.renderDetailsMs += columnTiming.renderDetailsMs;
        _g.label = 6;
      case 6:
        columns -= 1;
        return [3, 1];
      case 7:
        renderStart = nowMs();
        if (!bestOptions) return [3, 9];
        return [
          5,
          __values(
            buildArticleLayoutAttempt(
              lines,
              viewport,
              layoutTheme,
              lyricsFontScale,
              fumeTuning,
              bestOptions,
              lineMeasures
            )
          ),
        ];
      case 8:
        _a = _g.sent();
        return [3, 10];
      case 9:
        _a = null;
        _g.label = 10;
      case 10:
        article = _a;
        renderMs = nowMs() - renderStart;
        totalMs = nowMs() - totalStart;
        if (false) {
          console.info('[VisualizerFume] layout timing', {
            totalMs: roundMs(totalMs),
            measureMs: roundMs(measureTiming.prepareLayoutMs + measureTiming.placementMs),
            renderMs: roundMs(renderMs),
            attempts: measureAttemptCount,
            measuredLines: measureTiming.lines,
            renderedLines: renderTiming.lines,
            inputLines: lines.length,
            blocks:
              (_b = article === null || article === void 0 ? void 0 : article.blocks.length) !==
                null && _b !== void 0
                ? _b
                : 0,
            heroBlocks:
              (_c =
                article === null || article === void 0
                  ? void 0
                  : article.blocks.filter(function (block) {
                      return block.variant === 'hero';
                    }).length) !== null && _c !== void 0
                ? _c
                : 0,
            viewport: ''
              .concat(Math.round(viewport.width), 'x')
              .concat(Math.round(viewport.height)),
            paperWidth: Math.round(paperWidth),
            targetHeight: Math.round(targetHeight),
            bestHeight: Math.round(bestHeight),
            finalHeight: Math.round(
              (_d = article === null || article === void 0 ? void 0 : article.height) !== null &&
                _d !== void 0
                ? _d
                : 0
            ),
            heightDelta: Math.round(
              ((_e = article === null || article === void 0 ? void 0 : article.height) !== null &&
              _e !== void 0
                ? _e
                : 0) - targetHeight
            ),
            bestColumns:
              (_f =
                bestOptions === null || bestOptions === void 0 ? void 0 : bestOptions.columns) !==
                null && _f !== void 0
                ? _f
                : null,
            bestDensityScale: bestOptions ? Number(bestOptions.densityScale.toFixed(4)) : null,
            measureBreakdown: {
              prepareLayoutMs: roundMs(measureTiming.prepareLayoutMs),
              placementMs: roundMs(measureTiming.placementMs),
              renderDetailsMs: roundMs(measureTiming.renderDetailsMs),
            },
            renderBreakdown: {
              prepareLayoutMs: roundMs(renderTiming.prepareLayoutMs),
              placementMs: roundMs(renderTiming.placementMs),
              renderDetailsMs: roundMs(renderTiming.renderDetailsMs),
            },
            measureByColumns: Array.from(measureColumnTimings.entries()).map(function (_a2) {
              var _b2 = __read(_a2, 2),
                columns2 = _b2[0],
                timing = _b2[1];
              return {
                columns: columns2,
                lines: timing.lines,
                prepareLayoutMs: roundMs(timing.prepareLayoutMs),
                placementMs: roundMs(timing.placementMs),
              };
            }),
          });
        }
        return [2, article];
    }
  });
}
export { buildArticleLayout, buildLayoutCacheKey };
