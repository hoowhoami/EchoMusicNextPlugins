// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/lumiere-reference.md.
import {
  createProtectBox,
  PROTECT_MARGIN,
  protectedAlpha,
  protectionAt,
} from './lineClearance.mjs';
import { clamp01, easeInOutSine, LEAD, lerp, SLIDE } from './windowTiming.mjs';
const createWindowProtection = ({ lines, heroPx, lineOf }) => {
  const protectBoxes = [
    createProtectBox(),
    createProtectBox(),
    createProtectBox(),
    createProtectBox(),
  ];
  let protectCount = 0;
  const buildProtectBoxes = (time, current, low, frameTransforms) => {
    protectCount = 0;
    let later = 0;
    for (let j = current; j >= low && protectCount < protectBoxes.length; j -= 1) {
      const eased = easeInOutSine((time - (lines[j].startTime - LEAD)) / SLIDE);
      const transform = frameTransforms[j];
      const o = clamp01(transform.orient);
      const weight = (eased - later) * clamp01(transform.alpha) * (1 - 4 * o * (1 - o));
      later = eased;
      if (weight > 1e-4) {
        const [hSingle, hWrapped] = lineOf(j).flow[0];
        const [vSingle, vWrapped] = lineOf(j).flow[1];
        const w = transform.wrap;
        const inkW = lerp(
          lerp(hSingle.inkWidth, hWrapped.inkWidth, w),
          lerp(vSingle.inkWidth, vWrapped.inkWidth, w),
          transform.orient
        );
        const inkH = lerp(
          lerp(hSingle.inkHeight, hWrapped.inkHeight, w),
          lerp(vSingle.inkHeight, vWrapped.inkHeight, w),
          transform.orient
        );
        const box = protectBoxes[protectCount];
        box.line = j;
        box.x = transform.x;
        box.y = transform.y;
        box.cos = Math.cos(transform.rotation);
        box.sin = Math.sin(transform.rotation);
        box.halfW = (inkW / 2) * transform.scale;
        box.halfH = (inkH / 2) * transform.scale;
        box.margin = PROTECT_MARGIN * heroPx * transform.scale;
        box.weight = weight;
        protectCount += 1;
      }
      if (eased >= 1) break;
    }
  };
  return {
    build: buildProtectBoxes,
    /** 第 index 行一个字（画面坐标、半径）的保护系数：落进别的行的保护框就压暗，飞行途中按飞行强度不压。 */
    shield: (index, x, y, radius, flying) =>
      protectCount > 0
        ? protectedAlpha(
            protectionAt(protectBoxes, protectCount, index, x, y, radius) * (1 - flying)
          )
        : 1,
  };
};
export { createWindowProtection };
