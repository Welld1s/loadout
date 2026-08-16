export type IntensityLevel = 'off' | 'low' | 'med' | 'high';

export interface RumbleStatus {
  available: boolean;
  intensity: IntensityLevel;
  leftEnabled: boolean;
  rightEnabled: boolean;
  devicePath: string | null;
  deviceName: string | null;
}
