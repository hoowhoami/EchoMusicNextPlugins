import type { SpectrumFrame } from 'echo:plugin-sdk';
import type { Settings } from './config';
export function scene(
  width: number,
  height: number,
  frame: SpectrumFrame | null,
  settings: Settings,
  kind: string,
  colors: string[],
  time: number,
  display: unknown,
  pass?: number,
): unknown[];
