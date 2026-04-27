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
