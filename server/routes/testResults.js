const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const { category, status, search } = req.query;
  let query = 'SELECT * FROM test_results WHERE 1=1';
  const params = [];

  if (category) { query += ' AND category = ?'; params.push(category); }
  if (status) { query += ' AND status = ?'; params.push(status); }
  if (search) { query += ' AND test_name LIKE ?'; params.push(`%${search}%`); }

  query += ' ORDER BY test_date DESC, created_at DESC';
  res.json(db.prepare(query).all(...params));
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM test_results WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.post('/', (req, res) => {
  const { test_name, value, unit, reference_range, status, test_date, lab_name, category, notes } = req.body;
  if (!test_name || !value || !test_date) {
    return res.status(400).json({ error: 'test_name, value, and test_date are required' });
  }
  const result = db.prepare(`
    INSERT INTO test_results (test_name, value, unit, reference_range, status, test_date, lab_name, category, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(test_name, value, unit || null, reference_range || null, status || 'unknown', test_date, lab_name || null, category || null, notes || null);

  res.status(201).json(db.prepare('SELECT * FROM test_results WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const { test_name, value, unit, reference_range, status, test_date, lab_name, category, notes } = req.body;
  const existing = db.prepare('SELECT id FROM test_results WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  db.prepare(`
    UPDATE test_results SET test_name=?, value=?, unit=?, reference_range=?, status=?, test_date=?, lab_name=?, category=?, notes=?
    WHERE id=?
  `).run(test_name, value, unit || null, reference_range || null, status || 'unknown', test_date, lab_name || null, category || null, notes || null, req.params.id);

  res.json(db.prepare('SELECT * FROM test_results WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM test_results WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

module.exports = router;
