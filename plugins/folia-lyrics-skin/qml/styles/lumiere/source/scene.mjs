// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/lumiere-reference.md.
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value })
    : (obj[key] = value);
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {})) if (__hasOwnProp.call(b, prop)) __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop)) __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
import { flatMap } from '../../../shared/text/compat.mjs';
import { createRng } from './lumiereRandom.mjs';
import { resolveThemeFontStack, resolveThemeFontWeight } from './fontStacks.mjs';
import { createBloomFilter } from './light/bloomFilter.mjs';
import {
  BURST_DURATION,
  burstLightBoost,
  createCrossBurst,
  MAX_BURSTS,
  planBursts,
} from './light/crossBurst.mjs';
import { createLightField } from './light/lightFieldShader.mjs';
import { createMotes } from './light/motes.mjs';
import { MAX_BEAMS, resolveBeams } from './light/rig.mjs';
import { createStarfall, starfallIgnition } from './light/starfall.mjs';
import { createLineArt, showLineArtLayer } from './lineart/lineArt.mjs';
import { buildShotIconArts } from './lineart/themeIcons.mjs';
import { keywordBurstColor, prepareLumiereKeywords } from './text/keywordColors.mjs';
import { createLyricEcho } from './text/lyricEcho.mjs';
import { createLyricWindow } from './text/lyricWindow.mjs';
import { CHAMPAGNE, hexOf, mixRgb, rgbOf, scaleRgb, WHITE } from './color.mjs';
import {
  createLumiereCamera,
  lumiereTypographyOfLine,
  resolveLumiereLeadShot,
} from './lumiereUnitLayout.mjs';
import { LUMIERE_BLOOM } from './types.mjs';
const lumiereScaleMask = 0 | 0;
const LUMIERE_NEUTRAL_OFFSET =
  (1354289308 ^ lumiereScaleMask) +
  Math.imul(4034148709 ^ lumiereScaleMask, 699505802 ^ lumiereScaleMask) -
  ((1354289308 ^ lumiereScaleMask) +
    Math.imul(4034148709 ^ lumiereScaleMask, 699505802 ^ lumiereScaleMask));
