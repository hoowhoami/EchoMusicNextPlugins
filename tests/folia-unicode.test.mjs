import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { transform } from 'esbuild';
import { foliaURL } from './folia-source.mjs';

const moduleUrl = new URL(
  '../plugins/folia-lyrics-skin/qml/shared/text/unicode.mjs',
  import.meta.url,
);
const load = async () => {
  assert.ok(existsSync(moduleUrl), 'The plugin needs its Unicode 17 text implementation');
  return import(moduleUrl);
};

test('extended graphemes preserve emoji, Indic conjuncts, combining marks and UTF-16 offsets', async () => {
  const text = await load();
  assert.equal(text.UNICODE_VERSION, '17.0.0');
  const value = 'A\u0308👩🏽‍🚀🇨🇳क्‍ष\r\n\ud800';
  const expected = Array.from(
    new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(value),
    ({ segment, index }) => ({ segment, index }),
  );
  assert.deepEqual(text.graphemeSegments(value), expected);
  assert.equal(text.splitLyricGraphemes(value).join(''), value);
  assert.deepEqual(text.graphemeSegments(''), []);
});

test('all official Unicode 17 GraphemeBreakTest cases agree with the portable engine', async () => {
  const text = await load();
  const source = readFileSync(
    foliaURL('dependencies/unicode-17.0.0/GraphemeBreakTest.txt'),
    'utf8',
  );
  let count = 0;
  for (const row of source.split('\n')) {
    const body = row.split('#')[0].trim();
    if (!body) continue;
    const expected = [];
    let value = '';
    for (const token of body.split(/\s+/)) {
      if (token === '÷') expected.push(value.length);
      else if (token !== '×') value += String.fromCodePoint(parseInt(token, 16));
    }
    assert.deepEqual(
      [...text.graphemeSegments(value).map((part) => part.index), value.length],
      expected,
      row,
    );
    count++;
  }
  assert.ok(count > 700, `Only ${count} Unicode cases were read`);
});

test('Unicode categories/scripts and ECMAScript whitespace retain Folia predicate semantics', async () => {
  const text = await load();
  assert.equal(text.isPunctuationOnly(' 🎵—\ufeff'), true);
  assert.equal(text.isPunctuationOnly('\u0085'), false);
  assert.equal(text.isPunctuationOnly('\u0301'), false);
  assert.equal(text.isPunctuationOnly(''), false);
  assert.equal(text.endsWithLetterOrNumber('𠮷'), true);
  assert.equal(text.endsWithLetterOrNumber('e\u0301'), false);
  assert.equal(text.isCjPiece('𠮷かなー々〆〇'), true);
  assert.equal(text.hasKana('漢ー'), true);
  assert.equal(text.isAlphabeticWord('e\u0301'), true);
  assert.equal(text.isAlphabeticWord('한글'), false);
  assert.equal(text.hasLetterOrNumber('Ⅷ'), true);
  assert.equal(text.hasCategory(0x378, 'C'), true);
  assert.equal(text.categoryOf(0x378), 'Cn');
});

test('portable Folia timing uses syllable times and source parser words', async () => {
  const url = new URL(
    '../plugins/folia-lyrics-skin/qml/shared/text/graphemeTiming.mjs',
    import.meta.url,
  );
  assert.ok(existsSync(url), 'Folia grapheme timing must be ported');
  const { buildLineGraphemeTimeline } = await import(url);
  const line = {
    fullText: 'A 👩🏽‍🚀!',
    startTime: 0,
    endTime: 4,
    words: [
      { text: 'A', startTime: 1, endTime: 2 },
      {
        text: '👩🏽‍🚀',
        startTime: 2,
        endTime: 3,
        syllables: [{ text: '👩🏽‍🚀', startTime: 2.2, endTime: 2.8 }],
      },
    ],
  };
  assert.deepEqual(buildLineGraphemeTimeline(line), [
    { char: 'A', startTime: 1, endTime: 2, wordIndex: 0 },
    { char: ' ', startTime: 2, endTime: 2 },
    { char: '👩🏽‍🚀', startTime: 2.2, endTime: 2.8, wordIndex: 1 },
    { char: '!', startTime: 2.8, endTime: 2.8 },
  ]);
});

