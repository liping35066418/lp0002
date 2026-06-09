const express = require('express');
const router = express.Router();
const dayjs = require('dayjs');
const { db } = require('../utils/database');
const logger = require('../utils/logger');
const config = require('../utils/config');

function generateMemberNo() {
  return 'M' + dayjs().format('YYYYMMDD') + Math.floor(Math.random() * 10000).toString().padStart(4, '0');
}

function generateOrderNo(type) {
  const prefix = type === 'appointment' ? 'OA' : type === 'boarding' ? 'OB' : type === 'product' ? 'OP' : 'O';
  return prefix + dayjs().format('YYYYMMDDHHmmss') + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
}

router.get('/members', (req, res) => {
  try {
    const { page = 1, pageSize = 20, keyword } = req.query;
    const offset = (page - 1) * pageSize;
    
    const clauses = [];
    const params = [];
    if (keyword) {
      clauses.push('(c.name LIKE ? OR c.phone LIKE ? OR m.member_no LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    const where = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';
    
    const total = db.prepare(`
      SELECT COUNT(*) as cnt FROM members m
      LEFT JOIN customers c ON c.id = m.customer_id
      ${where}
    `).get(...params).cnt;
    
    const rows = db.prepare(`
      SELECT m.*, c.name, c.phone
      FROM members m
      LEFT JOIN customers c ON c.id = m.customer_id
      ${where}
      ORDER BY m.join_date DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(pageSize), offset);
    
    res.json({ code: 0, data: { list: rows, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
  } catch (e) {
    res.json({ code: -1, message: e.message });
  }
});

router.post('/members', (req, res) => {
  try {
    const { customer_id, balance = 0 } = req.body;
    if (!customer_id) return res.json({ code: -1, message: '客户ID必填' });
    
    const exists = db.prepare('SELECT id FROM members WHERE customer_id = ?').get(customer_id);
    if (exists) return res.json({ code: -1, message: '该客户已是会员' });
    
    const member_no = generateMemberNo();
    const result = db.prepare(`
      INSERT INTO members (customer_id, member_no, balance, points, level) VALUES (?, ?, ?, 0, '普通')
    `).run(customer_id, member_no, balance);
    
    res.json({ code: 0, data: { id: result.lastInsertRowid, member_no }, message: '开卡成功' });
  } catch (e) {
    res.json({ code: -1, message: e.message });
  }
});

router.post('/members/:id/recharge', (req, res) => {
  try {
    const { amount, type = '充值' } = req.body;
    if (!amount || amount <= 0) return res.json({ code: -1, message: '金额无效' });
    
    const member = db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id);
    if (!member) return res.json({ code: -1, message: '会员不存在' });
    
    const transaction = db.transaction(() => {
      db.prepare('UPDATE members SET balance = balance + ? WHERE id = ?').run(amount, req.params.id);
      
      const orderNo = generateOrderNo('recharge');
      db.prepare(`
        INSERT INTO orders (order_no, customer_id, type, total_amount, discount_amount, pay_amount, pay_method, status, remark)
        VALUES (?, ?, '充值', ?, 0, ?, '余额充值', '已完成', ?)
      `).run(orderNo, member.customer_id, amount, amount, `${type}${amount}元`);
      
      db.prepare(`
        INSERT INTO order_items (order_id, item_name, item_type, quantity, unit_price, subtotal)
        VALUES ((SELECT last_insert_rowid()), ?, '充值', 1, ?, ?)
      `).run(type, amount, amount);
    });
    
    transaction();
    res.json({ code: 0, message: '充值成功' });
  } catch (e) {
    res.json({ code: -1, message: e.message });
  }
});

router.post('/members/:id/exchange', (req, res) => {
  try {
    const { points, reward } = req.body;
    if (!points || !reward) return res.json({ code: -1, message: '参数不完整' });
    
    const member = db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id);
    if (!member) return res.json({ code: -1, message: '会员不存在' });
    if (member.points < points) return res.json({ code: -1, message: '积分不足' });
    
    const transaction = db.transaction(() => {
      db.prepare('UPDATE members SET points = points - ? WHERE id = ?').run(points, req.params.id);
      db.prepare(`
        INSERT INTO points_exchange (customer_id, points_used, reward) VALUES (?, ?, ?)
      `).run(member.customer_id, points, reward);
    });
    
    transaction();
    res.json({ code: 0, message: '兑换成功' });
  } catch (e) {
    res.json({ code: -1, message: e.message });
  }
});

router.get('/orders', (req, res) => {
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

router.get('/orders/:id', (req, res) => {
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

router.post('/checkout', (req, res) => {
  try {
    const { customer_id, type, source_id, items, pay_method = '现金', use_balance = 0, use_points = 0, discount_amount = 0, remark } = req.body;
    
    if (!customer_id || !items || items.length === 0) {
      return res.json({ code: -1, message: '参数不完整' });
    }
    
    let total_amount = 0;
    const processedItems = items.map(it => {
      const subtotal = (it.unit_price || 0) * (it.quantity || 1);
      total_amount += subtotal;
      return { ...it, subtotal };
    });
    
    const member = db.prepare('SELECT * FROM members WHERE customer_id = ?').get(customer_id);
    let actual_use_balance = 0;
    let actual_use_points = 0;
    
    if (member) {
      if (use_balance > 0 && member.balance >= use_balance) {
        actual_use_balance = use_balance;
      } else if (use_balance > 0) {
        actual_use_balance = member.balance;
      }
      if (use_points > 0 && member.points >= use_points) {
        actual_use_points = use_points;
      }
    }
    
    const points_value = actual_use_points;
    const pay_amount = Math.max(0, total_amount - discount_amount - actual_use_balance - points_value);
    const earn_points = Math.floor(pay_amount * config.business.defaultPointsRate);
    
    const order_no = generateOrderNo(type);
    
    const transaction = db.transaction(() => {
      const orderResult = db.prepare(`
        INSERT INTO orders (order_no, customer_id, type, source_id, total_amount, discount_amount, 
          pay_amount, pay_method, use_points, use_balance, earn_points, status, remark)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '已完成', ?)
      `).run(order_no, customer_id, type, source_id || null, total_amount, discount_amount,
             pay_amount, pay_method, actual_use_points, actual_use_balance, earn_points, remark || '');
      
      const orderId = orderResult.lastInsertRowid;
      const insertItem = db.prepare(`
        INSERT INTO order_items (order_id, item_name, item_type, quantity, unit_price, subtotal)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      processedItems.forEach(it => {
        insertItem.run(orderId, it.item_name, it.item_type || type, it.quantity || 1, it.unit_price || 0, it.subtotal);
      });
      
      if (member) {
        if (actual_use_balance > 0) {
          db.prepare('UPDATE members SET balance = balance - ? WHERE id = ?').run(actual_use_balance, member.id);
        }
        if (actual_use_points > 0) {
          db.prepare('UPDATE members SET points = points - ? WHERE id = ?').run(actual_use_points, member.id);
        }
        if (earn_points > 0) {
          db.prepare('UPDATE members SET points = points + ? WHERE id = ?').run(earn_points, member.id);
        }
      }
    });
    
    transaction();
    
    logger.info(`订单结算完成: ${order_no}, 金额: ${pay_amount}`);
    res.json({ 
      code: 0, 
      data: { 
        order_no, 
        total_amount, 
        discount_amount, 
        use_balance: actual_use_balance, 
        use_points: actual_use_points, 
        pay_amount, 
        earn_points 
      }, 
      message: '结算成功' 
    });
  } catch (e) {
    logger.error('结算失败', e);
    res.json({ code: -1, message: e.message });
  }
});

module.exports = router;
