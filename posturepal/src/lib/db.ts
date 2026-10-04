import Database from "@tauri-apps/plugin-sql";
import { AppSettings, DailyStats, PostureSession, UserBaseline, DEFAULT_SETTINGS } from "../types";

let db: Database | null = null;

/** Initialize SQLite database with schema */
export async function initDb(): Promise<void> {
  db = await Database.load("sqlite:posturepal.db");

  await db.execute(`
    CREATE TABLE IF NOT EXISTS posture_sessions (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp     INTEGER NOT NULL,
      is_good       INTEGER NOT NULL,
      neck_angle    REAL NOT NULL,
      shoulder_tilt REAL NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS user_baseline (
      id            INTEGER PRIMARY KEY,
      neck_angle    REAL NOT NULL,
      shoulder_tilt REAL NOT NULL,
      created_at    INTEGER NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // Index for faster date-range queries on dashboard
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_timestamp ON posture_sessions(timestamp)
  `);
}

/** Log a posture data point (called ~every second by Vision Engine) */
export async function logPosture(session: Omit<PostureSession, "id">): Promise<void> {
  if (!db) return;
  await db.execute(
    `INSERT INTO posture_sessions (timestamp, is_good, neck_angle, shoulder_tilt)
     VALUES ($1, $2, $3, $4)`,
    [session.timestamp, session.isGood ? 1 : 0, session.neckAngle, session.shoulderTilt]
  );
}

/** Get daily stats for the past N days */
export async function getDailyStats(days = 7): Promise<DailyStats[]> {
  if (!db) return [];
  const since = Date.now() - days * 24 * 60 * 60 * 1000;

  const rows = await db.select<{ date: string; is_good: number; count: number }[]>(
    `SELECT
       strftime('%Y-%m-%d', timestamp / 1000, 'unixepoch', 'localtime') AS date,
       is_good,
       COUNT(*) AS count
     FROM posture_sessions
     WHERE timestamp >= $1
     GROUP BY date, is_good
     ORDER BY date ASC`,
    [since]
  );

  // Aggregate into DailyStats[]
  const map = new Map<string, DailyStats>();
  for (const row of rows) {
    if (!map.has(row.date)) {
      map.set(row.date, { date: row.date, goodSeconds: 0, badSeconds: 0 });
    }
    const s = map.get(row.date)!;
    if (row.is_good) s.goodSeconds += row.count;
    else s.badSeconds += row.count;
  }
  return Array.from(map.values());
}

/** Save user baseline */
export async function saveBaseline(baseline: Omit<UserBaseline, "createdAt">): Promise<void> {
  if (!db) return;
  await db.execute(
    `INSERT OR REPLACE INTO user_baseline (id, neck_angle, shoulder_tilt, created_at)
     VALUES (1, $1, $2, $3)`,
    [baseline.neckAngle, baseline.shoulderTilt, Date.now()]
  );
}

/** Load user baseline — returns null if not set */
export async function loadBaseline(): Promise<UserBaseline | null> {
  if (!db) return null;
  const rows = await db.select<UserBaseline[]>(
    `SELECT neck_angle AS neckAngle, shoulder_tilt AS shoulderTilt, created_at AS createdAt
     FROM user_baseline WHERE id = 1`
  );
  return rows[0] ?? null;
}

/** Load app settings — merges with defaults for missing keys */
export async function loadSettings(): Promise<AppSettings> {
  if (!db) return DEFAULT_SETTINGS;
  const rows = await db.select<{ key: string; value: string }[]>(
    `SELECT key, value FROM settings`
  );
  const merged = { ...DEFAULT_SETTINGS };
  for (const { key, value } of rows) {
    try {
      (merged as Record<string, unknown>)[key] = JSON.parse(value);
    } catch {
      /* ignore malformed values */
    }
  }
  return merged;
}

/** Save a single settings key */
export async function saveSetting(key: keyof AppSettings, value: unknown): Promise<void> {
  if (!db) return;
  await db.execute(
    `INSERT OR REPLACE INTO settings (key, value) VALUES ($1, $2)`,
    [key, JSON.stringify(value)]
  );
}

/** Save all settings at once */
export async function saveAllSettings(settings: AppSettings): Promise<void> {
  for (const [key, value] of Object.entries(settings)) {
    await saveSetting(key as keyof AppSettings, value);
  }
}

/** Delete posture sessions older than N days (cleanup) */
export async function pruneOldSessions(olderThanDays = 30): Promise<void> {
  if (!db) return;
  const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
  await db.execute(`DELETE FROM posture_sessions WHERE timestamp < $1`, [cutoff]);
}
