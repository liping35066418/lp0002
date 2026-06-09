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
    
    const staffList = db.prepare(`SELECT * FROM staff WHERE is_active = 1 AND (skills LIKE ? OR skills LIKE ? OR skills = '')`)
      .all(`%${service.category}%`, `%洗护%`);
    
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

router.get('/pet/:petId/last-service-remark', (req, res) => {
  try {
    const petId = req.params.petId;
    const remark = db.prepare(`
      SELECT id, service_remark, appointment_date, start_time, service_name
      FROM (
        SELECT a.id, a.service_remark, a.appointment_date, a.start_time, s.name as service_name
        FROM appointments a
        LEFT JOIN services s ON s.id = a.service_id
        WHERE a.pet_id = ? AND a.status = '已完成' AND a.service_remark IS NOT NULL AND a.service_remark != '' AND a.service_remark_shown = 0
        ORDER BY a.updated_at DESC
      )
      LIMIT 1
    `).get(petId);
    
    if (remark) {
      db.prepare('UPDATE appointments SET service_remark_shown = 1 WHERE id = ?').run(remark.id);
    }
    
    res.json({ code: 0, data: remark || null });
  } catch (e) {
    res.json({ code: -1, message: e.message });
  }
});

router.get('/upcoming-soon', (req, res) => {
  try {
    const now = dayjs();
    const today = now.format('YYYY-MM-DD');
    const currentTime = now.format('HH:mm');
    const in30Min = now.add(30, 'minute').format('HH:mm');
    
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
      WHERE a.appointment_date = ? 
        AND a.status IN ('待确认', '已确认')
        AND a.start_time >= ?
        AND a.start_time <= ?
      ORDER BY a.start_time ASC
    `).all(today, currentTime, in30Min);
    
    const upcomingIds = rows.map(r => r.id);
    res.json({ code: 0, data: { list: rows, upcomingIds } });
  } catch (e) {
    logger.error('查询即将到店预约失败', e);
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
      SELECT a.*, st.name as staff_name, w.name as workstation_name
      FROM appointments a
      LEFT JOIN staff st ON st.id = a.staff_id
      LEFT JOIN workstations w ON w.id = a.workstation_id
      WHERE a.appointment_date = ? AND a.status NOT IN ('已取消', '已完成')
    `).all(appointment_date);
    
    let finalStaffId = staff_id;
    let finalWsId = workstation_id;
    
    const conflictDetails = [];
    
    for (const apt of appointments) {
      if (hasTimeOverlap(start_time, end_time, apt.start_time, apt.end_time)) {
        if (apt.staff_id) {
          conflictDetails.push(`时段 ${apt.start_time}-${apt.end_time} 美容师【${apt.staff_name || 'ID:'+apt.staff_id}】已被预约号 ${apt.appointment_no} 占用`);
        }
        if (apt.workstation_id) {
          conflictDetails.push(`时段 ${apt.start_time}-${apt.end_time} 工位【${apt.workstation_name || 'ID:'+apt.workstation_id}】已被预约号 ${apt.appointment_no} 占用`);
        }
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
      if (!available) {
        const busyStaffNames = appointments
          .filter(apt => hasTimeOverlap(start_time, end_time, apt.start_time, apt.end_time) && apt.staff_id)
          .map(apt => apt.staff_name || 'ID:'+apt.staff_id);
        return res.json({ 
          code: -1, 
          message: `所选时段美容师均已排满`,
          conflicts: conflictDetails.length ? conflictDetails : [`所有美容师在 ${start_time}-${end_time} 时段均已被占用`]
        });
      }
      finalStaffId = available.id;
    }
    
    if (!finalWsId) {
      const wsList = db.prepare('SELECT * FROM workstations WHERE is_active = 1').all();
      const busyWsIds = appointments
        .filter(apt => hasTimeOverlap(start_time, apt.start_time, apt.end_time))
        .map(apt => apt.workstation_id)
        .filter(Boolean);
      const available = wsList.find(w => !busyWsIds.includes(w.id));
      if (!available) {
        return res.json({ 
          code: -1, 
          message: `所选时段工位均已占用`,
          conflicts: conflictDetails.length ? conflictDetails : [`所有工位在 ${start_time}-${end_time} 时段均已被占用`]
        });
      }
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

function generateOrderNo(type) {
  const prefix = type === 'appointment' ? 'OA' : type === 'boarding' ? 'OB' : type === 'product' ? 'OP' : 'O';
  return prefix + dayjs().format('YYYYMMDDHHmmss') + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
}

router.put('/:id/status', (req, res) => {
  try {
    const { status, service_remark } = req.body;
    const appointmentId = req.params.id;
    
    const apt = db.prepare(`
      SELECT a.*, s.name as service_name, s.price as service_price, s.category,
             p.name as pet_name, c.name as customer_name, c.phone
      FROM appointments a
      LEFT JOIN services s ON s.id = a.service_id
      LEFT JOIN pets p ON p.id = a.pet_id
      LEFT JOIN customers c ON c.id = a.customer_id
      WHERE a.id = ?
    `).get(appointmentId);
    
    if (!apt) {
      return res.json({ code: -1, message: '预约不存在' });
    }
    
    const transaction = db.transaction(() => {
      if (status === '已完成') {
        db.prepare(`UPDATE appointments SET status=?, service_remark=?, updated_at=datetime('now','localtime') WHERE id=?`)
          .run(status, service_remark || '', appointmentId);
      } else {
        db.prepare(`UPDATE appointments SET status=?, updated_at=datetime('now','localtime') WHERE id=?`)
          .run(status, appointmentId);
      }
      
      if (status === '已完成') {
        const existingOrder = db.prepare('SELECT id FROM orders WHERE source_id = ? AND type = ?').get(appointmentId, 'appointment');
        
        if (!existingOrder) {
          const order_no = generateOrderNo('appointment');
          const total_amount = apt.service_price || 0;
          const pay_amount = total_amount;
          
          const orderResult = db.prepare(`
            INSERT INTO orders (order_no, customer_id, type, source_id, total_amount, discount_amount, 
              pay_amount, pay_method, status, remark)
            VALUES (?, ?, 'appointment', ?, ?, 0, ?, NULL, '待结算', ?)
          `).run(order_no, apt.customer_id, appointmentId, total_amount, pay_amount, 
                 `预约服务：${apt.service_name}，宠物：${apt.pet_name}，预约号：${apt.appointment_no}`);
          
          const orderId = orderResult.lastInsertRowid;
          
          db.prepare(`
            INSERT INTO order_items (order_id, item_name, item_type, quantity, unit_price, subtotal)
            VALUES (?, ?, 'service', 1, ?, ?)
          `).run(orderId, apt.service_name || '美容服务', apt.service_price || 0, apt.service_price || 0);
        }
      }
    });
    
    transaction();
    
    const resultMsg = status === '已完成' ? '服务已完成，已自动生成待结算订单' : '状态更新成功';
    res.json({ code: 0, message: resultMsg, orderCreated: status === '已完成' });
  } catch (e) {
    logger.error('更新预约状态失败', e);
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
