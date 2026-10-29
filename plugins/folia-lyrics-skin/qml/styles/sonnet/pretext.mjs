// @chenglou/pretext0.0.9 MIT; PRETEXT-LICENSE.txt; isolated Sonnet native provider.
var __defProp = Object.defineProperty,
  __getOwnPropSymbols = Object.getOwnPropertySymbols,
  __hasOwnProp = Object.prototype.hasOwnProperty,
  __propIsEnum = Object.prototype.propertyIsEnumerable,
  __defNormalProp = (obj, key, value) =>
    key in obj
      ? __defProp(obj, key, { enumerable: !0, configurable: !0, writable: !0, value })
      : (obj[key] = value),
  __spreadValues = (a, b) => {
    for (var prop in b || (b = {})) __hasOwnProp.call(b, prop) && __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b))
        __propIsEnum.call(b, prop) && __defNormalProp(a, prop, b[prop]);
    return a;
  },
  latin1BidiTypes = [
    'BN',
    'BN',
    'BN',
    'BN',
    'BN',
    'BN',
    'BN',
    'BN',
    'BN',
    'S',
    'B',
    'S',
    'WS',
    'B',
    'BN',
    'BN',
    'BN',
    'BN',
    'BN',
    'BN',
    'BN',
    'BN',
    'BN',
    'BN',
    'BN',
    'BN',
    'BN',
    'BN',
    'B',
    'B',
    'B',
    'S',
    'WS',
    'ON',
    'ON',
    'ET',
    'ET',
    'ET',
    'ON',
    'ON',
    'ON',
    'ON',
    'ON',
    'ES',
    'CS',
    'ES',
    'CS',
    'CS',
    'EN',
    'EN',
    'EN',
    'EN',
    'EN',
    'EN',
    'EN',
    'EN',
    'EN',
    'EN',
    'CS',
    'ON',
    'ON',
    'ON',
    'ON',
    'ON',
    'ON',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'ON',
    'ON',
    'ON',
    'ON',
    'ON',
    'ON',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'ON',
    'ON',
    'ON',
    'ON',
    'BN',
    'BN',
    'BN',
    'BN',
    'BN',
    'BN',
    'B',
    'BN',
    'BN',
    'BN',
    'BN',
    'BN',
    'BN',
    'BN',
    'BN',
    'BN',
    'BN',
    'BN',
    'BN',
    'BN',
    'BN',
    'BN',
    'BN',
    'BN',
    'BN',
    'BN',
    'BN',
    'BN',
    'BN',
    'BN',
    'BN',
    'BN',
    'BN',
    'CS',
    'ON',
    'ET',
    'ET',
    'ET',
    'ET',
    'ON',
    'ON',
    'ON',
    'ON',
    'L',
    'ON',
    'ON',
    'BN',
    'ON',
    'ON',
    'ET',
    'ET',
    'EN',
    'EN',
    'ON',
    'L',
    'ON',
    'ON',
    'ON',
    'EN',
    'L',
    'ON',
    'ON',
    'ON',
    'ON',
    'ON',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'ON',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'ON',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
    'L',
  ],
  nonLatin1BidiRanges = [
    [697, 698, 'ON'],
    [706, 719, 'ON'],
    [722, 735, 'ON'],
    [741, 749, 'ON'],
    [751, 767, 'ON'],
    [768, 879, 'NSM'],
    [884, 885, 'ON'],
    [894, 894, 'ON'],
    [900, 901, 'ON'],
    [903, 903, 'ON'],
    [1014, 1014, 'ON'],
    [1155, 1161, 'NSM'],
    [1418, 1418, 'ON'],
    [1421, 1422, 'ON'],
    [1423, 1423, 'ET'],
    [1424, 1424, 'R'],
    [1425, 1469, 'NSM'],
    [1470, 1470, 'R'],
    [1471, 1471, 'NSM'],
    [1472, 1472, 'R'],
    [1473, 1474, 'NSM'],
    [1475, 1475, 'R'],
    [1476, 1477, 'NSM'],
    [1478, 1478, 'R'],
    [1479, 1479, 'NSM'],
    [1480, 1535, 'R'],
    [1536, 1541, 'AN'],
    [1542, 1543, 'ON'],
    [1544, 1544, 'AL'],
    [1545, 1546, 'ET'],
    [1547, 1547, 'AL'],
    [1548, 1548, 'CS'],
    [1549, 1549, 'AL'],
    [1550, 1551, 'ON'],
    [1552, 1562, 'NSM'],
    [1563, 1610, 'AL'],
    [1611, 1631, 'NSM'],
    [1632, 1641, 'AN'],
    [1642, 1642, 'ET'],
    [1643, 1644, 'AN'],
    [1645, 1647, 'AL'],
    [1648, 1648, 'NSM'],
    [1649, 1749, 'AL'],
    [1750, 1756, 'NSM'],
    [1757, 1757, 'AN'],
    [1758, 1758, 'ON'],
    [1759, 1764, 'NSM'],
    [1765, 1766, 'AL'],
    [1767, 1768, 'NSM'],
    [1769, 1769, 'ON'],
    [1770, 1773, 'NSM'],
    [1774, 1775, 'AL'],
    [1776, 1785, 'EN'],
    [1786, 1808, 'AL'],
    [1809, 1809, 'NSM'],
    [1810, 1839, 'AL'],
    [1840, 1866, 'NSM'],
    [1867, 1957, 'AL'],
    [1958, 1968, 'NSM'],
    [1969, 1983, 'AL'],
    [1984, 2026, 'R'],
    [2027, 2035, 'NSM'],
    [2036, 2037, 'R'],
    [2038, 2041, 'ON'],
    [2042, 2044, 'R'],
    [2045, 2045, 'NSM'],
    [2046, 2069, 'R'],
    [2070, 2073, 'NSM'],
    [2074, 2074, 'R'],
    [2075, 2083, 'NSM'],
    [2084, 2084, 'R'],
    [2085, 2087, 'NSM'],
    [2088, 2088, 'R'],
    [2089, 2093, 'NSM'],
    [2094, 2136, 'R'],
    [2137, 2139, 'NSM'],
    [2140, 2143, 'R'],
    [2144, 2191, 'AL'],
    [2192, 2193, 'AN'],
    [2194, 2198, 'AL'],
    [2199, 2207, 'NSM'],
    [2208, 2249, 'AL'],
    [2250, 2273, 'NSM'],
    [2274, 2274, 'AN'],
    [2275, 2306, 'NSM'],
    [2362, 2362, 'NSM'],
    [2364, 2364, 'NSM'],
    [2369, 2376, 'NSM'],
    [2381, 2381, 'NSM'],
    [2385, 2391, 'NSM'],
    [2402, 2403, 'NSM'],
    [2433, 2433, 'NSM'],
    [2492, 2492, 'NSM'],
    [2497, 2500, 'NSM'],
    [2509, 2509, 'NSM'],
    [2530, 2531, 'NSM'],
    [2546, 2547, 'ET'],
    [2555, 2555, 'ET'],
    [2558, 2558, 'NSM'],
    [2561, 2562, 'NSM'],
    [2620, 2620, 'NSM'],
    [2625, 2626, 'NSM'],
    [2631, 2632, 'NSM'],
    [2635, 2637, 'NSM'],
    [2641, 2641, 'NSM'],
    [2672, 2673, 'NSM'],
    [2677, 2677, 'NSM'],
    [2689, 2690, 'NSM'],
    [2748, 2748, 'NSM'],
    [2753, 2757, 'NSM'],
    [2759, 2760, 'NSM'],
    [2765, 2765, 'NSM'],
    [2786, 2787, 'NSM'],
    [2801, 2801, 'ET'],
    [2810, 2815, 'NSM'],
    [2817, 2817, 'NSM'],
    [2876, 2876, 'NSM'],
    [2879, 2879, 'NSM'],
    [2881, 2884, 'NSM'],
    [2893, 2893, 'NSM'],
    [2901, 2902, 'NSM'],
    [2914, 2915, 'NSM'],
    [2946, 2946, 'NSM'],
    [3008, 3008, 'NSM'],
    [3021, 3021, 'NSM'],
    [3059, 3064, 'ON'],
    [3065, 3065, 'ET'],
    [3066, 3066, 'ON'],
    [3072, 3072, 'NSM'],
    [3076, 3076, 'NSM'],
    [3132, 3132, 'NSM'],
    [3134, 3136, 'NSM'],
    [3142, 3144, 'NSM'],
    [3146, 3149, 'NSM'],
    [3157, 3158, 'NSM'],
    [3170, 3171, 'NSM'],
    [3192, 3198, 'ON'],
    [3201, 3201, 'NSM'],
    [3260, 3260, 'NSM'],
    [3276, 3277, 'NSM'],
    [3298, 3299, 'NSM'],
    [3328, 3329, 'NSM'],
    [3387, 3388, 'NSM'],
    [3393, 3396, 'NSM'],
    [3405, 3405, 'NSM'],
    [3426, 3427, 'NSM'],
    [3457, 3457, 'NSM'],
    [3530, 3530, 'NSM'],
    [3538, 3540, 'NSM'],
    [3542, 3542, 'NSM'],
    [3633, 3633, 'NSM'],
    [3636, 3642, 'NSM'],
    [3647, 3647, 'ET'],
    [3655, 3662, 'NSM'],
    [3761, 3761, 'NSM'],
    [3764, 3772, 'NSM'],
    [3784, 3790, 'NSM'],
    [3864, 3865, 'NSM'],
    [3893, 3893, 'NSM'],
    [3895, 3895, 'NSM'],
    [3897, 3897, 'NSM'],
    [3898, 3901, 'ON'],
    [3953, 3966, 'NSM'],
    [3968, 3972, 'NSM'],
    [3974, 3975, 'NSM'],
    [3981, 3991, 'NSM'],
    [3993, 4028, 'NSM'],
    [4038, 4038, 'NSM'],
    [4141, 4144, 'NSM'],
    [4146, 4151, 'NSM'],
    [4153, 4154, 'NSM'],
    [4157, 4158, 'NSM'],
    [4184, 4185, 'NSM'],
    [4190, 4192, 'NSM'],
    [4209, 4212, 'NSM'],
    [4226, 4226, 'NSM'],
    [4229, 4230, 'NSM'],
    [4237, 4237, 'NSM'],
    [4253, 4253, 'NSM'],
    [4957, 4959, 'NSM'],
    [5008, 5017, 'ON'],
    [5120, 5120, 'ON'],
    [5760, 5760, 'WS'],
    [5787, 5788, 'ON'],
    [5906, 5908, 'NSM'],
    [5938, 5939, 'NSM'],
    [5970, 5971, 'NSM'],
    [6002, 6003, 'NSM'],
    [6068, 6069, 'NSM'],
    [6071, 6077, 'NSM'],
    [6086, 6086, 'NSM'],
    [6089, 6099, 'NSM'],
    [6107, 6107, 'ET'],
    [6109, 6109, 'NSM'],
    [6128, 6137, 'ON'],
    [6144, 6154, 'ON'],
    [6155, 6157, 'NSM'],
    [6158, 6158, 'BN'],
    [6159, 6159, 'NSM'],
    [6277, 6278, 'NSM'],
    [6313, 6313, 'NSM'],
    [6432, 6434, 'NSM'],
    [6439, 6440, 'NSM'],
    [6450, 6450, 'NSM'],
    [6457, 6459, 'NSM'],
    [6464, 6464, 'ON'],
    [6468, 6469, 'ON'],
    [6622, 6655, 'ON'],
    [6679, 6680, 'NSM'],
    [6683, 6683, 'NSM'],
    [6742, 6742, 'NSM'],
    [6744, 6750, 'NSM'],
    [6752, 6752, 'NSM'],
    [6754, 6754, 'NSM'],
    [6757, 6764, 'NSM'],
    [6771, 6780, 'NSM'],
    [6783, 6783, 'NSM'],
    [6832, 6877, 'NSM'],
    [6880, 6891, 'NSM'],
    [6912, 6915, 'NSM'],
    [6964, 6964, 'NSM'],
    [6966, 6970, 'NSM'],
    [6972, 6972, 'NSM'],
    [6978, 6978, 'NSM'],
    [7019, 7027, 'NSM'],
    [7040, 7041, 'NSM'],
    [7074, 7077, 'NSM'],
    [7080, 7081, 'NSM'],
    [7083, 7085, 'NSM'],
    [7142, 7142, 'NSM'],
    [7144, 7145, 'NSM'],
    [7149, 7149, 'NSM'],
    [7151, 7153, 'NSM'],
    [7212, 7219, 'NSM'],
    [7222, 7223, 'NSM'],
    [7376, 7378, 'NSM'],
    [7380, 7392, 'NSM'],
    [7394, 7400, 'NSM'],
    [7405, 7405, 'NSM'],
    [7412, 7412, 'NSM'],
    [7416, 7417, 'NSM'],
    [7616, 7679, 'NSM'],
    [8125, 8125, 'ON'],
    [8127, 8129, 'ON'],
    [8141, 8143, 'ON'],
    [8157, 8159, 'ON'],
    [8173, 8175, 'ON'],
    [8189, 8190, 'ON'],
    [8192, 8202, 'WS'],
    [8203, 8205, 'BN'],
    [8207, 8207, 'R'],
    [8208, 8231, 'ON'],
    [8232, 8232, 'WS'],
    [8233, 8233, 'B'],
    [8234, 8238, 'BN'],
    [8239, 8239, 'CS'],
    [8240, 8244, 'ET'],
    [8245, 8259, 'ON'],
    [8260, 8260, 'CS'],
    [8261, 8286, 'ON'],
    [8287, 8287, 'WS'],
    [8288, 8303, 'BN'],
    [8304, 8304, 'EN'],
    [8308, 8313, 'EN'],
    [8314, 8315, 'ES'],
    [8316, 8318, 'ON'],
    [8320, 8329, 'EN'],
    [8330, 8331, 'ES'],
    [8332, 8334, 'ON'],
    [8352, 8399, 'ET'],
    [8400, 8432, 'NSM'],
    [8448, 8449, 'ON'],
    [8451, 8454, 'ON'],
    [8456, 8457, 'ON'],
    [8468, 8468, 'ON'],
    [8470, 8472, 'ON'],
    [8478, 8483, 'ON'],
    [8485, 8485, 'ON'],
    [8487, 8487, 'ON'],
    [8489, 8489, 'ON'],
    [8494, 8494, 'ET'],
    [8506, 8507, 'ON'],
    [8512, 8516, 'ON'],
    [8522, 8525, 'ON'],
    [8528, 8543, 'ON'],
    [8585, 8587, 'ON'],
    [8592, 8721, 'ON'],
    [8722, 8722, 'ES'],
    [8723, 8723, 'ET'],
    [8724, 9013, 'ON'],
    [9083, 9108, 'ON'],
    [9110, 9257, 'ON'],
    [9280, 9290, 'ON'],
    [9312, 9351, 'ON'],
    [9352, 9371, 'EN'],
    [9450, 9899, 'ON'],
    [9901, 10239, 'ON'],
    [10496, 11123, 'ON'],
    [11126, 11263, 'ON'],
    [11493, 11498, 'ON'],
    [11503, 11505, 'NSM'],
    [11513, 11519, 'ON'],
    [11647, 11647, 'NSM'],
    [11744, 11775, 'NSM'],
    [11776, 11869, 'ON'],
    [11904, 11929, 'ON'],
    [11931, 12019, 'ON'],
    [12032, 12245, 'ON'],
    [12272, 12287, 'ON'],
    [12288, 12288, 'WS'],
    [12289, 12292, 'ON'],
    [12296, 12320, 'ON'],
    [12330, 12333, 'NSM'],
    [12336, 12336, 'ON'],
    [12342, 12343, 'ON'],
    [12349, 12351, 'ON'],
    [12441, 12442, 'NSM'],
    [12443, 12444, 'ON'],
    [12448, 12448, 'ON'],
    [12539, 12539, 'ON'],
    [12736, 12773, 'ON'],
    [12783, 12783, 'ON'],
    [12829, 12830, 'ON'],
    [12880, 12895, 'ON'],
    [12924, 12926, 'ON'],
    [12977, 12991, 'ON'],
    [13004, 13007, 'ON'],
    [13175, 13178, 'ON'],
    [13278, 13279, 'ON'],
    [13311, 13311, 'ON'],
    [19904, 19967, 'ON'],
    [42128, 42182, 'ON'],
    [42509, 42511, 'ON'],
    [42607, 42610, 'NSM'],
    [42611, 42611, 'ON'],
    [42612, 42621, 'NSM'],
    [42622, 42623, 'ON'],
    [42654, 42655, 'NSM'],
    [42736, 42737, 'NSM'],
    [42752, 42785, 'ON'],
    [42888, 42888, 'ON'],
    [43010, 43010, 'NSM'],
    [43014, 43014, 'NSM'],
    [43019, 43019, 'NSM'],
    [43045, 43046, 'NSM'],
    [43048, 43051, 'ON'],
    [43052, 43052, 'NSM'],
    [43064, 43065, 'ET'],
    [43124, 43127, 'ON'],
    [43204, 43205, 'NSM'],
    [43232, 43249, 'NSM'],
    [43263, 43263, 'NSM'],
    [43302, 43309, 'NSM'],
    [43335, 43345, 'NSM'],
    [43392, 43394, 'NSM'],
    [43443, 43443, 'NSM'],
    [43446, 43449, 'NSM'],
    [43452, 43453, 'NSM'],
    [43493, 43493, 'NSM'],
    [43561, 43566, 'NSM'],
    [43569, 43570, 'NSM'],
    [43573, 43574, 'NSM'],
    [43587, 43587, 'NSM'],
    [43596, 43596, 'NSM'],
    [43644, 43644, 'NSM'],
    [43696, 43696, 'NSM'],
    [43698, 43700, 'NSM'],
    [43703, 43704, 'NSM'],
    [43710, 43711, 'NSM'],
    [43713, 43713, 'NSM'],
    [43756, 43757, 'NSM'],
    [43766, 43766, 'NSM'],
    [43882, 43883, 'ON'],
    [44005, 44005, 'NSM'],
    [44008, 44008, 'NSM'],
    [44013, 44013, 'NSM'],
    [64285, 64285, 'R'],
    [64286, 64286, 'NSM'],
    [64287, 64296, 'R'],
    [64297, 64297, 'ES'],
    [64298, 64335, 'R'],
    [64336, 64450, 'AL'],
    [64451, 64466, 'ON'],
    [64467, 64829, 'AL'],
    [64830, 64847, 'ON'],
    [64848, 64911, 'AL'],
    [64912, 64913, 'ON'],
    [64914, 64967, 'AL'],
    [64968, 64975, 'ON'],
    [64976, 65007, 'BN'],
    [65008, 65020, 'AL'],
    [65021, 65023, 'ON'],
    [65024, 65039, 'NSM'],
    [65040, 65049, 'ON'],
    [65056, 65071, 'NSM'],
    [65072, 65103, 'ON'],
    [65104, 65104, 'CS'],
    [65105, 65105, 'ON'],
    [65106, 65106, 'CS'],
    [65108, 65108, 'ON'],
    [65109, 65109, 'CS'],
    [65110, 65118, 'ON'],
    [65119, 65119, 'ET'],
    [65120, 65121, 'ON'],
    [65122, 65123, 'ES'],
    [65124, 65126, 'ON'],
    [65128, 65128, 'ON'],
    [65129, 65130, 'ET'],
    [65131, 65131, 'ON'],
    [65136, 65278, 'AL'],
    [65279, 65279, 'BN'],
    [65281, 65282, 'ON'],
    [65283, 65285, 'ET'],
    [65286, 65290, 'ON'],
    [65291, 65291, 'ES'],
    [65292, 65292, 'CS'],
    [65293, 65293, 'ES'],
    [65294, 65295, 'CS'],
    [65296, 65305, 'EN'],
    [65306, 65306, 'CS'],
    [65307, 65312, 'ON'],
    [65339, 65344, 'ON'],
    [65371, 65381, 'ON'],
    [65504, 65505, 'ET'],
    [65506, 65508, 'ON'],
    [65509, 65510, 'ET'],
    [65512, 65518, 'ON'],
    [65520, 65528, 'BN'],
    [65529, 65533, 'ON'],
    [65534, 65535, 'BN'],
    [65793, 65793, 'ON'],
    [65856, 65932, 'ON'],
    [65936, 65948, 'ON'],
    [65952, 65952, 'ON'],
    [66045, 66045, 'NSM'],
    [66272, 66272, 'NSM'],
    [66273, 66299, 'EN'],
    [66422, 66426, 'NSM'],
    [67584, 67870, 'R'],
    [67871, 67871, 'ON'],
    [67872, 68096, 'R'],
    [68097, 68099, 'NSM'],
    [68100, 68100, 'R'],
    [68101, 68102, 'NSM'],
    [68103, 68107, 'R'],
    [68108, 68111, 'NSM'],
    [68112, 68151, 'R'],
    [68152, 68154, 'NSM'],
    [68155, 68158, 'R'],
    [68159, 68159, 'NSM'],
    [68160, 68324, 'R'],
    [68325, 68326, 'NSM'],
    [68327, 68408, 'R'],
    [68409, 68415, 'ON'],
    [68416, 68863, 'R'],
    [68864, 68899, 'AL'],
    [68900, 68903, 'NSM'],
    [68904, 68911, 'AL'],
    [68912, 68921, 'AN'],
    [68922, 68927, 'AL'],
    [68928, 68937, 'AN'],
    [68938, 68968, 'R'],
    [68969, 68973, 'NSM'],
    [68974, 68974, 'ON'],
    [68975, 69215, 'R'],
    [69216, 69246, 'AN'],
    [69247, 69290, 'R'],
    [69291, 69292, 'NSM'],
    [69293, 69311, 'R'],
    [69312, 69327, 'AL'],
    [69328, 69336, 'ON'],
    [69337, 69369, 'AL'],
    [69370, 69375, 'NSM'],
    [69376, 69423, 'R'],
    [69424, 69445, 'AL'],
    [69446, 69456, 'NSM'],
    [69457, 69487, 'AL'],
    [69488, 69505, 'R'],
    [69506, 69509, 'NSM'],
    [69510, 69631, 'R'],
    [69633, 69633, 'NSM'],
    [69688, 69702, 'NSM'],
    [69714, 69733, 'ON'],
    [69744, 69744, 'NSM'],
    [69747, 69748, 'NSM'],
    [69759, 69761, 'NSM'],
    [69811, 69814, 'NSM'],
    [69817, 69818, 'NSM'],
    [69826, 69826, 'NSM'],
    [69888, 69890, 'NSM'],
    [69927, 69931, 'NSM'],
    [69933, 69940, 'NSM'],
    [70003, 70003, 'NSM'],
    [70016, 70017, 'NSM'],
    [70070, 70078, 'NSM'],
    [70089, 70092, 'NSM'],
    [70095, 70095, 'NSM'],
    [70191, 70193, 'NSM'],
    [70196, 70196, 'NSM'],
    [70198, 70199, 'NSM'],
    [70206, 70206, 'NSM'],
    [70209, 70209, 'NSM'],
    [70367, 70367, 'NSM'],
    [70371, 70378, 'NSM'],
    [70400, 70401, 'NSM'],
    [70459, 70460, 'NSM'],
    [70464, 70464, 'NSM'],
    [70502, 70508, 'NSM'],
    [70512, 70516, 'NSM'],
    [70587, 70592, 'NSM'],
    [70606, 70606, 'NSM'],
    [70608, 70608, 'NSM'],
    [70610, 70610, 'NSM'],
    [70625, 70626, 'NSM'],
    [70712, 70719, 'NSM'],
    [70722, 70724, 'NSM'],
    [70726, 70726, 'NSM'],
    [70750, 70750, 'NSM'],
    [70835, 70840, 'NSM'],
    [70842, 70842, 'NSM'],
    [70847, 70848, 'NSM'],
    [70850, 70851, 'NSM'],
    [71090, 71093, 'NSM'],
    [71100, 71101, 'NSM'],
    [71103, 71104, 'NSM'],
    [71132, 71133, 'NSM'],
    [71219, 71226, 'NSM'],
    [71229, 71229, 'NSM'],
    [71231, 71232, 'NSM'],
    [71264, 71276, 'ON'],
    [71339, 71339, 'NSM'],
    [71341, 71341, 'NSM'],
    [71344, 71349, 'NSM'],
    [71351, 71351, 'NSM'],
    [71453, 71453, 'NSM'],
    [71455, 71455, 'NSM'],
    [71458, 71461, 'NSM'],
    [71463, 71467, 'NSM'],
    [71727, 71735, 'NSM'],
    [71737, 71738, 'NSM'],
    [71995, 71996, 'NSM'],
    [71998, 71998, 'NSM'],
    [72003, 72003, 'NSM'],
    [72148, 72151, 'NSM'],
    [72154, 72155, 'NSM'],
    [72160, 72160, 'NSM'],
    [72193, 72198, 'NSM'],
    [72201, 72202, 'NSM'],
    [72243, 72248, 'NSM'],
    [72251, 72254, 'NSM'],
    [72263, 72263, 'NSM'],
    [72273, 72278, 'NSM'],
    [72281, 72283, 'NSM'],
    [72330, 72342, 'NSM'],
    [72344, 72345, 'NSM'],
    [72544, 72544, 'NSM'],
    [72546, 72548, 'NSM'],
    [72550, 72550, 'NSM'],
    [72752, 72758, 'NSM'],
    [72760, 72765, 'NSM'],
    [72850, 72871, 'NSM'],
    [72874, 72880, 'NSM'],
    [72882, 72883, 'NSM'],
    [72885, 72886, 'NSM'],
    [73009, 73014, 'NSM'],
    [73018, 73018, 'NSM'],
    [73020, 73021, 'NSM'],
    [73023, 73029, 'NSM'],
    [73031, 73031, 'NSM'],
    [73104, 73105, 'NSM'],
    [73109, 73109, 'NSM'],
    [73111, 73111, 'NSM'],
    [73459, 73460, 'NSM'],
    [73472, 73473, 'NSM'],
    [73526, 73530, 'NSM'],
    [73536, 73536, 'NSM'],
    [73538, 73538, 'NSM'],
    [73562, 73562, 'NSM'],
    [73685, 73692, 'ON'],
    [73693, 73696, 'ET'],
    [73697, 73713, 'ON'],
    [78912, 78912, 'NSM'],
    [78919, 78933, 'NSM'],
    [90398, 90409, 'NSM'],
    [90413, 90415, 'NSM'],
    [92912, 92916, 'NSM'],
    [92976, 92982, 'NSM'],
    [94031, 94031, 'NSM'],
    [94095, 94098, 'NSM'],
    [94178, 94178, 'ON'],
    [94180, 94180, 'NSM'],
    [113821, 113822, 'NSM'],
    [113824, 113827, 'BN'],
    [117760, 117973, 'ON'],
    [118e3, 118009, 'EN'],
    [118010, 118012, 'ON'],
    [118016, 118451, 'ON'],
    [118458, 118480, 'ON'],
    [118496, 118512, 'ON'],
    [118528, 118573, 'NSM'],
    [118576, 118598, 'NSM'],
    [119143, 119145, 'NSM'],
    [119155, 119162, 'BN'],
    [119163, 119170, 'NSM'],
    [119173, 119179, 'NSM'],
    [119210, 119213, 'NSM'],
    [119273, 119274, 'ON'],
    [119296, 119361, 'ON'],
    [119362, 119364, 'NSM'],
    [119365, 119365, 'ON'],
    [119552, 119638, 'ON'],
    [120513, 120513, 'ON'],
    [120539, 120539, 'ON'],
    [120571, 120571, 'ON'],
    [120597, 120597, 'ON'],
    [120629, 120629, 'ON'],
    [120655, 120655, 'ON'],
    [120687, 120687, 'ON'],
    [120713, 120713, 'ON'],
    [120745, 120745, 'ON'],
    [120771, 120771, 'ON'],
    [120782, 120831, 'EN'],
    [121344, 121398, 'NSM'],
    [121403, 121452, 'NSM'],
    [121461, 121461, 'NSM'],
    [121476, 121476, 'NSM'],
    [121499, 121503, 'NSM'],
    [121505, 121519, 'NSM'],
    [122880, 122886, 'NSM'],
    [122888, 122904, 'NSM'],
    [122907, 122913, 'NSM'],
    [122915, 122916, 'NSM'],
    [122918, 122922, 'NSM'],
    [123023, 123023, 'NSM'],
    [123184, 123190, 'NSM'],
    [123566, 123566, 'NSM'],
    [123628, 123631, 'NSM'],
    [123647, 123647, 'ET'],
    [124140, 124143, 'NSM'],
    [124398, 124399, 'NSM'],
    [124643, 124643, 'NSM'],
    [124646, 124646, 'NSM'],
    [124654, 124655, 'NSM'],
    [124661, 124661, 'NSM'],
    [124928, 125135, 'R'],
    [125136, 125142, 'NSM'],
    [125143, 125251, 'R'],
    [125252, 125258, 'NSM'],
    [125259, 126063, 'R'],
    [126064, 126143, 'AL'],
    [126144, 126207, 'R'],
    [126208, 126287, 'AL'],
    [126288, 126463, 'R'],
    [126464, 126703, 'AL'],
    [126704, 126705, 'ON'],
    [126706, 126719, 'AL'],
    [126720, 126975, 'R'],
    [126976, 127019, 'ON'],
    [127024, 127123, 'ON'],
    [127136, 127150, 'ON'],
    [127153, 127167, 'ON'],
    [127169, 127183, 'ON'],
    [127185, 127221, 'ON'],
    [127232, 127242, 'EN'],
    [127243, 127247, 'ON'],
    [127279, 127279, 'ON'],
    [127338, 127343, 'ON'],
    [127405, 127405, 'ON'],
    [127584, 127589, 'ON'],
    [127744, 128728, 'ON'],
    [128732, 128748, 'ON'],
    [128752, 128764, 'ON'],
    [128768, 128985, 'ON'],
    [128992, 129003, 'ON'],
    [129008, 129008, 'ON'],
    [129024, 129035, 'ON'],
    [129040, 129095, 'ON'],
    [129104, 129113, 'ON'],
    [129120, 129159, 'ON'],
    [129168, 129197, 'ON'],
    [129200, 129211, 'ON'],
    [129216, 129217, 'ON'],
    [129232, 129240, 'ON'],
    [129280, 129623, 'ON'],
    [129632, 129645, 'ON'],
    [129648, 129660, 'ON'],
    [129664, 129674, 'ON'],
    [129678, 129734, 'ON'],
    [129736, 129736, 'ON'],
    [129741, 129756, 'ON'],
    [129759, 129770, 'ON'],
    [129775, 129784, 'ON'],
    [129792, 129938, 'ON'],
    [129940, 130031, 'ON'],
    [130032, 130041, 'EN'],
    [130042, 130042, 'ON'],
    [131070, 131071, 'BN'],
    [196606, 196607, 'BN'],
    [262142, 262143, 'BN'],
    [327678, 327679, 'BN'],
    [393214, 393215, 'BN'],
    [458750, 458751, 'BN'],
    [524286, 524287, 'BN'],
    [589822, 589823, 'BN'],
    [655358, 655359, 'BN'],
    [720894, 720895, 'BN'],
    [786430, 786431, 'BN'],
    [851966, 851967, 'BN'],
    [917502, 917759, 'BN'],
    [917760, 917999, 'NSM'],
    [918e3, 921599, 'BN'],
    [983038, 983039, 'BN'],
    [1048574, 1048575, 'BN'],
    [1114110, 1114111, 'BN'],
  ];
