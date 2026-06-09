const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const logger = require('./logger');

const dbDir = path.dirname(config.database.path);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(config.database.path);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

logger.info(`数据库连接成功: ${config.database.path}`);

function initDatabase() {
  const createTables = [
    `CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      address TEXT,
      remark TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )`,
    `CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER UNIQUE NOT NULL,
      member_no TEXT UNIQUE NOT NULL,
      balance REAL DEFAULT 0,
      points INTEGER DEFAULT 0,
      level TEXT DEFAULT '普通',
      join_date TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS pets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      species TEXT NOT NULL,
      breed TEXT,
      gender TEXT,
      birthday TEXT,
      weight REAL,
      body_type TEXT,
      special_habit TEXT,
      allergy TEXT,
      photo TEXT,
      remark TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      duration INTEGER NOT NULL,
      price REAL NOT NULL,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )`,
    `CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      position TEXT,
      phone TEXT,
      skills TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )`,
    `CREATE TABLE IF NOT EXISTS workstations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT,
      status TEXT DEFAULT '空闲',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )`,
    `CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      appointment_no TEXT UNIQUE NOT NULL,
      pet_id INTEGER NOT NULL,
      customer_id INTEGER NOT NULL,
      service_id INTEGER NOT NULL,
      staff_id INTEGER,
      workstation_id INTEGER,
      appointment_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      status TEXT DEFAULT '待确认',
      remark TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      FOREIGN KEY (service_id) REFERENCES services(id),
      FOREIGN KEY (staff_id) REFERENCES staff(id),
      FOREIGN KEY (workstation_id) REFERENCES workstations(id)
    )`,
    `CREATE TABLE IF NOT EXISTS boarding (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      boarding_no TEXT UNIQUE NOT NULL,
      pet_id INTEGER NOT NULL,
      customer_id INTEGER NOT NULL,
      check_in_date TEXT NOT NULL,
      check_in_time TEXT NOT NULL,
      expected_check_out_date TEXT NOT NULL,
      expected_check_out_time TEXT NOT NULL,
      actual_check_out_date TEXT,
      actual_check_out_time TEXT,
      room_no TEXT,
      daily_fee REAL NOT NULL,
      deposit REAL DEFAULT 0,
      status TEXT DEFAULT '在住',
      remark TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS boarding_daily_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      boarding_id INTEGER NOT NULL,
      record_date TEXT NOT NULL,
      food_condition TEXT,
      mood TEXT,
      health_status TEXT,
      walk_info TEXT,
      other_notes TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (boarding_id) REFERENCES boarding(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT UNIQUE NOT NULL,
      customer_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      source_id INTEGER,
      total_amount REAL NOT NULL,
      discount_amount REAL DEFAULT 0,
      pay_amount REAL NOT NULL,
      pay_method TEXT,
      use_points INTEGER DEFAULT 0,
      use_balance REAL DEFAULT 0,
      earn_points INTEGER DEFAULT 0,
      status TEXT DEFAULT '已完成',
      remark TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      item_name TEXT NOT NULL,
      item_type TEXT,
      quantity INTEGER DEFAULT 1,
      unit_price REAL NOT NULL,
      subtotal REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT,
      barcode TEXT,
      stock INTEGER DEFAULT 0,
      price REAL NOT NULL,
      cost_price REAL DEFAULT 0,
      unit TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )`,
    `CREATE TABLE IF NOT EXISTS points_exchange (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      points_used INTEGER NOT NULL,
      reward TEXT NOT NULL,
      exchange_date TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    )`
  ];

  const transaction = db.transaction(() => {
    createTables.forEach(sql => db.exec(sql));
    logger.info('数据库表初始化完成');
  });
  
  transaction();
}

function seedInitialData() {
  const servicesCount = db.prepare('SELECT COUNT(*) as cnt FROM services').get().cnt;
  if (servicesCount === 0) {
    const insertService = db.prepare(`
      INSERT INTO services (name, category, duration, price, description) VALUES (?, ?, ?, ?, ?)
    `);
    const services = [
      ['基础洗护', '洗护', 60, 88, '包含洗澡、吹干、基础梳理'],
      ['精致洗护', '洗护', 90, 158, '包含洗澡、吹干、深度护理、修剪指甲'],
      ['SPA护理', '洗护', 120, 258, '专业SPA护理，精油按摩'],
      ['基础美容', '美容', 90, 128, '基础造型修剪'],
      ['造型美容', '美容', 150, 268, '精美造型设计与修剪'],
      ['赛级美容', '美容', 240, 588, '专业赛级造型'],
      ['日间寄养', '寄养', 480, 68, '日间寄养8小时'],
      ['夜间寄养', '寄养', 1440, 128, '过夜寄养24小时']
    ];
    const transaction = db.transaction(() => {
      services.forEach(s => insertService.run(...s));
      logger.info('服务项目初始化完成');
    });
    transaction();
  }

  const staffCount = db.prepare('SELECT COUNT(*) as cnt FROM staff').get().cnt;
  if (staffCount === 0) {
    const insertStaff = db.prepare(`
      INSERT INTO staff (name, position, phone, skills) VALUES (?, ?, ?, ?)
    `);
    const staff = [
      ['张美容师', '高级美容师', '13800000001', '洗护,美容,SPA'],
      ['李美容师', '美容师', '13800000002', '洗护,美容'],
      ['王护理员', '护理员', '13800000003', '洗护,寄养护理']
    ];
    const transaction = db.transaction(() => {
      staff.forEach(s => insertStaff.run(...s));
      logger.info('员工信息初始化完成');
    });
    transaction();
  }

  const workstationCount = db.prepare('SELECT COUNT(*) as cnt FROM workstations').get().cnt;
  if (workstationCount === 0) {
    const insertWs = db.prepare(`
      INSERT INTO workstations (name, type) VALUES (?, ?)
    `);
    const workstations = [
      ['1号洗护台', '洗护'],
      ['2号洗护台', '洗护'],
      ['1号美容台', '美容'],
      ['2号美容台', '美容'],
      ['SPA间', 'SPA'],
      ['寄养区A', '寄养'],
      ['寄养区B', '寄养']
    ];
    const transaction = db.transaction(() => {
      workstations.forEach(w => insertWs.run(...w));
      logger.info('工位信息初始化完成');
    });
    transaction();
  }

  const productsCount = db.prepare('SELECT COUNT(*) as cnt FROM products').get().cnt;
  if (productsCount === 0) {
    const insertProduct = db.prepare(`
      INSERT INTO products (name, category, barcode, stock, price, cost_price, unit) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const products = [
      ['皇家狗粮 2kg', '主粮', '6900000000001', 50, 168, 120, '袋'],
      ['渴望猫粮 1.8kg', '主粮', '6900000000002', 30, 218, 160, '袋'],
      ['宠物零食大礼包', '零食', '6900000000003', 80, 58, 35, '包'],
      ['宠物驱虫药', '药品', '6900000000004', 100, 88, 55, '盒'],
      ['宠物沐浴露', '日用品', '6900000000005', 40, 68, 42, '瓶'],
      ['宠物牵引绳', '日用品', '6900000000006', 60, 45, 28, '条'],
      ['猫砂 10L', '日用品', '6900000000007', 70, 38, 22, '袋']
    ];
    const transaction = db.transaction(() => {
      products.forEach(p => insertProduct.run(...p));
      logger.info('商品信息初始化完成');
    });
    transaction();
  }
}

module.exports = {
  db,
  initDatabase,
  seedInitialData
};
