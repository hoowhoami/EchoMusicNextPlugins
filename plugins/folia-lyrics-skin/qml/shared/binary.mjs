// Qt's native binary codec keeps arbitrary bytes out of WorkerScript's numeric
// arrays. The ASCII envelope survives JSON and cross-engine string transport.
const maximumBytes = 16 * 1024 * 1024;
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
export function packBytes(buffer) {
  const length = buffer.byteLength;
  if (!Number.isInteger(length) || length < 0 || length > maximumBytes)
    throw Error('Native binary packet exceeds 16MiB');
  return String(length) + ':' + String(Qt.btoa(buffer));
}
export function unpackBytes(packed) {
  if (typeof packed !== 'string' || packed.length > Math.ceil(maximumBytes / 3) * 4 + 10)
    throw Error('Invalid native binary packet');
  const separator = packed.indexOf(':');
  if (separator < 1 || separator > 8) throw Error('Invalid native binary length');
  const length = Number(packed.slice(0, separator));
  if (
    !Number.isInteger(length) ||
    length < 0 ||
    length > maximumBytes ||
    String(length) !== packed.slice(0, separator)
  )
    throw Error('Invalid native binary length');
  const body = packed.slice(separator + 1),
    padding = (3 - (length % 3)) % 3,
    end = body.length - padding;
  if (
    body.length !== Math.ceil(length / 3) * 4 ||
    body.slice(end) !== '='.repeat(padding) ||
    /[^A-Za-z0-9+/]/.test(body.slice(0, end))
  )
    throw Error('Invalid native binary padding');
  const last = end ? alphabet.indexOf(body[end - 1]) : 0;
  if ((padding === 1 && last & 3) || (padding === 2 && last & 15))
    throw Error('Invalid native binary padding');
  const ascii = new Uint8Array(body.length);
  for (let i = 0; i < ascii.length; ++i) ascii[i] = body.charCodeAt(i);
  const buffer = Qt.atob(ascii.buffer);
  if (buffer.byteLength !== length) throw Error('Invalid native binary length');
  return buffer;
}