function classifyCodePoint(codePoint) {
  if (codePoint <= 255) return latin1BidiTypes[codePoint];
  let lo = 0,
    hi = nonLatin1BidiRanges.length - 1;
  for (; lo <= hi;) {
    const mid = (lo + hi) >> 1,
      range = nonLatin1BidiRanges[mid];
    if (codePoint < range[0]) {
      hi = mid - 1;
      continue;
    }
    if (codePoint > range[1]) {
      lo = mid + 1;
      continue;
    }
    return range[2];
  }
  return 'L';
}
function computeBidiLevels(str) {
  const len = str.length;
  if (len === 0) return null;
  const types = new Array(len);
  let paragraphHasBidi = !1,
    paragraphStart = 0,
    levels = null;
  for (let i = 0; i < len;) {
    const first = str.charCodeAt(i);
    let codePoint = first,
      codeUnitLength = 1;
    if (first >= 55296 && first <= 56319 && i + 1 < len) {
      const second = str.charCodeAt(i + 1);
      second >= 56320 &&
        second <= 57343 &&
        ((codePoint = ((first - 55296) << 10) + (second - 56320) + 65536), (codeUnitLength = 2));
    }
    const t = classifyCodePoint(codePoint);
    (t === 'R' || t === 'AL' || t === 'AN') && (paragraphHasBidi = !0);
    for (let j = 0; j < codeUnitLength; j++) types[i + j] = t;
    (t === 'B' &&
      (paragraphHasBidi &&
        (levels != null || (levels = new Int8Array(len)),
        (levels[i] = resolveParagraphLevels(types, levels, paragraphStart, i))),
      (paragraphStart = i + codeUnitLength),
      (paragraphHasBidi = !1)),
      (i += codeUnitLength));
  }
  return (
    paragraphHasBidi &&
      (levels != null || (levels = new Int8Array(len)),
      resolveParagraphLevels(types, levels, paragraphStart, len)),
    levels
  );
}
function resolveParagraphLevels(types, levels, start, end) {
  let startLevel = 0;
  for (let i = start; i < end; i++) {
    const t = types[i];
    if (t === 'L') {
      startLevel = 0;
      break;
    }
    if (t === 'R' || t === 'AL') {
      startLevel = 1;
      break;
    }
  }
  const e = startLevel & 1 ? 'R' : 'L',
    sor = e;
  let lastType = sor;
  for (let i = start; i < end; i++)
    types[i] === 'NSM' ? (types[i] = lastType) : (lastType = types[i]);
  lastType = sor;
  for (let i = start; i < end; i++) {
    const t = types[i];
    t === 'EN'
      ? (types[i] = lastType === 'AL' ? 'AN' : 'EN')
      : (t === 'R' || t === 'L' || t === 'AL') && (lastType = t);
  }
  for (let i = start; i < end; i++) types[i] === 'AL' && (types[i] = 'R');
  for (let i = start + 1; i < end - 1; i++)
    (types[i] === 'ES' && types[i - 1] === 'EN' && types[i + 1] === 'EN' && (types[i] = 'EN'),
      types[i] === 'CS' &&
        (types[i - 1] === 'EN' || types[i - 1] === 'AN') &&
        types[i + 1] === types[i - 1] &&
        (types[i] = types[i - 1]));
  for (let i = start; i < end; i++) {
    if (types[i] !== 'EN') continue;
    let j;
    for (j = i - 1; j >= start && types[j] === 'ET'; j--) types[j] = 'EN';
    for (j = i + 1; j < end && types[j] === 'ET'; j++) types[j] = 'EN';
  }
  for (let i = start; i < end; i++) {
    const t = types[i];
    (t === 'WS' || t === 'ES' || t === 'ET' || t === 'CS') && (types[i] = 'ON');
  }
  lastType = sor;
  for (let i = start; i < end; i++) {
    const t = types[i];
    t === 'EN'
      ? (types[i] = lastType === 'L' ? 'L' : 'EN')
      : (t === 'R' || t === 'L') && (lastType = t);
  }
  for (let i = start; i < end; i++) {
    if (types[i] !== 'ON') continue;
    let runEnd = i + 1;
    for (; runEnd < end && types[runEnd] === 'ON';) runEnd++;
    const before = i > start ? types[i - 1] : sor,
      after = runEnd < end ? types[runEnd] : sor,
      bDir = before !== 'L' ? 'R' : 'L';
    if (bDir === (after !== 'L' ? 'R' : 'L')) for (let j = i; j < runEnd; j++) types[j] = bDir;
    i = runEnd - 1;
  }
  for (let i = start; i < end; i++) types[i] === 'ON' && (types[i] = e);
  for (let i = start; i < end; i++) {
    const t = types[i];
    let level = startLevel;
    ((startLevel & 1) === 0
      ? t === 'R'
        ? level++
        : (t === 'AN' || t === 'EN') && (level += 2)
      : (t === 'L' || t === 'AN' || t === 'EN') && level++,
      (levels[i] = level));
  }
  return startLevel;
}
function computeSegmentLevels(normalized, segStarts) {
  const bidiLevels = computeBidiLevels(normalized);
  if (bidiLevels === null) return null;
  const segLevels = new Int8Array(segStarts.length);
  for (let i = 0; i < segStarts.length; i++) segLevels[i] = bidiLevels[segStarts[i]];
  return segLevels;
}
import { propertyTest } from '../cadenza/unicode-properties.mjs';
import { portableGraphemeSegmenter, portableWordSegmenter } from './native-measure.mjs';
var collapsibleWhitespaceRunRe = /[ \t\n\r\f]+/g,
  needsWhitespaceNormalizationRe = /[\t\n\r\f]| {2,}|^ | $/;
