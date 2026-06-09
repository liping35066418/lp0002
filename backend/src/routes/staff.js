const express = require('express');
const router = express.Router();
const { db } = require('../utils/database');

router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM staff WHERE is_active = 1 ORDER BY id').all();
    res.json({ code: 0, data: rows });
  } catch (e) {
    res.json({ code: -1, message: e.message });
  }
});

router.post('/', (req, res) => {
  try {
    const { name, position, phone, skills } = req.body;
    const result = db.prepare(`
      INSERT INTO staff (name, position, phone, skills) VALUES (?, ?, ?, ?)
    `).run(name, position || '', phone || '', skills || '');
    res.json({ code: 0, data: { id: result.lastInsertRowid } });
  } catch (e) {
    res.json({ code: -1, message: e.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { name, position, phone, skills, is_active } = req.body;
    db.prepare(`
      UPDATE staff SET name=?, position=?, phone=?, skills=?, is_active=? WHERE id=?
    `).run(name, position || '', phone || '', skills || '', is_active ?? 1, req.params.id);
    res.json({ code: 0, message: '更新成功' });
  } catch (e) {
    res.json({ code: -1, message: e.message });
  }
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM staff WHERE id = ?').run(req.params.id);
  res.json({ code: 0 });
});

module.exports = router;
