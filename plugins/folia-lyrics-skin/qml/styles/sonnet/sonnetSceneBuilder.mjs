// Derived from Folia a8da4437 (AGPL-3.0-only). See sonnet-reference.md.
import { flat } from './compat.mjs';
import { normalizeFontWeight, resolveThemeFontStack } from './font-stacks.mjs';
import { hashSonnetSeed } from './sonnetRandom.mjs';
import { buildSonnetShotMg } from './sonnetShotMg.mjs';
import {
  applySonnetScenePostProcess,
  createSonnetHaloLayer,
  resolveSonnetPostProcessProfile,
} from './sonnetPostProcess.mjs';
import { isSonnetLayoutSegment, resolveSonnetTypographyLayout } from './sonnetTypographyLayout.mjs';
import { buildSonnetTextView } from './sonnetTextViewBuilder.mjs';
import { createSonnetGlitchEffect } from './sonnetGlitchFilter.mjs';
import { buildSonnetMeasuredBoundsDebug, createSonnetShotDebugInfo } from './sonnetDebug.mjs';
import { resolveSonnetGeoVariant } from './sonnetSpatialMgGeometry.mjs';
import { resolveSonnetBackgroundMgVariant } from './sonnetBackgroundMgVariants.mjs';
import { resolveSonnetBackgroundDecorVariant } from './sonnetBackgroundDecor.mjs';
import { resolveSonnetFixedGeoVariant } from './sonnetFixedGeoVariants.mjs';
const colorNumber = (pixi, color) => pixi.Color.shared.setValue(color).toNumber(),
  shouldDrawSonnetSceneBackdrop = (showBackgroundMg, transparentBackground) =>
    showBackgroundMg && !transparentBackground,
  buildSonnetScene = (pixi, options, iconTextures, paragraph) => {
    var _a, _b;
    const { Container, Graphics, Sprite } = pixi,
      width = Math.max(options.host.clientWidth, 320),
      height = Math.max(options.host.clientHeight, 240),
      container = new Container(),
      sceneBackgroundLayer = new Container(),
      showOnlyText = options.tuning.showOnlyText,
      showBackgroundMg = !showOnlyText && options.tuning.showBackgroundMg,
      showFixedGeo = !showOnlyText && options.tuning.showFixedGeo,
      showBackgroundDecor = !showOnlyText && options.tuning.showBackgroundDecor,
      showGuide = !showOnlyText && options.tuning.showGuide,
      showOuterMetadata = !showOnlyText && options.tuning.outerFrameMode === 'full',
      sceneSeed = hashSonnetSeed(`${options.programSeed}:${paragraph.id}`),
      postProcessProfile = resolveSonnetPostProcessProfile(
        options.theme,
        options.tuning,
        options.staticMode
      ),
      fontFamily = resolveThemeFontStack(options.theme),
      manualFontWeight = normalizeFontWeight(options.theme.fontWeight),
      postProcessFilters = [];
    if (showBackgroundMg) {
      const density = Math.round(4 + options.tuning.mgDensity * 5);
      shouldDrawSonnetSceneBackdrop(showBackgroundMg, options.transparentBackground) &&
        sceneBackgroundLayer.addChild(
          new Graphics()
            .rect(0, 0, width, height)
            .fill({ color: colorNumber(pixi, options.theme.backgroundColor), alpha: 0.1 })
        );
      for (let index = 0; index < density; index += 1) {
        const x = (((sceneSeed + index * 97) % 997) / 997) * width,
          y = (((sceneSeed + index * 193) % 991) / 991) * height,
          length = 32 + ((sceneSeed + index * 43) % 180);
        sceneBackgroundLayer.addChild(
          new Graphics()
            .moveTo(x, y)
            .lineTo(Math.min(width, x + length), y)
            .stroke({
              color: colorNumber(
                pixi,
                index % 2 ? options.theme.secondaryColor : options.theme.accentColor
              ),
              width: index % 3 === 0 ? 2 : 1,
              alpha: 0.12 + (index % 4) * 0.04,
            })
        );
      }
    }
    const { Text, TextStyle } = pixi;
    if (options.theme.name) {
      const nameText = new Text({
        text: `[ THEME ] ${options.theme.name.toUpperCase()}`,
        style: new TextStyle({
          fontFamily,
          fontWeight: manualFontWeight === null ? 'bold' : String(manualFontWeight),
          fontSize: 14,
          fill: options.theme.primaryColor,
          letterSpacing: 4,
        }),
      });
      ((nameText.alpha = 0.2),
        (nameText.rotation = -Math.PI / 2),
        nameText.position.set(20, height - 20),
        nameText.anchor.set(0, 1),
        showOuterMetadata && sceneBackgroundLayer.addChild(nameText));
    }
    if (options.theme.description) {
      const descText = new Text({
        text: options.theme.description,
        style: new TextStyle({
          fontFamily,
          fontWeight: manualFontWeight === null ? void 0 : String(manualFontWeight),
          fontSize: 12,
          fill: options.theme.secondaryColor,
          wordWrap: !0,
          wordWrapWidth: width * 0.3,
        }),
      });
      ((descText.alpha = 0.3),
        descText.position.set(width - 20, 20),
        descText.anchor.set(1, 0),
        showOuterMetadata && sceneBackgroundLayer.addChild(descText));
    }
    container.addChild(sceneBackgroundLayer);
    const shots = paragraph.shots.map((shot, shotIndex) => {
      const shotContainer = new Container(),
        linesSegments = shot.lineIndices
          .map((lineIndex) => paragraph.lines.find((item) => item.sourceIndex === lineIndex))
          .filter(Boolean)
          .map((line) => line.segments.filter(isSonnetLayoutSegment))
          .filter((segs) => segs.length > 0),
        segments = flat(linesSegments),
        wordCount = Math.max(1, segments.filter((segment) => segment.isWordLike).length),
        heroScale = shot.kind === 'type-impact' ? 1.55 : shot.kind === 'quiet-tableau' ? 0.82 : 1,
        fontSize = Math.max(
          24,
          Math.min(
            112,
            (width / Math.max(7, wordCount * 2.15)) * heroScale * options.lyricsFontScale
          )
        ),
        views = [],
        placements = resolveSonnetTypographyLayout({
          lines: linesSegments,
          shotKind: shot.kind,
          paragraphKind: paragraph.kind,
          width,
          height,
          baseFontSize: fontSize,
          fontFamily,
          fontWeight: manualFontWeight,
        }),
        shotSeed = sceneSeed + shotIndex * 97,
        mgLayer = buildSonnetShotMg(
          pixi,
          shot.kind,
          options.theme,
          width,
          height,
          shotSeed,
          iconTextures,
          !1
        );
      shotContainer.addChild(mgLayer);
      const mgBackgroundLayer = mgLayer.bgLayer,
        mgGeoLayer = mgLayer.geoLayer,
        mgParticleLayer = mgLayer.particleLayer,
        mgFixedGeoLayer = mgLayer.fixedGeoLayer;
      ((mgLayer.visible = showBackgroundMg || showFixedGeo || showBackgroundDecor),
        mgBackgroundLayer && (mgBackgroundLayer.visible = showBackgroundMg),
        mgGeoLayer && (mgGeoLayer.visible = showBackgroundMg),
        mgParticleLayer && (mgParticleLayer.visible = showBackgroundDecor),
        mgFixedGeoLayer && (mgFixedGeoLayer.visible = showFixedGeo));
      const { layer: haloLayer, filters: haloFilters } = createSonnetHaloLayer(
          pixi,
          postProcessProfile
        ),
        guideLayer = new Container(),
        textLayer = new Container(),
        caLayer = new Container();
      (textLayer.addChild(caLayer),
        (guideLayer.visible = showGuide),
        (haloLayer.visible = !showOnlyText),
        shotContainer.addChild(guideLayer, haloLayer, textLayer),
        postProcessFilters.push(...haloFilters));
      let staffViewAdded = !1;
      placements.forEach((placement, placementIndex) => {
        const segment = segments[placement.segmentIndex];
        if (segment.text === '\u266A') {
          if (staffViewAdded) return;
          staffViewAdded = !0;
        }
        views.push(
          buildSonnetTextView(pixi, {
            segment,
            placement,
            segmentIndex: placement.segmentIndex,
            nativeKey: shot.id + ':' + placementIndex,
            baseFontSize: fontSize,
            shotStartTime: shot.startTime,
            shotEndTime: shot.endTime,
            paragraphKind: paragraph.kind,
            width,
            fontFamily,
            fontWeight: manualFontWeight,
            theme: options.theme,
            glowEnabled: postProcessProfile.glowStrength > 0,
            showFixedGeo,
            guideLayer,
            haloLayer,
            textLayer,
            caLayer,
          })
        );
      });
      const bounds = shotContainer.getLocalBounds();
      shotContainer.addChild(buildSonnetMeasuredBoundsDebug(pixi, placements));
      const usesGeoMg = shot.kind === 'type-impact' || shot.kind === 'fragment-collage',
        debugInfo = createSonnetShotDebugInfo({
          programSeed: options.programSeed,
          paragraphId: paragraph.id,
          paragraphKind: paragraph.kind,
          shot,
          shotIndex,
          shotCount: paragraph.shots.length,
          baseFontSize: fontSize,
          wordCount,
          geoVariant: usesGeoMg ? resolveSonnetGeoVariant(shotSeed) : null,
          backgroundMgVariant: resolveSonnetBackgroundMgVariant(shotSeed),
          fixedGeoVariant: usesGeoMg ? resolveSonnetFixedGeoVariant(shotSeed) : null,
          backgroundDecorVariant: resolveSonnetBackgroundDecorVariant(shotSeed),
          placements,
          segmentTexts: segments.map((segment) => segment.text),
        }),
        heroPlacement = placements.find((p) => p.role === 'hero'),
        focusX =
          shot.kind === 'poster-blocks'
            ? 0
            : heroPlacement
              ? heroPlacement.x
              : bounds.x + bounds.width / 2,
        focusY =
          shot.kind === 'poster-blocks'
            ? 0
            : heroPlacement
              ? heroPlacement.y
              : bounds.y + bounds.height / 2;
      return (
        shotContainer.pivot.set(focusX, focusY),
        shotContainer.position.set(
          width * (shot.kind === 'poster-blocks' ? 0.5 : 0.5 + shot.camera.x),
          height *
            (shot.kind === 'poster-blocks'
              ? 0.5
              : 0.48 + shot.camera.y + (shotIndex % 2 ? 0.025 : -0.025))
        ),
        container.addChild(shotContainer),
        {
          shot,
          container: shotContainer,
          segments: views,
          debugInfo,
          baseX: shotContainer.x,
          baseY: shotContainer.y,
          basePivotX: focusX,
          basePivotY: focusY,
          haloLayer,
          haloBaseAlpha: haloLayer.alpha,
          mgLayer,
          mgBackgroundLayer,
          mgGeoLayer,
          mgParticleLayer,
          mgFixedGeoLayer,
        }
      );
    });
    if (!showOnlyText) {
      const sceneFilters = applySonnetScenePostProcess(
        pixi,
        container,
        postProcessProfile,
        sceneSeed
      );
      sceneFilters.length > 0 &&
        ((container.filterArea = new pixi.Rectangle(0, 0, width, height)),
        postProcessFilters.push(...sceneFilters));
    }
    const transitionBlurFilter =
      options.tuning.enableTransitions && !options.staticMode
        ? new pixi.BlurFilter({ strength: 0, quality: 1, kernelSize: 5, resolution: 0.5 })
        : null;
    transitionBlurFilter &&
      ((transitionBlurFilter.repeatEdgePixels = !0),
      (transitionBlurFilter.enabled = !1),
      (container.filters = [...((_a = container.filters) != null ? _a : []), transitionBlurFilter]),
      postProcessFilters.push(transitionBlurFilter));
    const transitionGlitchEffect =
      options.tuning.enableTransitions && !options.staticMode
        ? createSonnetGlitchEffect(pixi)
        : null;
    return (
      transitionGlitchEffect &&
        ((container.filters = [
          ...((_b = container.filters) != null ? _b : []),
          transitionGlitchEffect.filter,
        ]),
        postProcessFilters.push(transitionGlitchEffect.filter)),
      (transitionBlurFilter || transitionGlitchEffect) &&
        (container.filterArea = new pixi.Rectangle(0, 0, width, height)),
      (container.visible = !1),
      {
        paragraph,
        container,
        shots,
        shotTimeline: shots.map((shot) => shot.shot),
        postProcessFilters,
        transitionBlurFilter,
        transitionGlitchEffect,
        activeShotIndex: -1,
      }
    );
  };
export { buildSonnetScene, shouldDrawSonnetSceneBackdrop };
