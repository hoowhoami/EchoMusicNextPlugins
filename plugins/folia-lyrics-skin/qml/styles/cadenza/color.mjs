// Generated from Folia a8da4437 (AGPL-3.0-only).
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const mix = (from, to, amount) => from + (to - from) * amount;
const FALLBACK_RGB = { r: 255, g: 255, b: 255 };
const isFiniteChannel = (value) => Number.isFinite(value);
const formatRgba = (channels, alpha) =>
  `rgba(${Math.round(clamp(channels.r, 0, 255))}, ${Math.round(clamp(channels.g, 0, 255))}, ${Math.round(clamp(channels.b, 0, 255))}, ${alpha})`;
const readColor = (normalizedColor) => {
  if (!normalizedColor) return 'fallback';
  if (normalizedColor.startsWith('#')) {
    const hex = normalizedColor.slice(1);
    const parse = (value) => Number.parseInt(value, 16);
    if (/^[0-9a-fA-F]{3}$/.test(hex)) {
      return {
        r: parse(hex[0] + hex[0]),
        g: parse(hex[1] + hex[1]),
        b: parse(hex[2] + hex[2]),
      };
    }
    if (/^[0-9a-fA-F]{6}$/.test(hex)) {
      return {
        r: parse(hex.slice(0, 2)),
        g: parse(hex.slice(2, 4)),
        b: parse(hex.slice(4, 6)),
      };
    }
    return 'fallback';
  }
  const rgbMatch = normalizedColor.match(/^rgba?\(([^)]+)\)$/);
  if (rgbMatch) {
    const [r, g, b] = rgbMatch[1]
      .split(',')
      .slice(0, 3)
      .map((part) => Number.parseFloat(part.trim()));
    if ([r, g, b].every(isFiniteChannel)) {
      return { r, g, b };
    }
    return 'fallback';
  }
  return 'passthrough';
};
const parsedColors = Object.create(null),
  parsedColorKeys = [];
const PARSED_COLOR_LIMIT = 512;
const parseColor = (color) => {
  const normalized = typeof color === 'string' ? color.trim() : '';
  let parsed = parsedColors[normalized];
  if (parsed === void 0) {
    parsed = readColor(normalized);
    parsedColors[normalized] = parsed;
    parsedColorKeys.push(normalized);
    if (parsedColorKeys.length > PARSED_COLOR_LIMIT) delete parsedColors[parsedColorKeys.shift()];
  }
  return { normalized, parsed };
};
const colorWithAlpha = (color, alpha) => {
  const normalizedAlpha = clamp(alpha, 0, 1);
  const { normalized, parsed } = parseColor(color);
  if (parsed === 'passthrough') return normalized;
  return formatRgba(parsed === 'fallback' ? FALLBACK_RGB : parsed, normalizedAlpha);
};
const parseColorChannels = (color) => {
  const { parsed } = parseColor(color);
  return typeof parsed === 'string' ? null : { r: parsed.r, g: parsed.g, b: parsed.b };
};
const mixColors = (from, to, amount, alpha = 1) => {
  const normalizedAmount = clamp(amount, 0, 1);
  const fromParsed = parseColor(from).parsed;
  const toParsed = parseColor(to).parsed;
  if (typeof fromParsed === 'string' || typeof toParsed === 'string') {
    return colorWithAlpha(normalizedAmount >= 0.5 ? to : from, alpha);
  }
  return `rgba(${Math.round(mix(fromParsed.r, toParsed.r, normalizedAmount))}, ${Math.round(mix(fromParsed.g, toParsed.g, normalizedAmount))}, ${Math.round(mix(fromParsed.b, toParsed.b, normalizedAmount))}, ${clamp(alpha, 0, 1)})`;
};
export { colorWithAlpha, mixColors, parseColorChannels };
