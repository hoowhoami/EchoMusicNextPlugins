// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/lumiere-reference.md.
import { profileOf } from './catalog.mjs';
import { cameraBetween } from './lumiereKernel.mjs';
import { createLumiereScene } from './scene.mjs';
const buildLumiereSceneShots = (paragraph) => {
  const localLine = new Map(paragraph.lineIndices.map((lineIndex, index) => [lineIndex, index]));
  const shots = paragraph.shots.map((shot) => ({
    profile: profileOf(shot.kind),
    startTime: shot.startTime,
    endTime: shot.endTime,
    lines: shot.lineIndices
      .map((index) => localLine.get(index))
      .filter((index) => index !== void 0),
  }));
  if (shots.length === 0) {
    shots.push({
      profile: profileOf(''),
      startTime: paragraph.startTime,
      endTime: paragraph.endTime,
      lines: [],
    });
  }
  return shots;
};
const createLumiereUnit = (pixi, options) => {
  var _a;
  const { paragraph } = options;
  const scene = createLumiereScene(pixi, {
    width: options.width,
    height: options.height,
    resolution: options.resolution,
    seed: `${options.programSeed}:${paragraph.id}`,
    theme: options.theme,
    tuning: options.tuning,
    lines: paragraph.lines,
    shots: buildLumiereSceneShots(paragraph),
    startTime: paragraph.startTime,
    endTime: paragraph.endTime,
    sprites: options.sprites,
    opening: paragraph.opening,
    fadeOut:
      ((_a = paragraph.transitionOut) == null ? void 0 : _a.kind) === 'lights-out'
        ? { start: paragraph.transitionOut.startTime, end: paragraph.transitionOut.endTime }
        : null,
    audioAt: options.audioAt,
    typography: options.typography,
    sections: paragraph.sections,
  });
  const shotAt = (time) => {
    let found = paragraph.shots[0];
    for (const shot of paragraph.shots) if (shot.startTime <= time) found = shot;
    return found;
  };
  return {
    paragraph,
    scene,
    update: (time) => scene.update(time),
    cameraMatrix: (time) => cameraBetween(scene.rest, scene.camera(time)),
    shotAt,
    destroy: () => scene.destroy(),
  };
};
export { buildLumiereSceneShots, createLumiereUnit };
