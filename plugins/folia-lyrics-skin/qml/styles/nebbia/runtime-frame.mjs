// Native scheduling of the pinned createNebbiaRuntime.ts frame order and kernels.
// Host playback time is read-only; excluded offline analyses use the source fallback.
import { NebbiaGl } from './source/nebbiaGl.mjs';
import { NebbiaMask } from './source/nebbiaMask.mjs';
import { NebbiaGlassMotion } from './source/nebbiaDrops.mjs';
import { NebbiaSpot } from './source/nebbiaSpot.mjs';
import { NebbiaHits, VocalEnergy } from './source/nebbiaHits.mjs';
import { NebbiaGlyphCache } from './source/nebbiaGlyphs.mjs';
import { NebbiaDrizzleRide } from './source/nebbiaDrizzleRide.mjs';
import { NebbiaSceneClock } from './source/nebbiaSceneClock.mjs';
import { NebbiaCondensation } from './source/nebbiaCondensation.mjs';
import { NebbiaSnow } from './source/nebbiaSnow.mjs';
import { NebbiaFireflies } from './source/nebbiaFireflies.mjs';
import { NebbiaAquarium } from './source/nebbiaAquarium.mjs';
import { nebbiaFrameUniforms } from './source/nebbiaFrameUniforms.mjs';
import { NEBBIA_FIXED } from './source/nebbiaConstants.mjs';
import { resolveNebbiaPalette } from './source/nebbiaPalette.mjs';
import { buildNebbiaLines, NEBBIA_DEFAULT_DOODLES } from './source/nebbiaChars.mjs';
import { appendNebbiaCredits } from './source/nebbiaCredits.mjs';
import { buildNebbiaScene } from './source/nebbiaScene.mjs';
import { hashVisualizerSeed } from './source/_shared/components/visualizer/visualizerSeedHash.mjs';
import { createNebbiaGlRecorder } from './gl-record.mjs';

export function createNebbiaRuntime(options) {
  const { width: W, height: H, resolution, theme, seed } = options;
  const t = options.tuning,
    aquarium = t.behind === 'aquarium' ? new NebbiaAquarium() : null;
  const condensation = t.glass === 'dew' ? new NebbiaCondensation() : null;
  const snow = t.glass === 'snow' ? new NebbiaSnow() : null;
  const fireflies = t.glass === 'dew' ? new NebbiaFireflies() : null;
  const recorded = createNebbiaGlRecorder(Math.round(W * resolution), Math.round(H * resolution));
  const gl = new NebbiaGl(
    { getContext: () => recorded.gl },
    t.behind === 'backdrop',
    t.behind,
    t.glass,
  );
  const mask = new NebbiaMask(),
    motion = new NebbiaGlassMotion(),
    spot = new NebbiaSpot();
  const energy = new VocalEnergy(),
    ride = new NebbiaDrizzleRide(),
    clock = new NebbiaSceneClock(),
    fieldInst = [];
  if (t.glass !== 'rain') {
    mask.sweeps = [];
    mask.wet = [];
  }
  if (snow) mask.ice = [];
  motion.bump = t.bump;
  const p = resolveNebbiaPalette(theme);
  gl.setPalette(p.sky0, p.sky1, p.la, p.lb, p.lc);
  gl.mistTint = options.daylight ? [0.86, 0.89, 0.92] : [0.07, 0.08, 0.1];
  if (aquarium) aquarium.setPalette(p.la, p.lb, p.lc);
  if (fireflies) {
    fireflies.setPalette(p.la, p.lb, p.lc);
    fireflies.resize(W, H);
  }
  if (snow) {
    gl.setFlakeAtlas(...snow.atlas());
    snow.resize(W, H);
  }
  gl.resize(W, H, resolution);
  mask.resize(W, H);
  if (condensation) condensation.build(W, H);
  else if (!snow) motion.buildField(W, H);
  const glyphs = new NebbiaGlyphCache(theme.fontFamily || 'sans-serif', theme.fontWeight || 600);
  const doodles =
    theme.lyricsIcons && theme.lyricsIcons.length ? theme.lyricsIcons : NEBBIA_DEFAULT_DOODLES;
  const source =
    options.showText === false
      ? []
      : appendNebbiaCredits(
          buildNebbiaLines(options.program, seed, t.doodle, doodles),
          t.credits ? options.metadata.title : null,
          options.metadata.artist,
        );
  const laid = buildNebbiaScene(source, glyphs, t, { W, H, fontScale: options.fontScale }, seed);
  const hits = new NebbiaHits(hashVisualizerSeed(String(seed)));
  hits.buildBig(
    laid,
    source.map((l) => l.words),
    W,
    H,
    null,
  );
  let dead = false;
  const origin = Date.now();
  return {
    frame(time, parameters = {}) {
      if (dead) throw Error('Nebbia runtime is retired');
      if (!gl.ready) throw Error('Nebbia native shader registry is incomplete');
      const now = (Date.now() - origin) / 1000,
        paused = !!parameters.paused,
        still = parameters.motionEnabled === false;
      const frozen = paused || still,
        dt = clock.tick(now, paused),
        rainGlass = t.glass === 'rain';
      if (rainGlass || !aquarium) ride.step(motion, now, time, frozen, t.bump, !aquarium);
      else motion.beginFrame(now, frozen, false);
      const strength = rainGlass ? ride.rain : 0;
      const e = energy.update(parameters.audio ? parameters.audio.power : 0, Math.max(dt, 1 / 60));
      hits.advance(
        time,
        e,
        still ? 0 : t.rainHit * strength,
        NebbiaHits.lifeOf(t.refog, NEBBIA_FIXED.beadHold),
        W,
        H,
      );
      mask.draw(laid, time, now, t, motion, hits, t.rainBig * strength);
      spot.update(laid, time, dt);
      const aqua = aquarium ? aquarium.step(dt, clock.time, W / H, t, null) : null;
      if (snow) {
        snow.step(
          frozen ? 0 : dt,
          t,
          mask.sweeps || [],
          mask.wet || [],
          aquarium ? 0 : t.busSpeed,
          !aquarium,
        );
        snow.drawFog(mask.ctx, t);
      } else if (condensation) condensation.touchInk(mask.sweeps || [], mask.wet || [], t.dewSize);
      const field = condensation
        ? condensation.instances(frozen ? 0 : dt, t.dew, t.dewSize)
        : snow
          ? snow.instances(fieldInst)
          : motion.fieldInstances(fieldInst, t.busSpeed);
      const u = nebbiaFrameUniforms(t, motion.shake(), spot, W, H, clock.time, aqua);
      gl.render(
        mask.ctx,
        mask.breath.active ? mask.breath : null,
        motion.drops,
        field,
        u,
        condensation ? condensation.changed : snow ? snow.changed : true,
      );
      if (snow) gl.drawFlakes(...snow.flakeInstances(mask.ice || []), u.glassShift);
      if (fireflies) gl.drawFireflies(...fireflies.step(frozen ? 0 : dt));
      return recorded.drain(parameters.resourceAck || 0);
    },
    destroy() {
      if (dead) return;
      dead = true;
      gl.destroy();
    },
  };
}
