// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/hanabi/mg/ornaments.ts
import { createKit } from './ornamentKit.mjs';
import {
  dotsLineOrnament,
  underlineOrnament,
  waveOrnament,
  zigzagOrnament,
} from './ornamentLines.mjs';
import {
  chevronsOrnament,
  confettiOrnament,
  crossOrnament,
  glintsOrnament,
  petalsOrnament,
  shardsOrnament,
  sparkleOrnament,
  streaksOrnament,
} from './ornamentParticles.mjs';
import {
  bracketsOrnament,
  dashCircleOrnament,
  halftoneOrnament,
  orbitOrnament,
  raysOrnament,
  ringOrnament,
  spokesOrnament,
  squaresOrnament,
  stampOrnament,
} from './ornamentShapes.mjs';
const ORNAMENT_BUILDERS = {
  ring: ringOrnament,
  spokes: spokesOrnament,
  sparkle: sparkleOrnament,
  orbit: orbitOrnament,
  chevrons: chevronsOrnament,
  brackets: bracketsOrnament,
  cross: crossOrnament,
  zigzag: zigzagOrnament,
  wave: waveOrnament,
  halftone: halftoneOrnament,
  confetti: confettiOrnament,
  shards: shardsOrnament,
  'dash-circle': dashCircleOrnament,
  squares: squaresOrnament,
  streaks: streaksOrnament,
  petals: petalsOrnament,
  stamp: stampOrnament,
  rays: raysOrnament,
  underline: underlineOrnament,
  'dots-line': dotsLineOrnament,
  glints: glintsOrnament,
};
const createOrnament = (spec, context) => {
  const kit = createKit(spec, context);
  const empty = context.amount <= 0;
  const draw = empty ? null : ORNAMENT_BUILDERS[spec.kind](kit);
  const firstSung = kit.glyphs.reduce(
    (min, glyph) => Math.min(min, glyph.sungAt),
    Number.POSITIVE_INFINITY,
  );
  const from = Math.min(kit.start, firstSung) - 0.05;
  const update = (time) => {
    const visible = draw !== null && time >= from && time <= kit.end;
    kit.view.visible = visible;
    if (visible) draw(time);
  };
  return {
    view: kit.view,
    update,
    destroy: () => kit.view.destroy({ children: true, context: true }),
  };
};
export { ORNAMENT_BUILDERS, createOrnament };
