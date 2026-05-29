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
  if (token && currentUser) { showApp(); loadDashboard(); }
  else { document.getElementById('auth-page').classList.add('active'); }
  document.getElementById('login-btn').addEventListener('click', login);
  document.getElementById('register-btn').addEventListener('click', register);
  document.getElementById('login-password').addEventListener('keypress', e => { if (e.key === 'Enter') login(); });
  document.getElementById('register-password').addEventListener('keypress', e => { if (e.key === 'Enter') register(); });
});

// ===== AUTH =====
async function login() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const err = document.getElementById('login-error');
  if (!email || !password) { err.textContent = 'Please fill in all fields'; return; }
  try {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) { err.textContent = data.error; return; }
    token = data.token; currentUser = data.user;
    localStorage.setItem('fitness_token', token);
    localStorage.setItem('fitness_user', JSON.stringify(currentUser));
    showApp(); loadDashboard();
  } catch (e) { err.textContent = 'Server connection error. Please try again.'; }
}

async function register() {
  const name = document.getElementById('register-name').value.trim();
  const email = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value;
  const err = document.getElementById('register-error');
  if (!name || !email || !password) { err.textContent = 'Please fill in all fields'; return; }
  if (password.length < 6) { err.textContent = 'Password must be at least 6 characters'; return; }
  try {
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    if (!res.ok) { err.textContent = data.error; return; }
    token = data.token; currentUser = data.user;
    localStorage.setItem('fitness_token', token);
    localStorage.setItem('fitness_user', JSON.stringify(currentUser));
    showApp(); loadDashboard();
  } catch (e) { err.textContent = 'Server connection error. Please try again.'; }
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
  token = null; currentUser = null;
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
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }
async function apiFetch(url, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...opts.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { ...opts, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = `toast ${type} show`;
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ===== DASHBOARD =====
async function loadDashboard() {
  try {
    const h = new Date().getHours();
    const g = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    document.getElementById('dashboard-greeting').textContent = `${g}, ${currentUser.name}! Let's crush today.`;
    const data = await apiFetch(`${API}/progress`);
    const o = data.overall || {};
    document.getElementById('stat-weeks').textContent = o.weeksTracked || 0;
    document.getElementById('stat-workouts').textContent = o.totalWorkouts || 0;
    document.getElementById('stat-diet').textContent = o.totalDiet || 0;
    document.getElementById('stat-protein').textContent = o.totalProtein || 0;
    const wd = await apiFetch(`${API}/checklist/${currentWeek}`);
    const days = wd.days;
    let wh = '';
    for (const d of DAYS) {
      const dd = days[d];
      wh += `<div class="workout-day" style="border-bottom:1px solid var(--border);padding:10px 0;"><div style="display:flex;align-items:center;justify-content:space-between;"><div><strong>${d}</strong><div style="font-size:12px;color:var(--text-muted);">${WORKOUTS[d].name}</div></div><span class="badge ${dd.workout_done ? 'badge-success' : 'badge-warning'}">${dd.workout_done ? '✓ Done' : 'Pending'}</span></div></div>`;
    }
    document.getElementById('dashboard-weekly').innerHTML = wh;
    const today = days[TODAY_NAME];
    const dn = (currentWeek - 1) * 7 + DAYS.indexOf(TODAY_NAME) + 1;
    document.getElementById('today-badge').textContent = `Day ${dn}`;
    document.getElementById('dashboard-today').innerHTML = `
      <div style="margin-bottom:12px;"><h4 style="color:var(--primary);margin-bottom:4px;">${TODAY_NAME}</h4>
      <p style="font-size:14px;font-weight:600;">${WORKOUTS[TODAY_NAME].name}</p>
      <p style="font-size:13px;color:var(--text-muted);">${WORKOUTS[TODAY_NAME].details}</p></div>
      <div style="display:flex;gap:16px;flex-wrap:wrap;">
        <div><span style="font-size:12px;color:var(--text-muted);">Diet</span><br><span style="font-weight:600;color:${today && today.diet_followed ? 'var(--success)' : 'var(--text-muted)'}">${today && today.diet_followed ? '✓ Followed' : '—'}</span></div>
        <div><span style="font-size:12px;color:var(--text-muted);">Protein</span><br><span style="font-weight:600;color:${today && today.protein_hit ? 'var(--success)' : 'var(--text-muted)'}">${today && today.protein_hit ? '✓ Hit' : '—'}</span></div>
        <div><span style="font-size:12px;color:var(--text-muted);">Water</span><br><span style="font-weight:600;color:${today && today.water ? 'var(--success)' : 'var(--text-muted)'}">${today && today.water ? '✓ ' + today.water + 'L' : '—'}</span></div>
        <div><span style="font-size:12px;color:var(--text-muted);">Sleep</span><br><span style="font-weight:600;color:${today && today.sleep ? 'var(--success)' : 'var(--text-muted)'}">${today && today.sleep ? '✓ ' + today.sleep + 'h' : '—'}</span></div>
      </div>
      ${!today || !today.workout_done ? `<button class="btn btn-primary" style="margin-top:16px;width:auto;padding:8px 20px;font-size:13px;" onclick="navigateTo('workout')">Log Today's Workout</button>` : ''}`;
  } catch (e) { console.error('Dashboard error:', e); }
}

// ===== WORKOUT =====
function changeWeek(d) { currentWeek = Math.max(1, Math.min(12, currentWeek + d)); loadWorkout(); }
async function loadWorkout() {
  document.getElementById('week-display').textContent = `Week ${currentWeek}`;
  try {
    const data = await apiFetch(`${API}/checklist/${currentWeek}`);
    const days = data.days;
    let html = '';
    for (const day of DAYS) {
      const d = days[day];
      html += `<div class="workout-day" id="workout-${day}"><div class="workout-day-header"><div><div class="workout-day-name">${day}</div><div class="workout-day-plan">${WORKOUTS[day].name}: ${WORKOUTS[day].details}</div></div></div>
        <div class="workout-checkboxes">
          <label class="checkbox-item"><input type="checkbox" ${d.workout_done ? 'checked' : ''} onchange="updateDay(${currentWeek},'${day}','workout_done',+this.checked)"> Workout Done</label>
          <label class="checkbox-item"><input type="checkbox" ${d.diet_followed ? 'checked' : ''} onchange="updateDay(${currentWeek},'${day}','diet_followed',+this.checked)"> Diet Followed</label>
          <label class="checkbox-item"><input type="checkbox" ${d.protein_hit ? 'checked' : ''} onchange="updateDay(${currentWeek},'${day}','protein_hit',+this.checked)"> Protein Hit</label>
          <label class="checkbox-item"><span style="color:var(--text-muted);font-size:12px;">Water</span>
            <input type="number" min="0" max="10" value="${d.water||0}" style="width:50px;padding:4px 8px;background:var(--bg);border:1px solid var(--border);border-radius:4px;color:var(--text);font-size:13px;" onchange="updateDay(${currentWeek},'${day}','water',parseInt(this.value)||0)">
            <span style="color:var(--text-muted);font-size:11px;">L</span></label>
          <label class="checkbox-item"><span style="color:var(--text-muted);font-size:12px;">Sleep</span>
            <input type="number" min="0" max="12" step="0.5" value="${d.sleep||0}" style="width:50px;padding:4px 8px;background:var(--bg);border:1px solid var(--border);border-radius:4px;color:var(--text);font-size:13px;" onchange="updateDay(${currentWeek},'${day}','sleep',parseFloat(this.value)||0)">
            <span style="color:var(--text-muted);font-size:11px;">h</span></label>
        </div>
        <div class="workout-notes-input"><input type="text" placeholder="Notes for ${day}..." value="${d.notes||''}" onchange="updateDay(${currentWeek},'${day}','notes',this.value)"></div>
      </div>`;
    }
    document.getElementById('workout-content').innerHTML = html;
  } catch (e) { document.getElementById('workout-content').innerHTML = '<p class="text-muted">Error loading data.</p>'; }
}
async function updateDay(week, day, field, value) {
  try {
    const cur = await apiFetch(`${API}/checklist/${week}`);
    const cd = cur.days[day];
    const body = {
      workout_done: field === 'workout_done' ? value : (cd.workout_done || 0),
      diet_followed: field === 'diet_followed' ? value : (cd.diet_followed || 0),
      protein_hit: field === 'protein_hit' ? value : (cd.protein_hit || 0),
      steps: field === 'steps' ? value : (cd.steps || 0),
      water: field === 'water' ? value : (cd.water || 0),
      sleep: field === 'sleep' ? value : (cd.sleep || 0),
      notes: field === 'notes' ? value : (cd.notes || '')
    };
    await fetch(`${API}/checklist/${week}/${day}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(body)
    });
    showToast(`${day} updated!`, 'success');
  } catch (e) { console.error(e); }
}

// ===== DIET =====
async function loadDiet() {
  try {
    const data = await apiFetch(`${API}/diet`);
    const { meals, totals } = data;
    document.getElementById('macro-protein').textContent = `${totals.protein}g`;
    document.getElementById('macro-carbs').textContent = `${totals.carbs}g`;
    document.getElementById('macro-calories').textContent = `${totals.calories} kcal`;
    if (!meals.length) { document.getElementById('meal-grid').innerHTML = '<p class="text-muted">No meals configured yet.</p>'; return; }
    let html = '';
    for (const m of meals) {
      html += `<div class="meal-card" id="meal-${m.id}"><div class="meal-card-header"><span class="meal-name">${m.mealName}</span><button class="meal-edit-btn" onclick="editMeal(${m.id})">✏️</button></div>
        <div class="meal-foods">${m.foods}</div>
        <div class="meal-macros"><span class="meal-macro">Protein: <span>${m.protein}g</span></span><span class="meal-macro">Carbs: <span>${m.carbs}g</span></span><span class="meal-macro">Calories: <span>${m.calories}</span></span></div>
        <div class="meal-edit-form" id="edit-${m.id}" style="display:none;margin-top:12px;padding-top:12px;border-top:1px solid var(--border);">
          <div class="form-group" style="margin-bottom:8px;"><input type="text" id="edit-name-${m.id}" value="${m.mealName}" style="width:100%;padding:8px 12px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;"></div>
          <div class="form-group" style="margin-bottom:8px;"><input type="text" id="edit-foods-${m.id}" value="${m.foods}" style="width:100%;padding:8px 12px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;"></div>
          <div style="display:flex;gap:8px;margin-bottom:8px;">
            <input type="number" id="edit-protein-${m.id}" value="${m.protein}" style="flex:1;padding:8px 12px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;">
            <input type="number" id="edit-carbs-${m.id}" value="${m.carbs}" style="flex:1;padding:8px 12px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;">
            <input type="number" id="edit-calories-${m.id}" value="${m.calories}" style="flex:1;padding:8px 12px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;">
          </div>
          <button class="btn btn-primary" style="width:auto;padding:8px 20px;font-size:13px;" onclick="saveMeal(${m.id})">Save</button>
        </div>
      </div>`;
    }
    document.getElementById('meal-grid').innerHTML = html;
  } catch (e) { document.getElementById('meal-grid').innerHTML = '<p class="text-muted">Error loading diet plan.</p>'; }
}
function editMeal(id) {
  const f = document.getElementById(`edit-${id}`);
  f.style.display = f.style.display === 'none' ? 'block' : 'none';
}
async function saveMeal(id) {
  const meal_name = document.getElementById(`edit-name-${id}`).value;
  const foods = document.getElementById(`edit-foods-${id}`).value;
  const protein_g = parseInt(document.getElementById(`edit-protein-${id}`).value) || 0;
  const carbs_g = parseInt(document.getElementById(`edit-carbs-${id}`).value) || 0;
  const calories = parseInt(document.getElementById(`edit-calories-${id}`).value) || 0;
  try {
    await apiFetch(`${API}/diet/${id}`, { method: 'PUT', body: JSON.stringify({ meal_name, foods, protein_g, carbs_g, calories }) });
    showToast('Meal updated!', 'success');
    document.getElementById(`edit-${id}`).style.display = 'none';
    loadDiet();
  } catch (e) { showToast('Error updating meal', 'error'); }
}

// ===== WEIGHT =====
async function loadWeight() {
  try {
    const data = await apiFetch(`${API}/weight`);
    const tb = document.getElementById('weight-table-body');
    if (!data.length) { tb.innerHTML = '<tr><td colspan="4" class="text-muted">No measurements yet.</td></tr>'; return; }
    tb.innerHTML = data.map(w => `<tr><td><strong>Week ${w.week}</strong></td><td>${w.weight ? w.weight + ' kg' : '—'}</td><td>${w.waistSize ? w.waistSize + ' cm' : '—'}</td><td style="color:var(--text-muted);font-size:13px;">${w.notes || ''}</td></tr>`).join('');
  } catch (e) { console.error(e); }
}
async function saveWeight() {
  const week_number = parseInt(document.getElementById('weight-week').value) || 1;
  const weight = parseFloat(document.getElementById('weight-kg').value) || 0;
  const waist_size = parseFloat(document.getElementById('waist-cm').value) || 0;
  const notes = document.getElementById('weight-notes').value;
  if (!weight && !waist_size) { showToast('Enter weight or waist size', 'error'); return; }
  try {
    await apiFetch(`${API}/weight`, { method: 'POST', body: JSON.stringify({ week_number, weight, waist_size, notes }) });
    showToast(`Week ${week_number} saved!`, 'success');
    document.getElementById('weight-kg').value = '';
    document.getElementById('waist-cm').value = '';
    document.getElementById('weight-notes').value = '';
    document.getElementById('weight-week').value = week_number + 1;
    loadWeight();
  } catch (e) { showToast('Error saving', 'error'); }
}

// ===== PROGRESS =====
async function loadProgress() {
  try {
    const data = await apiFetch(`${API}/progress`);
    const { weeklyStats } = data;
    renderChart('workout-chart', weeklyStats, 'workoutsDone', 7, 'var(--primary)');
    renderChart('diet-chart', weeklyStats, 'dietFollowed', 7, 'var(--success)');
    const tb = document.getElementById('progress-table-body');
    if (!weeklyStats.length) { tb.innerHTML = '<tr><td colspan="5" class="text-muted">No data yet.</td></tr>'; return; }
    tb.innerHTML = weeklyStats.map(w => {
      const s = Math.round(((w.workoutsDone + w.dietFollowed + w.proteinHit) / (w.totalDays * 3)) * 100);
      return `<tr><td><strong>Week ${w.week}</strong></td><td>${w.workoutsDone}/${w.totalDays}</td><td>${w.dietFollowed}/${w.totalDays}</td><td>${w.proteinHit}/${w.totalDays}</td>
        <td><div style="display:flex;align-items:center;gap:8px;"><div style="flex:1;height:6px;background:var(--border);border-radius:3px;max-width:80px;"><div style="height:100%;width:${s}%;background:${s > 70 ? 'var(--success)' : s > 40 ? 'var(--warning)' : 'var(--danger)'};border-radius:3px;"></div></div><span style="font-weight:700;font-size:13px;color:${s > 70 ? 'var(--success)' : s > 40 ? 'var(--warning)' : 'var(--danger)'}">${s}%</span></div></td></tr>`;
    }).join('');
  } catch (e) { console.error(e); }
}
function renderChart(eid, stats, field, maxVal, color) {
  const c = document.getElementById(eid);
  if (!stats || !stats.length) { c.innerHTML = '<p class="text-muted">No data yet</p>'; return; }
  const weeks = stats.slice(-12);
  const max = Math.max(...weeks.map(w => w[field]), 1);
  c.innerHTML = `<div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;">Total: ${weeks.reduce((s, w) => s + w[field], 0)}</div>
    <div class="chart-bars">${weeks.map(w => `<div class="chart-bar" style="height:${Math.max((w[field] / max) * 100, 4)}%;background:${color};"><div class="chart-bar-label">W${w.week}</div></div>`).join('')}</div>`;
}

// ===== WORKOUT PLAN ACCORDION =====
function toggleWorkoutPlan(day) {
  const d = document.getElementById(`plan-${day}`);
  const t = d.previousElementSibling;
  d.classList.toggle('open');
  t.classList.toggle('open');
}