// Browser-independent byte decoder for Folia's generated jieba tables.
// AGPL-3.0-only. The build input is trusted generated ASCII base64.
export function decodeBase64(value) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const length = value.length;
  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0;
  const result = new Uint8Array((length / 4) * 3 - padding);
  let cursor = 0;
  for (let index = 0; index < length; index += 4) {
    const a = alphabet.indexOf(value[index]);
    const b = alphabet.indexOf(value[index + 1]);
    const c = value[index + 2] === '=' ? 0 : alphabet.indexOf(value[index + 2]);
    const d = value[index + 3] === '=' ? 0 : alphabet.indexOf(value[index + 3]);
    if (a < 0 || b < 0 || c < 0 || d < 0) throw new Error('Invalid jieba base64 data');
    const bits = a * 262144 + b * 4096 + c * 64 + d;
    if (cursor < result.length) result[cursor++] = bits >>> 16;
    if (cursor < result.length) result[cursor++] = (bits >>> 8) & 255;
    if (cursor < result.length) result[cursor++] = bits & 255;
  }
  return result;
}
