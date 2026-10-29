// Derived from Folia a8da4437 (AGPL-3.0-only). See sonnet-reference.md.
var __defProp = Object.defineProperty,
  __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty,
  __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) =>
    key in obj
      ? __defProp(obj, key, { enumerable: !0, configurable: !0, writable: !0, value })
      : (obj[key] = value),
  __spreadValues = (a, b) => {
    for (var prop in b || (b = {})) __hasOwnProp.call(b, prop) && __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b))
        __propIsEnum.call(b, prop) && __defNormalProp(a, prop, b[prop]);
    return a;
  },
  __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
const clamp = (value, min, max) => Math.min(max, Math.max(min, value)),
  partitionFlowItems = (boxes) => {
    const items = [];
    let group = [];
    return (
      boxes.forEach((box) => {
        box.isHero || box.isSemiHero
          ? (group.length > 0 && items.push({ kind: 'group', group }),
            (group = []),
            items.push({ kind: 'zone', zone: box }))
          : group.push(box);
      }),
      group.length > 0 && items.push({ kind: 'group', group }),
      items
    );
  },
  flowToScreen = (space, rect, canvas) =>
    space.orientation === 'horizontal'
      ? {
          x: canvas.x + rect.u,
          y: canvas.y + rect.v,
          width: rect.uSize,
          height: rect.vSize,
        }
      : {
          x: canvas.x + canvas.width - rect.v - rect.vSize,
          y: canvas.y + rect.u,
          width: rect.vSize,
          height: rect.uSize,
        },
  attemptFlowLayout = (boxes, space, globalScale, chipGap, lineGap, seed) => {
    const items = partitionFlowItems(boxes),
      placements = [],
      floats = [];
    let vCursor = 0,
      ownBandOnEndSide = ((seed >> 1) & 1) === 1;
    const measure = (box) => {
        const useVertical =
            space.orientation === 'vertical' &&
            typeof box.verticalMeasuredWidth == 'number' &&
            typeof box.verticalMeasuredHeight == 'number' &&
            typeof box.verticalFontScale == 'number',
          baseScale = useVertical ? box.verticalFontScale : box.fontScale,
          width = (useVertical ? box.verticalMeasuredWidth : box.measuredWidth) * globalScale,
          height = (useVertical ? box.verticalMeasuredHeight : box.measuredHeight) * globalScale;
        return { useVertical, baseScale, width, height };
      },
      toFlowSize = (width, height) =>
        space.orientation === 'horizontal'
          ? { uSize: width, vSize: height }
          : { uSize: height, vSize: width },
      pruneFloats = () => {
        for (let index = floats.length - 1; index >= 0; index--)
          floats[index].vBottom <= vCursor && floats.splice(index, 1);
      };
    items.forEach((item, itemIndex) => {
      var _a;
      if ((pruneFloats(), item.kind === 'group')) {
        const reservedU = floats.reduce((sum, entry) => sum + entry.extent, 0),
          capacity = Math.max(chipGap * 2, space.u - reservedU),
          uStart = reservedU,
          chips = item.group.map((box) => {
            const dims2 = measure(box),
              flow2 = toFlowSize(dims2.width, dims2.height);
            return { box, dims: dims2, uSize: flow2.uSize, vSize: flow2.vSize, shrink: 1 };
          });
        let line = [],
          lineUsedU = 0;
        const flushLine = () => {
          if (line.length === 0) return;
          const lineV = Math.max(...line.map((chip) => chip.vSize * chip.shrink)),
            leftover = capacity - lineUsedU,
            spread =
              line.length > 1 && leftover > 0
                ? Math.min(leftover / (line.length - 1), chipGap * 2.5)
                : 0;
          let uCursor = uStart;
          (line.forEach((chip) => {
            const finalScale = chip.dims.baseScale * globalScale * chip.shrink;
            (placements.push({
              box: chip.box,
              rect: {
                u: uCursor,
                v: vCursor,
                uSize: chip.uSize * chip.shrink,
                vSize: chip.vSize * chip.shrink,
              },
              scale: finalScale,
              vertical: chip.dims.useVertical,
            }),
              (uCursor += chip.uSize * chip.shrink + chipGap + spread));
          }),
            (vCursor += lineV + lineGap),
            pruneFloats(),
            (line = []),
            (lineUsedU = 0));
        };
        (chips.forEach((chip) => {
          if (
            (lineUsedU + (line.length > 0 ? chipGap : 0) + chip.uSize > capacity &&
              line.length > 0 &&
              flushLine(),
            chip.uSize > capacity)
          ) {
            ((chip.shrink = Math.max(0.5, capacity / chip.uSize)),
              (lineUsedU = 0),
              line.push(chip),
              flushLine());
            return;
          }
          ((lineUsedU += (line.length > 0 ? chipGap : 0) + chip.uSize), line.push(chip));
        }),
          flushLine());
        return;
      }
      const zone = item.zone;
      ((vCursor = Math.max(vCursor, ...floats.map((entry) => entry.vBottom), 0)),
        (floats.length = 0));
      const dims = measure(zone),
        flow = toFlowSize(dims.width, dims.height),
        followedByGroup = ((_a = items[itemIndex + 1]) == null ? void 0 : _a.kind) === 'group',
        zoneShrink = Math.min(
          1,
          (space.u * (followedByGroup ? 0.62 : 0.9)) / flow.uSize,
          (space.v * 0.66) / flow.vSize
        ),
        uSize = flow.uSize * zoneShrink,
        vSize = flow.vSize * zoneShrink,
        u =
          items.length === 1
            ? (space.u - uSize) / 2
            : followedByGroup
              ? 0
              : ownBandOnEndSide
                ? space.u - uSize
                : 0;
      (placements.push({
        box: zone,
        rect: { u, v: vCursor, uSize, vSize },
        scale: dims.baseScale * globalScale * zoneShrink,
        vertical: dims.useVertical,
      }),
        followedByGroup
          ? floats.push({ extent: uSize + chipGap, vBottom: vCursor + vSize + lineGap })
          : ((vCursor += vSize + lineGap), (ownBandOnEndSide = !ownBandOnEndSide)));
    });
    const vTotal = placements.reduce(
      (max, placement) => Math.max(max, placement.rect.v + placement.rect.vSize),
      0
    );
    return { placements, vTotal };
  },
  layoutSonnetPosterBlocks = (boxes, width, height, baseFontSize, seed = 0) => {
    if (boxes.length === 0) return { placements: [], width: 0, height: 0, gap: 0 };
    const gap = clamp(baseFontSize * 0.35, 16, 40),
      chipGap = gap,
      lineGap = gap * 1.15,
      canvas = {
        x: -width * 0.42,
        y: -height * 0.4,
        width: width * 0.84,
        height: height * 0.8,
      },
      orientation = seed % 2 === 0 ? 'horizontal' : 'vertical',
      space =
        orientation === 'horizontal'
          ? { orientation, u: canvas.width, v: canvas.height }
          : { orientation, u: canvas.height, v: canvas.width };
    let attempt = attemptFlowLayout(boxes, space, 1, chipGap, lineGap, seed);
    for (const globalScale of [0.92, 0.84, 0.76, 0.68, 0.6, 0.52]) {
      if (attempt.vTotal <= space.v + 0.5) break;
      attempt = attemptFlowLayout(boxes, space, globalScale, chipGap, lineGap, seed);
    }
    if (attempt.vTotal > space.v) {
      const fitScale = space.v / attempt.vTotal;
      (attempt.placements.forEach((placement) => {
        ((placement.rect.u *= fitScale),
          (placement.rect.v *= fitScale),
          (placement.rect.uSize *= fitScale),
          (placement.rect.vSize *= fitScale),
          (placement.scale *= fitScale));
      }),
        (attempt.vTotal = space.v));
    }
    const vShift = Math.max(0, (space.v - attempt.vTotal) / 2);
    return (
      attempt.placements.forEach((placement) => {
        const { box } = placement,
          rect = __spreadProps(__spreadValues({}, placement.rect), {
            v: placement.rect.v + vShift,
          }),
          screen = flowToScreen(space, rect, canvas);
        ((box.fontScale = placement.scale),
          (box.measuredWidth = screen.width),
          (box.measuredHeight = screen.height),
          (box.x = screen.x + screen.width / 2),
          (box.y = screen.y + screen.height / 2),
          (box.rotation = 0),
          (box.vertical = placement.vertical),
          placement.vertical &&
            box.verticalDisplayText &&
            (box.displayText = box.verticalDisplayText),
          (box.layoutDirection = orientation === 'vertical' ? 'vertical' : 'horizontal'),
          orientation === 'horizontal'
            ? ((box.enterX =
                (screen.x + screen.width / 2 < 0 ? -1 : 1) * Math.min(28, baseFontSize * 0.45)),
              (box.enterY = Math.min(18, baseFontSize * 0.25)))
            : ((box.enterX = Math.min(18, baseFontSize * 0.25)),
              (box.enterY =
                (screen.y + screen.height / 2 < 0 ? -1 : 1) * Math.min(28, baseFontSize * 0.45))));
      }),
      { placements: boxes, width: canvas.width, height: canvas.height, gap }
    );
  };
export { layoutSonnetPosterBlocks };
