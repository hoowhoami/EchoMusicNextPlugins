// Derived from Folia a8da4437 (AGPL-3.0-only). See sonnet-reference.md.
import {
  drawSonnetCityFacadeMg,
  drawSonnetGreenhouseMg,
  drawSonnetPagodaMg,
} from './sonnetShotMgArchitecture.mjs';
import {
  drawSonnetClimbingVineMg,
  drawSonnetFernMg,
  drawSonnetGinkgoMg,
} from './sonnetShotMgBotanical.mjs';
import {
  drawSonnetCamelliaMg,
  drawSonnetTulipFieldMg,
  drawSonnetWildflowerMg,
} from './sonnetShotMgFlora.mjs';
import {
  drawSonnetCoastalCliffMg,
  drawSonnetMountainLakeMg,
  drawSonnetTerracesMg,
} from './sonnetShotMgLandscape.mjs';
const SONNET_THEMED_GEO_VARIANT_START = 24,
  SONNET_THEMED_GEO_VARIANT_COUNT = 12,
  SONNET_THEMED_GEO_VARIANTS = [
    'camellia',
    'tulip-field',
    'wildflower',
    'fern',
    'ginkgo',
    'climbing-vine',
    'greenhouse',
    'pagoda',
    'city-facade',
    'terraces',
    'mountain-lake',
    'coastal-cliff',
  ],
  THEMED_DRAWERS = [
    drawSonnetCamelliaMg,
    drawSonnetTulipFieldMg,
    drawSonnetWildflowerMg,
    drawSonnetFernMg,
    drawSonnetGinkgoMg,
    drawSonnetClimbingVineMg,
    drawSonnetGreenhouseMg,
    drawSonnetPagodaMg,
    drawSonnetCityFacadeMg,
    drawSonnetTerracesMg,
    drawSonnetMountainLakeMg,
    drawSonnetCoastalCliffMg,
  ],
  drawThemedSonnetShotMg = (options) => {
    const index = options.variant - SONNET_THEMED_GEO_VARIANT_START,
      drawer = THEMED_DRAWERS[index];
    return drawer ? (drawer(options), !0) : !1;
  };
export {
  SONNET_THEMED_GEO_VARIANTS,
  SONNET_THEMED_GEO_VARIANT_COUNT,
  SONNET_THEMED_GEO_VARIANT_START,
  drawThemedSonnetShotMg,
};
