// Derived from Folia a8da4437 (AGPL-3.0-only); see tempera-reference.md.
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
const SHADOW_OFFSET_X = 0.06;
const SHADOW_OFFSET_Y = 0.08;
const SHADOW_ALPHA = 0.34;
const buildTemperaTextViews = (pixi, options) => {
  const { Text, TextStyle } = pixi;
  const { palette, fontFamily, fontWeight } = options;
  const views = [];
  const weightToken = String(fontWeight);
  options.placements.forEach((placement) => {
    var _a, _b;
    if (placement.char.trim().length === 0) return;
    const baseStyle = {
      fontFamily,
      fontWeight: weightToken,
      fontSize: placement.fontSize,
    };
    const display = new Text({
      text: placement.char,
      style: new TextStyle(
        __spreadProps(__spreadValues({}, baseStyle), {
          fill: (_a = placement.color) != null ? _a : palette.ink,
        })
      ),
    });
    display.anchor.set(0.5);
    display.position.set(placement.x, placement.y);
    display.rotation = placement.rotation;
    let shadow = null;
    if (options.shadowEnabled) {
      shadow = new Text({
        text: placement.char,
        style: new TextStyle(__spreadProps(__spreadValues({}, baseStyle), { fill: palette.ink })),
      });
      shadow.anchor.set(0.5);
      shadow.rotation = placement.rotation;
      options.textLayer.addChildAt(shadow, 0);
    }
    const echoes = [];
    for (let index = 0; index < options.echoCount; index += 1) {
      const echo = new Text({
        text: placement.char,
        style: new TextStyle(
          __spreadProps(__spreadValues({}, baseStyle), {
            fill: (_b = placement.color) != null ? _b : palette.tone4,
          })
        ),
      });
      echo.anchor.set(0.5);
      echo.rotation = placement.rotation;
      echo.visible = false;
      options.echoLayer.addChild(echo);
      echoes.push(echo);
    }
    (placement.color ? options.keywordLayer : options.textLayer).addChild(display);
    views.push({
      display,
      shadow,
      echoes,
      motion: {
        startTime: placement.startTime,
        settleTime: placement.settleTime,
        endTime: placement.endTime,
        enterX: placement.enterX,
        enterY: placement.enterY,
        enterRotation: placement.enterRotation,
        enterScale: placement.enterScale,
        rotation: placement.rotation,
        enterStyle: placement.enterStyle,
        releaseTime: placement.releaseTime,
        trackingX: placement.trackingX,
        trackingY: placement.trackingY,
      },
      baseX: placement.x,
      baseY: placement.y,
      shadowDX: placement.fontSize * SHADOW_OFFSET_X,
      shadowDY: placement.fontSize * SHADOW_OFFSET_Y,
    });
  });
  return views;
};
const buildTemperaFragmentViews = (pixi, options) => {
  const { Text, TextStyle } = pixi;
  options.fragments.forEach((fragment) => {
    const node = new Text({
      text: fragment.char,
      style: new TextStyle({
        fontFamily: options.fontFamily,
        fontWeight: String(options.fontWeight),
        fontSize: Math.max(12, options.baseFontSize * fragment.scale),
        fill: options.palette.ink,
      }),
    });
    node.anchor.set(0.5);
    node.position.set(fragment.x * options.width, fragment.y * options.height);
    node.rotation = fragment.rotation;
    node.alpha = 0.42;
    options.layer.addChild(node);
  });
};
const buildTemperaWatermark = (pixi, options) => {
  const { watermark } = options;
  if (!watermark.text.trim()) return;
  const node = new pixi.Text({
    text: watermark.text,
    style: new pixi.TextStyle({
      fontFamily: options.fontFamily,
      fontWeight: String(options.fontWeight),
      fontSize: Math.max(48, options.baseFontSize * watermark.scale),
      fill: options.palette.tone4,
    }),
  });
  node.anchor.set(0.5);
  node.position.set(watermark.x * options.width, watermark.y * options.height);
  node.rotation = watermark.rotation;
  node.alpha = 0.16;
  options.layer.addChild(node);
};
export { buildTemperaFragmentViews, buildTemperaTextViews, buildTemperaWatermark };
