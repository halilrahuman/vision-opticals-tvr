const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { requireAuth } = require('../middleware/auth');
const inventoryService = require('../services/inventoryService');

// GET /api/inventory — List inventory with status filter
router.get('/', requireAuth, async (req, res) => {
  try {
    const { status, search } = req.query;

    let sql = `
      SELECT
        p.id as product_id,
        p.name as product_name,
        p.category_slug,
        p.brand,
        p.primary_image,
        p.price,
        p.is_published,
        i.quantity,
        i.quantity as stock_quantity,
        i.low_stock_threshold,
        i.sku,
        i.updated_at
      FROM products p
      LEFT JOIN inventory i ON p.id = i.product_id
      WHERE 1=1
    `;
    const params = [];

    if (search && search.trim()) {
      sql += ' AND (LOWER(p.name) LIKE ? OR LOWER(p.brand) LIKE ? OR LOWER(i.sku) LIKE ?)';
      const q = `%${search.trim().toLowerCase()}%`;
      params.push(q, q, q);
    }

    if (status === 'out_of_stock') {
      sql += ' AND i.quantity = 0';
    } else if (status === 'low_stock') {
      sql += ' AND i.quantity > 0 AND i.quantity <= i.low_stock_threshold';
    } else if (status === 'in_stock') {
      sql += ' AND i.quantity > i.low_stock_threshold';
    }

    sql += ' ORDER BY i.quantity ASC, p.name ASC';

    const items = await db.all(sql, params);
    res.json({
      success: true,
      count: items.length,
      items: items.map(item => ({
        ...item,
        quantity: item.quantity != null ? item.quantity : 0,
        stock_quantity: item.quantity != null ? item.quantity : 0,
        is_out_of_stock: item.quantity === 0,
        is_low_stock: item.quantity > 0 && item.quantity <= (item.low_stock_threshold || 3)
      }))
    });
  } catch (err) {
    console.error('Error fetching inventory:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/inventory/summary — KPI Statistics
router.get('/summary', requireAuth, async (req, res) => {
  try {
    const summary = await inventoryService.getInventorySummary();
    res.json({ success: true, summary });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/inventory/adjust — Delta +/- adjustment
router.post('/adjust', requireAuth, async (req, res) => {
  try {
    const { productId, delta, reason } = req.body;
    if (!productId || delta == null) {
      return res.status(400).json({ success: false, message: 'Product ID and delta amount are required.' });
    }

    const result = await inventoryService.adjustStock(
      parseInt(productId, 10),
      parseInt(delta, 10),
      reason || 'Manual Adjustment',
      req.user.name || req.user.username || 'Admin'
    );

    res.json({ success: true, message: 'Stock adjusted successfully!', ...result });
  } catch (err) {
    console.error('Error adjusting stock:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/inventory/set — Direct quantity override
router.post('/set', requireAuth, async (req, res) => {
  try {
    const { productId, quantity, lowStockThreshold, reason } = req.body;
    if (!productId || quantity == null) {
      return res.status(400).json({ success: false, message: 'Product ID and new quantity are required.' });
    }

    const result = await inventoryService.setStock(
      parseInt(productId, 10),
      parseInt(quantity, 10),
      reason || 'Stock Update',
      req.user.name || req.user.username || 'Admin'
    );

    if (lowStockThreshold != null) {
      await db.run('UPDATE inventory SET low_stock_threshold = ? WHERE product_id = ?', [
        parseInt(lowStockThreshold, 10) || 3,
        productId
      ]);
    }

    res.json({ success: true, message: 'Stock updated successfully!', ...result });
  } catch (err) {
    console.error('Error setting stock:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/inventory/logs/:productId — Logs for single product
router.get('/logs/:productId', requireAuth, async (req, res) => {
  try {
    const { productId } = req.params;
    const logs = await db.all(
      'SELECT *, created_at as timestamp FROM inventory_logs WHERE product_id = ? ORDER BY created_at DESC LIMIT 50',
      [productId]
    );
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/inventory/logs — Global recent activity logs
router.get('/logs', requireAuth, async (req, res) => {
  try {
    const logs = await db.all(`
      SELECT
        l.*,
        l.created_at as timestamp,
        p.name as product_name,
        p.category_slug,
        p.primary_image
      FROM inventory_logs l
      LEFT JOIN products p ON l.product_id = p.id
      ORDER BY l.created_at DESC
      LIMIT 100
    `);
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
