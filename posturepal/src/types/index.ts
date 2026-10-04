// TypeScript types for PosturePal

export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface PostureResult {
  isGood: boolean;
  neckAngle: number;
  shoulderTilt: number;
  timestamp: number;
}

export interface UserBaseline {
  neckAngle: number;
  shoulderTilt: number;
  createdAt: number;
}

export interface AppSettings {
  badPostureDurationSec: number; // FR3: default 180s (3 min)
  pomodoroDurationMin: number;   // default 45 min
  breakDurationMin: number;      // default 5 min
  notificationMessage: string;
  sensitivityOffset: number;     // extra degrees above baseline
  snoozedUntil: number | null;   // timestamp ms, null = not snoozed
  darkMode: boolean;
}

export interface DailyStats {
  date: string;        // YYYY-MM-DD
  goodSeconds: number;
  badSeconds: number;
}

export interface PostureSession {
  id?: number;
  timestamp: number;
  isGood: boolean;
  neckAngle: number;
  shoulderTilt: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  badPostureDurationSec: 180,
  pomodoroDurationMin: 45,
  breakDurationMin: 5,
  notificationMessage: "🪑 Hãy ngồi thẳng lại! Tư thế của bạn đang không tốt.",
  sensitivityOffset: 15,
  snoozedUntil: null,
  darkMode: true,
};

// MediaPipe landmark indices (Pose 33 keypoints)
export const LANDMARKS = {
  NOSE: 0,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
} as const;
