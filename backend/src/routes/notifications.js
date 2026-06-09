const express = require('express');
const router = express.Router();
const { db } = require('../utils/database');
const logger = require('../utils/logger');
const dayjs = require('dayjs');

router.get('/unread-count', (req, res) => {
  try {
    const { customerId } = req.query;
    let count;
    if (customerId) {
      count = db.prepare(`
        SELECT COUNT(*) as cnt FROM notifications 
        WHERE is_read = 0 AND (customer_id = ? OR is_admin = 0)
      `).get(customerId).cnt;
    } else {
      count = db.prepare(`
        SELECT COUNT(*) as cnt FROM notifications 
        WHERE is_read = 0
      `).get().cnt;
    }
    res.json({ code: 0, data: { count } });
  } catch (e) {
    logger.error('获取未读消息数失败', e);
    res.json({ code: -1, message: e.message });
  }
});

router.get('/', (req, res) => {
  try {
    const { page = 1, pageSize = 20, customerId, type } = req.query;
    const offset = (page - 1) * pageSize;
    
    const clauses = [];
    const params = [];
    if (customerId) {
      clauses.push('(n.customer_id = ? OR n.is_admin = 0)');
      params.push(customerId);
    }
    if (type) {
      clauses.push('n.type = ?');
      params.push(type);
    }
    const where = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';
    
    const total = db.prepare(`SELECT COUNT(*) as cnt FROM notifications n ${where}`).get(...params).cnt;
    const rows = db.prepare(`
      SELECT n.*, p.name as pet_name, c.name as customer_name
      FROM notifications n
      LEFT JOIN boarding b ON n.ref_type = 'boarding' AND n.ref_id = b.id
      LEFT JOIN pets p ON p.id = b.pet_id
      LEFT JOIN customers c ON c.id = n.customer_id
      ${where}
      ORDER BY n.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(pageSize), offset);
    
    res.json({ code: 0, data: { list: rows, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
  } catch (e) {
    logger.error('获取消息列表失败', e);
    res.json({ code: -1, message: e.message });
  }
});

router.put('/:id/read', (req, res) => {
  try {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(req.params.id);
    res.json({ code: 0, message: '已标记为已读' });
  } catch (e) {
    res.json({ code: -1, message: e.message });
  }
});

router.put('/read-all', (req, res) => {
  try {
    const { customerId } = req.body || {};
    if (customerId) {
      db.prepare('UPDATE notifications SET is_read = 1 WHERE customer_id = ? OR is_admin = 0').run(customerId);
    } else {
      db.prepare('UPDATE notifications SET is_read = 1').run();
    }
    res.json({ code: 0, message: '全部已读' });
  } catch (e) {
    res.json({ code: -1, message: e.message });
  }
});

function checkAppointmentReminders() {
  try {
    const now = dayjs();
    const today = now.format('YYYY-MM-DD');
    const currentTime = now.format('HH:mm');
    const in30Min = now.add(30, 'minute').format('HH:mm');
    
    const appointments = db.prepare(`
      SELECT a.*, p.name as pet_name, c.name as customer_name, s.name as service_name
      FROM appointments a
      LEFT JOIN pets p ON p.id = a.pet_id
      LEFT JOIN customers c ON c.id = a.customer_id
      LEFT JOIN services s ON s.id = a.service_id
      WHERE a.appointment_date = ? 
        AND a.status IN ('待确认', '已确认')
        AND a.start_time >= ?
        AND a.start_time <= ?
    `).all(today, currentTime, in30Min);
    
    for (const apt of appointments) {
      const exist = db.prepare(`
        SELECT id FROM notifications 
        WHERE type = 'appointment_reminder' AND ref_type = 'appointment' AND ref_id = ?
      `).get(apt.id);
      
      if (!exist) {
        const title = `即将到店提醒`;
        const content = `${apt.customer_name}的${apt.species || ''}[${apt.pet_name}]预约了${apt.start_time}的${apt.service_name}，请提前准备`;
        db.prepare(`
          INSERT INTO notifications (type, title, content, ref_type, ref_id, is_admin)
          VALUES ('appointment_reminder', ?, ?, 'appointment', ?, 1)
        `).run(title, content, apt.id);
        logger.info(`生成预约提醒: ${apt.appointment_no}`);
      }
    }
  } catch (e) {
    logger.error('检查预约提醒失败', e);
  }
}

setInterval(checkAppointmentReminders, 60000);
setTimeout(checkAppointmentReminders, 5000);

module.exports = router;
