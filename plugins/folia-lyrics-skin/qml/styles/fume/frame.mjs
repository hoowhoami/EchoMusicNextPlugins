export { canvasText } from './native-measure.mjs';
// Adapt the original Canvas draw stream to complete native shaping contexts.
import { drawFumeLiveBlock, buildCanvasFont } from './canvas-text.mjs';
import { resolveFumeBlockTiming, resolveFumeStaticLayers } from './block-frame.mjs';
import { graphemeSegments } from '../../shared/text/unicode.mjs';
import { resolveRenderLineOffset } from './text-geometry.mjs';
import { parseColorChannels } from '../cadenza/color.mjs';
export function tuning(settings) {
  const number = (key, fallback, min, max) =>
    Number.isFinite(settings[key]) ? Math.max(min, Math.min(max, settings[key])) : fallback;
  return {
    hidePrintSymbols: settings.fumeHidePrintSymbols === true,
    disableGeometricBackground: settings.fumeDisableGeometricBackground !== false,
    backgroundObjectOpacity: number('fumeBackgroundObjectOpacity', 0.5, 0, 1),
    textHoldRatio: number('fumeTextHoldRatio', 1, 0, 1),
    cameraTrackingMode: settings.fumeCameraTrackingMode === 'stepped' ? 'stepped' : 'smooth',
    cameraSpeed: number('fumeCameraSpeed', 1, 0.55, 1.85),
    glowIntensity: number('fumeGlowIntensity', 1, 0, 1.8),
    heroScale: number('fumeHeroScale', 1, 0.82, 1.32),
  };
}
// One theme uses a small palette repeatedly with independently animated opacity.
let colorChannels = Object.create(null),
  colorChannelCount = 0;
