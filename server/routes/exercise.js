const express = require('express');
const router = express.Router();
const https = require('https');
const db = require('../db');

// ── Helpers ───────────────────────────────────────────────────────────────────

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Failed to parse API response')); }
      });
    }).on('error', reject);
  });
}

// WMO weather code → human description + emoji + outdoor suitability
const WMO = {
  0:  { label: 'Clear sky',                 icon: '☀️',  outdoor: true  },
  1:  { label: 'Mainly clear',              icon: '🌤️', outdoor: true  },
  2:  { label: 'Partly cloudy',             icon: '⛅',  outdoor: true  },
  3:  { label: 'Overcast',                  icon: '☁️',  outdoor: true  },
  45: { label: 'Foggy',                     icon: '🌫️', outdoor: false },
  48: { label: 'Icy fog',                   icon: '🌫️', outdoor: false },
  51: { label: 'Light drizzle',             icon: '🌦️', outdoor: false },
  53: { label: 'Moderate drizzle',          icon: '🌦️', outdoor: false },
  55: { label: 'Dense drizzle',             icon: '🌧️', outdoor: false },
  61: { label: 'Slight rain',               icon: '🌧️', outdoor: false },
  63: { label: 'Moderate rain',             icon: '🌧️', outdoor: false },
  65: { label: 'Heavy rain',               icon: '🌧️', outdoor: false },
  71: { label: 'Slight snow',               icon: '🌨️', outdoor: false },
  73: { label: 'Moderate snow',             icon: '❄️',  outdoor: false },
  75: { label: 'Heavy snow',                icon: '❄️',  outdoor: false },
  77: { label: 'Snow grains',               icon: '🌨️', outdoor: false },
  80: { label: 'Slight rain showers',       icon: '🌦️', outdoor: false },
  81: { label: 'Moderate rain showers',     icon: '🌧️', outdoor: false },
  82: { label: 'Violent rain showers',      icon: '⛈️', outdoor: false },
  85: { label: 'Slight snow showers',       icon: '🌨️', outdoor: false },
  86: { label: 'Heavy snow showers',        icon: '🌨️', outdoor: false },
  95: { label: 'Thunderstorm',              icon: '⛈️', outdoor: false },
  96: { label: 'Thunderstorm w/ hail',      icon: '⛈️', outdoor: false },
  99: { label: 'Thunderstorm w/ heavy hail',icon: '⛈️', outdoor: false },
};

function getWmo(code) {
  return WMO[code] || { label: 'Unknown', icon: '🌡️', outdoor: true };
}

function buildSuggestions(weatherCode, tempF, windMph, precipitation) {
  const wmo = getWmo(weatherCode);
  const hasPrecip = !wmo.outdoor || precipitation > 0.01;
  const isCold    = tempF < 35;
  const isHot     = tempF > 90;
  const isWindy   = windMph > 20;
  const isStormy  = weatherCode >= 80;

  const outdoorOk = !hasPrecip && !isCold && !isHot && !isStormy;

  const outdoor = [
    { name: 'Running',           icon: '🏃', tags: ['cardio'] },
    { name: 'Cycling',           icon: '🚴', tags: ['cardio'] },
    { name: 'Hiking',            icon: '🥾', tags: ['cardio', 'strength'] },
    { name: 'Walking',           icon: '🚶', tags: ['cardio'] },
    { name: 'Outdoor Yoga',      icon: '🧘', tags: ['flexibility'] },
    { name: 'Swimming (outdoor)',icon: '🏊', tags: ['cardio', 'full-body'] },
  ];

  const indoor = [
    { name: 'Gym / Weight Training', icon: '🏋️', tags: ['strength'] },
    { name: 'Home HIIT',             icon: '💪', tags: ['cardio', 'strength'] },
    { name: 'Yoga / Pilates',        icon: '🧘', tags: ['flexibility'] },
    { name: 'Treadmill / Elliptical',icon: '🏃', tags: ['cardio'] },
    { name: 'Swimming (indoor)',     icon: '🏊', tags: ['cardio', 'full-body'] },
    { name: 'Indoor Cycling',        icon: '🚴', tags: ['cardio'] },
  ];

  let reason = '';
  if (isStormy)    reason = 'Stormy conditions — stay safe indoors';
  else if (hasPrecip) reason = 'Precipitation expected — consider indoor options';
  else if (isCold) reason = `Cold at ${Math.round(tempF)}°F — bundle up or go indoors`;
  else if (isHot)  reason = `Hot at ${Math.round(tempF)}°F — stay hydrated or go indoors`;
  else if (isWindy) reason = `Windy at ${Math.round(windMph)} mph — sheltered routes recommended`;
  else             reason = `Great conditions at ${Math.round(tempF)}°F — perfect for outdoors`;

  const suggestions = outdoorOk
    ? [...outdoor, ...indoor]
    : isWindy ? [outdoor[0], outdoor[3], ...indoor]
    : indoor;

  return { outdoorOk, isWindy, reason, suggestions };
}

