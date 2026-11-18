const express = require('express');
const router = express.Router();
const fs = require('fs');
const csvParser = require('csv-parser');
const { db } = require('../db/database');
const { requireAuth } = require('../middleware/auth');
const { uploadCSV } = require('../middleware/upload');

// Helper to escape CSV fields
function csvEscape(field) {
  if (field == null) return '""';
  const stringField = String(field);
  return `"${stringField.replace(/"/g, '""')}"`;
}

// GET /api/bulk/template-csv — Sample template for shop owner (Public)
router.get('/template-csv', (req, res) => {
  const headers = [
    'name', 'category_slug', 'brand', 'price', 'compare_at_price', 'badge',
    'description', 'primary_image', 'gender', 'frame_shape', 'frame_type',
    'frame_material', 'lens_width', 'bridge', 'temple_length', 'available_colors',
    'available_sizes', 'lens_coatings', 'stock_quantity', 'low_stock_threshold',
    'lens_power_range', 'lens_water_content', 'lens_material', 'lens_duration'
  ];

  const sampleRow1 = [
    'Classic Titanium Aviator', 'sunglasses', 'Ray-Ban', '4999', '5999', 'Popular',
    'Iconic teardrop aviator with polarized UV400 lenses.', 'images/image1.jpg', 'Unisex',
    'Aviator', 'Full Rim', 'Titanium', '58 mm', '14 mm', '140 mm',
    'Black:#1a1a1a, Gold:#d97706', 'M, L', 'UV400, Polarized, Anti-Glare', '20', '5',
    '', '', '', ''
  ];

  const sampleRow2 = [
    'Acuvue Oasys Monthly Lenses', 'lenses', 'Acuvue (Johnson & Johnson)', '1650', '1950', 'Monthly',
    'Breathable silicone hydrogel for all-day screen protection.', 'images/lens1.jpg', 'Unisex',
    '', '', '', '', '', '', '', '', '', '35', '5',
    '-0.50 to -8.00', '38%', 'Senofilcon A', 'Monthly disposable'
  ];

  const csvContent = [
    headers.join(','),
    sampleRow1.map(csvEscape).join(','),
    sampleRow2.map(csvEscape).join(',')
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="vision_opticals_template.csv"');
  res.send(csvContent);
});

// GET /api/bulk/export-csv — Full catalog export
router.get('/export-csv', requireAuth, async (req, res) => {
  try {
    const products = await db.all(`
      SELECT p.*, i.quantity as stock_quantity, i.low_stock_threshold, i.sku
      FROM products p
      LEFT JOIN inventory i ON p.id = i.product_id
      ORDER BY p.id ASC
    `);

    const headers = [
      'id', 'name', 'slug', 'category_slug', 'brand', 'price', 'compare_at_price',
      'badge', 'gender', 'frame_shape', 'frame_type', 'frame_material',
      'lens_width', 'bridge', 'stock_quantity', 'sku', 'primary_image', 'description'
    ];

    const rows = products.map(p => [
      p.id,
      csvEscape(p.name),
      csvEscape(p.slug),
      csvEscape(p.category_slug),
      csvEscape(p.brand),
      p.price || '',
      p.compare_at_price || '',
      csvEscape(p.badge),
      csvEscape(p.gender),
      csvEscape(p.frame_shape),
      csvEscape(p.frame_type),
      csvEscape(p.frame_material),
      csvEscape(p.lens_width),
      csvEscape(p.bridge),
      p.stock_quantity != null ? p.stock_quantity : 0,
      csvEscape(p.sku),
      csvEscape(p.primary_image),
      csvEscape(p.description)
    ].join(','));

    const csvData = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="vision_opticals_products_${Date.now()}.csv"`);
    res.send(csvData);
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ success: false, message: 'Export failed: ' + err.message });
  }
});

// POST /api/bulk/import-csv — Bulk CSV Import with validation
router.post('/import-csv', requireAuth, uploadCSV.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Please upload a valid CSV file.' });
  }

  const results = [];
  const errors = [];
  let importedCount = 0;
  let skippedCount = 0;

  fs.createReadStream(req.file.path)
    .pipe(csvParser())
    .on('data', (row) => results.push(row))
    .on('end', async () => {
      // Clean up uploaded temp file
      try { fs.unlinkSync(req.file.path); } catch (_) {}

      for (let i = 0; i < results.length; i++) {
        const row = results[i];
        const rowNum = i + 2; // header is line 1

        const name = (row.name || '').trim();
        const categorySlug = (row.category_slug || '').trim().toLowerCase();

        if (!name) {
          errors.push(`Row ${rowNum}: Product name is missing, skipped.`);
          skippedCount++;
          continue;
        }

        if (!categorySlug) {
          errors.push(`Row ${rowNum}: Category is missing for "${name}", skipped.`);
          skippedCount++;
          continue;
        }

        try {
          // Generate unique slug
          let baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
          let slug = baseSlug;
          let count = 1;
          while (await db.get('SELECT id FROM products WHERE slug = ?', [slug])) {
            slug = `${baseSlug}-${count++}`;
          }

          // Parse colors
          let colors = [];
          if (row.available_colors) {
            colors = row.available_colors.split(',').map(c => {
              const [cName, cHex] = c.split(':').map(s => s.trim());
              return { name: cName, hex: cHex || '#1a1a1a' };
            }).filter(c => c.name);
          }

          // Parse sizes
          let sizes = [];
          if (row.available_sizes) {
            sizes = row.available_sizes.split(',').map(s => s.trim()).filter(Boolean);
          }

          // Parse coatings
          let coatings = [];
          if (row.lens_coatings) {
            coatings = row.lens_coatings.split(',').map(s => s.trim()).filter(Boolean);
          }

          const price = row.price ? Number(row.price.replace(/[^0-9.]/g, '')) : null;
          const compareAt = row.compare_at_price ? Number(row.compare_at_price.replace(/[^0-9.]/g, '')) : null;
          const initialStock = parseInt(row.stock_quantity, 10) >= 0 ? parseInt(row.stock_quantity, 10) : 10;
          const lowThreshold = parseInt(row.low_stock_threshold, 10) || 3;

          const insertRes = await db.run(
            `INSERT INTO products (
              slug, name, category_slug, brand, price, compare_at_price, badge, description,
              primary_image, gender, frame_shape, frame_type, frame_material, lens_width,
              bridge, temple_length, available_colors, available_sizes, lens_coatings,
              lens_power_range, lens_water_content, lens_material, lens_duration,
              wa_message, is_published, is_featured
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)`,
            [
              slug,
              name,
              categorySlug,
              row.brand ? row.brand.trim() : null,
              price,
              compareAt,
              row.badge || null,
              row.description || null,
              row.primary_image || null,
              row.gender || 'Unisex',
              row.frame_shape || null,
              row.frame_type || null,
              row.frame_material || null,
              row.lens_width || null,
              row.bridge || null,
              row.temple_length || null,
              JSON.stringify(colors),
              JSON.stringify(sizes),
              JSON.stringify(coatings),
              row.lens_power_range || null,
              row.lens_water_content || null,
              row.lens_material || null,
              row.lens_duration || null,
              `Hi Vision Opticals, I'm interested in ${name}.`
            ]
          );

          const productId = insertRes.lastID;

          // Inventory
          await db.run(
            `INSERT INTO inventory (product_id, quantity, low_stock_threshold, sku) VALUES (?, ?, ?, ?)`,
            [productId, initialStock, lowThreshold, 'SKU-VO-' + productId.toString().padStart(4, '0')]
          );

          // Inventory Log
          await db.run(
            `INSERT INTO inventory_logs (product_id, change_amount, final_quantity, reason, user_name) VALUES (?, ?, ?, ?, ?)`,
            [productId, initialStock, initialStock, 'Bulk CSV Import', req.user.username || 'Admin']
          );

          if (row.primary_image) {
            await db.run(
              `INSERT INTO product_images (product_id, url, is_primary, sort_order) VALUES (?, ?, 1, 1)`,
              [productId, row.primary_image.trim()]
            );
          }

          importedCount++;
        } catch (rowErr) {
          errors.push(`Row ${rowNum} ("${name}"): ${rowErr.message}`);
          skippedCount++;
        }
      }

      res.json({
        success: true,
        message: `Import complete: ${importedCount} product(s) added, ${skippedCount} skipped.`,
        importedCount,
        skippedCount,
        errors
      });
    })
    .on('error', (err) => {
      res.status(500).json({ success: false, message: 'CSV parsing error: ' + err.message });
    });
});

module.exports = router;
