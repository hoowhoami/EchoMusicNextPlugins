// Browser endpoints used by the original pipeline; real Qt work is injected by its owner.
export function createNativeMonetEnvironment(native) {
  let disposed = false;
  const pictures = new Map();
  const decodes = new Set();
  function revoke(url) {
    const picture = pictures.get(String(url));
    if (!picture) return;
    pictures.delete(String(url));
    native.releasePicture(picture);
  }
  class NativeImage {
    constructor() {
      this.src = '';
      this.onload = null;
      this.onerror = null;
      this._promise = null;
    }
    decode() {
      if (this._promise) return this._promise;
      this._promise = new Promise((resolve, reject) => {
        const fail = (error) => {
          if (!this._cancel) return;
          this._cancel = null;
          decodes.delete(this);
          if (this.onerror) this.onerror(error);
          reject(error);
        };
        this._cancel = fail;
        decodes.add(this);
        if (disposed) {
          fail(new Error('Monet image environment is released'));
          return;
        }
        Promise.resolve(native.decode(String(this.src))).then((value) => {
          if (!this._cancel) return;
          if (disposed) {
            fail(new Error('Monet image environment is released'));
            return;
          }
          this._cancel = null;
          decodes.delete(this);
          this.width = value.width;
          this.height = value.height;
          if (this.onload) this.onload();
          resolve(value);
        }, fail);
      });
      return this._promise;
    }
  }

  class NativeWorker {
    constructor() {
      this.onmessage = null;
      this.onerror = null;
      this._alive = true;
    }
    postMessage(request) {
      if (disposed || !this._alive) throw new Error('Monet native painter is released');
      Promise.resolve(native.paint(request)).then(
        (picture) => {
          if (disposed) return; // Capture owner releases unpublished leases at shutdown.
          if (!this._alive) {
            if (picture) native.releasePicture(picture);
            return;
          }
          if (this.onmessage) this.onmessage({ data: { id: request.id, picture } });
        },
        (error) => {
          if (!disposed && this._alive && this.onerror) this.onerror(error);
        }
      );
    }
    terminate() {
      if (!this._alive) return;
      this._alive = false;
      native.cancelPaint();
    }
  }
  function NativeURL(value) {
    this.href = String(value);
  }
  NativeURL.createObjectURL = (picture) => {
    if (disposed) throw new Error('Monet native image environment is released');
    const url = String(picture.url);
    if (!url) throw new Error('Monet capture did not produce an immutable URL');
    pictures.set(url, picture);
    return url;
  };
  NativeURL.revokeObjectURL = revoke;
  return {
    Image: NativeImage,
    Worker: NativeWorker,
    URL: NativeURL,
    filterSupported: true,
    createImageBitmap(image) {
      if (disposed) return Promise.reject(new Error('Monet image environment is released'));
      return Promise.resolve({
        source: String(image.src),
        width: image.width,
        height: image.height,
        close() {},
      });
    },
    get pictureCount() {
      return pictures.size;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const image of Array.from(decodes))
        image._cancel(new Error('Monet image environment is released'));
      for (const url of Array.from(pictures.keys())) revoke(url);
    },
  };
}
