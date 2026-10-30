// Derived from Folia a8da4437 (AGPL-3.0-only). See sonnet-reference.md.
import {
  SONNET_CELESTIAL_DRAWERS,
  SONNET_CELESTIAL_GEO_VARIANTS,
} from './sonnetShotMgCelestial.mjs';
import { SONNET_MARINE_DRAWERS, SONNET_MARINE_GEO_VARIANTS } from './sonnetShotMgMarine.mjs';
import { SONNET_MUSIC_DRAWERS, SONNET_MUSIC_GEO_VARIANTS } from './sonnetShotMgMusic.mjs';
import { SONNET_CRAFT_DRAWERS, SONNET_CRAFT_GEO_VARIANTS } from './sonnetShotMgCraft.mjs';
import { SONNET_KINETIC_DRAWERS, SONNET_KINETIC_GEO_VARIANTS } from './sonnetShotMgKinetic.mjs';
const SONNET_EXTENDED_GEO_VARIANT_START = 48,
  SONNET_EXTENDED_GEO_VARIANT_COUNT = 52,
  SONNET_EXTENDED_GEO_VARIANTS = [
    ...SONNET_CELESTIAL_GEO_VARIANTS,
    ...SONNET_MARINE_GEO_VARIANTS,
    ...SONNET_MUSIC_GEO_VARIANTS,
    ...SONNET_CRAFT_GEO_VARIANTS,
    ...SONNET_KINETIC_GEO_VARIANTS,
  ],
  EXTENDED_DRAWERS = [
    ...SONNET_CELESTIAL_DRAWERS,
    ...SONNET_MARINE_DRAWERS,
    ...SONNET_MUSIC_DRAWERS,
    ...SONNET_CRAFT_DRAWERS,
    ...SONNET_KINETIC_DRAWERS,
  ],
  drawExtendedSonnetShotMg = (options) => {
    const index = options.variant - SONNET_EXTENDED_GEO_VARIANT_START,
      drawer = EXTENDED_DRAWERS[index];
    return drawer ? (drawer(options), !0) : !1;
  };
export {
  SONNET_EXTENDED_GEO_VARIANTS,
  SONNET_EXTENDED_GEO_VARIANT_COUNT,
  SONNET_EXTENDED_GEO_VARIANT_START,
  drawExtendedSonnetShotMg,
};
