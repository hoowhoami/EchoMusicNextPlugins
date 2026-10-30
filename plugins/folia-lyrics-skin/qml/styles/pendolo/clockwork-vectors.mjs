// Derived from Folia a8da4437 (AGPL-3.0-only). See pendolo-reference.md.
import { colorWithAlpha, parseColorChannels } from '../cadenza/color.mjs';
import {
  buildPendoloClockworkPalette,
  resolvePendoloClockworkAnchors,
} from './clockwork-scene.mjs';
const PENDOLO_MESH_STRIDE = 7;
const PENDOLO_MAX_PARTS = 32;
const PENDOLO_MITER_LIMIT = 10;
import { VectorBuilder as PendoloMeshBuilder } from './vector-builder.mjs';
const parseRgba = (color) => {
  const rgbaMatch = color.match(
    /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)/i
  );
  if (rgbaMatch) {
    return [
      Number(rgbaMatch[1]) / 255,
      Number(rgbaMatch[2]) / 255,
      Number(rgbaMatch[3]) / 255,
      rgbaMatch[4] === void 0 ? 1 : Number(rgbaMatch[4]),
    ];
  }
  const ch = parseColorChannels(color);
  if (!ch) return [1, 1, 1, 1];
  return [ch.r / 255, ch.g / 255, ch.b / 255, 1];
};
const buildPendoloClockworkCacheKey = (input) =>
  [
    // Exact, not rounded: the mesh bakes the centre in, so any move must rebuild it.
    input.centerX,
    input.centerY,
    Math.round(input.baseRadius * 10),
    Math.round(input.lyricRingRadius * 10),
    input.showGearDecor,
    input.primaryTextColor,
    input.accentTextColor,
  ].join('|');
