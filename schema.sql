CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE rides (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  car_id INTEGER NOT NULL,
  start_odo REAL NOT NULL,
  end_odo REAL,
  created_at TEXT NOT NULL,
  ended_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX rides_car_id_idx ON rides(car_id);
CREATE INDEX rides_user_id_idx ON rides(user_id);

CREATE TABLE extra_costs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  car_id INTEGER NOT NULL,
  ride_id TEXT,
  type TEXT NOT NULL,           -- FUEL | INSURANCE | OTHER
  amount REAL NOT NULL,
  created_at TEXT NOT NULL,
  note TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (ride_id) REFERENCES rides(id)
);

CREATE INDEX extra_costs_car_id_idx ON extra_costs(car_id);
CREATE INDEX extra_costs_user_id_idx ON extra_costs(user_id);

CREATE TABLE wear_payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  car_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  created_at TEXT NOT NULL,
  note TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX wear_payments_user_id_idx ON wear_payments(user_id);

-- global config (single-row for wear rate per km etc)
CREATE TABLE config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

/* Example seed:
INSERT INTO users (id, name) VALUES ('u1', 'Alice'), ('u2','Bob'), ('u3','Charlie');
INSERT INTO config (key, value) VALUES ('wear_rate_per_km', '0.20'); -- EUR/km for VW Up 2013
*/
