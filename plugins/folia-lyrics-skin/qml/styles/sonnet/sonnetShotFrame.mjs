// Derived from Folia a8da4437 (AGPL-3.0-only). See sonnet-reference.md.
import { at } from './compat.mjs';
import {
  clamp01,
  easeSonnetInOut,
  resolveSegmentProgress,
  resolveSonnetAnimationScale,
  resolveSonnetBreathWeight,
  resolveSonnetCameraBreath,
  resolveSonnetFocusWeights,
  resolveSonnetSmoothedCameraFocus,
  resolveShotMotionFrame,
  resolveShotProgress,
  resolveTimelineShake,
} from './sonnetMotion.mjs';
import { hashSonnetSeed } from './sonnetRandom.mjs';
import { isSonnetEmphasisRole } from './sonnetTypographyLayout.mjs';
import { resolveSonnetSegmentCameraFocus } from './sonnetCameraTracking.mjs';
const readSonnetModulation = (modulation, key) => {
  const value = modulation == null ? void 0 : modulation[key];
  return typeof value == 'number' && Number.isFinite(value) ? value : 1;
};
let shotTrackingCache = /* @__PURE__ */ new WeakMap();
const resolveShotTracking = (view) => {
    const cached = shotTrackingCache.get(view);
    if (cached) return cached;
    let trackSegments = view.segments.filter(
      (s) => s.role !== 'decoration' && s.trackingGlyphs.length > 0
    );
    trackSegments.length === 0 &&
      (trackSegments = view.segments.filter((s) => s.trackingGlyphs.length > 0));
    const revealDoneTime =
        trackSegments.length > 0
          ? Math.max(
              ...trackSegments.map((segment) => {
                var _a, _b;
                return (_b =
                  (_a = at(segment.trackingGlyphs, -1)) == null ? void 0 : _a.startTime) != null
                  ? _b
                  : view.shot.endTime;
              })
            )
          : view.shot.endTime,
      focusRanges = trackSegments.map((segment) => {
        var _a, _b, _c, _d;
        return {
          startTime:
            (_b = (_a = segment.trackingGlyphs[0]) == null ? void 0 : _a.startTime) != null
              ? _b
              : view.shot.startTime,
          endTime:
            (_d = (_c = at(segment.trackingGlyphs, -1)) == null ? void 0 : _c.startTime) != null
              ? _d
              : view.shot.endTime,
        };
      }),
      tracking = { trackSegments, revealDoneTime, focusRanges };
    return (shotTrackingCache.set(view, tracking), tracking);
  },
  updateSonnetShot = (
    view,
    time,
    width,
    height,
    shakeIntensity,
    { tuning, theme, audioBands, audioPower: audioPowerValue, mod }
  ) => {
    var _a, _b, _c, _d, _e;
    const progress = resolveShotProgress(view.shot, time),
      motion = tuning.typographyMotion * resolveSonnetAnimationScale(theme) * mod('motionScale'),
      camera = tuning.cameraIntensity * resolveSonnetAnimationScale(theme) * mod('cameraScale'),
      cameraFrame = resolveShotMotionFrame(view.shot.kind, progress),
      gapTime = Math.max(0, time - view.shot.endTime);
    if (gapTime > 0) {
      const tailStart = resolveShotMotionFrame(view.shot.kind, 0.8),
        dx = cameraFrame.x - tailStart.x,
        dy = cameraFrame.y - tailStart.y,
        dScale = cameraFrame.scale - tailStart.scale,
        dRot = cameraFrame.rotation - tailStart.rotation,
        driftSpeed = (1 - Math.exp(-gapTime * 0.4)) * 2 * mod('driftScale');
      ((cameraFrame.x += dx * driftSpeed),
        (cameraFrame.y += dy * driftSpeed),
        (cameraFrame.scale += dScale * driftSpeed),
        (cameraFrame.rotation += dRot * driftSpeed));
    }
    const shake = resolveTimelineShake(time, shakeIntensity),
      { trackSegments, revealDoneTime, focusRanges } = resolveShotTracking(view),
      breathWeight = resolveSonnetBreathWeight(time, revealDoneTime);
    if (breathWeight > 0) {
      const breathPhase = ((hashSonnetSeed(view.shot.id) % 1024) / 1024) * Math.PI * 2,
        breath = resolveSonnetCameraBreath(time, breathPhase),
        breathScale = mod('breathScale');
      ((cameraFrame.x += breath.x * breathWeight * breathScale),
        (cameraFrame.y += breath.y * breathWeight * breathScale),
        (cameraFrame.scale += breath.scale * breathWeight * breathScale),
        (cameraFrame.rotation += breath.rotation * breathWeight * breathScale));
    }
    let currentFocusX = view.basePivotX,
      currentFocusY = view.basePivotY;
    if (trackSegments.length > 0) {
      const resolveFocusAtTime = (focusTime2) => {
          var _a2;
          let focusX = 0,
            focusY = 0;
          const focusWeights = resolveSonnetFocusWeights(focusRanges, focusTime2);
          for (let i = 0; i < trackSegments.length; i++) {
            const seg = trackSegments[i];
            if (seg.trackingGlyphs.length === 0) continue;
            const weight = (_a2 = focusWeights[i]) != null ? _a2 : 0,
              pos = resolveSonnetSegmentCameraFocus(seg.trackingGlyphs, focusTime2);
            ((focusX += pos.x * weight), (focusY += pos.y * weight));
          }
          return { x: focusX, y: focusY };
        },
        focusTime = Math.max(view.shot.startTime, Math.min(time, view.shot.endTime)),
        smoothedFocus = resolveSonnetSmoothedCameraFocus(
          focusTime,
          view.shot.startTime,
          view.shot.endTime,
          resolveFocusAtTime
        );
      ((currentFocusX = smoothedFocus.x), (currentFocusY = smoothedFocus.y));
    }
    if (
      (view.container.pivot.set(
        view.basePivotX + (currentFocusX - view.basePivotX) * camera,
        view.basePivotY + (currentFocusY - view.basePivotY) * camera
      ),
      view.container.scale.set(view.shot.camera.zoom * (1 + (cameraFrame.scale - 1) * camera)),
      (view.container.rotation =
        (view.shot.camera.rotation + cameraFrame.rotation + shake.rotation) * camera),
      (view.container.x = view.baseX + (cameraFrame.x * width + shake.x * width) * camera),
      (view.container.y = view.baseY + (cameraFrame.y * height + shake.y * height) * camera),
      view.mgParticleLayer)
    ) {
      const particleParallaxX =
          (cameraFrame.x * width + shake.x * width) * camera * 0.4 * mod('parallaxScale'),
        particleParallaxY =
          (cameraFrame.y * height + shake.y * height) * camera * 0.4 * mod('parallaxScale');
      (view.mgParticleLayer.position.set(particleParallaxX, particleParallaxY),
        (view.mgParticleLayer.rotation = (time - view.shot.startTime) * 0.05 * mod('mgSwimScale')),
        view.mgParticleLayer.scale.set(1 + (cameraFrame.scale - 1) * 0.3));
    }
    view.mgFixedGeoLayer && (view.mgFixedGeoLayer.rotation = -view.container.rotation);
    const audioBass =
        (_b = (_a = audioBands == null ? void 0 : audioBands.bass) == null ? void 0 : _a.get()) !=
        null
          ? _b
          : 0,
      audioPower = (_c = audioPowerValue == null ? void 0 : audioPowerValue.get()) != null ? _c : 0,
      audioVocal =
        (_e = (_d = audioBands == null ? void 0 : audioBands.vocal) == null ? void 0 : _d.get()) !=
        null
          ? _e
          : 0;
    (view.mgLayer.updateTime &&
      view.mgLayer.updateTime(
        time,
        view.shot.cues,
        view.shot.startTime,
        view.shot.endTime,
        audioBass,
        audioPower,
        audioVocal
      ),
      view.segments.forEach((segmentView) => {
        const guide = segmentView.guide,
          guideActive = time >= guide.startTime && time <= guide.endTime;
        if (
          ((guide.container.visible = guideActive && tuning.showGuide && !tuning.showOnlyText),
          guideActive)
        ) {
          const guideProgress = clamp01(
            (time - guide.startTime) / Math.max(1e-3, guide.endTime - guide.startTime)
          );
          if (guide.update) ((guide.container.alpha = guide.maxAlpha), guide.update(guideProgress));
          else {
            const eased = easeSonnetInOut(guideProgress);
            ((guide.container.alpha = Math.sin(eased * Math.PI) * guide.maxAlpha),
              guide.container.scale.set(0.76 + eased * 0.24));
          }
        }
        const frameDecor = segmentView.frameDecor;
        if (frameDecor) {
          const frameVisible = tuning.showFixedGeo && !tuning.showOnlyText;
          ((frameDecor.container.visible = frameVisible),
            frameVisible &&
              frameDecor.update(
                clamp01(
                  (time - frameDecor.startTime) /
                    Math.max(1e-3, frameDecor.endTime - frameDecor.startTime)
                )
              ));
        }
        segmentView.glyphs.forEach((glyph) => {
          var _a2;
          const glyphProgress = resolveSegmentProgress(glyph.startTime, glyph.settleTime, time),
            waiting = time < glyph.startTime,
            offset = (1 - glyphProgress) * motion,
            coreAlpha = waiting ? 0 : 0.16 + glyphProgress * 0.84,
            haloAlpha = waiting ? 0 : 1 - glyphProgress * 0.28,
            scale =
              isSonnetEmphasisRole(segmentView.role) && view.shot.kind === 'type-impact'
                ? 0.52 + glyphProgress * 0.48
                : 0.86 + glyphProgress * 0.14,
            x = glyph.baseX + glyph.enterX * offset,
            y = glyph.baseY + glyph.enterY * offset,
            rotation = glyph.finalRotation + glyph.entryRotation * offset,
            isGiantDecorativeText = segmentView.role === 'decoration',
            showTextGlyph = glyph.isTextGlyph !== !1,
            glyphVisible = tuning.showOnlyText
              ? showTextGlyph && (!isGiantDecorativeText || tuning.showGiantDecorativeText)
              : (!glyph.isBackgroundShape || tuning.showBackgroundDecor) &&
                (!isGiantDecorativeText || tuning.showGiantDecorativeText),
            depth = glyph.zDepth || 0,
            parallaxScale = mod('parallaxScale'),
            parallaxX =
              (cameraFrame.x * width + shake.x * width) * camera * depth * 2.5 * parallaxScale,
            parallaxY =
              (cameraFrame.y * height + shake.y * height) * camera * depth * 2.5 * parallaxScale,
            depthScale = 1 + depth * 0.45 * parallaxScale;
          if (
            ((glyph.display.alpha = coreAlpha),
            (glyph.display.visible = glyphVisible),
            glyph.display.scale.set(scale * depthScale),
            glyph.display.position.set(x + parallaxX, y + parallaxY),
            (glyph.display.rotation = rotation),
            glyph.halo &&
              ((glyph.halo.alpha = haloAlpha),
              glyph.halo.scale.set(scale * (1.08 - glyphProgress * 0.08)),
              glyph.halo.position.set(x, y),
              (glyph.halo.rotation = rotation)),
            glyph.caWrapper && glyph.caCyan && glyph.caRed && glyph.caOffset)
          ) {
            const ca = glyph.caWrapper;
            ((ca.visible = glyphVisible && !tuning.showOnlyText),
              (ca.alpha = coreAlpha),
              ca.scale.copyFrom(glyph.display.scale),
              ca.position.copyFrom(glyph.display.position),
              (ca.rotation = rotation));
            const mergeEased = easeSonnetInOut(glyphProgress),
              currentOffset = glyph.caOffset * (1 - mergeEased * 0.8) * mod('caScale');
            (glyph.caCyan.position.set(-currentOffset, currentOffset * 0.5),
              glyph.caRed.position.set(currentOffset, -currentOffset * 0.5));
          }
          if (glyph.ghosts && glyph.ghostDuration) {
            const ghostProgress = clamp01((time - glyph.startTime) / glyph.ghostDuration),
              ghostActive = glyphVisible && ghostProgress > 0 && ghostProgress < 1,
              envelope =
                ghostProgress <= 0.2
                  ? ghostProgress / 0.2
                  : Math.pow(1 - (ghostProgress - 0.2) / 0.8, 2),
              spread = (1 - Math.pow(1 - ghostProgress, 3)) * mod('ghostScale');
            for (const ghost of glyph.ghosts)
              ((ghost.node.visible = ghostActive),
                ghostActive &&
                  (ghost.node.position.set(ghost.dirX * spread, ghost.dirY * spread),
                  (ghost.node.alpha = envelope * ghost.alphaBase)));
          }
          (_a2 = glyph.updateAnimation) == null || _a2.call(glyph, time);
        });
      }));
  },
  clearShotTrackingCache = () => {
    shotTrackingCache = /* @__PURE__ */ new WeakMap();
  };
export { clearShotTrackingCache, readSonnetModulation, updateSonnetShot };