const gearTeethPointsLocal = (radius, teethCount, toothDepth) => {
  const innerR = radius - toothDepth;
  const outerR = radius;
  const anglePerTooth = (Math.PI * 2) / teethCount;
  const pts = [];
  for (let i = 0; i < teethCount; i++) {
    const baseAngle = i * anglePerTooth;
    const angles = [
      baseAngle - anglePerTooth * 0.22,
      baseAngle - anglePerTooth * 0.12,
      baseAngle + anglePerTooth * 0.12,
      baseAngle + anglePerTooth * 0.22,
    ];
    const radii = [innerR, outerR, outerR, innerR];
    for (let k = 0; k < 4; k++) {
      pts.push({
        x: radii[k] * Math.cos(angles[k]),
        y: radii[k] * Math.sin(angles[k]),
      });
    }
  }
  return pts;
};
const appendGearLocal = (mesh, radius, teethCount, toothDepth, stroke, lineWidth, fill) => {
  const pts = gearTeethPointsLocal(radius, teethCount, toothDepth);
  if (fill) mesh.appendFilledPolygonFromCenter(0, 0, pts, parseRgba(fill));
  mesh.appendPolyline(pts, lineWidth, parseRgba(stroke), true);
};
const appendSpokedWheelLocal = (mesh, hubR, rimR, spokeCount, stroke, lineWidth) => {
  const rgba = parseRgba(stroke);
  mesh.appendCircleStroke(0, 0, hubR, lineWidth, rgba);
  mesh.appendCircleStroke(0, 0, rimR, lineWidth, rgba);
  const angleStep = (Math.PI * 2) / spokeCount;
  for (let i = 0; i < spokeCount; i++) {
    const a = i * angleStep;
    mesh.appendLine(
      hubR * Math.cos(a),
      hubR * Math.sin(a),
      rimR * Math.cos(a),
      rimR * Math.sin(a),
      lineWidth,
      rgba
    );
  }
  const midR = (hubR + rimR) * 0.5;
  const holeR = (rimR - hubR) * 0.22;
  for (let i = 0; i < spokeCount; i++) {
    const a = i * angleStep + angleStep * 0.5;
    mesh.appendCircleStroke(midR * Math.cos(a), midR * Math.sin(a), holeR, lineWidth, rgba, 24);
  }
};
const appendHairspringLocal = (mesh, startR, endR, coils, stroke, lineWidth) => {
  const totalAngle = coils * Math.PI * 2;
  const steps = Math.round(coils * 60);
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = t * totalAngle;
    const r = startR + (endR - startR) * Math.pow(t, 0.9);
    pts.push({ x: r * Math.cos(angle), y: r * Math.sin(angle) });
  }
  mesh.appendPolyline(pts, lineWidth, parseRgba(stroke), false);
};
const appendJewelLocal = (
  mesh,
  outerR,
  innerR,
  strokeOuter,
  strokeInner,
  outerWidth,
  innerWidth
) => {
  mesh.appendCircleStroke(0, 0, outerR, outerWidth, parseRgba(strokeOuter), 28);
  mesh.appendCircleStroke(0, 0, innerR, innerWidth, parseRgba(strokeInner), 20);
};
const fixedOrigin = (x, y) => () => ({ x, y });
const fixedRotation = (angle) => () => angle;
const buildPendoloClockworkCachedScene = (input) => {
  const key = buildPendoloClockworkCacheKey(input);
  const mesh = new PendoloMeshBuilder();
  const parts = [];
  const partKeys = /* @__PURE__ */ new Map();
  if (input.showGearDecor === 'none') {
    return { key, data: mesh.toFloat32(), parts, vertexCount: 0 };
  }
  const { centerX, centerY, baseRadius, primaryTextColor, accentTextColor, showGearDecor } = input;
  const anchors = resolvePendoloClockworkAnchors(input);
  const palette = buildPendoloClockworkPalette(primaryTextColor, accentTextColor, showGearDecor);
  const m = palette.decorOpacityMultiplier;
  const mainOrigin = fixedOrigin(centerX, centerY);
  const pushPart = (transformKey, build, getOrigin, getRotation) => {
    let partId = partKeys.get(transformKey);
    if (partId === void 0) {
      if (parts.length >= PENDOLO_MAX_PARTS) {
        console.warn('[pendoloClockworkMeshes] exceeded PENDOLO_MAX_PARTS');
        return;
      }
      partId = parts.length;
      partKeys.set(transformKey, partId);
      parts.push({ getOrigin, getRotation, transformKey });
    }
    mesh.setActivePartId(partId);
    build();
  };
  pushPart(
    'main-static',
    () => {
      const ringRgba = parseRgba(palette.primaryAlpha15);
      for (const r of [0.3, 0.6, 0.85, 1.15, 1.4].map((f) => baseRadius * f)) {
        mesh.appendCircleStroke(0, 0, r, 1, ringRgba);
      }
      const bevel = parseRgba(palette.bevelRing);
      mesh.appendCircleStroke(0, 0, baseRadius * 0.88, 0.8, bevel);
      mesh.appendCircleStroke(0, 0, baseRadius * 0.92, 0.8, bevel);
      appendJewelLocal(mesh, 4.5, 2.5, palette.jewelStrokeColor, palette.jewelFillColor, 1.2, 0.8);
    },
    mainOrigin,
    fixedRotation(0)
  );
  pushPart(
    'main-ticks',
    () => {
      const outerTickR = baseRadius * 1.15;
      for (let i = 0; i < 60; i++) {
        const angle = (i * Math.PI * 2) / 60;
        const isMajor = i % 5 === 0;
        const tickLen = isMajor ? 12 : 6;
        mesh.appendLine(
          outerTickR * Math.cos(angle),
          outerTickR * Math.sin(angle),
          (outerTickR + tickLen) * Math.cos(angle),
          (outerTickR + tickLen) * Math.sin(angle),
          isMajor ? 1.5 : 1,
          parseRgba(isMajor ? palette.accentAlpha35 : palette.primaryAlpha15)
        );
      }
    },
    mainOrigin,
    (motion) => motion.escapementAngle * 0.2
  );
  pushPart(
    'main-esc',
    () => {
      appendGearLocal(
        mesh,
        baseRadius + 8,
        36,
        10,
        palette.gearAccentAlpha,
        2.2,
        palette.mainGearFill
      );
      appendSpokedWheelLocal(
        mesh,
        baseRadius * 0.2,
        baseRadius * 0.85,
        6,
        palette.gearPrimaryAlpha,
        1.8
      );
      const guillocheInnerR = baseRadius * 0.62;
      const guillocheOuterR = baseRadius * 0.83;
      for (let i = 0; i < 48; i++) {
        const a = (i * Math.PI * 2) / 48;
        const innerOffset =
          i % 2 === 0
            ? guillocheInnerR
            : guillocheInnerR + (guillocheOuterR - guillocheInnerR) * 0.3;
        mesh.appendLine(
          innerOffset * Math.cos(a),
          innerOffset * Math.sin(a),
          guillocheOuterR * Math.cos(a),
          guillocheOuterR * Math.sin(a),
          0.7,
          parseRgba(i % 2 === 0 ? palette.primaryAlpha10 : palette.guillocheAlt)
        );
      }
      const rivetR = baseRadius * 0.96;
      const rivet = parseRgba(palette.rivetStroke);
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI * 2) / 12;
        mesh.appendCircleStroke(rivetR * Math.cos(a), rivetR * Math.sin(a), 2.2, 0.8, rivet, 16);
      }
    },
    mainOrigin,
    (motion) => motion.escapementAngle
  );
  pushPart(
    'main-sun',
    () => appendGearLocal(mesh, baseRadius * 0.22, 12, 6, palette.gearAccentStrongAlpha, 2.1),
    mainOrigin,
    (motion) => -motion.escapementAngle * 2.5
  );
  for (let planetIdx = 0; planetIdx < 3; planetIdx++) {
    const idx = planetIdx;
    const planetOrigin = (motion) => {
      const planetAngle = motion.escapementAngle * 0.4 + (idx * Math.PI * 2) / 3;
      return {
        x: centerX + anchors.orbitR * Math.cos(planetAngle),
        y: centerY + anchors.orbitR * Math.sin(planetAngle),
      };
    };
    pushPart(
      `planet-${idx}-gear`,
      () => appendGearLocal(mesh, anchors.planetR, 14, 5, palette.planetGearAlpha, 1.7),
      planetOrigin,
      (motion) => -motion.escapementAngle * 3 + idx * 0.5
    );
    pushPart(
      `planet-${idx}-jewel`,
      () =>
        appendJewelLocal(mesh, 3.5, 1.8, palette.jewelStrokeColor, palette.jewelFillColor, 1, 0.7),
      planetOrigin,
      fixedRotation(0)
    );
  }
  const balanceOrigin = fixedOrigin(anchors.balanceCx, anchors.balanceCy);
  pushPart(
    'balance-gear',
    () =>
      appendGearLocal(
        mesh,
        anchors.balanceR,
        20,
        7,
        palette.gearAccentStrongAlpha,
        2.1,
        palette.balanceGearFill
      ),
    balanceOrigin,
    (motion) => motion.phase * 0.1
  );
  pushPart(
    'balance-static',
    () => {
      mesh.appendCircleStroke(
        0,
        0,
        anchors.balanceR * 0.52,
        1.8,
        parseRgba(palette.gearPrimarySubtleAlpha)
      );
      appendJewelLocal(mesh, 3.5, 1.8, palette.jewelStrokeColor, palette.jewelFillColor, 1, 0.7);
    },
    balanceOrigin,
    fixedRotation(0)
  );
  pushPart(
    'hairspring',
    () =>
      appendHairspringLocal(
        mesh,
        anchors.balanceR * 0.56,
        anchors.balanceR * 0.88,
        3.5,
        colorWithAlpha(accentTextColor, 0.3 * m),
        0.8
      ),
    balanceOrigin,
    (motion) => motion.bassOscillation * 0.6 + motion.phase * 0.1 * 0.3
  );
  const transOrigin = fixedOrigin(anchors.transCx, anchors.transCy);
  pushPart(
    'trans-spin',
    () => {
      appendGearLocal(mesh, anchors.transR, 24, 7, palette.gearPrimaryAlpha, 1.8);
      appendSpokedWheelLocal(
        mesh,
        anchors.transR * 0.25,
        anchors.transR * 0.85,
        5,
        palette.gearPrimarySubtleAlpha,
        1.5
      );
      const genevaSpan = anchors.transR * 1.6;
      const genevaStep = genevaSpan / 10;
      const clipR = anchors.transR * 0.8;
      for (let i = 1; i <= 9; i++) {
        const yOff = -genevaSpan * 0.5 + i * genevaStep;
        const halfChord = Math.sqrt(Math.max(0, clipR * clipR - yOff * yOff));
        if (halfChord < 0.5) continue;
        mesh.appendLine(
          -halfChord,
          yOff,
          halfChord,
          yOff,
          0.7,
          parseRgba(i % 2 === 0 ? palette.primaryAlpha10 : palette.genevaAlt)
        );
      }
    },
    transOrigin,
    (motion) => {
      var _a;
      return -motion.escapementAngle * 1.4 + ((_a = motion.transBeatAngle) != null ? _a : 0);
    }
  );
  pushPart(
    'trans-jewel',
    () =>
      appendJewelLocal(mesh, 3.5, 1.8, palette.jewelStrokeColor, palette.jewelFillColor, 1, 0.7),
    transOrigin,
    fixedRotation(0)
  );
  const secondOrigin = fixedOrigin(anchors.secondGearCx, anchors.secondGearCy);
  pushPart(
    'second-spin',
    () =>
      appendGearLocal(
        mesh,
        anchors.secondGearR,
        15,
        5,
        palette.gearAccentAlpha,
        1.8,
        palette.secondGearFill
      ),
    secondOrigin,
    (motion) => motion.secondGearAngle
  );
  pushPart(
    'second-spoke',
    () =>
      appendSpokedWheelLocal(
        mesh,
        anchors.secondGearR * 0.28,
        anchors.secondGearR * 0.76,
        4,
        palette.gearPrimarySubtleAlpha,
        1.3
      ),
    secondOrigin,
    (motion) => -motion.secondGearAngle
  );
  pushPart(
    'second-jewel',
    () =>
      appendJewelLocal(mesh, 2.8, 1.5, palette.jewelStrokeColor, palette.jewelFillColor, 0.8, 0.6),
    secondOrigin,
    fixedRotation(0)
  );
  const idlerOrigin = fixedOrigin(anchors.idlerCx, anchors.idlerCy);
  pushPart(
    'idler-spin',
    () => appendGearLocal(mesh, anchors.idlerR, 10, 3.5, palette.idlerStroke, 1.3),
    idlerOrigin,
    (motion) => motion.escapementAngle * 2.2
  );
  pushPart(
    'idler-static',
    () => {
      mesh.appendCircleStroke(0, 0, anchors.idlerR * 0.45, 0.8, parseRgba(palette.idlerInner));
      appendJewelLocal(mesh, 2.2, 1.2, palette.jewelStrokeColor, palette.jewelFillColor, 0.7, 0.5);
    },
    idlerOrigin,
    fixedRotation(0)
  );
  pushPart(
    'axis',
    () => {
      const axis = parseRgba(palette.gearAccentStrongAlpha);
      mesh.appendLine(
        centerX + baseRadius * 0.8,
        centerY,
        centerX + anchors.focalAxisEndRadius,
        centerY,
        2,
        axis
      );
      mesh.appendArrowHead(centerX + anchors.focalAxisEndRadius, centerY, axis);
    },
    fixedOrigin(0, 0),
    fixedRotation(0)
  );
  return {
    key,
    data: mesh.toFloat32(),
    parts,
    vertexCount: mesh.vertexCount,
  };
};
const fillPendoloTransformTables = (parts, motion, origins, rotations) => {
  for (let i = 0; i < parts.length; i++) {
    const origin = parts[i].getOrigin(motion);
    origins[i * 2] = origin.x;
    origins[i * 2 + 1] = origin.y;
    rotations[i] = parts[i].getRotation(motion);
  }
};
export {
  PENDOLO_MAX_PARTS,
  PENDOLO_MESH_STRIDE,
  buildPendoloClockworkCacheKey,
  buildPendoloClockworkCachedScene,
  fillPendoloTransformTables,
};
