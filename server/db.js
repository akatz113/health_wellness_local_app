const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const DB_PATH = path.join(dataDir, 'health.db');
let _db = null;

function saveDB() {
  fs.writeFileSync(DB_PATH, Buffer.from(_db.export()));
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS test_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_name TEXT NOT NULL,
    value TEXT NOT NULL,
    unit TEXT,
    reference_range TEXT,
    status TEXT DEFAULT 'unknown',
    test_date TEXT NOT NULL,
    lab_name TEXT,
    category TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    doctor_name TEXT,
    specialty TEXT,
    appointment_date TEXT NOT NULL,
    location TEXT,
    notes TEXT,
    status TEXT DEFAULT 'upcoming',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    source TEXT DEFAULT 'personal',
    tags TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS nutrition_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    food_name TEXT NOT NULL,
    fdc_id TEXT,
    serving_size REAL DEFAULT 1,
    serving_unit TEXT DEFAULT 'serving',
    serving_description TEXT,
    calories REAL DEFAULT 0,
    protein REAL DEFAULT 0,
    carbs REAL DEFAULT 0,
    fat REAL DEFAULT 0,
    fiber REAL DEFAULT 0,
    sugar REAL DEFAULT 0,
    sodium REAL DEFAULT 0,
    calcium REAL DEFAULT 0,
    iron REAL DEFAULT 0,
    vitamin_c REAL DEFAULT 0,
    vitamin_d REAL DEFAULT 0,
    potassium REAL DEFAULT 0,
    cholesterol REAL DEFAULT 0,
    saturated_fat REAL DEFAULT 0,
    all_nutrients TEXT DEFAULT '[]',
    meal_type TEXT DEFAULT 'snack',
    log_date TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    metric_key TEXT,
    target_value REAL,
    target_unit TEXT,
    period TEXT DEFAULT 'yearly',
    notes TEXT,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS exercise_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    activity_type TEXT NOT NULL,
    duration_minutes INTEGER,
    intensity TEXT DEFAULT 'moderate',
    distance REAL,
    distance_unit TEXT DEFAULT 'miles',
    calories_burned INTEGER,
    notes TEXT,
    log_date TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS challenges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    start_date TEXT,
    end_date TEXT,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS challenge_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    challenge_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    item_type TEXT DEFAULT 'checklist',
    target_value REAL,
    target_unit TEXT,
    period TEXT DEFAULT 'daily',
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS challenge_check_ins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    challenge_item_id INTEGER NOT NULL,
    check_date TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    value REAL,
    FOREIGN KEY (challenge_item_id) REFERENCES challenge_items(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS saved_meals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    tags TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS saved_meal_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meal_id INTEGER NOT NULL,
    food_name TEXT NOT NULL,
    fdc_id TEXT,
    serving_size REAL DEFAULT 1,
    serving_unit TEXT DEFAULT 'serving',
    serving_description TEXT,
    calories REAL DEFAULT 0,
    protein REAL DEFAULT 0,
    carbs REAL DEFAULT 0,
    fat REAL DEFAULT 0,
    fiber REAL DEFAULT 0,
    sugar REAL DEFAULT 0,
    sodium REAL DEFAULT 0,
    calcium REAL DEFAULT 0,
    iron REAL DEFAULT 0,
    vitamin_c REAL DEFAULT 0,
    vitamin_d REAL DEFAULT 0,
    potassium REAL DEFAULT 0,
    cholesterol REAL DEFAULT 0,
    saturated_fat REAL DEFAULT 0,
    all_nutrients TEXT DEFAULT '[]',
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (meal_id) REFERENCES saved_meals(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS workout_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS workout_plan_blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id INTEGER NOT NULL,
    day_of_week INTEGER NOT NULL,
    activity_type TEXT NOT NULL,
    category TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    notes TEXT,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (plan_id) REFERENCES workout_plans(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS user_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

`;

// Wraps sql.js with a better-sqlite3-compatible synchronous API
const db = {
  async init() {
    const SQL = await initSqlJs();
    _db = fs.existsSync(DB_PATH)
      ? new SQL.Database(fs.readFileSync(DB_PATH))
      : new SQL.Database();
    _db.exec(SCHEMA);
    // Migrations
    try { _db.exec('ALTER TABLE notes ADD COLUMN book_title TEXT'); } catch {}
    saveDB();
  },
  prepare(sql) {
    return {
      all(...params) {
        const stmt = _db.prepare(sql);
        stmt.bind(params);
        const rows = [];
        while (stmt.step()) rows.push(stmt.getAsObject());
        stmt.free();
        return rows;
      },
      get(...params) {
        const stmt = _db.prepare(sql);
        stmt.bind(params);
        let row = undefined;
        if (stmt.step()) row = stmt.getAsObject();
        stmt.free();
        return row;
      },
      run(...params) {
        const stmt = _db.prepare(sql);
        stmt.run(params);
        stmt.free();
        const lastInsertRowid = _db.exec('SELECT last_insert_rowid()')[0]?.values[0][0] ?? 0;
        const changes = _db.exec('SELECT changes()')[0]?.values[0][0] ?? 0;
        saveDB();
        return { lastInsertRowid, changes };
      },
    };
  },
};

module.exports = db;
