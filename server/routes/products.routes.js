const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { requireAuth } = require('../middleware/auth');

// Helper to safely parse JSON strings or fallback
function safeJson(val, fallback = []) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch (_) {
    return fallback;
  }
}

// Helper to format product row from DB
function formatProduct(p) {
  if (!p) return null;
  return {
    ...p,
    price: p.price != null ? Number(p.price) : null,
    compare_at_price: p.compare_at_price != null ? Number(p.compare_at_price) : null,
    available_colors: safeJson(p.available_colors, []),
    available_sizes: safeJson(p.available_sizes, []),
    lens_coatings: safeJson(p.lens_coatings, []),
    lens_features: safeJson(p.lens_features, []),
    is_published: Boolean(p.is_published),
    is_featured: Boolean(p.is_featured),
    is_bestseller: Boolean(p.is_bestseller),
    is_new_arrival: Boolean(p.is_new_arrival),
    is_trending: Boolean(p.is_trending),
    stock: p.stock_quantity != null ? p.stock_quantity : (p.quantity != null ? p.quantity : 0),
    low_stock: (p.stock_quantity != null ? p.stock_quantity : 0) <= (p.low_stock_threshold || 3),
    in_stock: (p.stock_quantity != null ? p.stock_quantity : 0) > 0
  };
}

