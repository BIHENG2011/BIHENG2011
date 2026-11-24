'use strict';
// Base SQLite (module intégré à Node 22+). Les montants sont des entiers en FCFA.
const { DatabaseSync } = require('node:sqlite');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('usager', 'moto', 'taxi')),
  phone TEXT,
  card_last4 TEXT,
  plate TEXT,
  owner_daily INTEGER,
  savings_daily INTEGER
);

-- Registre en partie double : chaque transaction a des écritures dont la somme vaut 0.
CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY, label TEXT NOT NULL, kind TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  kind TEXT NOT NULL,
  label TEXT NOT NULL,
  detail TEXT,
  method TEXT,
  user_amount INTEGER,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS entries (
  id INTEGER PRIMARY KEY,
  txn_id TEXT NOT NULL REFERENCES transactions(id),
  account_id TEXT NOT NULL REFERENCES accounts(id),
  amount INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS entries_account ON entries(account_id);

CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  route_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  method TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  token TEXT NOT NULL,
  txn_id TEXT NOT NULL REFERENCES transactions(id)
);
CREATE TABLE IF NOT EXISTS ticket_legs (
  ticket_id TEXT NOT NULL REFERENCES tickets(id),
  idx INTEGER NOT NULL,
  mode TEXT NOT NULL,
  label TEXT NOT NULL,
  share INTEGER NOT NULL,
  validated_at INTEGER,
  validated_by TEXT,
  PRIMARY KEY (ticket_id, idx)
);

CREATE TABLE IF NOT EXISTS rides (
  id INTEGER PRIMARY KEY,
  driver_id TEXT NOT NULL REFERENCES users(id),
  amount INTEGER NOT NULL,
  method TEXT NOT NULL,
  label TEXT NOT NULL,
  passenger TEXT,
  ticket_id TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS obligations (
  id INTEGER PRIMARY KEY,
  driver_id TEXT NOT NULL REFERENCES users(id),
  position INTEGER NOT NULL,
  name TEXT NOT NULL,
  who TEXT,
  pct INTEGER NOT NULL,
  status TEXT
);

CREATE TABLE IF NOT EXISTS households (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  user_id TEXT REFERENCES users(id),
  collector TEXT NOT NULL,
  pickup_note TEXT NOT NULL,
  monthly_fee INTEGER NOT NULL,
  pay_method TEXT NOT NULL,
  pay_day INTEGER NOT NULL,
  passages_done INTEGER NOT NULL,
  passages_planned INTEGER NOT NULL,
  next_pickup INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id),
  kind TEXT NOT NULL CHECK (kind IN ('passage_manque', 'depot_sauvage')),
  created_at INTEGER NOT NULL
);
`;

const DATA_TABLES = ['reports', 'households', 'obligations', 'rides', 'ticket_legs', 'tickets',
  'entries', 'transactions', 'accounts', 'users'];

function open(file) {
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON;');
  if (file !== ':memory:') db.exec('PRAGMA journal_mode = WAL;');
  db.exec(SCHEMA);
  return db;
}

function tx(db, fn) {
  db.exec('BEGIN');
  try {
    const out = fn();
    db.exec('COMMIT');
    return out;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

function wipe(db) {
  for (const t of DATA_TABLES) db.exec('DELETE FROM ' + t);
}

module.exports = { open, tx, wipe };
