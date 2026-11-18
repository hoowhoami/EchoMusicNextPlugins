import './fixtures/qt-binary.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { MACHI_SCENES } from '../plugins/folia-lyrics-skin/qml/styles/machi/source/scenes/index.mjs';
import {
  MachiColorBlend,
  MachiMaterials,
} from '../plugins/folia-lyrics-skin/qml/styles/machi/source/engine/materials.mjs';
import { MachiCamera } from '../plugins/folia-lyrics-skin/qml/styles/machi/source/engine/camera.mjs';
import { createMachiSnowUniforms } from '../plugins/folia-lyrics-skin/qml/styles/machi/source/engine/snow.mjs';
import { resolveMachiPalette } from '../plugins/folia-lyrics-skin/qml/styles/machi/source/engine/palette.mjs';
import { DEFAULT_DARK_THEME } from '../plugins/folia-lyrics-skin/qml/shared/theme/kernel.mjs';
import { NativeRenderer } from '../plugins/folia-lyrics-skin/qml/styles/machi/native-renderer.mjs';
import {
  Scene,
  OrthographicCamera,
  MeshBasicMaterial,
  Mesh,
  DataTexture,
  CanvasTexture,
  PlaneGeometry,
  WebGLRenderTarget,
  Color,
} from 'three';
import { shaderKey } from '../plugins/folia-lyrics-skin/qml/styles/machi/shader-key.mjs';
import { createMachiFrameEncoder } from '../plugins/folia-lyrics-skin/qml/styles/machi/frame-encoder.mjs';
import { createMachiReplay } from '../plugins/folia-lyrics-skin/qml/styles/machi/rhi-replay.mjs';
import { createInputSurface } from '../plugins/folia-lyrics-skin/qml/styles/machi/input-surface.mjs';
import { setNativeNow } from '../plugins/folia-lyrics-skin/qml/styles/machi/environment.mjs';

test('Machi publishes resized target definitions and retires targets no longer referenced', () => {
  const encoder = createMachiFrameEncoder(),
    target = new WebGLRenderTarget(64, 48);
  const commands = [
    { type: 'clear', target, color: new Color(0), alpha: 0, depth: true, clearColor: true },
  ];
  assert.equal(encoder.encode(commands).events.filter((e) => e.kind === 'target').length, 1);
  assert.equal(encoder.encode(commands).events.length, 0);
  target.setSize(32, 24);
  const resized = encoder.encode(commands).events.find((e) => e.kind === 'target');
  assert.equal(resized.width, 32);
  assert.equal(resized.height, 24);
  const retired = encoder.encode([]).events;
  assert.equal(retired.length, 1);
  assert.equal(retired[0].kind, 'retire-target');
  assert.equal(encoder.encode([]).events.length, 0);
  target.dispose();
  encoder.destroy();
});

test('Machi releases replaced render targets before reserving a resized frame', () => {
  let bytes = 0,
    sequence = 0;
  const allocate = (size) => {
    assert.ok(bytes + size <= 5500, 'logical texture budget exhausted');
    bytes += size;
    return { id: String(++sequence), dispose: () => (bytes -= size) };
  };
  const graphics = {
    capabilities: { limits: { maxCommands: 128 } },
    createTexture: ({ width, height }) => allocate(width * height * 4),
    createSampler: () => allocate(0),
  };
  const replay = createMachiReplay(graphics, 'unused/', 16, 16);
  const target = { kind: 'target', id: 'world', format: 'rgba8', samples: 1 };
  replay.ingest([{ ...target, width: 32, height: 32 }]);
  assert.equal(bytes, 5124);
  replay.ingest([{ ...target, width: 16, height: 16 }], null, null, { width: 32, height: 32 });
  assert.equal(bytes, 5124);
  replay.destroy();
  assert.equal(bytes, 0);
});

test('Machi captures renderer exposure with each original render command', () => {
  const renderer = new NativeRenderer();
  renderer.toneMappingExposure = 1.75;
  renderer.render(new Scene(), new OrthographicCamera(-1, 1, 1, -1, 0.1, 100));
  renderer.toneMappingExposure = 3;
  const command = renderer.drain().find((command) => command.type === 'render');
  assert.equal(command.toneMappingExposure, 1.75);
  renderer.dispose();
});

