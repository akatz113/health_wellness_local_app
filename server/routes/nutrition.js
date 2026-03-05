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

module.exports = router;
