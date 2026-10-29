// Folia a8da4437 MonetBackgroundLayer.tsx effect, AGPL-3.0-only.
// The caller owns the presentation timer and the asynchronous image pipeline.
import { getMonetBackgroundCacheKey } from './source-pipeline.mjs';
import { resolveMonetSourceUrl } from './source-layer.mjs';

export const MONET_PIPELINE_DEBOUNCE_MS = 180;

export function createMonetLayerState(environment) {
  const pipeline = environment.pipeline;
  let pipelineUrl = null;
  let isPipelinePending = false;
  let firstPicture = null;
  let shownSource = null;
  let sourceUrl = null;
  let previousKey;
  let previousSource;
  let previousTransparent;
  let cleanup = null;
  let disposed = false;

  function changed() {
    if (environment.onChange) environment.onChange();
  }

  function pictureDrawn() {
    if (environment.pictureDrawn) environment.pictureDrawn();
  }

  return {
    get snapshot() {
      return {
        pipelineUrl,
        isPipelinePending,
        firstPicture,
        shownSource,
        sourceUrl,
        pictureKey: pipelineUrl || sourceUrl || 'fallback',
      };
    },
    update(options) {
      if (disposed) throw new Error('Monet background layer is released');
      const key = getMonetBackgroundCacheKey(options);
      sourceUrl = resolveMonetSourceUrl(
        options.coverUrl,
        options.monetBackgroundImage,
        options.tuning
      );
      const transparent = Boolean(options.transparentBackground);
      if (
        key === previousKey &&
        sourceUrl === previousSource &&
        transparent === previousTransparent
      )
        return;
      previousKey = key;
      previousSource = sourceUrl;
      previousTransparent = transparent;
      if (cleanup) cleanup();

      let cancelled = false;
      let timeoutId;
      let early = null;
      let timed = null;
      cleanup = () => {
        cancelled = true;
        if (timeoutId !== undefined) environment.clearTimeout(timeoutId);
        if (early) early.release();
        if (timed) timed.release();
      };
      if (!sourceUrl || transparent) {
        pipelineUrl = null;
        isPipelinePending = false;
        changed();
        pictureDrawn();
        return;
      }

      isPipelinePending = true;
      const effectSource = sourceUrl;
      early = effectSource !== shownSource ? pipeline.wantMonetBackgroundUrl(options) : null;
      timeoutId = environment.setTimeout(() => {
        timed = pipeline.wantMonetBackgroundUrl(options);
        timed.url.then((url) => {
          if (cancelled) return;
          pipelineUrl = url;
          isPipelinePending = false;
          shownSource = effectSource;
          if (url && firstPicture === null) firstPicture = url;
          changed();
          pictureDrawn();
        });
      }, MONET_PIPELINE_DEBOUNCE_MS);
      changed();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (cleanup) cleanup();
      cleanup = null;
      pipelineUrl = null;
      isPipelinePending = false;
    },
  };
}
