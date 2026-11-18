const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { requireAuth } = require('../middleware/auth');

// GET /api/offers/active — Public endpoint for customer website
router.get('/active', async (req, res) => {
  try {
    const now = new Date().toISOString();
    const offers = await db.all(
      `SELECT * FROM offers
       WHERE is_active = 1
         AND (start_date IS NULL OR start_date <= ?)
         AND (end_date IS NULL OR end_date >= ?)
       ORDER BY id DESC`,
      [now, now]
    );

    res.json({
      success: true,
      count: offers.length,
      offers
    });
  } catch (err) {
    console.error('Error fetching active offers:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/offers — Admin list (all offers with status)
router.get('/', requireAuth, async (req, res) => {
  try {
    const offers = await db.all('SELECT * FROM offers ORDER BY id DESC');
    const now = new Date();

    const formatted = offers.map(o => {
      const isExpired = o.end_date ? new Date(o.end_date) < now : false;
      const isScheduled = o.start_date ? new Date(o.start_date) > now : false;
      let status = 'active';
      if (!o.is_active) status = 'inactive';
      else if (isExpired) status = 'expired';
      else if (isScheduled) status = 'scheduled';

      return {
        ...o,
        status,
        is_expired: isExpired,
        is_scheduled: isScheduled
      };
    });

    res.json({ success: true, count: formatted.length, offers: formatted });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/offers — Create new offer (Admin)
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      title,
      subtitle,
      code,
      discount_type,
      discount_value,
      applicable_category,
      banner_url,
      start_date,
      end_date,
      is_active
    } = req.body;

    if (!title || discount_value == null) {
      return res.status(400).json({ success: false, message: 'Offer title and discount value are required.' });
    }

    const result = await db.run(
      `INSERT INTO offers (
        title, subtitle, code, discount_type, discount_value,
        applicable_category, banner_url, start_date, end_date, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title.trim(),
        subtitle ? subtitle.trim() : null,
        code ? code.trim().toUpperCase() : null,
        discount_type || 'percentage',
        Number(discount_value),
        applicable_category || 'all',
        banner_url || null,
        start_date || new Date().toISOString(),
        end_date || null,
        is_active !== undefined ? (is_active ? 1 : 0) : 1
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Offer created successfully!',
      offerId: result.lastID
    });
  } catch (err) {
    console.error('Error creating offer:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/offers/:id — Edit offer (Admin)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;

    const existing = await db.get('SELECT * FROM offers WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Offer not found.' });
    }

    await db.run(
      `UPDATE offers SET
        title = ?,
        subtitle = ?,
        code = ?,
        discount_type = ?,
        discount_value = ?,
        applicable_category = ?,
        banner_url = ?,
        start_date = ?,
        end_date = ?,
        is_active = ?
      WHERE id = ?`,
      [
        body.title != null ? body.title.trim() : existing.title,
        body.subtitle != null ? body.subtitle.trim() : existing.subtitle,
        body.code != null ? body.code.trim().toUpperCase() : existing.code,
        body.discount_type != null ? body.discount_type : existing.discount_type,
        body.discount_value != null ? Number(body.discount_value) : existing.discount_value,
        body.applicable_category != null ? body.applicable_category : existing.applicable_category,
        body.banner_url != null ? body.banner_url : existing.banner_url,
        body.start_date != null ? body.start_date : existing.start_date,
        body.end_date != null ? body.end_date : existing.end_date,
        body.is_active !== undefined ? (body.is_active ? 1 : 0) : existing.is_active,
        id
      ]
    );

    res.json({ success: true, message: 'Offer updated successfully!' });
  } catch (err) {
    console.error('Error updating offer:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/offers/:id — Delete offer (Admin)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await db.run('DELETE FROM offers WHERE id = ?', [id]);
    res.json({ success: true, message: 'Offer deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/offers/:id/toggle — Quick toggle active status
router.patch('/:id/toggle', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const offer = await db.get('SELECT id, is_active FROM offers WHERE id = ?', [id]);
    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found.' });

    const newStatus = offer.is_active ? 0 : 1;
    await db.run('UPDATE offers SET is_active = ? WHERE id = ?', [newStatus, id]);
    res.json({ success: true, is_active: Boolean(newStatus) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