test('Machi separates straight-alpha conversion from opaque data and premultiplied materials', () => {
  const material = new MeshBasicMaterial(),
    geometry = new PlaneGeometry();
  const key = () => shaderKey(material, geometry, {}, null, false);
  const opaque = key();
  material.transparent = true;
  const straight = key();
  material.premultipliedAlpha = true;
  const premultiplied = key();
  assert.equal(new Set([opaque, straight, premultiplied]).size, 3);
  material.dispose();
  geometry.dispose();
});
for (const [id, definition] of Object.entries(MACHI_SCENES))
  test(`Machi ${id} preserves finite original scene geometry, camera and disposal`, () => {
    const theme = { ...DEFAULT_DARK_THEME, fontFamily: 'PingFang SC' };
    const song = {
      seed: 'native',
      lines: [],
      isInstrumental: false,
      title: '原生测试',
      artist: 'Folia',
      album: '',
    };
    const blend = new MachiColorBlend(resolveMachiPalette(theme, song.seed, definition.resolveArt));
    const cache = new Map();
    const scene = definition.create({
      materials: new MachiMaterials(blend, createMachiSnowUniforms()),
      blend,
      geometryCache: cache,
      song,
      previewMode: false,
      invalidateShadows() {},
    });
    let meshes = 0,
      vertices = 0,
      submittedVertices = 0,
      disposed = 0;
    const seen = new Set();
    scene.root.updateMatrixWorld(true);
    scene.root.traverse((node) => {
      assert.ok(node.matrixWorld.elements.every(Number.isFinite));
      if (!node.isMesh) return;
      ++meshes;
      const geometry = node.geometry,
        positions = geometry.attributes.position;
      vertices += positions.count;
      submittedVertices += geometry.index?.count ?? positions.count;
      assert.ok(positions.array.every(Number.isFinite));
      if (geometry.index) assert.ok(geometry.index.array.every((index) => index < positions.count));
      if (!seen.has(geometry)) {
        seen.add(geometry);
        geometry.addEventListener('dispose', () => ++disposed);
      }
    });
    assert.ok(meshes >= 80 && meshes <= 256);
    assert.ok(submittedVertices > 100000 && submittedVertices < 500000);
    assert.ok(vertices < submittedVertices);
    assert.ok(scene.weather.roofs.length > 0);
    const camera = new MachiCamera();
    camera.setFraming(scene.framing, null);
    for (const [w, h] of [
      [320, 240],
      [720, 480],
      [1600, 900],
    ]) {
      camera.setAspect(w, h);
      camera.setMotion(true, 1);
      for (let frame = 0; frame < 120; ++frame) camera.update(1 / 60, 1 / 60);
      camera.camera.updateMatrixWorld(true);
      assert.ok(camera.camera.matrixWorldInverse.elements.every(Number.isFinite));
      assert.ok(camera.camera.projectionMatrix.elements.every(Number.isFinite));
      assert.ok(camera.frustumHalfHeight > 0);
    }
    const surface = createInputSurface(800, 600, 2);
    setNativeNow(1000);
    camera.attach(surface);
    const beforeDrag = camera.view();
    surface.dispatchNative({ type: 'pointerdown', clientX: 200, clientY: 200, sequence: 1 });
    surface.dispatchNative({ type: 'pointermove', clientX: 240, clientY: 220, sequence: 2 });
    surface.dispatchNative({ type: 'pointerup', clientX: 240, clientY: 220, sequence: 3 });
    camera.update(1 / 60, 1 / 60);
    assert.notEqual(camera.view().azimuth, beforeDrag.azimuth);
    const beforeWheel = camera.view().zoom;
    surface.dispatchNative({
      type: 'wheel',
      clientX: 240,
      clientY: 220,
      deltaY: -100,
      sequence: 4,
    });
    camera.update(1 / 60, 1 / 60);
    assert.ok(camera.view().zoom > beforeWheel);
    camera.dispose();
    setNativeNow(0);
    scene.dispose();
    assert.ok(disposed > 0);
  });

import { createFrameUniformReader } from '../plugins/folia-lyrics-skin/qml/styles/machi/material-uniforms.mjs';
test('Machi shared material hooks retain live uniform references and isolate draw overrides', () => {
  let compiled = 0;
  const snow = { value: 0.25 };
  const material = {
    uniforms: { time: { value: 1 } },
    onBeforeCompile(shader) {
      ++compiled;
      shader.uniforms.snow = snow;
    },
  };
  const read = createFrameUniformReader();
  const first = read(material, { time: { value: 7 } });
  const second = read(material, { time: { value: 9 } });
  assert.equal(first.time, 7);
  assert.equal(second.time, 9);
  snow.value = 0.75;
  material.uniforms.time.value = 3;
  assert.deepEqual(read(material), { snow: 0.75, time: 3 });
  assert.equal(compiled, 1);
  assert.deepEqual(createFrameUniformReader()(material), { snow: 0.75, time: 3 });
  assert.equal(compiled, 2);
});

