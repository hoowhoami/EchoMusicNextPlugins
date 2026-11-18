// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/hanabi/text/lyricText.ts
var __defProp = Object.defineProperty;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value })
    : (obj[key] = value);
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {})) if (__hasOwnProp.call(b, prop)) __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop)) __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
import {
  buildLineGraphemeTimeline,
  splitLyricGraphemes,
} from '../../../../shared/text/graphemeTiming.mjs';
import { segmentLyricWords } from '../../../lumiere/word-segmentation.mjs';
import { createRng } from '../hanabiRandom.mjs';
import { resolveThemeFontStack, resolveThemeFontWeight } from '../_shared/utils/fontStacks.mjs';
import { hanabiBackdropOf, resolveHanabiGlyphColors } from '../color.mjs';
import {
  clamp01,
  combinePoses,
  ENTER_ARRIVAL,
  enterOrder,
  enterPose,
  exitPose,
  restPose,
  restSing,
  scheduleEnter,
  scheduleExit,
  singPose,
  stampShake,
  STAMP_IMPACT,
} from './animations.mjs';
import { blockLayoutParams, blockTextRole, createBlocks, darken, runFrame } from './blocks.mjs';
import {
  buildGlyphAtlas,
  createGlyphMeasure,
  isUprightGlyph,
  pickScrambleChars,
} from './glyphs.mjs';
import { layoutText, wordScales } from './layout.mjs';
const lineWords = (line, count) => {
  const words = [];
  let cursor = 0;
  segmentLyricWords(line).forEach((segment) => {
    const length = splitLyricGraphemes(segment.segment).length;
    if (length === 0) return;
    const space = segment.segment.trim().length === 0;
    words.push({
      text: segment.segment,
      start: cursor,
      end: cursor + length,
      blank: space || !segment.isWordLike,
      space,
      scale: 1,
    });
    cursor += length;
  });
  if (cursor === count) return words;
  return splitLyricGraphemes(line.fullText).map((char, index) => {
    const space = char.trim().length === 0;
    return {
      text: char,
      start: index,
      end: index + 1,
      blank:
        space ||
        !/[\u{41}-\u{5a}\u{61}-\u{7a}\u{aa}\u{b5}\u{ba}\u{c0}-\u{d6}\u{d8}-\u{f6}\u{f8}-\u{2c1}\u{2c6}-\u{2d1}\u{2e0}-\u{2e4}\u{2ec}\u{2ee}\u{370}-\u{374}\u{376}-\u{377}\u{37a}-\u{37d}\u{37f}\u{386}\u{388}-\u{38a}\u{38c}\u{38e}-\u{3a1}\u{3a3}-\u{3f5}\u{3f7}-\u{481}\u{48a}-\u{52f}\u{531}-\u{556}\u{559}\u{560}-\u{588}\u{5d0}-\u{5ea}\u{5ef}-\u{5f2}\u{620}-\u{64a}\u{66e}-\u{66f}\u{671}-\u{6d3}\u{6d5}\u{6e5}-\u{6e6}\u{6ee}-\u{6ef}\u{6fa}-\u{6fc}\u{6ff}\u{710}\u{712}-\u{72f}\u{74d}-\u{7a5}\u{7b1}\u{7ca}-\u{7ea}\u{7f4}-\u{7f5}\u{7fa}\u{800}-\u{815}\u{81a}\u{824}\u{828}\u{840}-\u{858}\u{860}-\u{86a}\u{870}-\u{887}\u{889}-\u{88f}\u{8a0}-\u{8c9}\u{904}-\u{939}\u{93d}\u{950}\u{958}-\u{961}\u{971}-\u{980}\u{985}-\u{98c}\u{98f}-\u{990}\u{993}-\u{9a8}\u{9aa}-\u{9b0}\u{9b2}\u{9b6}-\u{9b9}\u{9bd}\u{9ce}\u{9dc}-\u{9dd}\u{9df}-\u{9e1}\u{9f0}-\u{9f1}\u{9fc}\u{a05}-\u{a0a}\u{a0f}-\u{a10}\u{a13}-\u{a28}\u{a2a}-\u{a30}\u{a32}-\u{a33}\u{a35}-\u{a36}\u{a38}-\u{a39}\u{a59}-\u{a5c}\u{a5e}\u{a72}-\u{a74}\u{a85}-\u{a8d}\u{a8f}-\u{a91}\u{a93}-\u{aa8}\u{aaa}-\u{ab0}\u{ab2}-\u{ab3}\u{ab5}-\u{ab9}\u{abd}\u{ad0}\u{ae0}-\u{ae1}\u{af9}\u{b05}-\u{b0c}\u{b0f}-\u{b10}\u{b13}-\u{b28}\u{b2a}-\u{b30}\u{b32}-\u{b33}\u{b35}-\u{b39}\u{b3d}\u{b5c}-\u{b5d}\u{b5f}-\u{b61}\u{b71}\u{b83}\u{b85}-\u{b8a}\u{b8e}-\u{b90}\u{b92}-\u{b95}\u{b99}-\u{b9a}\u{b9c}\u{b9e}-\u{b9f}\u{ba3}-\u{ba4}\u{ba8}-\u{baa}\u{bae}-\u{bb9}\u{bd0}\u{c05}-\u{c0c}\u{c0e}-\u{c10}\u{c12}-\u{c28}\u{c2a}-\u{c39}\u{c3d}\u{c58}-\u{c5a}\u{c5c}-\u{c5d}\u{c60}-\u{c61}\u{c80}\u{c85}-\u{c8c}\u{c8e}-\u{c90}\u{c92}-\u{ca8}\u{caa}-\u{cb3}\u{cb5}-\u{cb9}\u{cbd}\u{cdc}-\u{cde}\u{ce0}-\u{ce1}\u{cf1}-\u{cf2}\u{d04}-\u{d0c}\u{d0e}-\u{d10}\u{d12}-\u{d3a}\u{d3d}\u{d4e}\u{d54}-\u{d56}\u{d5f}-\u{d61}\u{d7a}-\u{d7f}\u{d85}-\u{d96}\u{d9a}-\u{db1}\u{db3}-\u{dbb}\u{dbd}\u{dc0}-\u{dc6}\u{e01}-\u{e30}\u{e32}-\u{e33}\u{e40}-\u{e46}\u{e81}-\u{e82}\u{e84}\u{e86}-\u{e8a}\u{e8c}-\u{ea3}\u{ea5}\u{ea7}-\u{eb0}\u{eb2}-\u{eb3}\u{ebd}\u{ec0}-\u{ec4}\u{ec6}\u{edc}-\u{edf}\u{f00}\u{f40}-\u{f47}\u{f49}-\u{f6c}\u{f88}-\u{f8c}\u{1000}-\u{102a}\u{103f}\u{1050}-\u{1055}\u{105a}-\u{105d}\u{1061}\u{1065}-\u{1066}\u{106e}-\u{1070}\u{1075}-\u{1081}\u{108e}\u{10a0}-\u{10c5}\u{10c7}\u{10cd}\u{10d0}-\u{10fa}\u{10fc}-\u{1248}\u{124a}-\u{124d}\u{1250}-\u{1256}\u{1258}\u{125a}-\u{125d}\u{1260}-\u{1288}\u{128a}-\u{128d}\u{1290}-\u{12b0}\u{12b2}-\u{12b5}\u{12b8}-\u{12be}\u{12c0}\u{12c2}-\u{12c5}\u{12c8}-\u{12d6}\u{12d8}-\u{1310}\u{1312}-\u{1315}\u{1318}-\u{135a}\u{1380}-\u{138f}\u{13a0}-\u{13f5}\u{13f8}-\u{13fd}\u{1401}-\u{166c}\u{166f}-\u{167f}\u{1681}-\u{169a}\u{16a0}-\u{16ea}\u{16f1}-\u{16f8}\u{1700}-\u{1711}\u{171f}-\u{1731}\u{1740}-\u{1751}\u{1760}-\u{176c}\u{176e}-\u{1770}\u{1780}-\u{17b3}\u{17d7}\u{17dc}\u{1820}-\u{1878}\u{1880}-\u{1884}\u{1887}-\u{18a8}\u{18aa}\u{18b0}-\u{18f5}\u{1900}-\u{191e}\u{1950}-\u{196d}\u{1970}-\u{1974}\u{1980}-\u{19ab}\u{19b0}-\u{19c9}\u{1a00}-\u{1a16}\u{1a20}-\u{1a54}\u{1aa7}\u{1b05}-\u{1b33}\u{1b45}-\u{1b4c}\u{1b83}-\u{1ba0}\u{1bae}-\u{1baf}\u{1bba}-\u{1be5}\u{1c00}-\u{1c23}\u{1c4d}-\u{1c4f}\u{1c5a}-\u{1c7d}\u{1c80}-\u{1c8a}\u{1c90}-\u{1cba}\u{1cbd}-\u{1cbf}\u{1ce9}-\u{1cec}\u{1cee}-\u{1cf3}\u{1cf5}-\u{1cf6}\u{1cfa}\u{1d00}-\u{1dbf}\u{1e00}-\u{1f15}\u{1f18}-\u{1f1d}\u{1f20}-\u{1f45}\u{1f48}-\u{1f4d}\u{1f50}-\u{1f57}\u{1f59}\u{1f5b}\u{1f5d}\u{1f5f}-\u{1f7d}\u{1f80}-\u{1fb4}\u{1fb6}-\u{1fbc}\u{1fbe}\u{1fc2}-\u{1fc4}\u{1fc6}-\u{1fcc}\u{1fd0}-\u{1fd3}\u{1fd6}-\u{1fdb}\u{1fe0}-\u{1fec}\u{1ff2}-\u{1ff4}\u{1ff6}-\u{1ffc}\u{2071}\u{207f}\u{2090}-\u{209c}\u{2102}\u{2107}\u{210a}-\u{2113}\u{2115}\u{2119}-\u{211d}\u{2124}\u{2126}\u{2128}\u{212a}-\u{212d}\u{212f}-\u{2139}\u{213c}-\u{213f}\u{2145}-\u{2149}\u{214e}\u{2183}-\u{2184}\u{2c00}-\u{2ce4}\u{2ceb}-\u{2cee}\u{2cf2}-\u{2cf3}\u{2d00}-\u{2d25}\u{2d27}\u{2d2d}\u{2d30}-\u{2d67}\u{2d6f}\u{2d80}-\u{2d96}\u{2da0}-\u{2da6}\u{2da8}-\u{2dae}\u{2db0}-\u{2db6}\u{2db8}-\u{2dbe}\u{2dc0}-\u{2dc6}\u{2dc8}-\u{2dce}\u{2dd0}-\u{2dd6}\u{2dd8}-\u{2dde}\u{2e2f}\u{3005}-\u{3006}\u{3031}-\u{3035}\u{303b}-\u{303c}\u{3041}-\u{3096}\u{309d}-\u{309f}\u{30a1}-\u{30fa}\u{30fc}-\u{30ff}\u{3105}-\u{312f}\u{3131}-\u{318e}\u{31a0}-\u{31bf}\u{31f0}-\u{31ff}\u{3400}-\u{4dbf}\u{4e00}-\u{a48c}\u{a4d0}-\u{a4fd}\u{a500}-\u{a60c}\u{a610}-\u{a61f}\u{a62a}-\u{a62b}\u{a640}-\u{a66e}\u{a67f}-\u{a69d}\u{a6a0}-\u{a6e5}\u{a717}-\u{a71f}\u{a722}-\u{a788}\u{a78b}-\u{a7dc}\u{a7f1}-\u{a801}\u{a803}-\u{a805}\u{a807}-\u{a80a}\u{a80c}-\u{a822}\u{a840}-\u{a873}\u{a882}-\u{a8b3}\u{a8f2}-\u{a8f7}\u{a8fb}\u{a8fd}-\u{a8fe}\u{a90a}-\u{a925}\u{a930}-\u{a946}\u{a960}-\u{a97c}\u{a984}-\u{a9b2}\u{a9cf}\u{a9e0}-\u{a9e4}\u{a9e6}-\u{a9ef}\u{a9fa}-\u{a9fe}\u{aa00}-\u{aa28}\u{aa40}-\u{aa42}\u{aa44}-\u{aa4b}\u{aa60}-\u{aa76}\u{aa7a}\u{aa7e}-\u{aaaf}\u{aab1}\u{aab5}-\u{aab6}\u{aab9}-\u{aabd}\u{aac0}\u{aac2}\u{aadb}-\u{aadd}\u{aae0}-\u{aaea}\u{aaf2}-\u{aaf4}\u{ab01}-\u{ab06}\u{ab09}-\u{ab0e}\u{ab11}-\u{ab16}\u{ab20}-\u{ab26}\u{ab28}-\u{ab2e}\u{ab30}-\u{ab5a}\u{ab5c}-\u{ab69}\u{ab70}-\u{abe2}\u{ac00}-\u{d7a3}\u{d7b0}-\u{d7c6}\u{d7cb}-\u{d7fb}\u{f900}-\u{fa6d}\u{fa70}-\u{fad9}\u{fb00}-\u{fb06}\u{fb13}-\u{fb17}\u{fb1d}\u{fb1f}-\u{fb28}\u{fb2a}-\u{fb36}\u{fb38}-\u{fb3c}\u{fb3e}\u{fb40}-\u{fb41}\u{fb43}-\u{fb44}\u{fb46}-\u{fbb1}\u{fbd3}-\u{fd3d}\u{fd50}-\u{fd8f}\u{fd92}-\u{fdc7}\u{fdf0}-\u{fdfb}\u{fe70}-\u{fe74}\u{fe76}-\u{fefc}\u{ff21}-\u{ff3a}\u{ff41}-\u{ff5a}\u{ff66}-\u{ffbe}\u{ffc2}-\u{ffc7}\u{ffca}-\u{ffcf}\u{ffd2}-\u{ffd7}\u{ffda}-\u{ffdc}\u{10000}-\u{1000b}\u{1000d}-\u{10026}\u{10028}-\u{1003a}\u{1003c}-\u{1003d}\u{1003f}-\u{1004d}\u{10050}-\u{1005d}\u{10080}-\u{100fa}\u{10280}-\u{1029c}\u{102a0}-\u{102d0}\u{10300}-\u{1031f}\u{1032d}-\u{10340}\u{10342}-\u{10349}\u{10350}-\u{10375}\u{10380}-\u{1039d}\u{103a0}-\u{103c3}\u{103c8}-\u{103cf}\u{10400}-\u{1049d}\u{104b0}-\u{104d3}\u{104d8}-\u{104fb}\u{10500}-\u{10527}\u{10530}-\u{10563}\u{10570}-\u{1057a}\u{1057c}-\u{1058a}\u{1058c}-\u{10592}\u{10594}-\u{10595}\u{10597}-\u{105a1}\u{105a3}-\u{105b1}\u{105b3}-\u{105b9}\u{105bb}-\u{105bc}\u{105c0}-\u{105f3}\u{10600}-\u{10736}\u{10740}-\u{10755}\u{10760}-\u{10767}\u{10780}-\u{10785}\u{10787}-\u{107b0}\u{107b2}-\u{107ba}\u{10800}-\u{10805}\u{10808}\u{1080a}-\u{10835}\u{10837}-\u{10838}\u{1083c}\u{1083f}-\u{10855}\u{10860}-\u{10876}\u{10880}-\u{1089e}\u{108e0}-\u{108f2}\u{108f4}-\u{108f5}\u{10900}-\u{10915}\u{10920}-\u{10939}\u{10940}-\u{10959}\u{10980}-\u{109b7}\u{109be}-\u{109bf}\u{10a00}\u{10a10}-\u{10a13}\u{10a15}-\u{10a17}\u{10a19}-\u{10a35}\u{10a60}-\u{10a7c}\u{10a80}-\u{10a9c}\u{10ac0}-\u{10ac7}\u{10ac9}-\u{10ae4}\u{10b00}-\u{10b35}\u{10b40}-\u{10b55}\u{10b60}-\u{10b72}\u{10b80}-\u{10b91}\u{10c00}-\u{10c48}\u{10c80}-\u{10cb2}\u{10cc0}-\u{10cf2}\u{10d00}-\u{10d23}\u{10d4a}-\u{10d65}\u{10d6f}-\u{10d85}\u{10e80}-\u{10ea9}\u{10eb0}-\u{10eb1}\u{10ec2}-\u{10ec7}\u{10f00}-\u{10f1c}\u{10f27}\u{10f30}-\u{10f45}\u{10f70}-\u{10f81}\u{10fb0}-\u{10fc4}\u{10fe0}-\u{10ff6}\u{11003}-\u{11037}\u{11071}-\u{11072}\u{11075}\u{11083}-\u{110af}\u{110d0}-\u{110e8}\u{11103}-\u{11126}\u{11144}\u{11147}\u{11150}-\u{11172}\u{11176}\u{11183}-\u{111b2}\u{111c1}-\u{111c4}\u{111da}\u{111dc}\u{11200}-\u{11211}\u{11213}-\u{1122b}\u{1123f}-\u{11240}\u{11280}-\u{11286}\u{11288}\u{1128a}-\u{1128d}\u{1128f}-\u{1129d}\u{1129f}-\u{112a8}\u{112b0}-\u{112de}\u{11305}-\u{1130c}\u{1130f}-\u{11310}\u{11313}-\u{11328}\u{1132a}-\u{11330}\u{11332}-\u{11333}\u{11335}-\u{11339}\u{1133d}\u{11350}\u{1135d}-\u{11361}\u{11380}-\u{11389}\u{1138b}\u{1138e}\u{11390}-\u{113b5}\u{113b7}\u{113d1}\u{113d3}\u{11400}-\u{11434}\u{11447}-\u{1144a}\u{1145f}-\u{11461}\u{11480}-\u{114af}\u{114c4}-\u{114c5}\u{114c7}\u{11580}-\u{115ae}\u{115d8}-\u{115db}\u{11600}-\u{1162f}\u{11644}\u{11680}-\u{116aa}\u{116b8}\u{11700}-\u{1171a}\u{11740}-\u{11746}\u{11800}-\u{1182b}\u{118a0}-\u{118df}\u{118ff}-\u{11906}\u{11909}\u{1190c}-\u{11913}\u{11915}-\u{11916}\u{11918}-\u{1192f}\u{1193f}\u{11941}\u{119a0}-\u{119a7}\u{119aa}-\u{119d0}\u{119e1}\u{119e3}\u{11a00}\u{11a0b}-\u{11a32}\u{11a3a}\u{11a50}\u{11a5c}-\u{11a89}\u{11a9d}\u{11ab0}-\u{11af8}\u{11bc0}-\u{11be0}\u{11c00}-\u{11c08}\u{11c0a}-\u{11c2e}\u{11c40}\u{11c72}-\u{11c8f}\u{11d00}-\u{11d06}\u{11d08}-\u{11d09}\u{11d0b}-\u{11d30}\u{11d46}\u{11d60}-\u{11d65}\u{11d67}-\u{11d68}\u{11d6a}-\u{11d89}\u{11d98}\u{11db0}-\u{11ddb}\u{11ee0}-\u{11ef2}\u{11f02}\u{11f04}-\u{11f10}\u{11f12}-\u{11f33}\u{11fb0}\u{12000}-\u{12399}\u{12480}-\u{12543}\u{12f90}-\u{12ff0}\u{13000}-\u{1342f}\u{13441}-\u{13446}\u{13460}-\u{143fa}\u{14400}-\u{14646}\u{16100}-\u{1611d}\u{16800}-\u{16a38}\u{16a40}-\u{16a5e}\u{16a70}-\u{16abe}\u{16ad0}-\u{16aed}\u{16b00}-\u{16b2f}\u{16b40}-\u{16b43}\u{16b63}-\u{16b77}\u{16b7d}-\u{16b8f}\u{16d40}-\u{16d6c}\u{16e40}-\u{16e7f}\u{16ea0}-\u{16eb8}\u{16ebb}-\u{16ed3}\u{16f00}-\u{16f4a}\u{16f50}\u{16f93}-\u{16f9f}\u{16fe0}-\u{16fe1}\u{16fe3}\u{16ff2}-\u{16ff3}\u{17000}-\u{18cd5}\u{18cff}-\u{18d1e}\u{18d80}-\u{18df2}\u{1aff0}-\u{1aff3}\u{1aff5}-\u{1affb}\u{1affd}-\u{1affe}\u{1b000}-\u{1b122}\u{1b132}\u{1b150}-\u{1b152}\u{1b155}\u{1b164}-\u{1b167}\u{1b170}-\u{1b2fb}\u{1bc00}-\u{1bc6a}\u{1bc70}-\u{1bc7c}\u{1bc80}-\u{1bc88}\u{1bc90}-\u{1bc99}\u{1d400}-\u{1d454}\u{1d456}-\u{1d49c}\u{1d49e}-\u{1d49f}\u{1d4a2}\u{1d4a5}-\u{1d4a6}\u{1d4a9}-\u{1d4ac}\u{1d4ae}-\u{1d4b9}\u{1d4bb}\u{1d4bd}-\u{1d4c3}\u{1d4c5}-\u{1d505}\u{1d507}-\u{1d50a}\u{1d50d}-\u{1d514}\u{1d516}-\u{1d51c}\u{1d51e}-\u{1d539}\u{1d53b}-\u{1d53e}\u{1d540}-\u{1d544}\u{1d546}\u{1d54a}-\u{1d550}\u{1d552}-\u{1d6a5}\u{1d6a8}-\u{1d6c0}\u{1d6c2}-\u{1d6da}\u{1d6dc}-\u{1d6fa}\u{1d6fc}-\u{1d714}\u{1d716}-\u{1d734}\u{1d736}-\u{1d74e}\u{1d750}-\u{1d76e}\u{1d770}-\u{1d788}\u{1d78a}-\u{1d7a8}\u{1d7aa}-\u{1d7c2}\u{1d7c4}-\u{1d7cb}\u{1df00}-\u{1df1e}\u{1df25}-\u{1df2a}\u{1e030}-\u{1e06d}\u{1e100}-\u{1e12c}\u{1e137}-\u{1e13d}\u{1e14e}\u{1e290}-\u{1e2ad}\u{1e2c0}-\u{1e2eb}\u{1e4d0}-\u{1e4eb}\u{1e5d0}-\u{1e5ed}\u{1e5f0}\u{1e6c0}-\u{1e6de}\u{1e6e0}-\u{1e6e2}\u{1e6e4}-\u{1e6e5}\u{1e6e7}-\u{1e6ed}\u{1e6f0}-\u{1e6f4}\u{1e6fe}-\u{1e6ff}\u{1e7e0}-\u{1e7e6}\u{1e7e8}-\u{1e7eb}\u{1e7ed}-\u{1e7ee}\u{1e7f0}-\u{1e7fe}\u{1e800}-\u{1e8c4}\u{1e900}-\u{1e943}\u{1e94b}\u{1ee00}-\u{1ee03}\u{1ee05}-\u{1ee1f}\u{1ee21}-\u{1ee22}\u{1ee24}\u{1ee27}\u{1ee29}-\u{1ee32}\u{1ee34}-\u{1ee37}\u{1ee39}\u{1ee3b}\u{1ee42}\u{1ee47}\u{1ee49}\u{1ee4b}\u{1ee4d}-\u{1ee4f}\u{1ee51}-\u{1ee52}\u{1ee54}\u{1ee57}\u{1ee59}\u{1ee5b}\u{1ee5d}\u{1ee5f}\u{1ee61}-\u{1ee62}\u{1ee64}\u{1ee67}-\u{1ee6a}\u{1ee6c}-\u{1ee72}\u{1ee74}-\u{1ee77}\u{1ee79}-\u{1ee7c}\u{1ee7e}\u{1ee80}-\u{1ee89}\u{1ee8b}-\u{1ee9b}\u{1eea1}-\u{1eea3}\u{1eea5}-\u{1eea9}\u{1eeab}-\u{1eebb}\u{20000}-\u{2a6df}\u{2a700}-\u{2b81d}\u{2b820}-\u{2cead}\u{2ceb0}-\u{2ebe0}\u{2ebf0}-\u{2ee5d}\u{2f800}-\u{2fa1d}\u{30000}-\u{3134a}\u{31350}-\u{33479}\u{30}-\u{39}\u{b2}-\u{b3}\u{b9}\u{bc}-\u{be}\u{660}-\u{669}\u{6f0}-\u{6f9}\u{7c0}-\u{7c9}\u{966}-\u{96f}\u{9e6}-\u{9ef}\u{9f4}-\u{9f9}\u{a66}-\u{a6f}\u{ae6}-\u{aef}\u{b66}-\u{b6f}\u{b72}-\u{b77}\u{be6}-\u{bf2}\u{c66}-\u{c6f}\u{c78}-\u{c7e}\u{ce6}-\u{cef}\u{d58}-\u{d5e}\u{d66}-\u{d78}\u{de6}-\u{def}\u{e50}-\u{e59}\u{ed0}-\u{ed9}\u{f20}-\u{f33}\u{1040}-\u{1049}\u{1090}-\u{1099}\u{1369}-\u{137c}\u{16ee}-\u{16f0}\u{17e0}-\u{17e9}\u{17f0}-\u{17f9}\u{1810}-\u{1819}\u{1946}-\u{194f}\u{19d0}-\u{19da}\u{1a80}-\u{1a89}\u{1a90}-\u{1a99}\u{1b50}-\u{1b59}\u{1bb0}-\u{1bb9}\u{1c40}-\u{1c49}\u{1c50}-\u{1c59}\u{2070}\u{2074}-\u{2079}\u{2080}-\u{2089}\u{2150}-\u{2182}\u{2185}-\u{2189}\u{2460}-\u{249b}\u{24ea}-\u{24ff}\u{2776}-\u{2793}\u{2cfd}\u{3007}\u{3021}-\u{3029}\u{3038}-\u{303a}\u{3192}-\u{3195}\u{3220}-\u{3229}\u{3248}-\u{324f}\u{3251}-\u{325f}\u{3280}-\u{3289}\u{32b1}-\u{32bf}\u{a620}-\u{a629}\u{a6e6}-\u{a6ef}\u{a830}-\u{a835}\u{a8d0}-\u{a8d9}\u{a900}-\u{a909}\u{a9d0}-\u{a9d9}\u{a9f0}-\u{a9f9}\u{aa50}-\u{aa59}\u{abf0}-\u{abf9}\u{ff10}-\u{ff19}\u{10107}-\u{10133}\u{10140}-\u{10178}\u{1018a}-\u{1018b}\u{102e1}-\u{102fb}\u{10320}-\u{10323}\u{10341}\u{1034a}\u{103d1}-\u{103d5}\u{104a0}-\u{104a9}\u{10858}-\u{1085f}\u{10879}-\u{1087f}\u{108a7}-\u{108af}\u{108fb}-\u{108ff}\u{10916}-\u{1091b}\u{109bc}-\u{109bd}\u{109c0}-\u{109cf}\u{109d2}-\u{109ff}\u{10a40}-\u{10a48}\u{10a7d}-\u{10a7e}\u{10a9d}-\u{10a9f}\u{10aeb}-\u{10aef}\u{10b58}-\u{10b5f}\u{10b78}-\u{10b7f}\u{10ba9}-\u{10baf}\u{10cfa}-\u{10cff}\u{10d30}-\u{10d39}\u{10d40}-\u{10d49}\u{10e60}-\u{10e7e}\u{10f1d}-\u{10f26}\u{10f51}-\u{10f54}\u{10fc5}-\u{10fcb}\u{11052}-\u{1106f}\u{110f0}-\u{110f9}\u{11136}-\u{1113f}\u{111d0}-\u{111d9}\u{111e1}-\u{111f4}\u{112f0}-\u{112f9}\u{11450}-\u{11459}\u{114d0}-\u{114d9}\u{11650}-\u{11659}\u{116c0}-\u{116c9}\u{116d0}-\u{116e3}\u{11730}-\u{1173b}\u{118e0}-\u{118f2}\u{11950}-\u{11959}\u{11bf0}-\u{11bf9}\u{11c50}-\u{11c6c}\u{11d50}-\u{11d59}\u{11da0}-\u{11da9}\u{11de0}-\u{11de9}\u{11f50}-\u{11f59}\u{11fc0}-\u{11fd4}\u{12400}-\u{1246e}\u{16130}-\u{16139}\u{16a60}-\u{16a69}\u{16ac0}-\u{16ac9}\u{16b50}-\u{16b59}\u{16b5b}-\u{16b61}\u{16d70}-\u{16d79}\u{16e80}-\u{16e96}\u{16ff4}-\u{16ff6}\u{1ccf0}-\u{1ccf9}\u{1d2c0}-\u{1d2d3}\u{1d2e0}-\u{1d2f3}\u{1d360}-\u{1d378}\u{1d7ce}-\u{1d7ff}\u{1e140}-\u{1e149}\u{1e2f0}-\u{1e2f9}\u{1e4f0}-\u{1e4f9}\u{1e5f1}-\u{1e5fa}\u{1e8c7}-\u{1e8cf}\u{1e950}-\u{1e959}\u{1ec71}-\u{1ecab}\u{1ecad}-\u{1ecaf}\u{1ecb1}-\u{1ecb4}\u{1ed01}-\u{1ed2d}\u{1ed2f}-\u{1ed3d}\u{1f100}-\u{1f10c}\u{1fbf0}-\u{1fbf9}]/u.test(
          char,
        ),
      space,
      scale: 1,
    };
  });
};
const mixColor = (a, b, t) => {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const r = ((a >> 16) & 255) + (((b >> 16) & 255) - ((a >> 16) & 255)) * t;
  const g = ((a >> 8) & 255) + (((b >> 8) & 255) - ((a >> 8) & 255)) * t;
  const bl = (a & 255) + ((b & 255) - (a & 255)) * t;
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(bl);
};
const OUTLINE_WIDTH = 0.085;
const SHADOW_OFFSET_X = 0.07;
const SHADOW_OFFSET_Y = 0.085;
const SHADOW_LAG = 0.045;
const REST_POSE = restPose();
const REST_SING = restSing();
const buildHanabiText = (options, deps = {}) => {
  var _a, _b, _c;
  const { pixi, spec, palette, line } = options;
  const motion = Math.max(0, options.motion);
  const font = resolveThemeFontStack(options.theme);
  const weight = resolveThemeFontWeight(options.theme, 800);
  const measure = (_a = deps.measure) != null ? _a : createGlyphMeasure(font, weight);
  const rng = createRng(`${options.seed}:text`);
  const timeline = buildLineGraphemeTimeline(line);
  const chars = timeline.map((item) => item.char);
  const words = lineWords(line, chars.length);
  const scales = wordScales(words, spec.emphasis, options.seed);
  words.forEach((word, index) => {
    word.scale = scales[index];
  });
  const glyphWord = new Array(chars.length).fill(0);
  words.forEach((word, index) => {
    for (let g = word.start; g < word.end; g += 1) glyphWord[g] = index;
  });
  const inputs = chars.map((char, index) => ({
    char,
    advance: measure(char),
    blank: char.trim().length === 0,
    upright: isUprightGlyph(char),
    word: glyphWord[index],
  }));
  const layoutParams = blockLayoutParams(spec.block, spec.hardShadow);
  const placement = layoutText(
    inputs,
    words,
    __spreadValues(
      {
        layout: spec.layout,
        regionWidth: options.regionWidth,
        regionHeight: options.regionHeight,
        fontPx: spec.heroSize * Math.min(options.width, options.height),
        tilt: spec.tilt,
        seed: options.seed,
      },
      layoutParams,
    ),
  );
  const glyphs = placement.glyphs;
  const centerX = placement.bounds.x + placement.bounds.width / 2;
  const centerY = placement.bounds.y + placement.bounds.height / 2;
  const visibleIndices = glyphs
    .map((glyph, index) => (glyph.blank ? -1 : index))
    .filter((index) => index >= 0);
  const visibleCount = visibleIndices.length;
  const orderRanks = enterOrder(spec.enter, visibleCount, rng);
  const enterRanks = new Array(chars.length).fill(-1);
  visibleIndices.forEach((index, ordinal) => {
    enterRanks[index] = orderRanks[ordinal];
  });
  const firstSung = visibleIndices.reduce(
    (min, index) => Math.min(min, timeline[index].startTime),
    Number.POSITIVE_INFINITY,
  );
  const deadline = Number.isFinite(firstSung) ? firstSung : line.startTime;
  const enter = scheduleEnter(spec.enter, enterRanks, options.enterAt, spec.stagger, deadline);
  const exitRanks = new Array(chars.length).fill(-1);
  const exitShuffle =
    spec.exit === 'scatter' || spec.exit === 'dissolve'
      ? enterOrder('scramble', visibleCount, createRng(`${options.seed}:exit-order`))
      : visibleIndices.map((_, ordinal) => ordinal);
  visibleIndices.forEach((index, ordinal) => {
    exitRanks[index] = exitShuffle[ordinal];
  });
  const exit = scheduleExit(exitRanks, options.exitAt, options.exitDuration);
  const view = new pixi.Container();
  view.label = 'hanabi-text';
  const blocksRoot = new pixi.Container({ isRenderGroup: true });
  blocksRoot.label = 'hanabi-text-blocks';
  const glyphsRoot = new pixi.Container({ isRenderGroup: true });
  glyphsRoot.label = 'hanabi-text-glyphs';
  view.addChild(blocksRoot, glyphsRoot);
  const blocksInner = new pixi.Container();
  const glyphsInner = new pixi.Container();
  blocksRoot.addChild(blocksInner);
  glyphsRoot.addChild(glyphsInner);
  const masked = new pixi.Container();
  const shadowLayer = new pixi.Container();
  const outlineLayer = new pixi.Container();
  const haloLayer = new pixi.Container();
  const fxLayer = new pixi.Container();
  const mainLayer = new pixi.Container();
  const overlayLayer = new pixi.Container();
  masked.addChild(shadowLayer, outlineLayer, haloLayer, fxLayer, mainLayer);
  glyphsInner.addChild(masked, overlayLayer);
  const blocks = createBlocks({
    pixi,
    style: spec.block,
    placement,
    words,
    palette,
    opacity: clamp01(options.blockOpacity),
    motion,
    exit: spec.exit,
    seed: options.seed,
    // 色块在字差不多到位时出现。
    enterStart: enter.start.map((start) => start + enter.duration * ENTER_ARRIVAL[spec.enter]),
    exitStart: exit.start,
    exitEnd: exit.end,
    centerX,
    centerY,
  });
  blocksInner.addChild(blocks.view);
  const needFx =
    spec.enter === 'glitch' ||
    spec.enter === 'zoom' ||
    spec.enter === 'split' ||
    spec.exit === 'dissolve';
  const halvesKind = spec.enter === 'split' ? (placement.vertical ? 'tb' : 'lr') : null;
  const charPx = /* @__PURE__ */ new Map();
  let maxSize = 0;
  visibleIndices.forEach((index) => {
    var _a2;
    const glyph = glyphs[index];
    const px = Math.ceil(glyph.size * 1.12);
    charPx.set(glyph.char, Math.max((_a2 = charPx.get(glyph.char)) != null ? _a2 : 0, px));
    maxSize = Math.max(maxSize, px);
  });
  const scrambleChars =
    spec.enter === 'scramble'
      ? pickScrambleChars(line.fullText, 14, createRng(`${options.seed}:scramble`))
      : [];
  const atlas = ((_b = deps.buildAtlas) != null ? _b : buildGlyphAtlas)(pixi, {
    font,
    weight,
    resolution: options.resolution,
    chars: charPx,
    scramble: scrambleChars.length > 0 ? { chars: scrambleChars, px: maxSize } : null,
    outline: spec.outline ? OUTLINE_WIDTH : 0,
    glow: spec.sing === 'glow',
    halves: halvesKind,
  });
  const role = blockTextRole(spec.block);
  const baseInk = role === 'ink' ? palette.ink : palette.paper;
  const firstBlock = (_c = palette.blocks[0]) != null ? _c : palette.accent;
  const backdrop = hanabiBackdropOf(palette);
  const makeSprite = (layer, texture) => {
    const sprite = new pixi.Sprite(texture);
    sprite.anchor.set(0.5);
    sprite.visible = false;
    layer.addChild(sprite);
    return sprite;
  };
  const slideDistance =
    (Math.max(options.regionWidth, options.regionHeight) * 0.8) / Math.max(1, placement.fontPx) + 3;
  const rigs = visibleIndices.map((index, ordinal) => {
    var _a2, _b2, _c2, _d, _e, _f, _g;
    const glyph = glyphs[index];
    const entry = atlas.entry(glyph.char);
    const word = words[glyph.word];
    const keyword =
      (_e =
        (_d =
          (_b2 = options.keywordColor) == null
            ? void 0
            : _b2.call(
                options,
                (_a2 = word == null ? void 0 : word.text) != null ? _a2 : glyph.char,
              )) != null
          ? _d
          : (_c2 = options.keywordColor) == null
            ? void 0
            : _c2.call(options, glyph.char)) != null
        ? _e
        : null;
    const under = blocks.colorOf(index);
    const colors = resolveHanabiGlyphColors(
      palette,
      keyword != null ? keyword : baseInk,
      under != null ? under : backdrop,
    );
    const tint = colors.ink;
    const outlineTint =
      tint === palette.paper || under === palette.paper ? firstBlock : palette.paper;
    const shadowTint =
      under !== null
        ? darken(under, 0.42)
        : spec.outline && outlineTint === firstBlock
          ? (_f = palette.blocks[1]) != null
            ? _f
            : darken(firstBlock, 0.45)
          : firstBlock;
    const rig = {
      index,
      char: glyph.char,
      x: glyph.x,
      y: glyph.y,
      size: glyph.size,
      rotation: glyph.rotation,
      angle: glyph.angle,
      entry,
      tint,
      sungTint: colors.sung,
      flashTint: colors.flash,
      backTint: colors.back,
      shadowTint,
      outlineTint,
      shadow: spec.hardShadow
        ? makeSprite(shadowLayer, (_g = entry.fat) != null ? _g : entry.fill)
        : null,
      outline: spec.outline && entry.fat ? makeSprite(outlineLayer, entry.fat) : null,
      halo: spec.sing === 'glow' && entry.glow ? makeSprite(haloLayer, entry.glow) : null,
      fxA: needFx ? makeSprite(fxLayer, entry.fill) : null,
      fxB: needFx ? makeSprite(fxLayer, entry.fill) : null,
      main: makeSprite(mainLayer, entry.fill),
      fxMode: 'off',
      texture: entry.fill,
      enterStart: enter.start[index],
      landed: enter.landed[index],
      exitStart: exit.start[index],
      exitEnd: exit.end[index],
      sungAt: timeline[index].startTime,
      sungEnd: timeline[index].endTime,
      ctx: {
        index: ordinal,
        count: visibleCount,
        rand: [rng(), rng(), rng(), rng()],
        toCenterX: (centerX - glyph.x) / Math.max(1, glyph.size),
        toCenterY: (centerY - glyph.y) / Math.max(1, glyph.size),
        dirX: Math.cos(glyph.angle),
        dirY: Math.sin(glyph.angle),
        time: 0,
        motion,
        slideDistance,
      },
      pose: restPose(),
      sing: restSing(),
      visible: false,
    };
    if (rig.shadow) rig.shadow.tint = shadowTint;
    if (rig.outline) rig.outline.tint = outlineTint;
    if (rig.halo) {
      rig.halo.tint = palette.glow;
      rig.halo.blendMode = 'add';
    }
    rig.main.tint = tint;
    return rig;
  });
  const rigOf = /* @__PURE__ */ new Map();
  rigs.forEach((rig) => rigOf.set(rig.index, rig));
  const impacts = [];
  if (spec.enter === 'stamp') {
    const seen = /* @__PURE__ */ new Set();
    rigs.forEach((rig) => {
      const word = glyphs[rig.index].word;
      if (seen.has(word)) return;
      seen.add(word);
      impacts.push(rig.enterStart + enter.duration * STAMP_IMPACT);
    });
  }
  const shakeAmplitude = placement.fontPx * 0.05 * motion;
  const cursor = spec.enter === 'type' ? new pixi.Graphics() : null;
  if (cursor) {
    cursor.rect(-0.5, -0.5, 1, 1).fill({ color: 16777215 });
    cursor.tint = palette.accent;
    cursor.visible = false;
    overlayLayer.addChild(cursor);
  }
  const underlines = [];
  if (spec.sing === 'underline') {
    const groups = /* @__PURE__ */ new Map();
    rigs.forEach((rig) => {
      var _a2;
      const glyph = glyphs[rig.index];
      const key = `${glyph.word}`;
      const list = (_a2 = groups.get(key)) != null ? _a2 : [];
      if (list.length === 0 || glyphs[list[0]].row === glyph.row) list.push(rig.index);
      groups.set(key, list);
    });
    groups.forEach((indices) => {
      var _a2, _b2;
      const frame = runFrame(glyphs, indices, 0, 0);
      if (!frame) return;
      const members = indices.map((index) => rigOf.get(index));
      const tx = Math.cos(frame.angle),
        ty = Math.sin(frame.angle);
      const nx = -ty,
        ny = tx;
      const avgSize = members.reduce((sum, rig) => sum + rig.size, 0) / members.length;
      const thick = Math.max(3, avgSize * 0.15);
      const offset = frame.thickness / 2 + thick * 0.4;
      const g = new pixi.Graphics();
      g.rect(0, -0.5, 1, 1).fill({ color: 16777215 });
      g.tint =
        (_b2 = (_a2 = members[0]) == null ? void 0 : _a2.sungTint) != null ? _b2 : palette.accent;
      g.visible = false;
      overlayLayer.addChild(g);
      underlines.push({
        g,
        members,
        x: frame.cx - (tx * frame.length) / 2 + nx * offset,
        y: frame.cy - (ty * frame.length) / 2 + ny * offset,
        angle: frame.angle,
        length: frame.length,
        thick,
        from: Math.min(...members.map((rig) => rig.sungAt)),
        to: Math.max(...members.map((rig) => rig.sungEnd)),
      });
    });
  }
  const wipeMask = spec.enter === 'wipe' ? new pixi.Graphics() : null;
  if (wipeMask) glyphsInner.addChild(wipeMask);
  const firstStart = rigs.reduce(
    (min, rig) => Math.min(min, rig.enterStart),
    Number.POSITIVE_INFINITY,
  );
  const lastLanded = rigs.reduce((max, rig) => Math.max(max, rig.landed), Number.NEGATIVE_INFINITY);
  const scratchEnter = restPose();
  const scratchShadow = restPose();
  const evaluate = (rig, time, lag, out, singOut) => {
    const t = time - lag;
    if (!(t >= rig.enterStart) || t >= rig.exitEnd) {
      Object.assign(out, REST_POSE);
      out.alpha = 0;
      if (singOut) Object.assign(singOut, REST_SING);
      return false;
    }
    rig.ctx.time = t - rig.enterStart;
    const a = enterPose(spec.enter, (t - rig.enterStart) / Math.max(1e-3, enter.duration), rig.ctx);
    Object.assign(scratchEnter, a);
    rig.ctx.time = t - rig.exitStart;
    const span = rig.exitEnd - rig.exitStart;
    const b = exitPose(spec.exit, span > 0 ? (t - rig.exitStart) / span : 0, rig.ctx);
    combinePoses(scratchEnter, b, out);
    if (singOut) {
      const sung =
        t >= rig.landed
          ? singPose(spec.sing, t - rig.sungAt, rig.sungEnd - rig.sungAt, rig.ctx.rand[3], motion)
          : restSing();
      Object.assign(singOut, sung);
    }
    return out.alpha > 2e-3;
  };
  let evaluatedAt = Number.NaN;
  let shake = { x: 0, y: 0 };
  const evaluateAll = (time) => {
    if (time === evaluatedAt) return;
    evaluatedAt = time;
    shake = impacts.length > 0 ? stampShake(time, impacts, shakeAmplitude) : { x: 0, y: 0 };
    rigs.forEach((rig) => {
      rig.visible = evaluate(rig, time, 0, rig.pose, rig.sing);
    });
  };
  const setTexture = (sprite, texture) => {
    if (sprite.texture !== texture) sprite.texture = texture;
  };
  const place = (sprite, x, y, rotation, sx, sy, skew, alpha) => {
    sprite.visible = alpha > 2e-3;
    if (!sprite.visible) return;
    sprite.position.set(x, y);
    sprite.rotation = rotation;
    sprite.scale.set(sx, sy);
    sprite.skew.x = skew;
    sprite.alpha = alpha;
  };
  const setFxMode = (rig, mode) => {
    if (rig.fxMode === mode || !rig.fxA || !rig.fxB) return;
    rig.fxMode = mode;
    if (mode === 'split' && rig.entry.halves) {
      setTexture(rig.fxA, rig.entry.halves[0]);
      setTexture(rig.fxB, rig.entry.halves[1]);
      if (halvesKind === 'lr') {
        rig.fxA.anchor.set(1, 0.5);
        rig.fxB.anchor.set(0, 0.5);
      } else {
        rig.fxA.anchor.set(0.5, 1);
        rig.fxB.anchor.set(0.5, 0);
      }
      rig.fxA.blendMode = 'normal';
      rig.fxB.blendMode = 'normal';
      rig.fxA.tint = rig.tint;
      rig.fxB.tint = rig.tint;
      return;
    }
    rig.fxA.anchor.set(0.5);
    rig.fxB.anchor.set(0.5);
    if (mode === 'rgb') {
      rig.fxA.blendMode = 'add';
      rig.fxB.blendMode = 'add';
      rig.fxA.tint = 16722e3;
      rig.fxB.tint = 2156799;
    } else {
      rig.fxA.blendMode = 'normal';
      rig.fxB.blendMode = 'normal';
      rig.fxA.tint = rig.tint;
      rig.fxB.tint = rig.tint;
    }
  };
  const update = (time) => {
    var _a2, _b2;
    (_a2 = atlas.paint) == null ? void 0 : _a2.call(atlas);
    evaluateAll(time);
    blocksInner.position.set(shake.x, shake.y);
    glyphsInner.position.set(shake.x, shake.y);
    blocks.update(time);
    rigs.forEach((rig) => {
      var _a3, _b3;
      const pose = rig.pose;
      const sing = rig.sing;
      if (!rig.visible) {
        rig.main.visible = false;
        if (rig.shadow) rig.shadow.visible = false;
        if (rig.outline) rig.outline.visible = false;
        if (rig.halo) rig.halo.visible = false;
        if (rig.fxA) rig.fxA.visible = false;
        if (rig.fxB) rig.fxB.visible = false;
        return;
      }
      const size = rig.size;
      const base = size / rig.entry.px;
      const x = rig.x + (pose.dx + sing.dx) * size;
      const y = rig.y + (pose.dy + sing.dy) * size;
      const rotation = rig.rotation + pose.rotation + sing.rotation;
      const sx = base * pose.scaleX * sing.scale * sing.scaleX;
      const sy = base * pose.scaleY * sing.scale * sing.scaleY;
      const scrambled =
        pose.scramble >= 0 && atlas.scramble.length > 0
          ? atlas.scramble[pose.scramble % atlas.scramble.length]
          : null;
      const entry = scrambled != null ? scrambled : rig.entry;
      const scrambleScale = scrambled ? rig.entry.px / scrambled.px : 1;
      let tint = mixColor(rig.tint, rig.sungTint, sing.color);
      tint = mixColor(tint, rig.flashTint, sing.flash);
      if (pose.backside) tint = rig.backTint;
      rig.main.tint = tint;
      setTexture(rig.main, entry.fill);
      const splitting = pose.split > 1e-3 && rig.fxA !== null && rig.entry.halves !== null;
      place(
        rig.main,
        x,
        y,
        rotation,
        sx * scrambleScale,
        sy * scrambleScale,
        pose.skew,
        splitting ? 0 : pose.alpha,
      );
      const attach = splitting ? 1 - clamp01(pose.split * 3) : 1;
      if (rig.outline) {
        setTexture(rig.outline, (_a3 = entry.fat) != null ? _a3 : entry.fill);
        place(
          rig.outline,
          x,
          y,
          rotation,
          sx * scrambleScale,
          sy * scrambleScale,
          pose.skew,
          pose.alpha * attach,
        );
      }
      if (rig.shadow) {
        const lagged = evaluate(rig, time, SHADOW_LAG, scratchShadow, null) ? scratchShadow : pose;
        const lx = rig.x + (lagged.dx + sing.dx) * size + SHADOW_OFFSET_X * size;
        const ly = rig.y + (lagged.dy + sing.dy) * size + SHADOW_OFFSET_Y * size;
        setTexture(rig.shadow, (_b3 = entry.fat) != null ? _b3 : entry.fill);
        place(
          rig.shadow,
          lx,
          ly,
          rig.rotation + lagged.rotation + sing.rotation,
          base * lagged.scaleX * sing.scale * sing.scaleX * scrambleScale,
          base * lagged.scaleY * sing.scale * sing.scaleY * scrambleScale,
          lagged.skew,
          Math.min(pose.alpha, lagged.alpha) * attach,
        );
      }
      if (rig.halo) {
        const k = 1 + 0.14 * sing.glow;
        place(rig.halo, x, y, rotation, sx * k, sy * k, 0, pose.alpha * sing.glow * 0.95);
      }
      if (rig.fxA && rig.fxB) {
        if (splitting) {
          setFxMode(rig, 'split');
          const sep = pose.split;
          const c = Math.cos(rotation),
            s = Math.sin(rotation);
          const [ax, ay] =
            halvesKind === 'lr' ? [-1.3 * sep, -0.45 * sep] : [-0.45 * sep, -1.3 * sep];
          place(
            rig.fxA,
            x + (ax * c - ay * s) * size,
            y + (ax * s + ay * c) * size,
            rotation,
            sx,
            sy,
            pose.skew,
            pose.alpha,
          );
          place(
            rig.fxB,
            x - (ax * c - ay * s) * size,
            y - (ax * s + ay * c) * size,
            rotation,
            sx,
            sy,
            pose.skew,
            pose.alpha,
          );
        } else if (pose.rgbSplit > 1e-3) {
          setFxMode(rig, 'rgb');
          setTexture(rig.fxA, entry.fill);
          setTexture(rig.fxB, entry.fill);
          const d = pose.rgbSplit * size;
          place(
            rig.fxA,
            x - d,
            y,
            rotation,
            sx * scrambleScale,
            sy * scrambleScale,
            pose.skew,
            pose.alpha * 0.9,
          );
          place(
            rig.fxB,
            x + d,
            y + d * 0.2,
            rotation,
            sx * scrambleScale,
            sy * scrambleScale,
            pose.skew,
            pose.alpha * 0.9,
          );
        } else if (pose.blur > 0.01) {
          setFxMode(rig, 'ghost');
          setTexture(rig.fxA, entry.fill);
          setTexture(rig.fxB, entry.fill);
          rig.fxA.tint = tint;
          rig.fxB.tint = tint;
          const k1 = 1 + 0.16 * pose.blur,
            k2 = 1 + 0.38 * pose.blur;
          place(rig.fxA, x, y, rotation, sx * k1, sy * k1, pose.skew, pose.alpha * 0.4 * pose.blur);
          place(
            rig.fxB,
            x,
            y,
            rotation,
            sx * k2,
            sy * k2,
            pose.skew,
            pose.alpha * 0.22 * pose.blur,
          );
        } else {
          rig.fxA.visible = false;
          rig.fxB.visible = false;
        }
      }
    });
    if (wipeMask) {
      const active = time >= firstStart && time < lastLanded;
      if (active) {
        wipeMask.clear();
        rigs.forEach((rig) => {
          if (!rig.visible) return;
          const pose = rig.pose;
          const size = rig.size;
          const glyph = glyphs[rig.index];
          const tx = Math.cos(rig.angle),
            ty = Math.sin(rig.angle);
          const nx = -ty,
            ny = tx;
          const margin = size * 0.2;
          const along = glyph.advance + margin * 2;
          const t0 = -along / 2;
          const t1 = t0 + along * pose.reveal;
          if (t1 <= t0) return;
          const n0 = -size * 0.85,
            n1 = size * 0.85;
          const cx = rig.x + pose.dx * size,
            cy = rig.y + pose.dy * size;
          wipeMask
            .poly([
              cx + tx * t0 + nx * n0,
              cy + ty * t0 + ny * n0,
              cx + tx * t1 + nx * n0,
              cy + ty * t1 + ny * n0,
              cx + tx * t1 + nx * n1,
              cy + ty * t1 + ny * n1,
              cx + tx * t0 + nx * n1,
              cy + ty * t0 + ny * n1,
            ])
            .fill({ color: 16777215 });
        });
        if (masked.mask !== wipeMask) masked.mask = wipeMask;
        wipeMask.visible = true;
      } else if (masked.mask) {
        masked.mask = null;
        wipeMask.clear();
        wipeMask.visible = false;
      }
    }
    if (cursor) {
      let current = null;
      for (const rig of rigs) {
        if (time >= rig.enterStart && (!current || rig.enterStart >= current.enterStart))
          current = rig;
      }
      const first = rigs[0];
      const typing = time < lastLanded;
      const visibleFrom = options.enterAt - 0.25;
      const exitFrom = rigs.reduce(
        (min, rig) => Math.min(min, rig.exitStart),
        Number.POSITIVE_INFINITY,
      );
      const hideAt = Math.min(lastLanded + 1.2, exitFrom);
      const blinkOn = typing || Math.floor((time - lastLanded) / 0.28) % 2 === 0;
      const target = (_b2 = current != null ? current : first) != null ? _b2 : null;
      if (!target || time < visibleFrom || time >= hideAt || !blinkOn) {
        cursor.visible = false;
      } else {
        const glyph = glyphs[target.index];
        const tx = Math.cos(target.angle),
          ty = Math.sin(target.angle);
        const side = current ? 1 : -1;
        const offset = (glyph.advance / 2 + target.size * 0.1) * side;
        cursor.visible = true;
        cursor.position.set(target.x + tx * offset, target.y + ty * offset);
        cursor.rotation = target.angle;
        cursor.scale.set(Math.max(2, target.size * 0.09), target.size * 0.95);
        cursor.alpha = 1;
      }
    }
    underlines.forEach((line2) => {
      const landed = line2.members.every((rig) => time >= rig.landed);
      const grow = clamp01((time - line2.from) / Math.max(0.12, line2.to - line2.from));
      const retract = clamp01((time - line2.to - 0.12) / 0.28);
      const head = 1 - (1 - grow) ** 3;
      const tail = retract ** 3;
      const alpha = line2.members.reduce(
        (min, rig) => Math.min(min, rig.visible ? rig.pose.alpha : 0),
        1,
      );
      if (!landed || time < line2.from || head <= tail || alpha <= 2e-3) {
        line2.g.visible = false;
        return;
      }
      const tx = Math.cos(line2.angle),
        ty = Math.sin(line2.angle);
      line2.g.visible = true;
      line2.g.position.set(line2.x + tx * line2.length * tail, line2.y + ty * line2.length * tail);
      line2.g.rotation = line2.angle;
      line2.g.scale.set(
        line2.length * (head - tail),
        line2.thick * (1 + 0.5 * (1 - clamp01((time - line2.from) / 0.12))),
      );
      line2.g.alpha = alpha;
    });
  };
  let anchorsAt = Number.NaN;
  let anchorsCache = [];
  const anchors = (time) => {
    if (time === anchorsAt) return anchorsCache;
    evaluateAll(time);
    anchorsAt = time;
    anchorsCache = glyphs.map((glyph, index) => {
      const rig = rigOf.get(index);
      const timing = timeline[index];
      if (!rig) {
        return {
          char: glyph.char,
          x: glyph.x + shake.x,
          y: glyph.y + shake.y,
          size: glyph.size,
          sungAt: timing.startTime,
          sungEnd: timing.endTime,
          landedAt: Number.isFinite(enter.landed[index]) ? enter.landed[index] : options.enterAt,
          alpha: 0,
          blank: true,
        };
      }
      const pose = rig.pose;
      const sing = rig.sing;
      const scale =
        ((Math.abs(pose.scaleX * sing.scaleX) + Math.abs(pose.scaleY * sing.scaleY)) / 2) *
        sing.scale;
      return {
        char: glyph.char,
        x: rig.x + (pose.dx + sing.dx) * rig.size + shake.x,
        y: rig.y + (pose.dy + sing.dy) * rig.size + shake.y,
        size: rig.size * scale,
        sungAt: rig.sungAt,
        sungEnd: rig.sungEnd,
        landedAt: rig.landed,
        alpha: rig.visible ? clamp01(pose.alpha) : 0,
        blank: false,
      };
    });
    return anchorsCache;
  };
  let destroyed = false;
  return {
    view,
    blocks: blocksRoot,
    glyphs: glyphsRoot,
    update,
    prepare: () => {
      var _a2, _b2;
      return (_b2 = (_a2 = atlas.paint) == null ? void 0 : _a2.call(atlas)) != null ? _b2 : false;
    },
    anchors,
    bounds: __spreadValues({}, placement.bounds),
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      if (masked.mask) masked.mask = null;
      blocks.destroy();
      blocksRoot.destroy({ children: true, context: true });
      glyphsRoot.destroy({ children: true, context: true });
      view.destroy({ children: true });
      atlas.destroy();
    },
  };
};
const createHanabiText = (options) => buildHanabiText(options);
export { buildHanabiText, createHanabiText, lineWords };
