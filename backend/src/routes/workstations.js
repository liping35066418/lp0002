const express = require('express');
const router = express.Router();
const { db } = require('../utils/database');

router.get('/', (req, res) => {
  try {
    const { type } = req.query;
    const clauses = [];
    const params = [];
    if (type) { clauses.push('type = ?'); params.push(type); }
    clauses.push('is_active = 1');
    const rows = db.prepare(`SELECT * FROM workstations WHERE ${clauses.join(' AND ')} ORDER BY id`).all(...params);
    res.json({ code: 0, data: rows });
  } catch (e) {
    res.json({ code: -1, message: e.message });
  }
});

router.post('/', (req, res) => {
  const { name, type } = req.body;
  const result = db.prepare('INSERT INTO workstations (name, type) VALUES (?, ?)').run(name, type || '');
  res.json({ code: 0, data: { id: result.lastInsertRowid } });
});

router.put('/:id', (req, res) => {
  const { name, type, is_active } = req.body;
  db.prepare('UPDATE workstations SET name=?, type=?, is_active=? WHERE id=?').run(name, type || '', is_active ?? 1, req.params.id);
  res.json({ code: 0 });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM workstations WHERE id = ?').run(req.params.id);
  res.json({ code: 0 });
});

module.exports = router;
