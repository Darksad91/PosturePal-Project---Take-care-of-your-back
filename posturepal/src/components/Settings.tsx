import { useState } from "react";
import { useAppStore } from "../store/appStore";
import { saveAllSettings } from "../lib/db";
import { AppSettings, DEFAULT_SETTINGS } from "../types";

export default function Settings() {
  const { settings, setSettings, setPage } = useAppStore();
  const [local, setLocal] = useState<AppSettings>({ ...settings });
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    await saveAllSettings(local);
    setSettings(local);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setLocal({ ...DEFAULT_SETTINGS });
  };

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => setPage("dashboard")}
          className="text-gray-400 hover:text-white transition-colors text-2xl leading-none"
        >
          ←
        </button>
        <h1 className="text-xl font-bold">⚙️ Cài đặt</h1>
      </div>

      <div className="space-y-4 max-w-lg">

        {/* Posture Detection */}
        <section className="bg-gray-900 rounded-2xl p-4 border border-gray-700">
          <h2 className="font-semibold text-white mb-4">🎯 Phát hiện tư thế</h2>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-300 mb-1 block">
                Thời gian trước khi cảnh báo
                <span className="text-gray-500 ml-1">(mặc định: 3 phút)</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={30}
                  max={600}
                  step={30}
                  value={local.badPostureDurationSec}
                  onChange={(e) => update("badPostureDurationSec", Number(e.target.value))}
                  className="flex-1 accent-green-500"
                />
                <span className="text-white font-mono w-16 text-right">
                  {Math.floor(local.badPostureDurationSec / 60)}:{(local.badPostureDurationSec % 60).toString().padStart(2, "0")}
                </span>
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-300 mb-1 block">
                Độ nhạy cảm biến
                <span className="text-gray-500 ml-1">(+° so với baseline)</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={5}
                  max={30}
                  step={1}
                  value={local.sensitivityOffset}
                  onChange={(e) => update("sensitivityOffset", Number(e.target.value))}
                  className="flex-1 accent-green-500"
                />
                <span className="text-white font-mono w-16 text-right">+{local.sensitivityOffset}°</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Giá trị nhỏ = nhạy hơn, cảnh báo sớm hơn. Giá trị lớn = ít cảnh báo hơn.
              </p>
            </div>

            <div>
              <label className="text-sm text-gray-300 mb-1 block">Nội dung thông báo</label>
              <textarea
                value={local.notificationMessage}
                onChange={(e) => update("notificationMessage", e.target.value)}
                rows={2}
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:border-green-500 resize-none"
              />
            </div>
          </div>
        </section>

        {/* Pomodoro */}
        <section className="bg-gray-900 rounded-2xl p-4 border border-gray-700">
          <h2 className="font-semibold text-white mb-4">⏰ Pomodoro</h2>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-300 mb-1 block">Thời gian làm việc</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={10}
                  max={90}
                  step={5}
                  value={local.pomodoroDurationMin}
                  onChange={(e) => update("pomodoroDurationMin", Number(e.target.value))}
                  className="flex-1 accent-green-500"
                />
                <span className="text-white font-mono w-16 text-right">{local.pomodoroDurationMin} phút</span>
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-300 mb-1 block">Thời gian nghỉ</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={20}
                  step={1}
                  value={local.breakDurationMin}
                  onChange={(e) => update("breakDurationMin", Number(e.target.value))}
                  className="flex-1 accent-green-500"
                />
                <span className="text-white font-mono w-16 text-right">{local.breakDurationMin} phút</span>
              </div>
            </div>
          </div>
        </section>

        {/* Calibration */}
        <section className="bg-gray-900 rounded-2xl p-4 border border-gray-700">
          <h2 className="font-semibold text-white mb-2">🎯 Hiệu chỉnh</h2>
          <p className="text-xs text-gray-400 mb-3">
            Hiệu chỉnh lại baseline tư thế của bạn (chạy tự động mỗi khi khởi động app).
          </p>
          <button
            onClick={() => setPage("calibration")}
            className="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
          >
            🔄 Hiệu chỉnh lại ngay
          </button>
        </section>

        {/* Save / Reset */}
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-medium transition-colors text-sm"
          >
            ↺ Khôi phục mặc định
          </button>
          <button
            onClick={handleSave}
            className={`flex-1 py-3 rounded-xl font-medium transition-colors text-sm ${
              saved ? "bg-green-500" : "bg-blue-600 hover:bg-blue-500"
            }`}
          >
            {saved ? "✅ Đã lưu!" : "💾 Lưu cài đặt"}
          </button>
        </div>
      </div>
    </div>
  );
}
