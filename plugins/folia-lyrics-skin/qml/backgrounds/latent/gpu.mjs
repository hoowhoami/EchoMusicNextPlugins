// Plugin-owned RHI ABI. All colors remain premultiplied sRGB until final CSS composition.
export const uniformBytes = 208;
export function packUniforms(budget, tuning, state, colors) {
  const data = new Float32Array(uniformBytes / 4);
  data.set([budget.width, budget.height, budget.pixelRatio, 0]);
  data.set(
    [
      state.ditherTime,
      state.meshTime,
      Math.max(0.5, tuning.ditheringSize - state.bass * tuning.ditheringSize * 0.34),
      tuning.meshDistortion + state.power * 0.62,
      tuning.meshSwirl + state.mid * 0.38,
      Math.min(1, tuning.ditheringOpacity + state.bass * 0.25),
      state.ditherScale,
      state.meshScale,
      state.saturation,
      state.brightness,
      tuning.displayMode === 'mesh' ? 1 : tuning.displayMode === 'dithering' ? 2 : 0,
      tuning.overlayEnabled ? tuning.overlayOpacity : 0,
    ],
    4
  );
  for (let i = 0; i < 9; i++) {
    const c = colors[i];
    data.set([c.r * c.a, c.g * c.a, c.b * c.a, c.a], 16 + i * 4);
  }
  return data;
}
// Each source surface has a fixed physical size; composition stays at full Quick scene resolution.
export function createSourcePlans(ids) {
  const source = (pipeline) => ({
    passes: [
      {
        type: 'render',
        pipeline,
        target: 'surface',
        loadOp: 'clear',
        clear: [0, 0, 0, 0],
        bindings: [
          { binding: 0, kind: 'uniform', resource: 'frame' },
          { binding: 1, kind: 'uniform', resource: ids.parameters },
        ],
        draws: [{ count: 3 }],
      },
    ],
  });
  return { mesh: source(ids.meshPipeline), dither: source(ids.ditherPipeline) };
}
