import { useEffect, useRef, useCallback } from "react";
import { PoseLandmarker, FilesetResolver, PoseLandmarkerResult } from "@mediapipe/tasks-vision";
import { calculateNeckAngle, calculateShoulderTilt, midpoint, isLandmarkReliable } from "../lib/angleCalculator";
import { logPosture } from "../lib/db";
import { sendPostureAlert } from "../lib/notifications";
import { useAppStore } from "../store/appStore";
import { LANDMARKS } from "../types";

const DETECTION_INTERVAL_MS = 1000; // FR1: 1 FPS to save CPU
const MEDIAPIPE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

export function useVisionEngine() {
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const badPostureTimerRef = useRef<number>(0); // seconds of continuous bad posture
  const lastNotifTime = useRef<number>(0);

  const {
    baseline,
    settings,
    snoozeActive,
    isMonitoring,
    setMonitoring,
    setPostureState,
  } = useAppStore();

  /** Initialize MediaPipe PoseLandmarker */
  const initLandmarker = useCallback(async () => {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
    );
    landmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MEDIAPIPE_MODEL_URL,
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
  }, []);

  /** Start webcam stream */
  const startCamera = useCallback(async (): Promise<HTMLVideoElement> => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, frameRate: 5 }, // Low FPS to save CPU
      audio: false,
    });
    const video = document.createElement("video");
    video.srcObject = stream;
    video.playsInline = true;
    await video.play();
    videoRef.current = video;
    return video;
  }, []);

  /** Process one frame — extract landmarks, calculate angles, evaluate posture */
  const processFrame = useCallback(() => {
    const landmarker = landmarkerRef.current;
    const video = videoRef.current;
    if (!landmarker || !video || !baseline) return;

    let result: PoseLandmarkerResult;
    try {
      result = landmarker.detectForVideo(video, performance.now());
    } catch {
      return;
    }

    // PRIVACY: frame is never stored — only landmark coordinates (numbers) are used
    const landmarks = result.worldLandmarks?.[0];
    if (!landmarks || landmarks.length < 13) return;

    const leftEar = landmarks[LANDMARKS.LEFT_EAR];
    const rightEar = landmarks[LANDMARKS.RIGHT_EAR];
    const leftShoulder = landmarks[LANDMARKS.LEFT_SHOULDER];
    const rightShoulder = landmarks[LANDMARKS.RIGHT_SHOULDER];

    // Skip if landmarks not reliably detected
    if (
      !isLandmarkReliable(leftEar) &&
      !isLandmarkReliable(rightEar)
    ) return;

    // Use the more reliable ear, or average both
    const ear = isLandmarkReliable(leftEar) && isLandmarkReliable(rightEar)
      ? midpoint(leftEar, rightEar)
      : isLandmarkReliable(leftEar) ? leftEar : rightEar;

    const shoulder = midpoint(leftShoulder, rightShoulder);
    const neckAngle = calculateNeckAngle(ear, shoulder);
    const shoulderTilt = calculateShoulderTilt(leftShoulder, rightShoulder);

    // Evaluate posture against user's personal baseline + sensitivity offset
    const neckThreshold = baseline.neckAngle + settings.sensitivityOffset;
    const shoulderThreshold = baseline.shoulderTilt + 5; // fixed 5° threshold
    const isGood = neckAngle <= neckThreshold && shoulderTilt <= shoulderThreshold;

    setPostureState(isGood, neckAngle, shoulderTilt);

    // Log to DB (every second)
    logPosture({ timestamp: Date.now(), isGood, neckAngle, shoulderTilt });

    // Debounce logic — FR3
    if (!isGood && !snoozeActive) {
      badPostureTimerRef.current += 1;
      if (
        badPostureTimerRef.current >= settings.badPostureDurationSec &&
        Date.now() - lastNotifTime.current > settings.badPostureDurationSec * 1000
      ) {
        sendPostureAlert(settings);
        lastNotifTime.current = Date.now();
        badPostureTimerRef.current = 0; // reset after alert
      }
    } else {
      badPostureTimerRef.current = 0; // reset on good posture or snooze
    }
  }, [baseline, settings, snoozeActive, setPostureState]);

  /** Start the vision engine */
  const startMonitoring = useCallback(async () => {
    if (isMonitoring) return;
    try {
      if (!landmarkerRef.current) await initLandmarker();
      await startCamera();
      intervalRef.current = setInterval(processFrame, DETECTION_INTERVAL_MS);
      setMonitoring(true);
    } catch (err) {
      console.error("[VisionEngine] Failed to start:", err);
    }
  }, [isMonitoring, initLandmarker, startCamera, processFrame, setMonitoring]);

  /** Stop the vision engine and release camera */
  const stopMonitoring = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const video = videoRef.current;
    if (video?.srcObject) {
      (video.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    }
    videoRef.current = null;
    setMonitoring(false);
  }, [setMonitoring]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring();
      landmarkerRef.current?.close();
    };
  }, [stopMonitoring]);

  return { startMonitoring, stopMonitoring };
}
