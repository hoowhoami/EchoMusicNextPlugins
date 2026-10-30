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
import {
  LA_FOLIA_CYCLE_SECONDS,
  LA_FOLIA_STAFF_NOTES,
  LA_FOLIA_TOTAL_BEATS,
} from './sonnetStaffNotation.mjs';
const positiveModulo = (value, divisor) => ((value % divisor) + divisor) % divisor,
  buildSonnetStaffView = (
    pixi,
    placement,
    theme,
    baseFontSize,
    shotStartTime,
    width,
    containerLayer
  ) => {
    const wrapper = new pixi.Container();
    ((wrapper.rotation = placement.rotation),
      wrapper.position.set(placement.x, placement.y),
      (wrapper.alpha = 0));
    const staffWidth = Math.max(300, width * 0.6),
      lineSpacing = baseFontSize * 0.25,
      totalHeight = lineSpacing * 4,
      halfWidth = staffWidth / 2,
      halfHeight = totalHeight / 2,
      playableWidth = staffWidth * 0.92,
      beatWidth = playableWidth / LA_FOLIA_TOTAL_BEATS,
      timedNotes = [];
    let beatCursor = 0;
    for (const note of LA_FOLIA_STAFF_NOTES)
      (timedNotes.push(__spreadProps(__spreadValues({}, note), { startBeat: beatCursor })),
        (beatCursor += note.beats));
    const primaryColor = pixi.Color.shared.setValue(theme.primaryColor).toNumber(),
      accentColor = pixi.Color.shared.setValue(theme.accentColor).toNumber(),
      staffGraphics = new pixi.Graphics();
    for (let i = 0; i < 5; i++) {
      const y = -halfHeight + i * lineSpacing;
      (staffGraphics.moveTo(-halfWidth, y), staffGraphics.lineTo(halfWidth, y));
    }
    staffGraphics.stroke({ color: primaryColor, width: 2, alpha: 0.3 });
    for (let bar = 1; bar < 8; bar += 1) {
      const x = -playableWidth / 2 + beatWidth * bar * 3;
      (staffGraphics.moveTo(x, -halfHeight), staffGraphics.lineTo(x, halfHeight));
    }
    (staffGraphics.stroke({ color: primaryColor, width: 1, alpha: 0.16 }),
      staffGraphics.moveTo(-halfWidth + 10, -halfHeight),
      staffGraphics.lineTo(-halfWidth + 10, halfHeight),
      staffGraphics.stroke({ color: primaryColor, width: 4, alpha: 0.5 }),
      staffGraphics.moveTo(halfWidth - 10, -halfHeight),
      staffGraphics.lineTo(halfWidth - 10, halfHeight),
      staffGraphics.stroke({ color: primaryColor, width: 2, alpha: 0.5 }),
      staffGraphics.moveTo(halfWidth - 4, -halfHeight),
      staffGraphics.lineTo(halfWidth - 4, halfHeight),
      staffGraphics.stroke({ color: primaryColor, width: 6, alpha: 0.5 }));
    const noteGraphics = new pixi.Graphics();
    (wrapper.addChild(staffGraphics, noteGraphics), containerLayer.addChild(wrapper));
    const updateAnimation = (time) => {
      const cycleElapsed = positiveModulo(time - shotStartTime, LA_FOLIA_CYCLE_SECONDS),
        beatPosition = (cycleElapsed / LA_FOLIA_CYCLE_SECONDS) * LA_FOLIA_TOTAL_BEATS,
        cursorX = -playableWidth / 2 + beatWidth * beatPosition;
      (noteGraphics.clear(),
        noteGraphics.moveTo(cursorX, -halfHeight - lineSpacing * 0.8),
        noteGraphics.lineTo(cursorX, halfHeight + lineSpacing * 0.8),
        noteGraphics.stroke({ color: accentColor, width: 1.5, alpha: 0.34 }),
        timedNotes.forEach((note, index) => {
          const isActive =
              beatPosition >= note.startBeat && beatPosition < note.startBeat + note.beats,
            pulse = isActive ? (Math.sin(cycleElapsed * Math.PI * 5 + index * 0.4) + 1) * 0.5 : 0,
            noteScale = isActive ? 1 + pulse * 0.12 : 1,
            noteRadiusX = lineSpacing * 0.42 * noteScale,
            noteRadiusY = lineSpacing * 0.29 * noteScale,
            x = -playableWidth / 2 + beatWidth * (note.startBeat + note.beats * 0.5),
            y = halfHeight - note.staffStep * lineSpacing * 0.5,
            alpha = isActive ? 0.78 + pulse * 0.16 : 0.28 + (index % 3) * 0.03,
            stemDown = note.staffStep >= 6,
            stemX = x + (stemDown ? -noteRadiusX : noteRadiusX),
            stemEndY = y + (stemDown ? lineSpacing * 3.1 : -lineSpacing * 3.1);
          if (
            (noteGraphics
              .ellipse(x, y, noteRadiusX, noteRadiusY)
              .fill({ color: accentColor, alpha }),
            noteGraphics.moveTo(stemX, y),
            noteGraphics.lineTo(stemX, stemEndY),
            noteGraphics.stroke({
              color: primaryColor,
              width: 1.6,
              alpha: Math.min(0.9, alpha + 0.08),
            }),
            note.beats <= 0.5)
          ) {
            const flagY = stemEndY,
              flagDirection = stemDown ? -1 : 1;
            noteGraphics
              .moveTo(stemX, flagY)
              .quadraticCurveTo(
                stemX + lineSpacing * 1.1,
                flagY + lineSpacing * 0.55 * flagDirection,
                stemX + lineSpacing * 0.1,
                flagY + lineSpacing * flagDirection
              )
              .stroke({ color: primaryColor, width: 1.6, alpha: Math.min(0.9, alpha + 0.08) });
          }
          if (note.accidental === 'sharp') {
            const sharpX = x - noteRadiusX * 2.3,
              sharpHeight = lineSpacing * 1.15;
            noteGraphics
              .moveTo(sharpX - lineSpacing * 0.16, y - sharpHeight * 0.5)
              .lineTo(sharpX - lineSpacing * 0.16, y + sharpHeight * 0.5)
              .moveTo(sharpX + lineSpacing * 0.16, y - sharpHeight * 0.5)
              .lineTo(sharpX + lineSpacing * 0.16, y + sharpHeight * 0.5)
              .moveTo(sharpX - lineSpacing * 0.34, y - lineSpacing * 0.12)
              .lineTo(sharpX + lineSpacing * 0.34, y - lineSpacing * 0.28)
              .moveTo(sharpX - lineSpacing * 0.34, y + lineSpacing * 0.28)
              .lineTo(sharpX + lineSpacing * 0.34, y + lineSpacing * 0.12)
              .stroke({ color: primaryColor, width: 1.2, alpha: Math.min(0.86, alpha + 0.08) });
          }
        }));
    };
    return {
      display: wrapper,
      halo: null,
      baseX: placement.x,
      baseY: placement.y,
      enterX: placement.enterX,
      enterY: placement.enterY,
      entryRotation: 0,
      finalRotation: placement.rotation,
      startTime: shotStartTime,
      settleTime: shotStartTime + 0.5,
      zDepth: 0,
      isTextGlyph: !1,
      updateAnimation,
    };
  };
export { buildSonnetStaffView };
