PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE rides (
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
CREATE TABLE costs (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  amount REAL NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  createdAt TEXT NOT NULL
);
CREATE TABLE wear_payments (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  amount REAL NOT NULL,
  createdAt TEXT NOT NULL
);
CREATE TABLE config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT INTO "config" VALUES('wearRatePerKm','0.07');
