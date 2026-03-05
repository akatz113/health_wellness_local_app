const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const { source, search, tag } = req.query;
  let query = 'SELECT * FROM notes WHERE 1=1';
  const params = [];

  if (source) { query += ' AND source = ?'; params.push(source); }
  if (search) { query += ' AND (title LIKE ? OR content LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  if (tag) { query += ' AND tags LIKE ?'; params.push(`%"${tag}"%`); }

  query += ' ORDER BY updated_at DESC';
  const rows = db.prepare(query).all(...params);
  res.json(rows.map(r => ({ ...r, tags: JSON.parse(r.tags || '[]') })));
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ ...row, tags: JSON.parse(row.tags || '[]') });
});

router.post('/', (req, res) => {
  const { title, content, source, tags } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: 'title and content are required' });
  }
  const result = db.prepare(`
    INSERT INTO notes (title, content, source, tags)
    VALUES (?, ?, ?, ?)
  `).run(title, content, source || 'personal', JSON.stringify(tags || []));

  const row = db.prepare('SELECT * FROM notes WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ ...row, tags: JSON.parse(row.tags || '[]') });
});

router.put('/:id', (req, res) => {
  const { title, content, source, tags } = req.body;
  const existing = db.prepare('SELECT id FROM notes WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  db.prepare(`
    UPDATE notes SET title=?, content=?, source=?, tags=?, updated_at=datetime('now')
    WHERE id=?
  `).run(title, content, source || 'personal', JSON.stringify(tags || []), req.params.id);

  const row = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
  res.json({ ...row, tags: JSON.parse(row.tags || '[]') });
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM notes WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

module.exports = router;
