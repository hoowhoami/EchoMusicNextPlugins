// Folia a8da4437 classic/Visualizer.tsx:46-59,133-268, wordColoring.ts:189-234.
// AGPL-3.0-only. Geometry depends on native text advances, never code-unit estimates.
export function resolveClassicSettings(settings) {
  const value = settings || {};
  const bounded = (input, fallback) =>
    Number.isFinite(input) ? Math.min(2, Math.max(0, input)) : fallback;
  return {
    animationIntensity: ['calm', 'normal', 'chaotic'].includes(value.animationIntensity)
      ? value.animationIntensity
      : 'normal',
    lyricsFontScale:
      Number.isFinite(value.lyricsFontScale) && value.lyricsFontScale > 0
        ? value.lyricsFontScale
        : 1,
    enableWordRotation:
      value.classicEnableWordRotation === undefined ? true : value.classicEnableWordRotation,
    breathingFloatMultiplier: bounded(value.classicBreathingFloatMultiplier, 1),
    useLegacyLayout:
      value.classicUseLegacyLayout === undefined ? false : value.classicUseLegacyLayout,
    wordSpacing: bounded(value.classicWordSpacing, 0.7),
  };
}
export function classicFontSize(width, scale) {
  return Math.max(36 * scale, Math.min(72 * scale, 0.06 * scale * width));
}
export function classicRenderFontSize(width, scale) {
  return Math.max(
    Number((2.25 * scale).toFixed(3)) * 16,
    Math.min(Number((4.5 * scale).toFixed(3)) * 16, (Number((6 * scale).toFixed(3)) * width) / 100)
  );
}
export function seededRandom(seed, offset) {
  const x = Math.sin(seed + offset) * 10000;
  return x - Math.floor(x);
}
export function buildWordConfigs(line, words, widths, viewportWidth, settings) {
  const tuning = resolveClassicSettings(settings);
  const seed = line.startTime;
  const chaotic = tuning.animationIntensity === 'chaotic';
  const calm = tuning.animationIntensity === 'calm';
  const interlude = line.fullText === '......';
  const justifyOptions = calm
    ? ['justify-center']
    : ['justify-start', 'justify-center', 'justify-end', 'justify-around', 'justify-between'];
  const alignOptions = calm ? ['items-center'] : ['items-start', 'items-center', 'items-end'];
  const lineConfig = {
    justifyContent: interlude
      ? 'justify-center'
      : justifyOptions[Math.floor(seed % justifyOptions.length)],
    alignItems: alignOptions[Math.floor((seed * 2) % alignOptions.length)],
    perspective: chaotic ? 500 + (seed % 500) : 1000,
  };
  const pxSize = classicFontSize(viewportWidth, tuning.lyricsFontScale);
  const spread = chaotic ? 60 : calm ? 0 : 20;
  const rotation = chaotic ? 30 : calm ? 0 : 5;
  const wordConfigs = words.map((word, index) => {
    const random = (offset) => seededRandom(seed + index, offset);
    const id = `${word.text}-${index}-${seed}`;
    if (interlude)
      return {
        id,
        x: 0,
        y: (random(2) - 0.5) * 15,
        rotate: 0,
        scale: 1.5,
        marginRight: 48,
        alignSelf: 'center',
        passedRotate: 0,
      };
    const scale = chaotic ? 0.8 + random(4) * 0.6 : 1.1 + random(4) * 0.2;
    const x = (random(1) - 0.5) * spread * 2;
    const y = (random(2) - 0.5) * spread * 2;
    let marginRight = chaotic ? random(5) * 24 : 12.8;
    if (!tuning.useLegacyLayout) {
      let nextWidth = 0;
      let nextScale = 1;
      let nextX = 0;
      if (index + 1 < words.length) {
        const nextRandom = (offset) => seededRandom(seed + index + 1, offset);
        nextScale = (chaotic ? 0.8 + nextRandom(4) * 0.6 : 1.1 + nextRandom(4) * 0.2) * 1.4;
        nextX = (nextRandom(1) - 0.5) * spread * 2;
        nextWidth = widths[index + 1] || 0;
      }
      const currentOverflow = ((widths[index] || 0) * (scale * 1.4 - 1)) / 2;
      const nextOverflow = (nextWidth * (nextScale - 1)) / 2;
      const calculated =
        (currentOverflow + nextOverflow + x - nextX + 0.05 * pxSize) * tuning.wordSpacing;
      const minimum = (chaotic ? 0.08 : 0.12) * pxSize * tuning.wordSpacing;
      marginRight = Number(Math.max(minimum, calculated).toFixed(1));
    }
    return {
      id,
      x,
      y,
      scale,
      marginRight,
      rotate: tuning.enableWordRotation ? (random(3) - 0.5) * rotation * 2 : 0,
      alignSelf:
        chaotic && random(6) > 0.7 ? (random(7) > 0.5 ? 'flex-start' : 'flex-end') : 'auto',
      passedRotate: tuning.enableWordRotation ? (random(8) - 0.5) * 45 : 0,
    };
  });
  return { lineConfig, wordConfigs };
}
// CSS flex-wrap with margin-right participating in each item's outer advance.
export function layoutRows(metrics, configs, lineConfig, width, fontSize) {
  const rows = [];
  let row = { indices: [], width: 0 };
  metrics.forEach((metric, index) => {
    const outer = metric.width + configs[index].marginRight;
    if (row.indices.length && row.width + outer > width) {
      rows.push(row);
      row = { indices: [], width: 0 };
    }
    row.indices.push(index);
    row.width += outer;
  });
  if (row.indices.length) rows.push(row);
  const lineHeight = 1.22 * fontSize;
  const height = Math.max(300, rows.length * lineHeight);
  const words = new Array(metrics.length);
  rows.forEach((current, rowIndex) => {
    const free = width - current.width;
    let gap = 0;
    let x = 0;
    if (lineConfig.justifyContent === 'justify-center') x = free / 2;
    else if (lineConfig.justifyContent === 'justify-end') x = free;
    else if (lineConfig.justifyContent === 'justify-around' && free > 0) {
      gap = free / current.indices.length;
      x = gap / 2;
    } else if (
      lineConfig.justifyContent === 'justify-between' &&
      current.indices.length > 1 &&
      free > 0
    )
      gap = free / (current.indices.length - 1);
    current.indices.forEach((index) => {
      words[index] = {
        x,
        y:
          (height - rows.length * lineHeight) / 2 +
          rowIndex * lineHeight +
          (lineHeight - metrics[index].height) / 2,
        row: rowIndex,
      };
      x += metrics[index].width + configs[index].marginRight + gap;
    });
  });
  return { rows, words, width, height, lineHeight };
}
export function resolveWordColor(wordText, colors, fallback) {
  const current = wordText.trim();
  if (!current || !Array.isArray(colors)) return fallback;
  const cjk = /[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/.test(current);
  const normalize = (text) => text.toLowerCase().replace(/[^\w]/g, '');
  for (const entry of colors) {
    const target = entry && typeof entry.word === 'string' ? entry.word.trim() : '';
    if (!target) continue;
    const matched = cjk
      ? target.includes(current)
      : !!normalize(current) &&
        target.split(/\s+/).map(normalize).filter(Boolean).includes(normalize(current));
    if (matched) return typeof entry.color === 'string' && entry.color ? entry.color : fallback;
  }
  return fallback;
}