export function rgba(value, alpha = 1) {
  let channels = colorChannels[value];
  if (!channels) {
    const rgb = parseColorChannels(value);
    const match = /^rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)$/.exec(value);
    const a = value === 'transparent' ? 0 : match ? Number(match[1]) : 1;
    channels = { r: rgb ? rgb.r / 255 : 1, g: rgb ? rgb.g / 255 : 1, b: rgb ? rgb.b / 255 : 1, a };
    if (colorChannelCount >= 256) {
      colorChannels = Object.create(null);
      colorChannelCount = 0;
    }
    colorChannels[value] = channels;
    ++colorChannelCount;
  }
  return alpha === 1 ? channels : { ...channels, a: channels.a * alpha };
}
export function recordBlock(block, params, nextStart, staticInput) {
  const timing = resolveFumeBlockTiming(
      block,
      params.time,
      nextStart,
      staticInput ? staticInput.textHoldRatio : 1,
    ),
    text = [],
    stamps = [],
    groups = Object.create(null);
  const style = (context) => ({
    fill: context.fillStyle,
    blur: context.shadowBlur || 0,
    shadow: context.shadowColor || 'transparent',
    alpha: context.globalAlpha === undefined ? 1 : context.globalAlpha,
  });
  const add = (value) => {
    value.key = block.id + ':' + value.layer + ':' + value.x + ':' + value.y + ':' + value.text;
    const found = groups[value.key];
    if (found && value.ranges) {
      found.ranges.push.apply(found.ranges, value.ranges);
      return;
    }
    value.weight = Number(/^(\d+)/.exec(value.font)[1]);
    value.size = Number(/ ([\d.]+)px/.exec(value.font)[1]);
    // Reserve the complete source envelope for this context, not a 512px
    // halo on every waiting newspaper line. These maxima come from the
    // original line-glow, active body and passed-body formulas. They do not
    // change with reveal progress or camera movement.
    value.maximumShadowBlur =
      value.layer === 'line-glow'
        ? Math.round(
            ((block.variant === 'hero' ? 12 : 8) +
              block.fontPx * (block.variant === 'hero' ? 0.7 : 0.52)) *
              params.glowIntensity,
          )
        : value.layer === 'body'
          ? Math.round(
              Math.max(
                (4 + block.fontPx * 0.22) * params.activeGlowBoost,
                (2 + block.fontPx * 0.1) * params.passedGlowBase,
              ),
            )
          : Math.max(0, value.style.blur || 0);
    value.minimumDeviceScale = params.minimumDeviceScale || 0.22;
    value.maxHaloRadius = haloBudget(value, params.glowIntensity > 0);
    groups[value.key] = value;
    text.push(value);
  };
  if (staticInput) {
    const layers = resolveFumeStaticLayers(block, timing, staticInput, (spec) => spec);
    if (layers) {
      layers.forEach((entry, index) => {
        for (const line of block.renderLines)
          if (line.text.trim())
            add({
              layer: 'static' + index,
              text: line.text,
              x: block.x + line.left,
              y: block.y + line.top + timing.baselineOffset,
              font: buildCanvasFont(block, params.theme),
              style: {
                fill: entry.snapshot.fill,
                blur: entry.snapshot.shadowBlur,
                shadow: entry.snapshot.shadowColor,
                alpha: entry.alpha,
              },
            });
      });
      return { text, stamps, timing };
    }
  }
  const stack = [];
  const context = {
    font: '',
    fillStyle: 'white',
    shadowBlur: 0,
    shadowColor: 'transparent',
    globalAlpha: 1,
    save() {
      stack.push({
        font: this.font,
        fillStyle: this.fillStyle,
        shadowBlur: this.shadowBlur,
        shadowColor: this.shadowColor,
        globalAlpha: this.globalAlpha,
      });
    },
    restore() {
      Object.assign(this, stack.pop());
    },
    fillText(value, x, y) {
      add({ layer: 'line-glow', text: value, x, y, font: this.font, style: style(this) });
    },
    fumeTextRange(line, segment, start, end, x, y) {
      const first = Math.max(0, start - segment.localStart),
        last = Math.min(segment.measuredGlyphOffsets.length - 1, end - segment.localStart);
      const left =
        segment.measuredGlyphOffsets[first] === undefined
          ? resolveRenderLineOffset(line, start) - segment.x
          : segment.measuredGlyphOffsets[first];
      const right =
        segment.measuredGlyphOffsets[last] === undefined
          ? resolveRenderLineOffset(line, end) - segment.x
          : segment.measuredGlyphOffsets[last];
      const width = Math.max(right - left, 0);
      if (width <= 0) return;
      add({
        layer: 'body',
        text: segment.text,
        x: x + segment.x,
        y,
        font: this.font,
        ranges: [
          Object.assign(
            {
              start: first,
              end: last,
              clipRect: {
                x: left,
                y: -Math.max(width, 1) - 64,
                width,
                height: Math.max(128 + width * 2, 256),
              },
            },
            style(this),
          ),
        ],
      });
    },
    fillRect(x, y, width, height) {
      stamps.push(Object.assign({ x, y, width, height }, style(this)));
    },
  };
  drawFumeLiveBlock(context, block, timing, params);
  return { text, stamps, timing };
}
export function styleForCluster(command, utf16Start) {
  if (!command.ranges) return command.style;
  const graphemes = graphemeSegments(command.text);
  let index = 0;
  while (index + 1 < graphemes.length && graphemes[index + 1].index <= utf16Start) ++index;
  return (
    command.ranges.find((range) => index >= range.start && index < range.end) || {
      fill: 'transparent',
      blur: 0,
      shadow: 'transparent',
      alpha: 0,
    }
  );
}
export function haloBudget(command, enabled) {
  if (enabled && Number.isFinite(command.maximumShadowBlur)) {
    const radius = localShadowSigma(command.maximumShadowBlur, command.minimumDeviceScale || 0.22);
    const limit = [0, 40, 80, 160, 512, 1024].find((value) => value + 1e-6 >= radius);
    if (limit === undefined)
      throw new Error('Fume source halo exceeds supported local radius: ' + radius);
    return limit;
  }
  return !enabled ? 0 : command.layer === 'line-glow' ? 512 : command.layer === 'body' ? 512 : 160;
}
export function batches(commands, glowEnabled, maxRuns = 16) {
  const result = [];
  let batch = [],
    units = 0;
  for (const command of commands) {
    if (command.text.length > 8192)
      throw new Error('Fume visible context exceeds native UTF16 budget');
    if (batch.length && (batch.length >= maxRuns || units + command.text.length > 1024)) {
      result.push(batch);
      batch = [];
      units = 0;
    }
    const radius = haloBudget(command, glowEnabled);
    batch.push(radius === command.maxHaloRadius ? command : { ...command, maxHaloRadius: radius });
    units += command.text.length;
  }
  if (batch.length) result.push(batch);
  if (result.length > 32)
    throw new Error('Fume visible glyph budget exceeded (32 groups / 16 contexts per group)');
  return result;
}

// Folia glowBlurQuantize.ts:62/75: Canvas shadowBlur is twice Gaussian sigma, in device pixels.
export function localShadowSigma(rawBlur, deviceScale) {
  return rawBlur / (2 * Math.max(deviceScale, 1e-6));
}
