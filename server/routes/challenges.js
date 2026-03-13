const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/challenges — all challenges with their items and today's check-in status
router.get('/', (_req, res) => {
  const challenges = db.prepare('SELECT * FROM challenges ORDER BY active DESC, created_at DESC').all();
  const today = new Date().toISOString().slice(0, 10);

  const result = challenges.map(ch => {
    const items = db.prepare('SELECT * FROM challenge_items WHERE challenge_id = ? ORDER BY sort_order ASC').all(ch.id);
    const itemsWithStatus = items.map(item => {
      const checkIn = db.prepare(
        'SELECT * FROM challenge_check_ins WHERE challenge_item_id = ? AND check_date = ?'
      ).get(item.id, today);
      return { ...item, completed: checkIn?.completed ?? 0, value: checkIn?.value ?? null };
    });
    return { ...ch, items: itemsWithStatus };
  });

  res.json(result);
});

// GET /api/challenges/:id — single challenge with items
router.get('/:id', (req, res) => {
  const ch = db.prepare('SELECT * FROM challenges WHERE id = ?').get(req.params.id);
  if (!ch) return res.status(404).json({ error: 'Not found' });
  ch.items = db.prepare('SELECT * FROM challenge_items WHERE challenge_id = ? ORDER BY sort_order ASC').all(ch.id);
  res.json(ch);
});

// GET /api/challenges/:id/history?days=30 — check-in history for a challenge
router.get('/:id/history', (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const ch = db.prepare('SELECT * FROM challenges WHERE id = ?').get(req.params.id);
  if (!ch) return res.status(404).json({ error: 'Not found' });

  const items = db.prepare('SELECT * FROM challenge_items WHERE challenge_id = ? ORDER BY sort_order ASC').all(ch.id);
  const today = new Date();

  const history = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);

    const dayItems = items.map(item => {
      const checkIn = db.prepare(
        'SELECT * FROM challenge_check_ins WHERE challenge_item_id = ? AND check_date = ?'
      ).get(item.id, dateStr);
      return { item_id: item.id, title: item.title, completed: checkIn?.completed ?? 0 };
    });

    const completedCount = dayItems.filter(i => i.completed).length;
    history.push({ date: dateStr, items: dayItems, completedCount, totalCount: items.length });
  }

  res.json(history);
});

// POST /api/challenges — create challenge with items
router.post('/', (req, res) => {
  const { title, description, start_date, end_date, items } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  if (!items || items.length === 0) return res.status(400).json({ error: 'At least one item is required' });

  const result = db.prepare(
    'INSERT INTO challenges (title, description, start_date, end_date) VALUES (?, ?, ?, ?)'
  ).run(title, description || null, start_date || new Date().toISOString().slice(0, 10), end_date || null);

  const challengeId = result.lastInsertRowid;

  items.forEach((item, idx) => {
    db.prepare(
      'INSERT INTO challenge_items (challenge_id, title, item_type, target_value, target_unit, period, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(challengeId, item.title, item.item_type || 'checklist', item.target_value || null, item.target_unit || null, item.period || 'daily', idx);
  });

  const created = db.prepare('SELECT * FROM challenges WHERE id = ?').get(challengeId);
  created.items = db.prepare('SELECT * FROM challenge_items WHERE challenge_id = ? ORDER BY sort_order ASC').all(challengeId);
  res.status(201).json(created);
});

// PUT /api/challenges/:id — update challenge (title, description, dates, active)
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM challenges WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const { title, description, start_date, end_date, active, items } = req.body;

  db.prepare(
    'UPDATE challenges SET title=?, description=?, start_date=?, end_date=?, active=? WHERE id=?'
  ).run(
    title ?? existing.title,
    description !== undefined ? description : existing.description,
    start_date ?? existing.start_date,
    end_date !== undefined ? end_date : existing.end_date,
    active !== undefined ? (active ? 1 : 0) : existing.active,
    req.params.id
  );

  // If items provided, replace them
  if (items) {
    db.prepare('DELETE FROM challenge_items WHERE challenge_id = ?').run(req.params.id);
    items.forEach((item, idx) => {
      db.prepare(
        'INSERT INTO challenge_items (challenge_id, title, item_type, target_value, target_unit, period, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(req.params.id, item.title, item.item_type || 'checklist', item.target_value || null, item.target_unit || null, item.period || 'daily', idx);
    });
  }

  const updated = db.prepare('SELECT * FROM challenges WHERE id = ?').get(req.params.id);
  updated.items = db.prepare('SELECT * FROM challenge_items WHERE challenge_id = ? ORDER BY sort_order ASC').all(req.params.id);
  res.json(updated);
});

// DELETE /api/challenges/:id
router.delete('/:id', (req, res) => {
  // Delete check-ins for this challenge's items first
  const items = db.prepare('SELECT id FROM challenge_items WHERE challenge_id = ?').all(req.params.id);
  items.forEach(item => {
    db.prepare('DELETE FROM challenge_check_ins WHERE challenge_item_id = ?').run(item.id);
  });
  db.prepare('DELETE FROM challenge_items WHERE challenge_id = ?').run(req.params.id);
  const result = db.prepare('DELETE FROM challenges WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

// POST /api/challenges/check-in — toggle or set a check-in for an item on a date
router.post('/check-in', (req, res) => {
  const { challenge_item_id, check_date, completed, value } = req.body;
  if (!challenge_item_id || !check_date) return res.status(400).json({ error: 'challenge_item_id and check_date are required' });

  const existing = db.prepare(
    'SELECT * FROM challenge_check_ins WHERE challenge_item_id = ? AND check_date = ?'
  ).get(challenge_item_id, check_date);

  if (existing) {
    const newCompleted = completed !== undefined ? (completed ? 1 : 0) : (existing.completed ? 0 : 1);
    db.prepare(
      'UPDATE challenge_check_ins SET completed = ?, value = ? WHERE id = ?'
    ).run(newCompleted, value !== undefined ? value : existing.value, existing.id);
  } else {
    db.prepare(
      'INSERT INTO challenge_check_ins (challenge_item_id, check_date, completed, value) VALUES (?, ?, ?, ?)'
    ).run(challenge_item_id, check_date, completed !== undefined ? (completed ? 1 : 0) : 1, value || null);
  }

  res.json({ success: true });
});

module.exports = router;
