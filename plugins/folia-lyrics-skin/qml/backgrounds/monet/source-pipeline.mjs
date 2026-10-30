// Folia a8da4437 AGPL-3.0-only. See docs/folia/monet-background-reference.md.
const resolveSourceUrl = ({ coverUrl, monetBackgroundImage, tuning }) => {
  var _a, _b, _c;
  return tuning.backgroundSource === 'uploaded-global'
    ? (_b =
        (_a = monetBackgroundImage == null ? void 0 : monetBackgroundImage.url) != null
          ? _a
          : coverUrl) != null
      ? _b
      : null
    : (_c =
          coverUrl != null
            ? coverUrl
            : monetBackgroundImage == null
              ? void 0
              : monetBackgroundImage.url) != null
      ? _c
      : null;
};
const getMonetBackgroundCacheKey = ({ coverUrl, monetBackgroundImage, theme, tuning }) => {
  var _a;
  return JSON.stringify({
    sourceUrl: resolveSourceUrl({ coverUrl, monetBackgroundImage, tuning }),
    uploadedId:
      tuning.backgroundSource === 'uploaded-global'
        ? (_a = monetBackgroundImage == null ? void 0 : monetBackgroundImage.id) != null
          ? _a
          : null
        : null,
    theme: {
      backgroundColor: theme.backgroundColor,
      primaryColor: theme.primaryColor,
      accentColor: theme.accentColor,
    },
    tuning: {
      backgroundSource: tuning.backgroundSource,
      backgroundBlurPx: tuning.backgroundBlurPx,
      backgroundOverlayOpacity: tuning.backgroundOverlayOpacity,
      backgroundGrayscale: tuning.backgroundGrayscale,
      backgroundSaturation: tuning.backgroundSaturation,
      backgroundWash: tuning.backgroundWash,
      backgroundWashColorMode: tuning.backgroundWashColorMode,
      backgroundWashCustomColor: tuning.backgroundWashCustomColor,
      // Drift is a DOM-side transform and never reaches the bitmap, so it stays out of the key
      // the same way backgroundLayout does; streaks are baked in and must invalidate it.
      backgroundStreaksEnabled: tuning.backgroundStreaksEnabled,
    },
  });
};
export { getMonetBackgroundCacheKey };
