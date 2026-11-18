// Canvas filter blur: one-time separable Gaussian over premultiplied channels.
export function blur(values, width, height, sigma) {
  if (!sigma) return values;
  if (!Number.isFinite(sigma) || sigma < 0 || sigma > 16)
    throw Error('Native preparation blur is out of range');
  const radius = Math.ceil(sigma * 3),
    weights = [];
  let sum = 0;
  for (let i = -radius; i <= radius; ++i) {
    const value = Math.exp((-0.5 * i * i) / (sigma * sigma));
    weights.push(value);
    sum += value;
  }
  for (let i = 0; i < weights.length; ++i) weights[i] /= sum;
  const input = new Float32Array(values.length),
    temp = new Float32Array(values.length),
    output = new Array(values.length);
  for (let i = 0; i < values.length; i += 4) {
    const a = values[i + 3] / 255;
    for (let c = 0; c < 3; ++c) input[i + c] = values[i + c] * a;
    input[i + 3] = values[i + 3];
  }
  for (let y = 0; y < height; ++y)
    for (let x = 0; x < width; ++x)
      for (let c = 0; c < 4; ++c) {
        let value = 0;
        for (let d = -radius; d <= radius; ++d)
          if (x + d >= 0 && x + d < width)
            value += input[(y * width + x + d) * 4 + c] * weights[d + radius];
        temp[(y * width + x) * 4 + c] = value;
      }
  for (let y = 0; y < height; ++y)
    for (let x = 0; x < width; ++x) {
      const pixel = [0, 0, 0, 0];
      for (let c = 0; c < 4; ++c)
        for (let d = -radius; d <= radius; ++d)
          if (y + d >= 0 && y + d < height)
            pixel[c] += temp[((y + d) * width + x) * 4 + c] * weights[d + radius];
      const offset = (y * width + x) * 4;
      for (let c = 0; c < 3; ++c)
        output[offset + c] = pixel[3] ? Math.round((pixel[c] * 255) / pixel[3]) : 0;
      output[offset + 3] = Math.round(pixel[3]);
    }
  return output;
}
