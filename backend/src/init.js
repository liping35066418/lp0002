const { initDatabase, seedInitialData } = require('./utils/database');
const logger = require('./utils/logger');

console.log('🔧 开始初始化数据库...');
initDatabase();
seedInitialData();
console.log('✅ 数据库初始化完成！');
logger.info('数据库初始化脚本执行完成');
