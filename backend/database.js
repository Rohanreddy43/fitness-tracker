const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'fitness.db');
const DB_DIR = path.join(__dirname, '..', 'data');

let db = null;

async function getDatabase() {
  if (db) return db;

  const SQL = await initSqlJs();

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Enable WAL mode for better persistence
  db.run('PRAGMA journal_mode=WAL;');
  db.run('PRAGMA foreign_keys=ON;');

  createTables();
  saveDatabase();

  return db;
}

function createTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS weekly_checklist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      week_number INTEGER NOT NULL,
      day TEXT NOT NULL,
      workout_done INTEGER DEFAULT 0,
      diet_followed INTEGER DEFAULT 0,
      protein_hit INTEGER DEFAULT 0,
      steps INTEGER DEFAULT 0,
      water INTEGER DEFAULT 0,
      sleep INTEGER DEFAULT 0,
      notes TEXT DEFAULT '',
      UNIQUE(user_id, week_number, day),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS weight_tracker (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      week_number INTEGER NOT NULL,
      weight REAL DEFAULT 0,
      waist_size REAL DEFAULT 0,
      notes TEXT DEFAULT '',
      UNIQUE(user_id, week_number),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS diet_meals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      meal_name TEXT NOT NULL,
      foods TEXT NOT NULL,
      protein_g INTEGER DEFAULT 0,
      carbs_g INTEGER DEFAULT 0,
      calories INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
}

function saveDatabase() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

function closeDatabase() {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
  }
}

// Save periodically
let saveInterval = null;
function startAutoSave() {
  if (saveInterval) return;
  saveInterval = setInterval(() => {
    if (db) saveDatabase();
  }, 5000);
}

function stopAutoSave() {
  if (saveInterval) {
    clearInterval(saveInterval);
    saveInterval = null;
  }
}

// Load default diet plan meals
function seedDefaultDiet(userId) {
  const meals = [
    { meal_name: 'Breakfast', foods: '4 eggs, oats, banana', protein_g: 42, carbs_g: 65, calories: 650 },
    { meal_name: 'Snack', foods: 'Curd/Greek yogurt, almonds, apple', protein_g: 18, carbs_g: 30, calories: 280 },
    { meal_name: 'Lunch', foods: 'Chicken/paneer, rice, dal, vegetables', protein_g: 55, carbs_g: 70, calories: 700 },
    { meal_name: 'Pre-Workout', foods: 'Banana + coffee', protein_g: 4, carbs_g: 30, calories: 180 },
    { meal_name: 'Post-Workout', foods: 'Whey protein + banana', protein_g: 25, carbs_g: 25, calories: 220 },
    { meal_name: 'Dinner', foods: 'Chicken/paneer, chapati, vegetables', protein_g: 40, carbs_g: 35, calories: 500 }
  ];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO diet_meals (user_id, meal_name, foods, protein_g, carbs_g, calories)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const meal of meals) {
    stmt.run([userId, meal.meal_name, meal.foods, meal.protein_g, meal.carbs_g, meal.calories]);
  }
  stmt.free();
  saveDatabase();
}

module.exports = { getDatabase, saveDatabase, closeDatabase, startAutoSave, stopAutoSave, seedDefaultDiet };