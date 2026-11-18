// Copyright (c) 2026 chthollyphile. Derived from Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935; AGPL-3.0-only.
// Source: src/components/visualizer/metaphor/types.ts
import { DEFAULT_LYRIC_RENDER_OVERRIDE } from './renderQuality.mjs';
const METAPHOR_LIMITS = {
  cutPace: { min: 0.4, max: 2 },
  cameraMotion: { min: 0, max: 2 },
  flow: { min: 0, max: 2 },
  blobs: { min: 0, max: 2 },
  halftone: { min: 0.5, max: 2.5 },
  grain: { min: 0, max: 2 },
};
const METAPHOR_BOOLEAN_KEYS = ['negative', 'flip', 'keywordColors', 'transitions'];
const DEFAULT_METAPHOR_TUNING = {
  render: DEFAULT_LYRIC_RENDER_OVERRIDE,
  cutPace: 1,
  cameraMotion: 1,
  flow: 1,
  blobs: 1,
  halftone: 1,
  grain: 1,
  negative: true,
  flip: false,
  keywordColors: false,
  transitions: true,
};
export { DEFAULT_METAPHOR_TUNING, METAPHOR_BOOLEAN_KEYS, METAPHOR_LIMITS };
