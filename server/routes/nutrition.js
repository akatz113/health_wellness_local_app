const express = require('express');
const router = express.Router();
const https = require('https');
const db = require('../db');

const USDA_API_KEY = process.env.USDA_API_KEY || 'DEMO_KEY';
const USDA_BASE = 'api.nal.usda.gov';

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Failed to parse response')); }
      });
    }).on('error', reject);
  });
}

// Search USDA food database
router.get('/search', async (req, res) => {
  const { q, page = 1, pageSize = 20 } = req.query;
  if (!q) return res.status(400).json({ error: 'q parameter required' });

  try {
    const url = `https://${USDA_BASE}/fdc/v1/foods/search?query=${encodeURIComponent(q)}&pageSize=${pageSize}&pageNumber=${page}&api_key=${USDA_API_KEY}`;
    const data = await httpsGet(url);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to reach USDA API', details: err.message });
  }
});

// Get food details by FDC ID
router.get('/food/:fdcId', async (req, res) => {
  try {
    const url = `https://${USDA_BASE}/fdc/v1/food/${req.params.fdcId}?api_key=${USDA_API_KEY}`;
    const data = await httpsGet(url);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to reach USDA API', details: err.message });
  }
});

// Get nutrition log for a date
router.get('/log', (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'date parameter required (YYYY-MM-DD)' });

  const rows = db.prepare('SELECT * FROM nutrition_log WHERE log_date = ? ORDER BY created_at ASC').all(date);
  res.json(rows.map(r => ({ ...r, all_nutrients: JSON.parse(r.all_nutrients || '[]') })));
});

// Add food to log
router.post('/log', (req, res) => {
  const {
    food_name, fdc_id, serving_size, serving_unit, serving_description,
    calories, protein, carbs, fat, fiber, sugar, sodium,
    calcium, iron, vitamin_c, vitamin_d, potassium, cholesterol, saturated_fat,
    all_nutrients, meal_type, log_date
  } = req.body;

  if (!food_name || !log_date) {
    return res.status(400).json({ error: 'food_name and log_date are required' });
  }

  const result = db.prepare(`
    INSERT INTO nutrition_log (
      food_name, fdc_id, serving_size, serving_unit, serving_description,
      calories, protein, carbs, fat, fiber, sugar, sodium,
      calcium, iron, vitamin_c, vitamin_d, potassium, cholesterol, saturated_fat,
      all_nutrients, meal_type, log_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    food_name, fdc_id || null, serving_size || 1, serving_unit || 'serving', serving_description || null,
    calories || 0, protein || 0, carbs || 0, fat || 0, fiber || 0, sugar || 0, sodium || 0,
    calcium || 0, iron || 0, vitamin_c || 0, vitamin_d || 0, potassium || 0, cholesterol || 0, saturated_fat || 0,
    JSON.stringify(all_nutrients || []), meal_type || 'snack', log_date
  );

  const row = db.prepare('SELECT * FROM nutrition_log WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ ...row, all_nutrients: JSON.parse(row.all_nutrients || '[]') });
});

// Delete log entry
router.delete('/log/:id', (req, res) => {
  const result = db.prepare('DELETE FROM nutrition_log WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

// Get nutrition summary for a date range
router.get('/summary', (req, res) => {
  const { start, end } = req.query;
  if (!start || !end) return res.status(400).json({ error: 'start and end dates required' });

  const rows = db.prepare(`
    SELECT log_date,
      SUM(calories) as calories, SUM(protein) as protein, SUM(carbs) as carbs,
      SUM(fat) as fat, SUM(fiber) as fiber, SUM(sugar) as sugar, SUM(sodium) as sodium
    FROM nutrition_log
    WHERE log_date BETWEEN ? AND ?
    GROUP BY log_date
    ORDER BY log_date ASC
  `).all(start, end);

  res.json(rows);
});

// ── Saved Meals ──────────────────────────────────────────────────────────────

router.get('/meals', (req, res) => {
  const { q } = req.query;
  let meals;
  if (q && q.trim()) {
    const pattern = `%${q.trim()}%`;
    meals = db.prepare('SELECT * FROM saved_meals WHERE name LIKE ? OR description LIKE ? OR tags LIKE ? ORDER BY updated_at DESC').all(pattern, pattern, pattern);
  } else {
    meals = db.prepare('SELECT * FROM saved_meals ORDER BY updated_at DESC').all();
  }

  const result = meals.map(meal => {
    const items = db.prepare('SELECT * FROM saved_meal_items WHERE meal_id = ? ORDER BY sort_order ASC').all(meal.id);
    const totals = items.reduce((acc, item) => {
      acc.calories += item.calories; acc.protein += item.protein;
      acc.carbs += item.carbs; acc.fat += item.fat;
      acc.fiber += item.fiber; acc.sugar += item.sugar;
      acc.sodium += item.sodium; acc.calcium += item.calcium;
      acc.iron += item.iron; acc.vitamin_c += item.vitamin_c;
      acc.vitamin_d += item.vitamin_d; acc.potassium += item.potassium;
      acc.cholesterol += item.cholesterol; acc.saturated_fat += item.saturated_fat;
      return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0, calcium: 0, iron: 0, vitamin_c: 0, vitamin_d: 0, potassium: 0, cholesterol: 0, saturated_fat: 0 });

    return {
      ...meal,
      tags: JSON.parse(meal.tags || '[]'),
      items: items.map(i => ({ ...i, all_nutrients: JSON.parse(i.all_nutrients || '[]') })),
      totals,
    };
  });
  res.json(result);
});

router.get('/meals/:id', (req, res) => {
  const meal = db.prepare('SELECT * FROM saved_meals WHERE id = ?').get(req.params.id);
  if (!meal) return res.status(404).json({ error: 'Not found' });

  const items = db.prepare('SELECT * FROM saved_meal_items WHERE meal_id = ? ORDER BY sort_order ASC').all(meal.id);
  res.json({
    ...meal,
    tags: JSON.parse(meal.tags || '[]'),
    items: items.map(i => ({ ...i, all_nutrients: JSON.parse(i.all_nutrients || '[]') })),
  });
});

router.post('/meals', (req, res) => {
  const { name, description, tags, items } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  if (!items || items.length === 0) return res.status(400).json({ error: 'At least one food item is required' });

  const result = db.prepare(
    'INSERT INTO saved_meals (name, description, tags) VALUES (?, ?, ?)'
  ).run(name, description || null, JSON.stringify(tags || []));

  const mealId = result.lastInsertRowid;

  items.forEach((item, idx) => {
    db.prepare(`
      INSERT INTO saved_meal_items (meal_id, food_name, fdc_id, serving_size, serving_unit, serving_description,
        calories, protein, carbs, fat, fiber, sugar, sodium, calcium, iron, vitamin_c, vitamin_d, potassium,
        cholesterol, saturated_fat, all_nutrients, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      mealId, item.food_name, item.fdc_id || null, item.serving_size || 1,
      item.serving_unit || 'serving', item.serving_description || null,
      item.calories || 0, item.protein || 0, item.carbs || 0, item.fat || 0,
      item.fiber || 0, item.sugar || 0, item.sodium || 0, item.calcium || 0,
      item.iron || 0, item.vitamin_c || 0, item.vitamin_d || 0, item.potassium || 0,
      item.cholesterol || 0, item.saturated_fat || 0,
      JSON.stringify(item.all_nutrients || []), idx
    );
  });

  const created = db.prepare('SELECT * FROM saved_meals WHERE id = ?').get(mealId);
  const createdItems = db.prepare('SELECT * FROM saved_meal_items WHERE meal_id = ? ORDER BY sort_order ASC').all(mealId);
  res.status(201).json({
    ...created,
    tags: JSON.parse(created.tags || '[]'),
    items: createdItems.map(i => ({ ...i, all_nutrients: JSON.parse(i.all_nutrients || '[]') })),
  });
});

