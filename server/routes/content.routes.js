const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { requireAuth } = require('../middleware/auth');

// GET /api/content/homepage — Public sections for customer site
router.get('/homepage', async (req, res) => {
  try {
    const sections = await db.all(`
      SELECT * FROM homepage_sections
      WHERE is_enabled = 1
      ORDER BY display_order ASC
    `);

    const formatted = sections.map(s => ({
      ...s,
      is_enabled: Boolean(s.is_enabled),
      config: typeof s.config === 'string' ? JSON.parse(s.config || '{}') : (s.config || {})
    }));

    res.json({ success: true, sections: formatted });
  } catch (err) {
    console.error('Error fetching homepage content:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/content/sections — Admin list (all sections)
router.get('/sections', requireAuth, async (req, res) => {
  try {
    const sections = await db.all('SELECT * FROM homepage_sections ORDER BY display_order ASC');
    const formatted = sections.map(s => ({
      ...s,
      is_enabled: Boolean(s.is_enabled),
      config: typeof s.config === 'string' ? JSON.parse(s.config || '{}') : (s.config || {})
    }));
    res.json({ success: true, sections: formatted });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/content/sections/:key — Update section content & toggle (Admin)
router.put('/sections/:key', requireAuth, async (req, res) => {
  try {
    const { key } = req.params;
    const { title, subtitle, badge, is_enabled, config: sectionConfig } = req.body;

    const existing = await db.get('SELECT * FROM homepage_sections WHERE section_key = ?', [key]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Section not found.' });
    }

    const configStr = sectionConfig != null
      ? (typeof sectionConfig === 'object' ? JSON.stringify(sectionConfig) : sectionConfig)
      : existing.config;

    await db.run(
      `UPDATE homepage_sections SET
        title = ?,
        subtitle = ?,
        badge = ?,
        is_enabled = ?,
        config = ?
      WHERE section_key = ?`,
      [
        title != null ? title : existing.title,
        subtitle != null ? subtitle : existing.subtitle,
        badge != null ? badge : existing.badge,
        is_enabled !== undefined ? (is_enabled ? 1 : 0) : existing.is_enabled,
        configStr,
        key
      ]
    );

    res.json({ success: true, message: `Section "${key}" updated successfully!` });
  } catch (err) {
    console.error('Error updating section:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/content/reorder — Reorder homepage sections (Admin)
router.put('/reorder', requireAuth, async (req, res) => {
  try {
    const { orderedKeys } = req.body; // array of section_key strings in new order
    if (!Array.isArray(orderedKeys)) {
      return res.status(400).json({ success: false, message: 'orderedKeys array is required.' });
    }

    for (let i = 0; i < orderedKeys.length; i++) {
      await db.run('UPDATE homepage_sections SET display_order = ? WHERE section_key = ?', [
        i + 1,
        orderedKeys[i]
      ]);
    }

    res.json({ success: true, message: 'Sections reordered successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
