import type { SpectrumFrame } from 'echo:plugin-sdk';
import type { Settings } from './config';
export function paint(
  context: unknown,
  width: number,
  height: number,
  frame: SpectrumFrame | null,
  settings: Settings,
  kind: string,
  colors: string[],
  time: number,
  display: unknown,
): void;
export function centered(
  context: unknown,
  width: number,
  height: number,
  frame: SpectrumFrame | null,
  settings: Settings,
  kind: string,
  colors: string[],
  display: unknown,
): void;
export function mist(
  context: unknown,
  width: number,
  height: number,
  frame: SpectrumFrame | null,
  settings: Settings,
  kind: string,
  colors: string[],
  time: number,
  index: number,
): void;
export function blurFor(settings: Settings, index: number): number;
export function palette(name: string, theme: string[]): string[];

export function backdrop(
  context: unknown,
  width: number,
  height: number,
  frame: SpectrumFrame | null,
  settings: Settings,
  kind: string,
  colors: string[],
): void;
