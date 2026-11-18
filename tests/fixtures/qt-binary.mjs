// Node-only adapter for Qt's binary btoa/atob built-ins. Actual WorkerScript
// transfer and Qt conversion are checked separately by the native QA probes.
globalThis.Qt = {
  btoa: (buffer) => Buffer.from(buffer).toString('base64'),
  atob: (buffer) => {
    const bytes = Buffer.from(Buffer.from(buffer).toString('ascii'), 'base64');
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  },
};
