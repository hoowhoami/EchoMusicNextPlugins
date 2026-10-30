// Saved/auto boundaries retain source priority; absent boundaries require real ICU.
import {
  isValidWordSegmentation,
  segmentLyricWords as savedSegments,
} from '../../shared/text/wordSegmentation.mjs';
import { portableWordSegmenter } from './native-measure.mjs';
export function segmentLyricWords(line) {
  if (
    isValidWordSegmentation(line.fullText, line.wordSegments) ||
    isValidWordSegmentation(line.fullText, line.autoWordSegments)
  )
    return savedSegments(line);
  return line.fullText ? portableWordSegmenter.segment(line.fullText) : [];
}
