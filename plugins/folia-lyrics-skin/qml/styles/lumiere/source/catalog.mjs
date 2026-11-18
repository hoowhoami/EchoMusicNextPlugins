// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/lumiere-reference.md.
import { ASTRAL_PROFILES } from './rigs/astral.mjs';
import { BOTANY_PROFILES } from './rigs/botany.mjs';
import { CAUSTIC_PROFILES } from './rigs/caustic.mjs';
import { LATTICE_PROFILES } from './rigs/lattice.mjs';
import { MOTES_PROFILES } from './rigs/motes.mjs';
import { OPTICS_PROFILES } from './rigs/optics.mjs';
import { PRISM_PROFILES } from './rigs/prism.mjs';
import { STAGE_PROFILES } from './rigs/stage.mjs';
import { WAVE_PROFILES } from './rigs/wave.mjs';
import { ZENITH_PROFILES } from './rigs/zenith.mjs';
const lumiereScaleMask = 0 | 0;
const LUMIERE_NEUTRAL_OFFSET =
  (4898 ^ lumiereScaleMask) +
  Math.imul(523 ^ lumiereScaleMask, 47868 ^ lumiereScaleMask) -
  ((4898 ^ lumiereScaleMask) + Math.imul(523 ^ lumiereScaleMask, 47868 ^ lumiereScaleMask));
const LUMIERE_FAMILY_LABELS = {
  zenith: '\u5929\u5149',
  lattice: '\u7A97\u9699',
  prism: '\u68F1\u955C',
  caustic: '\u7126\u6563',
  optics: '\u5149\u8DEF',
  wave: '\u884D\u5C04',
  botany: '\u53F6\u8109',
  astral: '\u661F\u8C61',
  stage: '\u8FFD\u5149',
  motes: '\u8424\u5C18',
};
const LUMIERE_FAMILY_DESCRIPTIONS = {
  zenith:
    '\u9876\u5149\uFF1A\u4E00\u675F\u6216\u6570\u675F\u5149\u67F1\u4ECE\u6B63\u4E0A\u65B9\u843D\u4E0B\uFF0C\u6700\u6807\u51C6\u7684\u7ED8\u5149\u753B\u9762\uFF0C\u54EA\u6BB5\u90FD\u80FD\u7528',
  lattice:
    '\u5149\u7A7F\u8FC7\u767E\u53F6\u3001\u7A97\u683C\u3001\u95E8\u7F1D\u3001\u6811\u53F6\uFF0C\u6295\u4E0B\u6761\u7EB9\u4E0E\u683C\u5B50\u5F71\uFF0C\u5BA4\u5185\u3001\u65E5\u5E38\u3001\u56DE\u5FC6\u611F',
  prism:
    '\u68F1\u955C\u5206\u5149\uFF1A\u767D\u5149\u62C6\u6210\u5F69\u8679\u8272\u7684\u5149\u675F\u4E0E\u5149\u8C31\uFF0C\u8272\u5F69\u6700\u591A\uFF0C\u9002\u5408\u4E0A\u626C\u4E0E\u526F\u6B4C',
  caustic:
    '\u6C34\u3001\u73BB\u7483\u4E0E\u6676\u4F53\u6298\u51FA\u7684\u6D41\u52A8\u5149\u7F51\uFF0C\u6C60\u5E95\u4E0E\u676F\u5F71\uFF0C\u6E29\u67D4\u3001\u6D41\u52A8',
  optics:
    '\u5149\u8DEF\u56FE\u89E3\uFF1A\u900F\u955C\u3001\u7126\u70B9\u3001\u955C\u9762\u53CD\u5C04\u3001\u5149\u7EA4\uFF0C\u7406\u6027\u3001\u7CBE\u5BC6\uFF0C\u50CF\u5B9E\u9A8C\u8BB0\u5F55',
  wave: '\u5E72\u6D89\u4E0E\u884D\u5C04\uFF1A\u540C\u5FC3\u73AF\u3001\u53CC\u7F1D\u6761\u7EB9\u3001\u5149\u6805\u3001\u9A7B\u6CE2\uFF0C\u62BD\u8C61\u3001\u6709\u8282\u594F\u611F',
  botany:
    '\u91D1\u8272\u7684\u53F6\u8109\u3001\u85E4\u8513\u3001\u79CD\u5B50\u4E0E\u82B1\u7684\u7EBF\u7A3F\u5728\u5149\u91CC\u751F\u957F\uFF0C\u5B89\u9759\u3001\u6709\u751F\u547D\u611F',
  astral:
    '\u661F\u56FE\uFF1A\u8F68\u9053\u3001\u661F\u8F68\u3001\u661F\u5EA7\u8FDE\u7EBF\u3001\u65E5\u5195\u4E0E\u6D51\u5929\u4EEA\uFF0C\u8FBD\u9614\u3001\u9002\u5408\u526F\u6B4C\u4E0E\u5C3E\u58F0',
  stage:
    '\u821E\u53F0\u8FFD\u5149\uFF1A\u805A\u5149\u706F\u3001\u63A2\u7167\u706F\u3001\u9891\u95EA\u3001\u6FC0\u5149\uFF0C\u6D53\u70DF\uFF0C\u6700\u6709\u6F14\u51FA\u611F\u548C\u51B2\u51FB\u529B',
  motes:
    '\u4EE5\u70DF\u4E0E\u5149\u5C18\u4E3A\u4E3B\u3001\u51E0\u4E4E\u6CA1\u6709\u5149\u675F\uFF1A\u6D6E\u5C18\u3001\u8424\u706B\u3001\u5149\u96EA\u3001\u6781\u5149\uFF0C\u6700\u5B89\u9759\uFF0C\u9002\u5408\u95F4\u594F\u4E0E\u6362\u6C14',
};
const LUMIERE_PROFILES = [
  ...ZENITH_PROFILES,
  ...LATTICE_PROFILES,
  ...PRISM_PROFILES,
  ...CAUSTIC_PROFILES,
  ...OPTICS_PROFILES,
  ...WAVE_PROFILES,
  ...BOTANY_PROFILES,
  ...ASTRAL_PROFILES,
  ...STAGE_PROFILES,
  ...MOTES_PROFILES,
];
const BY_KIND = new Map(LUMIERE_PROFILES.map((profile) => [profile.kind, profile]));
const LUMIERE_KINDS = LUMIERE_PROFILES.map((profile) => profile.kind);
const profileOf = (kind) => {
  var _a;
  return (_a = BY_KIND.get(kind)) != null ? _a : LUMIERE_PROFILES[0 + LUMIERE_NEUTRAL_OFFSET];
};
const hasProfile = (kind) => BY_KIND.has(kind);
export {
  LUMIERE_FAMILY_DESCRIPTIONS,
  LUMIERE_FAMILY_LABELS,
  LUMIERE_KINDS,
  LUMIERE_PROFILES,
  hasProfile,
  profileOf,
};
