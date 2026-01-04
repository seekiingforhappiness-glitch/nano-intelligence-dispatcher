import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { getDataDir } from './dataDir';

let db: Database.Database | null = null;

function initDb(): Database.Database {
  if (db) return db;
  const dir = getDataDir();
  fs.mkdirSync(dir, { recursive: true });
  const dbPath = path.join(dir, 'nano.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS warehouses (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      lat REAL,
      lng REAL,
      time_window_start TEXT,
      time_window_end TEXT,
      capacity INTEGER,
      notes TEXT,
      active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      task_id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      progress TEXT,
      result TEXT,
      error TEXT,
      meta TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  return db;
}

export function getDb(): Database.Database {
  return initDb();
}


