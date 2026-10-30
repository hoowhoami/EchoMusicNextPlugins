// Folia a8da4437 previewScale.ts, unchanged arithmetic. AGPL-3.0-only.
const placeStage = (stage, box, pick) => {
  if (!(stage.width > 0 && stage.height > 0 && box.width > 0 && box.height > 0)) {
    return null;
  }
  const scale = pick(box.width / stage.width, box.height / stage.height);
  return {
    scale,
    left: (box.width - stage.width * scale) / 2,
    top: (box.height - stage.height * scale) / 2,
  };
};
const coverStage = (stage, box) => placeStage(stage, box, Math.max);
const fitStage = (stage, box) => placeStage(stage, box, Math.min);
const frameStage = (stage, box, edge, fill = false, zoom = 1) => {
  if (!(box.width > 0 && box.height > 0)) {
    return null;
  }
  const grown = { width: box.width + 4 * edge, height: box.height + 4 * edge };
  const fitted = fitStage(stage, grown);
  if (!fitted) {
    return null;
  }
  if (!fill) {
    return {
      frame: {
        left: fitted.left - edge,
        top: fitted.top - edge,
        width: stage.width * fitted.scale - 2 * edge,
        height: stage.height * fitted.scale - 2 * edge,
      },
      place: { scale: fitted.scale, left: -edge, top: -edge },
      stage,
    };
  }
  const scale = fitted.scale * zoom;
  const drawn = {
    width: Math.max(stage.width, grown.width / scale),
    height: Math.max(stage.height, grown.height / scale),
  };
  return {
    frame: { left: -edge, top: -edge, width: box.width + 2 * edge, height: box.height + 2 * edge },
    place: {
      scale,
      left: (grown.width - drawn.width * scale) / 2 - edge,
      top: (grown.height - drawn.height * scale) / 2 - edge,
    },
    stage: drawn,
  };
};
const placeOnStage = (outer, inner) => ({
  scale: inner.scale / outer.scale,
  left: (inner.left - outer.left) / outer.scale,
  top: (inner.top - outer.top) / outer.scale,
});
const stageAboveBox = (framed) => -(framed.frame.top + framed.place.top);
const stageBelowBox = (framed, box) =>
  framed.frame.top + framed.place.top + framed.stage.height * framed.place.scale - box.height;
export { coverStage, fitStage, frameStage, placeOnStage, stageAboveBox, stageBelowBox };
