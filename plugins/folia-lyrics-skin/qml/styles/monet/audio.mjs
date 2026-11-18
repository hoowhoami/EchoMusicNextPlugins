// Derived from Folia a8da4437 (AGPL-3.0-only). See monet-reference.md.
import { colorWithAlpha } from '../cadenza/color.mjs';
const BAR_COUNT = 72;
const MIN_RAW_SPECTRUM_BIN = 6;
const buildSpectrumAnchors = (bands) => {
  const [bass, lowMid, mid, vocal, treble] = bands;
  return [
    bass * 1.08,
    bass * 0.96,
    bass * 0.74 + lowMid * 0.26,
    lowMid,
    lowMid * 0.58 + mid * 0.42,
    mid,
    mid * 0.42 + vocal * 0.58,
    vocal,
    vocal * 0.48 + treble * 0.52,
    treble,
    treble * 0.82,
  ].map((value) => Math.max(0, Math.min(1, value)));
};
const sampleSpectrumProfile = (bands, normalizedIndex) => {
  var _a, _b;
  const clampedIndex = Math.max(0, Math.min(1, normalizedIndex));
  const anchors = buildSpectrumAnchors(bands);
  const logIndex = Math.log10(1 + clampedIndex * 9);
  const scaledIndex = logIndex * (anchors.length - 1);
  const lowerIndex = Math.floor(scaledIndex);
  const upperIndex = Math.min(lowerIndex + 1, anchors.length - 1);
  const interpolation = scaledIndex - lowerIndex;
  const lowerValue = (_a = anchors[lowerIndex]) != null ? _a : 0;
  const upperValue = (_b = anchors[upperIndex]) != null ? _b : lowerValue;
  const interpolated = lowerValue + (upperValue - lowerValue) * interpolation;
  const contour =
    0.92 +
    Math.sin(clampedIndex * Math.PI * 3.4 - Math.PI * 0.3) * 0.08 +
    Math.sin(clampedIndex * Math.PI * 9.2 + Math.PI * 0.2) * 0.035;
  return Math.max(0, Math.min(1, interpolated * contour));
};
const sampleRawSpectrumProfile = (rawSpectrum, normalizedIndex) => {
  if (rawSpectrum.length <= MIN_RAW_SPECTRUM_BIN) {
    return 0;
  }
  const clampedIndex = Math.max(0, Math.min(1, normalizedIndex));
  const usableBinCount = Math.max(1, rawSpectrum.length - MIN_RAW_SPECTRUM_BIN);
  const mappedIndex = Math.expm1(clampedIndex * Math.log(usableBinCount + 1));
  const centerIndex = MIN_RAW_SPECTRUM_BIN + mappedIndex;
  const edgeSoftness = 1 - Math.abs(clampedIndex - 0.5) * 2;
  const windowRadius = Math.max(1, Math.round(5 - edgeSoftness * 3));
  const start = Math.max(MIN_RAW_SPECTRUM_BIN, Math.floor(centerIndex - windowRadius));
  const end = Math.min(rawSpectrum.length - 1, Math.ceil(centerIndex + windowRadius));
  let weightedSum = 0;
  let weightTotal = 0;
  for (let index = start; index <= end; index += 1) {
    const distance = Math.abs(index - centerIndex);
    const weight = Math.max(0.1, 1 - distance / (windowRadius + 1));
    weightedSum += rawSpectrum[index] * weight;
    weightTotal += weight;
  }
  const averaged = weightTotal > 0 ? weightedSum / weightTotal : 0;
  const noiseFloor = 16 + (1 - clampedIndex) * 12;
  const normalized = Math.max(0, Math.min(1, (averaged - noiseFloor) / (255 - noiseFloor)));
  const power = 1.8 + (1 - clampedIndex) * 0.4;
  const processed = Math.pow(normalized, power);
  const lowFrequencyCompensation = 0.52 + clampedIndex * 0.62;
  const presenceLift = 0.92 + Math.sqrt(clampedIndex) * 0.14;
  return Math.max(0, Math.min(1, processed * lowFrequencyCompensation * presenceLift));
};
const drawStaticBars = (context, width, height, theme, mode) => {
  context.clearRect(0, 0, width, height);
  context.strokeStyle = colorWithAlpha(theme.primaryColor, 0.96);
  context.fillStyle = colorWithAlpha(theme.primaryColor, 0.9);
  context.lineWidth = 1.5;
  context.lineCap = 'round';
  if (mode === 'line') {
    const points = [];
    for (let index = 0; index < BAR_COUNT; index += 1) {
      const x = (index / (BAR_COUNT - 1)) * width;
      const spectrumIndex = index / (BAR_COUNT - 1);
      const envelope = Math.sin(spectrumIndex * Math.PI);
      const val = 0.12 + (Math.sin(index * 0.35) * 0.5 + 0.5) * 0.42;
      const y = height - height * val * envelope;
      points.push({ x, y });
    }
    const drawCurve = (ctx) => {
      if (points.length === 0) return;
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 0; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    };
    context.beginPath();
    drawCurve(context);
    context.lineTo(width, height);
    context.lineTo(0, height);
    context.closePath();
    const fillGradient = context.createLinearGradient(0, 0, 0, height);
    fillGradient.addColorStop(0, colorWithAlpha(theme.primaryColor, 0.24));
    fillGradient.addColorStop(1, colorWithAlpha(theme.primaryColor, 0));
    context.fillStyle = fillGradient;
    context.fill();
    context.beginPath();
    drawCurve(context);
    context.strokeStyle = colorWithAlpha(theme.primaryColor, 0.96);
    context.lineWidth = 2;
    context.stroke();
    return;
  }
  const gap = width / BAR_COUNT;
  for (let index = 0; index < BAR_COUNT; index += 1) {
    const spectrumIndex = index / (BAR_COUNT - 1);
    const envelope = Math.sin(spectrumIndex * Math.PI);
    const val = 0.12 + (Math.sin(index * 0.35) * 0.5 + 0.5) * 0.42;
    const barHeight = height * (0.02 + val * 0.8 * envelope);
    const x = index * gap + gap * 0.14;
    context.fillRect(x, height - barHeight, Math.max(1.35, gap * 0.34), barHeight);
  }
};
function drawAudioFrame(context, width, height, theme, mode, audioPower, bands, rawSpectrum, now) {
  let gradientSize = '',
    inkGradient = null,
    areaGradient = null;
  const resolveGradients = (width2, height2) => {
    const size = `${width2}x${height2}`;
    if (size !== gradientSize || !inkGradient || !areaGradient) {
      gradientSize = size;
      const primaryInk = colorWithAlpha(theme.primaryColor, 0.94);
      const softInk = colorWithAlpha(theme.primaryColor, 0.72);
      inkGradient = context.createLinearGradient(0, 0, width2, 0);
      inkGradient.addColorStop(0, softInk);
      inkGradient.addColorStop(0.5, primaryInk);
      inkGradient.addColorStop(1, softInk);
      areaGradient = context.createLinearGradient(0, 0, 0, height2);
      areaGradient.addColorStop(0, colorWithAlpha(theme.primaryColor, 0.24));
      areaGradient.addColorStop(1, colorWithAlpha(theme.primaryColor, 0));
    }
    return { gradient: inkGradient, fillGradient: areaGradient };
  };
  if (width <= 0 || height <= 0) {
    return;
  }
  context.clearRect(0, 0, width, height);
  const hasRawSpectrum = rawSpectrum.length > MIN_RAW_SPECTRUM_BIN;
  const energy = Math.min(1, Math.max(0.08, audioPower));
  const { gradient, fillGradient } = resolveGradients(width, height);
  context.fillStyle = gradient;
  context.strokeStyle = gradient;
  context.lineWidth = 1.5;
  context.lineCap = 'round';
  if (mode === 'line') {
    const points = [];
    for (let index = 0; index < BAR_COUNT; index += 1) {
      const x = (index / (BAR_COUNT - 1)) * width;
      const spectrumIndex = index / (BAR_COUNT - 1);
      const band = hasRawSpectrum
        ? sampleRawSpectrumProfile(rawSpectrum, spectrumIndex)
        : sampleSpectrumProfile(bands, spectrumIndex);
      const wave =
        Math.sin(index * 0.24 + now * 4e-3) * 0.08 + Math.sin(index * 0.68 + now * 28e-4) * 0.05;
      const envelope = Math.sin(spectrumIndex * Math.PI);
      const amplitude = energy * 0.04 + band * 0.8 + wave * 0.04;
      const y = height - Math.max(0, height * amplitude * envelope);
      points.push({ x, y });
    }
    const drawCurve = (ctx) => {
      if (points.length === 0) return;
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 0; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    };
    context.beginPath();
    drawCurve(context);
    context.lineTo(width, height);
    context.lineTo(0, height);
    context.closePath();
    context.fillStyle = fillGradient;
    context.fill();
    context.beginPath();
    drawCurve(context);
    context.strokeStyle = gradient;
    context.lineWidth = 2;
    context.stroke();
  } else {
    const gap = width / BAR_COUNT;
    for (let index = 0; index < BAR_COUNT; index += 1) {
      const spectrumIndex = index / (BAR_COUNT - 1);
      const band = hasRawSpectrum
        ? sampleRawSpectrumProfile(rawSpectrum, spectrumIndex)
        : sampleSpectrumProfile(bands, spectrumIndex);
      const pulse = Math.sin(index * 0.45 + now * 6e-3) * 0.5 + 0.5;
      const envelope = Math.sin(spectrumIndex * Math.PI);
      const barHeight = height * (0.02 + (energy * 0.04 + band * 0.82 + pulse * 0.02) * envelope);
      const x = index * gap + gap * 0.14;
      context.fillRect(x, height - barHeight, Math.max(1.35, gap * 0.34), barHeight);
    }
  }
}
export {
  buildSpectrumAnchors,
  drawAudioFrame,
  drawStaticBars,
  sampleRawSpectrumProfile,
  sampleSpectrumProfile,
};
