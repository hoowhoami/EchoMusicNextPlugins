// Derived from Folia a8da4437 (AGPL-3.0-only); see diorama-reference.md.
import * as THREE from './three.mjs';
import { DIORAMA_HERO_DISTANCE } from './cameraPath.mjs';
import { resolveGlobal } from './dioramaSequencer.mjs';
import {
  DIORAMA_MOTE_LINES_AHEAD,
  DIORAMA_MOTE_LINES_BEHIND,
  dioramaMoteSlot,
  extendDioramaFrame,
  writeDioramaMoteLine,
} from './dioramaMoteField.mjs';
import {
  ACTIVE_LINE_OPACITY,
  LINE_FONT_SIZE,
  SOUL_ACTIVE_LIFT_EM,
  SOUL_ACTIVE_SWELL,
  SOUL_DETACH_LIFT_EM,
  SOUL_DETACH_SWELL,
  SOUL_HANDOFF_SECONDS,
  SOUL_MAX_OPACITY,
  UNIT_GLOW_MAX_OPACITY,
  UNSUNG_UNIT_OPACITY,
  clamp01,
  resolveNeighborLineOpacity,
  resolveOutgoingLineOpacity,
  smoothstep01,
  stepEnvelope,
} from './dioramaSceneConstants.mjs';
import {
  resolveDioramaUnitFill,
  resolveFrameFitScale,
  resolveGradientEnergy,
  resolveTextLife,
} from './dioramaSceneUnits.mjs';
const _sungTint = new THREE.Color(),
  _gradDeep = new THREE.Color(),
  _neutral = new THREE.Color(),
  recycleDioramaMoteWindow = ({
    written,
    motePositions,
    sequencer,
    globalIndex,
    total,
    moteCircumference,
    moteRadial,
    seed,
  }) => {
    const lastLine = Math.max(0, total - 1);
    let dirty = !1;
    for (
      let line = globalIndex - DIORAMA_MOTE_LINES_BEHIND;
      line <= globalIndex + DIORAMA_MOTE_LINES_AHEAD;
      line += 1
    ) {
      const slot = dioramaMoteSlot(line);
      if (written[slot] === line) continue;
      const anchorLine = Math.min(Math.max(line, 0), lastLine),
        resolved = resolveGlobal(sequencer, anchorLine);
      resolved &&
        (writeDioramaMoteLine(
          motePositions,
          extendDioramaFrame(resolved.frame, line - anchorLine),
          line,
          moteCircumference,
          moteRadial,
          seed
        ),
        (written[slot] = line),
        (dirty = !0));
    }
    return dirty;
  },
  updateDioramaNeighborLines = ({
    visibleLines,
    globalIndex,
    transitionOutgoingIndex,
    meshes,
    materials,
    rasters,
    camPos,
    fov,
    aspect,
    lyricsFontScale,
    damped,
  }) => {
    visibleLines.forEach(({ index, placement, isOutgoing }) => {
      if (index === globalIndex) return;
      const mesh = meshes.get(index),
        mat = materials.get(index),
        raster = rasters.get(index);
      if (!mesh || !mat || !raster) return;
      const worldWidth = raster.advancePx * (LINE_FONT_SIZE / raster.fontPx),
        fit =
          resolveFrameFitScale(worldWidth, DIORAMA_HERO_DISTANCE, fov, aspect) *
          placement.scale *
          lyricsFontScale;
      mesh.scale.setScalar(fit);
      const life = resolveTextLife(mesh.position.distanceTo(camPos));
      if (isOutgoing)
        ((mat.opacity =
          resolveOutgoingLineOpacity(
            index - (transitionOutgoingIndex != null ? transitionOutgoingIndex : index)
          ) * life),
          mat.color.copy(damped.primary));
      else {
        const offset = index - globalIndex;
        ((mat.opacity = resolveNeighborLineOpacity(offset) * life),
          mat.color.copy(offset < 0 ? damped.primary : damped.secondary));
      }
    });
  },
  updateDioramaActiveUnits = ({
    activeLineUnits,
    planes,
    lightVals,
    soulVals,
    now,
    delta,
    life,
    breath,
    powerEnv,
    damped,
    keywordUnitColors,
    glowIntensity,
    soulIntensity,
    soulActiveEnabled,
    gradientIntensity,
  }) => {
    const gradientStrength = Math.min(1.5, gradientIntensity),
      tintSeparation =
        Math.abs(damped.accent.r - damped.primary.r) +
        Math.abs(damped.accent.g - damped.primary.g) +
        Math.abs(damped.accent.b - damped.primary.b);
    if ((_sungTint.copy(damped.accent), tintSeparation < 0.4)) {
      const deficit = 1 - tintSeparation / 0.4,
        primaryLum = (damped.primary.r + damped.primary.g + damped.primary.b) / 3,
        accentLum = (damped.accent.r + damped.accent.g + damped.accent.b) / 3,
        targetLum =
          primaryLum > 0.5
            ? accentLum * (1 - 0.5 * deficit)
            : accentLum + (1 - accentLum) * 0.55 * deficit;
      (_neutral.setRGB(targetLum, targetLum, targetLum), _sungTint.lerp(_neutral, deficit));
    }
    const gradHot01 = Math.min(1, Math.max(0, (gradientStrength - 0.1) / 1.4));
    (_gradDeep.copy(_sungTint).multiplyScalar(0.8 - 0.18 * gradHot01),
      activeLineUnits.forEach((unit, i) => {
        var _a;
        const baseMat = planes.baseMats[i];
        if (!baseMat || !lightVals || !soulVals) return;
        const isCurrent = now >= unit.startTime && now < unit.endTime,
          sung = now >= unit.endTime,
          span = Math.max(unit.endTime - unit.startTime, 1e-3),
          sungMix = sung ? 1 : isCurrent ? clamp01((now - unit.startTime) / span) : 0;
        lightVals[i] = stepEnvelope(lightVals[i], isCurrent ? 1 : 0, 14, 4.5, delta);
        const gradientEnergy = resolveGradientEnergy(now, unit) * gradientStrength;
        baseMat.opacity = Math.min(
          1,
          (UNSUNG_UNIT_OPACITY +
            (ACTIVE_LINE_OPACITY - UNSUNG_UNIT_OPACITY) * sungMix +
            0.08 * Math.min(1, gradientEnergy)) *
            life
        );
        const unitTarget =
            (_a = keywordUnitColors.get(i)) != null
              ? _a
              : gradientIntensity > 0
                ? _gradDeep
                : _sungTint,
          unitProgress = gradientIntensity > 0 ? gradientEnergy : lightVals[i] * 1.15;
        resolveDioramaUnitFill(baseMat.color, damped.primary, unitTarget, unitProgress);
        const glowStrength = Math.min(1.5, glowIntensity),
          glowLevel = lightVals[i] * life * breath * (0.6 + 0.4 * powerEnv) * glowStrength,
          glowMat = planes.glowMats[i],
          glowMesh = planes.glowMeshes[i];
        (glowMat &&
          ((glowMat.opacity = Math.min(1, UNIT_GLOW_MAX_OPACITY * glowLevel)),
          glowMat.color.copy(baseMat.color)),
          glowMesh && (glowMesh.visible = glowLevel > 0.012),
          (soulVals[i] = stepEnvelope(soulVals[i], isCurrent ? 1 : 0, 12, 2.2, delta)));
        const soulMat = planes.soulMats[i],
          soulMesh = planes.soulMeshes[i];
        if (soulMat && soulMesh) {
          const soulStrength = Math.min(1.5, soulIntensity),
            flightMix = sung
              ? smoothstep01(clamp01((now - unit.endTime) / SOUL_HANDOFF_SECONDS))
              : 0,
            activeReach = soulActiveEnabled ? soulStrength : 0,
            onGlyph = (1 - flightMix) * activeReach,
            flown = flightMix * soulStrength;
          (soulMat.color.copy(baseMat.color),
            (soulMat.opacity = Math.min(
              1,
              SOUL_MAX_OPACITY * life * soulVals[i] * (onGlyph + flown)
            )),
            (soulMesh.position.y =
              LINE_FONT_SIZE * (SOUL_ACTIVE_LIFT_EM * onGlyph + SOUL_DETACH_LIFT_EM * flown)));
          const soulSwell = 1 + SOUL_ACTIVE_SWELL * onGlyph + SOUL_DETACH_SWELL * flown;
          (soulMesh.scale.set(soulSwell, soulSwell, 1),
            (soulMesh.visible = soulMat.opacity > 0.015));
        }
      }));
  };
export { recycleDioramaMoteWindow, updateDioramaActiveUnits, updateDioramaNeighborLines };
