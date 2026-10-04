import { useState, useEffect, useRef, useCallback } from "react";
import { sendPomodoroBreak, sendPomodoroResume } from "../lib/notifications";
import { useAppStore } from "../store/appStore";

export type PomodoroPhase = "work" | "break" | "idle";

export interface PomodoroState {
  phase: PomodoroPhase;
  secondsLeft: number;
  sessionCount: number;
  isRunning: boolean;
}

/**
 * Pomodoro timer hook — MVP feature.
 * Sends OS notifications for break and resume reminders.
 * Uses useState for proper React re-renders.
 */
export function usePomodoro() {
  const { settings } = useAppStore();

  const [state, setState] = useState<PomodoroState>({
    phase: "idle",
    secondsLeft: settings.pomodoroDurationMin * 60,
    sessionCount: 0,
    isRunning: false,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Keep mutable ref for access inside setInterval without stale closure
  const phaseRef = useRef<PomodoroPhase>("idle");
  const sessionCountRef = useRef<number>(0);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    setState((prev) => {
      if (!prev.isRunning) return prev;

      const next = prev.secondsLeft - 1;

      if (next <= 0) {
        if (prev.phase === "work") {
          // Work session done → start break
          const newCount = prev.sessionCount + 1;
          sessionCountRef.current = newCount;
          phaseRef.current = "break";
          sendPomodoroBreak();
          return {
            phase: "break",
            secondsLeft: settings.breakDurationMin * 60,
            sessionCount: newCount,
            isRunning: true,
          };
        } else {
          // Break done → start new work session
          phaseRef.current = "work";
          sendPomodoroResume();
          return {
            phase: "work",
            secondsLeft: settings.pomodoroDurationMin * 60,
            sessionCount: prev.sessionCount,
            isRunning: true,
          };
        }
      }

      return { ...prev, secondsLeft: next };
    });
  }, [settings]);

  const start = useCallback(() => {
    phaseRef.current = "work";
    setState((prev) => ({
      phase: "work",
      secondsLeft: settings.pomodoroDurationMin * 60,
      sessionCount: prev.sessionCount,
      isRunning: true,
    }));
    clearTimer();
    intervalRef.current = setInterval(tick, 1000);
  }, [settings, tick, clearTimer]);

  const pause = useCallback(() => {
    clearTimer();
    setState((prev) => ({ ...prev, isRunning: false }));
  }, [clearTimer]);

  const resume = useCallback(() => {
    if (phaseRef.current === "idle") return;
    setState((prev) => ({ ...prev, isRunning: true }));
    clearTimer();
    intervalRef.current = setInterval(tick, 1000);
  }, [tick, clearTimer]);

  const reset = useCallback(() => {
    clearTimer();
    phaseRef.current = "idle";
    sessionCountRef.current = 0;
    setState({
      phase: "idle",
      secondsLeft: settings.pomodoroDurationMin * 60,
      sessionCount: 0,
      isRunning: false,
    });
  }, [clearTimer, settings]);

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  return { state, start, pause, resume, reset };
}

/** Format seconds as MM:SS */
export function formatTime(seconds: number): string {
  const m = Math.floor(Math.max(0, seconds) / 60)
    .toString()
    .padStart(2, "0");
  const s = (Math.max(0, seconds) % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
