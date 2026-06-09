const express = require('express');
const router = express.Router();
const { db } = require('../utils/database');

router.get('/', (req, res) => {
  try {
    const { page = 1, pageSize = 20, keyword, category } = req.query;
    const offset = (page - 1) * pageSize;
    
    const clauses = ['is_active = 1'];
    const params = [];
    if (keyword) {
      clauses.push('(name LIKE ? OR barcode LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (category) { clauses.push('category = ?'); params.push(category); }
    const where = 'WHERE ' + clauses.join(' AND ');
    
    const total = db.prepare(`SELECT COUNT(*) as cnt FROM products ${where}`).get(...params).cnt;
    const rows = db.prepare(`
      SELECT * FROM products ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?
    `).all(...params, parseInt(pageSize), offset);
    
    res.json({ code: 0, data: { list: rows, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
  } catch (e) {
    res.json({ code: -1, message: e.message });
  }
});

router.get('/all', (req, res) => {
  const rows = db.prepare('SELECT id, name, price, stock, unit, category FROM products WHERE is_active = 1 AND stock > 0 ORDER BY name').all();
  res.json({ code: 0, data: rows });
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  res.json({ code: 0, data: row });
});

router.post('/', (req, res) => {
  try {
    const { name, category, barcode, stock, price, cost_price, unit } = req.body;
    const result = db.prepare(`
      INSERT INTO products (name, category, barcode, stock, price, cost_price, unit)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(name, category || '', barcode || '', stock || 0, price, cost_price || 0, unit || '件');
    res.json({ code: 0, data: { id: result.lastInsertRowid } });
  } catch (e) {
    res.json({ code: -1, message: e.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { name, category, barcode, stock, price, cost_price, unit, is_active } = req.body;
    db.prepare(`
      UPDATE products SET name=?, category=?, barcode=?, stock=?, price=?, cost_price=?, unit=?, is_active=? WHERE id=?
    `).run(name, category || '', barcode || '', stock || 0, price, cost_price || 0, unit || '件', is_active ?? 1, req.params.id);
    res.json({ code: 0 });
  } catch (e) {
    res.json({ code: -1, message: e.message });
  }
});

router.post('/:id/stock', (req, res) => {
  try {
    const { change, reason } = req.body;
    db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(change, req.params.id);
    res.json({ code: 0, message: '库存更新成功' });
  } catch (e) {
    res.json({ code: -1, message: e.message });
  }
});

router.delete('/:id', (req, res) => {
  db.prepare('UPDATE products SET is_active = 0 WHERE id = ?').run(req.params.id);
  res.json({ code: 0 });
});

module.exports = router;
