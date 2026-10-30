import type { EchoGpuSurface, GlyphRun, EchoGpuGlyphAtlas } from 'echo:plugin-sdk';
declare const surface: EchoGpuSurface;
declare const native: GlyphRun;
native.atlasOnly = true;
native.haloSampling = 'canvas';
native.runs = [{ key: 'line', text: 'Folia 星😀', size: 42, maxBlur: 0 }];
const atlas: EchoGpuGlyphAtlas | null = surface.importGlyphAtlas(native);
if (atlas?.ready) {
  const fragment = atlas.fragments[0];
  const level = fragment.levels[0];
  const resource = atlas.pages[level.page];
  const binding: string = resource.id;
  const uv: number = level.uv[0];
  const channel: 'r' | 'a' = level.coverage;
  const nativeBaseline: number = atlas.metrics[0].baseline;
  void [binding, uv, channel, nativeBaseline, atlas.revision, atlas.generation];
  // @ts-expect-error sampling leases never expose mutable page arrays
  atlas.pages = [];
}
// @ts-expect-error a bitmap URL is not a native glyph producer
surface.importGlyphAtlas('atlas.png');
