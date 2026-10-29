// Full pretext rich-inline model and source rail positioning in a real Worker.
import {
  configure,
  pendingMeasurements,
  normalize,
  inlineBox,
  getMeasureContext,
} from './native-measure.mjs';
import {
  clearMonetMeasurementCaches,
  buildMonetDisplayTokens,
  measureMonetGraphemeOffsets,
  resolveMonetSubtitleTracks,
} from './model.mjs';
import { buildPositionedEntries } from './rail-layout.mjs';
import { prepareWithSegments, layoutWithLines } from './pretext.mjs';
import { layoutPreWrap, preWrapParts } from './pre-wrap.mjs';
import { splitLyricGraphemes } from '../../shared/text/unicode.mjs';
import { settings, composition } from './kernel.mjs';
import {
  prepareWordColorMatchers,
  buildWordColorRangesFromMatchers,
  resolveTokenColorMap,
} from '../cadenza/word-coloring.mjs';
function normal(text) {
  return text.replace(/[ \t\n\r\f]+/g, ' ').replace(/^ | $/g, '');
}
export function requestedTexts(entries, config) {
  const t = settings(config),
    texts = new Set(['\ufffc']);
  let units = 0;
  const add = (text) => {
    if (!text || texts.has(text)) return;
    if (units + text.length > 4 * 1024 * 1024)
      throw new Error('Monet ICU prefixes exceed 4Mi UTF16');
    units += text.length;
    texts.add(text);
  };
  for (const entry of entries) {
    const line = entry.line;
    if (line.fullText.length > 8192) throw new Error('Monet line exceeds 8192 UTF16');
    for (const token of buildMonetDisplayTokens(line)) {
      add(normal(token.text));
      for (const part of preWrapParts(token.text)) add(part);
      if (token.timed) {
        let prefix = '';
        for (const ch of splitLyricGraphemes(token.text)) {
          prefix += ch;
          add(normal(prefix));
        }
      }
    }
    for (const track of resolveMonetSubtitleTracks(line, t.subtitleContentMode))
      add(normalize(track.text));
  }
  return Array.from(texts);
}
export class LayoutJob {
  constructor(request) {
    this.request = request;
    this.metrics = new Map();
    this.round = 0;
  }
  accept(values) {
    for (const v of values) {
      if (
        !Number.isFinite(v.width) ||
        !Number.isFinite(v.actualBoundingBoxAscent) ||
        !Number.isFinite(v.actualBoundingBoxDescent)
      )
        throw new Error('Invalid Monet native metrics');
      this.metrics.set(v.key, v);
    }
    if (this.metrics.size > 32768) throw new Error('Monet width cache exceeds 32768 queries');
  }
  step() {
    if (++this.round > 32) throw new Error('Monet native metric refinement exceeds 32 rounds');
    clearMonetMeasurementCaches();
    configure({
      pieces: this.request.pieces,
      measurements: Array.from(this.metrics.values()),
      discovery: true,
    });
    const request = this.request,
      t = settings(request.settings),
      g = composition(request.width, request.height, request.settings),
      theme = { primaryColor: request.primaryColor },
      inputs = {
        translationFontPx: g.translationFontPx,
        fontStack: 'body',
        translationFontStack: 'subtitle',
        fontWeight: t.fontWeight,
        translationFontWeight: t.subtitleFontWeight,
        secondaryTranslationFontWeight: t.secondarySubtitleFontWeight,
        subtitleContentMode: t.subtitleContentMode,
      };
    if (request.entries.length > 9) throw new Error('Monet visible rail exceeds nine lines');
    const entries = buildPositionedEntries(
        request.entries,
        { width: g.railWidth, height: g.railHeight },
        theme,
        g.fontPx,
        g.inactiveFontPx,
        inputs,
        g.glow,
        new Map()
      ),
      matchers = prepareWordColorMatchers(
        request.settings.wordColors || [],
        t.keywordColoringEnabled
      );
    if (pendingMeasurements().length)
      return { phase: 'measure', round: this.round, requests: pendingMeasurements() };
    let units = 0,
      count = 0;
    for (const entry of entries) {
      units += entry.line.fullText.length;
      if (entry.line.fullText.length > 8192 || units > 65536)
        throw new Error('Monet visible text exceeds native budget');
      const tokens = buildMonetDisplayTokens(entry.line),
        colors = resolveTokenColorMap(
          tokens,
          buildWordColorRangesFromMatchers(entry.line.fullText, matchers)
        ),
        font = entry.tone.fontWeight + ' ' + g.fontPx + 'px body',
        available = Math.max(180, g.railWidth - 2 * g.glow - 8),
        staticPassed = request.manual === true && entry.status !== 'active',
        boxes = tokens.map((token) =>
          token.timed && !staticPassed
            ? inlineBox(font, token.text, available, entry.layout.lineHeightPx)
            : null
        );
      if (pendingMeasurements().length)
        return { phase: 'measure', round: this.round, requests: pendingMeasurements() };
      // The source reservation model remains rich-inline/normal. Actual DOM
      // display spans preserve whitespace and hard breaks around timed boxes.
      const displayRows = layoutPreWrap(
          tokens.map((token, i) => ({
            text: token.text,
            font,
            box: boxes[i],
          })),
          available
        ),
        rows = [];
      let rowY = 0;
      for (const row of displayRows) {
        let rowHeight = entry.layout.lineHeightPx;
        for (const f of row.fragments) {
          const box = boxes[f.itemIndex];
          if (box) rowHeight = Math.max(rowHeight, box.boxHeight);
        }
        const fragments = row.fragments.map((fragment) => {
          const token = tokens[fragment.itemIndex],
            box = boxes[fragment.itemIndex],
            ctx = getMeasureContext();
          ctx.font = font;
          const normal = ctx.measureText(box ? token.text : fragment.text),
            result = {
              text: box ? token.text : fragment.text,
              x: fragment.x,
              y: rowY + (box ? rowHeight - box.boxHeight : rowHeight - entry.layout.lineHeightPx),
              width: fragment.occupiedWidth,
              boxWidth: box ? box.boxWidth : fragment.occupiedWidth,
              boxHeight: box ? box.boxHeight : entry.layout.lineHeightPx,
              lineCount: box ? box.lineCount : 1,
              paragraph: box ? box.paragraph : false,
              nativeHeight: normal.nativeHeight,
              token,
              color: colors.get(token.key) || null,
              offsets: token.timed ? measureMonetGraphemeOffsets(token.text, g.fontPx, font) : [],
            };
          return result;
        });
        rows.push({ fragments, width: row.width, height: rowHeight });
        rowY += rowHeight;
      }
      entry.renderTextHeight = rowY;
      for (const row of rows) count += row.fragments.length;
      if (count > 1024) throw new Error('Monet visible rail exceeds 1024 token fragments');
      entry.rows = rows;
      entry.tracks = entry.layout.subtitleTracks.map((track) => {
        const font = track.fontWeight + ' ' + track.fontPx + 'px subtitle',
          text = normalize(track.text),
          prepared = prepareWithSegments(text || ' ', font, { whiteSpace: 'pre-wrap' }),
          layout = layoutWithLines(
            prepared,
            Math.max(180, g.railWidth - 2 * g.glow - 8),
            track.lineHeightPx
          );
        return Object.assign({}, track, {
          rows: layout.lines
            .slice(0, track.lineCount)
            .map((row) => ({ text: row.text, width: row.width })),
        });
      });
    }
    const requests = pendingMeasurements();
    if (requests.length) {
      let units = 0;
      for (const value of requests) units += value.text.length;
      if (requests.length > 32768 || units > 4 * 1024 * 1024)
        throw new Error('Monet native discovery exceeds 4Mi UTF16');
      return { phase: 'measure', round: this.round, requests };
    }
    return { phase: 'complete', geometry: g, entries };
  }
}