function normalizeWhitespaceNormal(text) {
  if (!needsWhitespaceNormalizationRe.test(text)) return text;
  let normalized = text.replace(collapsibleWhitespaceRunRe, ' ');
  return (
    normalized.charCodeAt(0) === 32 && (normalized = normalized.slice(1)),
    normalized.length > 0 &&
      normalized.charCodeAt(normalized.length - 1) === 32 &&
      (normalized = normalized.slice(0, -1)),
    normalized
  );
}
function normalizeWhitespacePreWrap(text) {
  return /[\r\f]/.test(text)
    ? text
        .replace(
          /\r\n/g,
          `
`
        )
        .replace(
          /[\r\f]/g,
          `
`
        )
    : text;
}
var sharedGraphemeSegmenter = null;
function getSharedGraphemeSegmenter() {
  return (
    sharedGraphemeSegmenter === null && (sharedGraphemeSegmenter = portableGraphemeSegmenter),
    sharedGraphemeSegmenter
  );
}
var sharedWordSegmenter = null,
  segmenterLocale;
function getSharedWordSegmenter() {
  return (
    sharedWordSegmenter === null && (sharedWordSegmenter = portableWordSegmenter),
    sharedWordSegmenter
  );
}
function clearAnalysisCaches() {
  ((sharedGraphemeSegmenter = null), (sharedWordSegmenter = null));
}
function setAnalysisLocale(locale) {
  const nextLocale = locale && locale.length > 0 ? locale : void 0;
  segmenterLocale !== nextLocale && ((segmenterLocale = nextLocale), (sharedWordSegmenter = null));
}
var arabicScriptRe = propertyTest(['Arabic']),
  combiningMarkRe = propertyTest(['M']),
  decimalDigitRe = propertyTest(['Nd']);
function containsArabicScript(text) {
  return arabicScriptRe.test(text);
}
var cjkRe =
  /[\u3000-\u30FF\u3130-\u318F\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF\uFF00-\uFFEF\u{20000}-\u{2A6DF}\u{2A700}-\u{2EE5D}\u{2F800}-\u{2FA1F}\u{30000}-\u{33479}]/u;
function isCJK(s) {
  return cjkRe.test(s);
}
var kinsokuStart = /* @__PURE__ */ new Set([
    '\uFF0C',
    '\uFF0E',
    '\uFF01',
    '\uFF1A',
    '\uFF1B',
    '\uFF1F',
    '\u3001',
    '\u3002',
    '\u30FB',
    '\uFF09',
    '\u3015',
    '\u3009',
    '\u300B',
    '\u300D',
    '\u300F',
    '\u3011',
    '\u3017',
    '\u3019',
    '\u301B',
    '\u30FC',
    '\u3005',
    '\u303B',
    '\u309D',
    '\u309E',
    '\u30FD',
    '\u30FE',
  ]),
  leftStickyPunctuation = /* @__PURE__ */ new Set([
    '.',
    ',',
    '!',
    '?',
    ':',
    ';',
    '\u060C',
    '\u061B',
    '\u061F',
    '\u0964',
    '\u0965',
    '\u104A',
    '\u104B',
    '\u104C',
    '\u104D',
    '\u104F',
    ')',
    ']',
    '}',
    '%',
    '"',
    '\u201D',
    '\u2019',
    '\xBB',
    '\u203A',
    '\u2026',
  ]);
function endsWithLineStartProhibitedText(text) {
  const last = getLastCodePoint(text);
  return last !== null && (kinsokuStart.has(last) || leftStickyPunctuation.has(last));
}
var keepAllGlueChars = /* @__PURE__ */ new Set(['\xA0', '\u202F', '\u2060', '\uFEFF']),
  keepAllDashBreakChars = /* @__PURE__ */ new Set(['-', '\u2010', '\u2013', '\u2014']);
function endsWithKeepAllGlueText(text) {
  const last = getLastCodePoint(text);
  return last !== null && keepAllGlueChars.has(last);
}
function endsWithKeepAllDashBreakText(text) {
  const last = getLastCodePoint(text);
  return last !== null && keepAllDashBreakChars.has(last);
}
function canContinueKeepAllTextRun(previousText, breakAfterPunctuation) {
  return endsWithKeepAllGlueText(previousText)
    ? !1
    : breakAfterPunctuation
      ? !(
          endsWithLineStartProhibitedText(previousText) ||
          endsWithKeepAllDashBreakText(previousText)
        )
      : !0;
}
var kinsokuEnd = /* @__PURE__ */ new Set([
    '"',
    '(',
    '[',
    '{',
    '\xA1',
    '\xBF',
    '\u201C',
    '\u2018',
    '\u201A',
    '\u201E',
    '\xAB',
    '\u2039',
    '\u2E18',
    '\uFF08',
    '\u3014',
    '\u3008',
    '\u300A',
    '\u300C',
    '\u300E',
    '\u3010',
    '\u3016',
    '\u3018',
    '\u301A',
  ]),
  forwardStickyGlue = /* @__PURE__ */ new Set(["'", '\u2019']),
  arabicNoSpaceTrailingPunctuation = /* @__PURE__ */ new Set([':', '.', '\u060C', '\u061B']),
  myanmarMedialGlue = /* @__PURE__ */ new Set(['\u104F']),
  closingQuoteChars = /* @__PURE__ */ new Set([
    '\u201D',
    '\u2019',
    '\xBB',
    '\u203A',
    '\u300D',
    '\u300F',
    '\u3011',
    '\u300B',
    '\u3009',
    '\u3015',
    '\uFF09',
  ]);
function isLeftStickyPunctuationSegment(segment) {
  if (isPunctuationGlueCluster(segment)) return !0;
  let sawPunctuation = !1;
  for (const ch of segment) {
    if (leftStickyPunctuation.has(ch) || isLineBreakNumericAffix(ch)) {
      sawPunctuation = !0;
      continue;
    }
    if (!(sawPunctuation && combiningMarkRe.test(ch))) return !1;
  }
  return sawPunctuation;
}
function isCJKLineStartProhibitedSegment(segment) {
  for (const ch of segment) if (!kinsokuStart.has(ch) && !leftStickyPunctuation.has(ch)) return !1;
  return segment.length > 0;
}
function isForwardStickyClusterSegment(segment) {
  if (isPunctuationGlueCluster(segment)) return !0;
  for (const ch of segment)
    if (
      !kinsokuEnd.has(ch) &&
      !forwardStickyGlue.has(ch) &&
      !combiningMarkRe.test(ch) &&
      !isLineBreakNumericAffix(ch)
    )
      return !1;
  return segment.length > 0;
}
function isPunctuationGlueCluster(segment) {
  let sawPunctuation = !1;
  for (const ch of segment)
    if (!(ch === '\\' || combiningMarkRe.test(ch))) {
      if (kinsokuEnd.has(ch) || leftStickyPunctuation.has(ch) || forwardStickyGlue.has(ch)) {
        sawPunctuation = !0;
        continue;
      }
      return !1;
    }
  return sawPunctuation;
}
function previousCodePointStart(text, end) {
  const last = end - 1;
  if (last <= 0) return Math.max(last, 0);
  const lastCodeUnit = text.charCodeAt(last);
  if (lastCodeUnit < 56320 || lastCodeUnit > 57343) return last;
  const maybeHigh = last - 1;
  if (maybeHigh < 0) return last;
  const highCodeUnit = text.charCodeAt(maybeHigh);
  return highCodeUnit >= 55296 && highCodeUnit <= 56319 ? maybeHigh : last;
}
function getLastCodePoint(text) {
  if (text.length === 0) return null;
  const start = previousCodePointStart(text, text.length);
  return text.slice(start);
}
function getFirstSignificantCodePoint(text) {
  for (const ch of text) if (!combiningMarkRe.test(ch)) return ch;
  return null;
}
function getLastSignificantCodePoint(text, end = text.length) {
  for (; end > 0;) {
    const start = previousCodePointStart(text, end),
      ch = text.slice(start, end);
    if (!combiningMarkRe.test(ch)) return ch;
    end = start;
  }
  return null;
}
var lineBreakNumericAffixRanges = [
  36, 37, 43, 43, 92, 92, 162, 165, 176, 177, 1423, 1423, 1545, 1547, 1642, 1642, 2046, 2047, 2546,
  2547, 2553, 2555, 2801, 2801, 3065, 3065, 3449, 3449, 3647, 3647, 6107, 6107, 8240, 8247, 8279,
  8279, 8352, 8399, 8451, 8451, 8457, 8457, 8470, 8470, 8722, 8723, 43064, 43064, 65020, 65020,
  65129, 65130, 65284, 65285, 65504, 65505, 65509, 65510, 73693, 73696, 123647, 123647, 126124,
  126124, 126128, 126128,
];
function isCodePointInRanges(codePoint, ranges) {
  for (let i = 0; i < ranges.length; i += 2)
    if (codePoint >= ranges[i] && codePoint <= ranges[i + 1]) return !0;
  return !1;
}
function isLineBreakNumericAffix(ch) {
  const codePoint = ch.codePointAt(0);
  return codePoint !== void 0 && isCodePointInRanges(codePoint, lineBreakNumericAffixRanges);
}
function endsWithLineBreakNumericAffix(text) {
  const last = getLastSignificantCodePoint(text);
  return last !== null && isLineBreakNumericAffix(last);
}
function startsWithDecimalDigit(text) {
  const first = getFirstSignificantCodePoint(text);
  return first !== null && decimalDigitRe.test(first);
}
function splitTrailingForwardStickyCluster(text) {
  let splitIndex = text.length;
  for (; splitIndex > 0;) {
    const start = previousCodePointStart(text, splitIndex),
      ch = text.slice(start, splitIndex);
    if (combiningMarkRe.test(ch) || kinsokuEnd.has(ch) || forwardStickyGlue.has(ch)) {
      splitIndex = start;
      continue;
    }
    break;
  }
  return splitIndex <= 0 || splitIndex === text.length
    ? null
    : {
        head: text.slice(0, splitIndex),
        tail: text.slice(splitIndex),
      };
}
function getRepeatableSingleCharRunChar(text, isWordLike, kind) {
  return kind === 'text' && !isWordLike && text.length === 1 && text !== '-' && text !== '\u2014'
    ? text
    : null;
}
function hasArabicNoSpacePunctuation(containsArabic, lastCodePoint) {
  return (
    containsArabic && lastCodePoint !== null && arabicNoSpaceTrailingPunctuation.has(lastCodePoint)
  );
}
function endsWithMyanmarMedialGlue(segment) {
  const lastCodePoint = getLastCodePoint(segment);
  return lastCodePoint !== null && myanmarMedialGlue.has(lastCodePoint);
}
function splitLeadingSpaceAndMarks(segment) {
  if (segment.length < 2 || segment[0] !== ' ') return null;
  const marks = segment.slice(1);
  return propertyTest(['M'], !0).test(marks) ? { space: ' ', marks } : null;
}
function endsWithClosingQuote(text) {
  let end = text.length;
  for (; end > 0;) {
    const start = previousCodePointStart(text, end),
      ch = text.slice(start, end);
    if (closingQuoteChars.has(ch)) return !0;
    if (!leftStickyPunctuation.has(ch)) return !1;
    end = start;
  }
  return !1;
}
function classifySegmentBreakChar(ch, whiteSpace) {
  if (whiteSpace === 'pre-wrap') {
    if (ch === ' ') return 'preserved-space';
    if (ch === '	') return 'tab';
    if (
      ch ===
      `
`
    )
      return 'hard-break';
  }
  return ch === ' '
    ? 'space'
    : ch === '\xA0' || ch === '\u202F' || ch === '\u2060' || ch === '\uFEFF'
      ? 'glue'
      : ch === '\u200B'
        ? 'zero-width-break'
        : ch === '\xAD'
          ? 'soft-hyphen'
          : 'text';
}
var breakCharRe = /[\x20\t\n\xA0\xAD\u200B\u202F\u2060\uFEFF]/;
function joinTextParts(parts) {
  return parts.length === 1 ? parts[0] : parts.join('');
}
function joinReversedPrefixParts(prefixParts, tail) {
  const parts = [];
  for (let i = prefixParts.length - 1; i >= 0; i--) parts.push(prefixParts[i]);
  return (parts.push(tail), joinTextParts(parts));
}
function splitSegmentByBreakKind(segment, isWordLike, start, whiteSpace) {
  if (!breakCharRe.test(segment)) return [{ text: segment, isWordLike, kind: 'text', start }];
  const pieces = [];
  let currentKind = null,
    currentStart = 0,
    currentWordLike = !1,
    offset = 0;
  for (const ch of segment) {
    const kind = classifySegmentBreakChar(ch, whiteSpace),
      wordLike = kind === 'text' && isWordLike;
    if (currentKind !== null && kind === currentKind && wordLike === currentWordLike) {
      offset += ch.length;
      continue;
    }
    (currentKind !== null &&
      pieces.push({
        text: segment.slice(currentStart, offset),
        isWordLike: currentWordLike,
        kind: currentKind,
        start: start + currentStart,
      }),
      (currentKind = kind),
      (currentStart = offset),
      (currentWordLike = wordLike),
      (offset += ch.length));
  }
  return (
    currentKind !== null &&
      pieces.push({
        text: segment.slice(currentStart),
        isWordLike: currentWordLike,
        kind: currentKind,
        start: start + currentStart,
      }),
    pieces
  );
}
function isTextRunBoundary(kind) {
  return (
    kind === 'space' ||
    kind === 'preserved-space' ||
    kind === 'zero-width-break' ||
    kind === 'hard-break'
  );
}
var urlSchemeSegmentRe = /^[A-Za-z][A-Za-z0-9+.-]*:$/;
function isUrlLikeRunStart(segmentation, index) {
  const text = segmentation.texts[index];
  return text.startsWith('www.')
    ? !0
    : urlSchemeSegmentRe.test(text) &&
        index + 1 < segmentation.len &&
        segmentation.kinds[index + 1] === 'text' &&
        segmentation.texts[index + 1] === '//';
}
function isUrlQueryBoundarySegment(text) {
  return text.includes('?') && (text.includes('://') || text.startsWith('www.'));
}
function mergeUrlRuns(segmentation, normalized, profile) {
  const texts = [],
    isWordLike = [],
    kinds = [],
    starts = [];
  for (let i = 0; i < segmentation.len; i++) {
    const start = segmentation.starts[i];
    let text = segmentation.texts[i],
      wordLike = segmentation.isWordLike[i];
    const kind = segmentation.kinds[i];
    let queryStartOverride = -1;
    if (kind === 'text' && isUrlLikeRunStart(segmentation, i)) {
      const urlParts = [text];
      let j2 = i + 1;
      for (
        ;
        j2 < segmentation.len &&
        !isTextRunBoundary(segmentation.kinds[j2]) &&
        numericAffixBoundary(normalized, segmentation.starts[j2], profile) !== !1;
      ) {
        queryStartOverride < 0 &&
          isUrlLikeRunStart(segmentation, j2) &&
          (queryStartOverride = segmentation.starts[j2]);
        const nextText = segmentation.texts[j2];
        if ((urlParts.push(nextText), (wordLike = !0), j2++, nextText.includes('?'))) break;
      }
      ((text = joinTextParts(urlParts)), (i = j2 - 1));
    }
    if (
      (texts.push(text),
      isWordLike.push(wordLike),
      kinds.push(kind),
      starts.push(start),
      !isUrlQueryBoundarySegment(text))
    )
      continue;
    const nextIndex = i + 1;
    if (nextIndex >= segmentation.len || isTextRunBoundary(segmentation.kinds[nextIndex])) continue;
    const queryParts = [],
      queryStart = queryStartOverride < 0 ? segmentation.starts[nextIndex] : queryStartOverride;
    let j = nextIndex;
    for (
      ;
      j < segmentation.len &&
      !isTextRunBoundary(segmentation.kinds[j]) &&
      numericAffixBoundary(normalized, segmentation.starts[j], profile) !== !1;
    )
      (queryParts.push(segmentation.texts[j]), j++);
    queryParts.length > 0 &&
      (texts.push(joinTextParts(queryParts)),
      isWordLike.push(!0),
      kinds.push('text'),
      starts.push(queryStart),
      (i = j - 1));
  }
  return {
    len: texts.length,
    texts,
    isWordLike,
    kinds,
    starts,
  };
}
var numericJoinerChars = /* @__PURE__ */ new Set([
    ':',
    '-',
    '/',
    '\xD7',
    ',',
    '.',
    '+',
    '\u2013',
    '\u2014',
  ]),
  wordInternalSymbolRe = propertyTest(['P', 'S', 'Co']),
  emojiPresentationRe = propertyTest(['Emoji_Presentation']),
  noSpaceWordBreakAfterChars = /* @__PURE__ */ new Set([
    '?',
    '\u058A',
    '-',
    '\u2010',
    '\u2012',
    '\u2013',
    '\u2014',
    '\u2026',
    '\u203C',
    '\u203D',
    '\u2049',
  ]);
