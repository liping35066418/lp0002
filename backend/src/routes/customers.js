const express = require('express');
const router = express.Router();
const { db } = require('../utils/database');
const logger = require('../utils/logger');

router.get('/', (req, res) => {
  try {
    const { page = 1, pageSize = 20, keyword = '' } = req.query;
    const offset = (page - 1) * pageSize;
    
    let whereSql = '';
    const params = [];
    if (keyword) {
      whereSql = 'WHERE name LIKE ? OR phone LIKE ?';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    
    const total = db.prepare(`SELECT COUNT(*) as cnt FROM customers ${whereSql}`).get(...params).cnt;
    const rows = db.prepare(`
      SELECT c.*, 
             m.member_no, m.balance, m.points, m.level as member_level,
             (SELECT COUNT(*) FROM pets p WHERE p.customer_id = c.id) as pet_count
      FROM customers c
      LEFT JOIN members m ON m.customer_id = c.id
      ${whereSql}
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(pageSize), offset);
    
    res.json({ code: 0, data: { list: rows, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
  } catch (e) {
    logger.error('查询客户列表失败', e);
    res.json({ code: -1, message: e.message });
  }
});

router.get('/all', (req, res) => {
  try {
    const rows = db.prepare('SELECT id, name, phone FROM customers ORDER BY name').all();
    res.json({ code: 0, data: rows });
  } catch (e) {
    res.json({ code: -1, message: e.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const customer = db.prepare(`
      SELECT c.*, m.member_no, m.balance, m.points, m.level as member_level, m.join_date
      FROM customers c
      LEFT JOIN members m ON m.customer_id = c.id
      WHERE c.id = ?
    `).get(req.params.id);
    if (!customer) return res.json({ code: -1, message: '客户不存在' });
    
    const pets = db.prepare('SELECT * FROM pets WHERE customer_id = ?').all(req.params.id);
    customer.pets = pets;
    
    res.json({ code: 0, data: customer });
  } catch (e) {
    res.json({ code: -1, message: e.message });
  }
});

router.post('/', (req, res) => {
  try {
    const { name, phone, address, remark } = req.body;
    if (!name || !phone) return res.json({ code: -1, message: '姓名和手机号必填' });
    
    const exists = db.prepare('SELECT id FROM customers WHERE phone = ?').get(phone);
    if (exists) return res.json({ code: -1, message: '手机号已存在' });
    
    const result = db.prepare(`
      INSERT INTO customers (name, phone, address, remark) VALUES (?, ?, ?, ?)
    `).run(name, phone, address || '', remark || '');
    
    res.json({ code: 0, data: { id: result.lastInsertRowid }, message: '添加成功' });
  } catch (e) {
    logger.error('添加客户失败', e);
    res.json({ code: -1, message: e.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { name, phone, address, remark } = req.body;
    db.prepare(`
      UPDATE customers SET name=?, phone=?, address=?, remark=?, updated_at=datetime('now','localtime')
      WHERE id=?
    `).run(name, phone, address || '', remark || '', req.params.id);
    
    res.json({ code: 0, message: '更新成功' });
  } catch (e) {
    res.json({ code: -1, message: e.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
    res.json({ code: 0, message: '删除成功' });
  } catch (e) {
    res.json({ code: -1, message: e.message });
  }
});

module.exports = router;
