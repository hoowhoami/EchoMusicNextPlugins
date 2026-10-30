import type { EchoPluginContext, EchoGpuSurface, GpuFrame } from 'echo:plugin-sdk';
export function graphics(
  context: EchoPluginContext,
  surface: EchoGpuSurface,
): GpuFrame | undefined {
  const gpu = context.graphics;
  const data = gpu.createBuffer(
    { size: 64, usage: ['storage'], format: 'float32' },
    new Float32Array(16),
  );
  const texture = gpu.createTexture({
    width: 32,
    height: 32,
    format: 'rgba16f',
    usage: ['storage', 'sampled', 'render-target', 'readback'],
  });
  const sampler = gpu.createSampler({
    minFilter: 'linear',
    magFilter: 'nearest',
    u: 'repeat',
    v: 'clamp',
  });
  const pipeline = gpu.createRenderPipeline({
    vertexShader: 'quad.vert.qsb',
    fragmentShader: 'draw.frag.qsb',
    blend: 'alpha',
    depthTest: true,
    depthWrite: true,
  });
  const compute = gpu.createComputePipeline({ computeShader: 'transform.comp.qsb' });
  if (!data || !texture || !sampler || !pipeline || !compute) return;
  gpu.writeBuffer(data, new Float32Array(16).buffer, 0);
  gpu.writeTexture(texture, new Uint16Array(32 * 32 * 4).buffer);
  surface.graphics = gpu;
  surface.dynamicRange = 'auto';
  surface.fps = 30;
  surface.continuous = true;
  const frame: GpuFrame = {
    passes: [
      {
        type: 'compute',
        pipeline: compute.id,
        groups: [1, 1, 1],
        bindings: [
          { kind: 'storage-buffer', binding: 0, resource: data.id, access: 'read-write' },
          { kind: 'storage-image', binding: 1, resource: texture.id, access: 'write' },
        ],
      },
      {
        type: 'render',
        pipeline: pipeline.id,
        loadOp: 'load',
        bindings: [
          { kind: 'uniform', binding: 0, resource: 'frame' },
          { kind: 'texture', binding: 1, resource: texture.id, sampler: sampler.id },
        ],
        draws: [{ count: 3 }],
      },
    ],
  };
  surface.submit(frame);
  surface.requestFrame();
  surface.readback(texture)?.cancel();
  // @ts-expect-error GPU resource ownership never accepts native pointer numbers.
  gpu.writeBuffer(1, new ArrayBuffer(16));
  // @ts-expect-error shader stages are explicit package assets.
  gpu.createComputePipeline({ vertexShader: 'quad.vert.qsb' });
  // @ts-expect-error access is a finite contract.
  const invalid: import('echo:plugin-sdk').GpuBinding['access'] = 'anything';
  void invalid;
  return frame;
}
