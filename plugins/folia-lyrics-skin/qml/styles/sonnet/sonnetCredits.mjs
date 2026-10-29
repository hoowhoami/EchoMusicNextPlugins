// Derived from Folia a8da4437 (AGPL-3.0-only). See sonnet-reference.md.
import { resolveThemeFontStack, resolveThemeFontWeight } from './font-stacks.mjs';
import { clamp01, easeSonnetInOut } from './sonnetMotion.mjs';
const normalizeMetadata = (value) => {
    var _a;
    return (_a = value == null ? void 0 : value.trim()) != null ? _a : '';
  },
  resolveSonnetCreditsFrame = (time, finalLyricEndTime) => {
    const elapsed = time - finalLyricEndTime;
    if (elapsed <= 0)
      return {
        active: !1,
        lyricAlpha: 1,
        lyricBlur: 0,
        posterAlpha: 0,
        posterOffsetY: 0.04,
        posterScale: 0.965,
      };
    const lyricExit = easeSonnetInOut(clamp01(elapsed / 1.25)),
      posterEnter = easeSonnetInOut(clamp01((elapsed - 0.38) / 1.55));
    return {
      active: !0,
      lyricAlpha: 1 - lyricExit,
      lyricBlur: lyricExit * 18,
      posterAlpha: posterEnter,
      posterOffsetY: (1 - posterEnter) * 0.04,
      posterScale: 0.965 + posterEnter * 0.035,
    };
  },
  hasSonnetCreditsMetadata = (metadata) =>
    !!(
      normalizeMetadata(metadata.title) ||
      normalizeMetadata(metadata.artist) ||
      normalizeMetadata(metadata.album)
    ),
  buildSonnetCreditsPoster = (pixi, theme, metadata, width, height, lyricsFontScale) => {
    const container = new pixi.Container(),
      title = normalizeMetadata(metadata.title),
      artist = normalizeMetadata(metadata.artist),
      album = normalizeMetadata(metadata.album),
      fontFamily = resolveThemeFontStack(theme),
      titleWeight = resolveThemeFontWeight(theme, 700),
      detailWeight = resolveThemeFontWeight(theme, 500),
      left = Math.max(38, width * 0.105),
      right = Math.max(38, width * 0.09),
      contentWidth = Math.max(220, width - left - right),
      titleSize = Math.max(42, Math.min(118, width * 0.088 * lyricsFontScale)),
      detailSize = Math.max(13, Math.min(25, width * 0.018 * lyricsFontScale)),
      accent = pixi.Color.shared.setValue(theme.accentColor).toNumber(),
      primary = pixi.Color.shared.setValue(theme.primaryColor).toNumber(),
      secondary = pixi.Color.shared.setValue(theme.secondaryColor).toNumber(),
      geometry = new pixi.Graphics();
    if (
      (geometry
        .rect(left, height * 0.155, Math.max(42, width * 0.075), 5)
        .fill({ color: accent, alpha: 0.95 })
        .rect(left, height * 0.155, 2, height * 0.57)
        .fill({ color: primary, alpha: 0.22 })
        .rect(width - right - 8, height * 0.225, 8, height * 0.34)
        .fill({ color: secondary, alpha: 0.32 })
        .moveTo(left, height * 0.79)
        .lineTo(width - right, height * 0.79)
        .stroke({ color: primary, width: 1, alpha: 0.36 }),
      container.addChild(geometry),
      artist)
    ) {
      const artistText = new pixi.Text({
        text: artist.toLocaleUpperCase(),
        style: new pixi.TextStyle({
          fontFamily,
          fontWeight: String(detailWeight),
          fontSize: detailSize,
          fill: theme.accentColor,
          letterSpacing: Math.max(2, detailSize * 0.18),
          wordWrap: !0,
          wordWrapWidth: contentWidth * 0.72,
        }),
      });
      (artistText.position.set(left + 20, height * 0.205), container.addChild(artistText));
    }
    if (title) {
      const titleText = new pixi.Text({
        text: title,
        style: new pixi.TextStyle({
          fontFamily,
          fontWeight: String(titleWeight),
          fontSize: titleSize,
          fill: theme.primaryColor,
          leading: -Math.max(2, titleSize * 0.08),
          letterSpacing: -Math.max(0.5, titleSize * 0.018),
          wordWrap: !0,
          wordWrapWidth: contentWidth * 0.88,
          breakWords: !0,
        }),
      });
      (titleText.position.set(left + 16, height * 0.285), container.addChild(titleText));
    }
    if (album) {
      const albumText = new pixi.Text({
        text: `\u2014 ${album}`,
        style: new pixi.TextStyle({
          fontFamily,
          fontWeight: String(detailWeight),
          fontSize: detailSize * 0.92,
          fill: theme.secondaryColor,
          letterSpacing: Math.max(1, detailSize * 0.1),
          wordWrap: !0,
          wordWrapWidth: contentWidth * 0.72,
        }),
      });
      (albumText.position.set(left + 18, height * 0.825), container.addChild(albumText));
    }
    return (
      container.pivot.set(width / 2, height / 2),
      container.position.set(width / 2, height / 2),
      container
    );
  };
export { buildSonnetCreditsPoster, hasSonnetCreditsMetadata, resolveSonnetCreditsFrame };
