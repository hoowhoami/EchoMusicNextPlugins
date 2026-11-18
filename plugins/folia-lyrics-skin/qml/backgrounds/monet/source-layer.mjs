// Folia a8da4437 AGPL-3.0-only. See docs/folia/monet-background-reference.md.
const resolveMonetSourceUrl = (coverUrl, monetBackgroundImage, tuning) => {
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
export { resolveMonetSourceUrl };
