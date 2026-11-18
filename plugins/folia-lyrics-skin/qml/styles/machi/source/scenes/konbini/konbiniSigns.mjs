// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/machi/scenes/konbini/konbiniSigns.ts
import {
  document,
  OffscreenCanvas,
  globalThis,
  Image,
  ImageData,
  math as Math,
  performance,
  window,
  ResizeObserver,
  requestAnimationFrame,
  cancelAnimationFrame,
  AbortController,
  DOMException,
  Path2D,
} from '../../../environment.mjs';
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value })
    : (obj[key] = value);
var __publicField = (obj, key, value) =>
  __defNormalProp(obj, typeof key !== 'symbol' ? key + '' : key, value);
import * as THREE from '../../../three.mjs';
import { prepareWordColorMatchers } from '../../_shared/components/visualizer/wordColoring.mjs';
import { machiLightboxGroup, machiNeonGroup } from '../../engine/beatFx.mjs';
import { resolveMachiTickerText } from '../../engine/director.mjs';
import { MachiLedStrip } from '../../engine/ledStrip.mjs';
import { MachiLyricScreen } from '../../engine/lyricScreen.mjs';
import { createCanvas, createMachiMeasure } from '../../engine/signRaster.mjs';
import { BOARD, DEG, STORE } from './layout.mjs';
import {
  paintKonbiniAFrame,
  paintKonbiniFascia,
  paintKonbiniNeon,
  paintKonbiniPoster,
  paintKonbiniPylon,
  paintKonbiniRoofLogo,
} from './konbiniSignPaint.mjs';
const canvasTexture = (canvas, anisotropy = 4) => {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = anisotropy;
  return texture;
};
const placedPlane = (material, width, height, position, rotationY, name) => {
  const result = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  result.name = name;
  result.position.copy(position);
  result.rotation.y = rotationY;
  return result;
};
class KonbiniSigns {
  constructor(materials, blend, placements) {
    __publicField(this, 'group', new THREE.Group());
    __publicField(this, 'screen');
    __publicField(this, 'led');
    __publicField(this, 'boardTarget', null);
    __publicField(this, 'statics', []);
    __publicField(this, 'fascia');
    __publicField(this, 'pylon');
    __publicField(this, 'posters');
    __publicField(this, 'neon');
    __publicField(this, 'aFrame');
    __publicField(this, 'roofLogo');
    __publicField(this, 'roofCorners');
    __publicField(this, 'content', null);
    __publicField(this, 'lines', []);
    var _a;
    this.group.name = 'Signs';
    this.screen = new MachiLyricScreen(
      materials,
      blend,
      BOARD.faceWidth - 0.14,
      BOARD.faceHeight - 0.12,
    );
    placements.boardFaces.forEach((face, index) => {
      this.group.add(this.screen.createFace(face.position, face.rotationY, `Board/face${index}`));
    });
    const fasciaFront = placements.fasciaFaces[0];
    this.fascia = this.staticSign(
      materials,
      1600,
      Math.round((1600 * fasciaFront.height) / fasciaFront.width),
      0.78,
      'basic',
    );
    this.group.add(
      placedPlane(
        this.fascia.material,
        fasciaFront.width,
        fasciaFront.height,
        fasciaFront.position,
        fasciaFront.rotationY,
        'Fascia/front',
      ),
    );
    const fasciaRight = placements.fasciaFaces[1];
    this.led = new MachiLedStrip(materials, blend, fasciaRight.width, fasciaRight.height);
    this.group.add(this.led.createFace(fasciaRight.position, fasciaRight.rotationY, 'Fascia/led'));
    const pylonFace = placements.pylonFaces[0];
    this.pylon = this.staticSign(
      materials,
      384,
      Math.round((384 * pylonFace.height) / pylonFace.width),
      0.95,
      'basic',
    );
    placements.pylonFaces.forEach((face, index) => {
      this.group.add(
        placedPlane(
          this.pylon.material,
          face.width,
          face.height,
          face.position,
          face.rotationY,
          `Pylon/face${index}`,
        ),
      );
    });
    this.posters = [0, 1].map((index) => {
      const sign = this.staticSign(materials, 256, 364, 0.95, 'basic');
      const position = new THREE.Vector3(-4.05 + index * 0.72, 1.62, STORE.z1 - 0.075);
      this.group.add(placedPlane(sign.material, 0.56, 0.8, position, 0, `Poster${index}`));
      return sign;
    });
    this.neon = this.staticSign(materials, 256, 256, 1.6, 'additive');
    this.group.add(
      placedPlane(
        this.neon.material,
        0.86,
        0.86,
        new THREE.Vector3(STORE.x1 - 0.1, 1.55, -1.95),
        Math.PI / 2,
        'Neon',
      ),
    );
    const lid = placements.boardLid;
    const reach = Math.max(...lid.shape.map((point) => point.length())) * 1.02;
    this.roofLogo = this.staticSign(materials, 512, 512, 1, 'toon');
    this.roofLogo.texture.repeat.set(1 / (2 * reach), 1 / (2 * reach));
    this.roofLogo.texture.offset.set(0.5, 0.5);
    this.roofLogo.material.emissive.setScalar(0.32);
    this.roofLogo.material.emissiveMap = this.roofLogo.texture;
    this.roofCorners = lid.shape.map((point) => ({
      x: (point.x / (2 * reach) + 0.5) * 512,
      y: (0.5 - point.y / (2 * reach)) * 512,
    }));
    const logoGeometry = new THREE.ShapeGeometry(new THREE.Shape(lid.shape));
    logoGeometry.rotateX(-Math.PI / 2);
    const logo = new THREE.Mesh(logoGeometry, this.roofLogo.material);
    logo.name = 'Board/roofLogo';
    logo.position.set(lid.center.x, lid.topY + 4e-3, lid.center.z);
    logo.receiveShadow = true;
    this.group.add(logo);
    const aFace = placements.aFrameFaces[0];
    this.aFrame = this.staticSign(
      materials,
      256,
      Math.round((256 * aFace.height) / aFace.width),
      1,
      'toon',
    );
    const aMesh = placedPlane(
      this.aFrame.material,
      aFace.width,
      aFace.height,
      aFace.position,
      aFace.rotationY,
      'AFrame/face',
    );
    aMesh.rotateX(-((_a = aFace.lean) != null ? _a : 12 * DEG));
    this.group.add(aMesh);
  }
  /** 一块静态招牌：一张 canvas 贴图 + 材质（自发光、加色或受光）。 */
  staticSign(materials, width, height, level, kind) {
    const canvas = createCanvas(width, height);
    const texture = canvasTexture(canvas);
    const material =
      kind === 'toon'
        ? materials.track(
            new THREE.MeshToonMaterial({ map: texture, gradientMap: materials.gradient }),
          )
        : materials.track(
            new THREE.MeshBasicMaterial({
              map: texture,
              transparent: kind === 'additive',
              blending: kind === 'additive' ? THREE.AdditiveBlending : THREE.NormalBlending,
              depthWrite: kind !== 'additive',
            }),
          );
    if (material instanceof THREE.MeshBasicMaterial) material.color.setScalar(level);
    const sign = { canvas, texture, material, level };
    this.statics.push(sign);
    return sign;
  }
  /** 换歌 / 换主题：重画所有静态招牌，牌面按新颜色重画。 */
  setContent(content) {
    this.content = content;
    const { palette, font, song, fallbacks } = content;
    const icon = (index) =>
      content.icons.length
        ? content.icons[index % content.icons.length]
        : fallbacks[index % fallbacks.length];
    const title = song.title || song.album || 'KONBINI';
    paintKonbiniFascia(this.fascia.canvas, {
      font,
      title,
      icon: icon(0),
      fallbacks,
      base: palette.signBase,
      text: palette.signText,
      brand: palette.brand,
    });
    paintKonbiniPylon(this.pylon.canvas, {
      font,
      icon: icon(0),
      fallbacks,
      base: palette.signBase,
      brand: palette.brand,
    });
    paintKonbiniPoster(this.posters[0].canvas, {
      font,
      heading: song.artist || title,
      body: song.album || 'NOW ON SALE',
      icon: icon(1),
      fallbacks,
      background: palette.brand[1],
      ink: palette.brand[0],
      accent: palette.brand[2],
      tag: 'NEW',
    });
    paintKonbiniPoster(this.posters[1].canvas, {
      font,
      heading:
        content.theme.name && content.theme.provider === 'AI'
          ? content.theme.name
          : song.album || title,
      body: 'LIMITED',
      icon: icon(2),
      fallbacks,
      background: palette.brand[2],
      ink: '#ffffff',
      accent: palette.brand[0],
      tag: '\u9650\u5B9A',
    });
    paintKonbiniNeon(this.neon.canvas, icon(0), fallbacks, palette.neon);
    paintKonbiniRoofLogo(this.roofLogo.canvas, {
      corners: this.roofCorners,
      icon: icon(0),
      fallbacks,
      brand: palette.brand,
      rotation: -Math.PI / 4,
    });
    const hasThemeName = !!content.theme.name && content.theme.provider === 'AI';
    paintKonbiniAFrame(this.aFrame.canvas, {
      font,
      heading: '\u672C\u65E5\u306E\u30C6\u30FC\u30DE',
      title: hasThemeName ? content.theme.name : title,
      note: (hasThemeName ? content.theme.description : song.artist) || '',
      icon: icon(1),
      fallbacks,
      chalk: '#eef1ea',
      accent: palette.brand[0],
    });
    this.statics.forEach((sign) => {
      sign.texture.needsUpdate = true;
    });
    this.screen.setContent({
      palette,
      font,
      measure: createMachiMeasure(font),
      matchers: prepareWordColorMatchers(content.theme.wordColors),
      cardTitle: `\u266A ${song.title || 'KONBINI'}`,
      cardSubtitle: song.artist || song.album || '',
    });
    this.led.invalidate();
  }
  /** 换牌面（静态模式、暂停时直接换）。 */
  showBoard(target, lines, immediate, showText = true) {
    this.lines = lines;
    this.boardTarget = target;
    this.screen.show(target, lines, immediate, showText);
    this.led.invalidate();
  }
  /** 空闲时提前画好下一行。 */
  preheat(target, lines, showText) {
    this.screen.preheat(target, lines, showText);
  }
  /** 每帧：屏幕、LED 滚动、招牌亮度（闪烁、副歌、音频）。 */
  update(frame) {
    const content = this.content;
    if (!content) return;
    this.screen.update(frame);
    const chorus = this.screen.chorus;
    if (!this.led.hasText && this.boardTarget) {
      this.led.setText(
        resolveMachiTickerText(this.boardTarget, this.lines, content.song, 'KONBINI'),
        content.font,
      );
    }
    this.led.update({
      delta: frame.delta,
      staticMode: frame.staticMode,
      speed: 1 + 0.5 * chorus,
      audio: frame.audio,
    });
    const flicker = chorus > 0.5 ? 1 : frame.flicker;
    const lift = 1 + 0.08 * chorus + 0.05 * frame.audio;
    const { beat } = frame;
    this.setLevel(this.fascia, this.fascia.level * lift * machiLightboxGroup(beat, 2));
    this.setLevel(this.pylon, this.pylon.level * flicker * lift * machiLightboxGroup(beat, 0));
    const neonPulse = frame.staticMode
      ? 1
      : 0.85 + 0.15 * Math.sin(frame.ambientTime * 2.2) + 0.4 * chorus;
    this.setLevel(this.neon, this.neon.level * neonPulse * machiNeonGroup(beat, 0));
  }
  setLevel(sign, level) {
    if (sign.material instanceof THREE.MeshBasicMaterial) sign.material.color.setScalar(level);
  }
  /** 屏幕上有招牌在动画：暂停时也要继续出帧。 */
  get busy() {
    return this.screen.busy;
  }
  dispose() {
    this.screen.dispose();
    this.led.dispose();
    this.statics.forEach((sign) => sign.texture.dispose());
    this.group.traverse((object) => {
      if (
        object instanceof THREE.Mesh &&
        object.material !== this.screen.material &&
        object.material !== this.led.material
      )
        object.geometry.dispose();
    });
  }
}
export { KonbiniSigns };
