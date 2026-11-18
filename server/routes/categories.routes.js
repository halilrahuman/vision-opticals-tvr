const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { requireAuth } = require('../middleware/auth');

// GET /api/categories — All categories with product counts
router.get('/', async (req, res) => {
  try {
    const categories = await db.all(`
      SELECT
        c.*,
        COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON c.slug = p.category_slug AND p.is_published = 1
      GROUP BY c.id
      ORDER BY c.sort_order ASC
    `);
    res.json({ success: true, categories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/categories/brands — All brands with product counts
router.get('/brands', async (req, res) => {
  try {
    const brands = await db.all(`
      SELECT
        b.*,
        COUNT(p.id) as product_count
      FROM brands b
      LEFT JOIN products p ON LOWER(b.name) = LOWER(p.brand) AND p.is_published = 1
      GROUP BY b.id
      ORDER BY b.is_featured DESC, b.name ASC
    `);
    res.json({ success: true, brands });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/categories/brands — Add brand (Admin Only)
router.post('/brands', requireAuth, async (req, res) => {
  try {
    const { name, is_featured } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Brand name is required.' });
    }
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const existing = await db.get('SELECT id FROM brands WHERE slug = ?', [slug]);
    if (existing) {
      return res.status(400).json({ success: false, message: `Brand "${name.trim()}" already exists.` });
    }

    await db.run(
      'INSERT INTO brands (name, slug, is_featured) VALUES (?, ?, ?)',
      [name.trim(), slug, is_featured ? 1 : 0]
    );
    res.status(201).json({ success: true, message: 'Brand added successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