// ── Settings ──────────────────────────────────────────────────────────────────

router.get('/location', (req, res) => {
  const row = db.prepare('SELECT value FROM user_settings WHERE key = ?').get('exercise_location');
  if (!row) return res.json(null);
  try { res.json(JSON.parse(row.value)); }
  catch { res.json(null); }
});

router.post('/location', (req, res) => {
  const { name, lat, lon } = req.body;
  if (!name || lat == null || lon == null) {
    return res.status(400).json({ error: 'name, lat, and lon are required' });
  }
  const value = JSON.stringify({ name, lat, lon });
  db.prepare(`
    INSERT INTO user_settings (key, value) VALUES ('exercise_location', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(value);
  res.json({ name, lat, lon });
});

// ── Geocoding (Open-Meteo, free, no key needed) ───────────────────────────────

router.get('/geocode', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'q parameter required' });
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=en&format=json`;
    const data = await httpsGet(url);
    const results = (data.results || []).map(r => ({
      name: `${r.name}${r.admin1 ? ', ' + r.admin1 : ''}, ${r.country}`,
      lat: r.latitude,
      lon: r.longitude,
    }));
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Geocoding failed', details: err.message });
  }
});

// ── Weather (Open-Meteo, free, no key needed) ─────────────────────────────────

router.get('/weather', async (req, res) => {
  const row = db.prepare("SELECT value FROM user_settings WHERE key = 'exercise_location'").get();
  if (!row) return res.status(404).json({ error: 'No location set' });

  let location;
  try { location = JSON.parse(row.value); }
  catch { return res.status(500).json({ error: 'Invalid location data' }); }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}` +
      `&current=temperature_2m,apparent_temperature,weathercode,windspeed_10m,precipitation,is_day` +
      `&hourly=temperature_2m,precipitation_probability,weathercode` +
      `&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&forecast_days=1`;

    const data = await httpsGet(url);
    const c = data.current;
    const wmo = getWmo(c.weathercode);

    const suggestions = buildSuggestions(c.weathercode, c.temperature_2m, c.windspeed_10m, c.precipitation);

    // Build hourly forecast for today (next 12 hours)
    const now = new Date();
    const hourly = (data.hourly?.time || [])
      .map((t, i) => ({
        time: t,
        temp: data.hourly.temperature_2m[i],
        precipProb: data.hourly.precipitation_probability[i],
        wmo: getWmo(data.hourly.weathercode[i]),
      }))
      .filter(h => {
        const d = new Date(h.time);
        return d >= now && d <= new Date(now.getTime() + 12 * 3600000);
      })
      .slice(0, 8);

    res.json({
      location: location.name,
      temp: Math.round(c.temperature_2m),
      feelsLike: Math.round(c.apparent_temperature),
      windMph: Math.round(c.windspeed_10m),
      precipitation: c.precipitation,
      weatherCode: c.weathercode,
      condition: wmo.label,
      icon: wmo.icon,
      isDay: c.is_day,
      suggestions,
      hourly,
    });
  } catch (err) {
    res.status(500).json({ error: 'Weather fetch failed', details: err.message });
  }
});

// ── Exercise log CRUD ─────────────────────────────────────────────────────────

router.get('/', (req, res) => {
  const { start, end, limit = 30 } = req.query;
  let query = 'SELECT * FROM exercise_log WHERE 1=1';
  const params = [];
  if (start) { query += ' AND log_date >= ?'; params.push(start); }
  if (end)   { query += ' AND log_date <= ?'; params.push(end); }
  query += ' ORDER BY log_date DESC, created_at DESC LIMIT ?';
  params.push(parseInt(limit));
  res.json(db.prepare(query).all(...params));
});

router.post('/', (req, res) => {
  const { activity_type, duration_minutes, intensity, distance, distance_unit, calories_burned, notes, log_date } = req.body;
  if (!activity_type || !log_date) {
    return res.status(400).json({ error: 'activity_type and log_date are required' });
  }
  const result = db.prepare(`
    INSERT INTO exercise_log (activity_type, duration_minutes, intensity, distance, distance_unit, calories_burned, notes, log_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    activity_type, duration_minutes || null, intensity || 'moderate',
    distance || null, distance_unit || 'miles', calories_burned || null,
    notes || null, log_date
  );
  res.status(201).json(db.prepare('SELECT * FROM exercise_log WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const { activity_type, duration_minutes, intensity, distance, distance_unit, calories_burned, notes, log_date } = req.body;
  const existing = db.prepare('SELECT id FROM exercise_log WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  db.prepare(`
    UPDATE exercise_log SET activity_type=?, duration_minutes=?, intensity=?, distance=?, distance_unit=?,
      calories_burned=?, notes=?, log_date=? WHERE id=?
  `).run(
    activity_type, duration_minutes || null, intensity || 'moderate',
    distance || null, distance_unit || 'miles', calories_burned || null,
    notes || null, log_date, req.params.id
  );
  res.json(db.prepare('SELECT * FROM exercise_log WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM exercise_log WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

// ── Stats ─────────────────────────────────────────────────────────────────────

router.get('/stats/weekly', (req, res) => {
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 6);
  const start = weekAgo.toISOString().slice(0, 10);
  const end   = today.toISOString().slice(0, 10);

  const rows = db.prepare(
    'SELECT log_date, SUM(duration_minutes) as minutes, COUNT(*) as count FROM exercise_log WHERE log_date BETWEEN ? AND ? GROUP BY log_date ORDER BY log_date ASC'
  ).all(start, end);

  const totalMinutes = rows.reduce((s, r) => s + (r.minutes || 0), 0);
  const totalSessions = rows.reduce((s, r) => s + r.count, 0);

  // Streak: count consecutive days ending today with at least one workout
  const allDates = new Set(rows.map(r => r.log_date));
  let streak = 0;
  for (let i = 0; i <= 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (allDates.has(d.toISOString().slice(0, 10))) streak++;
    else break;
  }

  res.json({ totalMinutes, totalSessions, streak, days: rows, start, end });
});

// ── Workout Plans ─────────────────────────────────────────────────────────────

router.get('/plans', (req, res) => {
  const plans = db.prepare('SELECT * FROM workout_plans ORDER BY updated_at DESC').all();

  const result = plans.map(plan => {
    const blocks = db.prepare('SELECT * FROM workout_plan_blocks WHERE plan_id = ? ORDER BY day_of_week ASC, sort_order ASC').all(plan.id);

    const totalsByCategory = { cardio: 0, strength: 0, flexibility: 0 };
    blocks.forEach(b => {
      if (totalsByCategory[b.category] !== undefined) {
        totalsByCategory[b.category] += b.duration_minutes;
      }
    });

    const totalMinutes = blocks.reduce((s, b) => s + b.duration_minutes, 0);

    return { ...plan, blocks, totalsByCategory, totalMinutes };
  });

  res.json(result);
});

router.get('/plans/:id', (req, res) => {
  const plan = db.prepare('SELECT * FROM workout_plans WHERE id = ?').get(req.params.id);
  if (!plan) return res.status(404).json({ error: 'Not found' });

  const blocks = db.prepare('SELECT * FROM workout_plan_blocks WHERE plan_id = ? ORDER BY day_of_week ASC, sort_order ASC').all(plan.id);

  const totalsByCategory = { cardio: 0, strength: 0, flexibility: 0 };
  blocks.forEach(b => {
    if (totalsByCategory[b.category] !== undefined) {
      totalsByCategory[b.category] += b.duration_minutes;
    }
  });

  res.json({ ...plan, blocks, totalsByCategory });
});

router.post('/plans', (req, res) => {
  const { name, description, blocks } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  if (!blocks || blocks.length === 0) return res.status(400).json({ error: 'At least one block is required' });

  const result = db.prepare(
    'INSERT INTO workout_plans (name, description) VALUES (?, ?)'
  ).run(name, description || null);

  const planId = result.lastInsertRowid;

  blocks.forEach((block, idx) => {
    db.prepare(
      'INSERT INTO workout_plan_blocks (plan_id, day_of_week, activity_type, category, duration_minutes, notes, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(planId, block.day_of_week, block.activity_type, block.category || 'cardio', block.duration_minutes, block.notes || null, block.sort_order ?? idx);
  });

  const created = db.prepare('SELECT * FROM workout_plans WHERE id = ?').get(planId);
  const createdBlocks = db.prepare('SELECT * FROM workout_plan_blocks WHERE plan_id = ? ORDER BY day_of_week ASC, sort_order ASC').all(planId);
  res.status(201).json({ ...created, blocks: createdBlocks });
});

router.put('/plans/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM workout_plans WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const { name, description, blocks } = req.body;

  db.prepare(
    "UPDATE workout_plans SET name=?, description=?, updated_at=datetime('now') WHERE id=?"
  ).run(name ?? existing.name, description !== undefined ? description : existing.description, req.params.id);

  if (blocks) {
    db.prepare('DELETE FROM workout_plan_blocks WHERE plan_id = ?').run(req.params.id);
    blocks.forEach((block, idx) => {
      db.prepare(
        'INSERT INTO workout_plan_blocks (plan_id, day_of_week, activity_type, category, duration_minutes, notes, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(req.params.id, block.day_of_week, block.activity_type, block.category || 'cardio', block.duration_minutes, block.notes || null, block.sort_order ?? idx);
    });
  }

  const updated = db.prepare('SELECT * FROM workout_plans WHERE id = ?').get(req.params.id);
  const updatedBlocks = db.prepare('SELECT * FROM workout_plan_blocks WHERE plan_id = ? ORDER BY day_of_week ASC, sort_order ASC').all(req.params.id);
  res.json({ ...updated, blocks: updatedBlocks });
});

router.delete('/plans/:id', (req, res) => {
  db.prepare('DELETE FROM workout_plan_blocks WHERE plan_id = ?').run(req.params.id);
  const result = db.prepare('DELETE FROM workout_plans WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

module.exports = router;
