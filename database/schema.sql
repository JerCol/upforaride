CREATE TABLE IF NOT EXISTS rides (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  participantIds TEXT NOT NULL, -- JSON array string e.g. ["jeroen","stijn"]
  startKm INTEGER NOT NULL,
  endKm INTEGER,
  startedAt TEXT NOT NULL,
  endedAt TEXT,
  endLat REAL,
  endLng REAL
);

CREATE TABLE IF NOT EXISTS costs (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  amount REAL NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS wear_payments (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  amount REAL NOT NULL,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT OR IGNORE INTO config (key, value) VALUES ('wearRatePerKm', '0.20');
