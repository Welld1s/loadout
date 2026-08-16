import type { IntensityLevel } from "../shared";

export const INTENSITY_MAP: Record<IntensityLevel, number> = {
  off: 0,
  low: 0.3,
  med: 0.6,
  high: 1.0,
};

export const INTENSITY_LEVELS: IntensityLevel[] = ['off', 'low', 'med', 'high'];

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function getIntensityMultiplier(level: IntensityLevel): number {
  return INTENSITY_MAP[level] ?? 0;
}
