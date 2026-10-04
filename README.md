# 🪑 PosturePal

**PosturePal** là ứng dụng desktop theo dõi tư thế ngồi theo thời gian thực, sử dụng webcam và AI (MediaPipe) để phát hiện tư thế sai — **100% xử lý cục bộ, không gửi dữ liệu qua mạng**.

---

## ✨ Tính năng

| Tính năng | Mô tả |
|---|---|
| 🧠 **AI Pose Detection** | MediaPipe PoseLandmarker chạy 1 FPS, tính góc cổ và vai |
| 🎯 **Baseline Calibration** | Học tư thế chuẩn của riêng bạn (10 giây) mỗi khi khởi động |
| ⚠️ **Smart Alerts** | Cảnh báo chỉ khi sai tư thế liên tục > 3 phút (có thể tuỉnh chỉnh) |
| ⏸ **Snooze** | Tạm dừng theo dõi 1 giờ khi họp/dùng webcam việc khác |
| ⏰ **Pomodoro Timer** | Nhắc nghỉ giải lao kèm bài giãn cơ gợi ý |
| 📊 **Dashboard** | Biểu đồ tư thế 7 ngày qua (Tốt/Xấu theo phút) |
| ⚙️ **Cài đặt** | Tuỉnh chỉnh độ nhạy, thời gian debounce, Pomodoro |
| 🔒 **Riêng tư tuyệt đối** | Frame ảnh bị xóa ngay lập tức, chỉ lưu tọa độ số |

---

## 🛠 Tech Stack

| Layer | Công nghệ |
|---|---|
| Framework | [Tauri 2.0](https://tauri.app) (Rust + WebView) |
| Frontend | React 18 + TypeScript + Tailwind CSS |
| Computer Vision | [@mediapipe/tasks-vision](https://developers.google.com/mediapipe) |
| State | Zustand |
| Charts | Recharts |
| Database | SQLite via `tauri-plugin-sql` |
| Notifications | `tauri-plugin-notification` |

---

## 🚀 Chạy dự án

### Yêu cầu

- [Node.js](https://nodejs.org) ≥ 18
- [Rust](https://rustup.rs) (stable)
- Webcam

### Dev mode

```bash
cd posturepal
npm install
npm run tauri dev
```

### Build production

```bash
npm run tauri build
# → Windows: src-tauri/target/release/bundle/nsis/*.exe
# → macOS:   src-tauri/target/release/bundle/dmg/*.dmg
```

---

## 📁 Cấu trúc dự án

```
PosturePal/
├── posturepal/                   # Tauri app
│   ├── src/                      # React frontend
│   │   ├── components/
│   │   │   ├── Calibration.tsx   # Màn hình hiệu chỉnh baseline
│   │   │   ├── Dashboard.tsx     # Dashboard chính + Pomodoro
│   │   │   └── Settings.tsx      # Cài đặt
│   │   ├── hooks/
│   │   │   ├── useVisionEngine.ts # MediaPipe + debounce logic
│   │   │   └── usePomodoro.ts    # Pomodoro timer
│   │   ├── lib/
│   │   │   ├── angleCalculator.ts # Tính góc cổ/vai
│   │   │   ├── db.ts             # SQLite queries
│   │   │   └── notifications.ts  # OS notifications
│   │   ├── store/
│   │   │   └── appStore.ts       # Zustand global state
│   │   └── types/index.ts        # TypeScript types
│   └── src-tauri/                # Rust backend
│       └── src/lib.rs            # System Tray + plugins
└── .github/workflows/build.yml   # CI/CD (Windows + macOS)
```

---

## 🔒 Quyền riêng tư

```
Webcam Frame → MediaPipe → Tọa độ (x,y,z) → [XÓA FRAME] → Tính góc → DB
```

- ❌ Không lưu ảnh hoặc video
- ❌ Không gửi dữ liệu ra internet
- ✅ Chỉ lưu: timestamp, is_good (0/1), góc cổ, góc vai

---

## 📊 Database Schema

```sql
posture_sessions (id, timestamp, is_good, neck_angle, shoulder_tilt)
user_baseline    (id, neck_angle, shoulder_tilt, created_at)
settings         (key, value)
```

---

## 🗺 Roadmap

- **Phase 1 (hiện tại)**: Webcam + MediaPipe + SQLite + Dashboard
- **Phase 2 (2026+)**: IoT sensor (ESP32 IMU via Serial/Bluetooth)

---

## 📄 License

MIT