router.put('/meals/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM saved_meals WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const { name, description, tags, items } = req.body;

  db.prepare(
    "UPDATE saved_meals SET name=?, description=?, tags=?, updated_at=datetime('now') WHERE id=?"
  ).run(name ?? existing.name, description !== undefined ? description : existing.description, JSON.stringify(tags || JSON.parse(existing.tags || '[]')), req.params.id);

  if (items) {
    db.prepare('DELETE FROM saved_meal_items WHERE meal_id = ?').run(req.params.id);
    items.forEach((item, idx) => {
      db.prepare(`
        INSERT INTO saved_meal_items (meal_id, food_name, fdc_id, serving_size, serving_unit, serving_description,
          calories, protein, carbs, fat, fiber, sugar, sodium, calcium, iron, vitamin_c, vitamin_d, potassium,
          cholesterol, saturated_fat, all_nutrients, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        req.params.id, item.food_name, item.fdc_id || null, item.serving_size || 1,
        item.serving_unit || 'serving', item.serving_description || null,
        item.calories || 0, item.protein || 0, item.carbs || 0, item.fat || 0,
        item.fiber || 0, item.sugar || 0, item.sodium || 0, item.calcium || 0,
        item.iron || 0, item.vitamin_c || 0, item.vitamin_d || 0, item.potassium || 0,
        item.cholesterol || 0, item.saturated_fat || 0,
        JSON.stringify(item.all_nutrients || []), idx
      );
    });
  }

  const updated = db.prepare('SELECT * FROM saved_meals WHERE id = ?').get(req.params.id);
  const updatedItems = db.prepare('SELECT * FROM saved_meal_items WHERE meal_id = ? ORDER BY sort_order ASC').all(req.params.id);
  res.json({
    ...updated,
    tags: JSON.parse(updated.tags || '[]'),
    items: updatedItems.map(i => ({ ...i, all_nutrients: JSON.parse(i.all_nutrients || '[]') })),
  });
});

router.delete('/meals/:id', (req, res) => {
  db.prepare('DELETE FROM saved_meal_items WHERE meal_id = ?').run(req.params.id);
  const result = db.prepare('DELETE FROM saved_meals WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

module.exports = router;