test('saved boundaries retain phrases and layout preserves timed CJK parser words', async () => {
  const base = new URL('../plugins/folia-lyrics-skin/qml/shared/text/', import.meta.url);
  assert.ok(
    existsSync(new URL('cjkSemanticLayout.mjs', base)),
    'Folia CJK and sticky layout must be ported',
  );
  const words = await import(new URL('wordSegmentation.mjs', base));
  const layout = await import(new URL('cjkSemanticLayout.mjs', base));
  assert.deepEqual(
    words.segmentLyricWords({ fullText: 'a phrase b', wordSegments: ['a phrase ', 'b'] }),
    [
      { segment: 'a phrase', index: 0, isWordLike: true },
      { segment: ' ', index: 8, isWordLike: false },
      { segment: 'b', index: 9, isWordLike: true },
    ],
  );
  const line = {
    fullText: '世界。',
    autoWordSegments: ['世界', '。'],
    words: ['世', '界', '。'].map((text, index) => ({
      text,
      startTime: index,
      endTime: index + 1,
    })),
  };
  const units = layout.buildPostLyricLayoutUnits(line, { semantic: true, sticky: true });
  assert.equal(units.length, 1);
  assert.equal(units[0].text, '世界。');
  assert.deepEqual(layout.buildDisplayWordsFromLayoutUnits(units), line.words);
  const contraction = {
    fullText: 'It’s',
    words: ['It', '’', 's'].map((text, index) => ({ text, startTime: index, endTime: index + 1 })),
  };
  assert.deepEqual(
    layout.buildDisplayWordsFromLayoutUnits(
      layout.buildPostLyricLayoutUnits(contraction, { sticky: true }),
    ),
    [{ text: 'It’s', startTime: 0, endTime: 3 }],
  );
});

test('icu-folia pipeline uses explicit ICU pieces and rejects an absent base segmenter', async () => {
  const url = new URL('../plugins/folia-lyrics-skin/qml/shared/text/icuFolia.mjs', import.meta.url);
  assert.ok(existsSync(url), 'The Folia dictionary pipeline must expose its ICU seam');
  const { segmentWithIcuFolia } = await import(url);
  const engines = {
    cutChinese: (value) => (value === '故事的' ? ['故事', '的'] : [value]),
    parseJapanese: () => ['君の', '夢に'],
  };
  assert.deepEqual(segmentWithIcuFolia('故事的', engines, ['故', '事', '的']), ['故事的']);
  assert.deepEqual(segmentWithIcuFolia('君の夢に', engines, ['君', 'の', '夢', 'に']), [
    '君の',
    '夢に',
  ]);
  assert.deepEqual(
    segmentWithIcuFolia('rock-and-roll', engines, ['rock', '-', 'and', '-', 'roll']),
    ['rock-and-roll'],
  );
  assert.throws(() => segmentWithIcuFolia('ภาษาไทย', engines), /ICU word pieces/);
});

test('real jieba/BudouX engines retain every Folia golden and known-gap split', async () => {
  const base = new URL('../plugins/folia-lyrics-skin/qml/shared/text/', import.meta.url);
  assert.ok(existsSync(new URL('engines.mjs', base)), 'Real dictionary engines must be prepared');
  const { createIcuFoliaEngines } = await import(new URL('engines.mjs', base));
  const { segmentWithIcuFolia } = await import(new URL('icuFolia.mjs', base));
  const corpus = await transform(
    readFileSync(foliaURL('test/unit/lyrics/icuFolia/corpus.ts'), 'utf8'),
    { loader: 'ts', target: 'es2016', format: 'esm' },
  );
  const { GOLDEN, KNOWN_GAPS } = await import(
    'data:text/javascript;base64,' + Buffer.from(corpus.code).toString('base64')
  );
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'word' });
  const engines = createIcuFoliaEngines();
  let count = 0;
  for (const [group, cases] of Object.entries(GOLDEN)) {
    for (const item of cases) {
      const pieces = Array.from(segmenter.segment(item.text), (part) => part.segment);
      const actual = segmentWithIcuFolia(item.text, engines, pieces);
      assert.equal(actual.join(''), item.text, group);
      assert.equal(
        actual.filter((part) => part.trim()).join('/'),
        item.expected,
        `${group}: ${item.text}`,
      );
      count++;
    }
  }
  for (const item of KNOWN_GAPS) {
    const actual = segmentWithIcuFolia(
      item.text,
      engines,
      Array.from(segmenter.segment(item.text), (part) => part.segment),
    );
    assert.equal(actual.filter((part) => part.trim()).join('/'), item.current, item.text);
    count++;
  }
  assert.ok(count > 100, `Only ${count} Folia corpus cases were read`);
});

test('portable Unicode predicates agree with Unicode 17 property escapes across the code space', async () => {
  const unicode = await load();
  assert.equal(process.versions.unicode, '17.0', 'Run with Node 24 and Unicode 17');
  const probes = [
    ['L', /^\p{L}$/u],
    ['M', /^\p{M}$/u],
    ['N', /^\p{N}$/u],
    ['P', /^\p{P}$/u],
    ['S', /^\p{S}$/u],
  ];
  const scripts = [
    ['Han', /^\p{Script=Han}$/u],
    ['Hiragana', /^\p{Script=Hiragana}$/u],
    ['Katakana', /^\p{Script=Katakana}$/u],
    ['Hangul', /^\p{Script=Hangul}$/u],
  ];
  for (let cp = 0; cp <= 0x10ffff; cp++) {
    const value = String.fromCodePoint(cp);
    for (const [category, pattern] of probes)
      assert.equal(
        unicode.hasCategory(cp, category),
        pattern.test(value),
        `${category} U+${cp.toString(16)}`,
      );
    for (const [script, pattern] of scripts)
      assert.equal(
        unicode.hasScript(cp, script),
        pattern.test(value),
        `${script} U+${cp.toString(16)}`,
      );
  }
});
