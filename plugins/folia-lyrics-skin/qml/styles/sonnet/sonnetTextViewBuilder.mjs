// Derived from Folia a8da4437 (AGPL-3.0-only). See sonnet-reference.md.
var __defProp = Object.defineProperty;
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
  };
import { codePoints } from '../../shared/text/codepoints.mjs';
import { layoutWithLines, prepareWithSegments } from './pretext.mjs';
import { buildSonnetGlyphLayout } from './sonnetGlyphLayout.mjs';
import { resolveSonnetSegmentDepth, resolveSonnetSegmentNormalOffset } from './sonnetMotion.mjs';
import { hashSonnetSeed } from './sonnetRandom.mjs';
import { buildSonnetStaffView } from './sonnetStaffView.mjs';
import { buildSonnetTextFixedGeo } from './sonnetTextFixedGeo.mjs';
import { resolveSonnetCameraTrackingGlyphs } from './sonnetCameraTracking.mjs';
import { createSonnetGuide } from './sonnetGuides.mjs';
import { buildSonnetFrameDecor, resolveSonnetFrameDecorSpec } from './sonnetFrameDecor.mjs';
import { isSonnetEmphasisRole } from './sonnetTypographyLayout.mjs';
import { resolveSonnetRoleFontWeight } from './sonnetTypographyRoles.mjs';
const measureText = (text, fontSpec, fontSize) => {
    var _a, _b;
    try {
      return (_b =
        (_a = layoutWithLines(prepareWithSegments(text || ' ', fontSpec), 99999, fontSize * 1.2)
          .lines[0]) == null
          ? void 0
          : _a.width) != null
        ? _b
        : text.length * fontSize * 0.6;
    } catch (error) {
      throw error;
    }
  },
  buildSonnetTextView = (pixi, options) => {
    var _a, _b, _c, _d, _e;
    const { Text, TextStyle } = pixi,
      { segment, placement: originalPlacement } = options,
      placement = __spreadValues({}, originalPlacement),
      fontSize = options.baseFontSize * placement.fontScale,
      normalOffsetSeed = hashSonnetSeed(
        [
          segment.text,
          segment.startOffset,
          segment.endOffset,
          options.segmentIndex,
          'normal-offset',
        ].join(':')
      ),
      normalOffset = resolveSonnetSegmentNormalOffset(
        placement.role,
        placement.layoutDirection,
        placement.rotation,
        fontSize,
        normalOffsetSeed / 4294967295
      );
    ((placement.x += normalOffset.x), (placement.y += normalOffset.y));
    const isKeyword =
        (_a = options.theme.wordColors) == null
          ? void 0
          : _a.find((w) => w.word.toLowerCase() === segment.text.toLowerCase()),
      bodyColor = options.theme.primaryColor,
      glowColor = isKeyword
        ? isKeyword.color
        : isSonnetEmphasisRole(placement.role)
          ? options.theme.primaryColor
          : options.theme.accentColor,
      isDecoration = placement.role === 'decoration',
      renderWeight = resolveSonnetRoleFontWeight(options.fontWeight, placement.role),
      fontSpec = `${renderWeight} ${fontSize}px ${options.fontFamily}`,
      zDepth = resolveSonnetSegmentDepth(placement.role),
      isBlurry = Math.abs(zDepth) * fontSize * 0.12 > 2,
      baseDropShadow =
        options.glowEnabled && !isDecoration
          ? {
              color: glowColor,
              alpha: 0.8,
              blur: Math.max(12, fontSize * 0.18),
              distance: 0,
            }
          : void 0,
      style = new TextStyle({
        fontFamily: options.fontFamily,
        fontWeight: String(renderWeight),
        fontSize,
        fill: isDecoration ? 'transparent' : bodyColor,
        stroke: isDecoration
          ? { color: glowColor, width: Math.max(1, Math.min(8, fontSize * 6e-3)) }
          : void 0,
        align: 'center',
        dropShadow: baseDropShadow,
        padding: baseDropShadow ? Math.max(20, baseDropShadow.blur * 2.5) : 0,
      }),
      ghostStyle =
        placement.role === 'semi-hero'
          ? new TextStyle({
              fontFamily: options.fontFamily,
              fontWeight: String(renderWeight),
              fontSize,
              fill: 'transparent',
              stroke: { color: glowColor, width: Math.max(1, Math.min(8, fontSize * 6e-3)) },
              align: 'center',
            })
          : void 0,
      ghostNormal = (() => {
        const screen = placement.layoutDirection === 'vertical' ? { x: 1, y: 0 } : { x: 0, y: 1 },
          cosine = Math.cos(-placement.rotation),
          sine = Math.sin(-placement.rotation);
        return {
          x: screen.x * cosine - screen.y * sine,
          y: screen.x * sine + screen.y * cosine,
        };
      })(),
      ghostSpread = fontSize * 0.85,
      ghostDuration = Math.min(
        0.7,
        Math.max(0.4, (options.shotEndTime - options.shotStartTime) * 0.12 + 0.1)
      );
    if (segment.text === '\u266A') {
      const staffView = buildSonnetStaffView(
          pixi,
          placement,
          options.theme,
          options.baseFontSize,
          options.shotStartTime,
          options.width,
          options.textLayer
        ),
        guide2 = createSonnetGuide(
          pixi,
          segment,
          placement,
          options.theme,
          fontSize,
          staffView.startTime
        );
      return (
        isDecoration || options.guideLayer.addChild(guide2.container),
        {
          segmentIndex: options.segmentIndex,
          displayText: segment.text,
          role: placement.role,
          fontScale: placement.fontScale,
          x: placement.x,
          y: placement.y,
          rotation: placement.rotation,
          enterX: placement.enterX,
          enterY: placement.enterY,
          vertical: placement.vertical,
          timingPhase: placement.timingPhase,
          guide: guide2,
          glyphs: [staffView],
          trackingGlyphs: [staffView],
        }
      );
    }
    const tagNativeContext = (node, glyphIndex, instance) => {
        const chars = segment.graphemes.length
          ? segment.graphemes.map((item) => item.char)
          : codePoints(segment.text);
        return (
          (node.nativeContext = {
            key: options.nativeKey,
            text: segment.text,
            start: chars.slice(0, glyphIndex).join('').length,
            instance,
          }),
          node
        );
      },
      glyphs = buildSonnetGlyphLayout(
        segment,
        placement,
        fontSize,
        (char) => measureText(char, fontSpec, fontSize),
        {
          startTime: options.shotStartTime,
          endTime: options.shotEndTime,
        }
      ).map((glyph, glyphIndex) => {
        const display = tagNativeContext(
          new Text({ text: glyph.char, style }),
          glyphIndex,
          'display'
        );
        (display.anchor.set(0.5), isDecoration && (display.alpha = 0.2));
        const wrapper = new pixi.Container();
        ((wrapper.rotation = placement.rotation),
          wrapper.position.set(glyph.baseX, glyph.baseY),
          (wrapper.alpha = 0));
        let caWrapperNode, caCyanNode, caRedNode, caOffsetValue;
        if (!isDecoration) {
          const isHero = isSonnetEmphasisRole(placement.role);
          caOffsetValue = fontSize * (isHero ? 0.025 : 0.01);
          const caCyan = tagNativeContext(
            new Text({ text: glyph.char, style }),
            glyphIndex,
            'caCyan'
          );
          ((caCyan.tint = 65535),
            (caCyan.blendMode = 'screen'),
            caCyan.anchor.set(0.5),
            (caCyan.alpha = isHero ? 0.8 : 0.5));
          const caRed = tagNativeContext(
            new Text({ text: glyph.char, style }),
            glyphIndex,
            'caRed'
          );
          ((caRed.tint = 16711748),
            (caRed.blendMode = 'screen'),
            caRed.anchor.set(0.5),
            (caRed.alpha = isHero ? 0.8 : 0.5));
          const caWrapper = new pixi.Container();
          ((caWrapper.rotation = wrapper.rotation),
            caWrapper.position.copyFrom(wrapper.position),
            (caWrapper.alpha = 0),
            caWrapper.addChild(caCyan, caRed),
            options.caLayer.addChild(caWrapper),
            (caWrapperNode = caWrapper),
            (caCyanNode = caCyan),
            (caRedNode = caRed));
        }
        wrapper.addChild(display);
        let ghosts;
        if (ghostStyle) {
          ghosts = [];
          const side = normalOffsetSeed % 2 === 0 ? 1 : -1;
          for (let layer = 1; layer <= 2; layer++) {
            const ghost = tagNativeContext(
              new Text({ text: glyph.char, style: ghostStyle }),
              glyphIndex,
              'ghost' + layer
            );
            (ghost.anchor.set(0.5),
              (ghost.alpha = 0),
              (ghost.visible = !1),
              wrapper.addChildAt(ghost, 0));
            const factor = layer === 1 ? 1 : 1.7;
            ghosts.push({
              node: ghost,
              dirX: ghostNormal.x * side * factor * ghostSpread,
              dirY: ghostNormal.y * side * factor * ghostSpread,
              alphaBase: layer === 1 ? 0.3 : 0.16,
            });
          }
        }
        return (
          options.textLayer.addChild(wrapper),
          {
            display: wrapper,
            halo: null,
            caWrapper: caWrapperNode,
            caCyan: caCyanNode,
            caRed: caRedNode,
            caOffset: caOffsetValue,
            ghosts,
            ghostDuration: ghosts ? ghostDuration : void 0,
            baseX: glyph.baseX,
            baseY: glyph.baseY,
            enterX: glyph.enterX,
            enterY: glyph.enterY,
            entryRotation: glyph.entryRotation,
            finalRotation: placement.rotation,
            startTime: glyph.startTime,
            settleTime: glyph.settleTime,
            zDepth,
            isTextGlyph: !0,
          }
        );
      }),
      isChorusParagraph = options.paragraphKind === 'chorus',
      textSeed =
        segment.text.split('').reduce((a, b) => a + b.charCodeAt(0), 0) + options.segmentIndex * 13,
      isChorusEffect = isChorusParagraph || textSeed % 100 < 35,
      shapeThreshold = isChorusEffect ? 26 : 15,
      hasFrameDecor = resolveSonnetFrameDecorSpec(segment).applied;
    if (
      options.showFixedGeo &&
      textSeed % 100 < shapeThreshold &&
      !isDecoration &&
      segment.isWordLike &&
      !hasFrameDecor &&
      glyphs.length > 0
    ) {
      const bgWrapper = new pixi.Container();
      (bgWrapper.position.set(placement.x, placement.y),
        (bgWrapper.rotation = placement.rotation),
        (bgWrapper.alpha = 0));
      const bgShape = buildSonnetTextFixedGeo(pixi, {
        seed: textSeed,
        isChorusEffect,
        fontSize,
        layoutWidth: options.width,
        theme: options.theme,
      });
      (bgWrapper.addChild(bgShape), options.textLayer.addChildAt(bgWrapper, 0));
      const firstGlyph = glyphs[0],
        bgGlyph = {
          display: bgWrapper,
          halo: null,
          baseX: placement.x,
          baseY: placement.y,
          enterX: placement.enterX,
          enterY: placement.enterY,
          entryRotation: 0,
          finalRotation: placement.rotation,
          startTime: firstGlyph.startTime,
          settleTime: firstGlyph.settleTime,
          zDepth: -0.5 - (textSeed % 5) * 0.1,
          isBackgroundShape: !0,
          isTextGlyph: !1,
        };
      glyphs.unshift(bgGlyph);
    }
    const guide = createSonnetGuide(
      pixi,
      segment,
      placement,
      options.theme,
      fontSize,
      (_c = (_b = glyphs[0]) == null ? void 0 : _b.startTime) != null ? _c : options.shotStartTime
    );
    isDecoration || options.guideLayer.addChild(guide.container);
    const frameDecor = buildSonnetFrameDecor(pixi, {
      segment,
      placement,
      theme: options.theme,
      fontSize,
      shotStartTime: options.shotStartTime,
      shotEndTime: options.shotEndTime,
      firstGlyphStartTime:
        (_e =
          (_d = glyphs.find((glyph) => glyph.isTextGlyph !== !1)) == null
            ? void 0
            : _d.startTime) != null
          ? _e
          : segment.startTime,
    });
    return (
      frameDecor && options.textLayer.addChildAt(frameDecor.container, 0),
      {
        segmentIndex: options.segmentIndex,
        displayText: segment.text,
        role: placement.role,
        fontScale: placement.fontScale,
        x: placement.x,
        y: placement.y,
        rotation: placement.rotation,
        enterX: placement.enterX,
        enterY: placement.enterY,
        vertical: placement.vertical,
        timingPhase: placement.timingPhase,
        guide,
        frameDecor,
        glyphs,
        trackingGlyphs: resolveSonnetCameraTrackingGlyphs(glyphs),
      }
    );
  };
export { buildSonnetTextView, measureText };
