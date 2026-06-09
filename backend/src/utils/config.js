const path = require('path');
const fs = require('fs');

const configPath = path.resolve(__dirname, '../../../config/app.config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

config.database.path = path.resolve(__dirname, '../../..', config.database.path);
config.logging.dir = path.resolve(__dirname, '../../..', config.logging.dir);

module.exports = config;
