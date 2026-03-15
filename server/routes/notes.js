const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/books', (req, res) => {
  const rows = db.prepare(
    "SELECT DISTINCT book_title FROM notes WHERE source = 'book' AND book_title IS NOT NULL AND book_title != '' ORDER BY book_title"
  ).all();
  res.json(rows.map(r => r.book_title));
});

router.get('/', (req, res) => {
  const { source, search, tag, book } = req.query;
  let query = 'SELECT * FROM notes WHERE 1=1';
  const params = [];

  if (source) { query += ' AND source = ?'; params.push(source); }
  if (book) { query += ' AND book_title = ?'; params.push(book); }
  if (search) { query += ' AND (title LIKE ? OR content LIKE ? OR book_title LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
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
  const { title, content, source, tags, book_title } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: 'title and content are required' });
  }
  const result = db.prepare(`
    INSERT INTO notes (title, content, source, tags, book_title)
    VALUES (?, ?, ?, ?, ?)
  `).run(title, content, source || 'personal', JSON.stringify(tags || []), book_title || null);

  const row = db.prepare('SELECT * FROM notes WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ ...row, tags: JSON.parse(row.tags || '[]') });
});

router.put('/:id', (req, res) => {
  const { title, content, source, tags, book_title } = req.body;
  const existing = db.prepare('SELECT id FROM notes WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  db.prepare(`
    UPDATE notes SET title=?, content=?, source=?, tags=?, book_title=?, updated_at=datetime('now')
    WHERE id=?
  `).run(title, content, source || 'personal', JSON.stringify(tags || []), book_title || null, req.params.id);

  const row = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
  res.json({ ...row, tags: JSON.parse(row.tags || '[]') });
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM notes WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

module.exports = router;
