const express = require('express');
const cors = require('cors');
const config = require('./utils/config');
const logger = require('./utils/logger');
const { initDatabase, seedInitialData } = require('./utils/database');

const app = express();

initDatabase();
seedInitialData();

app.use(cors({
  origin: config.server.corsOrigin,
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url} - ${req.ip}`);
  next();
});

app.get('/api/health', (req, res) => {
  res.json({ code: 0, message: '服务运行正常', data: { timestamp: new Date().toISOString() } });
});

app.use('/api/customers', require('./routes/customers'));
app.use('/api/pets', require('./routes/pets'));
app.use('/api/services', require('./routes/services'));
app.use('/api/staff', require('./routes/staff'));
app.use('/api/workstations', require('./routes/workstations'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/boarding', require('./routes/boarding'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/members', require('./routes/members'));
app.use('/api/products', require('./routes/products'));
app.use('/api/statistics', require('./routes/statistics'));
app.use('/api/notifications', require('./routes/notifications'));

app.use((err, req, res, next) => {
  logger.error(`请求错误: ${req.method} ${req.url}`, err);
  res.status(500).json({ code: -1, message: err.message || '服务器内部错误' });
});

app.use((req, res) => {
  res.status(404).json({ code: 404, message: '接口不存在' });
});

app.listen(config.server.port, config.server.host, () => {
  logger.info(`🚀 宠物门店管理系统后端服务已启动`);
  logger.info(`📡 监听地址: http://${config.server.host}:${config.server.port}`);
  logger.info(`🔒 访问限制: 仅允许本机访问`);
});