function isAsciiWordInternalSymbolCode(code) {
  return (
    (code >= 33 && code <= 47 && code !== 45) ||
    (code >= 58 && code <= 64 && code !== 63) ||
    (code >= 91 && code <= 96) ||
    (code >= 123 && code <= 126)
  );
}
function isNoSpaceWordInternalSymbol(ch) {
  const code = ch.charCodeAt(0);
  return code < 128
    ? isAsciiWordInternalSymbolCode(code)
    : !noSpaceWordBreakAfterChars.has(ch) &&
        !emojiPresentationRe.test(ch) &&
        wordInternalSymbolRe.test(ch);
}
function isNoSpaceWordInternalSymbolSegment(text) {
  let sawSymbol = !1;
  for (const ch of text)
    if (!combiningMarkRe.test(ch)) {
      if (!isNoSpaceWordInternalSymbol(ch)) return !1;
      sawSymbol = !0;
    }
  return sawSymbol;
}
function endsWithNoSpaceWordJoiner(text) {
  for (let end = text.length; end > 0;) {
    const start = previousCodePointStart(text, end),
      ch = text.slice(start, end);
    if (combiningMarkRe.test(ch)) {
      end = start;
      continue;
    }
    return isNoSpaceWordInternalSymbol(ch) || isLineBreakNumericAffix(ch);
  }
  return !1;
}
var asciiAlphabeticBoundaryRe = /[A-Za-z#&*<=>@^_`~]/;
function isAsciiBoundary(left, right) {
  return left.charCodeAt(0) < 128 && right.charCodeAt(0) < 128;
}
function numericAffixBoundary(source, boundary, profile) {
  if (!profile.geckoAsciiLineBreaks || boundary <= 0 || boundary >= source.length) return null;
  const left = getLastSignificantCodePoint(source, boundary),
    right = String.fromCodePoint(source.codePointAt(boundary));
  if (left === null || !isAsciiBoundary(left, right)) return null;
  const leftAffix = isLineBreakNumericAffix(left),
    rightAffix = isLineBreakNumericAffix(right);
  return !leftAffix && !rightAffix
    ? null
    : !!(
        right === ')' ||
        right === ']' ||
        right === '}' ||
        '!,.:;?/'.includes(right) ||
        '([{'.includes(left) ||
        left === '"' ||
        left === "'" ||
        right === '"' ||
        right === "'" ||
        right === '|' ||
        right === '-' ||
        (leftAffix && asciiAlphabeticBoundaryRe.test(right)) ||
        (asciiAlphabeticBoundaryRe.test(left) && rightAffix) ||
        (rightAffix && (')]}'.includes(left) || /[0-9]/.test(left))) ||
        (leftAffix && ('([{'.includes(right) || /[0-9]/.test(right)))
      );
}
function openingPunctuationJoinsPrevious(left, right, profile, leftEnd = left.length) {
  const first = right[0];
  if (first === void 0 || !'([{'.includes(first)) return null;
  const last = getLastSignificantCodePoint(left, leftEnd);
  return last === null
    ? null
    : profile.geckoAsciiLineBreaks && isAsciiBoundary(last, first)
      ? asciiAlphabeticBoundaryRe.test(last) ||
        decimalDigitRe.test(last) ||
        `"'([{`.includes(last) ||
        isLineBreakNumericAffix(last)
      : last.charCodeAt(0) >= 128
        ? !isCJK(last) && propertyTest(['L', 'N']).test(last)
          ? !0
          : null
        : /[A-Za-z0-9]/.test(last) || "$'(/<@[^_`{".includes(last);
}
function canJoinNoSpaceWordBoundary(leftText, leftWordLike, rightText, rightWordLike, profile) {
  if (rightText[0] === '-' && isCJK(leftText)) return !0;
  if (isCJK(leftText) || isCJK(rightText)) return !1;
  const openingJoin = openingPunctuationJoinsPrevious(leftText, rightText, profile);
  if (openingJoin !== null) return openingJoin;
  const leftSymbol = !leftWordLike && isNoSpaceWordInternalSymbolSegment(leftText),
    rightSymbol = !rightWordLike && isNoSpaceWordInternalSymbolSegment(rightText),
    leftAffix = endsWithLineBreakNumericAffix(leftText),
    leftEndsJoiner = (leftWordLike || leftAffix) && endsWithNoSpaceWordJoiner(leftText);
  return !leftSymbol && !rightSymbol && !leftEndsJoiner
    ? !1
    : (leftWordLike || leftSymbol || leftAffix) && (rightWordLike || rightSymbol);
}
function segmentContainsDecimalDigit(text) {
  for (const ch of text) if (decimalDigitRe.test(ch)) return !0;
  return !1;
}
function isNumericRunSegment(text) {
  if (text.length === 0) return !1;
  for (const ch of text) if (!(decimalDigitRe.test(ch) || numericJoinerChars.has(ch))) return !1;
  return !0;
}
function mergeNumericRuns(segmentation, normalized, profile) {
  const texts = [],
    isWordLike = [],
    kinds = [],
    starts = [];
  function pushNumericRun(text, start) {
    if (text.includes('-')) {
      const parts = text.split('-');
      let shouldSplit = parts.length > 1;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (!shouldSplit) break;
        (part.length === 0 || !segmentContainsDecimalDigit(part) || !isNumericRunSegment(part)) &&
          (shouldSplit = !1);
      }
      if (shouldSplit) {
        let offset = 0;
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i],
            splitText = i < parts.length - 1 ? `${part}-` : part;
          (texts.push(splitText),
            isWordLike.push(!0),
            kinds.push('text'),
            starts.push(start + offset),
            (offset += splitText.length));
        }
        return;
      }
    }
    (texts.push(text), isWordLike.push(!0), kinds.push('text'), starts.push(start));
  }
  for (let i = 0; i < segmentation.len; i++) {
    const text = segmentation.texts[i],
      kind = segmentation.kinds[i];
    if (kind === 'text' && isNumericRunSegment(text) && segmentContainsDecimalDigit(text)) {
      const mergedParts = [text];
      let j = i + 1;
      for (
        ;
        j < segmentation.len &&
        segmentation.kinds[j] === 'text' &&
        isNumericRunSegment(segmentation.texts[j]) &&
        numericAffixBoundary(normalized, segmentation.starts[j], profile) !== !1;
      )
        (mergedParts.push(segmentation.texts[j]), j++);
      (pushNumericRun(joinTextParts(mergedParts), segmentation.starts[i]), (i = j - 1));
      continue;
    }
    (texts.push(text),
      isWordLike.push(segmentation.isWordLike[i]),
      kinds.push(kind),
      starts.push(segmentation.starts[i]));
  }
  return {
    len: texts.length,
    texts,
    isWordLike,
    kinds,
    starts,
  };
}
function mergeNoSpaceWordChains(segmentation, normalized, profile) {
  var _a;
  const texts = [],
    isWordLike = [],
    kinds = [],
    starts = [];
  let i = 0;
  for (; i < segmentation.len;) {
    const text = segmentation.texts[i],
      kind = segmentation.kinds[i],
      wordLike = segmentation.isWordLike[i];
    if (kind === 'text') {
      const mergedParts = [text];
      let j = i + 1,
        mergedWordLike = wordLike;
      for (
        ;
        j < segmentation.len &&
        segmentation.kinds[j] === 'text' &&
        ((_a = numericAffixBoundary(normalized, segmentation.starts[j], profile)) != null
          ? _a
          : canJoinNoSpaceWordBoundary(
              segmentation.texts[j - 1],
              segmentation.isWordLike[j - 1],
              segmentation.texts[j],
              segmentation.isWordLike[j],
              profile
            ));
      ) {
        const nextText = segmentation.texts[j];
        (mergedParts.push(nextText),
          (mergedWordLike = mergedWordLike || segmentation.isWordLike[j]),
          j++);
      }
      if (j > i + 1) {
        (texts.push(joinTextParts(mergedParts)),
          isWordLike.push(mergedWordLike),
          kinds.push('text'),
          starts.push(segmentation.starts[i]),
          (i = j));
        continue;
      }
    }
    (texts.push(text),
      isWordLike.push(wordLike),
      kinds.push(kind),
      starts.push(segmentation.starts[i]),
      i++);
  }
  return {
    len: texts.length,
    texts,
    isWordLike,
    kinds,
    starts,
  };
}
function mergeGlueConnectedTextRuns(segmentation) {
  const texts = [],
    isWordLike = [],
    kinds = [],
    starts = [];
  let read = 0;
  for (; read < segmentation.len;) {
    const textParts = [segmentation.texts[read]];
    let wordLike = segmentation.isWordLike[read],
      kind = segmentation.kinds[read],
      start = segmentation.starts[read];
    if (kind === 'glue') {
      const glueParts = [textParts[0]],
        glueStart = start;
      for (read++; read < segmentation.len && segmentation.kinds[read] === 'glue';)
        (glueParts.push(segmentation.texts[read]), read++);
      const glueText = joinTextParts(glueParts);
      if (read < segmentation.len && segmentation.kinds[read] === 'text')
        ((textParts[0] = glueText),
          textParts.push(segmentation.texts[read]),
          (wordLike = segmentation.isWordLike[read]),
          (kind = 'text'),
          (start = glueStart),
          read++);
      else {
        (texts.push(glueText), isWordLike.push(!1), kinds.push('glue'), starts.push(glueStart));
        continue;
      }
    } else read++;
    if (kind === 'text')
      for (; read < segmentation.len && segmentation.kinds[read] === 'glue';) {
        const glueParts = [];
        for (; read < segmentation.len && segmentation.kinds[read] === 'glue';)
          (glueParts.push(segmentation.texts[read]), read++);
        const glueText = joinTextParts(glueParts);
        if (read < segmentation.len && segmentation.kinds[read] === 'text') {
          (textParts.push(glueText, segmentation.texts[read]),
            (wordLike = wordLike || segmentation.isWordLike[read]),
            read++);
          continue;
        }
        textParts.push(glueText);
      }
    (texts.push(joinTextParts(textParts)),
      isWordLike.push(wordLike),
      kinds.push(kind),
      starts.push(start));
  }
  return {
    len: texts.length,
    texts,
    isWordLike,
    kinds,
    starts,
  };
}
function carryTrailingForwardStickyAcrossCJKBoundary(segmentation) {
  const { texts, kinds, starts } = segmentation;
  for (let i = 0; i < texts.length - 1; i++) {
    if (kinds[i] !== 'text' || kinds[i + 1] !== 'text' || !isCJK(texts[i]) || !isCJK(texts[i + 1]))
      continue;
    const split = splitTrailingForwardStickyCluster(texts[i]);
    split !== null &&
      ((texts[i] = split.head),
      (texts[i + 1] = split.tail + texts[i + 1]),
      (starts[i + 1] = starts[i] + split.head.length));
  }
}
function buildMergedSegmentation(normalized, profile, whiteSpace) {
  var _a, _b, _c, _d, _e;
  const wordSegmenter = getSharedWordSegmenter();
  let mergedLen = 0;
  const mergedTexts = [],
    mergedWordLike = [],
    mergedKinds = [],
    mergedStarts = [];
  let hasTail = !1,
    tailStart = 0,
    tailEnd = 0,
    tailWordLike = !1,
    tailKind = 'text',
    tailSingleCharRunChar = null,
    tailContainsCJK = !1,
    tailContainsArabicScript = !1,
    tailEndsWithClosingQuote = !1,
    tailEndsWithMyanmarMedialGlue = !1,
    tailHasArabicNoSpacePunctuation = !1;
  for (const s of wordSegmenter.segment(normalized))
    for (const piece of splitSegmentByBreakKind(
      s.segment,
      (_a = s.isWordLike) != null ? _a : !1,
      s.index,
      whiteSpace
    )) {
      const isText = piece.kind === 'text',
        repeatableSingleCharRunChar = getRepeatableSingleCharRunChar(
          piece.text,
          piece.isWordLike,
          piece.kind
        ),
        pieceContainsCJK = isCJK(piece.text),
        pieceContainsArabicScript = containsArabicScript(piece.text),
        pieceLastCodePoint = getLastCodePoint(piece.text),
        pieceEndsWithClosingQuote = endsWithClosingQuote(piece.text),
        pieceEndsWithMyanmarMedialGlue = endsWithMyanmarMedialGlue(piece.text),
        pieceEnd = piece.start + piece.text.length,
        boundaryJoin =
          (_b = numericAffixBoundary(normalized, piece.start, profile)) != null
            ? _b
            : tailContainsCJK || pieceContainsCJK
              ? null
              : openingPunctuationJoinsPrevious(normalized, piece.text, profile, piece.start);
      let appendToTail = !1;
      if (
        profile.carryCJKAfterClosingQuote &&
        isText &&
        hasTail &&
        tailKind === 'text' &&
        pieceContainsCJK &&
        tailContainsCJK &&
        tailEndsWithClosingQuote
      )
        appendToTail = !0;
      else if (
        isText &&
        hasTail &&
        tailKind === 'text' &&
        isCJKLineStartProhibitedSegment(piece.text) &&
        tailContainsCJK
      )
        appendToTail = !0;
      else if (isText && hasTail && tailKind === 'text' && tailEndsWithMyanmarMedialGlue)
        appendToTail = !0;
      else if (
        isText &&
        hasTail &&
        tailKind === 'text' &&
        piece.isWordLike &&
        pieceContainsArabicScript &&
        tailHasArabicNoSpacePunctuation
      )
        appendToTail = !0;
      else if (
        repeatableSingleCharRunChar !== null &&
        hasTail &&
        tailKind === 'text' &&
        tailSingleCharRunChar === repeatableSingleCharRunChar &&
        boundaryJoin !== !1
      ) {
        tailEnd = pieceEnd;
        continue;
      } else
        isText &&
          !piece.isWordLike &&
          hasTail &&
          tailKind === 'text' &&
          !tailContainsCJK &&
          (isLeftStickyPunctuationSegment(piece.text) || (piece.text === '-' && tailWordLike)) &&
          (appendToTail = !0);
      (isText &&
        hasTail &&
        tailKind === 'text' &&
        boundaryJoin !== null &&
        (appendToTail = boundaryJoin),
        appendToTail
          ? ((tailEnd = pieceEnd),
            (tailWordLike = tailWordLike || piece.isWordLike),
            (tailSingleCharRunChar = null),
            (tailContainsCJK = tailContainsCJK || pieceContainsCJK),
            (tailContainsArabicScript = tailContainsArabicScript || pieceContainsArabicScript),
            (tailEndsWithClosingQuote = pieceEndsWithClosingQuote),
            (tailEndsWithMyanmarMedialGlue = pieceEndsWithMyanmarMedialGlue),
            (tailHasArabicNoSpacePunctuation = hasArabicNoSpacePunctuation(
              tailContainsArabicScript,
              pieceLastCodePoint
            )))
          : (hasTail &&
              ((mergedTexts[mergedLen] = normalized.slice(tailStart, tailEnd)),
              (mergedWordLike[mergedLen] = tailWordLike),
              (mergedKinds[mergedLen] = tailKind),
              (mergedStarts[mergedLen] = tailStart),
              mergedLen++),
            (hasTail = !0),
            (tailStart = piece.start),
            (tailEnd = pieceEnd),
            (tailWordLike = piece.isWordLike),
            (tailKind = piece.kind),
            (tailSingleCharRunChar = repeatableSingleCharRunChar),
            (tailContainsCJK = pieceContainsCJK),
            (tailContainsArabicScript = pieceContainsArabicScript),
            (tailEndsWithClosingQuote = pieceEndsWithClosingQuote),
            (tailEndsWithMyanmarMedialGlue = pieceEndsWithMyanmarMedialGlue),
            (tailHasArabicNoSpacePunctuation = hasArabicNoSpacePunctuation(
              pieceContainsArabicScript,
              pieceLastCodePoint
            ))));
    }
  hasTail &&
    ((mergedTexts[mergedLen] = normalized.slice(tailStart, tailEnd)),
    (mergedWordLike[mergedLen] = tailWordLike),
    (mergedKinds[mergedLen] = tailKind),
    (mergedStarts[mergedLen] = tailStart),
    mergedLen++);
  for (let i = 1; i < mergedLen; i++)
    mergedKinds[i] === 'text' &&
      !mergedWordLike[i] &&
      isPunctuationGlueCluster(mergedTexts[i]) &&
      mergedKinds[i - 1] === 'text' &&
      !isCJK(mergedTexts[i - 1]) &&
      ((_c = numericAffixBoundary(normalized, mergedStarts[i], profile)) != null
        ? _c
        : openingPunctuationJoinsPrevious(normalized, mergedTexts[i], profile, mergedStarts[i])) !==
        !1 &&
      ((mergedTexts[i - 1] += mergedTexts[i]),
      (mergedWordLike[i - 1] = mergedWordLike[i - 1] || mergedWordLike[i]),
      (mergedTexts[i] = ''));
  let nextLiveIndex = -1,
    forwardStickyPrefixParts = null;
  for (let i = mergedLen - 1; i >= 0; i--) {
    const text = mergedTexts[i];
    if (text.length === 0) continue;
    const nextText =
      (_d =
        forwardStickyPrefixParts == null
          ? void 0
          : forwardStickyPrefixParts[forwardStickyPrefixParts.length - 1]) != null
        ? _d
        : nextLiveIndex >= 0
          ? mergedTexts[nextLiveIndex]
          : null;
    if (
      mergedKinds[i] === 'text' &&
      !mergedWordLike[i] &&
      nextText !== null &&
      mergedKinds[nextLiveIndex] === 'text' &&
      (((_e = numericAffixBoundary(normalized, mergedStarts[i] + text.length, profile)) != null
        ? _e
        : isForwardStickyClusterSegment(text) &&
          openingPunctuationJoinsPrevious(text, nextText, profile) !== !1) ||
        (text === '-' && startsWithDecimalDigit(nextText)))
    ) {
      (forwardStickyPrefixParts === null && (forwardStickyPrefixParts = []),
        forwardStickyPrefixParts.push(text),
        (mergedStarts[nextLiveIndex] = mergedStarts[i]),
        (mergedTexts[i] = ''));
      continue;
    }
    (forwardStickyPrefixParts !== null &&
      ((mergedTexts[nextLiveIndex] = joinReversedPrefixParts(
        forwardStickyPrefixParts,
        mergedTexts[nextLiveIndex]
      )),
      (forwardStickyPrefixParts = null)),
      (nextLiveIndex = i));
  }
  forwardStickyPrefixParts !== null &&
    (mergedTexts[nextLiveIndex] = joinReversedPrefixParts(
      forwardStickyPrefixParts,
      mergedTexts[nextLiveIndex]
    ));
  let compactLen = 0;
  for (let read = 0; read < mergedLen; read++) {
    const text = mergedTexts[read];
    text.length !== 0 &&
      (compactLen !== read &&
        ((mergedTexts[compactLen] = text),
        (mergedWordLike[compactLen] = mergedWordLike[read]),
        (mergedKinds[compactLen] = mergedKinds[read]),
        (mergedStarts[compactLen] = mergedStarts[read])),
      compactLen++);
  }
  ((mergedTexts.length = compactLen),
    (mergedWordLike.length = compactLen),
    (mergedKinds.length = compactLen),
    (mergedStarts.length = compactLen));
  const compacted = mergeGlueConnectedTextRuns({
      len: compactLen,
      texts: mergedTexts,
      isWordLike: mergedWordLike,
      kinds: mergedKinds,
      starts: mergedStarts,
    }),
    mergedRuns = mergeNoSpaceWordChains(
      mergeNumericRuns(mergeUrlRuns(compacted, normalized, profile), normalized, profile),
      normalized,
      profile
    );
  carryTrailingForwardStickyAcrossCJKBoundary(mergedRuns);
  for (let i = 0; i < mergedRuns.len - 1; i++) {
    const split = splitLeadingSpaceAndMarks(mergedRuns.texts[i]);
    split !== null &&
      ((mergedRuns.kinds[i] !== 'space' && mergedRuns.kinds[i] !== 'preserved-space') ||
        mergedRuns.kinds[i + 1] !== 'text' ||
        !containsArabicScript(mergedRuns.texts[i + 1]) ||
        ((mergedRuns.texts[i] = split.space),
        (mergedRuns.isWordLike[i] = !1),
        (mergedRuns.kinds[i] =
          mergedRuns.kinds[i] === 'preserved-space' ? 'preserved-space' : 'space'),
        (mergedRuns.texts[i + 1] = split.marks + mergedRuns.texts[i + 1]),
        (mergedRuns.starts[i + 1] = mergedRuns.starts[i] + split.space.length)));
  }
  return mergedRuns;
}
function mergeKeepAllTextSegments(normalized, segmentation, profile) {
  if (segmentation.len <= 1) return segmentation;
  const texts = [],
    isWordLike = [],
    kinds = [],
    starts = [];
  let groupStart = -1,
    groupContainsCJK = !1;
  function pushOriginalText(index) {
    (texts.push(segmentation.texts[index]),
      isWordLike.push(segmentation.isWordLike[index]),
      kinds.push('text'),
      starts.push(segmentation.starts[index]));
  }
  function pushMergedText(start, end) {
    let wordLike = !1;
    for (let i = start; i < end; i++) wordLike = wordLike || segmentation.isWordLike[i];
    const sourceStart = segmentation.starts[start],
      sourceEnd = end < segmentation.len ? segmentation.starts[end] : normalized.length;
    (texts.push(normalized.slice(sourceStart, sourceEnd)),
      isWordLike.push(wordLike),
      kinds.push('text'),
      starts.push(sourceStart));
  }
  function flushGroup(end) {
    if (!(groupStart < 0)) {
      if (groupContainsCJK)
        groupStart + 1 === end ? pushOriginalText(groupStart) : pushMergedText(groupStart, end);
      else for (let i = groupStart; i < end; i++) pushOriginalText(i);
      ((groupStart = -1), (groupContainsCJK = !1));
    }
  }
  for (let i = 0; i < segmentation.len; i++) {
    const text = segmentation.texts[i],
      kind = segmentation.kinds[i];
    if (kind === 'text') {
      (groupStart >= 0 &&
        (!canContinueKeepAllTextRun(
          segmentation.texts[i - 1],
          profile.breakKeepAllAfterPunctuation
        ) ||
          numericAffixBoundary(normalized, segmentation.starts[i], profile) === !1) &&
        flushGroup(i),
        groupStart < 0 && (groupStart = i),
        (groupContainsCJK = groupContainsCJK || isCJK(text)));
      continue;
    }
    (flushGroup(i),
      texts.push(text),
      isWordLike.push(segmentation.isWordLike[i]),
      kinds.push(kind),
      starts.push(segmentation.starts[i]));
  }
  return (
    flushGroup(segmentation.len),
    {
      len: texts.length,
      texts,
      isWordLike,
      kinds,
      starts,
    }
  );
}
function isNumericHyphen(text, index) {
  const next = text.charCodeAt(index + 1);
  if (next < 128) {
    if (next < 48 || next > 57) return !1;
  } else {
    const codePoint = text.codePointAt(index + 1);
    if (codePoint === void 0 || !decimalDigitRe.test(String.fromCodePoint(codePoint))) return !1;
  }
  for (let end = index; end > 0;) {
    const start = previousCodePointStart(text, end),
      previous = text.slice(start, end);
    if (!combiningMarkRe.test(previous))
      return isCJK(previous) || !propertyTest(['L', 'N']).test(previous);
    end = start;
  }
  return !0;
}
function buildBaseCjkUnits(segText, profile) {
  const units = [];
  let unitStart = 0,
    unitEnd = 0,
    unitContainsCJK = !1,
    unitEndsWithClosingQuote = !1,
    unitIsSingleKinsokuEnd = !1,
    unitHasHyphen = !1,
    unitHasNumericHyphen = !1;
  function pushUnit() {
    unitEnd !== unitStart &&
      (units.push({
        text: segText.slice(unitStart, unitEnd),
        start: unitStart,
        overflow: unitContainsCJK ? (unitHasHyphen ? 'grapheme' : 'none') : 'word-like',
      }),
      (unitStart = unitEnd),
      (unitContainsCJK = !1),
      (unitEndsWithClosingQuote = !1),
      (unitIsSingleKinsokuEnd = !1),
      (unitHasHyphen = !1),
      (unitHasNumericHyphen = !1));
  }
  function startUnit(grapheme, start, graphemeContainsCJK) {
    ((unitStart = start),
      (unitEnd = start + grapheme.length),
      (unitContainsCJK = graphemeContainsCJK),
      (unitHasHyphen = grapheme === '-'),
      (unitEndsWithClosingQuote = endsWithClosingQuote(grapheme)),
      (unitIsSingleKinsokuEnd = kinsokuEnd.has(grapheme)));
  }
  function appendToUnit(grapheme, graphemeContainsCJK) {
    ((unitEnd += grapheme.length),
      (unitContainsCJK = unitContainsCJK || graphemeContainsCJK),
      (unitHasHyphen = unitHasHyphen || grapheme === '-'));
    const graphemeEndsWithClosingQuote = endsWithClosingQuote(grapheme);
    (grapheme.length === 1 && leftStickyPunctuation.has(grapheme)
      ? (unitEndsWithClosingQuote = unitEndsWithClosingQuote || graphemeEndsWithClosingQuote)
      : (unitEndsWithClosingQuote = graphemeEndsWithClosingQuote),
      (unitIsSingleKinsokuEnd = !1));
  }
  for (const gs of getSharedGraphemeSegmenter().segment(segText)) {
    const grapheme = gs.segment,
      graphemeContainsCJK = isCJK(grapheme);
    if (unitEnd === unitStart) {
      startUnit(grapheme, gs.index, graphemeContainsCJK);
      continue;
    }
    const attachHyphen = grapheme === '-' && unitContainsCJK;
    if (
      (attachHyphen && isNumericHyphen(segText, gs.index) && (unitHasNumericHyphen = !0),
      unitIsSingleKinsokuEnd ||
        kinsokuStart.has(grapheme) ||
        leftStickyPunctuation.has(grapheme) ||
        attachHyphen ||
        (unitHasNumericHyphen && !graphemeContainsCJK) ||
        (profile.carryCJKAfterClosingQuote && graphemeContainsCJK && unitEndsWithClosingQuote))
    ) {
      appendToUnit(grapheme, graphemeContainsCJK);
      continue;
    }
    if (!unitContainsCJK && !graphemeContainsCJK) {
      appendToUnit(grapheme, graphemeContainsCJK);
      continue;
    }
    (pushUnit(), startUnit(grapheme, gs.index, graphemeContainsCJK));
  }
  return (pushUnit(), units);
}
function mergeKeepAllTextUnits(segText, units, profile) {
  if (units.length <= 1) return units;
  const merged = [];
  let groupStart = -1,
    groupContainsCJK = !1;
  function pushMergedUnit(start, end) {
    const sourceStart = units[start].start,
      sourceEnd = end < units.length ? units[end].start : segText.length;
    merged.push({
      text: segText.slice(sourceStart, sourceEnd),
      start: sourceStart,
      overflow: 'word-like',
    });
  }
  function flushGroup(end) {
    if (!(groupStart < 0)) {
      if (groupContainsCJK)
        groupStart + 1 === end ? merged.push(units[groupStart]) : pushMergedUnit(groupStart, end);
      else for (let i = groupStart; i < end; i++) merged.push(units[i]);
      ((groupStart = -1), (groupContainsCJK = !1));
    }
  }
  for (let i = 0; i < units.length; i++) {
    const unit = units[i];
    (groupStart >= 0 &&
      (!canContinueKeepAllTextRun(units[i - 1].text, profile.breakKeepAllAfterPunctuation) ||
        numericAffixBoundary(segText, unit.start, profile) === !1) &&
      flushGroup(i),
      groupStart < 0 && (groupStart = i),
      (groupContainsCJK = groupContainsCJK || isCJK(unit.text)));
  }
  return (flushGroup(units.length), merged);
}
function getCjkTextUnits(text, profile, wordBreak) {
  const units = buildBaseCjkUnits(text, profile);
  return wordBreak === 'keep-all' ? mergeKeepAllTextUnits(text, units, profile) : units;
}
function isPreferredBreakGrapheme(grapheme) {
  return (
    grapheme === '-' ||
    grapheme === '\u058A' ||
    grapheme === '\u2010' ||
    grapheme === '\u2012' ||
    grapheme === '\u2013' ||
    grapheme === '\u2014'
  );
}
function isIndependentSymbolRun(text) {
  if (text.length === 0 || propertyTest(['Cf']).test(text)) return !1;
  for (const { segment } of getSharedGraphemeSegmenter().segment(text)) {
    const base = String.fromCodePoint(segment.codePointAt(0));
    if (
      !propertyTest(['P', 'S']).test(base) ||
      emojiPresentationRe.test(base) ||
      segment.includes('\uFE0F') ||
      propertyTest(['Emoji_Modifier']).test(base)
    )
      return !1;
  }
  return !0;
}
function getBreakablePreferredBreaks(text) {
  if (!/[-\u058A\u2010\u2012\u2013\u2014]/u.test(text)) return null;
  const breaks = [];
  let graphemeIndex = 0;
  for (const gs of getSharedGraphemeSegmenter().segment(text)) {
    graphemeIndex++;
    const numericSign = gs.segment === '-' && isNumericHyphen(text, gs.index);
    isPreferredBreakGrapheme(gs.segment) && !numericSign && breaks.push(graphemeIndex);
  }
  return breaks.length === 0 ? null : breaks;
}
function analyzeText(text, profile, whiteSpace = 'normal', wordBreak = 'normal') {
  const normalized =
    whiteSpace === 'pre-wrap' ? normalizeWhitespacePreWrap(text) : normalizeWhitespaceNormal(text);
  if (normalized.length === 0)
    return {
      normalized,
      len: 0,
      texts: [],
      isWordLike: [],
      kinds: [],
      starts: [],
    };
  const mergedSegmentation = buildMergedSegmentation(normalized, profile, whiteSpace),
    segmentation =
      wordBreak === 'keep-all'
        ? mergeKeepAllTextSegments(normalized, mergedSegmentation, profile)
        : mergedSegmentation;
  return __spreadValues(
    {
      normalized,
    },
    segmentation
  );
}
import { propertyTest as propertyTest2 } from '../cadenza/unicode-properties.mjs';
import { getMeasureContext } from './native-measure.mjs';
var segmentMetricCaches = /* @__PURE__ */ new Map(),
  MAX_PREFIX_FIT_GRAPHEMES = 96,
  emojiPresentationRe2 = propertyTest2(['Emoji_Presentation']),
  maybeEmojiRe = propertyTest2([
    'Emoji_Presentation',
    'Extended_Pictographic',
    'Regional_Indicator',
    'VariationEmoji',
    'Keycap',
  ]),
  emojiCorrectionCache = /* @__PURE__ */ new Map();
