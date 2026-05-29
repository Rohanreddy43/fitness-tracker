const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const { getDatabase, saveDatabase, closeDatabase, startAutoSave, seedDefaultDiet } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'fitness-tracker-secret-key-2026';

app.use(cors());
app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '..', 'public')));

// Auth middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// ===== AUTH ROUTES =====

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const db = await getDatabase();

    // Check if user exists
    const existing = db.exec(`SELECT id FROM users WHERE email = '${email.replace(/'/g, "''")}'`);
    if (existing.length > 0 && existing[0].values.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const safeName = name.replace(/'/g, "''");
    const safeEmail = email.replace(/'/g, "''");

    db.run(`INSERT INTO users (name, email, password) VALUES ('${safeName}', '${safeEmail}', '${hashedPassword}')`);
    saveDatabase();

    const result = db.exec(`SELECT id FROM users WHERE email = '${safeEmail}'`);
    const userId = result[0].values[0][0];

    // Seed default diet plan
    seedDefaultDiet(userId);

    const token = jwt.sign({ id: userId, email: email, name: name }, JWT_SECRET, { expiresIn: '365d' });

    res.status(201).json({ token, user: { id: userId, name, email } });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const db = await getDatabase();
    const safeEmail = email.replace(/'/g, "''");

    const result = db.exec(`SELECT id, name, email, password FROM users WHERE email = '${safeEmail}'`);

    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const [id, name, userEmail, hashedPassword] = result[0].values[0];

    const validPassword = await bcrypt.compare(password, hashedPassword);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id, email: userEmail, name }, JWT_SECRET, { expiresIn: '365d' });

    res.json({ token, user: { id, name, email: userEmail } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===== WEEKLY CHECKLIST ROUTES =====

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const WORKOUTS = {
  'Monday': 'PUSH DAY — Chest, Shoulders, Triceps\n\n☀️ Morning (Fat Burn):\n• Fast walking — 30 mins\n• Plank — 3×45 sec\n• Mountain climbers — 3×20\n• Stretching — 10 mins\n\n🌙 Evening (Chest + Shoulders + Triceps):\nChest:\n• Bench Press — 4×8\n• Incline DB Press — 4×10\n• DB Flyes — 3×12\n\nShoulders:\n• Shoulder Press — 4×10\n• Lateral Raises — 4×15\n\nTriceps:\n• Overhead Extension — 3×12\n• Bench Dips — 3×12\n\nFinish: 10 mins incline walking',
  'Tuesday': 'PULL DAY — Back, Biceps\n\n☀️ Morning:\n• Brisk walk — 35 mins\n• Hanging knee raises — 3×15\n• Russian twists — 3×20\n\n🌙 Evening (Back + Biceps):\nBack:\n• Deadlift — 4×6\n• Bent-over Rows — 4×10\n• One-arm DB Rows — 3×12\n• Lat Pulldown/Pullups — 4×10\n\nRear Delts:\n• Face Pulls — 3×15\n\nBiceps:\n• Barbell Curl — 3×12\n• Hammer Curl — 3×12\n\nFinish: 10 mins cycling/walking',
  'Wednesday': 'CONDITIONING + CORE\n\n☀️ Morning:\n• Incline walk — 40 mins\n\n🌙 Evening — Circuit (4 rounds):\n• Jump rope — 1 min\n• Pushups — 15\n• Squats — 20\n• Mountain climbers — 20\n• Burpees — 10\n• Plank — 45 sec\n\nRest 1 min between rounds.',
  'Thursday': 'LEG DAY\n\n☀️ Morning:\n• Light walking — 30 mins\n• Hip mobility\n\n🌙 Evening (Leg Day):\nQuads/Glutes:\n• Squats — 4×8\n• Leg Press — 4×12\n• Walking Lunges — 3×12 each leg\n\nHamstrings:\n• Romanian Deadlift — 4×10\n\nCalves:\n• Standing Calf Raises — 4×15\n\nFinish: Slow treadmill walk — 10 mins',
  'Friday': 'UPPER BODY POWER\n\n☀️ Morning:\n• Fast walk — 30 mins\n• Core work\n\n🌙 Evening:\n• Bench Press — 5×5\n• Rows — 5×5\n• Overhead Press — 4×6\n• Pullups — 4 sets\n• Dips — 3 sets\n• Shrugs — 3×15\n\nFinish: 15 mins cardio',
  'Saturday': 'ATHLETIC FAT LOSS DAY\n\n☀️ Morning:\n• Walking or cycling — 45 mins\n\n🌙 Evening (HIIT + Functional) — 5 rounds:\n• Kettlebell swings — 15\n• Pushups — 15\n• Jump squats — 15\n• Battle rope/jumping rope — 1 min\n• Farmer carry — 30 sec\n\nRest 90 sec between rounds.',
  'Sunday': 'RECOVERY DAY\n\n☀️ Morning:\n• Light walking — 30 mins\n\n🌙 Evening:\n• Full body stretching\n• Foam rolling (if available)\n• Mobility work\n\nNo heavy lifting.'
};

// Get checklist for a week
app.get('/api/checklist/:weekNumber', authenticateToken, async (req, res) => {
  try {
    const db = await getDatabase();
    const weekNumber = parseInt(req.params.weekNumber);
    const userId = req.user.id;

    let result = db.exec(`
      SELECT day, workout_done, diet_followed, protein_hit, steps, water, sleep, notes
      FROM weekly_checklist
      WHERE user_id = ${userId} AND week_number = ${weekNumber}
    `);

    // Build response with all days
    const checklist = {};
    for (const day of DAYS) {
      checklist[day] = {
        workout_done: 0,
        diet_followed: 0,
        protein_hit: 0,
        steps: 0,
        water: 0,
        sleep: 0,
        notes: '',
        workout: WORKOUTS[day]
      };
    }

    if (result.length > 0) {
      for (const row of result[0].values) {
        const [day, workout_done, diet_followed, protein_hit, steps, water, sleep, notes] = row;
        checklist[day] = {
          workout_done,
          diet_followed,
          protein_hit,
          steps,
          water,
          sleep,
          notes,
          workout: WORKOUTS[day]
        };
      }
    }

    res.json({ weekNumber, days: checklist });
  } catch (error) {
    console.error('Checklist error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update checklist for a day
app.post('/api/checklist/:weekNumber/:day', authenticateToken, async (req, res) => {
  try {
    const db = await getDatabase();
    const weekNumber = parseInt(req.params.weekNumber);
    const day = req.params.day;
    const userId = req.user.id;
    const { workout_done, diet_followed, protein_hit, steps, water, sleep, notes } = req.body;

    if (!DAYS.includes(day)) {
      return res.status(400).json({ error: 'Invalid day' });
    }

    const safeDay = day.replace(/'/g, "''");
    const safeNotes = (notes || '').replace(/'/g, "''");

    db.run(`
      INSERT INTO weekly_checklist (user_id, week_number, day, workout_done, diet_followed, protein_hit, steps, water, sleep, notes)
      VALUES (${userId}, ${weekNumber}, '${safeDay}', ${workout_done || 0}, ${diet_followed || 0}, ${protein_hit || 0}, ${steps || 0}, ${water || 0}, ${sleep || 0}, '${safeNotes}')
      ON CONFLICT(user_id, week_number, day) DO UPDATE SET
        workout_done = ${workout_done || 0},
        diet_followed = ${diet_followed || 0},
        protein_hit = ${protein_hit || 0},
        steps = ${steps || 0},
        water = ${water || 0},
        sleep = ${sleep || 0},
        notes = '${safeNotes}'
    `);
    saveDatabase();

    res.json({ success: true });
  } catch (error) {
    console.error('Update checklist error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all weeks progress summary
app.get('/api/progress', authenticateToken, async (req, res) => {
  try {
    const db = await getDatabase();
    const userId = req.user.id;

    // Weekly checklist stats
    const checklistResult = db.exec(`
      SELECT week_number,
        SUM(workout_done) as workouts_done,
        SUM(diet_followed) as diet_followed,
        SUM(protein_hit) as protein_hit,
        COUNT(*) as total_days
      FROM weekly_checklist
      WHERE user_id = ${userId}
      GROUP BY week_number
      ORDER BY week_number
    `);

    // Weight tracker stats
    const weightResult = db.exec(`
      SELECT week_number, weight, waist_size, notes
      FROM weight_tracker
      WHERE user_id = ${userId}
      ORDER BY week_number
    `);

    // Overall stats
    const overallResult = db.exec(`
      SELECT
        COUNT(DISTINCT week_number) as weeks_tracked,
        SUM(workout_done) as total_workouts,
        SUM(diet_followed) as total_diet,
        SUM(protein_hit) as total_protein,
        SUM(steps) as total_steps
      FROM weekly_checklist
      WHERE user_id = ${userId}
    `);

    res.json({
      weeklyStats: checklistResult.length > 0 ? checklistResult[0].values.map(row => ({
        week: row[0],
        workoutsDone: row[1],
        dietFollowed: row[2],
        proteinHit: row[3],
        totalDays: row[4]
      })) : [],
      weightHistory: weightResult.length > 0 ? weightResult[0].values.map(row => ({
        week: row[0],
        weight: row[1],
        waistSize: row[2],
        notes: row[3]
      })) : [],
      overall: overallResult.length > 0 ? {
        weeksTracked: overallResult[0].values[0][0],
        totalWorkouts: overallResult[0].values[0][1],
        totalDiet: overallResult[0].values[0][2],
        totalProtein: overallResult[0].values[0][3],
        totalSteps: overallResult[0].values[0][4]
      } : { weeksTracked: 0, totalWorkouts: 0, totalDiet: 0, totalProtein: 0, totalSteps: 0 }
    });
  } catch (error) {
    console.error('Progress error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===== WEIGHT TRACKER ROUTES =====

app.get('/api/weight', authenticateToken, async (req, res) => {
  try {
    const db = await getDatabase();
    const userId = req.user.id;

    const result = db.exec(`
      SELECT week_number, weight, waist_size, notes
      FROM weight_tracker
      WHERE user_id = ${userId}
      ORDER BY week_number
    `);

    const weights = result.length > 0 ? result[0].values.map(row => ({
      week: row[0],
      weight: row[1],
      waistSize: row[2],
      notes: row[3]
    })) : [];

    res.json(weights);
  } catch (error) {
    console.error('Weight error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/weight', authenticateToken, async (req, res) => {
  try {
    const db = await getDatabase();
    const userId = req.user.id;
    const { week_number, weight, waist_size, notes } = req.body;

    const safeNotes = (notes || '').replace(/'/g, "''");

    db.run(`
      INSERT INTO weight_tracker (user_id, week_number, weight, waist_size, notes)
      VALUES (${userId}, ${week_number}, ${weight || 0}, ${waist_size || 0}, '${safeNotes}')
      ON CONFLICT(user_id, week_number) DO UPDATE SET
        weight = ${weight || 0},
        waist_size = ${waist_size || 0},
        notes = '${safeNotes}'
    `);
    saveDatabase();

    res.json({ success: true });
  } catch (error) {
    console.error('Weight update error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===== DIET PLAN ROUTES =====

app.get('/api/diet', authenticateToken, async (req, res) => {
  try {
    const db = await getDatabase();
    const userId = req.user.id;

    const result = db.exec(`
      SELECT id, meal_name, foods, protein_g, carbs_g, calories
      FROM diet_meals
      WHERE user_id = ${userId}
      ORDER BY id
    `);

    const meals = result.length > 0 ? result[0].values.map(row => ({
      id: row[0],
      mealName: row[1],
      foods: row[2],
      protein: row[3],
      carbs: row[4],
      calories: row[5]
    })) : [];

    // Calculate totals
    const totals = meals.reduce((acc, meal) => ({
      protein: acc.protein + meal.protein,
      carbs: acc.carbs + meal.carbs,
      calories: acc.calories + meal.calories
    }), { protein: 0, carbs: 0, calories: 0 });

    res.json({ meals, totals });
  } catch (error) {
    console.error('Diet error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/diet/:id', authenticateToken, async (req, res) => {
  try {
    const db = await getDatabase();
    const userId = req.user.id;
    const mealId = parseInt(req.params.id);
    const { meal_name, foods, protein_g, carbs_g, calories } = req.body;

    const safeMeal = (meal_name || '').replace(/'/g, "''");
    const safeFoods = (foods || '').replace(/'/g, "''");

    db.run(`
      UPDATE diet_meals SET
        meal_name = '${safeMeal}',
        foods = '${safeFoods}',
        protein_g = ${protein_g || 0},
        carbs_g = ${carbs_g || 0},
        calories = ${calories || 0}
      WHERE id = ${mealId} AND user_id = ${userId}
    `);
    saveDatabase();

    res.json({ success: true });
  } catch (error) {
    console.error('Diet update error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===== USER INFO =====

app.get('/api/user', authenticateToken, async (req, res) => {
  res.json({ user: req.user });
});

// Serve the main HTML file for all routes (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Start server
async function startServer() {
  const db = await getDatabase();
  startAutoSave();

  app.listen(PORT, () => {
    console.log(`Fitness Tracker running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', () => {
  closeDatabase();
  process.exit(0);
});