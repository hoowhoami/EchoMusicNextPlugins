import { packBytes } from '../../shared/binary.mjs';
export function encodeNebbiaFrame(frame) {
  const buffers = {};
  frame.events = frame.events.filter((event) => event.type !== 'buffer');
  for (const event of frame.events)
    if (event.type === 'texture' && event.data) {
      if (event.format !== 'rgba8') throw Error('Unexpected original Nebbia CPU float image');
      event.packedBytes = packBytes(new Uint8Array(event.data).buffer);
      event.data = null;
    }
  let draw = 0;
  for (const command of frame.commands) {
    if (command.type !== 'draw') continue;
    for (const location of Object.keys(command.attributes)) {
      const attribute = command.attributes[location],
        key = draw + ':' + attribute.buffer;
      if (!Object.prototype.hasOwnProperty.call(buffers, key))
        buffers[key] = packBytes(
          (attribute.data instanceof Float32Array
            ? attribute.data
            : new Float32Array(attribute.data || [])
          ).buffer,
        );
      attribute.dataKey = key;
      attribute.data = null;
    }
    ++draw;
  }
  frame.buffers = buffers;
  return frame;
}
