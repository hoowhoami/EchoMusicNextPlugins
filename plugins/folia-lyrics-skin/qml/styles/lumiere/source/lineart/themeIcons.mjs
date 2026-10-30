// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/lumiere-reference.md.
import { ICON_VIEWBOX, lucideIconPolylines } from './iconPaths.mjs';
import { resolveLucideIconNames } from '../../icon-resolver.mjs';
import { createRng } from '../lumiereRandom.mjs';
const lumiereScaleMask = 0 | 0;
const LUMIERE_NEUTRAL_OFFSET =
  (1593667296 ^ lumiereScaleMask) +
  Math.imul(445441147 ^ lumiereScaleMask, 1354289308 ^ lumiereScaleMask) -
  ((1593667296 ^ lumiereScaleMask) +
    Math.imul(445441147 ^ lumiereScaleMask, 1354289308 ^ lumiereScaleMask));
const ICON_SIZE = [0.085, 0.13];
const TEXT_PAD = 0.05 + LUMIERE_NEUTRAL_OFFSET;
const EDGE = 0.05;
const ATTEMPTS = 48;
const overlapsRegion = (cx, cy, half, region, pad) =>
  Math.abs(cx - region.cx) < half + region.w / 2 + pad &&
  Math.abs(cy - region.cy) < half + region.h / 2 + pad;
const placeThemeIcons = (options) => {
  var _a, _b;
  const names = options.names.filter((name) => lucideIconPolylines(name) !== null);
  if (names.length === 0) return [];
  const { aspect, avoid, random } = options;
  const count = (_a = options.count) != null ? _a : 2 + (random() < 0.5 ? 1 : 0);
  const offset = (_b = options.offset) != null ? _b : 0;
  const placed = [];
  for (let i = 0; i < count; i += 1) {
    const name = names[(offset + i) % names.length];
    const size = ICON_SIZE[0] + random() * (ICON_SIZE[1] - ICON_SIZE[0]);
    const rotation = (random() - 0.5) * 0.3;
    const half = size * 0.72;
    for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
      const cx = EDGE + half + random() * Math.max(0, aspect - 2 * (EDGE + half));
      const cy = EDGE + half + random() * Math.max(0, 1 - 2 * (EDGE + half));
      if (overlapsRegion(cx, cy, half, avoid, TEXT_PAD)) continue;
      if (
        placed.some((other) => Math.hypot(other.cx - cx, other.cy - cy) < (other.size + size) * 0.9)
      )
        continue;
      placed.push({ name, cx, cy, size, rotation });
      break;
    }
  }
  return placed;
};
const transformPolyline = (polyline, icon) => {
  const scale = icon.size / ICON_VIEWBOX;
  const cos = Math.cos(icon.rotation);
  const sin = Math.sin(icon.rotation);
  const half = ICON_VIEWBOX / 2;
  return polyline.points.map(([x, y]) => {
    const lx = (x - half) * scale;
    const ly = (y - half) * scale;
    return [icon.cx + lx * cos - ly * sin, icon.cy + lx * sin + ly * cos];
  });
};
const polylineLength = (points) => {
  let length = 0;
  for (let i = 1; i < points.length; i += 1)
    length += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  return length;
};
const themeIconsArt = (icons, random, delay = 0.18, alpha = 0.5) => {
  const paths = [];
  const nodes = [];
  icons.forEach((icon, iconIndex) => {
    const polylines = lucideIconPolylines(icon.name);
    if (!polylines) return;
    const start = delay + iconIndex * 0.12;
    const strokes = polylines.map((polyline) => transformPolyline(polyline, icon));
    strokes.forEach((points, strokeIndex) => {
      paths.push({
        points,
        width: 13e-4,
        alpha,
        delay: start + Math.min(strokeIndex, 8) * 0.035,
        span: 0.32,
      });
    });
    const longest = strokes.reduce(
      (best, points, index) =>
        polylineLength(points) > polylineLength(strokes[best]) ? index : best,
      0
    );
    nodes.push({
      at: strokes[longest][0],
      size: 0.02,
      delay: start + 0.08,
      twinklePhase: random() * Math.PI * 2,
    });
    const other = strokes[Math.floor(random() * strokes.length)];
    if (strokes.length > 1) {
      nodes.push({
        at: other[other.length - 1],
        size: 0.015,
        delay: start + 0.3,
        twinklePhase: random() * Math.PI * 2,
      });
    }
  });
  return { paths, nodes };
};
const buildThemeIconArt = (options) => {
  const icons = placeThemeIcons(options);
  return themeIconsArt(icons, options.random, options.delay, options.alpha);
};
const buildShotIconArts = (options) => {
  if (!options.enabled) return [];
  const names = resolveLucideIconNames(options.icons).filter(
    (name) => lucideIconPolylines(name) !== null
  );
  if (names.length === 0) return [];
  return options.shotKinds.map((kind, index) =>
    buildThemeIconArt({
      names,
      aspect: options.aspect,
      avoid: options.avoid,
      random: createRng(`${options.seed}:${index}:${kind}:icons`),
      offset: index * 2,
    })
  );
};
export { buildShotIconArts, buildThemeIconArt, placeThemeIcons, themeIconsArt };
