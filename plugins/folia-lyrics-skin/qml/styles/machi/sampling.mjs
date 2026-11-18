// Three texture constants, preserved across the native sampler boundary.
export function nativeSampler(texture) {
  const min = texture.minFilter === undefined ? 1006 : texture.minFilter;
  const mag = texture.magFilter === undefined ? 1006 : texture.magFilter;
  const wrap = (value) => (value === 1000 ? 'repeat' : value === 1002 ? 'mirror' : 'clamp');
  return {
    minFilter: min === 1003 || min === 1004 || min === 1005 ? 'nearest' : 'linear',
    magFilter: mag === 1003 ? 'nearest' : 'linear',
    mipFilter: !texture.mipmaps
      ? 'none'
      : min === 1004 || min === 1007
        ? 'nearest'
        : min === 1005 || min === 1008
          ? 'linear'
          : 'none',
    u: wrap(texture.wrapS),
    v: wrap(texture.wrapT),
  };
}
