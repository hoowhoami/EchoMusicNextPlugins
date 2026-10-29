// Source display objects retain native-independent data. The shared recorder owns matrices/paths.
import { createSceneGraph } from '../sonnet/scene-graph.mjs';
import { optimalTextureSize } from '../sonnet/filters/kernel.mjs';
let nextSource = 1,
  nextTexture = 1;
export function createLumiereBackend(options = {}) {
  const pixi = createSceneGraph(options);
  class CanvasSource {
    constructor(input) {
      this.id = 'source-' + nextSource++;
      this.kind = 'canvas';
      this.resource = input.resource;
      this._resolution = input.resolution || 1;
    }
    get resolution() {
      return this._resolution;
    }
    set resolution(value) {
      this._resolution = value;
    }
    get width() {
      return this.resource.width / this._resolution;
    }
    get height() {
      return this.resource.height / this._resolution;
    }
    get pixelWidth() {
      return this.resource.width;
    }
    get pixelHeight() {
      return this.resource.height;
    }
    destroy() {
      this.destroyed = true;
    }
  }
  class Texture {
    constructor(input) {
      this.id = 'texture-' + nextTexture++;
      this.source = input.source;
      this.frame = input.frame || new pixi.Rectangle(0, 0, this.source.width, this.source.height);
    }
    get width() {
      return this.frame.width;
    }
    get height() {
      return this.frame.height;
    }
    destroy(source = false) {
      this.destroyed = true;
      if (source && this.source.destroy) this.source.destroy();
    }
    static from(resource) {
      return new Texture({ source: new CanvasSource({ resource, resolution: 1 }) });
    }
  }
  Texture.EMPTY = new Texture({
    source: { kind: 'empty', width: 1, height: 1, pixelWidth: 1, pixelHeight: 1, resolution: 1 },
  });
  Texture.WHITE = new Texture({
    source: { kind: 'white', width: 1, height: 1, pixelWidth: 1, pixelHeight: 1, resolution: 1 },
  });
  class Geometry {
    constructor(input) {
      Object.assign(this, input);
    }
    destroy() {
      this.destroyed = true;
    }
  }
  class Shader {
    constructor(input) {
      Object.assign(this, input);
    }
    destroy() {
      this.destroyed = true;
    }
  }
  class Mesh extends pixi.Container {
    constructor(input) {
      super();
      this.kind = 'light-field';
      Object.assign(this, input);
    }
    getLocalBounds() {
      const points = this.geometry.attributes.aPosition,
        x = Math.min(points[0], points[2], points[4], points[6]),
        y = Math.min(points[1], points[3], points[5], points[7]);
      return {
        x,
        y,
        width: Math.max(points[0], points[2], points[4], points[6]) - x,
        height: Math.max(points[1], points[3], points[5], points[7]) - y,
      };
    }
  }
  class Filter extends pixi.Filter {
    constructor(input = {}) {
      super(input);
      this.blendMode = 'normal';
      this.resolution = 'inherit';
      this.padding = 0;
    }
  }
  class TextStyle extends pixi.TextStyle {
    constructor(input = {}) {
      super(
        Object.assign(
          {
            fontStyle: 'normal',
            fontVariant: 'normal',
            fontWeight: 'normal',
            fontSize: 26,
            fontFamily: 'Arial',
            fill: '#000000',
            letterSpacing: 0,
            align: 'left',
            textBaseline: 'alphabetic',
            padding: 0,
            trim: false,
            dropShadow: null,
            wordWrap: false,
            wordWrapWidth: 100,
            breakWords: false,
            leading: 0,
          },
          input
        )
      );
      this._fill = this.fill;
    }
  }
  class Sprite extends pixi.Sprite {
    setSize(width, height) {
      this.width = width;
      this.height = height;
      return this;
    }
  }
  class AlphaFilter extends Filter {
    constructor(input = {}) {
      super(input);
      this.kind = 'copy';
      this.alpha = input.alpha === undefined ? 1 : input.alpha;
    }
  }
  const screens = options.registeredScreens || [];
  const TexturePool = {
    getOptimalTexture(width, height, resolution = 1) {
      const size = optimalTextureSize(width, height, resolution, screens);
      return new Texture({
        source: {
          kind: 'target',
          id: 'source-' + nextSource++,
          width: size.width / resolution,
          height: size.height / resolution,
          pixelWidth: size.width,
          pixelHeight: size.height,
          resolution,
        },
        frame: new pixi.Rectangle(0, 0, width, height),
      });
    },
    returnTexture() {},
  };
  return Object.assign(pixi, {
    TextStyle,
    Sprite,
    AlphaFilter,
    CanvasSource,
    Texture,
    Geometry,
    Shader,
    Mesh,
    Filter,
    TexturePool,
    RendererType: { BOTH: 3, WEBGL: 1, WEBGPU: 2 },
  });
}
