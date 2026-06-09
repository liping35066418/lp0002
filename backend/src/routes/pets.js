const express = require('express');
const router = express.Router();
const { db } = require('../utils/database');
const logger = require('../utils/logger');

router.get('/', (req, res) => {
  try {
    const { page = 1, pageSize = 20, keyword = '', customerId } = req.query;
    const offset = (page - 1) * pageSize;
    
    const whereClauses = [];
    const params = [];
    if (keyword) {
      whereClauses.push('(p.name LIKE ? OR p.breed LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (customerId) {
      whereClauses.push('p.customer_id = ?');
      params.push(customerId);
    }
    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    
    const total = db.prepare(`SELECT COUNT(*) as cnt FROM pets p ${whereSql}`).get(...params).cnt;
    const rows = db.prepare(`
      SELECT p.*, c.name as customer_name, c.phone as customer_phone
      FROM pets p
      LEFT JOIN customers c ON c.id = p.customer_id
      ${whereSql}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(pageSize), offset);
    
    res.json({ code: 0, data: { list: rows, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
  } catch (e) {
    logger.error('查询宠物列表失败', e);
    res.json({ code: -1, message: e.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const pet = db.prepare(`
      SELECT p.*, c.name as customer_name, c.phone as customer_phone
      FROM pets p
      LEFT JOIN customers c ON c.id = p.customer_id
      WHERE p.id = ?
    `).get(req.params.id);
    if (!pet) return res.json({ code: -1, message: '宠物不存在' });
    res.json({ code: 0, data: pet });
  } catch (e) {
    res.json({ code: -1, message: e.message });
  }
});

router.post('/', (req, res) => {
  try {
    const { customer_id, name, species, breed, gender, birthday, weight, body_type, special_habit, allergy, photo, remark } = req.body;
    if (!customer_id || !name || !species) {
      return res.json({ code: -1, message: '客户、宠物名、品种必填' });
    }
    
    const result = db.prepare(`
      INSERT INTO pets (customer_id, name, species, breed, gender, birthday, weight, body_type, special_habit, allergy, photo, remark)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(customer_id, name, species, breed || '', gender || '', birthday || '', weight || 0, 
           body_type || '', special_habit || '', allergy || '', photo || '', remark || '');
    
    res.json({ code: 0, data: { id: result.lastInsertRowid }, message: '添加成功' });
  } catch (e) {
    logger.error('添加宠物失败', e);
    res.json({ code: -1, message: e.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { customer_id, name, species, breed, gender, birthday, weight, body_type, special_habit, allergy, photo, remark } = req.body;
    db.prepare(`
      UPDATE pets SET customer_id=?, name=?, species=?, breed=?, gender=?, birthday=?, weight=?,
             body_type=?, special_habit=?, allergy=?, photo=?, remark=?, updated_at=datetime('now','localtime')
      WHERE id=?
    `).run(customer_id, name, species, breed || '', gender || '', birthday || '', weight || 0,
           body_type || '', special_habit || '', allergy || '', photo || '', remark || '', req.params.id);
    
    res.json({ code: 0, message: '更新成功' });
  } catch (e) {
    res.json({ code: -1, message: e.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM pets WHERE id = ?').run(req.params.id);
    res.json({ code: 0, message: '删除成功' });
  } catch (e) {
    res.json({ code: -1, message: e.message });
  }
});

router.get('/:id/service-history', (req, res) => {
  try {
    const petId = req.params.id;
    const rows = db.prepare(`
      SELECT a.id, a.appointment_no, a.appointment_date, a.start_time, a.end_time,
             a.status, a.service_remark, a.updated_at as completed_at,
             s.name as service_name, s.category, s.price,
             st.name as staff_name
      FROM appointments a
      LEFT JOIN services s ON s.id = a.service_id
      LEFT JOIN staff st ON st.id = a.staff_id
      WHERE a.pet_id = ? AND a.status = '已完成'
      ORDER BY a.appointment_date DESC, a.start_time DESC
    `).all(petId);
    
    res.json({ code: 0, data: rows });
  } catch (e) {
    logger.error('查询宠物服务历史失败', e);
    res.json({ code: -1, message: e.message });
  }
});

module.exports = router;
