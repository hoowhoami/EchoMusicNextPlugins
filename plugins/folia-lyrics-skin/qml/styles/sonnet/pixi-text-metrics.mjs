// CanvasTextMetrics geometry, with native full-context advance/ink replacing Canvas measurement.
import { graphemeSegments } from '../../shared/text/unicode.mjs';
import { requestMetric } from './native-measure.mjs';
import { wordWrap } from './pixi-word-wrap.mjs';
import { NEWLINE_MATCH_REGEX } from './pixi-tokenization.mjs';

export const FONT_PROBE = '|ÉqÅM';
export function fontSpec(style) {
  const weight = style.fontWeight === 'bold' ? 700 : Number(style.fontWeight) || 400;
  const size = Number(style.fontSize) || 26;
  const family = style.fontFamily || 'Arial';
  return `${weight} ${size}px ${Array.isArray(family) ? family.join(', ') : family}`;
}
function nativeMetric(font, text, provider) {
  const metric = provider(font, text);
  if (
    ![metric.advance, metric.inkLeft, metric.inkRight, metric.inkTop, metric.inkBottom].every(
      Number.isFinite
    )
  )
    throw new Error('Missing native advance/ink bounds for Pixi text');
  return metric;
}
function advance(text, letterSpacing, font, provider) {
  const metric = nativeMetric(font, text, provider);
  return metric.advance > 0
    ? metric.advance + (graphemeSegments(text).length - 1) * letterSpacing
    : metric.advance;
}
function paintedWidth(text, letterSpacing, font, provider) {
  const metric = nativeMetric(font, text, provider);
  const spacing = metric.advance > 0 ? (graphemeSegments(text).length - 1) * letterSpacing : 0;
  return Math.max(metric.advance + spacing, metric.inkRight - metric.inkLeft + spacing);
}
function measureWithProvider({ text, style }, provider) {
  const font = fontSpec(style),
    probe = nativeMetric(font, FONT_PROBE, provider);
  const ascent = Math.max(0, -probe.inkTop),
    descent = Math.max(0, probe.inkBottom);
  const fontSize = ascent + descent || Number(style.fontSize) || 26;
  const letterSpacing = style.letterSpacing || 0,
    leading = style.leading || 0;
  const strokeWidth = (style.stroke && style.stroke.width) || 0;
  const shadowDistance = (style.dropShadow && style.dropShadow.distance) || 0;
  const lineHeight = style.lineHeight || fontSize;
  const wrapStyle = Object.assign({ whiteSpace: 'pre', breakWords: false }, style, {
    letterSpacing,
    _fontString: font,
  });
  const context = {
    font,
    measureText(value) {
      return { width: advance(value, 0, this.font, provider) };
    },
  };
  const canvas = {
    getContext() {
      return context;
    },
  };
  const outputText = style.wordWrap
    ? wordWrap(
        text,
        wrapStyle,
        canvas,
        (value, spacing, target) => advance(value, spacing, target.font, provider),
        (_, breakWords) => breakWords,
        () => true,
        (value) => graphemeSegments(value).map((segment) => segment.segment)
      )
    : text;
  const lines = outputText.split(NEWLINE_MATCH_REGEX);
  const lineWidths = lines.map((line) => paintedWidth(line, letterSpacing, font, provider));
  const maxLineWidth = Math.max(0, ...lineWidths);
  const height =
    Math.max(lineHeight, fontSize + strokeWidth) +
    (lines.length - 1) * (lineHeight + leading) +
    shadowDistance;
  return {
    width: maxLineWidth + strokeWidth + shadowDistance,
    height,
    baseline:
      strokeWidth / 2 +
      (ascent + descent ? ascent : fontSize) +
      Math.max(0, lineHeight - fontSize) / 2,
    lineHeight: lineHeight + leading,
    fontAscent: ascent,
    fontDescent: descent,
    fontSize,
    font,
    lines,
    lineWidths,
    maxLineWidth,
    strokeWidth,
  };
}
export function createTextMeasurer(provider) {
  if (typeof provider !== 'function') throw new Error('A native metric provider is required');
  return (input) => measureWithProvider(input, provider);
}
export const measureSourceText = createTextMeasurer(requestMetric);
