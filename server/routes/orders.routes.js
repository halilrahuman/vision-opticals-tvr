const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { requireAuth } = require('../middleware/auth');
const inventoryService = require('../services/inventoryService');

// POST /api/orders — Place Order (Public Checkout)
router.post('/', async (req, res) => {
  try {
    const customer_name = req.body.customer_name;
    const customer_phone = req.body.customer_phone || req.body.phone;
    const customer_email = req.body.customer_email || req.body.email;
    const shipping_address = req.body.shipping_address || req.body.delivery_address || 'Store Pickup at Vision Opticals Thiruvarur';
    const city = req.body.city || 'Thiruvarur';
    const state = req.body.state || 'Tamil Nadu';
    const pincode = req.body.pincode || '610001';
    const items = req.body.items;
    const payment_method = req.body.payment_method || 'upi';
    const prescription_file = req.body.prescription_file || null;
    const prescription_data = req.body.prescription_data || req.body.prescription_details || null;

    if (!customer_name || !customer_phone || !items || !items.length) {
      return res.status(400).json({
        success: false,
        message: 'Name, mobile phone, and at least one optical item are required.'
      });
    }

    const orderCount = await db.get('SELECT COUNT(*) as count FROM orders');
    const orderNumber = `VO-${new Date().getFullYear()}-${(orderCount.count + 1001).toString()}`;

    // Calculate subtotal & total
    let subtotal = 0;
    items.forEach(it => {
      const itemPrice = Number(it.price || 0);
      const lensPrice = Number(it.lens_price || 0);
      const qty = Number(it.quantity || 1);
      subtotal += (itemPrice + lensPrice) * qty;
    });

    const totalAmount = subtotal; // can apply discount here if coupon code given

    await db.run(
      `INSERT INTO orders (
        order_number, customer_name, customer_phone, customer_email,
        shipping_address, city, state, pincode, subtotal, total_amount,
        payment_method, payment_status, order_status, items_json,
        prescription_file, prescription_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'placed', ?, ?, ?)`,
      [
        orderNumber,
        customer_name.trim(),
        customer_phone.trim(),
        customer_email ? customer_email.trim() : null,
        shipping_address.trim(),
        city || 'Thiruvarur',
        state || 'Tamil Nadu',
        pincode || '610001',
        subtotal,
        totalAmount,
        payment_method || 'pay_at_store',
        payment_method === 'upi_online' ? 'paid' : 'pending',
        JSON.stringify(items),
        prescription_file || null,
        prescription_data ? JSON.stringify(prescription_data) : null
      ]
    );

    // Decrement inventory for ordered products
    for (const it of items) {
      if (it.product_id) {
        try {
          await inventoryService.adjustStock(
            it.product_id,
            -(Number(it.quantity) || 1),
            `Order #${orderNumber}`,
            'System Checkout'
          );
        } catch (_) {}
      }
    }

    res.status(201).json({
      success: true,
      message: 'Your optical order has been placed successfully!',
      order_number: orderNumber,
      order: {
        order_number: orderNumber,
        total_amount: totalAmount,
        status: 'placed'
      },
      total_amount: totalAmount,
      status: 'placed'
    });
  } catch (err) {
    console.error('Order creation error:', err);
    res.status(500).json({ success: false, message: 'Failed to create order: ' + err.message });
  }
});

// GET /api/orders/:orderNumber — Order Tracking Status (Public)
router.get('/track/:orderNumber', async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const order = await db.get('SELECT * FROM orders WHERE order_number = ?', [orderNumber]);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found with that number.' });
    }

    const stages = [
      { key: 'placed', label: 'Order Placed', completed: true },
      { key: 'prescription_verified', label: 'Prescription Verified', completed: ['prescription_verified', 'lab_fitting', 'qc_passed', 'dispatched', 'delivered'].includes(order.order_status) },
      { key: 'lab_fitting', label: 'Lens Edging & Lab Mounting', completed: ['lab_fitting', 'qc_passed', 'dispatched', 'delivered'].includes(order.order_status) },
      { key: 'qc_passed', label: '4-Point Laser Quality Check', completed: ['qc_passed', 'dispatched', 'delivered'].includes(order.order_status) },
      { key: 'dispatched', label: 'Dispatched for Delivery / Ready in Store', completed: ['dispatched', 'delivered'].includes(order.order_status) },
      { key: 'delivered', label: 'Delivered / Collected', completed: order.order_status === 'delivered' }
    ];

    res.json({
      success: true,
      order: {
        order_number: order.order_number,
        customer_name: order.customer_name,
        created_at: order.created_at,
        order_status: order.order_status,
        status: order.order_status,
        payment_method: order.payment_method,
        payment_status: order.payment_status,
        total_amount: order.total_amount,
        items: JSON.parse(order.items_json || '[]'),
        stages
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/orders — List all orders (Admin Only)
router.get('/', requireAuth, async (req, res) => {
  try {
    const { status } = req.query;
    let sql = 'SELECT * FROM orders WHERE 1=1';
    const params = [];

    if (status && status !== 'all') {
      sql += ' AND order_status = ?';
      params.push(status);
    }
    sql += ' ORDER BY id DESC';

    const orders = await db.all(sql, params);
    res.json({
      success: true,
      count: orders.length,
      orders: orders.map(o => ({
        ...o,
        items: JSON.parse(o.items_json || '[]'),
        prescription_data: o.prescription_data ? JSON.parse(o.prescription_data) : null
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/orders/:id/status — Update manufacturing & delivery status (Admin Only)
router.patch('/:id/status', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, tracking_number } = req.body;

    await db.run(
      `UPDATE orders SET
        order_status = ?,
        tracking_number = COALESCE(?, tracking_number),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [status, tracking_number || null, id]
    );

    res.json({ success: true, message: `Order status updated to "${status}"` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