const HANDOFF = 0.9 + LUMIERE_NEUTRAL_OFFSET;
const GLARE_MOVE = 1.6;
const easeInOutCubic = (value) => {
  const t = Math.min(1, Math.max(0, value));
  return t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
};
const smooth = (value) => {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
};
const lerp = (a, b, k) => a + (b - a) * k;
const LUMIERE_SHADER_NO_DARK = [0, 0, 0, 0];
const UNLIT_COOL = [0.62, 0.68, 0.8];
const glowOf = (rgb, fallback) => {
  const peak = Math.max(...rgb);
  return peak < 0.04 ? fallback : scaleRgb(rgb, 1 / peak);
};
const resolveLumierePalette = (theme, themeMix = 0) => {
  const mix = Math.min(1, Math.max(0, themeMix));
  const accent = rgbOf(theme.accentColor, CHAMPAGNE);
  let light = mixRgb(mixRgb(CHAMPAGNE, accent, 0.18), glowOf(accent, CHAMPAGNE), mix);
  const peak = Math.max(...light, 1e-3);
  light = scaleRgb(light, 1 / peak);
  const warmLit = mixRgb(light, WHITE, 0.2);
  const primary = glowOf(rgbOf(theme.primaryColor, warmLit), warmLit);
  const secondary = theme.secondaryColor
    ? glowOf(rgbOf(theme.secondaryColor, primary), primary)
    : primary;
  return {
    light,
    lit: mixRgb(warmLit, mixRgb(primary, WHITE, 0.2), mix),
    unlit: mixRgb(mixRgb(light, UNLIT_COOL, 0.55), mixRgb(secondary, UNLIT_COOL, 0.35), mix),
  };
};
const blendRig = (from, to, k, glareK) => ({
  beams: [],
  fog: {
    density: lerp(from.fog.density, to.fog.density, k),
    tyndallBase: lerp(from.fog.tyndallBase, to.fog.tyndallBase, k),
    scale: lerp(from.fog.scale, to.fog.scale, k),
    driftX: lerp(from.fog.driftX, to.fog.driftX, k),
    driftY: lerp(from.fog.driftY, to.fog.driftY, k),
    warp: lerp(from.fog.warp, to.fog.warp, k),
    ambient: lerp(from.fog.ambient, to.fog.ambient, k),
  },
  // 光源移动走自己的缓动曲线（glareK），起步与到位都慢，不是匀速滑过去。
  glare:
    from.glare && to.glare
      ? {
          x: lerp(from.glare.x, to.glare.x, glareK),
          y: lerp(from.glare.y, to.glare.y, glareK),
          radius: lerp(from.glare.radius, to.glare.radius, glareK),
          intensity: lerp(from.glare.intensity, to.glare.intensity, glareK),
          streak: lerp(from.glare.streak, to.glare.streak, glareK),
        }
      : k < 0.5
        ? from.glare &&
          __spreadProps(__spreadValues({}, from.glare), {
            intensity: from.glare.intensity * (1 - k * 2),
          })
        : to.glare &&
          __spreadProps(__spreadValues({}, to.glare), {
            intensity: to.glare.intensity * (k * 2 - 1),
          }),
  // 焦散与干涉：前半段是上一个光位的（渐弱），后半段是新光位的（渐强）。
  caustic: fadeCaustic(k < 0.5 ? from.caustic : to.caustic, k < 0.5 ? 1 - k * 2 : k * 2 - 1),
  wave:
    k < 0.5
      ? from.wave &&
        __spreadProps(__spreadValues({}, from.wave), { strength: from.wave.strength * (1 - k * 2) })
      : to.wave &&
        __spreadProps(__spreadValues({}, to.wave), { strength: to.wave.strength * (k * 2 - 1) }),
});
const fadeCaustic = (caustic, k) =>
  caustic &&
  __spreadProps(__spreadValues({}, caustic), {
    inBeam: caustic.inBeam * k,
    floor:
      caustic.floor &&
      __spreadProps(__spreadValues({}, caustic.floor), { strength: caustic.floor.strength * k }),
  });
