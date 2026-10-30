// Adapt the existing native audio.spectrum linear bins; no second FFT or beat inference.
export function resolveSpectrumBins(frame) {
  if (!frame || frame.state !== 'playing' || frame.source !== 'player') return [];
  const bins = frame.bins;
  if (!bins || bins.length < 8 || bins.length > 512) return [];
  for (let i = 0; i < bins.length; i++)
    if (!Number.isFinite(bins[i]) || bins[i] < 0 || bins[i] > 1) return [];
  return bins;
}
export function resolveAudioBands(frame) {
  const zero = { bass: 0, lowMid: 0, mid: 0, vocal: 0, treble: 0, audioPower: 0 };
  const data = resolveSpectrumBins(frame);
  if (!data.length) return zero;
  const min = Number.isFinite(frame.minFrequency) ? frame.minFrequency : 20;
  const max = Number.isFinite(frame.maxFrequency) ? frame.maxFrequency : 12000;
  if (min < 0 || max <= min) return zero;
  const width = (max - min) / data.length;
  function energy(lo, hi) {
    let sum = 0,
      weight = 0;
    for (let i = 0; i < data.length; i++) {
      const overlap = Math.max(
        0,
        Math.min(hi, min + (i + 1) * width) - Math.max(lo, min + i * width)
      );
      sum += data[i] * overlap;
      weight += overlap;
    }
    return weight > 0 ? sum / weight : 0;
  }
  const bass = energy(20, 150),
    lowMid = energy(150, 400);
  return {
    bass: Math.pow(bass, 1.8),
    lowMid: Math.pow(lowMid, 2),
    mid: Math.pow(energy(400, 1200), 2),
    vocal: Math.pow(energy(1000, 3500), 1.5),
    treble: Math.pow(energy(3500, 12000), 2),
    audioPower: Math.pow((bass + lowMid) / 2, 3),
  };
}
