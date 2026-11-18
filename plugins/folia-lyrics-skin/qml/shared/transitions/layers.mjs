var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value })
    : (obj[key] = value);
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {})) if (__hasOwnProp.call(b, prop)) __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop)) __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
const started = (layers) =>
  layers.map((layer) => __spreadProps(__spreadValues({}, layer), { waits: false }));
const nextShownLayers = (layers, value, animate, waits) => {
  const top = layers[layers.length - 1];
  const below = top.leaving && layers.length > 1 ? layers.slice(0, -1) : layers;
  const current = below[below.length - 1];
  if (current.value === value) {
    if (!animate)
      return layers.length === 1 && !current.waits
        ? layers
        : [__spreadProps(__spreadValues({}, current), { waits: false })];
    return current.waits && !waits ? started(layers) : layers;
  }
  const next = {
    key: top.key + 1,
    value,
    leaving: false,
    comesIn: animate,
    waits: animate && waits,
  };
  if (!animate) return [next];
  const onScreen = below.length > 1 ? below[below.length - 2] : null;
  if (!current.waits) {
    if ((onScreen == null ? void 0 : onScreen.value) === value)
      return [
        __spreadProps(__spreadValues({}, onScreen), { leaving: false, waits: false }),
        __spreadProps(__spreadValues({}, current), { leaving: true, waits: false }),
      ];
    return [__spreadProps(__spreadValues({}, current), { leaving: true, waits: next.waits }), next];
  }
  if (!onScreen) return [next];
  if (onScreen.value === value)
    return [__spreadProps(__spreadValues({}, onScreen), { leaving: false, waits: false })];
  return [__spreadProps(__spreadValues({}, onScreen), { waits: next.waits }), next];
};
const startedLayers = (layers, key) => {
  const current = layers[layers.length - 1];
  return current.key === key && current.waits ? started(layers) : layers;
};
const softFocus = {
  leave: {
    to: { opacity: 0, filter: 'blur(8px)', transform: 'scale(1.02)' },
    duration: 360,
    easing: 'cubic-bezier(0.4, 0, 1, 1)',
  },
  enter: {
    from: { opacity: 0, filter: 'blur(8px)', transform: 'scale(1.02)' },
    delay: 80,
    duration: 520,
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
  },
};
export { nextShownLayers, softFocus, startedLayers };
