// ===== STATE =====
const API = '/api';
let token = localStorage.getItem('fitness_token');
let currentUser = JSON.parse(localStorage.getItem('fitness_user') || 'null');
let currentWeek = 1;
let currentPage = 'dashboard';

// ===== DAYS & WORKOUTS =====
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const WORKOUTS = {
  'Monday': { name: 'Push Day', details: 'Chest, Shoulders, Triceps — Morning: walking/plank, Evening: Bench Press, Incline DB, Shoulder Press, Dips' },
  'Tuesday': { name: 'Pull Day', details: 'Back, Biceps — Morning: brisk walk, Evening: Deadlift, Rows, Lat Pulldown, Barbell Curl' },
  'Wednesday': { name: 'Conditioning', details: 'Core + HIIT Circuit — Morning: incline walk, Evening: 4 rounds of jump rope, pushups, squats, burpees' },
  'Thursday': { name: 'Leg Day', details: 'Quads, Glutes, Hamstrings — Morning: walking, Evening: Squats, Leg Press, RDL, Calf Raises' },
  'Friday': { name: 'Upper Body Power', details: 'Strength Focus — Morning: fast walk, Evening: Bench 5×5, Rows 5×5, OHP, Pullups, Dips' },
  'Saturday': { name: 'Athletic Fat Loss', details: 'HIIT + Functional — Morning: cycling 45m, Evening: 5 rounds Kettlebell, Pushups, Jump Squats' },
  'Sunday': { name: 'Recovery', details: 'Rest, Mobility, Stretching — Light walking, full body stretch, foam rolling' }
};

const TODAY_INDEX = new Date().getDay();
const TODAY_NAME = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][TODAY_INDEX];

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  if (token && currentUser) {
    showApp();
    loadDashboard();
  } else {
    document.getElementById('auth-page').classList.add('active');
  }

  document.getElementById('login-btn').addEventListener('click', login);
  document.getElementById('register-btn').addEventListener('click', register);
  document.getElementById('login-password').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') login();
  });
  document.getElementById('register-password').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') register();
  });
});

// ===== AUTH =====
async function login() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');

  if (!email || !password) {
    errorEl.textContent = 'Please fill in all fields';
    return;
  }

  try {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (!res.ok) {
      errorEl.textContent = data.error;
      return;
    }

    token = data.token;
    currentUser = data.user;
    localStorage.setItem('fitness_token', token);
    localStorage.setItem('fitness_user', JSON.stringify(currentUser));
    showApp();
    loadDashboard();
  } catch (err) {
    errorEl.textContent = 'Connection error. The server might be down. Please try again.';
  }
}

async function register() {
  const name = document.getElementById('register-name').value.trim();
  const email = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value;
  const errorEl = document.getElementById('register-error');

  if (!name || !email || !password) {
    errorEl.textContent = 'Please fill in all fields';
    return;
  }
  if (password.length < 6) {
    errorEl.textContent = 'Password must be at least 6 characters';
    return;
  }

  try {
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();

    if (!res.ok) {
      errorEl.textContent = data.error;
      return;
    }

    token = data.token;
    currentUser = data.user;
    localStorage.setItem('fitness_token', token);
    localStorage.setItem('fitness_user', JSON.stringify(currentUser));
    showApp();
    loadDashboard();
  } catch (err) {
    errorEl.textContent = 'Connection error. The server might be down. Please try again.';
  }
}

function showLogin() {
  document.getElementById('register-form').classList.remove('active');
  document.getElementById('login-form').classList.add('active');
  document.getElementById('login-error').textContent = '';
  document.getElementById('register-error').textContent = '';
}

function showRegister() {
  document.getElementById('login-form').classList.remove('active');
  document.getElementById('register-form').classList.add('active');
  document.getElementById('login-error').textContent = '';
  document.getElementById('register-error').textContent = '';
}

function logout() {
  token = null;
  currentUser = null;
  localStorage.removeItem('fitness_token');
  localStorage.removeItem('fitness_user');
  document.getElementById('auth-page').classList.add('active');
  document.getElementById('app-page').classList.remove('active');
  showToast('Signed out successfully', 'success');
}

