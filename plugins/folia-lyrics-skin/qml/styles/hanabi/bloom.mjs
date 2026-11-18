// Pure filter descriptor, consumed by the same native dual-filter chain as Lumiere.
export function createBloomFilter(pixi, options) {
  const filter = new pixi.Filter();
  filter.options = Object.assign({}, options);
  filter.padding = options.padding;
  return filter;
}
