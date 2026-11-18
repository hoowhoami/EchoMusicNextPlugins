// Worker-local event adapter for the original OrbitControls. QML owns native input.
function eventTarget() {
  const listeners = new Map();
  return {
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(listener);
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener);
    },
    dispatch(event) {
      for (const listener of [...(listeners.get(event.type) || [])]) listener(event);
    },
  };
}
export function createInputSurface(width, height, pixelRatio) {
  const ownerDocument = eventTarget(),
    target = eventTarget();
  Object.assign(target, {
    ownerDocument,
    style: {},
    clientWidth: width,
    clientHeight: height,
    width: Math.round(width * pixelRatio),
    height: Math.round(height * pixelRatio),
    getRootNode: () => ownerDocument,
    getBoundingClientRect: () => ({
      left: 0,
      top: 0,
      width: target.clientWidth,
      height: target.clientHeight,
    }),
    setAttribute() {},
    removeAttribute() {},
    setPointerCapture() {},
    releasePointerCapture() {},
    remove() {},
    dispatchNative(value) {
      const event = Object.assign(
        {
          pointerId: 1,
          pointerType: 'mouse',
          button: 0,
          ctrlKey: false,
          metaKey: false,
          shiftKey: false,
          deltaMode: 0,
          preventDefault() {},
          stopPropagation() {},
        },
        value,
      );
      event.pageX = event.clientX;
      event.pageY = event.clientY;
      (event.type === 'pointermove' || event.type === 'pointerup'
        ? ownerDocument
        : target
      ).dispatch(event);
    },
  });
  return target;
}