const createLumiereScene = (pixi, options) => {
  var _a, _b, _c;
  const { width, height, tuning, sprites } = options;
  const aspect = width / height;
  const palette = resolveLumierePalette(options.theme, tuning.themeColorMix);
  const shots = options.shots.length > 0 ? options.shots : [];
  const lead = resolveLumiereLeadShot(shots).profile;
  const rigs = shots.map((shot, index) =>
    shot.profile.light({
      aspect,
      random: createRng(`${options.seed}:${index}:${shot.profile.kind}:light`),
    })
  );
  const view = new pixi.Container();
  const stage = new pixi.Container();
  view.addChild(stage);
  const graphics = new pixi.Container();
  const overscan = Math.ceil(Math.max(width, height) * 0.02);
  const field = createLightField(pixi, width, height, overscan);
  const lineArts = shots.map((shot, index) =>
    createLineArt(pixi, {
      height,
      spec: shot.profile.lineArt({
        aspect,
        random: createRng(`${options.seed}:${index}:${shot.profile.kind}:art`),
      }),
      starTexture: sprites.star,
    })
  );
  const lineArtHolder = new pixi.Container();
  lineArts.forEach((layer) => lineArtHolder.addChild(layer.view));
  lineArtHolder.visible = tuning.lineArt;
  const textRegion = {
    cx: lead.region.cx * aspect,
    cy: lead.region.cy,
    w: lead.region.w * aspect,
    h: lead.region.h,
  };
  const iconArts = buildShotIconArts({
    icons: options.theme.lyricsIcons,
    enabled: tuning.themeIcons && !tuning.textOnly,
    shotKinds: shots.map((shot) => shot.profile.kind),
    seed: options.seed,
    aspect,
    avoid: textRegion,
  }).map((spec) => createLineArt(pixi, { height, spec, starTexture: sprites.star }));
  const iconHolder = new pixi.Container();
  iconArts.forEach((layer) => iconHolder.addChild(layer.view));
  const motes = createMotes(pixi, {
    width,
    height,
    seed: `${options.seed}:motes`,
    texture: sprites.dot,
    spec: __spreadProps(__spreadValues({}, lead.motes), {
      count: Math.round(lead.motes.count * tuning.moteAmount),
    }),
  });
  const baseStarfall = (_a = lead.starfall) != null ? _a : null;
  const unitDuration = options.endTime - options.startTime;
  const canOpen = options.opening && unitDuration >= 2 && !tuning.textOnly;
  const starfallSpec =
    baseStarfall && canOpen
      ? __spreadProps(__spreadValues({}, baseStarfall), {
          opening: Math.min(baseStarfall.opening, Math.max(0.8, unitDuration * 0.4)),
        })
      : baseStarfall;
  const starfall = starfallSpec
    ? createStarfall(pixi, {
        width,
        height,
        seed: options.seed,
        spec: starfallSpec,
        dot: sprites.dot,
        star: sprites.star,
        streak: sprites.streak,
      })
    : null;
  const opening = canOpen && starfallSpec !== null;
  const ignition = opening ? starfallIgnition(starfallSpec) : 0;
  const starOffset = starfallSpec && !opening ? starfallSpec.opening + 20 : 0;
  const echoSpec = (_b = lead.echo) != null ? _b : { size: 0.34 };
  const keywords = prepareLumiereKeywords(options.theme.wordColors, tuning.keywordColors);
  const echo =
    tuning.echo > 0 && !tuning.textOnly
      ? createLyricEcho(pixi, {
          width,
          height,
          lines: options.lines,
          font: resolveThemeFontStack(options.theme),
          weight: resolveThemeFontWeight(options.theme, 500),
          resolution: options.resolution,
          seed: options.seed,
          size: echoSpec.size,
          opacity: tuning.echo,
          keywords,
        })
      : null;
  graphics.addChild(
    field.view,
    ...(echo ? [echo.view] : []),
    ...(starfall ? [starfall.view] : []),
    lineArtHolder,
    iconHolder,
    motes.view
  );
  graphics.filterArea = new pixi.Rectangle(
    -overscan,
    -overscan,
    width + overscan * 2,
    height + overscan * 2
  );
  const mid = new pixi.Container();
  const typographyOfLine = lumiereTypographyOfLine(shots);
  const window = createLyricWindow(pixi, {
    width,
    height,
    lines: options.lines,
    font: resolveThemeFontStack(options.theme),
    weight: resolveThemeFontWeight(options.theme, 500),
    resolution: options.resolution,
    region: {
      cx: lead.region.cx * aspect,
      cy: lead.region.cy,
      w: lead.region.w * aspect,
      h: lead.region.h,
    },
    heroPx: lead.heroSize * height,
    neighbors: tuning.windowNeighbors,
    typography: (_c = options.typography) != null ? _c : lead.typography,
    typographyOf: options.typography ? void 0 : typographyOfLine,
    decay: __spreadProps(__spreadValues({}, lead.decay), {
      strength: lead.decay.strength * tuning.decay,
    }),
    alwaysFly: tuning.trails,
    seed: options.seed,
    sprites,
    letterSpacing: 0.04,
    keywords,
  });
  const burstTriggers = flatMap(shots, (shot, shotIndex) => {
    var _a2;
    const spec = (_a2 = shot.profile.burst) != null ? _a2 : null;
    if (!spec) return [];
    const covered = new Set(shot.lines);
    const color = mixRgb(palette.light, spec.tint, 0.85);
    return planBursts(
      spec,
      options.lines.map((_, lineIndex) => ({
        glyphs: covered.has(lineIndex) ? window.glyphTimes(lineIndex) : [],
      })),
      `${options.seed}:${shotIndex}`
    ).map((trigger) => {
      const keyword = window.glyphKeyword(trigger.lineIndex, trigger.glyphIndex);
      return __spreadProps(__spreadValues({}, trigger), {
        size: trigger.size * spec.size,
        color: keyword ? keywordBurstColor(color, palette.light, keyword) : color,
      });
    });
  }).sort((a, b) => a.time - b.time);
  const burst = burstTriggers.length > 0 ? createCrossBurst(pixi, { sprites }) : null;
  const text = new pixi.Container();
  if (burst) text.addChild(burst.view);
  text.addChild(window.view);
  const front = new pixi.Container();
  let frontMotes = null;
  if (lead.front && tuning.frontBokeh && !tuning.textOnly) {
    frontMotes = createMotes(pixi, {
      width,
      height,
      seed: `${options.seed}:front`,
      texture: sprites.bokeh,
      spec: lead.front,
    });
    front.addChild(frontMotes.view);
  }
  stage.addChild(graphics, mid, text, front);
  graphics.renderable = !tuning.textOnly;
  const bloomOf = (preset, multiplier, padding) =>
    createBloomFilter(
      pixi,
      __spreadProps(__spreadValues({}, preset), {
        strength: preset.strength * multiplier,
        padding,
        tint: [1, 1, 1],
      })
    );
  const graphicsBloom = bloomOf(LUMIERE_BLOOM.graphics, tuning.bloom, 0);
  const textBloom = bloomOf(LUMIERE_BLOOM.text, tuning.textBloom, 0);
  text.filterArea = new pixi.Rectangle(-width, -height, width * 3, height * 3);
  graphics.filters = tuning.bloom > 0 ? [graphicsBloom] : [];
  text.filters = tuning.textBloom > 0 ? [textBloom] : [];
  const lightHex = hexOf(palette.light);
  const rest = {
    x: width / 2,
    y: height / 2,
    pivotX: width / 2,
    pivotY: height / 2,
    scale: 1,
    rotation: 0,
  };
  const camera = createLumiereCamera({
    width,
    height,
    camera: lead.camera,
    startTime: options.startTime,
    endTime: options.endTime,
    sections: options.sections,
    animationIntensity: options.theme.animationIntensity,
  });
  const activeShot = (time) => {
    let index = 0;
    for (let i = 0; i < shots.length; i += 1) if (shots[i].startTime <= time) index = i;
    return index;
  };
  const update = (time) => {
    var _a2, _b2;
    const local = time - options.startTime;
    const enter = opening ? smooth((local - ignition + 0.4) / 1.6) : 1;
    const ignite = opening && local >= ignition ? 1.8 * Math.exp(-(local - ignition) / 0.35) : 0;
    const fadeOut = options.fadeOut;
    const exit = fadeOut
      ? 1 - smooth((time - fadeOut.start) / Math.max(fadeOut.end - fadeOut.start, 0.05))
      : 1;
    const intensity = enter * exit;
    const transform = camera(time);
    stage.pivot.set(transform.pivotX, transform.pivotY);
    stage.position.set(transform.x, transform.y);
    stage.scale.set(transform.scale);
    stage.rotation = transform.rotation;
    const events = [];
    let boost = 0;
    for (const trigger of burstTriggers) {
      const age = time - trigger.time;
      if (age < 0 || age > BURST_DURATION) continue;
      boost += burstLightBoost(age);
      if (events.length < MAX_BURSTS) {
        const anchor = window.glyphAnchor(trigger.lineIndex, trigger.glyphIndex, time);
        events.push({
          age,
          x: anchor.x,
          y: anchor.y + anchor.fontPx * trigger.dy,
          length: anchor.fontPx * trigger.size,
          color: trigger.color,
        });
      }
    }
    boost = Math.min(boost, 0.45);
    burst == null ? void 0 : burst.update(events);
    const audio =
      (_b2 = (_a2 = options.audioAt) == null ? void 0 : _a2.call(options, time)) != null
        ? _b2
        : { bass: 0, treble: 0, power: 0 };
    const response = tuning.audioResponse;
    const index = activeShot(time);
    const sinceShot = time - shots[index].startTime;
    const handoff = index > 0 ? smooth(sinceShot / HANDOFF) : 1;
    const glareK = index > 0 ? easeInOutCubic(sinceShot / GLARE_MOVE) : 1;
    const drive = (shotIndex, weight) => ({
      intensity: intensity * tuning.lightIntensity * (1 + boost) * weight,
      bass: Math.min(1, audio.bass) * response,
      color: palette.light,
      local: time - shots[shotIndex].startTime,
    });
    let beams = resolveBeams(rigs[index], time, aspect, drive(index, handoff));
    let rig = rigs[index];
    if (handoff < 1) {
      const previous = resolveBeams(rigs[index - 1], time, aspect, drive(index - 1, 1 - handoff));
      beams = [...beams, ...previous].sort((a, b) => b.intensity - a.intensity).slice(0, MAX_BEAMS);
    }
    if (handoff < 1 || glareK < 1) rig = blendRig(rigs[index - 1], rigs[index], handoff, glareK);
    if (!tuning.textOnly) {
      field.update({
        beams,
        rig,
        time,
        // 整体响度让烟雾浓一点（最多 +20%）。
        fogScale:
          tuning.fogDensity * (1 + boost * 0.5) * (1 + 0.2 * Math.min(1, audio.power) * response),
        color: palette.light,
        glareScale: intensity * tuning.lightIntensity * (1 + boost * 1.5 + ignite),
        dark: LUMIERE_SHADER_NO_DARK,
        octaves: tuning.fogOctaves,
        // 字排在领头光位的文字区里（整个单元一份）。
        textRegion: lead.region,
      });
      echo == null
        ? void 0
        : echo.update({ time, beams, color: lightHex, intensity: smooth(local / 1.2) * exit });
      starfall == null ? void 0 : starfall.update(local + starOffset, time, beams, lightHex, exit);
      lineArts.forEach((layer, shotIndex) => {
        var _a3;
        const shot = shots[shotIndex];
        const begin = shotIndex === 0 ? options.startTime + ignition - 0.6 : shot.startTime - 0.6;
        const out = shotIndex === shots.length - 1 ? 1 : 1 - smooth((time - shot.endTime) / 0.8);
        const base = smooth((time - begin) / 1.2) * out * exit;
        const draw = (time - begin) / 3.6;
        const fade = base * ((_a3 = shot.profile.artGain) != null ? _a3 : 1);
        const nextUse =
          time < begin ? begin : time <= shot.endTime + 0.8 ? time : Number.POSITIVE_INFINITY;
        const artShown = fade > 3e-3;
        showLineArtLayer(lineArtHolder, lineArts, shotIndex, artShown);
        if (artShown) layer.update(time, draw, fade, beams, lightHex);
        else layer.idle(time, nextUse);
        const icons = iconArts[shotIndex];
        if (icons) {
          const iconsShown = base > 3e-3;
          showLineArtLayer(iconHolder, iconArts, shotIndex, iconsShown);
          if (iconsShown) icons.update(time, draw, base, beams, lightHex);
          else icons.idle(time, nextUse);
        }
      });
      motes.update(time, beams, lightHex, exit * (1 + 0.5 * Math.min(1, audio.treble) * response));
      frontMotes == null ? void 0 : frontMotes.update(time, beams, lightHex, exit);
    }
    window.update({
      time,
      beams,
      litColor: palette.lit,
      unlitColor: palette.unlit,
      unlitAlpha: tuning.unlitOpacity,
      intensity: smooth(local / 0.6) * exit,
      hideTrails: tuning.hideTrails,
    });
  };
  return {
    view,
    graphics,
    mid,
    text,
    front,
    burstTimes: burstTriggers.map((trigger) => trigger.time),
    lineAnchor: window.lineAnchor,
    camera,
    rest,
    update,
    destroy: () => {
      graphics.filters = [];
      text.filters = [];
      graphicsBloom.destroy();
      textBloom.destroy();
      field.destroy();
      lineArts.forEach((layer) => layer.destroy());
      iconArts.forEach((layer) => layer.destroy());
      motes.destroy();
      frontMotes == null ? void 0 : frontMotes.destroy();
      burst == null ? void 0 : burst.destroy();
      starfall == null ? void 0 : starfall.destroy();
      echo == null ? void 0 : echo.destroy();
      window.destroy();
      view.destroy({ children: true });
    },
  };
};
export { LUMIERE_SHADER_NO_DARK, createLumiereScene, resolveLumierePalette };
