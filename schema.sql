-- Schema for Solid Roots Inquiries
CREATE TABLE IF NOT EXISTS inquiries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL, -- 'buy' or 'sell'
    user_id TEXT,
    email TEXT,
    phone TEXT,
    answers TEXT NOT NULL, -- JSON string of all responses
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Fixed-window rate-limit counters, one row per "<ip>:<path>".
-- Rows are swept opportunistically once their window has expired.
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);

CREATE TABLE IF NOT EXISTS audits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  action TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  success INTEGER DEFAULT 1,
  details TEXT
);
