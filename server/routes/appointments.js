const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const { status } = req.query;
  let query = 'SELECT * FROM appointments WHERE 1=1';
  const params = [];
  if (status) { query += ' AND status = ?'; params.push(status); }
  query += ' ORDER BY appointment_date ASC';
  res.json(db.prepare(query).all(...params));
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.post('/', (req, res) => {
  const { title, doctor_name, specialty, appointment_date, location, notes, status } = req.body;
  if (!title || !appointment_date) {
    return res.status(400).json({ error: 'title and appointment_date are required' });
  }
  const result = db.prepare(`
    INSERT INTO appointments (title, doctor_name, specialty, appointment_date, location, notes, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(title, doctor_name || null, specialty || null, appointment_date, location || null, notes || null, status || 'upcoming');

  res.status(201).json(db.prepare('SELECT * FROM appointments WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const { title, doctor_name, specialty, appointment_date, location, notes, status } = req.body;
  const existing = db.prepare('SELECT id FROM appointments WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  db.prepare(`
    UPDATE appointments SET title=?, doctor_name=?, specialty=?, appointment_date=?, location=?, notes=?, status=?
    WHERE id=?
  `).run(title, doctor_name || null, specialty || null, appointment_date, location || null, notes || null, status || 'upcoming', req.params.id);

  res.json(db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM appointments WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

module.exports = router;
