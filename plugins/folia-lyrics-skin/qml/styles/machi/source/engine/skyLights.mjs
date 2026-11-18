// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/machi/engine/skyLights.ts
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value })
    : (obj[key] = value);
var __publicField = (obj, key, value) =>
  __defNormalProp(obj, typeof key !== 'symbol' ? key + '' : key, value);
import * as THREE from '../../three.mjs';
import { MACHI_DAYLIGHT } from './environment.mjs';
const DIRECTIONS = {
  night: new THREE.Vector3(-6.5, 14, -5).normalize(),
  dusk: new THREE.Vector3(-11, 5.5, 6).normalize(),
  day: new THREE.Vector3(-6, 16, 8).normalize(),
};
const LIGHT_DISTANCE = 17;
const SHADOW_REDRAW_STEP = 0.012;
class MachiSkyLights {
  constructor(blend, shadowMapSize) {
    __publicField(this, 'blend', blend);
    __publicField(this, 'group', new THREE.Group());
    __publicField(this, 'moon');
    __publicField(this, 'hemi');
    __publicField(this, 'direction', new THREE.Vector3().copy(DIRECTIONS.night));
    __publicField(this, 'shadowDirection', new THREE.Vector3().copy(DIRECTIONS.night));
    this.group.name = 'SkyLights';
    this.hemi = new THREE.HemisphereLight(16777215, 16777215, 2.1);
    this.hemi.name = 'Lights/hemi';
    this.moon = new THREE.DirectionalLight(16777215, 1.35);
    this.moon.name = 'Lights/moon';
    this.moon.position.copy(this.direction).multiplyScalar(LIGHT_DISTANCE);
    this.moon.target.position.set(0, 0, 0);
    this.moon.castShadow = shadowMapSize > 0;
    this.moon.shadow.mapSize.setScalar(shadowMapSize > 0 ? shadowMapSize : 1024);
    const shadowCamera = this.moon.shadow.camera;
    shadowCamera.left = -9.5;
    shadowCamera.right = 9.5;
    shadowCamera.top = 9.5;
    shadowCamera.bottom = -9.5;
    shadowCamera.near = 1;
    shadowCamera.far = 40;
    this.moon.shadow.bias = -6e-4;
    this.moon.shadow.normalBias = 0.025;
    this.moon.shadow.radius = 3;
    this.moon.shadow.autoUpdate = false;
    this.group.add(this.hemi, this.moon, this.moon.target);
    this.sync();
  }
  /** 颜色（插值后的、按环境推出来的）写回。 */
  sync() {
    this.hemi.color.copy(this.blend.get('hemiSky'));
    this.hemi.groundColor.copy(this.blend.get('hemiGround'));
    this.moon.color.copy(this.blend.get('moon'));
  }
  /** 每帧：方向在夜、黄昏、白天之间插值，强度乘上闪电。太阳转过了一点就重画阴影图。 */
  update(frame) {
    const d = frame.daylight;
    if (d <= MACHI_DAYLIGHT.dusk)
      this.direction.lerpVectors(DIRECTIONS.night, DIRECTIONS.dusk, d / MACHI_DAYLIGHT.dusk);
    else
      this.direction.lerpVectors(
        DIRECTIONS.dusk,
        DIRECTIONS.day,
        (d - MACHI_DAYLIGHT.dusk) / (1 - MACHI_DAYLIGHT.dusk),
      );
    this.direction.normalize();
    this.moon.position.copy(this.direction).multiplyScalar(LIGHT_DISTANCE);
    if (this.direction.distanceTo(this.shadowDirection) > SHADOW_REDRAW_STEP) {
      this.shadowDirection.copy(this.direction);
      this.invalidateShadows();
    }
    this.hemi.intensity = frame.hemiIntensity * (1 + 1.5 * frame.flash);
    this.moon.intensity = frame.sunIntensity * (1 + 1.2 * frame.flash);
  }
  /** 下一帧重画阴影图。 */
  invalidateShadows() {
    this.moon.shadow.needsUpdate = true;
  }
  /** 太阳方向停在中间值上时，补一次精确的阴影。 */
  settleShadows() {
    if (this.direction.equals(this.shadowDirection)) return;
    this.shadowDirection.copy(this.direction);
    this.invalidateShadows();
  }
  /** 0 是不投阴影（画质里关了阴影；会重编一次着色器，只在改设置时发生）。 */
  setShadowMapSize(size) {
    var _a;
    const cast = size > 0;
    if (this.moon.castShadow !== cast) {
      this.moon.castShadow = cast;
      this.invalidateShadows();
    }
    if (!cast || this.moon.shadow.mapSize.x === size) return;
    this.moon.shadow.mapSize.set(size, size);
    (_a = this.moon.shadow.map) == null ? void 0 : _a.dispose();
    this.moon.shadow.map = null;
    this.invalidateShadows();
  }
  dispose() {
    var _a;
    (_a = this.moon.shadow.map) == null ? void 0 : _a.dispose();
  }
}
export { MachiSkyLights };
