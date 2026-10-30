// Original authored preview text. No user song or upstream photographic asset.
// Timings follow the two four-line Folia preview arrangements (a8da4437).
function row(text, translation, startMs, endMs, characters) {
  const tokens = characters ? Array.from(text) : text.split(/\s+/).filter(Boolean);
  return {
    lineText: text,
    translation,
    romanization: '',
    startMs,
    durationMs: endMs - startMs,
    words: tokens.map((text, index) => ({
      text,
      start_ms: startMs + ((endMs - startMs) * index) / tokens.length,
      duration_ms: (endMs - startMs) / tokens.length,
    })),
  };
}
export const samples = [
  {
    id: 'default',
    title: '示例 · 微光',
    loopDuration: 14.4,
    cover: 'sample-light.svg',
    rows: [
      row('窗边的风，把微光写进清晨', 'The morning breeze draws a line of light.', 700, 3600, true),
      row('A quiet line finds its own rhythm.', '安静的句子，找到自己的节奏。', 4200, 7200, false),
      row('La lumière dessine un nouveau chemin.', '微光为我们画出一条新路。', 7800, 10900, false),
      row('把此刻留在这一行', 'Keep this moment in a line.', 11500, 14400, true),
    ],
  },
  {
    id: 'reserved',
    title: '示例 · 节奏',
    loopDuration: 13.6,
    cover: 'sample-rhythm.svg',
    rows: [
      row('Listen to the spaces between words.', '听见字句之间的留白。', 0, 3100, false),
      row('让每个字都有自己的呼吸', 'Give every word a little room.', 3600, 6600, true),
      row(
        'Small steps make a brighter pattern.',
        '细小的步伐，织成明亮的纹路。',
        7100,
        10100,
        false
      ),
      row('下一行，从这里开始', 'The next line begins right here.', 10600, 13600, true),
    ],
  },
];
samples[0].rows[0].backgroundVocals = [
  row('微光在这里', 'The light stays here.', 1300, 3100, true),
];
samples[0].rows[1].backgroundVocals = [
  row('A softer line stays close.', '轻轻的一行，留在身旁。', 4800, 6600, false),
];
samples[0].rows[2].backgroundVocals = [
  row('沿着光，慢慢走', 'Follow the quiet light.', 8400, 10200, true),
];
samples[1].rows[0].backgroundVocals = [row('留一点空白', 'Leave a little room.', 600, 2500, true)];
samples[1].rows[1].backgroundVocals = [
  row('We breathe between the lines.', '我们在字句间呼吸。', 4200, 6000, false),
];