function showApp() {
  document.getElementById('auth-page').classList.remove('active');
  document.getElementById('app-page').classList.add('active');
  document.getElementById('sidebar-user-name').textContent = currentUser.name;
  document.getElementById('sidebar-user-email').textContent = currentUser.email;
  document.getElementById('user-avatar').textContent = currentUser.name.charAt(0).toUpperCase();
}

// ===== NAVIGATION =====
function navigateTo(page) {
  currentPage = page;
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.querySelector(`.nav-item[data-page="${page}"]`).classList.add('active');
  document.querySelectorAll('.page-content').forEach(el => el.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');

  switch (page) {
    case 'dashboard': loadDashboard(); break;
    case 'workout': loadWorkout(); break;
    case 'diet': loadDiet(); break;
    case 'weight': loadWeight(); break;
    case 'progress': loadProgress(); break;
  }
  document.getElementById('sidebar').classList.remove('open');
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ===== API HELPER =====
async function apiFetch(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(url, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ===== TOAST =====
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ===== DASHBOARD =====
async function loadDashboard() {
  try {
    const hours = new Date().getHours();
    const greeting = hours < 12 ? 'Good morning' : hours < 17 ? 'Good afternoon' : 'Good evening';
    document.getElementById('dashboard-greeting').textContent = `${greeting}, ${currentUser.name}! Let's crush today.`;

    const data = await apiFetch(`${API}/progress`);
    const overall = data.overall || {};
    document.getElementById('stat-weeks').textContent = overall.weeksTracked || 0;
    document.getElementById('stat-workouts').textContent = overall.totalWorkouts || 0;
    document.getElementById('stat-diet').textContent = overall.totalDiet || 0;
    document.getElementById('stat-protein').textContent = overall.totalProtein || 0;

    const workoutData = await apiFetch(`${API}/checklist/${currentWeek}`);
    const days = workoutData.days;

    let weeklyHtml = '';
    for (const day of DAYS) {
      const d = days[day];
      const isDone = d.workout_done;
      weeklyHtml += `
        <div class="workout-day" style="border-bottom: 1px solid var(--border); padding: 10px 0;">
          <div style="display:flex; align-items:center; justify-content:space-between;">
            <div>
              <strong>${day}</strong>
              <div style="font-size:12px; color:var(--text-muted);">${WORKOUTS[day].name}</div>
            </div>
            <span class="badge ${isDone ? 'badge-success' : 'badge-warning'}">${isDone ? '✓ Done' : 'Pending'}</span>
          </div>
        </div>
      `;
    }
    document.getElementById('dashboard-weekly').innerHTML = weeklyHtml;

    const today = days[TODAY_NAME];
    const badge = document.getElementById('today-badge');
    const dayNum = (currentWeek - 1) * 7 + DAYS.indexOf(TODAY_NAME) + 1;
    badge.textContent = `Day ${dayNum}`;

    const isTodayDone = today && today.workout_done;
    document.getElementById('dashboard-today').innerHTML = `
      <div style="margin-bottom:12px;">
        <h4 style="color:var(--primary);margin-bottom:4px;">${TODAY_NAME}</h4>
        <p style="font-size:14px;font-weight:600;">${WORKOUTS[TODAY_NAME].name}</p>
        <p style="font-size:13px;color:var(--text-muted);">${WORKOUTS[TODAY_NAME].details}</p>
      </div>
      <div style="display:flex;gap:16px;flex-wrap:wrap;">
        <div><span style="font-size:12px;color:var(--text-muted);">Diet</span><br><span style="font-weight:600;color:${today && today.diet_followed ? 'var(--success)' : 'var(--text-muted)'}">${today && today.diet_followed ? '✓ Followed' : '—'}</span></div>
        <div><span style="font-size:12px;color:var(--text-muted);">Protein</span><br><span style="font-weight:600;color:${today && today.protein_hit ? 'var(--success)' : 'var(--text-muted)'}">${today && today.protein_hit ? '✓ Hit' : '—'}</span></div>
        <div><span style="font-size:12px;color:var(--text-muted);">Water</span><br><span style="font-weight:600;color:${today && today.water ? 'var(--success)' : 'var(--text-muted)'}">${today && today.water ? '✓ ' + today.water + 'L' : '—'}</span></div>
        <div><span style="font-size:12px;color:var(--text-muted);">Sleep</span><br><span style="font-weight:600;color:${today && today.sleep ? 'var(--success)' : 'var(--text-muted)'}">${today && today.sleep ? '✓ ' + today.sleep + 'h' : '—'}</span></div>
      </div>
      ${!isTodayDone ? `<button class="btn btn-primary" style="margin-top:16px;width:auto;padding:8px 20px;font-size:13px;" onclick="navigateTo('workout')">Log Today's Workout</button>` : ''}
    `;
  } catch (err) {
    console.error('Dashboard error:', err);
  }
}

// ===== WORKOUT =====
function changeWeek(delta) {
  currentWeek = Math.max(1, Math.min(12, currentWeek + delta));
  loadWorkout();
}

async function loadWorkout() {
  document.getElementById('week-display').textContent = `Week ${currentWeek}`;

  try {
    const data = await apiFetch(`${API}/checklist/${currentWeek}`);
    const days = data.days;

    let html = '';
    for (const day of DAYS) {
      const d = days[day];
      const workout = WORKOUTS[day];

      html += `
        <div class="workout-day" id="workout-${day}">
          <div class="workout-day-header">
            <div>
              <div class="workout-day-name">${day}</div>
              <div class="workout-day-plan">${workout.name}: ${workout.details}</div>
            </div>
          </div>
          <div class="workout-checkboxes">
            <label class="checkbox-item">
              <input type="checkbox" ${d.workout_done ? 'checked' : ''} onchange="updateDay(${currentWeek},'${day}','workout_done',this.checked?1:0)">
              Workout Done
            </label>
            <label class="checkbox-item">
              <input type="checkbox" ${d.diet_followed ? 'checked' : ''} onchange="updateDay(${currentWeek},'${day}','diet_followed',this.checked?1:0)">
              Diet Followed
            </label>
            <label class="checkbox-item">
              <input type="checkbox" ${d.protein_hit ? 'checked' : ''} onchange="updateDay(${currentWeek},'${day}','protein_hit',this.checked?1:0)">
              Protein Hit
            </label>
            <label class="checkbox-item">
              <span style="color:var(--text-muted);font-size:12px;">Water</span>
              <input type="number" min="0" max="10" step="1" value="${d.water || 0}" style="width:50px;padding:4px 8px;background:var(--bg);border:1px solid var(--border);border-radius:4px;color:var(--text);font-size:13px;" onchange="updateDay(${currentWeek},'${day}','water',parseInt(this.value)||0)">
              <span style="color:var(--text-muted);font-size:11px;">L</span>
            </label>
            <label class="checkbox-item">
              <span style="color:var(--text-muted);font-size:12px;">Sleep</span>
              <input type="number" min="0" max="12" step="0.5" value="${d.sleep || 0}" style="width:50px;padding:4px 8px;background:var(--bg);border:1px solid var(--border);border-radius:4px;color:var(--text);font-size:13px;" onchange="updateDay(${currentWeek},'${day}','sleep',parseFloat(this.value)||0)">
              <span style="color:var(--text-muted);font-size:11px;">h</span>
            </label>
          </div>
          <div class="workout-notes-input">
            <input type="text" placeholder="Notes for ${day}..." value="${d.notes || ''}" onchange="updateDay(${currentWeek},'${day}','notes',this.value)">
          </div>
        </div>
      `;
    }
    document.getElementById('workout-content').innerHTML = html;
  } catch (err) {
    document.getElementById('workout-content').innerHTML = '<p class="text-muted">Error loading data. Please try again.</p>';
  }
}

async function updateDay(week, day, field, value) {
  try {
    const currentData = await apiFetch(`${API}/checklist/${week}`);
    const currentDay = currentData.days[day];

    const body = {
      workout_done: field === 'workout_done' ? value : (currentDay.workout_done || 0),
      diet_followed: field === 'diet_followed' ? value : (currentDay.diet_followed || 0),
      protein_hit: field === 'protein_hit' ? value : (currentDay.protein_hit || 0),
      steps: field === 'steps' ? value : (currentDay.steps || 0),
      water: field === 'water' ? value : (currentDay.water || 0),
      sleep: field === 'sleep' ? value : (currentDay.sleep || 0),
      notes: field === 'notes' ? value : (currentDay.notes || '')
    };

    const res = await fetch(`${API}/checklist/${week}/${day}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });

    if (res.ok) {
      showToast(`${day} updated!`, 'success');
    }
  } catch (err) {
    console.error('Update error:', err);
  }
}

// ===== DIET =====
async function loadDiet() {
  try {
    const data = await apiFetch(`${API}/diet`);
    const { meals, totals } = data;

    document.getElementById('macro-protein').textContent = `${totals.protein}g`;
    document.getElementById('macro-carbs').textContent = `${totals.carbs}g`;
    document.getElementById('macro-calories').textContent = `${totals.calories} kcal`;

    if (meals.length === 0) {
      document.getElementById('meal-grid').innerHTML = '<p class="text-muted">No meals configured yet.</p>';
      return;
    }

    let html = '';
    for (const meal of meals) {
      html += `
        <div class="meal-card" id="meal-${meal.id}">
          <div class="meal-card-header">
            <span class="meal-name">${meal.mealName}</span>
            <button class="meal-edit-btn" onclick="editMeal(${meal.id})">✏️</button>
          </div>
          <div class="meal-foods">${meal.foods}</div>
          <div class="meal-macros">
            <span class="meal-macro">Protein: <span>${meal.protein}g</span></span>
            <span class="meal-macro">Carbs: <span>${meal.carbs}g</span></span>
            <span class="meal-macro">Calories: <span>${meal.calories}</span></span>
          </div>
          <div class="meal-edit-form" id="edit-${meal.id}" style="display:none;margin-top:12px;padding-top:12px;border-top:1px solid var(--border);">
            <div class="form-group" style="margin-bottom:8px;">
              <input type="text" id="edit-name-${meal.id}" value="${meal.mealName}" placeholder="Meal name" style="width:100%;padding:8px 12px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;">
            </div>
            <div class="form-group" style="margin-bottom:8px;">
              <input type="text" id="edit-foods-${meal.id}" value="${meal.foods}" placeholder="Foods" style="width:100%;padding:8px 12px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;">
            </div>
            <div style="display:flex;gap:8px;margin-bottom:8px;">
              <input type="number" id="edit-protein-${meal.id}" value="${meal.protein}" placeholder="Protein" style="flex:1;padding:8px 12px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;">
              <input type="number" id="edit-carbs-${meal.id}" value="${meal.carbs}" placeholder="Carbs" style="flex:1;padding:8px 12px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;">
              <input type="number" id="edit-calories-${meal.id}" value="${meal.calories}" placeholder="Calories" style="flex:1;padding:8px 12px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;">
            </div>
            <button class="btn btn-primary" style="width:auto;padding:8px 20px;font-size:13px;" onclick="saveMeal(${meal.id})">Save</button>
          </div>
        </div>
      `;
    }
    document.getElementById('meal-grid').innerHTML = html;
  } catch (err) {
    document.getElementById('meal-grid').innerHTML = '<p class="text-muted">Error loading diet plan.</p>';
  }
}

function editMeal(id) {
  const form = document.getElementById(`edit-${id}`);
  form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

async function saveMeal(id) {
  const meal_name = document.getElementById(`edit-name-${id}`).value;
  const foods = document.getElementById(`edit-foods-${id}`).value;
  const protein_g = parseInt(document.getElementById(`edit-protein-${id}`).value) || 0;
  const carbs_g = parseInt(document.getElementById(`edit-carbs-${id}`).value) || 0;
  const calories = parseInt(document.getElementById(`edit-calories-${id}`).value) || 0;

  try {
    await apiFetch(`${API}/diet/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ meal_name, foods, protein_g, carbs_g, calories })
    });
    showToast('Meal updated!', 'success');
    document.getElementById(`edit-${id}`).style.display = 'none';
    loadDiet();
  } catch (err) {
    showToast('Error updating meal', 'error');
  }
}

// ===== WEIGHT =====
async function loadWeight() {
  try {
    const data = await apiFetch(`${API}/weight`);
    const tbody = document.getElementById('weight-table-body');

    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-muted">No measurements yet. Add your first one above!</td></tr>';
      return;
    }

    let rows = '';
    for (const w of data) {
      rows += `<tr>
        <td><strong>Week ${w.week}</strong></td>
        <td>${w.weight ? w.weight + ' kg' : '—'}</td>
        <td>${w.waistSize ? w.waistSize + ' cm' : '—'}</td>
        <td style="color:var(--text-muted);font-size:13px;">${w.notes || ''}</td>
      </tr>`;
    }
    tbody.innerHTML = rows;
  } catch (err) {
    console.error('Weight error:', err);
  }
}

async function saveWeight() {
  const week_number = parseInt(document.getElementById('weight-week').value) || 1;
  const weight = parseFloat(document.getElementById('weight-kg').value) || 0;
  const waist_size = parseFloat(document.getElementById('waist-cm').value) || 0;
  const notes = document.getElementById('weight-notes').value;

  if (!weight && !waist_size) {
    showToast('Please enter at least weight or waist size', 'error');
    return;
  }

  try {
    await apiFetch(`${API}/weight`, {
      method: 'POST',
      body: JSON.stringify({ week_number, weight, waist_size, notes })
    });
    showToast(`Week ${week_number} saved!`, 'success');
    document.getElementById('weight-kg').value = '';
    document.getElementById('waist-cm').value = '';
    document.getElementById('weight-notes').value = '';
    document.getElementById('weight-week').value = week_number + 1;
    loadWeight();
  } catch (err) {
    showToast('Error saving measurement', 'error');
  }
}

// ===== PROGRESS =====
async function loadProgress() {
  try {
    const data = await apiFetch(`${API}/progress`);
    const { weeklyStats, weightHistory, overall } = data;

    renderChart('workout-chart', weeklyStats, 'workoutsDone', 7, 'var(--primary)');
    renderChart('diet-chart', weeklyStats, 'dietFollowed', 7, 'var(--success)');

    const tbody = document.getElementById('progress-table-body');
    if (weeklyStats.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-muted">No data yet. Start tracking your workouts!</td></tr>';
      return;
    }

    let rows = '';
    for (const w of weeklyStats) {
      const score = Math.round(((w.workoutsDone + w.dietFollowed + w.proteinHit) / (w.totalDays * 3)) * 100);
      rows += `<tr>
        <td><strong>Week ${w.week}</strong></td>
        <td>${w.workoutsDone}/${w.totalDays}</td>
        <td>${w.dietFollowed}/${w.totalDays}</td>
        <td>${w.proteinHit}/${w.totalDays}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="flex:1;height:6px;background:var(--border);border-radius:3px;max-width:80px;">
              <div style="height:100%;width:${score}%;background:${score > 70 ? 'var(--success)' : score > 40 ? 'var(--warning)' : 'var(--danger)'};border-radius:3px;transition:width 0.5s;"></div>
            </div>
            <span style="font-weight:700;font-size:13px;color:${score > 70 ? 'var(--success)' : score > 40 ? 'var(--warning)' : 'var(--danger)'}">${score}%</span>
          </div>
        </td>
      </tr>`;
    }
    tbody.innerHTML = rows;
  } catch (err) {
    console.error('Progress error:', err);
  }
}

function renderChart(elementId, stats, field, maxVal, color) {
  const container = document.getElementById(elementId);

  if (!stats || stats.length === 0) {
    container.innerHTML = '<p class="text-muted">No data yet</p>';
    return;
  }

  const weeks = stats.slice(-12);
  const max = Math.max(...weeks.map(w => w[field]), 1);

  let bars = '';
  for (const w of weeks) {
    const height = (w[field] / max) * 100;
    bars += `<div class="chart-bar" style="height:${Math.max(height, 4)}%;background:${color};">
      <div class="chart-bar-label">W${w.week}</div>
    </div>`;
  }

  container.innerHTML = `
    <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;">Total: ${weeks.reduce((s, w) => s + w[field], 0)}</div>
    <div class="chart-bars">${bars}</div>
  `;
}

// ===== WORKOUT PLAN ACCORDION =====
function toggleWorkoutPlan(day) {
  const details = document.getElementById(`plan-${day}`);
  const toggle = details.previousElementSibling;
  details.classList.toggle('open');
  toggle.classList.toggle('open');
}