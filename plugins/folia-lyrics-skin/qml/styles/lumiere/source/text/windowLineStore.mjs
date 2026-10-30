// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/lumiere-reference.md.
import { createRng, createRngAt } from '../lumiereRandom.mjs';
import { keywordTints } from './keywordColors.mjs';
import { buildLineMetas, buildLineView } from './windowLines.mjs';
import { DRIFT_SPEED } from './windowTiming.mjs';
import { freePlacements } from './windowSlots.mjs';
const PREBUILD = 2;
const KEEP_MARGIN = 2;
const createWindowLineStore = ({
  pixi,
  options,
  lineCount,
  measurer,
  limits,
  keywords: KEYWORDS,
  nextAlpha,
  glyphLayer,
  halos,
  stars,
  spots,
}) => {
  var _a;
  const { region, heroPx, sprites } = options;
  const spacing = (_a = options.letterSpacing) != null ? _a : 0;
  const metas = buildLineMetas(options.lines);
  const views = new Array(lineCount).fill(null);
  const built = [];
  const buildContext = {
    pixi,
    font: options.font,
    weight: options.weight,
    resolution: options.resolution,
    heroPx,
    spacing,
    seed: options.seed,
    sprites,
    measurer,
    limits,
    keywords: KEYWORDS,
    driftSpeed: DRIFT_SPEED,
    placementsOf: (lineIndex) =>
      freePlacements(createRng(`${options.seed}:placements:${lineIndex}`), region, nextAlpha),
  };
  let tintedFor = null;
  const insertByLine = (parent, child, position) => {
    if (position >= parent.children.length) parent.addChild(child);
    else parent.addChildAt(child, position);
  };
  const buildLine = (index) => {
    const meta = metas[index];
    const lineView = buildLineView(
      buildContext,
      index,
      meta,
      createRngAt(`${options.seed}:window`, meta.randomOffset)
    );
    let position = 0;
    while (position < built.length && built[position] < index) position += 1;
    built.splice(position, 0, index);
    insertByLine(glyphLayer, lineView.holder, position);
    insertByLine(halos, lineView.haloLayer, position);
    insertByLine(stars, lineView.starLayer, position);
    insertByLine(spots, lineView.spot, position);
    if (tintedFor)
      for (const glyph of lineView.keywordGlyphs)
        glyph.tints = keywordTints(tintedFor, glyph.keyword);
    views[index] = lineView;
    return lineView;
  };
  const releaseLine = (index) => {
    var _a2;
    const lineView = views[index];
    if (!lineView) return;
    views[index] = null;
    built.splice(built.indexOf(index), 1);
    for (const item of [lineView.holder, lineView.haloLayer, lineView.starLayer, lineView.spot]) {
      (_a2 = item.parent) == null ? void 0 : _a2.removeChild(item);
      item.destroy({ children: true });
    }
    lineView.layout.destroy();
  };
  const lineOf = (index) => {
    var _a2;
    return (_a2 = views[index]) != null ? _a2 : buildLine(index);
  };
  const refreshKeywordTints = (litColor) => {
    if (
      tintedFor &&
      tintedFor[0] === litColor[0] &&
      tintedFor[1] === litColor[1] &&
      tintedFor[2] === litColor[2]
    )
      return;
    tintedFor = [litColor[0], litColor[1], litColor[2]];
    for (const index of built) {
      for (const glyph of views[index].keywordGlyphs)
        glyph.tints = keywordTints(litColor, glyph.keyword);
    }
  };
  const syncBuilt = (low, high) => {
    for (let k = built.length - 1; k >= 0; k -= 1) {
      const index = built[k];
      if (index >= low && index <= high) continue;
      if (index < low - KEEP_MARGIN || index > high + KEEP_MARGIN) {
        releaseLine(index);
        continue;
      }
      const lineView = views[index];
      lineView.holder.visible = false;
      lineView.haloLayer.visible = false;
      lineView.starLayer.visible = false;
      lineView.spot.visible = false;
    }
  };
  const prebuild = (high) => {
    for (let index = high + 1; index <= Math.min(lineCount - 1, high + PREBUILD); index += 1) {
      if (views[index]) continue;
      buildLine(index);
      const lineView = views[index];
      lineView.holder.visible = false;
      lineView.haloLayer.visible = false;
      lineView.starLayer.visible = false;
      lineView.spot.visible = false;
      return;
    }
  };
  return {
    metas,
    lineOf,
    /** 已构建的第 index 行（没建的是 null）。 */
    viewAt: (index) => views[index],
    refreshKeywordTints,
    syncBuilt,
    prebuild,
    /** 释放全部已构建的行。 */
    releaseAll: () => {
      for (let k = built.length - 1; k >= 0; k -= 1) releaseLine(built[k]);
    },
  };
};
export { createWindowLineStore };
