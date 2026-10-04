import { useEffect, useState, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from "recharts";

import { getDailyStats, pruneOldSessions } from "../lib/db";
import { useAppStore } from "../store/appStore";
import { useVisionEngine } from "../hooks/useVisionEngine";
import { usePomodoro, formatTime } from "../hooks/usePomodoro";
import { DailyStats } from "../types";

export default function Dashboard() {
  const {
    isGoodPosture, neckAngle, shoulderTilt,
    isMonitoring, snoozeActive,
    setPage, activateSnooze, clearSnooze,
  } = useAppStore();

  const { startMonitoring, stopMonitoring } = useVisionEngine();
  const pomodoro = usePomodoro();
  const { state: pomodoroState } = pomodoro;

  const [weeklyData, setWeeklyData] = useState<DailyStats[]>([]);

  const loadStats = useCallback(async () => {
    const stats = await getDailyStats(7);
    setWeeklyData(stats);
  }, []);

  // Load stats and start monitoring on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    pruneOldSessions(30);
    loadStats();
    if (!isMonitoring) startMonitoring();
    return () => stopMonitoring();
  }, []); // Intentional: mount-only effect

  // Reload stats every minute
  useEffect(() => {
    const interval = setInterval(loadStats, 60_000);
    return () => clearInterval(interval);
  }, [loadStats]);

  // Format date label for chart
  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString("vi-VN", { weekday: "short", month: "numeric", day: "numeric" });
  };

  const posturePercent = weeklyData.length > 0
    ? Math.round(
        weeklyData.reduce((s, d) => s + d.goodSeconds, 0) /
        weeklyData.reduce((s, d) => s + d.goodSeconds + d.badSeconds, 1) * 100
      )
    : null;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🪑</span>
          <h1 className="text-xl font-bold">PosturePal</h1>
        </div>
        <div className="flex gap-2">
          {snoozeActive ? (
            <button
              onClick={clearSnooze}
              className="text-xs px-3 py-1 bg-yellow-600 hover:bg-yellow-500 rounded-full transition-colors"
            >
              ⏸ Đang snooze — Bỏ snooze
            </button>
          ) : (
            <button
              onClick={() => activateSnooze(1)}
              className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors"
            >
              ⏸ Snooze 1 giờ
            </button>
          )}
          <button
            onClick={() => setPage("settings")}
            className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors"
          >
            ⚙️ Cài đặt
          </button>
        </div>
      </div>

      {/* Posture Status Card */}
      <div className={`rounded-2xl p-5 transition-colors ${
        snoozeActive
          ? "bg-yellow-900/40 border border-yellow-700"
          : isGoodPosture
            ? "bg-green-900/40 border border-green-700"
            : "bg-red-900/40 border border-red-700"
      }`}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm text-gray-400">Tư thế hiện tại</p>
            <p className={`text-2xl font-bold mt-1 ${
              snoozeActive ? "text-yellow-400"
              : isGoodPosture ? "text-green-400" : "text-red-400"
            }`}>
              {snoozeActive ? "⏸ Tạm ngưng" : isGoodPosture ? "✅ Tốt" : "⚠️ Cần điều chỉnh"}
            </p>
          </div>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl ${
            snoozeActive ? "bg-yellow-800" : isGoodPosture ? "bg-green-800" : "bg-red-800"
          }`}>
            {snoozeActive ? "😴" : isGoodPosture ? "😊" : "😬"}
          </div>
        </div>

        {/* Angle meters */}
        {isMonitoring && !snoozeActive && (
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="bg-black/20 rounded-xl p-3">
              <p className="text-xs text-gray-400">Góc cổ</p>
              <p className="text-lg font-semibold">{neckAngle.toFixed(1)}°</p>
            </div>
            <div className="bg-black/20 rounded-xl p-3">
              <p className="text-xs text-gray-400">Lệch vai</p>
              <p className="text-lg font-semibold">{shoulderTilt.toFixed(1)}°</p>
            </div>
          </div>
        )}

        {!isMonitoring && (
          <button
            onClick={startMonitoring}
            className="mt-3 w-full py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-medium transition-colors"
          >
            ▶ Bắt đầu theo dõi
          </button>
        )}
      </div>

      {/* Pomodoro Card */}
      <div className="bg-gray-900 rounded-2xl p-4 border border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-semibold text-white">⏰ Pomodoro</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {pomodoroState.phase === "work" && (pomodoroState.isRunning ? "🔴 Đang làm việc" : "⏸ Đã tạm dừng")}
              {pomodoroState.phase === "break" && "🟢 Giải lao — Giãn cơ nào!"}
              {pomodoroState.phase === "idle" && "Chưa bắt đầu"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-mono font-bold text-white">
              {formatTime(pomodoroState.secondsLeft)}
            </p>
            <p className="text-xs text-gray-500">phiên #{pomodoroState.sessionCount + 1}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {pomodoroState.phase === "idle" ? (
            <button
              onClick={pomodoro.start}
              className="flex-1 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium transition-colors"
            >
              ▶ Bắt đầu
            </button>
          ) : pomodoroState.isRunning ? (
            <>
              <button
                onClick={pomodoro.pause}
                className="flex-1 py-2 bg-yellow-600 hover:bg-yellow-500 rounded-lg text-sm font-medium transition-colors"
              >
                ⏸ Tạm dừng
              </button>
              <button
                onClick={pomodoro.reset}
                className="py-2 px-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
              >
                ↺ Reset
              </button>
            </>
          ) : (
            <>
              <button
                onClick={pomodoro.resume}
                className="flex-1 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium transition-colors"
              >
                ▶ Tiếp tục
              </button>
              <button
                onClick={pomodoro.reset}
                className="py-2 px-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
              >
                ↺ Reset
              </button>
            </>
          )}
        </div>

        {/* Stretch reminder during break */}
        {pomodoroState.phase === "break" && (
          <div className="mt-3 bg-green-900/30 border border-green-700 rounded-xl p-3 text-sm text-green-300">
            <p className="font-medium mb-1">💪 Bài giãn cơ gợi ý:</p>
            <ul className="text-xs space-y-1 text-green-400">
              <li>• Xoay vai ra sau 10 lần</li>
              <li>• Cúi cổ sang trái/phải, giữ 5 giây mỗi bên</li>
              <li>• Đứng dậy đi lại 2-3 phút</li>
              <li>• Nhìn xa 20 giây (quy tắc 20-20-20 cho mắt)</li>
            </ul>
          </div>
        )}
      </div>

      {/* Weekly Stats Chart */}
      <div className="bg-gray-900 rounded-2xl p-4 border border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-white">📊 Thống kê 7 ngày qua</h2>
          {posturePercent !== null && (
            <span className={`text-sm font-medium ${posturePercent >= 70 ? "text-green-400" : "text-yellow-400"}`}>
              TB: {posturePercent}% tốt
            </span>
          )}
        </div>
        {weeklyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weeklyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fill: "#9CA3AF", fontSize: 11 }}
              />
              <YAxis tick={{ fill: "#9CA3AF", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: 8 }}
                labelStyle={{ color: "#fff" }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(v: any, name: any) => [
                  `${Math.round((Number(v) || 0) / 60)} phút`,
                  name === "goodSeconds" ? "✅ Tốt" : "❌ Xấu"
                ]}
                labelFormatter={(label) => formatDate(String(label))}
              />
              <Legend formatter={(v) => v === "goodSeconds" ? "Tốt" : "Xấu"} />
              <Bar dataKey="goodSeconds" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
              <Bar dataKey="badSeconds" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[180px] flex items-center justify-center text-gray-500 text-sm">
            Chưa có dữ liệu. Hãy bắt đầu theo dõi!
          </div>
        )}
      </div>
    </div>
  );
}
