const path = require('path');
require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  JWT_SECRET: process.env.JWT_SECRET || 'vision_opticals_secret_key_secure_2026_tvr',
  DB_PATH: process.env.DB_PATH || path.join(__dirname, '../../data/vision_opticals.db'),
  UPLOAD_DIR: process.env.UPLOAD_DIR || path.join(__dirname, '../../public/uploads'),
  PUBLIC_DIR: path.join(__dirname, '../../public')
};