test('Machi encodes shared materials once per frame while publishing changed uniforms', () => {
  const renderer = new NativeRenderer();
  renderer.frustumCulling = false;
  const encoder = createMachiFrameEncoder();
  const material = new MeshBasicMaterial();
  const geometry = new PlaneGeometry();
  let hookCalls = 0,
    pulse = 1;
  material.onBeforeCompile = (shader) => {
    ++hookCalls;
    shader.uniforms.uPulse = { value: pulse };
  };
  const scene = new Scene();
  scene.add(new Mesh(geometry, material), new Mesh(geometry, material));
  const camera = new OrthographicCamera(-2, 2, 2, -2, 0.1, 100);
  camera.position.z = 4;
  renderer.render(scene, camera);
  const first = encoder.encode(renderer.drain());
  assert.equal(hookCalls, 1);
  const firstUniforms = first.passes.find((pass) => pass.kind === 'draw').uniforms;
  assert.equal(Object.hasOwn(firstUniforms, 'uPulse'), false);
  assert.deepEqual(firstUniforms.projectionMatrix, camera.projectionMatrix.toArray());
  assert.equal(first.events.filter((event) => event.kind === 'geometry').length, 1);
  pulse = 2;
  camera.zoom = 2;
  camera.updateProjectionMatrix();
  renderer.render(scene, camera);
  const second = encoder.encode(renderer.drain());
  assert.equal(hookCalls, 2);
  const secondUniforms = second.passes.find((pass) => pass.kind === 'draw').uniforms;
  assert.deepEqual(secondUniforms.projectionMatrix, camera.projectionMatrix.toArray());
  assert.notDeepEqual(firstUniforms.projectionMatrix, secondUniforms.projectionMatrix);
  assert.equal(second.events.filter((event) => event.kind === 'geometry').length, 0);
  encoder.destroy();
  renderer.dispose();
  material.dispose();
  geometry.dispose();
});

test('Machi retains source textures across culling and retires only their original disposal', () => {
  const renderer = new NativeRenderer();
  renderer.frustumCulling = false;
  const encoder = createMachiFrameEncoder();
  const texture = new DataTexture(new Uint8Array(16).fill(255), 2, 2);
  texture.needsUpdate = true;
  const material = new MeshBasicMaterial({ map: texture });
  const geometry = new PlaneGeometry();
  const scene = new Scene();
  scene.add(new Mesh(geometry, material));
  const camera = new OrthographicCamera(-2, 2, 2, -2, 0.1, 100);
  camera.position.z = 4;
  renderer.render(scene, camera);
  const first = encoder.encode(renderer.drain());
  assert.equal(first.events.filter((event) => event.id === texture.uuid).length, 1);
  assert.equal(encoder.encode([]).events.filter((event) => event.id === texture.uuid).length, 0);
  renderer.render(scene, camera);
  assert.equal(
    encoder.encode(renderer.drain()).events.filter((event) => event.id === texture.uuid).length,
    0,
  );
  texture.dispose();
  const retired = encoder.encode([]).events.filter((event) => event.id === texture.uuid);
  assert.deepEqual(retired, [{ kind: 'retire-texture', id: texture.uuid }]);
  encoder.destroy();
  renderer.dispose();
  material.dispose();
  geometry.dispose();
});

test('Machi avoids rerasterizing an unchanged sign but publishes changed drawing and sampling', () => {
  const renderer = new NativeRenderer();
  const encoder = createMachiFrameEncoder();
  const canvas = { width: 64, height: 32, commands: [{ kind: 'text', text: '街' }] };
  const texture = new CanvasTexture(canvas);
  const material = new MeshBasicMaterial({ map: texture });
  const geometry = new PlaneGeometry();
  const scene = new Scene();
  scene.add(new Mesh(geometry, material));
  const camera = new OrthographicCamera(-2, 2, 2, -2, 0.1, 100);
  camera.position.z = 4;
  function update() {
    texture.needsUpdate = true;
    renderer.render(scene, camera);
    return encoder.encode(renderer.drain()).events.find((event) => event.id === texture.uuid);
  }
  assert.equal(update().commands[0].text, '街');
  canvas.commands = [{ kind: 'text', text: '街' }];
  assert.equal(update(), undefined);
  canvas.commands[0].text = '町';
  assert.equal(update().commands[0].text, '町');
  texture.flipY = false;
  assert.equal(update().flipY, false);
  encoder.destroy();
  renderer.dispose();
  texture.dispose();
  material.dispose();
  geometry.dispose();
});

test('indexed rounded boxes preserve every upstream triangle, normal, and UV', async () => {
  const { RoundedBoxGeometry: Source } =
    await import('three/examples/jsm/geometries/RoundedBoxGeometry.js');
  const { RoundedBoxGeometry: Native } =
    await import('../plugins/folia-lyrics-skin/qml/styles/machi/three/RoundedBoxGeometry.mjs');
  for (const args of [
    [3, 0.05, 1, 2, 0.02],
    [1, 2, 4, 3, 0.1],
    [1, 1, 1, 1, 0.5],
  ]) {
    const expected = new Source(...args),
      indexed = new Native(...args),
      expanded = indexed.toNonIndexed();
    assert.ok(indexed.attributes.position.count < expanded.attributes.position.count);
    for (const name of ['position', 'normal', 'uv']) {
      assert.deepEqual(expanded.attributes[name].array, expected.attributes[name].array);
    }
    expected.dispose();
    indexed.dispose();
    expanded.dispose();
  }
});
