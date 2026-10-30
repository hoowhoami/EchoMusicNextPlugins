// Pixi8.21.0 MIT source methods. See Sonnet/PIXI-TEXT-LICENSE.txt.
import { graphemeSegments } from '../../shared/text/unicode.mjs';
import { color } from '../sonnet/scene-graph.mjs';
('use strict');
const genericFontFamilies = ['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui'];
function fontStringFromTextStyle(style) {
  const fontSizeString =
    typeof style.fontSize === 'number' ? `${style.fontSize}px` : style.fontSize;
  let fontFamilies = style.fontFamily;
  if (!Array.isArray(style.fontFamily)) {
    fontFamilies = style.fontFamily.split(',');
  }
  for (let i = fontFamilies.length - 1; i >= 0; i--) {
    let fontFamily = fontFamilies[i].trim();
    if (!/([\"\'])[^\'\"]+\1/.test(fontFamily) && !genericFontFamilies.includes(fontFamily)) {
      fontFamily = `"${fontFamily}"`;
    }
    fontFamilies[i] = fontFamily;
  }
  return `${style.fontStyle} ${style.fontVariant} ${style.fontWeight} ${fontSizeString} ${fontFamilies.join(',')}`;
}
const CanvasTextMetrics = {
  experimentalLetterSpacingSupported: false,
  experimentalLetterSpacing: false,
  graphemeSegmenter: (text) => graphemeSegments(text).map((value) => value.segment),
};
function countSpaces(text) {
  let count = 0;
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 32) count++;
  return count;
}
class SourceTextPainter {
  _renderTextToCanvas(style, padding, resolution, canvasAndContext, measured) {
    var _a, _b, _c, _d, _e, _f;
    if (measured.runsByLine && measured.runsByLine.length > 0) {
      this._renderTaggedTextToCanvas(measured, style, padding, resolution, canvasAndContext);
      return;
    }
    const { canvas, context } = canvasAndContext;
    const font = fontStringFromTextStyle(style);
    const lines = measured.lines;
    const lineHeight = measured.lineHeight;
    const lineWidths = measured.lineWidths;
    const maxLineWidth = measured.maxLineWidth;
    const fontProperties = measured.fontProperties;
    const height = canvas.height;
    context.resetTransform();
    context.scale(resolution, resolution);
    context.textBaseline = style.textBaseline;
    if ((_a = style._stroke) == null ? void 0 : _a.width) {
      const strokeStyle = style._stroke;
      context.lineWidth = strokeStyle.width;
      context.miterLimit = strokeStyle.miterLimit;
      context.lineJoin = strokeStyle.join;
      context.lineCap = strokeStyle.cap;
    }
    context.font = font;
    let linePositionX;
    let linePositionY;
    const passesCount = style.dropShadow ? 2 : 1;
    const strokeWidth = (_c = (_b = style._stroke) == null ? void 0 : _b.width) != null ? _c : 0;
    const halfStroke = strokeWidth / 2;
    let linePositionYShift = (lineHeight - fontProperties.fontSize) / 2;
    if (lineHeight - fontProperties.fontSize < 0) {
      linePositionYShift = 0;
    }
    for (let i = 0; i < passesCount; ++i) {
      const isShadowPass = style.dropShadow && i === 0;
      const dsOffsetText = isShadowPass ? Math.ceil(Math.max(1, height) + padding * 2) : 0;
      const dsOffsetShadow = dsOffsetText * resolution;
      if (isShadowPass) {
        this._setupDropShadow(context, style, resolution, dsOffsetShadow);
      } else {
        const gradientBounds = style._gradientBounds;
        const gradientOffset = style._gradientOffset;
        if (gradientBounds) {
          const gradientMetrics = {
            width: gradientBounds.width,
            height: gradientBounds.height,
            lineHeight: gradientBounds.height,
            lines: measured.lines,
          };
          this._setFillAndStrokeStyles(
            context,
            style,
            gradientMetrics,
            padding,
            halfStroke,
            (_d = gradientOffset == null ? void 0 : gradientOffset.x) != null ? _d : 0,
            (_e = gradientOffset == null ? void 0 : gradientOffset.y) != null ? _e : 0
          );
        } else if (gradientOffset) {
          this._setFillAndStrokeStyles(
            context,
            style,
            measured,
            padding,
            halfStroke,
            gradientOffset.x,
            gradientOffset.y
          );
        } else {
          this._setFillAndStrokeStyles(context, style, measured, padding, halfStroke);
        }
        context.shadowColor = 'rgba(0,0,0,0)';
      }
      for (let j = 0; j < lines.length; j++) {
        linePositionX = halfStroke;
        linePositionY = halfStroke + j * lineHeight + fontProperties.ascent + linePositionYShift;
        linePositionX += this._getAlignmentOffset(lineWidths[j], maxLineWidth, style.align);
        let wordSpacing = 0;
        if (style.align === 'justify' && style.wordWrap && j < lines.length - 1) {
          const spaces = countSpaces(lines[j]);
          if (spaces > 0) {
            wordSpacing = (maxLineWidth - lineWidths[j]) / spaces;
          }
        }
        if ((_f = style._stroke) == null ? void 0 : _f.width) {
          this._drawLetterSpacing(
            lines[j],
            style,
            canvasAndContext,
            linePositionX + padding,
            linePositionY + padding - dsOffsetText,
            true,
            wordSpacing
          );
        }
        if (style._fill !== void 0) {
          this._drawLetterSpacing(
            lines[j],
            style,
            canvasAndContext,
            linePositionX + padding,
            linePositionY + padding - dsOffsetText,
            false,
            wordSpacing
          );
        }
      }
    }
  }
  _getAlignmentOffset(lineWidth, alignWidth, align) {
    if (align === 'right') {
      return alignWidth - lineWidth;
    } else if (align === 'center') {
      return (alignWidth - lineWidth) / 2;
    }
    return 0;
  }
  _drawLetterSpacing(text, style, canvasAndContext, x, y, isStroke = false, wordSpacing = 0) {
    const { context } = canvasAndContext;
    const letterSpacing = style.letterSpacing;
    let useExperimentalLetterSpacing = false;
    if (CanvasTextMetrics.experimentalLetterSpacingSupported) {
      if (CanvasTextMetrics.experimentalLetterSpacing) {
        context.letterSpacing = `${letterSpacing}px`;
        context.textLetterSpacing = `${letterSpacing}px`;
        useExperimentalLetterSpacing = true;
      } else {
        context.letterSpacing = '0px';
        context.textLetterSpacing = '0px';
      }
    }
    if ((letterSpacing === 0 || useExperimentalLetterSpacing) && wordSpacing === 0) {
      if (isStroke) {
        context.strokeText(text, x, y);
      } else {
        context.fillText(text, x, y);
      }
      return;
    }
    if (wordSpacing !== 0 && (letterSpacing === 0 || useExperimentalLetterSpacing)) {
      const words = text.split(' ');
      let currentPosition2 = x;
      const spaceWidth = context.measureText(' ').width;
      for (let i = 0; i < words.length; i++) {
        if (isStroke) {
          context.strokeText(words[i], currentPosition2, y);
        } else {
          context.fillText(words[i], currentPosition2, y);
        }
        currentPosition2 += context.measureText(words[i]).width + spaceWidth + wordSpacing;
      }
      return;
    }
    let currentPosition = x;
    const stringArray = CanvasTextMetrics.graphemeSegmenter(text);
    let previousWidth = context.measureText(text).width;
    let currentWidth = 0;
    for (let i = 0; i < stringArray.length; ++i) {
      const currentChar = stringArray[i];
      if (isStroke) {
        context.strokeText(currentChar, currentPosition, y);
      } else {
        context.fillText(currentChar, currentPosition, y);
      }
      let textStr = '';
      for (let j = i + 1; j < stringArray.length; ++j) {
        textStr += stringArray[j];
      }
      currentWidth = context.measureText(textStr).width;
      currentPosition += previousWidth - currentWidth + letterSpacing;
      if (currentChar === ' ') currentPosition += wordSpacing;
      previousWidth = currentWidth;
    }
  }
  _setFillAndStrokeStyles(context, style) {
    if (style.dropShadow || style._stroke || (style._fill && style._fill.fill))
      throw new Error('Unsupported Lumiere credit text paint');
    context.fillStyle = color(style.fill);
  }
}
const sourceTextPainter = new SourceTextPainter();
export { sourceTextPainter };
