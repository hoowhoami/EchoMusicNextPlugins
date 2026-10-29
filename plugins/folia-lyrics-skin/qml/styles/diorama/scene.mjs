// Derived from Folia a8da4437 (AGPL-3.0-only); see diorama-reference.md.
import * as THREE from './three.mjs';
import React, { useRef } from './react.mjs';
import * as Host from './react.mjs';
import CameraRig from './CameraRig.mjs';
import DioramaScene from './DioramaScene.mjs';
import { useSequencer } from './sequencer-state.mjs';
import { resolveDioramaMotionParams } from './cameraPath.mjs';
import { buildInstrumentalPhantomLines } from './instrumental.mjs';
let serial = 1;
function packFloatWords(buffer) {
  const view = new DataView(buffer),
    words = new Uint16Array(buffer.byteLength / 2);
  for (let i = 0; i < words.length; i++) words[i] = view.getUint16(i * 2, !0);
  let result = '';
  for (let i = 0; i < words.length; i += 8192)
    result += String.fromCharCode.apply(null, Array.from(words.subarray(i, i + 8192)));
  return result;
}
function Program(props) {
  const state = useSequencer({
    gatedSeed: props.seed,
    effectiveLines: props.lines,
    effectiveLineIndex: props.index,
  });
  props.output.state = state;
  const activeLineWidthRef = useRef(0);
  return React.createElement(
    React.Fragment,
    null,
    React.createElement(CameraRig, {
      currentTime: props.currentTime,
      sequencer: state.seq,
      globalIndex: state.globalIndex,
      activeLineWidthRef,
      motion: props.motion,
      transitionEpoch: state.transitionEpoch,
    }),
    React.createElement(
      DioramaScene,
      Object.assign({}, props.scene, {
        theme: props.theme,
        sequencer: state.seq,
        globalIndex: state.globalIndex,
        transitionOutgoingIndex: state.transitionOutgoingIndex,
        currentTime: props.currentTime,
        activeLineWidthRef,
        audioPower: props.audioPower,
        audioBands: props.audioBands,
        motion: props.motion,
      })
    )
  );
}
function packGeometry(geometry, motes) {
  const attrs = geometry.attributes,
    count = attrs.position.count,
    parts = [];
  if (count > 65536) throw Error('Diorama geometry exceeds original point cap');
  for (let first = 0; first < count; first += 8192) {
    const points = Math.min(8192, count - first),
      packed = new Float32Array(points * 20);
    for (let i = 0; i < points; i++) {
      const at = first + i,
        p = i * 20;
      (packed.set(attrs.position.array.subarray(at * 3, at * 3 + 3), p),
        motes ||
          ((packed[p + 3] = attrs.aPhase.array[at]),
          packed.set(attrs.aNormal.array.subarray(at * 3, at * 3 + 3), p + 4),
          (packed[p + 7] = attrs.aScale.array[at * 3]),
          packed.set(attrs.aAnchor.array.subarray(at * 3, at * 3 + 3), p + 8),
          (packed[p + 11] = attrs.aScale.array[at * 3 + 1]),
          packed.set(attrs.aStyle.array.subarray(at * 3, at * 3 + 3), p + 12),
          (packed[p + 15] = attrs.aScale.array[at * 3 + 2]),
          packed.set(attrs.aWave.array.subarray(at * 2, at * 2 + 2), p + 16)));
    }
    parts.push({
      id: geometry.uuid + ':' + attrs.position.version + ':' + first,
      kind: 'points',
      points,
      width: 5,
      height: points,
      pixels: packFloatWords(packed.buffer),
    });
  }
  return parts;
}
function visible(object) {
  for (let p = object; p; p = p.parent) if (!p.visible) return !1;
  return !0;
}
class NativeDioramaScene {
  constructor() {
    ((this.root = Host.createRoot()),
      (this.time = 0),
      (this.elapsed = 0),
      (this.index = -1),
      (this.lines = []),
      (this.phantoms = buildInstrumentalPhantomLines()),
      (this.context = null),
      (this.output = {}),
      (this.resources = /* @__PURE__ */ new Map()),
      (this.geometry = /* @__PURE__ */ new Map()),
      (this.lastObjects = []),
      (this.audio = { audioPower: 0, bass: 0, lowMid: 0, mid: 0, vocal: 0, treble: 0 }),
      (this.currentTime = { get: () => this.time }),
      (this.audioPower = { get: () => this.audio.audioPower }),
      (this.audioBands = {}));
    for (const name of ['bass', 'lowMid', 'mid', 'vocal', 'treble'])
      this.audioBands[name] = { get: () => this.audio[name] || 0 };
  }
  update(context, lines) {
    ((this.context = context),
      (this.lines = lines),
      (this.instrumental = lines.length === 0),
      (this.propsLines = this.instrumental ? this.phantoms : lines));
  }
  readIndex(time) {
    if (this.instrumental) return Math.min(95, Math.max(0, Math.floor(time / 5)));
    let index = -1;
    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i];
      if (line.startTime > time) break;
      time < ((line.renderHints && line.renderHints.renderEndTime) || line.endTime) &&
        line.fullText !== '......' &&
        (index = i);
    }
    return index;
  }
  draw(time, presentationSeconds, audio) {
    ((this.time = time), (this.audio = Object.assign({}, this.audio, audio || {})));
    const context = this.context,
      t = context.tuning;
    this.index = this.readIndex(time);
    const state = this.root.state;
    ((state.width = context.width),
      (state.height = context.height),
      (state.resolution = context.resolution || 1),
      (state.camera.aspect = context.width / context.height),
      state.camera.updateProjectionMatrix());
    const props = {
      seed: context.seed,
      lines: this.propsLines,
      index: this.index,
      output: this.output,
      currentTime: this.currentTime,
      audioPower: this.audioPower,
      audioBands: this.audioBands,
      theme: context.theme,
      motion: resolveDioramaMotionParams(t, context.theme.animationIntensity),
      scene: {
        showLyrics: !context.hideLyrics,
        showParticles: t.showParticles,
        geometryVisibility: t.geometryVisibility,
        particleDensity: t.particleDensity,
        particleScale: t.particleScale,
        particleGlowEnabled: t.particleGlowEnabled,
        particleGlowIntensity: t.particleGlowIntensity,
        backgroundParticleCircumference: t.backgroundParticleCircumference,
        backgroundParticleRadial: t.backgroundParticleRadial,
        lyricsFontScale: context.lyricsFontScale || 1,
        glowIntensity: t.glowEnabled ? t.glowIntensity : 0,
        soulIntensity: t.soulEnabled ? t.soulIntensity : 0,
        soulActiveEnabled: t.soulEnabled && t.soulActiveEnabled,
        gradientIntensity: t.gradientEnabled ? t.gradientIntensity : 0,
        keywordColoringEnabled: t.keywordColoringEnabled,
      },
    };
    Host.render(this.root, React.createElement(Program, props));
    const delta = Math.min(0.1, Math.max(0, presentationSeconds - this.elapsed));
    return (
      (this.elapsed = presentationSeconds),
      Host.frame(this.root, delta, presentationSeconds),
      this.snapshot()
    );
  }
  snapshot() {
    const camera = this.root.state.camera,
      ops = [],
      added = [],
      used = /* @__PURE__ */ new Set(),
      resource = (value) => (
        used.add(value.id),
        this.resources.has(value.id) || (this.resources.set(value.id, value), added.push(value)),
        value.id
      ),
      pos = new THREE.Vector3();
    for (const object of Host.objects(this.root)) {
      if (!visible(object) || !object.material || object.material.visible === !1) continue;
      const material = object.material;
      if (object.isMesh) {
        if (!material.map || !material.map.image || !material.map.image.commands)
          throw Error('Diorama native plane requires original recorded text');
        const canvas = material.map.image,
          id = resource({
            id: canvas.id,
            kind: 'glyph',
            width: canvas.width,
            height: canvas.height,
            commands: canvas.commands,
          }),
          model = object.matrixWorld.clone(),
          mvp = new THREE.Matrix4()
            .multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
            .multiply(model),
          center = object.getWorldPosition(pos).clone().applyMatrix4(camera.matrixWorldInverse),
          dimensions = object.geometry.parameters;
        ops.push({
          id: 'plane-' + object.id,
          kind: 'plane',
          texture: id,
          mvp: mvp.elements.slice(),
          modelView: new THREE.Matrix4()
            .multiplyMatrices(camera.matrixWorldInverse, model)
            .elements.slice(),
          width: dimensions.width,
          height: dimensions.height,
          color: material.color.toArray(),
          alpha: material.opacity,
          additive: material.blending === THREE.AdditiveBlending,
          order: object.renderOrder,
          depth: -center.z,
          fog: !0,
        });
      } else if (object.isPoints) {
        const motes = material.isPointsMaterial,
          key = object.geometry.uuid + ':' + object.geometry.attributes.position.version;
        let parts = this.geometry.get(key);
        parts || ((parts = packGeometry(object.geometry, motes)), this.geometry.set(key, parts));
        const uniforms = {};
        if (motes)
          ((uniforms.uPrimaryColor = material.color.toArray()),
            (uniforms.uSizeBase = material.size),
            (uniforms.opacity = material.opacity));
        else
          for (const name of Object.keys(material.uniforms)) {
            const v = material.uniforms[name].value;
            uniforms[name] =
              v && v.toArray ? v.toArray() : ArrayBuffer.isView(v) ? Array.from(v) : v;
          }
        for (const part of parts)
          ops.push({
            id: 'points-' + object.id + ':' + part.id,
            kind: 'points',
            motes,
            texture: resource(part),
            points: part.points,
            uniforms,
            position: object.position.toArray(),
            order: object.renderOrder,
            depth: 0,
            additive: material.blending === THREE.AdditiveBlending,
          });
      }
    }
    ops.sort((a, b) => a.order - b.order || b.depth - a.depth || a.id.localeCompare(b.id));
    const retired = [];
    for (const id of this.resources.keys())
      used.has(id) || (this.resources.delete(id), retired.push(id));
    const geometryKeys = /* @__PURE__ */ new Set();
    for (const object of Host.objects(this.root))
      object.isPoints &&
        geometryKeys.add(object.geometry.uuid + ':' + object.geometry.attributes.position.version);
    for (const key of this.geometry.keys()) geometryKeys.has(key) || this.geometry.delete(key);
    return {
      time: this.time,
      presentationSeconds: this.elapsed,
      width: this.context.width,
      height: this.context.height,
      resolution: this.context.resolution || 1,
      view: camera.matrixWorldInverse.elements.slice(),
      projection: camera.projectionMatrix.elements.slice(),
      camera: camera.position.toArray(),
      quaternion: camera.quaternion.toArray(),
      fog: this.root.state.scene.fog
        ? { color: this.root.state.scene.fog.color.toArray(), near: 12, far: 30 }
        : null,
      resources: added,
      retired,
      ops,
      globalIndex: this.output.state.globalIndex,
      transitionEpoch: this.output.state.transitionEpoch,
      transitionOutgoingIndex: this.output.state.transitionOutgoingIndex,
      segments: this.output.state.seq.segments.length,
      cacheBytes: Array.from(this.resources.values()).reduce(
        (n, r) => n + (r.pixels ? r.pixels.length * 2 : r.width * r.height * 4),
        0
      ),
    };
  }
  destroy() {
    (Host.destroy(this.root), this.resources.clear(), this.geometry.clear());
  }
}
export { NativeDioramaScene, packFloatWords };
