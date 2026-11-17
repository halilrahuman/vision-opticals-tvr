const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const { initSchema } = require('./db/database');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Static files from public directory
app.use(express.static(config.PUBLIC_DIR));

// Explicit route for /admin and any sub-path -> serves admin.html
app.get(/^\/admin(\/.*)?$/, (req, res) => {
  res.sendFile(path.join(config.PUBLIC_DIR, 'admin.html'));
});

// API Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/products', require('./routes/products.routes'));
app.use('/api/categories', require('./routes/categories.routes'));
app.use('/api/inventory', require('./routes/inventory.routes'));
app.use('/api/offers', require('./routes/offers.routes'));
app.use('/api/content', require('./routes/content.routes'));
app.use('/api/settings', require('./routes/settings.routes'));
app.use('/api/upload', require('./routes/upload.routes'));
app.use('/api/bulk', require('./routes/bulk.routes'));
app.use('/api/appointments', require('./routes/appointments.routes'));
app.use('/api/orders', require('./routes/orders.routes'));
app.use('/api/components', require('./routes/components.routes'));

// Healthcheck API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    store: 'Vision Opticals',
    timestamp: new Date().toISOString()
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Start Server
async function startServer() {
  await initSchema();
  return new Promise((resolve) => {
    const server = app.listen(config.PORT, () => {
      console.log(`\n======================================================`);
      console.log(`🚀 Vision Opticals Server Running on port ${config.PORT}`);
      console.log(`🌐 Customer Website: http://localhost:${config.PORT}/`);
      console.log(`👑 Admin Dashboard:  http://localhost:${config.PORT}/admin`);
      console.log(`======================================================\n`);
      resolve(server);
    });
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
