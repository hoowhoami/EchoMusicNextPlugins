import { missingMeasurementRevision } from '../lumiere/native-measure.mjs';
// Native scene orchestration; original Hanabi math stays in pinned source modules.
import { createHanabiBackend } from './backend.mjs';
import { snapshotLumiereScene } from '../lumiere/scene-snapshot.mjs';
import { createHanabiTextures } from './source/mg/textures.mjs';
import {
  applyHanabiLayerFrame,
  buildHanabiSceneEntry,
  destroyHanabiSceneEntry,
} from './source/hanabiSceneEntry.mjs';
import { HanabiCreditsLayer } from './source/hanabiCreditsLayer.mjs';
import { findHanabiParagraphIndexAtTime } from './source/hanabiProgram.mjs';
import { HanabiSkyLayer } from './source/hanabiSky.mjs';
import { buildHanabiOverlay } from './source/overlay.mjs';
import {
  resolveHanabiScreenBloomStrength,
  resolveHanabiChorusWeight,
} from './source/hanabiScreenBloom.mjs';
import { createBloomFilter } from './bloom.mjs';

export function createHanabiRuntime(options) {
  const pixi = createHanabiBackend({ measureText: options.measureText, maxNodes: 16384 });
  const stage = new pixi.Container(),
    sky = new HanabiSkyLayer(pixi),
    scenes = new pixi.Container(),
    credits = new HanabiCreditsLayer(pixi);
  const textures = createHanabiTextures(pixi, options.resolution);
  // createHanabiPixiRuntime.ts applyScreenBloom; preserve its full-screen tuning.
  const filter = createBloomFilter(pixi, {
    strength: 0,
    threshold: 0.5,
    knee: 0.3,
    levels: 5,
    spread: 0.85,
    tint: [1, 0.95, 0.98],
    padding: 0,
  });
  filter.resolution = 'inherit';
  stage.addChild(sky.view, scenes, credits.holder);
  const theme =
    options.tuning.sky >= 0.5 && !options.tuning.textOnly
      ? Object.assign({}, options.theme, { backgroundColor: '#0b0d24' })
      : options.theme;
  scenes.filterArea = new pixi.Rectangle(0, 0, options.width, options.height);
  const textureCache = new Map();
  let entry = null,
    overlay = null,
    destroyed = false,
    creditsPending = false;
  if (options.tuning.overlayFrame && !options.tuning.textOnly) {
    overlay = buildHanabiOverlay(
      pixi,
      options.width,
      options.height,
      theme,
      options.tuning.colorMode,
      options.resolution,
    );
    stage.addChild(overlay);
  }
  return {
    frame(time) {
      if (destroyed) throw new Error('Hanabi scene has retired');
      const index = findHanabiParagraphIndexAtTime(options.program, time);
      if (!entry || entry.index !== index) {
        if (entry) destroyHanabiSceneEntry(entry);
        entry = buildHanabiSceneEntry(
          pixi,
          Object.assign({}, options, {
            theme,
            textures,
            motifs: [options.metadata.title || 'HANABI', 'HANABI', '花火'],
            songTitle: options.metadata.title || null,
            songArtist: options.metadata.artist || null,
            icons: options.theme.lyricsIcons || [],
          }),
          index,
        );
        scenes.addChild(entry.holder);
      }
      sky.update(
        options.theme,
        options.tuning.textOnly ? 0 : options.tuning.sky,
        options.width,
        options.height,
      );
      if (overlay && (!options.tuning.overlayFrame || options.tuning.textOnly)) {
        overlay.destroy({ children: true });
        overlay = null;
      } else if (!overlay && options.tuning.overlayFrame && !options.tuning.textOnly) {
        overlay = buildHanabiOverlay(
          pixi,
          options.width,
          options.height,
          theme,
          options.tuning.colorMode,
          options.resolution,
        );
        stage.addChild(overlay);
      }
      entry.scene.prepare(time);
      entry.scene.update(time, null);
      const creditsFrame = credits.resolveFrame(time, options.program, options.metadata);
      if (credits.needsBuild(time, options.program, options.metadata)) {
        const before = missingMeasurementRevision();
        credits.build({
          width: options.width,
          height: options.height,
          resolution: options.resolution,
          theme,
          metadata: options.metadata,
          tuning: options.tuning,
          textures,
          icons: options.theme.lyricsIcons || [],
        });
        creditsPending = creditsPending || before !== missingMeasurementRevision();
      }
      applyHanabiLayerFrame(
        pixi,
        entry,
        {
          alpha: creditsFrame.lyricAlpha,
          scale: 1,
          blur: creditsFrame.lyricBlur,
          y: 0,
          rotation: 0,
        },
        { width: options.width, height: options.height },
        options.resolution * 0.5,
      );
      entry.holder.visible = creditsFrame.lyricAlpha > 0.002;
      credits.update(time, creditsFrame, options.width, options.height);
      filter.options.strength = resolveHanabiScreenBloomStrength(
        options.tuning.bloom,
        options.tuning.chorusBloom,
        resolveHanabiChorusWeight(options.program.chorus, time),
      );
      scenes.filters = filter.options.strength > 0.01 ? [filter] : [];
      return snapshotLumiereScene(stage, {
        batchSprites: true,
        viewport: { width: options.width, height: options.height },
        resolution: options.resolution,
        textureCache,
        inheritBlend: true,
      });
    },
    refreshMeasurements() {
      // Only the lyric scene depends on newly measured text. The sky, frame
      // and immutable common textures belong to this runtime, across paragraphs.
      if (entry) destroyHanabiSceneEntry(entry);
      entry = null;
      // Discovery frames are never published. Republish their source programs
      // with the first real frame instead of sending bare unseen revisions.
      for (const source of textureCache.values()) source.snapshot = -1;
      if (creditsPending) credits.invalidate();
      creditsPending = false;
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (entry) destroyHanabiSceneEntry(entry);
      credits.destroy();
      sky.destroy();
      textures.destroy();
      filter.destroy();
      stage.destroy({ children: true });
      textureCache.clear();
    },
  };
}
