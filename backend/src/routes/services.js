const express = require('express');
const router = express.Router();
const { db } = require('../utils/database');

router.get('/', (req, res) => {
  try {
    const { category, active } = req.query;
    const clauses = [];
    const params = [];
    if (category) { clauses.push('category = ?'); params.push(category); }
    if (active !== undefined) { clauses.push('is_active = ?'); params.push(active); }
    const where = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';
    
    const rows = db.prepare(`SELECT * FROM services ${where} ORDER BY category, price`).all(...params);
    res.json({ code: 0, data: rows });
  } catch (e) {
    res.json({ code: -1, message: e.message });
  }
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
  res.json({ code: 0, data: row });
});

router.post('/', (req, res) => {
  try {
    const { name, category, duration, price, description } = req.body;
    const result = db.prepare(`
      INSERT INTO services (name, category, duration, price, description) VALUES (?, ?, ?, ?, ?)
    `).run(name, category, duration, price, description || '');
    res.json({ code: 0, data: { id: result.lastInsertRowid } });
  } catch (e) {
    res.json({ code: -1, message: e.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { name, category, duration, price, description, is_active } = req.body;
    db.prepare(`
      UPDATE services SET name=?, category=?, duration=?, price=?, description=?, is_active=? WHERE id=?
    `).run(name, category, duration, price, description || '', is_active ?? 1, req.params.id);
    res.json({ code: 0, message: '更新成功' });
  } catch (e) {
    res.json({ code: -1, message: e.message });
  }
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM services WHERE id = ?').run(req.params.id);
  res.json({ code: 0, message: '删除成功' });
});

module.exports = router;
