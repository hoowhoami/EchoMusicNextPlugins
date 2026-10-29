// Folia icuFolia/engines.ts port; eager imports run only inside the lazy WorkerScript.
// AGPL-3.0-only; jieba data MIT, BudouX Apache-2.0, OpenCC tables MIT.
import { createJieba } from './jieba.mjs';
import { CHINESE_EXTRA_WORDS, CHINESE_DEMOTED_WORDS } from './jiebaLexicon.mjs';
import { DICT_WORDS, DICT_FREQS, DICT_TOTAL } from './jieba-dict.mjs';
import { HMM_START, HMM_TRANS, HMM_EMIT, T2S_PAIRS } from './jieba-hmm.mjs';
import { Parser } from './budoux-parser.mjs';
import { model as jaModel } from './budoux-ja.mjs';
import { codePoints } from './codepoints.mjs';

let loaded = null;
export function createIcuFoliaEngines() {
  if (loaded) return loaded;
  const jieba = createJieba(
    {
      words: DICT_WORDS,
      freqs: DICT_FREQS,
      total: DICT_TOTAL,
      hmm: { start: HMM_START, trans: HMM_TRANS, emit: HMM_EMIT },
    },
    { maxHmmWordLength: 2 }
  );
  CHINESE_EXTRA_WORDS.forEach((word) => jieba.addWord(word));
  CHINESE_DEMOTED_WORDS.forEach((word) => jieba.addWord(word, 1));
  const pairs = new Map();
  for (let index = 0; index + 1 < T2S_PAIRS.length; index += 2)
    pairs.set(T2S_PAIRS[index], T2S_PAIRS[index + 1]);
  const japanese = new Parser(jaModel);
  loaded = {
    cutChinese(text) {
      const simplified = codePoints(text)
        .map((char) => pairs.get(char) || char)
        .join('');
      let cursor = 0;
      return jieba.cut(simplified).map((word) => {
        const original = text.slice(cursor, cursor + word.length);
        cursor += word.length;
        return original;
      });
    },
    parseJapanese(text) {
      return japanese.parse(text);
    },
  };
  return loaded;
}
