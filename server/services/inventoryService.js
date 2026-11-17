const { db } = require('../db/database');

/**
 * Adjust stock by delta (+/-)
 */
async function adjustStock(productId, delta, reason = 'Manual Adjustment', userName = 'Admin') {
  const currentInv = await db.get('SELECT * FROM inventory WHERE product_id = ?', [productId]);
  if (!currentInv) {
    throw new Error('Inventory record not found for product id: ' + productId);
  }

  const newQty = Math.max(0, currentInv.quantity + delta);

  await db.run(
    'UPDATE inventory SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ?',
    [newQty, productId]
  );

  await db.run(
    `INSERT INTO inventory_logs (product_id, change_amount, final_quantity, reason, user_name)
     VALUES (?, ?, ?, ?, ?)`,
    [productId, delta, newQty, reason, userName]
  );

  return {
    productId,
    previousQuantity: currentInv.quantity,
    quantity: newQty,
    new_quantity: newQty,
    lowStock: newQty <= currentInv.low_stock_threshold,
    outOfStock: newQty === 0
  };
}

/**
 * Directly set stock quantity
 */
async function setStock(productId, newQuantity, reason = 'Stock Override', userName = 'Admin') {
  const currentInv = await db.get('SELECT * FROM inventory WHERE product_id = ?', [productId]);
  if (!currentInv) {
    throw new Error('Inventory record not found for product id: ' + productId);
  }

  const qty = Math.max(0, parseInt(newQuantity, 10) || 0);
  const delta = qty - currentInv.quantity;

  await db.run(
    'UPDATE inventory SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ?',
    [qty, productId]
  );

  await db.run(
    `INSERT INTO inventory_logs (product_id, change_amount, final_quantity, reason, user_name)
     VALUES (?, ?, ?, ?, ?)`,
    [productId, delta, qty, reason, userName]
  );

  return {
    productId,
    previousQuantity: currentInv.quantity,
    quantity: qty,
    new_quantity: qty,
    lowStock: qty <= currentInv.low_stock_threshold,
    outOfStock: qty === 0
  };
}

/**
 * Get full inventory metrics summary
 */
async function getInventorySummary() {
  const totalProducts = await db.get('SELECT COUNT(*) as count FROM products');
  const activeProducts = await db.get('SELECT COUNT(*) as count FROM products WHERE is_published = 1');
  const invStats = await db.get(`
    SELECT
      COUNT(CASE WHEN i.quantity = 0 THEN 1 END) as out_of_stock,
      COUNT(CASE WHEN i.quantity > 0 AND i.quantity <= i.low_stock_threshold THEN 1 END) as low_stock,
      SUM(i.quantity) as total_units
    FROM inventory i
  `);
  const activeOffers = await db.get(
    'SELECT COUNT(*) as count FROM offers WHERE is_active = 1 AND (end_date IS NULL OR end_date > CURRENT_TIMESTAMP)'
  );

  return {
    totalProducts: totalProducts.count,
    activeProducts: activeProducts.count,
    outOfStock: invStats.out_of_stock || 0,
    lowStock: invStats.low_stock || 0,
    totalUnits: invStats.total_units || 0,
    activeOffers: activeOffers.count || 0
  };
}

module.exports = {
  adjustStock,
  setStock,
  getInventorySummary
};
