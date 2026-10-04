import { useState, useEffect, useRef, useCallback } from "react";
import { PoseLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { calculateNeckAngle, calculateShoulderTilt, midpoint, isLandmarkReliable } from "../lib/angleCalculator";
import { saveBaseline } from "../lib/db";
import { useAppStore } from "../store/appStore";
import { LANDMARKS, UserBaseline } from "../types";

const CALIBRATION_SECONDS = 10;
const MEDIAPIPE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

export default function Calibration() {
  const [phase, setPhase] = useState<"intro" | "counting" | "done" | "error">("intro");
  const [countdown, setCountdown] = useState(CALIBRATION_SECONDS);
  const [errorMsg, setErrorMsg] = useState("");
  const { setBaseline, setPage } = useAppStore();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const samplesRef = useRef<{ neck: number; shoulder: number }[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    try {
      if (intervalRef.current) clearInterval(intervalRef.current);
      const v = videoRef.current;
      if (v?.srcObject) {
        (v.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
        v.srcObject = null;
      }
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
        landmarkerRef.current = null;
      }
    } catch (e) {
      console.error("Cleanup error:", e);
    }
  }, []);

  const startCalibration = useCallback(async () => {
    setPhase("counting");
    samplesRef.current = [];
    try {
      // Init MediaPipe
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
      );
      landmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MEDIAPIPE_MODEL_URL, delegate: "GPU" },
        runningMode: "VIDEO",
        numPoses: 1,
        minPoseDetectionConfidence: 0.6,
        minPosePresenceConfidence: 0.6,
        minTrackingConfidence: 0.6,
      });

      // Start camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240 },
        audio: false,
      });
      
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.playsInline = true;
        await video.play();
      }

      let remaining = CALIBRATION_SECONDS;
      setCountdown(remaining);

      intervalRef.current = setInterval(() => {
        remaining -= 1;
        setCountdown(remaining);

        // Sample posture every second
        const lm = landmarkerRef.current;
        const vid = videoRef.current;
        if (lm && vid) {
          try {
            const result = lm.detectForVideo(vid, performance.now());
            const landmarks = result.worldLandmarks?.[0];
            if (landmarks && landmarks.length >= 13) {
              const leftEar = landmarks[LANDMARKS.LEFT_EAR];
              const rightEar = landmarks[LANDMARKS.RIGHT_EAR];
              const leftShoulder = landmarks[LANDMARKS.LEFT_SHOULDER];
              const rightShoulder = landmarks[LANDMARKS.RIGHT_SHOULDER];
              if (isLandmarkReliable(leftEar) || isLandmarkReliable(rightEar)) {
                const ear = isLandmarkReliable(leftEar) && isLandmarkReliable(rightEar)
                  ? midpoint(leftEar, rightEar)
                  : isLandmarkReliable(leftEar) ? leftEar : rightEar;
                const shoulder = midpoint(leftShoulder, rightShoulder);
                samplesRef.current.push({
                  neck: calculateNeckAngle(ear, shoulder),
                  shoulder: calculateShoulderTilt(leftShoulder, rightShoulder),
                });
              }
            }
          } catch { /* ignore frame errors */ }
        }

        if (remaining <= 0) {
          clearInterval(intervalRef.current!);
          finishCalibration();
        }
      }, 1000);
    } catch (err) {
      setPhase("error");
      setErrorMsg(String(err));
    }
  }, []);

  const finishCalibration = useCallback(async () => {
    cleanup();
    try {
      const samples = samplesRef.current;
      if (samples.length < 3) {
        setPhase("error");
        setErrorMsg("Không đủ dữ liệu. Hãy đảm bảo webcam nhìn thấy khuôn mặt và vai của bạn.");
        return;
      }
      // Average the samples
      const avgNeck = samples.reduce((s, x) => s + x.neck, 0) / samples.length;
      const avgShoulder = samples.reduce((s, x) => s + x.shoulder, 0) / samples.length;
      const baseline: UserBaseline = { neckAngle: avgNeck, shoulderTilt: avgShoulder, createdAt: Date.now() };

      await saveBaseline(baseline);
      setBaseline(baseline);
      setPhase("done");
      setTimeout(() => setPage("dashboard"), 1500);
    } catch (err) {
      setPhase("error");
      setErrorMsg("Lỗi khi lưu baseline: " + String(err));
    }
  }, [cleanup, setBaseline, setPage]);

  useEffect(() => () => cleanup(), [cleanup]);

  const progress = ((CALIBRATION_SECONDS - countdown) / CALIBRATION_SECONDS) * 100;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white px-6">
      <div className="max-w-md w-full text-center">
        {/* Logo */}
        <div className="text-6xl mb-4">🪑</div>
        <h1 className="text-3xl font-bold text-white mb-2">PosturePal</h1>

        {/* Webcam feed (visible only when counting) */}
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={`w-full max-w-[320px] aspect-video object-cover mx-auto rounded-2xl shadow-lg border-2 border-gray-700 mb-6 ${
            phase === "counting" ? "block" : "hidden"
          }`}
          style={{ transform: "scaleX(-1)" }} // Mirror image for UX
        />

        {phase === "intro" && (
          <>
            <p className="text-gray-300 mb-2 text-lg">Hiệu chỉnh tư thế của bạn</p>
            <p className="text-gray-400 mb-8 text-sm leading-relaxed">
              Hãy <strong className="text-white">ngồi thẳng và thoải mái</strong> trước webcam,
              sau đó bấm bắt đầu. Hệ thống sẽ ghi lại tư thế chuẩn của riêng bạn trong 10 giây.
            </p>
            <div className="bg-gray-800 rounded-xl p-4 mb-8 text-left text-sm text-gray-300 space-y-2">
              <div className="flex gap-2">✅ <span>Ngồi thẳng lưng, đầu thẳng</span></div>
              <div className="flex gap-2">✅ <span>Webcam nhìn thấy mặt và vai</span></div>
              <div className="flex gap-2">✅ <span>Ánh sáng đủ tốt</span></div>
              <div className="flex gap-2">⚠️ <span>Không cúi hoặc nghiêng đầu khi đang hiệu chỉnh</span></div>
            </div>
            <button
              onClick={startCalibration}
              className="w-full py-3 px-6 bg-green-500 hover:bg-green-400 text-white font-semibold rounded-xl transition-colors text-lg"
            >
              🚀 Bắt đầu hiệu chỉnh
            </button>
          </>
        )}

        {phase === "counting" && (
          <>
            <p className="text-gray-300 mb-4 text-lg">Đang hiệu chỉnh... Hãy giữ nguyên tư thế!</p>
            {/* Countdown circle */}
            <div className="relative w-40 h-40 mx-auto mb-6">
              <svg className="w-40 h-40 -rotate-90" viewBox="0 0 160 160">
                <circle cx="80" cy="80" r="70" fill="none" stroke="#1f2937" strokeWidth="10" />
                <circle
                  cx="80" cy="80" r="70"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="10"
                  strokeDasharray={`${2 * Math.PI * 70}`}
                  strokeDashoffset={`${2 * Math.PI * 70 * (1 - progress / 100)}`}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-5xl font-bold text-green-400">{countdown}</span>
              </div>
            </div>
            <p className="text-gray-400 text-sm animate-pulse">📸 Đang lấy mẫu tư thế...</p>
          </>
        )}

        {phase === "done" && (
          <div className="text-center">
            <div className="text-6xl mb-4">✅</div>
            <p className="text-green-400 text-xl font-semibold">Hiệu chỉnh thành công!</p>
            <p className="text-gray-400 mt-2">Đang chuyển đến Dashboard...</p>
          </div>
        )}

        {phase === "error" && (
          <div className="text-center">
            <div className="text-5xl mb-4">❌</div>
            <p className="text-red-400 text-lg font-semibold mb-2">Hiệu chỉnh thất bại</p>
            <p className="text-gray-400 text-sm mb-6">{errorMsg}</p>
            <button
              onClick={() => { setPhase("intro"); setErrorMsg(""); }}
              className="py-2 px-6 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors"
            >
              Thử lại
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
