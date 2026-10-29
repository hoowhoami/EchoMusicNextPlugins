// Source builds remain executable; this adapter records native vectors and contextual text.
import { createSceneGraph } from './scene-graph.mjs';
import { createTextMeasurer, measureSourceText } from './pixi-text-metrics.mjs';
import { buildSonnetScene } from './sonnetSceneBuilder.mjs';
import { buildSonnetCreditsPoster, hasSonnetCreditsMetadata } from './sonnetCredits.mjs';
import { drawSonnetFrameOverlay } from './sonnetFrameOverlay.mjs';
import { buildTextures } from './icons.mjs';
import { DEFAULTS } from './kernel.mjs';
export function buildScene(paragraph, context, provider) {
  const pixi = createSceneGraph({
    measureText: provider ? createTextMeasurer(provider) : measureSourceText,
    maxNodes: 32768,
  });
  const width = Math.max(context.width, 320),
    height = Math.max(context.height, 240);
  const tuning = Object.assign({}, DEFAULTS, context.tuning || {});
  const options = {
    host: { clientWidth: width, clientHeight: height },
    theme: context.theme,
    programSeed: context.programSeed || 'sonnet',
    tuning,
    lyricsFontScale: context.lyricsFontScale,
    staticMode: context.staticMode === true,
    transparentBackground: context.transparentBackground === true,
  };
  const scene = buildSonnetScene(pixi, options, buildTextures(context.theme, tuning), paragraph);
  const overlay = new pixi.Container();
  drawSonnetFrameOverlay(pixi, overlay, width, height, tuning, context.theme);
  const metadata = context.metadata || {};
  const credits = hasSonnetCreditsMetadata(metadata)
    ? buildSonnetCreditsPoster(
        pixi,
        context.theme,
        metadata,
        width,
        height,
        context.lyricsFontScale
      )
    : new pixi.Container();
  credits.pivot.set(width / 2, height / 2);
  credits.position.set(width / 2, height / 2);
  credits.visible = false;
  // Bounds of every metadata, wrapped title and glyph must be measured before publishing.
  const pending = [scene.container, credits, overlay];
  while (pending.length) {
    const node = pending.pop();
    if (node.kind === 'text') node.metrics;
    pending.push(...node.children);
  }
  return { pixi, options, scene, credits, overlay };
}
