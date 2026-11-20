import './fixtures/qt-binary.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { createNativeMachiRuntime } from '../plugins/folia-lyrics-skin/qml/styles/machi/runtime-factory.mjs';
import { shaderKey } from '../plugins/folia-lyrics-skin/qml/styles/machi/shader-key.mjs';
import { programs } from '../plugins/folia-lyrics-skin/qml/styles/machi/shaders/registry.mjs';
import { DEFAULT_DARK_THEME } from '../plugins/folia-lyrics-skin/qml/shared/theme/kernel.mjs';
import * as Native from '../plugins/folia-lyrics-skin/qml/styles/lumiere/native-measure.mjs';
import { configureNativePixels } from '../plugins/folia-lyrics-skin/qml/styles/machi/environment.mjs';

test('Machi ships the material programs used after weather and adaptive quality settle', () => {
  const originalNow = Date.now;
  let now = 1;
  const observed = new Set();
  try {
    Date.now = () => now;
    for (const scene of ['konbini', 'station', 'kowloon'])
      for (const weather of ['clear', 'rain', 'snow', 'fog'])
        for (const adaptive of [false, true]) {
          now = 1;
          Native.configure({ discovery: true });
          configureNativePixels([]);
          const runtime = createNativeMachiRuntime({
            width: 1100,
            height: 820,
            resolution: 2,
            program: [],
            seed: '山河与月光',
            metadata: { title: 'Native', artist: 'Folia', album: '' },
            theme: { ...DEFAULT_DARK_THEME, fontFamily: 'PingFang SC' },
            tuning: {
              scene,
              weather,
              timeOfDay: 'night',
              quality: { adaptive, shadows: 'high', antialias: 'off' },
            },
          });
          runtime.runtime.renderer.frustumCulling = false;
          try {
            for (const elapsed of [1, 100, 500, 1500, 5000, 15000]) {
              now = elapsed;
              for (const command of runtime.frame(10 + elapsed / 1000, { presented: true })) {
                if (command.type !== 'render') continue;
                const shadows =
                  !command.depthOnly && command.lights.some((light) => light.castShadow);
                for (const mesh of command.meshes) {
                  const key = shaderKey(
                    mesh.material,
                    mesh.geometry,
                    command.lightState || {},
                    command.fog,
                    shadows,
                  );
                  observed.add(key);
                  assert.ok(
                    programs[key],
                    `${scene}/${weather}/${adaptive}/${elapsed}: missing ${key}`,
                  );
                }
              }
            }
          } finally {
            runtime.destroy();
          }
        }
    for (const key of ['f8aa1402', '99247af2', 'a16c1fc1']) assert.ok(observed.has(key));
  } finally {
    Date.now = originalNow;
    Native.configure({ pieces: [] });
  }
});
