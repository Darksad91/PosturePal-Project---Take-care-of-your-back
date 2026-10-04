import { sendNotification } from "@tauri-apps/plugin-notification";
import { AppSettings } from "../types";

/** Send an OS notification for bad posture */
export async function sendPostureAlert(settings: AppSettings): Promise<void> {
  await sendNotification({
    title: "PosturePal 🪑",
    body: settings.notificationMessage,
  });
}

/** Send a Pomodoro break reminder */
export async function sendPomodoroBreak(): Promise<void> {
  await sendNotification({
    title: "PosturePal ⏰ Nghỉ giải lao!",
    body: "Đã đến giờ đứng dậy vận động! Hãy giãn cơ một chút nhé 💪",
  });
}

/** Send a Pomodoro resume reminder */
export async function sendPomodoroResume(): Promise<void> {
  await sendNotification({
    title: "PosturePal ✅ Bắt đầu lại!",
    body: "Thời gian nghỉ đã hết. Sẵn sàng tập trung tiếp không? 🚀",
  });
}
