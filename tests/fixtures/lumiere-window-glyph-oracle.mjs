// Frozen original Folia glyph trajectory for exact optimization comparisons.
// Derived from Folia a8da4437, AGPL-3.0-only.
import {
  smooth,
  LEAD,
  GATHER_LEAD,
  GATHER,
  flightProgress,
  flightPoint,
  lerp,
  easeInOutSine,
  lerpPoint,
  decayAmount,
} from '../../plugins/folia-lyrics-skin/qml/styles/lumiere/source/text/windowTiming.mjs';
export function originalGlyphLocal(heroPx, decay) {
  return (view, glyph, time, transform) => {
    const at = (orient, wrap) =>
      view.flow[orient >= 0.5 ? 1 : 0][wrap >= 0.5 ? 1 : 0].points[glyph.index];
    let point = at(transform.restOrient, transform.restWrap);
    let orientation = transform.restOrient;
    let flying = 0;
    for (const move of transform.moves) {
      const target = at(move.toOrient, move.toWrap);
      if (move.fly) {
        const s = flightProgress(glyph.flight, move.phase);
        point = flightPoint(glyph.flight, point, target, s);
        orientation = lerp(orientation, move.toOrient, s);
        flying = Math.max(flying, Math.sin(Math.PI * s));
      } else {
        const k = easeInOutSine(move.phase);
        point = lerpPoint(point, target, k);
        orientation = lerp(orientation, move.toOrient, k);
      }
    }
    let x = point.x;
    let y = point.y;
    let rotation = glyph.vRotation * orientation + glyph.flight.spin * flying;
    const pulse = 1 - 0.28 * flying;
    const gather = smooth((time - (view.line.startTime - LEAD - GATHER_LEAD)) / GATHER);
    const scatter = (1 - gather) ** 2 * decay.strength;
    x += glyph.scatter.x * heroPx * scatter;
    y += glyph.scatter.y * heroPx * scatter;
    const amount = decayAmount(decay, glyph.timing.start, time) * glyph.drift.speed;
    x += glyph.drift.dx * heroPx * amount;
    y += glyph.drift.dy * heroPx * amount;
    rotation += glyph.drift.spin * amount * 0.18;
    const breath = heroPx * 0.022 * Math.min(1, decay.strength + 0.3);
    x += Math.sin(time * 0.9 + glyph.phase) * breath;
    y += Math.cos(time * 1.13 + glyph.phase * 1.7) * breath;
    return { x, y, rotation, gather, flying, scale: glyph.scale * pulse };
  };
}
