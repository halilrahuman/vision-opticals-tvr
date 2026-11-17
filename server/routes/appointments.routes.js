const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { requireAuth } = require('../middleware/auth');

// POST /api/appointments — Book In-Store Eye Test (Public)
router.post('/', async (req, res) => {
  try {
    const { customer_name, phone, email, appointment_date, time_slot, service_type, notes } = req.body;

    if (!customer_name || !phone || !appointment_date || !time_slot) {
      return res.status(400).json({
        success: false,
        message: 'Name, phone number, date, and preferred time slot are required.'
      });
    }

    const countRes = await db.get('SELECT COUNT(*) as count FROM appointments');
    const aptNumber = `VO-APT-${(countRes.count + 1001).toString()}`;

    const result = await db.run(
      `INSERT INTO appointments (
        appointment_number, customer_name, phone, email, appointment_date,
        time_slot, service_type, notes, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')`,
      [
        aptNumber,
        customer_name.trim(),
        phone.trim(),
        email ? email.trim() : null,
        appointment_date,
        time_slot,
        service_type || 'Computerised Eye Test',
        notes ? notes.trim() : null
      ]
    );

    res.status(201).json({
      success: true,
      message: 'In-store eye test appointment confirmed successfully!',
      appointment_number: aptNumber,
      appointment: {
        id: result.lastID,
        appointment_number: aptNumber,
        customer_name,
        appointment_date,
        time_slot,
        service_type
      },
      details: {
        appointment_number: aptNumber,
        customer_name,
        date: appointment_date,
        time_slot,
        service: service_type || 'Computerised Eye Test'
      }
    });
  } catch (err) {
    console.error('Appointment booking error:', err);
    res.status(500).json({ success: false, message: 'Booking failed: ' + err.message });
  }
});

// GET /api/appointments — List appointments (Admin Only)
router.get('/', requireAuth, async (req, res) => {
  try {
    const { status, date } = req.query;
    let sql = 'SELECT * FROM appointments WHERE 1=1';
    const params = [];

    if (status && status !== 'all') {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (date) {
      sql += ' AND appointment_date = ?';
      params.push(date);
    }

    sql += ' ORDER BY appointment_date DESC, id DESC';

    const appointments = await db.all(sql, params);
    res.json({ success: true, count: appointments.length, appointments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/appointments/:id/status — Update appointment status (Admin Only)
router.patch('/:id/status', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await db.run('UPDATE appointments SET status = ? WHERE id = ?', [status, id]);
    res.json({ success: true, message: `Appointment status updated to ${status}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
