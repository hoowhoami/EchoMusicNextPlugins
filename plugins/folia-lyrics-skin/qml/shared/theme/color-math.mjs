// EchoMusic folia-style 7506e1f3 · AGPL-3.0-only
var FALLBACK_THEME_COLOR = '#4f7cff';

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}
function clampChannel(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}
function normalizeHue(hue) {
  return ((hue % 360) + 360) % 360;
}

function parseThemeColor(value) {
  if (typeof value !== 'string') return null;
  var hex = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.exec(value.trim());
  var channels = null;
  if (hex) {
    var body = hex[1];
    if (body.length === 3) {
      channels = {
        r: Number.parseInt(body[0] + body[0], 16),
        g: Number.parseInt(body[1] + body[1], 16),
        b: Number.parseInt(body[2] + body[2], 16),
      };
    } else {
      channels = {
        r: Number.parseInt(body.slice(0, 2), 16),
        g: Number.parseInt(body.slice(2, 4), 16),
        b: Number.parseInt(body.slice(4, 6), 16),
      };
    }
  } else {
    var rgb = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/.exec(value.trim());
    if (rgb)
      channels = {
        r: Number.parseFloat(rgb[1]),
        g: Number.parseFloat(rgb[2]),
        b: Number.parseFloat(rgb[3]),
      };
  }
  if (!channels) return null;
  return { r: clampChannel(channels.r), g: clampChannel(channels.g), b: clampChannel(channels.b) };
}

function rgbToHex(rgb) {
  return (
    '#' +
    [rgb.r, rgb.g, rgb.b]
      .map(function (channel) {
        return ('0' + clampChannel(channel).toString(16)).slice(-2);
      })
      .join('')
  );
}

function rgbToHsl(rgb) {
  var red = clampChannel(rgb.r) / 255;
  var green = clampChannel(rgb.g) / 255;
  var blue = clampChannel(rgb.b) / 255;
  var max = Math.max(red, green, blue);
  var min = Math.min(red, green, blue);
  var delta = max - min;
  var lightness = (max + min) / 2;
  if (delta === 0) return { h: 0, s: 0, l: lightness };
  var saturation = delta / (1 - Math.abs(2 * lightness - 1));
  var hue;
  if (max === red) hue = ((green - blue) / delta) % 6;
  else if (max === green) hue = (blue - red) / delta + 2;
  else hue = (red - green) / delta + 4;
  return { h: normalizeHue(hue * 60), s: clamp01(saturation), l: clamp01(lightness) };
}

function hslToRgb(hsl) {
  var hue = normalizeHue(hsl.h);
  var saturation = clamp01(hsl.s);
  var lightness = clamp01(hsl.l);
  var chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  var secondary = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  var offset = lightness - chroma / 2;
  var sector = Math.floor(hue / 60) % 6;
  var r = 0,
    g = 0,
    b = 0;
  if (sector === 0) {
    r = chroma;
    g = secondary;
  } else if (sector === 1) {
    r = secondary;
    g = chroma;
  } else if (sector === 2) {
    g = chroma;
    b = secondary;
  } else if (sector === 3) {
    g = secondary;
    b = chroma;
  } else if (sector === 4) {
    r = secondary;
    b = chroma;
  } else {
    r = chroma;
    b = secondary;
  }
  return {
    r: clampChannel((r + offset) * 255),
    g: clampChannel((g + offset) * 255),
    b: clampChannel((b + offset) * 255),
  };
}

function hexToHsl(color) {
  var parsed = parseThemeColor(color);
  return parsed ? rgbToHsl(parsed) : null;
}

function hslToHex(hsl) {
  return rgbToHex(hslToRgb(hsl));
}

/** 十六进制空间里的线性混色（amount 0..1）。 */
function mixHexColors(from, to, amount) {
  var start = parseThemeColor(from);
  var end = parseThemeColor(to);
  if (!start || !end) {
    return rgbToHex(
      parseThemeColor(to) || parseThemeColor(from) || parseThemeColor(FALLBACK_THEME_COLOR),
    );
  }
  var ratio = clamp01(amount);
  return rgbToHex({
    r: start.r + (end.r - start.r) * ratio,
    g: start.g + (end.g - start.g) * ratio,
    b: start.b + (end.b - start.b) * ratio,
  });
}

/** WCAG 相对亮度。 */
function getRelativeLuminance(color) {
  var parsed = parseThemeColor(color);
  if (!parsed) return 0;
  var transform = function (channel) {
    var c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * transform(parsed.r) + 0.7152 * transform(parsed.g) + 0.0722 * transform(parsed.b);
}

function getContrastRatio(foreground, background) {
  var l1 = getRelativeLuminance(foreground);
  var l2 = getRelativeLuminance(background);
  var lighter = Math.max(l1, l2);
  var darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function getHueDistance(a, b) {
  var distance = Math.abs(normalizeHue(a) - normalizeHue(b));
  return Math.min(distance, 360 - distance);
}

/**
 * 沿亮度轴远离背景色走，直到达到对比度下限为止（色相饱和度不变）；
 * 下限到不了时返回对比度最好的候选。
 */
function adjustLightnessForContrast(color, background, minRatio, step, maxSteps) {
  var hsl = hexToHsl(color);
  if (!hsl) return color;
  var increment = typeof step === 'number' ? step : 0.02;
  var limit = typeof maxSteps === 'number' ? maxSteps : 50;
  var goDarker = getRelativeLuminance(background) > 0.35;
  var direction = goDarker ? -1 : 1;
  var bestColor = hslToHex(hsl);
  var bestRatio = getContrastRatio(bestColor, background);
  for (var index = 0; index <= limit; index += 1) {
    var lightness = clamp01(hsl.l + direction * increment * index);
    var candidate = hslToHex({ h: hsl.h, s: hsl.s, l: lightness });
    var ratio = getContrastRatio(candidate, background);
    if (ratio > bestRatio) {
      bestRatio = ratio;
      bestColor = candidate;
    }
    if (ratio >= minRatio) return candidate;
    // 已经走到亮度轴端点：再走也帮不上忙。
    if (index > 0 && (lightness === 0 || lightness === 1)) break;
  }
  return bestColor;
}

export {
  clamp01,
  normalizeHue,
  parseThemeColor,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  hexToHsl,
  hslToHex,
  mixHexColors,
  getRelativeLuminance,
  getContrastRatio,
  getHueDistance,
  adjustLightnessForContrast,
};
