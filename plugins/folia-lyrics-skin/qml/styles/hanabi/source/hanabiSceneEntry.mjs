// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/hanabi/hanabiSceneEntry.ts
import { hashVisualizerSeed } from './_shared/components/visualizer/visualizerSeedHash.mjs';
import { resolveShotProfile, shotLine } from './program.mjs';
import { createHanabiScene } from './scene.mjs';
const hanabiSpinDirection = (programSeed) =>
  hashVisualizerSeed(`${programSeed}:spin-direction`) % 2 === 0 ? 1 : -1;
const BLUR_EPSILON = 0.3;
const buildHanabiSceneEntry = (pixi, context, index) => {
  var _a, _b;
  const { width, height, program } = context;
  const paragraph = program.paragraphs[index];
  const lineMap = new Map(
    paragraph.lineIndices.map((lineIndex, k) => [lineIndex, paragraph.lines[k]]),
  );
  const shots = paragraph.shots.map((shot) => ({
    id: shot.id,
    profile: resolveShotProfile(shot),
    startTime: shot.startTime,
    endTime: shot.endTime,
    isBridge: shot.isBridge,
    line: shot.isBridge ? null : shotLine(lineMap, shot.slices),
  }));
  if (shots.length === 0) {
    shots.push({
      id: paragraph.id,
      profile: resolveShotProfile({ kind: '' }),
      startTime: paragraph.startTime,
      endTime: paragraph.endTime,
      isBridge: true,
      line: null,
    });
  }
  const scene = createHanabiScene(pixi, {
    width,
    height,
    resolution: context.resolution,
    seed: `${program.seed}:${paragraph.id}`,
    theme: context.theme,
    tuning: context.tuning,
    shots,
    startTime: paragraph.startTime,
    endTime: paragraph.endTime,
    textures: context.textures,
    exitStart:
      (_b = (_a = paragraph.transitionOut) == null ? void 0 : _a.startTime) != null ? _b : null,
    motifs: context.motifs,
    icons: context.icons,
    spinDirection: hanabiSpinDirection(program.seed),
    opening:
      index === 0 && context.songTitle
        ? { title: context.songTitle, artist: context.songArtist }
        : null,
  });
  scene.setLayerVisibility({ graphics: true, text: context.showText, mid: false });
  const holder = new pixi.Container();
  holder.addChild(scene.view);
  holder.pivot.set(width / 2, height / 2);
  holder.position.set(width / 2, height / 2);
  holder.zIndex = index;
  return { index, scene, holder, blur: null };
};
const applyHanabiLayerFrame = (pixi, entry, frame, size, blurResolution) => {
  var _a, _b, _c, _d;
  entry.holder.alpha = frame.alpha;
  entry.holder.scale.set(frame.scale);
  entry.holder.position.set(size.width / 2, size.height / 2 + frame.y * size.height);
  entry.holder.rotation = frame.rotation;
  if (frame.blur > BLUR_EPSILON) {
    if (!entry.blur) {
      entry.blur = new pixi.BlurFilter({
        strength: frame.blur,
        quality: 3,
        resolution: blurResolution,
      });
      entry.blur.antialias = 'inherit';
    }
    entry.blur.strength = frame.blur;
    if (!((_a = entry.holder.filters) == null ? void 0 : _a.includes(entry.blur))) {
      (_c = (_b = entry.holder).filterArea) != null
        ? _c
        : (_b.filterArea = new pixi.Rectangle(
            -size.width,
            -size.height,
            size.width * 3,
            size.height * 3,
          ));
      entry.holder.filters = [entry.blur];
    }
  } else if ((_d = entry.holder.filters) == null ? void 0 : _d.length) {
    entry.holder.filters = [];
  }
};
const destroyHanabiSceneEntry = (entry) => {
  var _a, _b;
  (_a = entry.holder.parent) == null ? void 0 : _a.removeChild(entry.holder);
  entry.holder.filters = [];
  (_b = entry.blur) == null ? void 0 : _b.destroy();
  entry.blur = null;
  entry.holder.removeChild(entry.scene.view);
  entry.scene.destroy();
  entry.holder.destroy();
};
export {
  applyHanabiLayerFrame,
  buildHanabiSceneEntry,
  destroyHanabiSceneEntry,
  hanabiSpinDirection,
};
