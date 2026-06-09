const express = require('express');
const router = express.Router();
const { db } = require('../utils/database');
const logger = require('../utils/logger');

router.get('/', (req, res) => {
  try {
    const { page = 1, pageSize = 20, type, startDate, endDate, keyword } = req.query;
    const offset = (page - 1) * pageSize;
    
    const clauses = [];
    const params = [];
    if (type) { clauses.push('o.type = ?'); params.push(type); }
    if (startDate) { clauses.push("date(o.created_at) >= ?"); params.push(startDate); }
    if (endDate) { clauses.push("date(o.created_at) <= ?"); params.push(endDate); }
    if (keyword) {
      clauses.push('(o.order_no LIKE ? OR c.name LIKE ? OR c.phone LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    const where = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';
    
    const total = db.prepare(`
      SELECT COUNT(*) as cnt FROM orders o
      LEFT JOIN customers c ON c.id = o.customer_id
      ${where}
    `).get(...params).cnt;
    
    const rows = db.prepare(`
      SELECT o.*, c.name as customer_name, c.phone
      FROM orders o
      LEFT JOIN customers c ON c.id = o.customer_id
      ${where}
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(pageSize), offset);
    
    res.json({ code: 0, data: { list: rows, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
  } catch (e) {
    logger.error('查询订单失败', e);
    res.json({ code: -1, message: e.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const order = db.prepare(`
      SELECT o.*, c.name as customer_name, c.phone
      FROM orders o
      LEFT JOIN customers c ON c.id = o.customer_id
      WHERE o.id = ?
    `).get(req.params.id);
    
    if (!order) return res.json({ code: -1, message: '订单不存在' });
    
    order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(req.params.id);
    res.json({ code: 0, data: order });
  } catch (e) {
    res.json({ code: -1, message: e.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);
    res.json({ code: 0, message: '删除成功' });
  } catch (e) {
    res.json({ code: -1, message: e.message });
  }
});

module.exports = router;
