// server/config/config.js
require('dotenv').config();

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  mongoURI: process.env.MONGO_URI || 'mongodb://localhost:27017/tech-stack-roadmap',
  jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret'
};