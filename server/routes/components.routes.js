const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { requireAuth } = require('../middleware/auth');

// GET /api/components — Public active components for customer website
router.get('/', async (req, res) => {
  try {
    const components = await db.all(`
      SELECT * FROM modular_components
      WHERE is_enabled = 1 AND is_deleted = 0
      ORDER BY display_order ASC
    `);

    res.json({
      success: true,
      count: components.length,
      components: components.map(c => ({
        ...c,
        config: typeof c.config_json === 'string' ? JSON.parse(c.config_json || '{}') : (c.config_json || {})
      }))
    });
  } catch (err) {
    console.error('Error fetching modular components:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/components/admin — Admin list (including soft-deleted components for Undo!)
router.get('/admin', requireAuth, async (req, res) => {
  try {
    const allComponents = await db.all(`
      SELECT * FROM modular_components
      ORDER BY is_deleted ASC, display_order ASC
    `);

    res.json({
      success: true,
      components: allComponents.map(c => ({
        ...c,
        config: typeof c.config_json === 'string' ? JSON.parse(c.config_json || '{}') : (c.config_json || {})
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/components — Add New Component (Admin Only)
router.post('/', requireAuth, async (req, res) => {
  try {
    const type = req.body.type || req.body.component_type;
    const title = req.body.title;
    const subtitle = req.body.subtitle;
    const badge = req.body.badge;
    const config = req.body.config;

    if (!type || !title) {
      return res.status(400).json({ success: false, message: 'Component type and title are required.' });
    }

    const compId = `comp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const maxOrderRes = await db.get('SELECT MAX(display_order) as max_order FROM modular_components WHERE is_deleted = 0');
    const displayOrder = (maxOrderRes.max_order || 0) + 1;

    const result = await db.run(
      `INSERT INTO modular_components (
        component_id, type, title, subtitle, badge, display_order, is_enabled, config_json, is_deleted
      ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, 0)`,
      [
        compId,
        type,
        title.trim(),
        subtitle ? subtitle.trim() : null,
        badge ? badge.trim() : null,
        displayOrder,
        JSON.stringify(config || {})
      ]
    );

    res.status(201).json({
      success: true,
      message: 'New component added to website successfully!',
      id: result.lastID,
      componentId: result.lastID,
      component_id: compId
    });
  } catch (err) {
    console.error('Error adding component:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/components/:id — Edit Component (Admin Only)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, subtitle, badge, is_enabled, is_active, config } = req.body;

    const existing = await db.get('SELECT * FROM modular_components WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Component not found.' });
    }

    const enabledFlag = is_enabled !== undefined ? (is_enabled ? 1 : 0) : (is_active !== undefined ? (is_active ? 1 : 0) : null);

    await db.run(
      `UPDATE modular_components SET
        title = COALESCE(?, title),
        subtitle = COALESCE(?, subtitle),
        badge = COALESCE(?, badge),
        is_enabled = COALESCE(?, is_enabled),
        config_json = COALESCE(?, config_json),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        title != null ? title.trim() : null,
        subtitle != null ? subtitle.trim() : null,
        badge != null ? badge.trim() : null,
        enabledFlag,
        config ? JSON.stringify(config) : null,
        id
      ]
    );

    res.json({ success: true, message: 'Component updated successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/components/:id — Soft Delete Component (Allows Undo!)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await db.get('SELECT * FROM modular_components WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ success: false, message: 'Component not found.' });

    // Soft delete: sets is_deleted = 1
    await db.run('UPDATE modular_components SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);

    res.json({
      success: true,
      message: `Component "${existing.title}" deleted. You can undo this action anytime from the deleted list.`,
      deleted_id: id
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/components/:id/undo — Undo Delete (Restores Component!)
router.post('/:id/undo', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await db.get('SELECT * FROM modular_components WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ success: false, message: 'Component not found.' });

    // Restore component
    await db.run('UPDATE modular_components SET is_deleted = 0, is_enabled = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);

    res.json({
      success: true,
      message: `Action undone! Component "${existing.title}" restored to website.`,
      restored_id: id
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/components/reorder — Reorder components (Admin Only)
router.put('/reorder', requireAuth, async (req, res) => {
  try {
    const { orderedIds } = req.body; // array of integer ids
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ success: false, message: 'orderedIds array required.' });
    }

    for (let i = 0; i < orderedIds.length; i++) {
      await db.run('UPDATE modular_components SET display_order = ? WHERE id = ?', [i + 1, orderedIds[i]]);
    }

    res.json({ success: true, message: 'Components order updated successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
