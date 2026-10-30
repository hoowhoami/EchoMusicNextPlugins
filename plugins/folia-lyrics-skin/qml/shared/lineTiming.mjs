// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/text-reference.md.
const buildTimedWords = (text, startTime, endTime) => {
  const duration = Math.max(endTime - startTime, 0.1);
  const rawTokens = text.split(/\s+/).filter((token) => token);
  const words = [];
  const tokens = [];
  let totalWeight = 0;
  for (const token of rawTokens) {
    if (/[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/.test(token)) {
      token.split('').forEach((char) => {
        const isPunctuation = /[，。！？、：；"'）]/.test(char);
        const weight = isPunctuation ? 0 : 1;
        tokens.push({ text: char, weight });
        totalWeight += weight;
      });
    } else {
      const weight = 1 + token.length * 0.15;
      tokens.push({ text: token, weight });
      totalWeight += weight;
    }
  }
  if (totalWeight === 0) {
    totalWeight = 1;
  }
  const activeDuration = duration * 0.9;
  const timePerWeight = activeDuration / totalWeight;
  let currentWordStart = startTime;
  tokens.forEach((token) => {
    const wordDuration = token.weight * timePerWeight;
    const finalDuration = Math.max(wordDuration, 0.05);
    words.push({
      text: token.text,
      startTime: currentWordStart,
      endTime: currentWordStart + finalDuration,
    });
    if (token.weight > 0) {
      currentWordStart += wordDuration;
    } else {
      currentWordStart += 0.05;
    }
  });
  if (words.length > 0) {
    const lastWord = words[words.length - 1];
    if (lastWord.endTime > endTime) {
      const scale = (endTime - startTime) / (lastWord.endTime - startTime);
      words.forEach((word) => {
        word.startTime = startTime + (word.startTime - startTime) * scale;
        word.endTime = startTime + (word.endTime - startTime) * scale;
      });
    }
  }
  return words;
};
export { buildTimedWords };
