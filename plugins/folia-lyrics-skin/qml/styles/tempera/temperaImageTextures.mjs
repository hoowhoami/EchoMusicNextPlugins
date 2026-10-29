// Derived from Folia a8da4437 (AGPL-3.0-only); see tempera-reference.md.
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value })
    : (obj[key] = value);
var __publicField = (obj, key, value) =>
  __defNormalProp(obj, typeof key !== 'symbol' ? key + '' : key, value);
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) =>
      x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};
const decodeImageBlob = (blob) =>
  __async(null, null, function* () {
    try {
      return yield createImageBitmap(blob);
    } catch (e) {
      const url = URL.createObjectURL(blob);
      try {
        const image = new Image();
        image.decoding = 'async';
        yield new Promise((resolve, reject) => {
          image.onload = () => resolve();
          image.onerror = () => reject(new Error('Tempera layer image failed to decode'));
          image.src = url;
        });
        return image;
      } finally {
        URL.revokeObjectURL(url);
      }
    }
  });
const closeImageBitmap = (source) => {
  if (typeof ImageBitmap !== 'undefined' && source instanceof ImageBitmap) source.close();
};
class TemperaImageTextures {
  constructor(pixi) {
    __publicField(this, 'pixi', pixi);
    /** Placement id -> texture, handed to every scene build as-is. */
    __publicField(this, 'textures', /* @__PURE__ */ new Map());
  }
  /**
   * Decodes the user's images straight from their blobs. `Assets.load` is deliberately not
   * used: it chooses a parser from the URL's file extension, and a blob URL has none, so it
   * refuses the load outright. Decoding here also means there is no object URL to leak.
   */
  load(blobs, isDestroyed) {
    return __async(this, null, function* () {
      if (!blobs || blobs.size === 0) return;
      yield Promise.all(
        [...blobs].map((_0) =>
          __async(this, [_0], function* ([id, blob]) {
            try {
              const source = yield decodeImageBlob(blob);
              if (isDestroyed()) {
                closeImageBitmap(source);
                return;
              }
              this.textures.set(id, this.pixi.Texture.from(source));
            } catch (e) {}
          })
        )
      );
    });
  }
  /**
   * These textures were built here rather than owned by a scene, so they are released
   * here too; app.destroy only walks what is still on the stage.
   */
  destroy() {
    this.textures.forEach((texture) => {
      const source = texture.source.resource;
      texture.destroy(true);
      closeImageBitmap(source);
    });
    this.textures.clear();
  }
}
export { TemperaImageTextures };
