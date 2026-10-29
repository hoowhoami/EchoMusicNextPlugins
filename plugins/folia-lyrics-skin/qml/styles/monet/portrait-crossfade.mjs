// Derived from Folia a8da4437 (AGPL-3.0-only). See monet-reference.md.
const MONET_PORTRAIT_FADE_MS = 900;
const MONET_PORTRAIT_MAX_LAYERS = 4;
const monetPortraitTargetSource = (layers) => {
  for (let index = layers.length - 1; index >= 0; index -= 1) {
    if (!layers[index].leaving) return layers[index].src;
  }
  return null;
};
const pushMonetPortraitLayer = (layers, src, key, handoffAt) => {
  if (monetPortraitTargetSource(layers) === src) {
    return layers;
  }
  const top = layers[layers.length - 1];
  if (handoffAt !== void 0 && (top == null ? void 0 : top.handoffFrom) !== void 0) {
    return [...layers.slice(0, -1), { key, src, handoffFrom: top.handoffFrom }];
  }
  const next = [
    ...layers,
    handoffAt === void 0 ? { key, src } : { key, src, handoffFrom: handoffAt },
  ];
  return next.length > MONET_PORTRAIT_MAX_LAYERS
    ? next.slice(next.length - MONET_PORTRAIT_MAX_LAYERS)
    : next;
};
const settleMonetPortraitLayers = (layers, key) => {
  const index = layers.findIndex((layer) => layer.key === key);
  return index <= 0 ? layers : layers.slice(index);
};
const endMonetPortraitHandoff = (layers, src) => {
  const handoffIndex = layers.findIndex((layer) => layer.handoffFrom !== void 0);
  if (handoffIndex < 0) return layers;
  const wentBack =
    Boolean(src) &&
    layers.slice(0, handoffIndex).some((layer) => layer.src === src && !layer.leaving);
  return layers.map((layer) => {
    if (layer.handoffFrom === void 0) return layer;
    return wentBack
      ? { key: layer.key, src: layer.src, leaving: true }
      : { key: layer.key, src: layer.src };
  });
};
const dropLeavingMonetPortraitLayers = (layers) =>
  layers.some((layer) => layer.leaving) ? layers.filter((layer) => !layer.leaving) : layers;
export {
  MONET_PORTRAIT_FADE_MS,
  MONET_PORTRAIT_MAX_LAYERS,
  dropLeavingMonetPortraitLayers,
  endMonetPortraitHandoff,
  monetPortraitTargetSource,
  pushMonetPortraitLayer,
  settleMonetPortraitLayers,
};
