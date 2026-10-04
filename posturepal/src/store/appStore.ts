import { create } from "zustand";
import { AppSettings, UserBaseline, DEFAULT_SETTINGS } from "../types";

interface AppStore {
  // Settings
  settings: AppSettings;
  setSettings: (s: Partial<AppSettings>) => void;

  // Baseline
  baseline: UserBaseline | null;
  setBaseline: (b: UserBaseline | null) => void;

  // Posture state
  isGoodPosture: boolean;
  neckAngle: number;
  shoulderTilt: number;
  setPostureState: (isGood: boolean, neck: number, shoulder: number) => void;

  // Vision Engine
  isMonitoring: boolean;
  setMonitoring: (v: boolean) => void;

  // Snooze
  snoozeActive: boolean;
  snoozeUntil: number | null;
  activateSnooze: (hours?: number) => void;
  clearSnooze: () => void;

  // Navigation
  currentPage: "calibration" | "dashboard" | "settings";
  setPage: (p: AppStore["currentPage"]) => void;

  // DB ready
  dbReady: boolean;
  setDbReady: (v: boolean) => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  setSettings: (s) =>
    set((state) => ({ settings: { ...state.settings, ...s } })),

  baseline: null,
  setBaseline: (b) => set({ baseline: b }),

  isGoodPosture: true,
  neckAngle: 0,
  shoulderTilt: 0,
  setPostureState: (isGood, neck, shoulder) =>
    set({ isGoodPosture: isGood, neckAngle: neck, shoulderTilt: shoulder }),

  isMonitoring: false,
  setMonitoring: (v) => set({ isMonitoring: v }),

  snoozeActive: false,
  snoozeUntil: null,
  activateSnooze: (hours = 1) => {
    const until = Date.now() + hours * 60 * 60 * 1000;
    set({ snoozeActive: true, snoozeUntil: until });
    // Auto-clear when snooze expires
    setTimeout(() => {
      if (get().snoozeUntil === until) {
        set({ snoozeActive: false, snoozeUntil: null });
      }
    }, hours * 60 * 60 * 1000);
  },
  clearSnooze: () => set({ snoozeActive: false, snoozeUntil: null }),

  currentPage: "calibration",
  setPage: (p) => set({ currentPage: p }),

  dbReady: false,
  setDbReady: (v) => set({ dbReady: v }),
}));
