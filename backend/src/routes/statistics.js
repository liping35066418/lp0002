const express = require('express');
const dayjs = require('dayjs');
const router = express.Router();
const { db } = require('../utils/database');

router.get('/overview', (req, res) => {
  try {
    const today = dayjs().format('YYYY-MM-DD');
    
    const todayRevenue = db.prepare(`
      SELECT COALESCE(SUM(pay_amount), 0) as total
      FROM orders WHERE date(created_at) = ? AND status = '已完成'
    `).get(today).total;
    
    const todayOrders = db.prepare(`
      SELECT COUNT(*) as cnt FROM orders WHERE date(created_at) = ?
    `).get(today).cnt;
    
    const todayAppointments = db.prepare(`
      SELECT COUNT(*) as cnt FROM appointments WHERE appointment_date = ? AND status NOT IN ('已取消')
    `).get(today).cnt;
    
    const boardingCount = db.prepare(`
      SELECT COUNT(*) as cnt FROM boarding WHERE status = '在住'
    `).get().cnt;
    
    const memberCount = db.prepare('SELECT COUNT(*) as cnt FROM members').get().cnt;
    const petCount = db.prepare('SELECT COUNT(*) as cnt FROM pets').get().cnt;
    
    const monthRevenue = db.prepare(`
      SELECT COALESCE(SUM(pay_amount), 0) as total
      FROM orders WHERE strftime('%Y-%m', created_at) = ? AND status = '已完成'
    `).get(dayjs().format('YYYY-MM')).total;
    
    res.json({
      code: 0,
      data: {
        today_revenue: todayRevenue,
        today_orders: todayOrders,
        today_appointments: todayAppointments,
        boarding_count: boardingCount,
        member_count: memberCount,
        pet_count: petCount,
        month_revenue: monthRevenue
      }
    });
  } catch (e) {
    res.json({ code: -1, message: e.message });
  }
});

router.get('/revenue-trend', (req, res) => {
  try {
    const { days = 7 } = req.query;
    const dates = [];
    const revenueData = [];
    const orderData = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const d = dayjs().subtract(i, 'day').format('YYYY-MM-DD');
      dates.push(d);
      
      const rev = db.prepare(`
        SELECT COALESCE(SUM(pay_amount), 0) as total, COUNT(*) as cnt
        FROM orders WHERE date(created_at) = ? AND status = '已完成'
      `).get(d);
      
      revenueData.push(rev.total);
      orderData.push(rev.cnt);
    }
    
    res.json({ code: 0, data: { dates, revenue: revenueData, orders: orderData } });
  } catch (e) {
    res.json({ code: -1, message: e.message });
  }
});

router.get('/service-stats', (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const clauses = ["status = '已完成'"];
    const params = [];
    
    if (startDate) { clauses.push("date(created_at) >= ?"); params.push(startDate); }
    if (endDate) { clauses.push("date(created_at) <= ?"); params.push(endDate); }
    const where = 'WHERE ' + clauses.join(' AND ');
    
    const typeStats = db.prepare(`
      SELECT type, COUNT(*) as count, COALESCE(SUM(pay_amount), 0) as revenue
      FROM orders ${where}
      GROUP BY type ORDER BY count DESC
    `).all(...params);
    
    const serviceItemStats = db.prepare(`
      SELECT oi.item_type as category, COUNT(*) as count, COALESCE(SUM(oi.subtotal), 0) as revenue
      FROM order_items oi
      LEFT JOIN orders o ON o.id = oi.order_id
      WHERE o.status = '已完成' ${startDate ? "AND date(o.created_at) >= ?" : ""} ${endDate ? "AND date(o.created_at) <= ?" : ""}
      GROUP BY oi.item_type ORDER BY count DESC
    `).all(...params);
    
    res.json({ code: 0, data: { by_type: typeStats, by_category: serviceItemStats } });
  } catch (e) {
    res.json({ code: -1, message: e.message });
  }
});

router.get('/top-customers', (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const rows = db.prepare(`
      SELECT c.id, c.name, c.phone, 
             COUNT(o.id) as order_count, 
             COALESCE(SUM(o.pay_amount), 0) as total_spent,
             m.points, m.balance
      FROM customers c
      LEFT JOIN orders o ON o.customer_id = c.id AND o.status = '已完成'
      LEFT JOIN members m ON m.customer_id = c.id
      GROUP BY c.id
      ORDER BY total_spent DESC
      LIMIT ?
    `).all(parseInt(limit));
    
    res.json({ code: 0, data: rows });
  } catch (e) {
    res.json({ code: -1, message: e.message });
  }
});

router.get('/staff-stats', (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const clauses = ["a.status IN ('已完成','服务中')"];
    const params = [];
    
    if (startDate) { clauses.push("a.appointment_date >= ?"); params.push(startDate); }
    if (endDate) { clauses.push("a.appointment_date <= ?"); params.push(endDate); }
    const where = 'WHERE ' + clauses.join(' AND ');
    
    const rows = db.prepare(`
      SELECT s.id, s.name, s.position,
             COUNT(a.id) as service_count,
             COALESCE(SUM(sv.price), 0) as total_revenue
      FROM staff s
      LEFT JOIN appointments a ON a.staff_id = s.id ${where.replace('WHERE', 'AND')}
      LEFT JOIN services sv ON sv.id = a.service_id
      GROUP BY s.id
      ORDER BY service_count DESC
    `).all();
    
    res.json({ code: 0, data: rows });
  } catch (e) {
    res.json({ code: -1, message: e.message });
  }
});

module.exports = router;
