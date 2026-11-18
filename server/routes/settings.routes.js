const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { requireAuth } = require('../middleware/auth');

// GET /api/settings — Public store settings
router.get('/', async (req, res) => {
  try {
    const rows = await db.all('SELECT key, value FROM store_settings');
    const settings = {};
    rows.forEach(r => {
      settings[r.key] = r.value;
    });

    res.json({
      success: true,
      settings
    });
  } catch (err) {
    console.error('Error fetching settings:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/settings — Update multiple settings (Admin)
router.put('/', requireAuth, async (req, res) => {
  try {
    const updates = req.body; // e.g. { phone: "94865 52324", whatsapp: "919486552324" }
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ success: false, message: 'Settings object required.' });
    }

    for (const [key, value] of Object.entries(updates)) {
      await db.run(
        `INSERT INTO store_settings (key, value, updated_at)
         VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
        [key, String(value != null ? value : '')]
      );
    }

    res.json({ success: true, message: 'Store settings updated successfully!' });
  } catch (err) {
    console.error('Error updating settings:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
