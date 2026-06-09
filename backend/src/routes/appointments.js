const express = require('express');
const router = express.Router();
const dayjs = require('dayjs');
const { db } = require('../utils/database');
const logger = require('../utils/logger');
const config = require('../utils/config');

function generateOrderNo(prefix = 'YY') {
  return prefix + dayjs().format('YYYYMMDDHHmmss') + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
}

function addMinutes(time, minutes) {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function hasTimeOverlap(startA, endA, startB, endB) {
  const sA = timeToMinutes(startA), eA = timeToMinutes(endA);
  const sB = timeToMinutes(startB), eB = timeToMinutes(endB);
  return sA < eB && sB < eA;
}

router.get('/available-slots', (req, res) => {
  try {
    const { date, serviceId } = req.query;
    if (!date || !serviceId) {
      return res.json({ code: -1, message: '日期和服务ID必填' });
    }
    
    const service = db.prepare('SELECT * FROM services WHERE id = ?').get(serviceId);
    if (!service) return res.json({ code: -1, message: '服务不存在' });
    
    const duration = service.duration;
    const interval = config.business.slotInterval;
    const workStart = config.business.workStart;
    const workEnd = config.business.workEnd;
    
    const slots = [];
    let curTime = workStart;
    while (timeToMinutes(curTime) + duration <= timeToMinutes(workEnd)) {
      const endTime = addMinutes(curTime, duration);
      slots.push({ start: curTime, end: endTime, available: true });
      curTime = addMinutes(curTime, interval);
    }
    
    const appointments = db.prepare(`
      SELECT * FROM appointments 
      WHERE appointment_date = ? AND status NOT IN ('已取消', '已完成')
    `).all(date);
    
    const staffList = db.prepare(`SELECT * FROM staff WHERE is_active = 1 AND (skills LIKE ? OR skills LIKE ? OR skills = '')`, 
      `%${service.category}%`, `%洗护%`).all();
    
    const wsList = db.prepare(`SELECT * FROM workstations WHERE is_active = 1`).all();
    
    const result = slots.map(slot => {
      let availableStaff = [...staffList];
      let availableWs = [...wsList];
      
      for (const apt of appointments) {
        if (hasTimeOverlap(slot.start, slot.end, apt.start_time, apt.end_time)) {
          availableStaff = availableStaff.filter(s => s.id !== apt.staff_id);
          availableWs = availableWs.filter(w => w.id !== apt.workstation_id);
        }
      }
      
      return {
        ...slot,
        available: availableStaff.length > 0 && availableWs.length > 0,
        staffCount: availableStaff.length,
        workstationCount: availableWs.length
      };
    });
    
    res.json({ code: 0, data: result });
  } catch (e) {
    logger.error('获取可用时段失败', e);
    res.json({ code: -1, message: e.message });
  }
});

router.get('/', (req, res) => {
  try {
    const { page = 1, pageSize = 20, date, status, keyword } = req.query;
    const offset = (page - 1) * pageSize;
    
    const clauses = [];
    const params = [];
    if (date) { clauses.push('a.appointment_date = ?'); params.push(date); }
    if (status) { clauses.push('a.status = ?'); params.push(status); }
    if (keyword) {
      clauses.push('(p.name LIKE ? OR c.name LIKE ? OR c.phone LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    const where = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';
    
    const total = db.prepare(`SELECT COUNT(*) as cnt FROM appointments a ${where}`).get(...params).cnt;
    const rows = db.prepare(`
      SELECT a.*, p.name as pet_name, p.species, p.breed,
             c.name as customer_name, c.phone as customer_phone,
             s.name as service_name, s.category, s.price as service_price, s.duration,
             st.name as staff_name, w.name as workstation_name
      FROM appointments a
      LEFT JOIN pets p ON p.id = a.pet_id
      LEFT JOIN customers c ON c.id = a.customer_id
      LEFT JOIN services s ON s.id = a.service_id
      LEFT JOIN staff st ON st.id = a.staff_id
      LEFT JOIN workstations w ON w.id = a.workstation_id
      ${where}
      ORDER BY a.appointment_date DESC, a.start_time DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(pageSize), offset);
    
    res.json({ code: 0, data: { list: rows, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
  } catch (e) {
    logger.error('查询预约列表失败', e);
    res.json({ code: -1, message: e.message });
  }
});

router.get('/:id', (req, res) => {
  const row = db.prepare(`
    SELECT a.*, p.name as pet_name, c.name as customer_name, c.phone,
           s.name as service_name, s.price, s.duration,
           st.name as staff_name, w.name as workstation_name
    FROM appointments a
    LEFT JOIN pets p ON p.id = a.pet_id
    LEFT JOIN customers c ON c.id = a.customer_id
    LEFT JOIN services s ON s.id = a.service_id
    LEFT JOIN staff st ON st.id = a.staff_id
    LEFT JOIN workstations w ON w.id = a.workstation_id
    WHERE a.id = ?
  `).get(req.params.id);
  res.json({ code: 0, data: row });
});

router.post('/', (req, res) => {
  try {
    const { pet_id, customer_id, service_id, appointment_date, start_time, remark, staff_id, workstation_id } = req.body;
    
    if (!pet_id || !customer_id || !service_id || !appointment_date || !start_time) {
      return res.json({ code: -1, message: '参数不完整' });
    }
    
    const service = db.prepare('SELECT * FROM services WHERE id = ?').get(service_id);
    if (!service) return res.json({ code: -1, message: '服务不存在' });
    
    const end_time = addMinutes(start_time, service.duration);
    const appointment_no = generateOrderNo('AP');
    
    const appointments = db.prepare(`
      SELECT * FROM appointments 
      WHERE appointment_date = ? AND status NOT IN ('已取消', '已完成')
    `).all(appointment_date);
    
    let finalStaffId = staff_id;
    let finalWsId = workstation_id;
    
    for (const apt of appointments) {
      if (hasTimeOverlap(start_time, end_time, apt.start_time, apt.end_time)) {
        if (apt.staff_id === finalStaffId) finalStaffId = null;
        if (apt.workstation_id === finalWsId) finalWsId = null;
      }
    }
    
    if (!finalStaffId) {
      const staffList = db.prepare('SELECT * FROM staff WHERE is_active = 1').all();
      const busyStaffIds = appointments
        .filter(apt => hasTimeOverlap(start_time, end_time, apt.start_time, apt.end_time))
        .map(apt => apt.staff_id)
        .filter(Boolean);
      const available = staffList.find(s => !busyStaffIds.includes(s.id));
      if (!available) return res.json({ code: -1, message: '所选时段美容师均已排满' });
      finalStaffId = available.id;
    }
    
    if (!finalWsId) {
      const wsList = db.prepare('SELECT * FROM workstations WHERE is_active = 1').all();
      const busyWsIds = appointments
        .filter(apt => hasTimeOverlap(start_time, end_time, apt.start_time, apt.end_time))
        .map(apt => apt.workstation_id)
        .filter(Boolean);
      const available = wsList.find(w => !busyWsIds.includes(w.id));
      if (!available) return res.json({ code: -1, message: '所选时段工位均已占用' });
      finalWsId = available.id;
    }
    
    const result = db.prepare(`
      INSERT INTO appointments (appointment_no, pet_id, customer_id, service_id, staff_id, workstation_id,
        appointment_date, start_time, end_time, remark)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(appointment_no, pet_id, customer_id, service_id, finalStaffId, finalWsId,
           appointment_date, start_time, end_time, remark || '');
    
    logger.info(`创建预约成功: ${appointment_no}`);
    res.json({ code: 0, data: { id: result.lastInsertRowid, appointment_no }, message: '预约成功' });
  } catch (e) {
    logger.error('创建预约失败', e);
    res.json({ code: -1, message: e.message });
  }
});

router.put('/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    db.prepare(`UPDATE appointments SET status=?, updated_at=datetime('now','localtime') WHERE id=?`).run(status, req.params.id);
    res.json({ code: 0, message: '状态更新成功' });
  } catch (e) {
    res.json({ code: -1, message: e.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { status, remark } = req.body;
    db.prepare(`UPDATE appointments SET status=?, remark=?, updated_at=datetime('now','localtime') WHERE id=?`)
      .run(status, remark || '', req.params.id);
    res.json({ code: 0, message: '更新成功' });
  } catch (e) {
    res.json({ code: -1, message: e.message });
  }
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM appointments WHERE id = ?').run(req.params.id);
  res.json({ code: 0 });
});

module.exports = router;
