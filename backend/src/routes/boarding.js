const express = require('express');
const router = express.Router();
const dayjs = require('dayjs');
const { db } = require('../utils/database');
const logger = require('../utils/logger');

function generateOrderNo() {
  return 'BD' + dayjs().format('YYYYMMDDHHmmss') + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
}

router.get('/', (req, res) => {
  try {
    const { page = 1, pageSize = 20, status, keyword } = req.query;
    const offset = (page - 1) * pageSize;
    
    const clauses = [];
    const params = [];
    if (status) { clauses.push('b.status = ?'); params.push(status); }
    if (keyword) {
      clauses.push('(p.name LIKE ? OR c.name LIKE ? OR c.phone LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    const where = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';
    
    const total = db.prepare(`SELECT COUNT(*) as cnt FROM boarding b ${where}`).get(...params).cnt;
    const rows = db.prepare(`
      SELECT b.*, p.name as pet_name, p.species, p.breed,
             c.name as customer_name, c.phone as customer_phone,
             (julianday(COALESCE(b.actual_check_out_date, b.expected_check_out_date)) - julianday(b.check_in_date)) + 1 as days
      FROM boarding b
      LEFT JOIN pets p ON p.id = b.pet_id
      LEFT JOIN customers c ON c.id = b.customer_id
      ${where}
      ORDER BY b.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(pageSize), offset);
    
    res.json({ code: 0, data: { list: rows, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
  } catch (e) {
    logger.error('查询寄养列表失败', e);
    res.json({ code: -1, message: e.message });
  }
});

router.get('/reminders', (req, res) => {
  try {
    const today = dayjs().format('YYYY-MM-DD');
    const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');
    
    const rows = db.prepare(`
      SELECT b.*, p.name as pet_name, c.name as customer_name, c.phone
      FROM boarding b
      LEFT JOIN pets p ON p.id = b.pet_id
      LEFT JOIN customers c ON c.id = b.customer_id
      WHERE b.status = '在住' AND b.expected_check_out_date <= ?
      ORDER BY b.expected_check_out_date ASC
    `).all(tomorrow);
    
    const result = rows.map(r => {
      const daysLeft = dayjs(r.expected_check_out_date).diff(today, 'day');
      return { ...r, days_left: daysLeft };
    });
    
    res.json({ code: 0, data: result });
  } catch (e) {
    res.json({ code: -1, message: e.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const boarding = db.prepare(`
      SELECT b.*, p.name as pet_name, p.species, p.breed, p.body_type, p.weight,
             c.name as customer_name, c.phone, c.address,
             (julianday(COALESCE(b.actual_check_out_date, b.expected_check_out_date)) - julianday(b.check_in_date)) + 1 as total_days
      FROM boarding b
      LEFT JOIN pets p ON p.id = b.pet_id
      LEFT JOIN customers c ON c.id = b.customer_id
      WHERE b.id = ?
    `).get(req.params.id);
    
    if (!boarding) return res.json({ code: -1, message: '记录不存在' });
    
    const records = db.prepare(`
      SELECT * FROM boarding_daily_records WHERE boarding_id = ? ORDER BY record_date DESC
    `).all(req.params.id);
    
    boarding.records = records;
    res.json({ code: 0, data: boarding });
  } catch (e) {
    res.json({ code: -1, message: e.message });
  }
});

router.post('/', (req, res) => {
  try {
    const { pet_id, customer_id, check_in_date, check_in_time, expected_check_out_date, expected_check_out_time,
            room_no, daily_fee, deposit, remark } = req.body;
    
    if (!pet_id || !customer_id || !check_in_date || !expected_check_out_date || !daily_fee) {
      return res.json({ code: -1, message: '必要参数缺失' });
    }
    
    const boarding_no = generateOrderNo();
    const result = db.prepare(`
      INSERT INTO boarding (boarding_no, pet_id, customer_id, check_in_date, check_in_time,
        expected_check_out_date, expected_check_out_time, room_no, daily_fee, deposit, remark)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(boarding_no, pet_id, customer_id, check_in_date, check_in_time || '09:00',
           expected_check_out_date, expected_check_out_time || '18:00', 
           room_no || '', daily_fee, deposit || 0, remark || '');
    
    logger.info(`创建寄养登记: ${boarding_no}`);
    res.json({ code: 0, data: { id: result.lastInsertRowid, boarding_no }, message: '登记成功' });
  } catch (e) {
    logger.error('创建寄养失败', e);
    res.json({ code: -1, message: e.message });
  }
});

router.put('/:id/checkout', (req, res) => {
  try {
    const { actual_check_out_date, actual_check_out_time } = req.body;
    const today = dayjs().format('YYYY-MM-DD');
    const now = dayjs().format('HH:mm');
    
    db.prepare(`
      UPDATE boarding SET actual_check_out_date=?, actual_check_out_time=?, status='已离店',
             updated_at=datetime('now','localtime')
      WHERE id=?
    `).run(actual_check_out_date || today, actual_check_out_time || now, req.params.id);
    
    res.json({ code: 0, message: '离店登记成功' });
  } catch (e) {
    res.json({ code: -1, message: e.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { expected_check_out_date, expected_check_out_time, room_no, daily_fee, remark, status } = req.body;
    db.prepare(`
      UPDATE boarding SET expected_check_out_date=?, expected_check_out_time=?, room_no=?,
             daily_fee=?, remark=?, status=?, updated_at=datetime('now','localtime')
      WHERE id=?
    `).run(expected_check_out_date, expected_check_out_time || '18:00', room_no || '',
           daily_fee, remark || '', status || '在住', req.params.id);
    res.json({ code: 0 });
  } catch (e) {
    res.json({ code: -1, message: e.message });
  }
});

router.post('/:id/daily-records', (req, res) => {
  try {
    const { record_date, food_condition, mood, health_status, walk_info, other_notes } = req.body;
    if (!record_date) return res.json({ code: -1, message: '记录日期必填' });
    
    const boardingId = req.params.id;
    const boarding = db.prepare('SELECT * FROM boarding WHERE id = ?').get(boardingId);
    if (!boarding) return res.json({ code: -1, message: '寄养记录不存在' });
    
    const pet = db.prepare('SELECT name, species FROM pets WHERE id = ?').get(boarding.pet_id);
    
    const result = db.prepare(`
      INSERT INTO boarding_daily_records (boarding_id, record_date, food_condition, mood, health_status, walk_info, other_notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(boardingId, record_date, food_condition || '', mood || '', health_status || '', walk_info || '', other_notes || '');
    
    const title = `寄养日报 - ${record_date}`;
    const petName = pet?.name || '宠物';
    const moodText = mood ? `精神状态：${mood}；` : '';
    const foodText = food_condition ? `进食情况：${food_condition}；` : '';
    const healthText = health_status ? `健康：${health_status}；` : '';
    const notesText = other_notes ? `备注：${other_notes}` : '';
    const content = `【${petName}】${moodText}${foodText}${healthText}${notesText}`;
    
    db.prepare(`
      INSERT INTO notifications (type, title, content, ref_type, ref_id, customer_id, is_admin)
      VALUES ('boarding_daily', ?, ?, 'boarding', ?, ?, 1)
    `).run(title, content, boardingId, boarding.customer_id);
    
    logger.info(`寄养日报已生成: 寄养ID=${boardingId}, 日期=${record_date}`);
    res.json({ code: 0, data: { id: result.lastInsertRowid }, message: '记录成功' });
  } catch (e) {
    logger.error('添加照料记录失败', e);
    res.json({ code: -1, message: e.message });
  }
});

router.get('/:id/daily-records', (req, res) => {
  const rows = db.prepare(`
    SELECT * FROM boarding_daily_records WHERE boarding_id = ? ORDER BY record_date DESC
  `).all(req.params.id);
  res.json({ code: 0, data: rows });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM boarding WHERE id = ?').run(req.params.id);
  res.json({ code: 0 });
});

module.exports = router;
