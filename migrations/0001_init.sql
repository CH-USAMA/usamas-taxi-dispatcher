-- Bookings saved by the dispatcher
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT DEFAULT (datetime('now')),
  customer_name TEXT,
  phone TEXT,
  pickup TEXT,
  dropoff TEXT,
  pickup_time TEXT,
  passengers INTEGER,
  notes TEXT,
  status TEXT DEFAULT 'confirmed'
);

-- Lightweight per-turn / playback logs (no audio stored)
CREATE TABLE IF NOT EXISTS call_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT DEFAULT (datetime('now')),
  session TEXT,
  mode TEXT,
  kind TEXT,
  transcript TEXT,
  reply TEXT,
  speak TEXT,
  tts_path TEXT,
  source TEXT,
  latency_ms INTEGER,
  error TEXT,
  booking_id INTEGER,
  debug TEXT
);
CREATE INDEX IF NOT EXISTS idx_call_logs_session ON call_logs(session);
