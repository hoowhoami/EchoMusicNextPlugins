// Derived from Folia a8da4437 (AGPL-3.0-only); see diorama-reference.md.
const INSTRUMENTAL_FRAMES = 96,
  INSTRUMENTAL_SECONDS_PER_FRAME = 5,
  buildInstrumentalPhantomLines = () => {
    const result = [];
    for (let i = 0; i < 96; i += 1) {
      const block = Math.floor(i / 4),
        isChorus = block % 3 === 2;
      result.push({
        words: [],
        startTime: i * 5,
        endTime: (i + 1) * 5,
        fullText: '',
        blockIndex: block,
        songPart: isChorus ? 'chorus' : 'verse',
        isChorus,
      });
    }
    return result;
  };
export { buildInstrumentalPhantomLines };
