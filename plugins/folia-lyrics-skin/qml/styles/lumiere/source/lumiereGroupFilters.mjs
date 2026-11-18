// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/lumiere-reference.md.
const isBloomFilter = (filter) => {
  var _a;
  return typeof ((_a = filter.options) == null ? void 0 : _a.strength) === 'number';
};
const bloomOf = (group) => {
  var _a, _b;
  return (_b = ((_a = group.filters) != null ? _a : []).find(isBloomFilter)) != null ? _b : null;
};
const applyLumiereGroupQuality = (group, quality) => {
  var _a, _b;
  const bloom = bloomOf(group);
  if (bloom) {
    bloom.options.strength = quality.preset.strength * quality.multiplier;
    bloom.options.levels = Math.max(1, quality.preset.levels - quality.levelDrop);
    bloom.resolution = (_a = quality.resolution) != null ? _a : 'inherit';
    return;
  }
  const { passthrough, resolution } = quality;
  if (!passthrough) return;
  const attached = ((_b = group.filters) != null ? _b : []).includes(passthrough);
  if (resolution === null) {
    if (attached) group.filters = [];
    return;
  }
  passthrough.resolution = resolution;
  if (!attached) group.filters = [passthrough];
};
const detachLumierePassthrough = (group, passthrough) => {
  var _a;
  if (passthrough && ((_a = group.filters) != null ? _a : []).includes(passthrough))
    group.filters = [];
};
export { applyLumiereGroupQuality, detachLumierePassthrough };