function getSegmentMetricCache(font) {
  let cache = segmentMetricCaches.get(font);
  return (
    cache || ((cache = /* @__PURE__ */ new Map()), segmentMetricCaches.set(font, cache)),
    cache
  );
}
function getSegmentMetrics(seg, cache) {
  let metrics = cache.get(seg);
  return (
    metrics === void 0 &&
      ((metrics = {
        width: getMeasureContext().measureText(seg).width,
      }),
      cache.set(seg, metrics)),
    metrics
  );
}
function getEngineProfile() {
  return {
    geckoAsciiLineBreaks: !1,
    lineFitEpsilon: 5e-3,
    carryCJKAfterClosingQuote: !0,
    breakKeepAllAfterPunctuation: !0,
    preferPrefixWidthsForBreakableRuns: !1,
  };
}
function isEmojiGrapheme(g) {
  return emojiPresentationRe2.test(g) || g.includes('\uFE0F');
}
function textMayContainEmoji(text) {
  return maybeEmojiRe.test(text);
}
function getEmojiCorrection(font) {
  return 0;
}
function countEmojiGraphemes(text) {
  let count = 0;
  const graphemeSegmenter = getSharedGraphemeSegmenter();
  for (const g of graphemeSegmenter.segment(text)) isEmojiGrapheme(g.segment) && count++;
  return count;
}
function getEmojiCount(seg, metrics) {
  return (
    metrics.emojiCount === void 0 && (metrics.emojiCount = countEmojiGraphemes(seg)),
    metrics.emojiCount
  );
}
function getCorrectedSegmentWidth(seg, metrics, emojiCorrection) {
  return emojiCorrection === 0
    ? metrics.width
    : metrics.width - getEmojiCount(seg, metrics) * emojiCorrection;
}
function getSegmentBreakableFitAdvances(seg, metrics, cache, emojiCorrection, mode) {
  if (metrics.breakableFitAdvances !== void 0 && metrics.breakableFitMode === mode)
    return metrics.breakableFitAdvances;
  metrics.breakableFitMode = mode;
  const graphemeSegmenter = getSharedGraphemeSegmenter(),
    graphemes = [];
  for (const gs of graphemeSegmenter.segment(seg)) graphemes.push(gs.segment);
  if (graphemes.length <= 1)
    return ((metrics.breakableFitAdvances = null), metrics.breakableFitAdvances);
  if (mode === 'sum-graphemes') {
    const advances2 = [];
    for (const grapheme of graphemes) {
      const graphemeMetrics = getSegmentMetrics(grapheme, cache);
      advances2.push(getCorrectedSegmentWidth(grapheme, graphemeMetrics, emojiCorrection));
    }
    return ((metrics.breakableFitAdvances = advances2), metrics.breakableFitAdvances);
  }
  if (mode === 'pair-context' || graphemes.length > MAX_PREFIX_FIT_GRAPHEMES) {
    const advances2 = [];
    let previousGrapheme = null,
      previousWidth = 0;
    for (const grapheme of graphemes) {
      const graphemeMetrics = getSegmentMetrics(grapheme, cache),
        currentWidth = getCorrectedSegmentWidth(grapheme, graphemeMetrics, emojiCorrection);
      if (previousGrapheme === null) advances2.push(currentWidth);
      else {
        const pair = previousGrapheme + grapheme,
          pairMetrics = getSegmentMetrics(pair, cache);
        advances2.push(
          getCorrectedSegmentWidth(pair, pairMetrics, emojiCorrection) - previousWidth
        );
      }
      ((previousGrapheme = grapheme), (previousWidth = currentWidth));
    }
    return ((metrics.breakableFitAdvances = advances2), metrics.breakableFitAdvances);
  }
  const advances = [];
  let prefix = '',
    prefixWidth = 0;
  for (const grapheme of graphemes) {
    prefix += grapheme;
    const prefixMetrics = getSegmentMetrics(prefix, cache),
      nextPrefixWidth = getCorrectedSegmentWidth(prefix, prefixMetrics, emojiCorrection);
    (advances.push(nextPrefixWidth - prefixWidth), (prefixWidth = nextPrefixWidth));
  }
  return ((metrics.breakableFitAdvances = advances), metrics.breakableFitAdvances);
}
function getFontMeasurementState(font, needsEmojiCorrection) {
  const ctx = getMeasureContext();
  ctx.font = font;
  const cache = getSegmentMetricCache(font),
    emojiCorrection = needsEmojiCorrection ? getEmojiCorrection(font) : 0;
  return { cache, emojiCorrection };
}
function clearMeasurementCaches() {
  (segmentMetricCaches.clear(), emojiCorrectionCache.clear());
}
function isDiscretionaryLineEnd(kinds, endSegmentIndex, endGraphemeIndex) {
  return (
    endGraphemeIndex === 0 &&
    endSegmentIndex > 0 &&
    endSegmentIndex < kinds.length &&
    kinds[endSegmentIndex - 1] === 'soft-hyphen'
  );
}
function consumesAtLineStart(kind) {
  return kind === 'space' || kind === 'zero-width-break' || kind === 'soft-hyphen';
}
function breaksAfter(kind) {
  return (
    kind === 'space' ||
    kind === 'preserved-space' ||
    kind === 'tab' ||
    kind === 'zero-width-break' ||
    kind === 'soft-hyphen'
  );
}
function normalizeLineStartSegmentIndex(
  prepared,
  segmentIndex,
  endSegmentIndex = prepared.widths.length
) {
  for (; segmentIndex < endSegmentIndex;) {
    const kind = prepared.kinds[segmentIndex];
    if (!consumesAtLineStart(kind)) break;
    segmentIndex++;
  }
  return segmentIndex;
}
function getTabAdvance(lineWidth, tabStopAdvance) {
  if (tabStopAdvance <= 0) return 0;
  const remainder = lineWidth % tabStopAdvance;
  return Math.abs(remainder) <= 1e-6 ? tabStopAdvance : tabStopAdvance - remainder;
}
function getLeadingLetterSpacing(prepared, hasContent, segmentIndex) {
  return prepared.letterSpacing !== 0 &&
    hasContent &&
    prepared.spacingGraphemeCounts[segmentIndex] > 0
    ? prepared.letterSpacing
    : 0;
}
function getLineEndContribution(leadingSpacing, segmentContribution) {
  return segmentContribution === 0 ? 0 : leadingSpacing + segmentContribution;
}
function getTabTrailingLetterSpacing(prepared, segmentIndex) {
  return prepared.letterSpacing !== 0 && prepared.spacingGraphemeCounts[segmentIndex] > 0
    ? prepared.letterSpacing
    : 0;
}
function getWholeSegmentFitContribution(
  prepared,
  kind,
  segmentIndex,
  leadingSpacing,
  segmentWidth
) {
  const segmentContribution =
    kind === 'tab'
      ? segmentWidth + getTabTrailingLetterSpacing(prepared, segmentIndex)
      : prepared.lineEndFitAdvances[segmentIndex];
  return getLineEndContribution(leadingSpacing, segmentContribution);
}
function getBreakOpportunityFitContribution(prepared, kind, segmentIndex, leadingSpacing) {
  const segmentContribution = kind === 'tab' ? 0 : prepared.lineEndFitAdvances[segmentIndex];
  return getLineEndContribution(leadingSpacing, segmentContribution);
}
function getLineEndPaintContribution(prepared, kind, segmentIndex, leadingSpacing, segmentWidth) {
  const segmentContribution =
    kind === 'tab' ? segmentWidth : prepared.lineEndPaintAdvances[segmentIndex];
  return getLineEndContribution(leadingSpacing, segmentContribution);
}
function getBreakableGraphemeAdvance(prepared, hasContent, baseAdvance) {
  return prepared.letterSpacing !== 0 && hasContent
    ? baseAdvance + prepared.letterSpacing
    : baseAdvance;
}
function getBreakableCandidateFitWidth(prepared, candidatePaintWidth) {
  return prepared.letterSpacing === 0
    ? candidatePaintWidth
    : candidatePaintWidth + prepared.letterSpacing;
}
function getNextPreferredBreakIndex(preferredBreaks, preferredBreakIndex, graphemeEnd) {
  let lo = preferredBreakIndex;
  if (lo >= preferredBreaks.length || preferredBreaks[lo] >= graphemeEnd) return lo;
  let hi = preferredBreaks.length;
  for (lo++; lo < hi;) {
    const mid = Math.floor((lo + hi) / 2);
    preferredBreaks[mid] < graphemeEnd ? (lo = mid + 1) : (hi = mid);
  }
  return lo;
}
function getTerminalLetterSpacing(
  prepared,
  startSegmentIndex,
  startGraphemeIndex,
  endSegmentIndex,
  endGraphemeIndex
) {
  if (prepared.letterSpacing === 0) return 0;
  if (endGraphemeIndex > 0)
    return prepared.spacingGraphemeCounts[endSegmentIndex] > 0 ? prepared.letterSpacing : 0;
  if (isDiscretionaryLineEnd(prepared.kinds, endSegmentIndex, endGraphemeIndex)) return 0;
  for (let i = endSegmentIndex - 1; i >= startSegmentIndex; i--) {
    const kind = prepared.kinds[i];
    if (!(
      kind === 'space' ||
      kind === 'zero-width-break' ||
      kind === 'hard-break' ||
      kind === 'soft-hyphen'
    ))
      return (i === startSegmentIndex && startGraphemeIndex > 0) ||
        prepared.spacingGraphemeCounts[i] > 0
        ? prepared.letterSpacing
        : 0;
  }
  return 0;
}
function finalizeLinePaintWidth(
  prepared,
  width,
  startSegmentIndex,
  startGraphemeIndex,
  endSegmentIndex,
  endGraphemeIndex
) {
  return (
    width +
    getTerminalLetterSpacing(
      prepared,
      startSegmentIndex,
      startGraphemeIndex,
      endSegmentIndex,
      endGraphemeIndex
    )
  );
}
function findChunkIndexForStart(prepared, segmentIndex) {
  let lo = 0,
    hi = prepared.chunks.length;
  for (; lo < hi;) {
    const mid = Math.floor((lo + hi) / 2);
    segmentIndex < prepared.chunks[mid].consumedEndSegmentIndex ? (hi = mid) : (lo = mid + 1);
  }
  return lo < prepared.chunks.length ? lo : -1;
}
function normalizeLineStartInChunk(prepared, chunkIndex, cursor) {
  let segmentIndex = cursor.segmentIndex;
  if (cursor.graphemeIndex > 0) return chunkIndex;
  for (
    let currentChunkIndex = chunkIndex;
    currentChunkIndex < prepared.chunks.length;
    currentChunkIndex++
  ) {
    const chunk = prepared.chunks[currentChunkIndex];
    if (
      (chunk.startSegmentIndex === chunk.endSegmentIndex &&
        segmentIndex === chunk.startSegmentIndex) ||
      (segmentIndex < chunk.startSegmentIndex && (segmentIndex = chunk.startSegmentIndex),
      (segmentIndex = normalizeLineStartSegmentIndex(
        prepared,
        segmentIndex,
        chunk.endSegmentIndex
      )),
      segmentIndex < chunk.endSegmentIndex)
    )
      return ((cursor.segmentIndex = segmentIndex), (cursor.graphemeIndex = 0), currentChunkIndex);
    if (chunk.consumedEndSegmentIndex >= prepared.widths.length) return -1;
    ((segmentIndex = chunk.consumedEndSegmentIndex),
      (cursor.segmentIndex = segmentIndex),
      (cursor.graphemeIndex = 0));
  }
  return -1;
}
function normalizePreparedLineStart(prepared, cursor) {
  if (cursor.segmentIndex >= prepared.widths.length) return -1;
  const chunkIndex = findChunkIndexForStart(prepared, cursor.segmentIndex);
  return chunkIndex < 0 ? -1 : normalizeLineStartInChunk(prepared, chunkIndex, cursor);
}
function normalizeLineStartChunkIndexFromHint(prepared, chunkIndex, cursor) {
  if (cursor.segmentIndex >= prepared.widths.length) return -1;
  let nextChunkIndex = chunkIndex;
  for (
    ;
    nextChunkIndex < prepared.chunks.length &&
    cursor.segmentIndex >= prepared.chunks[nextChunkIndex].consumedEndSegmentIndex;
  )
    nextChunkIndex++;
  return nextChunkIndex >= prepared.chunks.length
    ? -1
    : normalizeLineStartInChunk(prepared, nextChunkIndex, cursor);
}
function countPreparedLines(prepared, maxWidth) {
  return walkPreparedLinesRaw(prepared, maxWidth);
}
function walkPreparedLinesSimple(prepared, maxWidth, onLine) {
  const { widths, kinds, breakableFitAdvances, breakablePreferredBreaks } = prepared;
  if (widths.length === 0) return 0;
  const lineFitEpsilon = getEngineProfile().lineFitEpsilon,
    fitLimit = maxWidth + lineFitEpsilon;
  let lineCount = 0,
    lineW = 0,
    hasContent = !1,
    lineStartSegmentIndex = 0,
    lineStartGraphemeIndex = 0,
    lineEndSegmentIndex = 0,
    lineEndGraphemeIndex = 0,
    pendingBreakSegmentIndex = -1,
    pendingBreakPaintWidth = 0;
  function clearPendingBreak() {
    ((pendingBreakSegmentIndex = -1), (pendingBreakPaintWidth = 0));
  }
  function emitCurrentLine(
    endSegmentIndex = lineEndSegmentIndex,
    endGraphemeIndex = lineEndGraphemeIndex,
    width = lineW
  ) {
    (lineCount++,
      onLine == null ||
        onLine(
          width,
          lineStartSegmentIndex,
          lineStartGraphemeIndex,
          endSegmentIndex,
          endGraphemeIndex
        ),
      (lineW = 0),
      (hasContent = !1),
      clearPendingBreak());
  }
  function startLineAtSegment(segmentIndex, width) {
    ((hasContent = !0),
      (lineStartSegmentIndex = segmentIndex),
      (lineStartGraphemeIndex = 0),
      (lineEndSegmentIndex = segmentIndex + 1),
      (lineEndGraphemeIndex = 0),
      (lineW = width));
  }
  function startLineAtGrapheme(segmentIndex, graphemeIndex, width) {
    ((hasContent = !0),
      (lineStartSegmentIndex = segmentIndex),
      (lineStartGraphemeIndex = graphemeIndex),
      (lineEndSegmentIndex = segmentIndex),
      (lineEndGraphemeIndex = graphemeIndex + 1),
      (lineW = width));
  }
  function appendWholeSegment(segmentIndex, width) {
    if (!hasContent) {
      startLineAtSegment(segmentIndex, width);
      return;
    }
    ((lineW += width), (lineEndSegmentIndex = segmentIndex + 1), (lineEndGraphemeIndex = 0));
  }
  function appendBreakableSegmentFrom(segmentIndex, startGraphemeIndex) {
    var _a;
    const fitAdvances = breakableFitAdvances[segmentIndex],
      preferredBreaks = (_a = breakablePreferredBreaks[segmentIndex]) != null ? _a : null;
    let preferredBreakIndex =
        preferredBreaks === null
          ? -1
          : getNextPreferredBreakIndex(preferredBreaks, 0, startGraphemeIndex + 1),
      lastPreferredBreakEnd = -1,
      lastPreferredBreakWidth = 0,
      g = startGraphemeIndex;
    for (; g < fitAdvances.length;) {
      const gw = fitAdvances[g];
      if (!hasContent) startLineAtGrapheme(segmentIndex, g, gw);
      else if (lineW + gw > fitLimit) {
        if (preferredBreaks !== null && lastPreferredBreakEnd > startGraphemeIndex) {
          (emitCurrentLine(segmentIndex, lastPreferredBreakEnd, lastPreferredBreakWidth),
            (g = lastPreferredBreakEnd),
            (preferredBreakIndex = getNextPreferredBreakIndex(
              preferredBreaks,
              preferredBreakIndex,
              g + 1
            )),
            (lastPreferredBreakEnd = -1),
            (lastPreferredBreakWidth = 0));
          continue;
        }
        (emitCurrentLine(), startLineAtGrapheme(segmentIndex, g, gw));
      } else ((lineW += gw), (lineEndSegmentIndex = segmentIndex), (lineEndGraphemeIndex = g + 1));
      const graphemeEnd = g + 1;
      (preferredBreaks !== null &&
        preferredBreaks[preferredBreakIndex] === graphemeEnd &&
        ((lastPreferredBreakEnd = graphemeEnd),
        (lastPreferredBreakWidth = lineW),
        preferredBreakIndex++),
        g++);
    }
    hasContent &&
      lineEndSegmentIndex === segmentIndex &&
      lineEndGraphemeIndex === fitAdvances.length &&
      ((lineEndSegmentIndex = segmentIndex + 1), (lineEndGraphemeIndex = 0));
  }
  let i = 0;
  for (
    ;
    i < widths.length &&
    !(!hasContent && ((i = normalizeLineStartSegmentIndex(prepared, i)), i >= widths.length));
  ) {
    const w = widths[i],
      kind = kinds[i],
      breakAfter = breaksAfter(kind);
    if (!hasContent) {
      (w > fitLimit && breakableFitAdvances[i] !== null
        ? appendBreakableSegmentFrom(i, 0)
        : startLineAtSegment(i, w),
        breakAfter && ((pendingBreakSegmentIndex = i + 1), (pendingBreakPaintWidth = lineW - w)),
        i++);
      continue;
    }
    if (lineW + w > fitLimit) {
      if (breakAfter) {
        (appendWholeSegment(i, w), emitCurrentLine(i + 1, 0, lineW - w), i++);
        continue;
      }
      if (pendingBreakSegmentIndex >= 0) {
        if (
          lineEndSegmentIndex > pendingBreakSegmentIndex ||
          (lineEndSegmentIndex === pendingBreakSegmentIndex && lineEndGraphemeIndex > 0)
        ) {
          emitCurrentLine();
          continue;
        }
        emitCurrentLine(pendingBreakSegmentIndex, 0, pendingBreakPaintWidth);
        continue;
      }
      if (w > fitLimit && breakableFitAdvances[i] !== null) {
        (emitCurrentLine(), appendBreakableSegmentFrom(i, 0), i++);
        continue;
      }
      emitCurrentLine();
      continue;
    }
    (appendWholeSegment(i, w),
      breakAfter && ((pendingBreakSegmentIndex = i + 1), (pendingBreakPaintWidth = lineW - w)),
      i++);
  }
  return (hasContent && emitCurrentLine(), lineCount);
}
function walkPreparedLinesRaw(prepared, maxWidth, onLine) {
  if (prepared.simpleLineWalkFastPath) return walkPreparedLinesSimple(prepared, maxWidth, onLine);
  const cursor = { segmentIndex: 0, graphemeIndex: 0 },
    chunkIndex = normalizePreparedLineStart(prepared, cursor);
  return walkPreparedComplexLines(prepared, cursor, chunkIndex, maxWidth, onLine).lineCount;
}
function stepPreparedChunkLineGeometry(prepared, cursor, chunkIndex, maxWidth) {
  return walkPreparedComplexLines(prepared, cursor, chunkIndex, maxWidth, void 0, 1).lastLineWidth;
}
function walkPreparedComplexLines(
  prepared,
  cursor,
  chunkIndex,
  maxWidth,
  onLine,
  lineLimit = Number.POSITIVE_INFINITY
) {
  const {
      widths,
      kinds,
      breakableFitAdvances,
      breakablePreferredBreaks,
      discretionaryHyphenWidth,
    } = prepared,
    lineFitEpsilon = getEngineProfile().lineFitEpsilon,
    fitLimit = maxWidth + lineFitEpsilon;
  let lineStartSegmentIndex,
    lineStartGraphemeIndex,
    lineW,
    hasContent,
    lineEndSegmentIndex,
    lineEndGraphemeIndex,
    pendingBreakSegmentIndex,
    pendingBreakFitWidth,
    pendingBreakPaintWidth,
    pendingBreakKind;
  function getCurrentLinePaintWidth() {
    return pendingBreakKind === 'soft-hyphen' &&
      pendingBreakSegmentIndex === lineEndSegmentIndex &&
      lineEndGraphemeIndex === 0
      ? pendingBreakPaintWidth
      : lineW;
  }
  function finishLine(
    endSegmentIndex = lineEndSegmentIndex,
    endGraphemeIndex = lineEndGraphemeIndex,
    width = getCurrentLinePaintWidth()
  ) {
    return hasContent
      ? ((cursor.segmentIndex = endSegmentIndex),
        (cursor.graphemeIndex = endGraphemeIndex),
        finalizeLinePaintWidth(
          prepared,
          width,
          lineStartSegmentIndex,
          lineStartGraphemeIndex,
          endSegmentIndex,
          endGraphemeIndex
        ))
      : null;
  }
  function startLineAtSegment(segmentIndex, width) {
    ((hasContent = !0),
      (lineEndSegmentIndex = segmentIndex + 1),
      (lineEndGraphemeIndex = 0),
      (lineW = width));
  }
  function startLineAtGrapheme(segmentIndex, graphemeIndex, width) {
    ((hasContent = !0),
      (lineEndSegmentIndex = segmentIndex),
      (lineEndGraphemeIndex = graphemeIndex + 1),
      (lineW = width));
  }
  function appendWholeSegment(segmentIndex, advance) {
    if (!hasContent) {
      startLineAtSegment(segmentIndex, advance);
      return;
    }
    ((lineW += advance), (lineEndSegmentIndex = segmentIndex + 1), (lineEndGraphemeIndex = 0));
  }
  function updatePendingBreakForWholeSegment(
    kind,
    breakAfter,
    segmentIndex,
    segmentWidth,
    leadingSpacing,
    advance
  ) {
    if (!breakAfter) return;
    const fitAdvance = getBreakOpportunityFitContribution(
        prepared,
        kind,
        segmentIndex,
        leadingSpacing
      ),
      paintAdvance = getLineEndPaintContribution(
        prepared,
        kind,
        segmentIndex,
        leadingSpacing,
        segmentWidth
      );
    ((pendingBreakSegmentIndex = segmentIndex + 1),
      (pendingBreakFitWidth = lineW - advance + fitAdvance),
      (pendingBreakPaintWidth = lineW - advance + paintAdvance),
      (pendingBreakKind = kind));
  }
  function appendBreakableSegmentFrom(segmentIndex, startGraphemeIndex) {
    var _a;
    const fitAdvances = breakableFitAdvances[segmentIndex],
      preferredBreaks = (_a = breakablePreferredBreaks[segmentIndex]) != null ? _a : null;
    let preferredBreakIndex =
        preferredBreaks === null
          ? -1
          : getNextPreferredBreakIndex(preferredBreaks, 0, startGraphemeIndex + 1),
      lastPreferredBreakEnd = -1,
      lastPreferredBreakWidth = 0;
    for (let g = startGraphemeIndex; g < fitAdvances.length; g++) {
      const baseGw = fitAdvances[g];
      if (!hasContent) startLineAtGrapheme(segmentIndex, g, baseGw);
      else {
        const gw = getBreakableGraphemeAdvance(prepared, !0, baseGw),
          candidatePaintWidth = lineW + gw;
        if (getBreakableCandidateFitWidth(prepared, candidatePaintWidth) > fitLimit)
          return preferredBreaks !== null && lastPreferredBreakEnd > startGraphemeIndex
            ? finishLine(segmentIndex, lastPreferredBreakEnd, lastPreferredBreakWidth)
            : finishLine();
        ((lineW = candidatePaintWidth),
          (lineEndSegmentIndex = segmentIndex),
          (lineEndGraphemeIndex = g + 1));
      }
      const graphemeEnd = g + 1;
      preferredBreaks !== null &&
        preferredBreaks[preferredBreakIndex] === graphemeEnd &&
        ((lastPreferredBreakEnd = graphemeEnd),
        (lastPreferredBreakWidth = lineW),
        preferredBreakIndex++);
    }
    return (
      hasContent &&
        lineEndSegmentIndex === segmentIndex &&
        lineEndGraphemeIndex === fitAdvances.length &&
        ((lineEndSegmentIndex = segmentIndex + 1), (lineEndGraphemeIndex = 0)),
      null
    );
  }
  let lineCount = 0,
    lastLineWidth = null;
  for (; chunkIndex >= 0 && lineCount < lineLimit;) {
    ((lineStartSegmentIndex = cursor.segmentIndex),
      (lineStartGraphemeIndex = cursor.graphemeIndex),
      (lineW = 0),
      (hasContent = !1),
      (lineEndSegmentIndex = cursor.segmentIndex),
      (lineEndGraphemeIndex = cursor.graphemeIndex),
      (pendingBreakSegmentIndex = -1),
      (pendingBreakFitWidth = 0),
      (pendingBreakPaintWidth = 0),
      (pendingBreakKind = null));
    const chunk = prepared.chunks[chunkIndex];
    let lineWidth = null;
    if (chunk.startSegmentIndex === chunk.endSegmentIndex)
      ((cursor.segmentIndex = chunk.consumedEndSegmentIndex),
        (cursor.graphemeIndex = 0),
        (lineWidth = 0));
    else {
      lineLoop: for (let i = cursor.segmentIndex; i < chunk.endSegmentIndex; i++) {
        const kind = kinds[i],
          breakAfter = breaksAfter(kind),
          startGraphemeIndex = i === cursor.segmentIndex ? cursor.graphemeIndex : 0,
          leadingSpacing = getLeadingLetterSpacing(prepared, hasContent, i),
          w =
            kind === 'tab'
              ? getTabAdvance(lineW + leadingSpacing, prepared.tabStopAdvance)
              : widths[i],
          advance = leadingSpacing + w,
          fitAdvance = getWholeSegmentFitContribution(prepared, kind, i, leadingSpacing, w);
        if (kind === 'soft-hyphen' && startGraphemeIndex === 0) {
          hasContent &&
            ((lineEndSegmentIndex = i + 1),
            (lineEndGraphemeIndex = 0),
            i + 1 < chunk.endSegmentIndex &&
              ((pendingBreakSegmentIndex = i + 1),
              (pendingBreakFitWidth = lineW + discretionaryHyphenWidth),
              (pendingBreakPaintWidth = lineW + discretionaryHyphenWidth),
              (pendingBreakKind = kind)));
          continue;
        }
        if (!hasContent) {
          if (startGraphemeIndex > 0) {
            const line = appendBreakableSegmentFrom(i, startGraphemeIndex);
            if (line !== null) {
              lineWidth = line;
              break lineLoop;
            }
          } else if (fitAdvance > fitLimit && breakableFitAdvances[i] !== null) {
            const line = appendBreakableSegmentFrom(i, 0);
            if (line !== null) {
              lineWidth = line;
              break lineLoop;
            }
          } else startLineAtSegment(i, w);
          updatePendingBreakForWholeSegment(kind, breakAfter, i, w, leadingSpacing, advance);
          continue;
        }
        if (lineW + fitAdvance > fitLimit) {
          const currentBreakFitWidth =
              lineW + getBreakOpportunityFitContribution(prepared, kind, i, leadingSpacing),
            currentBreakPaintWidth =
              lineW + getLineEndPaintContribution(prepared, kind, i, leadingSpacing, w);
          if (breakAfter && currentBreakFitWidth <= fitLimit) {
            (appendWholeSegment(i, advance),
              (lineWidth = finishLine(i + 1, 0, currentBreakPaintWidth)));
            break lineLoop;
          }
          if (pendingBreakSegmentIndex >= 0 && pendingBreakFitWidth <= fitLimit) {
            if (
              lineEndSegmentIndex > pendingBreakSegmentIndex ||
              (lineEndSegmentIndex === pendingBreakSegmentIndex && lineEndGraphemeIndex > 0)
            ) {
              lineWidth = finishLine();
              break lineLoop;
            }
            lineWidth = finishLine(pendingBreakSegmentIndex, 0, pendingBreakPaintWidth);
            break lineLoop;
          }
          lineWidth = finishLine();
          break lineLoop;
        }
        (appendWholeSegment(i, advance),
          updatePendingBreakForWholeSegment(kind, breakAfter, i, w, leadingSpacing, advance));
      }
      lineWidth === null &&
        (lineWidth =
          pendingBreakSegmentIndex === chunk.consumedEndSegmentIndex && lineEndGraphemeIndex === 0
            ? finishLine(chunk.consumedEndSegmentIndex, 0, pendingBreakPaintWidth)
            : finishLine(chunk.consumedEndSegmentIndex, 0, lineW));
    }
    if (lineWidth === null) break;
    ((lastLineWidth = lineWidth),
      lineCount++,
      onLine == null ||
        onLine(
          lineWidth,
          lineStartSegmentIndex,
          lineStartGraphemeIndex,
          cursor.segmentIndex,
          cursor.graphemeIndex
        ),
      lineCount < lineLimit &&
        (chunkIndex = normalizeLineStartChunkIndexFromHint(prepared, chunkIndex, cursor)));
  }
  return { lineCount, lastLineWidth };
}
function stepPreparedSimpleLineGeometry(prepared, cursor, maxWidth) {
  var _a;
  const { widths, kinds, breakableFitAdvances, breakablePreferredBreaks } = prepared,
    lineFitEpsilon = getEngineProfile().lineFitEpsilon,
    fitLimit = maxWidth + lineFitEpsilon;
  let lineW = 0,
    hasContent = !1,
    lineEndSegmentIndex = cursor.segmentIndex,
    lineEndGraphemeIndex = cursor.graphemeIndex,
    pendingBreakSegmentIndex = -1,
    pendingBreakPaintWidth = 0;
  for (let i = cursor.segmentIndex; i < widths.length; i++) {
    const kind = kinds[i],
      breakAfter = breaksAfter(kind),
      startGraphemeIndex = i === cursor.segmentIndex ? cursor.graphemeIndex : 0,
      breakableFitAdvance = breakableFitAdvances[i],
      w = widths[i];
    if (!hasContent) {
      if (startGraphemeIndex > 0 || (w > fitLimit && breakableFitAdvance !== null)) {
        const fitAdvances = breakableFitAdvance,
          preferredBreaks = (_a = breakablePreferredBreaks[i]) != null ? _a : null;
        let preferredBreakIndex =
            preferredBreaks === null
              ? -1
              : getNextPreferredBreakIndex(preferredBreaks, 0, startGraphemeIndex + 1),
          lastPreferredBreakEnd = -1,
          lastPreferredBreakWidth = 0;
        const firstGraphemeWidth = fitAdvances[startGraphemeIndex];
        ((hasContent = !0),
          (lineW = firstGraphemeWidth),
          (lineEndSegmentIndex = i),
          (lineEndGraphemeIndex = startGraphemeIndex + 1),
          preferredBreaks !== null &&
            preferredBreaks[preferredBreakIndex] === lineEndGraphemeIndex &&
            ((lastPreferredBreakEnd = lineEndGraphemeIndex),
            (lastPreferredBreakWidth = lineW),
            preferredBreakIndex++));
        for (let g = startGraphemeIndex + 1; g < fitAdvances.length; g++) {
          const gw = fitAdvances[g];
          if (lineW + gw > fitLimit)
            return preferredBreaks !== null && lastPreferredBreakEnd > startGraphemeIndex
              ? ((cursor.segmentIndex = i),
                (cursor.graphemeIndex = lastPreferredBreakEnd),
                lastPreferredBreakWidth)
              : ((cursor.segmentIndex = lineEndSegmentIndex),
                (cursor.graphemeIndex = lineEndGraphemeIndex),
                lineW);
          ((lineW += gw),
            (lineEndSegmentIndex = i),
            (lineEndGraphemeIndex = g + 1),
            preferredBreaks !== null &&
              preferredBreaks[preferredBreakIndex] === lineEndGraphemeIndex &&
              ((lastPreferredBreakEnd = lineEndGraphemeIndex),
              (lastPreferredBreakWidth = lineW),
              preferredBreakIndex++));
        }
        lineEndSegmentIndex === i &&
          lineEndGraphemeIndex === fitAdvances.length &&
          ((lineEndSegmentIndex = i + 1), (lineEndGraphemeIndex = 0));
      } else
        ((hasContent = !0), (lineW = w), (lineEndSegmentIndex = i + 1), (lineEndGraphemeIndex = 0));
      breakAfter && ((pendingBreakSegmentIndex = i + 1), (pendingBreakPaintWidth = lineW - w));
      continue;
    }
    if (lineW + w > fitLimit)
      return breakAfter
        ? ((cursor.segmentIndex = i + 1), (cursor.graphemeIndex = 0), lineW)
        : pendingBreakSegmentIndex >= 0
          ? lineEndSegmentIndex > pendingBreakSegmentIndex ||
            (lineEndSegmentIndex === pendingBreakSegmentIndex && lineEndGraphemeIndex > 0)
            ? ((cursor.segmentIndex = lineEndSegmentIndex),
              (cursor.graphemeIndex = lineEndGraphemeIndex),
              lineW)
            : ((cursor.segmentIndex = pendingBreakSegmentIndex),
              (cursor.graphemeIndex = 0),
              pendingBreakPaintWidth)
          : ((cursor.segmentIndex = lineEndSegmentIndex),
            (cursor.graphemeIndex = lineEndGraphemeIndex),
            lineW);
    ((lineW += w),
      (lineEndSegmentIndex = i + 1),
      (lineEndGraphemeIndex = 0),
      breakAfter && ((pendingBreakSegmentIndex = i + 1), (pendingBreakPaintWidth = lineW - w)));
  }
  return hasContent
    ? ((cursor.segmentIndex = lineEndSegmentIndex),
      (cursor.graphemeIndex = lineEndGraphemeIndex),
      lineW)
    : null;
}
function stepPreparedLineGeometryFromChunk(prepared, cursor, chunkIndex, maxWidth) {
  return prepared.simpleLineWalkFastPath
    ? stepPreparedSimpleLineGeometry(prepared, cursor, maxWidth)
    : stepPreparedChunkLineGeometry(prepared, cursor, chunkIndex, maxWidth);
}
function stepPreparedLineGeometry(prepared, cursor, maxWidth) {
  const chunkIndex = normalizePreparedLineStart(prepared, cursor);
  return chunkIndex < 0
    ? null
    : stepPreparedLineGeometryFromChunk(prepared, cursor, chunkIndex, maxWidth);
}
function measurePreparedLineGeometry(prepared, maxWidth) {
  if (prepared.widths.length === 0)
    return {
      lineCount: 0,
      maxLineWidth: 0,
    };
  const cursor = {
    segmentIndex: 0,
    graphemeIndex: 0,
  };
  let lineCount = 0,
    maxLineWidth = 0;
  if (!prepared.simpleLineWalkFastPath) {
    const chunkIndex = normalizePreparedLineStart(prepared, cursor);
    return (
      (lineCount = walkPreparedComplexLines(prepared, cursor, chunkIndex, maxWidth, (width) => {
        width > maxLineWidth && (maxLineWidth = width);
      }).lineCount),
      { lineCount, maxLineWidth }
    );
  }
  for (;;) {
    const lineWidth = stepPreparedLineGeometry(prepared, cursor, maxWidth);
    if (lineWidth === null)
      return {
        lineCount,
        maxLineWidth,
      };
    (lineCount++, lineWidth > maxLineWidth && (maxLineWidth = lineWidth));
  }
}
var sharedLineTextCaches = /* @__PURE__ */ new Map();
function getSegmentGraphemeOffsets(segmentIndex, segments, cache) {
  let offsets = cache.get(segmentIndex);
  if (offsets !== void 0) return offsets;
  offsets = [0];
  const graphemeSegmenter = getSharedGraphemeSegmenter();
  for (const gs of graphemeSegmenter.segment(segments[segmentIndex]))
    offsets.push(gs.index + gs.segment.length);
  return (cache.set(segmentIndex, offsets), offsets);
}
function getLineTextCache(prepared) {
  let cache = sharedLineTextCaches.get(prepared);
  return (
    cache !== void 0 ||
      ((cache = /* @__PURE__ */ new Map()), sharedLineTextCaches.set(prepared, cache)),
    cache
  );
}
function buildLineTextFromRange(
  prepared,
  cache,
  startSegmentIndex,
  startGraphemeIndex,
  endSegmentIndex,
  endGraphemeIndex
) {
  let text = '';
  for (let i = startSegmentIndex; i < endSegmentIndex; i++)
    if (!(prepared.kinds[i] === 'soft-hyphen' || prepared.kinds[i] === 'hard-break'))
      if (i === startSegmentIndex && startGraphemeIndex > 0) {
        const offsets = getSegmentGraphemeOffsets(i, prepared.segments, cache);
        text += prepared.segments[i].slice(offsets[startGraphemeIndex]);
      } else text += prepared.segments[i];
  if (endGraphemeIndex > 0) {
    const offsets = getSegmentGraphemeOffsets(endSegmentIndex, prepared.segments, cache);
    text += prepared.segments[endSegmentIndex].slice(
      offsets[startSegmentIndex === endSegmentIndex ? startGraphemeIndex : 0],
      offsets[endGraphemeIndex]
    );
  }
  return isDiscretionaryLineEnd(prepared.kinds, endSegmentIndex, endGraphemeIndex)
    ? text + '-'
    : text;
}
function clearLineTextCaches() {
  sharedLineTextCaches = /* @__PURE__ */ new Map();
}
function createEmptyPrepared(includeSegments) {
  return includeSegments
    ? {
        widths: [],
        lineEndFitAdvances: [],
        lineEndPaintAdvances: [],
        kinds: [],
        simpleLineWalkFastPath: !0,
        segLevels: null,
        breakableFitAdvances: [],
        breakablePreferredBreaks: [],
        letterSpacing: 0,
        spacingGraphemeCounts: [],
        discretionaryHyphenWidth: 0,
        tabStopAdvance: 0,
        chunks: [],
        segments: [],
      }
    : {
        widths: [],
        lineEndFitAdvances: [],
        lineEndPaintAdvances: [],
        kinds: [],
        simpleLineWalkFastPath: !0,
        segLevels: null,
        breakableFitAdvances: [],
        breakablePreferredBreaks: [],
        letterSpacing: 0,
        spacingGraphemeCounts: [],
        discretionaryHyphenWidth: 0,
        tabStopAdvance: 0,
        chunks: [],
      };
}
function countRenderedSpacingGraphemes(text, kind) {
  if (kind === 'zero-width-break' || kind === 'soft-hyphen' || kind === 'hard-break') return 0;
  if (kind === 'tab') return 1;
  let count = 0;
  const graphemeSegmenter = getSharedGraphemeSegmenter();
  for (const _ of graphemeSegmenter.segment(text)) count++;
  return count;
}
function addInternalLetterSpacing(width, graphemeCount, letterSpacing) {
  return graphemeCount > 1 ? width + (graphemeCount - 1) * letterSpacing : width;
}
function measureAnalysis(analysis, font, includeSegments, wordBreak, letterSpacing) {
  const engineProfile = getEngineProfile(),
    { cache, emojiCorrection } = getFontMeasurementState(
      font,
      textMayContainEmoji(analysis.normalized)
    ),
    discretionaryHyphenWidth =
      getCorrectedSegmentWidth('-', getSegmentMetrics('-', cache), emojiCorrection) +
      (letterSpacing === 0 ? 0 : letterSpacing * 2),
    tabStopAdvance =
      getCorrectedSegmentWidth(' ', getSegmentMetrics(' ', cache), emojiCorrection) * 8,
    hasLetterSpacing = letterSpacing !== 0;
  if (analysis.len === 0) return createEmptyPrepared(includeSegments);
  const widths = [],
    lineEndFitAdvances = [],
    lineEndPaintAdvances = [],
    kinds = [];
  let simpleLineWalkFastPath = !hasLetterSpacing;
  const segStarts = includeSegments ? [] : null,
    breakableFitAdvances = [],
    breakablePreferredBreaks = [],
    spacingGraphemeCounts = [],
    segments = includeSegments ? [] : null,
    chunks = [];
  let chunkStartSegmentIndex = 0;
  function pushMeasuredSegment(
    text,
    width,
    lineEndFitAdvance,
    lineEndPaintAdvance,
    kind,
    start,
    breakableFitAdvance,
    breakablePreferredBreak,
    spacingGraphemeCount
  ) {
    (kind !== 'text' &&
      kind !== 'space' &&
      kind !== 'zero-width-break' &&
      (simpleLineWalkFastPath = !1),
      widths.push(width),
      lineEndFitAdvances.push(lineEndFitAdvance),
      lineEndPaintAdvances.push(lineEndPaintAdvance),
      kinds.push(kind),
      segStarts == null || segStarts.push(start),
      breakableFitAdvances.push(breakableFitAdvance),
      breakablePreferredBreaks.push(breakablePreferredBreak),
      hasLetterSpacing && spacingGraphemeCounts.push(spacingGraphemeCount),
      segments !== null && segments.push(text));
  }
  function pushMeasuredTextSegment(text, textMetrics, kind, start, allowOverflowBreaks) {
    const spacingGraphemeCount = hasLetterSpacing ? countRenderedSpacingGraphemes(text, kind) : 0,
      width = addInternalLetterSpacing(
        getCorrectedSegmentWidth(text, textMetrics, emojiCorrection),
        spacingGraphemeCount,
        letterSpacing
      ),
      baseLineEndFitAdvance =
        kind === 'space' || kind === 'preserved-space' || kind === 'zero-width-break' ? 0 : width,
      lineEndFitAdvance =
        baseLineEndFitAdvance === 0
          ? 0
          : baseLineEndFitAdvance + (spacingGraphemeCount > 0 ? letterSpacing : 0),
      lineEndPaintAdvance = kind === 'space' || kind === 'zero-width-break' ? 0 : width;
    if (allowOverflowBreaks && text.length > 1) {
      let fitMode = 'sum-graphemes';
      letterSpacing !== 0
        ? (fitMode = 'segment-prefixes')
        : isNumericRunSegment(text)
          ? (fitMode = 'pair-context')
          : engineProfile.preferPrefixWidthsForBreakableRuns && (fitMode = 'segment-prefixes');
      const fitAdvances = getSegmentBreakableFitAdvances(
          text,
          textMetrics,
          cache,
          emojiCorrection,
          fitMode
        ),
        preferredBreaks =
          fitAdvances === null || wordBreak === 'keep-all'
            ? null
            : getBreakablePreferredBreaks(text);
      pushMeasuredSegment(
        text,
        width,
        lineEndFitAdvance,
        lineEndPaintAdvance,
        kind,
        start,
        fitAdvances,
        preferredBreaks,
        spacingGraphemeCount
      );
      return;
    }
    pushMeasuredSegment(
      text,
      width,
      lineEndFitAdvance,
      lineEndPaintAdvance,
      kind,
      start,
      null,
      null,
      spacingGraphemeCount
    );
  }
  for (let mi = 0; mi < analysis.len; mi++) {
    const segText = analysis.texts[mi],
      segKind = analysis.kinds[mi],
      segStart = analysis.starts[mi];
    if (segKind === 'soft-hyphen') {
      pushMeasuredSegment(
        segText,
        0,
        discretionaryHyphenWidth,
        discretionaryHyphenWidth,
        segKind,
        segStart,
        null,
        null,
        0
      );
      continue;
    }
    if (segKind === 'hard-break') {
      const endSegmentIndex = widths.length;
      (pushMeasuredSegment(segText, 0, 0, 0, segKind, segStart, null, null, 0),
        chunks.push({
          startSegmentIndex: chunkStartSegmentIndex,
          endSegmentIndex,
          consumedEndSegmentIndex: widths.length,
        }),
        (chunkStartSegmentIndex = widths.length));
      continue;
    }
    if (segKind === 'tab') {
      pushMeasuredSegment(
        segText,
        0,
        0,
        0,
        segKind,
        segStart,
        null,
        null,
        hasLetterSpacing ? countRenderedSpacingGraphemes(segText, segKind) : 0
      );
      continue;
    }
    if (segKind === 'text' && isCJK(segText)) {
      const measuredUnits = getCjkTextUnits(segText, engineProfile, wordBreak);
      for (let i = 0; i < measuredUnits.length; i++) {
        const unit = measuredUnits[i],
          unitMetrics = getSegmentMetrics(unit.text, cache);
        pushMeasuredTextSegment(
          unit.text,
          unitMetrics,
          'text',
          segStart + unit.start,
          unit.overflow === 'grapheme' ||
            (analysis.isWordLike[mi] && (wordBreak === 'keep-all' || unit.overflow === 'word-like'))
        );
      }
      continue;
    }
    pushMeasuredTextSegment(
      segText,
      getSegmentMetrics(segText, cache),
      segKind,
      segStart,
      segKind === 'text' && (analysis.isWordLike[mi] || isIndependentSymbolRun(segText))
    );
  }
  chunkStartSegmentIndex < widths.length &&
    chunks.push({
      startSegmentIndex: chunkStartSegmentIndex,
      endSegmentIndex: widths.length,
      consumedEndSegmentIndex: widths.length,
    });
  const segLevels =
    segStarts === null ? null : computeSegmentLevels(analysis.normalized, segStarts);
  return segments !== null
    ? {
        widths,
        lineEndFitAdvances,
        lineEndPaintAdvances,
        kinds,
        simpleLineWalkFastPath,
        segLevels,
        breakableFitAdvances,
        breakablePreferredBreaks,
        letterSpacing,
        spacingGraphemeCounts,
        discretionaryHyphenWidth,
        tabStopAdvance,
        chunks,
        segments,
      }
    : {
        widths,
        lineEndFitAdvances,
        lineEndPaintAdvances,
        kinds,
        simpleLineWalkFastPath,
        segLevels,
        breakableFitAdvances,
        breakablePreferredBreaks,
        letterSpacing,
        spacingGraphemeCounts,
        discretionaryHyphenWidth,
        tabStopAdvance,
        chunks,
      };
}
function prepareInternal(text, font, includeSegments, options) {
  var _a, _b;
  const wordBreak = (_a = options == null ? void 0 : options.wordBreak) != null ? _a : 'normal',
    letterSpacing = (_b = options == null ? void 0 : options.letterSpacing) != null ? _b : 0,
    analysis = analyzeText(
      text,
      getEngineProfile(),
      options == null ? void 0 : options.whiteSpace,
      wordBreak
    );
  return measureAnalysis(analysis, font, includeSegments, wordBreak, letterSpacing);
}
function prepare(text, font, options) {
  return prepareInternal(text, font, !1, options);
}
function prepareWithSegments(text, font, options) {
  return prepareInternal(text, font, !0, options);
}
function getInternalPrepared(prepared) {
  return prepared;
}
function layout(prepared, maxWidth, lineHeight) {
  const lineCount = countPreparedLines(prepared, maxWidth);
  return { lineCount, height: lineCount * lineHeight };
}
function createLayoutLine(
  prepared,
  cache,
  width,
  startSegmentIndex,
  startGraphemeIndex,
  endSegmentIndex,
  endGraphemeIndex
) {
  return {
    text: buildLineTextFromRange(
      prepared,
      cache,
      startSegmentIndex,
      startGraphemeIndex,
      endSegmentIndex,
      endGraphemeIndex
    ),
    width,
    start: {
      segmentIndex: startSegmentIndex,
      graphemeIndex: startGraphemeIndex,
    },
    end: {
      segmentIndex: endSegmentIndex,
      graphemeIndex: endGraphemeIndex,
    },
  };
}
function createLayoutLineRange(
  width,
  startSegmentIndex,
  startGraphemeIndex,
  endSegmentIndex,
  endGraphemeIndex
) {
  return {
    width,
    start: {
      segmentIndex: startSegmentIndex,
      graphemeIndex: startGraphemeIndex,
    },
    end: {
      segmentIndex: endSegmentIndex,
      graphemeIndex: endGraphemeIndex,
    },
  };
}
function materializeLineRange(prepared, line) {
  return createLayoutLine(
    prepared,
    getLineTextCache(prepared),
    line.width,
    line.start.segmentIndex,
    line.start.graphemeIndex,
    line.end.segmentIndex,
    line.end.graphemeIndex
  );
}
function walkLineRanges(prepared, maxWidth, onLine) {
  return prepared.widths.length === 0
    ? 0
    : walkPreparedLinesRaw(
        prepared,
        maxWidth,
        (width, startSegmentIndex, startGraphemeIndex, endSegmentIndex, endGraphemeIndex) => {
          onLine(
            createLayoutLineRange(
              width,
              startSegmentIndex,
              startGraphemeIndex,
              endSegmentIndex,
              endGraphemeIndex
            )
          );
        }
      );
}
function measureLineStats(prepared, maxWidth) {
  return measurePreparedLineGeometry(prepared, maxWidth);
}
function measureNaturalWidth(prepared) {
  let maxWidth = 0;
  return (
    walkPreparedLinesRaw(prepared, Number.POSITIVE_INFINITY, (width) => {
      width > maxWidth && (maxWidth = width);
    }),
    maxWidth
  );
}
function layoutNextLine(prepared, start, maxWidth) {
  const internal = prepared,
    end = {
      segmentIndex: start.segmentIndex,
      graphemeIndex: start.graphemeIndex,
    },
    chunkIndex = normalizePreparedLineStart(internal, end);
  if (chunkIndex < 0) return null;
  const lineStartSegmentIndex = end.segmentIndex,
    lineStartGraphemeIndex = end.graphemeIndex,
    width = stepPreparedLineGeometryFromChunk(internal, end, chunkIndex, maxWidth);
  return width === null
    ? null
    : createLayoutLine(
        prepared,
        getLineTextCache(prepared),
        width,
        lineStartSegmentIndex,
        lineStartGraphemeIndex,
        end.segmentIndex,
        end.graphemeIndex
      );
}
function layoutNextLineRange(prepared, start, maxWidth) {
  const internal = prepared,
    end = {
      segmentIndex: start.segmentIndex,
      graphemeIndex: start.graphemeIndex,
    },
    chunkIndex = normalizePreparedLineStart(internal, end);
  if (chunkIndex < 0) return null;
  const lineStartSegmentIndex = end.segmentIndex,
    lineStartGraphemeIndex = end.graphemeIndex,
    width = stepPreparedLineGeometryFromChunk(internal, end, chunkIndex, maxWidth);
  return width === null
    ? null
    : createLayoutLineRange(
        width,
        lineStartSegmentIndex,
        lineStartGraphemeIndex,
        end.segmentIndex,
        end.graphemeIndex
      );
}
function layoutWithLines(prepared, maxWidth, lineHeight) {
  const lines = [];
  if (prepared.widths.length === 0) return { lineCount: 0, height: 0, lines };
  const graphemeCache = getLineTextCache(prepared),
    lineCount = walkPreparedLinesRaw(
      prepared,
      maxWidth,
      (width, startSegmentIndex, startGraphemeIndex, endSegmentIndex, endGraphemeIndex) => {
        lines.push(
          createLayoutLine(
            prepared,
            graphemeCache,
            width,
            startSegmentIndex,
            startGraphemeIndex,
            endSegmentIndex,
            endGraphemeIndex
          )
        );
      }
    );
  return { lineCount, height: lineCount * lineHeight, lines };
}
function clearCache() {
  (clearAnalysisCaches(), clearLineTextCaches(), clearMeasurementCaches());
}
function setLocale(locale) {
  (setAnalysisLocale(locale), clearCache());
}
export {
  clearCache,
  layout,
  layoutNextLine,
  layoutNextLineRange,
  layoutWithLines,
  materializeLineRange,
  measureLineStats,
  measureNaturalWidth,
  prepare,
  prepareWithSegments,
  setLocale,
  walkLineRanges,
};
