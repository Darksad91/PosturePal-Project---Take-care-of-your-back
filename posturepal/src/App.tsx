import { useEffect } from "react";
import { initDb, loadSettings, loadBaseline } from "./lib/db";
import { useAppStore } from "./store/appStore";
import Calibration from "./components/Calibration";
import Dashboard from "./components/Dashboard";
import Settings from "./components/Settings";

function App() {
  const { currentPage, dbReady, setDbReady, setSettings, setBaseline, setPage } = useAppStore();

  // Initialize DB and load persisted state on startup
  useEffect(() => {
    async function init() {
      try {
        await initDb();
        const [savedSettings, baseline] = await Promise.all([
          loadSettings(),
          loadBaseline(),
        ]);
        setSettings(savedSettings);
        setBaseline(baseline);
        setDbReady(true);

        // Always start with calibration (per user decision)
        setPage("calibration");
      } catch (err) {
        console.error("[App] DB init failed:", err);
        // Still allow app to run without DB (graceful degradation)
        setDbReady(true);
        setPage("calibration");
      }
    }
    init();
  }, []);

  // Dark mode class on <html>
  const { settings } = useAppStore();
  useEffect(() => {
    document.documentElement.classList.toggle("dark", settings.darkMode);
  }, [settings.darkMode]);

  if (!dbReady) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-4xl mb-3 animate-spin">⚙️</div>
          <p className="text-gray-400">Đang khởi động PosturePal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dark">
      {currentPage === "calibration" && <Calibration />}
      {currentPage === "dashboard" && <Dashboard />}
      {currentPage === "settings" && <Settings />}
    </div>
  );
}

export default App;
