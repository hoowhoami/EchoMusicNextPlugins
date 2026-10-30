import type { EchoPluginContext, EchoGpuSurface, GpuCommandList, GpuDraw } from 'echo:plugin-sdk';
export function author(c: EchoPluginContext, surface: EchoGpuSurface) {
  const image = c.graphics.createTexture({
    width: 32,
    height: 32,
    usage: ['sampled', 'readback', 'render-target'],
    mipmaps: true,
  });
  if (image) {
    const commands: GpuCommandList = {
      passes: [
        {
          type: 'upload-texture',
          destination: image.id,
          size: [1, 1],
          origin: [2, 3],
          data: new Uint8Array([255, 0, 0, 255]).buffer,
        },
        { type: 'generate-mips', texture: image.id },
      ],
    };
    surface.enqueue(commands)?.completed.connect(() => {});
    surface.readback(image, { level: 1, x: 0, y: 0, width: 1, height: 1 });
    const pipeline = c.graphics.createRenderPipeline({
      vertexShader: 'quad.vert.qsb',
      fragmentShader: 'mrt.frag.qsb',
      blends: ['none', 'add'],
    });
    const second = c.graphics.createTexture({
      width: 32,
      height: 32,
      mipmaps: true,
      usage: ['render-target'],
    });
    if (pipeline && second) {
      surface.enqueue({
        passes: [
          {
            type: 'render',
            pipeline: pipeline.id,
            colorTargets: [
              { texture: image.id, level: 1 },
              { texture: second.id, level: 1 },
            ],
            bindings: [],
            draws: [{ count: 3 }],
          },
        ],
      });
      surface.submit({
        passes: [
          {
            type: 'render',
            pipeline: pipeline.id,
            // @ts-expect-error Attachment views require a texture ID.
            colorTargets: [{ resource: image.id }],
            bindings: [],
            draws: [],
          },
        ],
      });
    }
    // @ts-expect-error Transfer commands have once-only semantics.
    surface.submit(commands);
    // @ts-expect-error Texture mipmaps are boolean.
    c.graphics.createTexture({ width: 2, height: 2, usage: ['sampled'], mipmaps: 'yes' });
  }
  c.theme.themes().forEach((choice) => c.theme.useTheme(choice.key));
  c.theme.useSkin('portrait');
  c.theme.onSnapshot('appearance', (snapshot) => {
    void snapshot.mini.background;
    void snapshot.previewing;
  });
  c.windows.onSnapshot('bounds', (snapshot) => {
    void snapshot.miniBounds?.width;
    void snapshot.positionSupported;
  });
  c.windows.command('mini', 'settings', { alwaysOnTop: true, alignment: 'center' });
  c.windows.command('mini', 'panel', { value: 'lyric' });
  // @ts-expect-error Desktop-only lock.
  c.windows.command('mini', 'lock', { value: true });
  // @ts-expect-error Invalid layout.
  c.windows.command('desktop', 'settings', { layout: 'random' });
  const window = c.windows.get('tools');
  window?.setAlwaysOnTop(true);
  window?.setOpacity(0.8);
  window?.setTitle('Tools');
  window?.minimize();
  window?.restore(false);
}

export function advanced(c: EchoPluginContext, surface: EchoGpuSurface, pipeline: string) {
  const args = c.graphics.createBuffer({
    size: 160,
    usage: ['storage', 'indirect'],
    format: 'uint32',
  });
  const array = c.graphics.createTexture({
    dimension: '2d-array',
    layers: 4,
    width: 8,
    height: 8,
    usage: ['sampled', 'storage', 'render-target', 'readback'],
    mipmaps: true,
  });
  if (array && args) {
    surface.enqueue({
      passes: [
        {
          type: 'render',
          pipeline,
          colorTargets: [{ texture: array.id, layer: 2, level: 1 }],
          bindings: [],
          draws: [{ indirect: { buffer: args.id, offset: 16, drawCount: 2, stride: 32 } }],
        },
      ],
    });
    surface.readback(array, { level: 1, layer: 2 });
    surface.enqueue({
      passes: [
        {
          type: 'upload-texture',
          destination: array.id,
          layer: 1,
          size: [1, 1],
          data: [255, 0, 0, 255],
        },
      ],
    });
    void c.graphics.capabilities.indirectDraw;
    void c.graphics.capabilities.textureArrays;
  }
  // @ts-expect-error Arrays require their layer count.
  c.graphics.createTexture({ dimension: '2d-array', width: 4, height: 4, usage: ['sampled'] });
  // @ts-expect-error Two-dimensional textures have no array extent.
  c.graphics.createTexture({ dimension: '2d', layers: 4, width: 4, height: 4, usage: ['sampled'] });
  // @ts-expect-error Direct and indirect argument sources are mutually exclusive.
  const mixed: GpuDraw = { count: 3, indirect: { buffer: 'args' } };
  void mixed;
}

export function volumes(c: EchoPluginContext, surface: EchoGpuSurface, pipeline: string) {
  c.graphics.createSampler({ w: 'repeat' });
  // @ts-expect-error Unknown z addressing.
  c.graphics.createSampler({ w: 'random' });
  const cube = c.graphics.createTexture({
    dimension: 'cube',
    width: 8,
    height: 8,
    mipmaps: true,
    usage: ['sampled', 'render-target', 'readback'],
  });
  const volume = c.graphics.createTexture({
    dimension: '3d',
    width: 8,
    height: 8,
    depth: 8,
    mipmaps: true,
    usage: ['sampled', 'storage', 'render-target', 'readback'],
  });
  if (volume && cube) {
    surface.enqueue({
      passes: [
        {
          type: 'copy-texture',
          source: volume.id,
          sourceLayer: 2,
          destination: cube.id,
          destinationLayer: 0,
          size: [8, 8],
        },
      ],
    });
    surface.readback(volume, { level: 1, layer: 2 });
    void c.graphics.capabilities.volumeTextures;
    void c.graphics.capabilities.renderVolumeSlices;
    void pipeline;
  }
  // @ts-expect-error Volumes require depth.
  c.graphics.createTexture({ dimension: '3d', width: 4, height: 4, usage: ['sampled'] });
  // @ts-expect-error Cube storage uses per-face rendering or copies from a storage-capable texture.
  c.graphics.createTexture({ dimension: 'cube', width: 4, height: 4, usage: ['storage'] });
  // @ts-expect-error Cube face count is fixed at six.
  c.graphics.createTexture({
    dimension: 'cube',
    layers: 6,
    width: 4,
    height: 4,
    usage: ['sampled'],
  });
}