// GET /api/products — Public filtered list
router.get('/', async (req, res) => {
  try {
    const {
      category,
      brand,
      shape,
      frame_type,
      material,
      gender,
      badge,
      collection,
      minPrice,
      maxPrice,
      search,
      sort,
      includeUnpublished
    } = req.query;

    let sql = `
      SELECT
        p.*,
        i.quantity as stock_quantity,
        i.low_stock_threshold,
        i.sku
      FROM products p
      LEFT JOIN inventory i ON p.id = i.product_id
      WHERE 1=1
    `;
    const params = [];

    // Filter published (unless admin requested unpublished)
    if (!includeUnpublished) {
      sql += ' AND p.is_published = 1';
    }

    // Category filter
    if (category && category !== 'all') {
      sql += ' AND p.category_slug = ?';
      params.push(category);
    }

    // Brand filter
    if (brand && brand !== 'all') {
      sql += ' AND p.brand = ?';
      params.push(brand);
    }

    // Frame Shape
    if (shape && shape !== 'all') {
      sql += ' AND LOWER(p.frame_shape) = LOWER(?)';
      params.push(shape);
    }

    // Frame Type
    if (frame_type && frame_type !== 'all') {
      sql += ' AND LOWER(p.frame_type) = LOWER(?)';
      params.push(frame_type);
    }

    // Material
    if (material && material !== 'all') {
      sql += ' AND LOWER(p.frame_material) LIKE LOWER(?)';
      params.push(`%${material}%`);
    }

    // Gender
    if (gender && gender !== 'all') {
      sql += ' AND (LOWER(p.gender) = LOWER(?) OR LOWER(p.gender) = "unisex")';
      params.push(gender);
    }

    // Badge filter
    if (badge && badge !== 'all') {
      sql += ' AND LOWER(p.badge) = LOWER(?)';
      params.push(badge);
    }

    // Collection filter (Trending, New, Bestsellers, Featured)
    if (collection === 'trending') {
      sql += ' AND p.is_trending = 1';
    } else if (collection === 'new_arrivals' || collection === 'new') {
      sql += ' AND p.is_new_arrival = 1';
    } else if (collection === 'bestsellers') {
      sql += ' AND p.is_bestseller = 1';
    } else if (collection === 'featured') {
      sql += ' AND p.is_featured = 1';
    }

    // Price range
    if (minPrice) {
      sql += ' AND p.price >= ?';
      params.push(Number(minPrice));
    }
    if (maxPrice) {
      sql += ' AND p.price <= ?';
      params.push(Number(maxPrice));
    }

    // Free-text Search
    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      sql += ` AND (
        LOWER(p.name) LIKE ? OR
        LOWER(p.brand) LIKE ? OR
        LOWER(p.description) LIKE ? OR
        LOWER(p.frame_shape) LIKE ? OR
        LOWER(p.frame_material) LIKE ? OR
        LOWER(p.category_slug) LIKE ?
      )`;
      params.push(q, q, q, q, q, q);
    }

    // Sorting
    if (sort === 'price_asc') {
      sql += ' ORDER BY p.price ASC';
    } else if (sort === 'price_desc') {
      sql += ' ORDER BY p.price DESC';
    } else if (sort === 'newest') {
      sql += ' ORDER BY p.created_at DESC';
    } else if (sort === 'popular') {
      sql += ' ORDER BY p.is_bestseller DESC, p.is_trending DESC, p.id DESC';
    } else {
      sql += ' ORDER BY p.sort_order ASC, p.id DESC';
    }

    const rows = await db.all(sql, params);
    const products = rows.map(formatProduct);

    res.json({
      success: true,
      count: products.length,
      products
    });
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/products/:idOrSlug — Detailed Single Product
router.get('/:idOrSlug', async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    const isId = /^\d+$/.test(idOrSlug);

    const sql = `
      SELECT
        p.*,
        i.quantity as stock_quantity,
        i.low_stock_threshold,
        i.sku
      FROM products p
      LEFT JOIN inventory i ON p.id = i.product_id
      WHERE ${isId ? 'p.id = ?' : 'p.slug = ?'}
    `;
    const productRow = await db.get(sql, [idOrSlug]);

    if (!productRow) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const product = formatProduct(productRow);

    // Fetch product images
    const images = await db.all(
      'SELECT id, url, thumbnail_url, sort_order, is_primary FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, sort_order ASC',
      [product.id]
    );
    product.images = images.length > 0 ? images : [{ url: product.primary_image, is_primary: 1 }];

    // Fetch related products (same category, different id, limit 4)
    const relatedRows = await db.all(
      `SELECT p.*, i.quantity as stock_quantity FROM products p
       LEFT JOIN inventory i ON p.id = i.product_id
       WHERE p.category_slug = ? AND p.id != ? AND p.is_published = 1
       LIMIT 4`,
      [product.category_slug, product.id]
    );
    product.related = relatedRows.map(formatProduct);

    res.json({ success: true, product });
  } catch (err) {
    console.error('Error fetching product details:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/products — Create Product (Admin Only)
router.post('/', requireAuth, async (req, res) => {
  try {
    const body = req.body;
    if (!body.name || !body.category_slug) {
      return res.status(400).json({ success: false, message: 'Product name and category are required.' });
    }

    // Generate unique slug
    let baseSlug = (body.name || 'product')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    let slug = baseSlug;
    let count = 1;
    while (await db.get('SELECT id FROM products WHERE slug = ?', [slug])) {
      slug = `${baseSlug}-${count++}`;
    }

    const availableColors = typeof body.available_colors === 'object' ? JSON.stringify(body.available_colors) : (body.available_colors || '[]');
    const availableSizes = typeof body.available_sizes === 'object' ? JSON.stringify(body.available_sizes) : (body.available_sizes || '[]');
    const lensCoatings = typeof body.lens_coatings === 'object' ? JSON.stringify(body.lens_coatings) : (body.lens_coatings || '[]');
    const lensFeatures = typeof body.lens_features === 'object' ? JSON.stringify(body.lens_features) : (body.lens_features || '[]');

    const price = body.price ? Number(body.price) : null;
    const compareAtPrice = body.compare_at_price ? Number(body.compare_at_price) : null;
    const isPublished = body.is_published !== undefined ? (body.is_published ? 1 : 0) : 1;

    const result = await db.run(
      `INSERT INTO products (
        slug, name, category_slug, brand, price, compare_at_price, badge, description,
        primary_image, secondary_image, color_family, product_tags, lens_uv_cut, lens_blue_cut,
        gender, frame_shape, frame_type, frame_material, lens_width,
        bridge, temple_length, available_colors, available_sizes, lens_coatings,
        lens_power_range, lens_water_content, lens_material, lens_duration, lens_features,
        wa_message, is_published, is_featured, is_bestseller, is_new_arrival, is_trending
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        slug,
        body.name.trim(),
        body.category_slug,
        body.brand ? body.brand.trim() : null,
        price,
        compareAtPrice,
        body.badge || null,
        body.description || null,
        body.primary_image || null,
        body.secondary_image || null,
        body.color_family || null,
        typeof body.product_tags === 'object' ? JSON.stringify(body.product_tags) : (body.product_tags || null),
        body.lens_uv_cut || null,
        body.lens_blue_cut || null,
        body.gender || 'Unisex',
        body.frame_shape || null,
        body.frame_type || null,
        body.frame_material || null,
        body.lens_width || null,
        body.bridge || null,
        body.temple_length || null,
        availableColors,
        availableSizes,
        lensCoatings,
        body.lens_power_range || null,
        body.lens_water_content || null,
        body.lens_material || null,
        body.lens_duration || null,
        lensFeatures,
        body.wa_message || `Hi Vision Opticals, I'm interested in ${body.name}.`,
        isPublished,
        body.is_featured ? 1 : 0,
        body.is_bestseller ? 1 : 0,
        body.is_new_arrival ? 1 : 0,
        body.is_trending ? 1 : 0
      ]
    );

    const productId = result.lastID;
    const initialQty = parseInt(body.stock_quantity, 10) >= 0 ? parseInt(body.stock_quantity, 10) : 10;
    const lowStockThreshold = parseInt(body.low_stock_threshold, 10) || 3;
    const sku = body.sku || 'SKU-VO-' + productId.toString().padStart(4, '0');

    // Create inventory record
    await db.run(
      `INSERT INTO inventory (product_id, quantity, low_stock_threshold, sku) VALUES (?, ?, ?, ?)`,
      [productId, initialQty, lowStockThreshold, sku]
    );

    // Create initial inventory log
    await db.run(
      `INSERT INTO inventory_logs (product_id, change_amount, final_quantity, reason, user_name) VALUES (?, ?, ?, ?, ?)`,
      [productId, initialQty, initialQty, 'Initial Product Creation', req.user.username || 'Admin']
    );

    // Save primary image into product_images if given
    if (body.primary_image) {
      await db.run(
        `INSERT INTO product_images (product_id, url, is_primary, sort_order) VALUES (?, ?, 1, 1)`,
        [productId, body.primary_image]
      );
    }

    // Save any additional gallery images
    if (Array.isArray(body.additional_images)) {
      for (let i = 0; i < body.additional_images.length; i++) {
        const imgUrl = body.additional_images[i];
        if (imgUrl && imgUrl !== body.primary_image) {
          await db.run(
            `INSERT INTO product_images (product_id, url, is_primary, sort_order) VALUES (?, ?, 0, ?)`,
            [productId, imgUrl, i + 2]
          );
        }
      }
    }

    res.status(201).json({
      success: true,
      message: 'Product created successfully!',
      productId,
      slug
    });
  } catch (err) {
    console.error('Error creating product:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/products/:id — Update Product (Admin Only)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;

    const existing = await db.get('SELECT * FROM products WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const availableColors = typeof body.available_colors === 'object' ? JSON.stringify(body.available_colors) : (body.available_colors || existing.available_colors);
    const availableSizes = typeof body.available_sizes === 'object' ? JSON.stringify(body.available_sizes) : (body.available_sizes || existing.available_sizes);
    const lensCoatings = typeof body.lens_coatings === 'object' ? JSON.stringify(body.lens_coatings) : (body.lens_coatings || existing.lens_coatings);
    const lensFeatures = typeof body.lens_features === 'object' ? JSON.stringify(body.lens_features) : (body.lens_features || existing.lens_features);

    await db.run(
      `UPDATE products SET
        name = ?,
        category_slug = ?,
        brand = ?,
        price = ?,
        compare_at_price = ?,
        badge = ?,
        description = ?,
        primary_image = ?,
        secondary_image = ?,
        color_family = ?,
        product_tags = ?,
        lens_uv_cut = ?,
        lens_blue_cut = ?,
        gender = ?,
        frame_shape = ?,
        frame_type = ?,
        frame_material = ?,
        lens_width = ?,
        bridge = ?,
        temple_length = ?,
        available_colors = ?,
        available_sizes = ?,
        lens_coatings = ?,
        lens_power_range = ?,
        lens_water_content = ?,
        lens_material = ?,
        lens_duration = ?,
        lens_features = ?,
        wa_message = ?,
        is_published = ?,
        is_featured = ?,
        is_bestseller = ?,
        is_new_arrival = ?,
        is_trending = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        body.name != null ? body.name.trim() : existing.name,
        body.category_slug != null ? body.category_slug : existing.category_slug,
        body.brand != null ? body.brand.trim() : existing.brand,
        body.price != null ? Number(body.price) : existing.price,
        body.compare_at_price != null ? Number(body.compare_at_price) : existing.compare_at_price,
        body.badge != null ? body.badge : existing.badge,
        body.description != null ? body.description : existing.description,
        body.primary_image != null ? body.primary_image : existing.primary_image,
        body.secondary_image != null ? body.secondary_image : existing.secondary_image,
        body.color_family != null ? body.color_family : existing.color_family,
        body.product_tags != null ? (typeof body.product_tags === 'object' ? JSON.stringify(body.product_tags) : body.product_tags) : existing.product_tags,
        body.lens_uv_cut != null ? body.lens_uv_cut : existing.lens_uv_cut,
        body.lens_blue_cut != null ? body.lens_blue_cut : existing.lens_blue_cut,
        body.gender != null ? body.gender : existing.gender,
        body.frame_shape != null ? body.frame_shape : existing.frame_shape,
        body.frame_type != null ? body.frame_type : existing.frame_type,
        body.frame_material != null ? body.frame_material : existing.frame_material,
        body.lens_width != null ? body.lens_width : existing.lens_width,
        body.bridge != null ? body.bridge : existing.bridge,
        body.temple_length != null ? body.temple_length : existing.temple_length,
        availableColors,
        availableSizes,
        lensCoatings,
        body.lens_power_range != null ? body.lens_power_range : existing.lens_power_range,
        body.lens_water_content != null ? body.lens_water_content : existing.lens_water_content,
        body.lens_material != null ? body.lens_material : existing.lens_material,
        body.lens_duration != null ? body.lens_duration : existing.lens_duration,
        lensFeatures,
        body.wa_message != null ? body.wa_message : existing.wa_message,
        body.is_published !== undefined ? (body.is_published ? 1 : 0) : existing.is_published,
        body.is_featured !== undefined ? (body.is_featured ? 1 : 0) : existing.is_featured,
        body.is_bestseller !== undefined ? (body.is_bestseller ? 1 : 0) : existing.is_bestseller,
        body.is_new_arrival !== undefined ? (body.is_new_arrival ? 1 : 0) : existing.is_new_arrival,
        body.is_trending !== undefined ? (body.is_trending ? 1 : 0) : existing.is_trending,
        id
      ]
    );

    // Update primary image in product_images
    if (body.primary_image) {
      const imgExists = await db.get('SELECT id FROM product_images WHERE product_id = ? AND url = ?', [id, body.primary_image]);
      if (!imgExists) {
        await db.run('INSERT INTO product_images (product_id, url, is_primary, sort_order) VALUES (?, ?, 1, 1)', [id, body.primary_image]);
      }
    }

    // Update stock quantity and low stock threshold if supplied
    if (body.stock_quantity !== undefined || body.low_stock_threshold !== undefined) {
      const currentInv = await db.get('SELECT quantity, low_stock_threshold FROM inventory WHERE product_id = ?', [id]);
      const newQty = body.stock_quantity !== undefined ? (parseInt(body.stock_quantity, 10) || 0) : (currentInv ? currentInv.quantity : 10);
      const newThresh = body.low_stock_threshold !== undefined ? (parseInt(body.low_stock_threshold, 10) || 3) : (currentInv ? currentInv.low_stock_threshold : 3);

      if (currentInv) {
        await db.run(
          'UPDATE inventory SET quantity = ?, low_stock_threshold = ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ?',
          [newQty, newThresh, id]
        );
        if (newQty !== currentInv.quantity) {
          const delta = newQty - currentInv.quantity;
          await db.run(
            'INSERT INTO inventory_logs (product_id, change_amount, final_quantity, reason, user_name) VALUES (?, ?, ?, ?, ?)',
            [id, delta, newQty, 'Product Catalog Edit', req.user.username || 'Admin']
          );
        }
      } else {
        await db.run(
          'INSERT INTO inventory (product_id, quantity, low_stock_threshold, sku) VALUES (?, ?, ?, ?)',
          [id, newQty, newThresh, 'SKU-VO-' + id.toString().padStart(4, '0')]
        );
      }
    }

    res.json({ success: true, message: 'Product updated successfully!' });
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/products/:id — Delete Product (Admin Only)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await db.get('SELECT id, name FROM products WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    // Cascade delete automatically deletes inventory, inventory_logs, and product_images
    await db.run('DELETE FROM products WHERE id = ?', [id]);
    res.json({ success: true, message: `Product "${existing.name}" deleted successfully.` });
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/products/:id/toggle-publish — Quick publish toggle
router.patch('/:id/toggle-publish', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const p = await db.get('SELECT id, is_published FROM products WHERE id = ?', [id]);
    if (!p) return res.status(404).json({ success: false, message: 'Product not found.' });

    const newStatus = p.is_published ? 0 : 1;
    await db.run('UPDATE products SET is_published = ? WHERE id = ?', [newStatus, id]);
    res.json({ success: true, is_published: Boolean(newStatus) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
