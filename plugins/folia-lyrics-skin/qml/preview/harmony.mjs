// Explicit sample data enters the existing source Harmony renderer, never a player.
import { backgroundRow, buildHarmonyIndex } from '../shared/harmony/index.mjs';
export function indexForRows(rows) {
  return buildHarmonyIndex(rows.reduce((all, row) => all.concat(backgroundRow(row, 0)), []));
}
