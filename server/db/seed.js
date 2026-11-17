const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const { db, initSchema } = require('./database');

async function seed() {
  console.log('Seeding Vision Opticals database with Part 2 components...');
  await initSchema();

  // Safely add missing columns if upgrading existing db
  const safeAddColumn = async (table, colDef) => {
    try {
      await db.run(`ALTER TABLE ${table} ADD COLUMN ${colDef}`);
    } catch (_) {}
  };

  await safeAddColumn('products', 'secondary_image TEXT');
  await safeAddColumn('products', 'color_family TEXT');
  await safeAddColumn('products', 'product_tags TEXT');
  await safeAddColumn('products', 'lens_uv_cut TEXT');
  await safeAddColumn('products', 'lens_blue_cut TEXT');
  await safeAddColumn('products', 'lens_transmission TEXT');
  await safeAddColumn('product_images', 'angle_label TEXT');

  // 1. Seed Admin User
  const existingAdmin = await db.get('SELECT * FROM users WHERE username = ?', ['admin']);
  if (!existingAdmin) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('vision123', salt);
    await db.run(
      `INSERT INTO users (username, password_hash, name, role) VALUES (?, ?, ?, ?)`,
      ['admin', hash, 'Vision Opticals Store Owner', 'admin']
    );
    console.log('✓ Admin user created: username="admin", password="vision123"');
  }

  // 2. Seed Categories
  const categories = [
    { slug: 'frames', name: 'Optical Frames', description: 'Everyday prescription and designer frames', icon: 'glasses', sort_order: 1 },
    { slug: 'sunglasses', name: 'Sunglasses', description: 'UV400 and polarized designer sunglasses', icon: 'sun', sort_order: 2 },
    { slug: 'premium', name: 'Premium Eyewear', description: 'Luxury titanium and Italian handcrafted eyewear', icon: 'sparkles', sort_order: 3 },
    { slug: 'lenses', name: 'Contact Lenses', description: 'Daily, monthly, toric and coloured lenses', icon: 'eye', sort_order: 4 },
    { slug: 'kids', name: 'Kids Eyewear', description: 'Flexible, shatterproof and safe frames for children', icon: 'smile', sort_order: 5 }
  ];

  for (const cat of categories) {
    await db.run(
      `INSERT OR IGNORE INTO categories (slug, name, description, icon, sort_order) VALUES (?, ?, ?, ?, ?)`,
      [cat.slug, cat.name, cat.description, cat.icon, cat.sort_order]
    );
  }

  // 3. Seed Brands (including Titan Eye+, Ray-Ban, Essilor, Zeiss, Silhouette)
  const brands = [
    { name: 'Titan Eye+', slug: 'titan-eye-plus', is_featured: 1 },
    { name: 'Ray-Ban', slug: 'ray-ban', is_featured: 1 },
    { name: 'Essilor', slug: 'essilor', is_featured: 1 },
    { name: 'Zeiss', slug: 'zeiss', is_featured: 1 },
    { name: 'Silhouette', slug: 'silhouette', is_featured: 1 },
    { name: 'Fastrack', slug: 'fastrack', is_featured: 1 },
    { name: 'Acuvue (Johnson & Johnson)', slug: 'acuvue', is_featured: 1 },
    { name: 'Air Optix (Alcon)', slug: 'air-optix', is_featured: 1 },
    { name: 'FreshLook', slug: 'freshlook', is_featured: 0 },
    { name: 'Vision Signature', slug: 'vision-signature', is_featured: 1 }
  ];

  for (const b of brands) {
    await db.run(
      `INSERT OR REPLACE INTO brands (name, slug, is_featured) VALUES (?, ?, ?)`,
      [b.name, b.slug, b.is_featured]
    );
  }

  // 4. Seed Products with Dual-Image Hover Angles & Attribute Badges
  await db.run('DELETE FROM products');
  await db.run('DELETE FROM product_images');
  await db.run('DELETE FROM inventory');
  await db.run('DELETE FROM inventory_logs');

  const productsList = [
    {
      slug: 'vintage-round-tortoise-acetate',
      name: 'Vintage Round Tortoise Acetate',
      category_slug: 'frames',
      brand: 'Titan Eye+',
      price: 2990,
      compare_at_price: 3990,
      badge: 'Bestseller',
      description: 'Handcrafted Japanese-style keyhole round frame in rich amber tortoise shell. Features double barrel hinges and lightweight nose bridge balancing for reading & screen work.',
      primary_image: 'images/tortoise_round_front.jpg',
      secondary_image: 'images/tortoise_round_angle.jpg',
      color_family: 'Tortoise',
      product_tags: JSON.stringify(['computer', 'reading', 'new_design', 'unisex', 'tortoise']),
      lens_uv_cut: '100% UV400 Protection',
      lens_blue_cut: '98% HEV Digital Blue Light Cut (420nm)',
      lens_transmission: '99.4% Anti-Glare Clarity',
      gender: 'Unisex',
      frame_shape: 'Round',
      frame_type: 'Full Rim',
      frame_material: 'Cellulose Acetate',
      lens_width: '49 mm',
      bridge: '21 mm',
      temple_length: '145 mm',
      available_colors: JSON.stringify([
        { name: 'Amber Tortoise', hex: '#6f3a15' },
        { name: 'Midnight Black', hex: '#1a1a1a' },
        { name: 'Honey Horn', hex: '#d97706' }
      ]),
      available_sizes: JSON.stringify(['M (Standard)', 'L (Wide)']),
      lens_coatings: JSON.stringify(['Titan Blue-Cut Shield', 'Anti-Glare (AR)', '100% UV400', 'Hydrophobic Oleophobic']),
      wa_message: "Hi Vision Opticals, I'm interested in the Vintage Round Tortoise Acetate frame (Titan Eye+). Could you share details?",
      is_published: 1,
      is_featured: 1,
      is_bestseller: 1,
      is_new_arrival: 1,
      is_trending: 1,
      initial_stock: 25
    },
    {
      slug: 'grey-cateye-eyeglasses-women',
      name: 'Grey CatEye Acetate Eyeglasses',
      category_slug: 'frames',
      brand: 'Titan Eye+',
      price: 2750,
      compare_at_price: 3500,
      badge: 'Popular',
      description: 'Elegantly sculpted grey cat-eye prescription eyeglasses designed for modern women. Ultra-light, sculpted temple tips, and feminine uplift silhouette.',
      primary_image: 'images/image1.jpg',
      secondary_image: 'images/image5.webp',
      color_family: 'Grey',
      product_tags: JSON.stringify(['women', 'computer', 'reading', 'new_design']),
      lens_uv_cut: '100% UV400 Protection',
      lens_blue_cut: '98% Screen Blue Light Shield',
      lens_transmission: '99.5% Anti-Glare Night Clarity',
      gender: 'Women',
      frame_shape: 'Cat-Eye',
      frame_type: 'Full Rim',
      frame_material: 'Acetate & Light Metal',
      lens_width: '51 mm',
      bridge: '17 mm',
      temple_length: '140 mm',
      available_colors: JSON.stringify([
        { name: 'Translucent Grey', hex: '#6b7280' },
        { name: 'Rose Gold Smoke', hex: '#9ca3af' },
        { name: 'Classic Black', hex: '#111827' }
      ]),
      available_sizes: JSON.stringify(['S (Petite)', 'M (Standard)']),
      lens_coatings: JSON.stringify(['Anti-reflective', 'Blue-cut Screen Shield', 'Anti-Fog', 'Scratch Guard']),
      wa_message: "Hi Vision Opticals, I want to enquire about the Grey CatEye Eyeglasses for Women.",
      is_published: 1,
      is_featured: 1,
      is_bestseller: 1,
      is_new_arrival: 1,
      is_trending: 1,
      initial_stock: 18
    },
    {
      slug: 'metallic-titanium-wireframe',
      name: 'Precision Metallic Titanium Wireframe',
      category_slug: 'premium',
      brand: 'Silhouette',
      price: 6499,
      compare_at_price: 7999,
      badge: 'Premium',
      description: 'Aerospace-grade Japanese beta-titanium ultra-light wireframe. Weighs only 12 grams with zero nickel corrosion and hypoallergenic silicone nose pads.',
      primary_image: 'uploads/b13_26d0f43d-c626-48ef-9465-1a192c4a73d6_1200x.webp',
      secondary_image: 'images/tortoise_round_angle.jpg',
      color_family: 'Silver',
      product_tags: JSON.stringify(['metallic', 'computer', 'reading', 'men', 'unisex', 'premium']),
      lens_uv_cut: '100% UV400 Block',
      lens_blue_cut: '99% Blue-Cut Crizal Prevencia',
      lens_transmission: '99.6% Ultra-Clear Anti-Reflective',
      gender: 'Men',
      frame_shape: 'Rectangle',
      frame_type: 'Half Rim',
      frame_material: 'Beta Titanium',
      lens_width: '54 mm',
      bridge: '18 mm',
      temple_length: '145 mm',
      available_colors: JSON.stringify([
        { name: 'Brushed Titanium Silver', hex: '#94a3b8' },
        { name: 'Matte Gunmetal', hex: '#334155' },
        { name: 'Champagne Gold', hex: '#d97706' }
      ]),
      available_sizes: JSON.stringify(['M', 'L', 'XL']),
      lens_coatings: JSON.stringify(['Essilor Crizal Sapphire HR', '1.67 Ultra-Thin High Index', 'Hydrophobic']),
      wa_message: "Hi Vision Opticals, I'm interested in the Precision Metallic Titanium frame.",
      is_published: 1,
      is_featured: 1,
      is_bestseller: 0,
      is_new_arrival: 1,
      is_trending: 1,
      initial_stock: 14
    },
    {
      slug: 'slim-rectangle-acetate',
      name: 'Slim Rectangle Computer Glasses',
      category_slug: 'frames',
      brand: 'Vision Signature',
      price: 1299,
      compare_at_price: 1899,
      badge: 'Popular',
      description: 'Ergonomic rectangular computer spectacles engineered for IT professionals and prolonged screen reading. Blocks digital eye strain.',
      primary_image: 'images/slim rectangle frame.png',
      secondary_image: 'images/tortoise_round_angle.jpg',
      color_family: 'Black',
      product_tags: JSON.stringify(['computer', 'reading', 'men', 'unisex']),
      lens_uv_cut: '100% UV400 Cut',
      lens_blue_cut: '98% High-Energy Blue Light Cut',
      lens_transmission: '99.2% Anti-Glare Coating',
      gender: 'Unisex',
      frame_shape: 'Rectangle',
      frame_type: 'Full Rim',
      frame_material: 'TR90 Ultra-Flex',
      lens_width: '52 mm',
      bridge: '16 mm',
      temple_length: '140 mm',
      available_colors: JSON.stringify([
        { name: 'Matte Black', hex: '#1a1a1a' },
        { name: 'Deep Navy', hex: '#1e3a5f' },
        { name: 'Dark Havana', hex: '#7b4f2e' }
      ]),
      available_sizes: JSON.stringify(['S', 'M', 'L']),
      lens_coatings: JSON.stringify(['Anti-reflective Blue-Cut', 'UV400', 'Hard Coat Anti-Scratch']),
      wa_message: "Hi Vision Opticals, I'm interested in the Slim Rectangle Computer Glasses.",
      is_published: 1,
      is_featured: 1,
      is_bestseller: 1,
      is_new_arrival: 0,
      is_trending: 1,
      initial_stock: 30
    },
    {
      slug: 'rayban-classic-aviator-polarized',
      name: 'Ray-Ban Classic Aviator Polarized',
      category_slug: 'sunglasses',
      brand: 'Ray-Ban',
      price: 5677,
      compare_at_price: 6890,
      badge: 'Popular',
      description: 'The world iconic aviator pilot sunglasses with crystal polarized green G-15 lenses and durable gold monel frame.',
      primary_image: 'uploads/demo.jpeg',
      secondary_image: 'images/image5.webp',
      color_family: 'Gold',
      product_tags: JSON.stringify(['sunglasses', 'metallic', 'men', 'women', 'unisex']),
      lens_uv_cut: '100% Full UV400 Protection',
      lens_blue_cut: '95% Glare Reduction',
      lens_transmission: 'G-15 15% Transmittance Pilot Spec',
      gender: 'Unisex',
      frame_shape: 'Aviator',
      frame_type: 'Full Rim',
      frame_material: 'Monel Metal',
      lens_width: '58 mm',
      bridge: '14 mm',
      temple_length: '135 mm',
      available_colors: JSON.stringify([
        { name: 'Classic Gold / G-15', hex: '#b45309' },
        { name: 'Gunmetal Black', hex: '#111827' }
      ]),
      available_sizes: JSON.stringify(['M', 'L', 'XL']),
      lens_coatings: JSON.stringify(['Polarized Glare-Cut', 'UV400', 'Scratch Resistant Mineral Glass']),
      wa_message: "Hi Vision Opticals, I'm interested in the Ray-Ban Classic Aviator Sunglasses.",
      is_published: 1,
      is_featured: 1,
      is_bestseller: 1,
      is_new_arrival: 0,
      is_trending: 1,
      initial_stock: 16
    },
    {
      slug: '1day-acuvue-moist-30',
      name: '1-Day Acuvue Moist (30 Lenses)',
      category_slug: 'lenses',
      brand: 'Acuvue (Johnson & Johnson)',
      price: 1850,
      compare_at_price: 2200,
      badge: 'Daily',
      description: 'Daily disposable contact lenses with patented LACREON technology embedding a moisture-rich cushion for 16-hour hydration.',
      primary_image: 'images/lens1.jpg',
      secondary_image: 'images/lens2.jpeg',
      color_family: 'Clear',
      product_tags: JSON.stringify(['unisex', 'reading', 'computer']),
      lens_uv_cut: 'Class 2 UV Blocking (97% UVB / 82% UVA)',
      lens_blue_cut: 'N/A (Soft Contact Lens)',
      lens_transmission: '100% Optic Clarity',
      gender: 'Unisex',
      lens_power_range: '-0.50 to -12.00 D / +0.50 to +6.00 D',
      lens_water_content: '58%',
      lens_material: 'Etafilcon A (Hydrogel)',
      lens_duration: 'Daily disposable — 30 lenses per box',
      lens_features: JSON.stringify([
        'Class 2 UV-blocking technology',
        'LACREON moisture cushion',
        'Tapered edge for blink-free sensation',
        'Inside-out 1-2-3 indicator'
      ]),
      wa_message: "Hi Vision Opticals, I want to order 1-Day Acuvue Moist contact lenses.",
      is_published: 1,
      is_featured: 1,
      is_bestseller: 1,
      is_new_arrival: 0,
      is_trending: 1,
      initial_stock: 45
    },
    {
      slug: 'bausch-lomb-soflens-59',
      name: 'Bausch + Lomb SofLens 59 (6 Lenses)',
      category_slug: 'lenses',
      brand: 'Bausch & Lomb',
      price: 1199,
      compare_at_price: 1450,
      badge: 'Monthly',
      description: 'Monthly wear soft contact lenses manufactured from protein-resistant Hilafilcon B polymer providing crisp vision and easy handling.',
      primary_image: 'images/lens2.jpeg',
      secondary_image: 'images/lens3.jpeg',
      color_family: 'Clear',
      product_tags: JSON.stringify(['unisex', 'reading', 'computer']),
      lens_uv_cut: 'Standard Ocular UV Protection',
      lens_blue_cut: 'High Oxygen Transmissibility',
      lens_transmission: '99.8% Refraction Clearness',
      gender: 'Unisex',
      lens_power_range: '-0.50 to -9.00 D',
      lens_water_content: '59% Water Hydration',
      lens_material: 'Hilafilcon B Polymer',
      lens_duration: 'Monthly Disposable (6 pack)',
      lens_features: JSON.stringify([
        'Protein-resistant polymer matrix',
        'Time-tested comfort profile',
        'Easy-to-grip handling edge'
      ]),
      wa_message: "Hi Vision Opticals, I want to enquire about Bausch + Lomb SofLens 59.",
      is_published: 1,
      is_featured: 0,
      is_bestseller: 0,
      is_new_arrival: 0,
      is_trending: 1,
      initial_stock: 35
    },
    {
      slug: 'freshlook-colorblends-blue',
      name: 'FreshLook ColorBlends Cosmetic Lenses',
      category_slug: 'lenses',
      brand: 'FreshLook',
      price: 1799,
      compare_at_price: 2100,
      badge: 'Coloured',
      description: '3-in-1 color blend technology seamlessly changes eye color for a natural look. Available in Brilliant Blue, Gemstone Green, and Pure Hazel.',
      primary_image: 'images/lens3.jpeg',
      secondary_image: 'images/lens1.jpg',
      color_family: 'Blue',
      product_tags: JSON.stringify(['women', 'unisex', 'new_design']),
      lens_uv_cut: 'UV-absorbing polymer coating',
      lens_blue_cut: 'Cosmetic iris enhancement',
      lens_transmission: 'Natural optical aperture',
      gender: 'Women',
      lens_power_range: 'Plano 0.00 to -8.00 D',
      lens_water_content: '55% Water Content',
      lens_material: 'Phemfilcon A',
      lens_duration: 'Monthly Disposable',
      lens_features: JSON.stringify([
        'Advanced 3-in-1 color blending',
        'Natural depth iris pattern',
        'Daily comfort wear'
      ]),
      wa_message: "Hi Vision Opticals, I'm interested in FreshLook ColorBlends cosmetic lenses.",
      is_published: 1,
      is_featured: 1,
      is_bestseller: 1,
      is_new_arrival: 1,
      is_trending: 1,
      initial_stock: 28
    },
    {
      slug: 'titanium-royal-gold-executive',
      name: 'Titanium Royal Gold Executive Frame',
      category_slug: 'premium',
      brand: 'Zeiss',
      price: 5990,
      compare_at_price: 7800,
      badge: 'Premium',
      description: 'Pure titanium semi-rimless frame with electroplated 24K gold finish. Designed for distinguished professionals and all-day board meetings.',
      primary_image: 'uploads/b13_26d0f43d-c626-48ef-9465-1a192c4a73d6_1200x.webp',
      secondary_image: 'images/image5.webp',
      color_family: 'Gold',
      product_tags: JSON.stringify(['metallic', 'men', 'computer', 'reading', 'premium']),
      lens_uv_cut: '100% Zeiss UVProtect 400nm',
      lens_blue_cut: 'Zeiss DuraVision BlueProtect 99%',
      lens_transmission: '99.5% Anti-Reflective Clarity',
      gender: 'Men',
      frame_shape: 'Square',
      frame_type: 'Half Rim',
      frame_material: 'Pure Titanium & 24K Gold Plated',
      lens_width: '53 mm',
      bridge: '17 mm',
      temple_length: '142 mm',
      available_colors: JSON.stringify([
        { name: 'Royal Gold', hex: '#d4af37' },
        { name: 'Rose Gold', hex: '#b76e79' }
      ]),
      available_sizes: JSON.stringify(['M', 'L']),
      lens_coatings: JSON.stringify(['Zeiss DuraVision Platinum', 'BlueProtect', 'Oleophobic']),
      wa_message: "Hi Vision Opticals, I want details about the Zeiss Titanium Royal Gold Executive frame.",
      is_published: 1,
      is_featured: 1,
      is_bestseller: 0,
      is_new_arrival: 1,
      is_trending: 1,
      initial_stock: 12
    },
    {
      slug: 'matte-black-ultralight-square',
      name: 'Matte Black Ultralight Square Frame',
      category_slug: 'frames',
      brand: 'Fastrack',
      price: 1499,
      compare_at_price: 2199,
      badge: 'Popular',
      description: 'Featherlight square eyeglasses molded from aerospace Ultem resin. Resilient against impact and flexible for active work lifestyles.',
      primary_image: 'images/slim rectangle frame.png',
      secondary_image: 'images/tortoise_round_angle.jpg',
      color_family: 'Black',
      product_tags: JSON.stringify(['computer', 'reading', 'men', 'unisex']),
      lens_uv_cut: '100% UV400 Protection',
      lens_blue_cut: '98% Blue-Cut Digital Filter',
      lens_transmission: '99.3% Anti-Glare Optical Purity',
      gender: 'Men',
      frame_shape: 'Square',
      frame_type: 'Full Rim',
      frame_material: 'Ultem High-Flex Polymer',
      lens_width: '54 mm',
      bridge: '16 mm',
      temple_length: '140 mm',
      available_colors: JSON.stringify([
        { name: 'Matte Black', hex: '#111827' },
        { name: 'Charcoal Grey', hex: '#374151' }
      ]),
      available_sizes: JSON.stringify(['M', 'L']),
      lens_coatings: JSON.stringify(['Anti-reflective', 'Blue-Cut', 'Hydrophobic']),
      wa_message: "Hi Vision Opticals, I want to enquire about the Matte Black Ultralight Square frame.",
      is_published: 1,
      is_featured: 1,
      is_bestseller: 1,
      is_new_arrival: 0,
      is_trending: 1,
      initial_stock: 35
    },
    {
      slug: 'crystal-clear-transparent-round',
      name: 'Crystal Clear Transparent Acetate Round',
      category_slug: 'frames',
      brand: 'Vision Signature',
      price: 2299,
      compare_at_price: 3499,
      badge: 'New',
      description: 'Luminous crystal-clear polished acetate in a timeless round shape. Perfectly compliments every face shape and modern minimal aesthetics.',
      primary_image: 'images/image1.jpg',
      secondary_image: 'images/tortoise_round_angle.jpg',
      color_family: 'Crystal Clear',
      product_tags: JSON.stringify(['new_design', 'computer', 'women', 'men', 'unisex']),
      lens_uv_cut: '100% UV400',
      lens_blue_cut: '98% Digital HEV Filter',
      lens_transmission: '99.4% Anti-Glare Night Driving',
      gender: 'Unisex',
      frame_shape: 'Round',
      frame_type: 'Full Rim',
      frame_material: 'Virgin Crystal Acetate',
      lens_width: '50 mm',
      bridge: '19 mm',
      temple_length: '145 mm',
      available_colors: JSON.stringify([
        { name: 'Transparent Clear', hex: '#f8fafc' },
        { name: 'Champagne Tint', hex: '#fef3c7' }
      ]),
      available_sizes: JSON.stringify(['S', 'M', 'L']),
      lens_coatings: JSON.stringify(['Blue-Cut Screen Filter', 'Anti-Glare', 'Easy-Clean Oleophobic']),
      wa_message: "Hi Vision Opticals, I'm interested in the Crystal Clear Transparent Acetate Round frame.",
      is_published: 1,
      is_featured: 1,
      is_bestseller: 0,
      is_new_arrival: 1,
      is_trending: 1,
      initial_stock: 22
    },
    {
      slug: 'ocean-blue-geometric-wayfarer',
      name: 'Ocean Blue Geometric Sunglasses',
      category_slug: 'sunglasses',
      brand: 'Ray-Ban',
      price: 7490,
      compare_at_price: 9200,
      badge: 'Sale',
      description: 'Angular geometric sunglasses featuring deep ocean blue translucent acetate and polarized mirror lenses with complete glare control.',
      primary_image: 'uploads/demo.jpeg',
      secondary_image: 'images/image1.jpg',
      color_family: 'Blue',
      product_tags: JSON.stringify(['sunglasses', 'new_design', 'men', 'women', 'unisex']),
      lens_uv_cut: '100% UV400 Polarized Blue Mirror',
      lens_blue_cut: '95% Outdoor Glare Block',
      lens_transmission: '12% Daylight Category 3 Spec',
      gender: 'Unisex',
      frame_shape: 'Geometric',
      frame_type: 'Full Rim',
      frame_material: 'Handcrafted Acetate',
      lens_width: '53 mm',
      bridge: '20 mm',
      temple_length: '145 mm',
      available_colors: JSON.stringify([
        { name: 'Ocean Blue Mirror', hex: '#1d4ed8' },
        { name: 'Gloss Black', hex: '#000000' }
      ]),
      available_sizes: JSON.stringify(['M', 'L']),
      lens_coatings: JSON.stringify(['Polarized Reflection Cut', 'Hydrophobic Salt-Water Guard']),
      wa_message: "Hi Vision Opticals, I want details about the Ocean Blue Geometric Sunglasses.",
      is_published: 1,
      is_featured: 1,
      is_bestseller: 1,
      is_new_arrival: 1,
      is_trending: 1,
      initial_stock: 14
    },
    {
      slug: 'kids-flexible-unbreakable-blue',
      name: 'Kids Flexible Unbreakable Optical Frame',
      category_slug: 'kids',
      brand: 'Vision Kids Care',
      price: 999,
      compare_at_price: 1499,
      badge: 'Kids',
      description: '100% twistable, unbreakable medical-grade rubber TR90 optical frames for kids aged 4-12. Features soft elastic head strap and zero-metal hinges.',
      primary_image: 'images/slim rectangle frame.png',
      secondary_image: 'images/image1.jpg',
      color_family: 'Blue',
      product_tags: JSON.stringify(['computer', 'reading', 'new_design']),
      lens_uv_cut: '100% UV400 Impact Resistant Polycarbonate',
      lens_blue_cut: '99% Children Eye-Shield Blue Filter',
      lens_transmission: '99.5% Distortion-Free Optics',
      gender: 'Kids',
      frame_shape: 'Rectangle',
      frame_type: 'Full Rim',
      frame_material: 'Flexible Rubberized TR90',
      lens_width: '46 mm',
      bridge: '15 mm',
      temple_length: '125 mm',
      available_colors: JSON.stringify([
        { name: 'Royal Blue', hex: '#2563eb' },
        { name: 'Fire Red', hex: '#dc2626' },
        { name: 'Teal Green', hex: '#0d9488' }
      ]),
      available_sizes: JSON.stringify(['Kids Small (Age 4-7)', 'Kids Medium (Age 8-12)']),
      lens_coatings: JSON.stringify(['Shatterproof Polycarbonate', 'Blue-Cut Screen Guard', 'Anti-Scratch']),
      wa_message: "Hi Vision Opticals, I want to order the Kids Flexible Unbreakable Optical Frame.",
      is_published: 1,
      is_featured: 1,
      is_bestseller: 1,
      is_new_arrival: 1,
      is_trending: 1,
      initial_stock: 40
    },
    {
      slug: 'kids-pastel-round-featherweight',
      name: 'Kids Pastel Round Featherweight',
      category_slug: 'kids',
      brand: 'Vision Kids Care',
      price: 1199,
      compare_at_price: 1699,
      badge: 'Kids',
      description: 'Charming pastel round frame for young girls and boys. Crafted from food-grade BPA-free polymer with soft silicone nose pads that prevent slipping.',
      primary_image: 'images/image1.jpg',
      secondary_image: 'images/tortoise_round_angle.jpg',
      color_family: 'Crystal Clear',
      product_tags: JSON.stringify(['computer', 'reading', 'women']),
      lens_uv_cut: '100% UV400 Child Eye Guard',
      lens_blue_cut: '98% Tablet & Mobile Blue-Shield',
      lens_transmission: '99.2% Optic Purity',
      gender: 'Kids',
      frame_shape: 'Round',
      frame_type: 'Full Rim',
      frame_material: 'BPA-Free Food Grade Polymer',
      lens_width: '45 mm',
      bridge: '16 mm',
      temple_length: '128 mm',
      available_colors: JSON.stringify([
        { name: 'Pastel Pink / Clear', hex: '#fbcfe8' },
        { name: 'Lavender Violet', hex: '#e9d5ff' },
        { name: 'Sky Cyan', hex: '#cffafe' }
      ]),
      available_sizes: JSON.stringify(['Kids Standard']),
      lens_coatings: JSON.stringify(['Impact Safe', 'Blue-Cut', 'Easy Clean']),
      wa_message: "Hi Vision Opticals, I want to enquire about the Kids Pastel Round Featherweight.",
      is_published: 1,
      is_featured: 0,
      is_bestseller: 0,
      is_new_arrival: 1,
      is_trending: 1,
      initial_stock: 26
    },
    {
      slug: 'titanium-silver-half-rim-reading',
      name: 'Titanium Silver Half-Rim Reading Classic',
      category_slug: 'frames',
      brand: 'Essilor',
      price: 3299,
      compare_at_price: 4500,
      badge: 'Bestseller',
      description: 'Sophisticated half-rim frame manufactured from pure titanium wire. Ideal for reading, progressive multifocals, and senior vision comfort.',
      primary_image: 'uploads/b13_26d0f43d-c626-48ef-9465-1a192c4a73d6_1200x.webp',
      secondary_image: 'images/tortoise_round_angle.jpg',
      color_family: 'Silver',
      product_tags: JSON.stringify(['reading', 'metallic', 'men', 'unisex']),
      lens_uv_cut: '100% UV400',
      lens_blue_cut: '98% Varilux Blue-Cut Shield',
      lens_transmission: '99.4% Anti-Glare Driving Clarity',
      gender: 'Men',
      frame_shape: 'Rectangle',
      frame_type: 'Half Rim',
      frame_material: 'Pure Titanium Wire',
      lens_width: '52 mm',
      bridge: '18 mm',
      temple_length: '142 mm',
      available_colors: JSON.stringify([
        { name: 'Polished Silver', hex: '#cbd5e1' },
        { name: 'Slate Grey', hex: '#475569' }
      ]),
      available_sizes: JSON.stringify(['M', 'L']),
      lens_coatings: JSON.stringify(['Essilor Crizal Easy Pro', 'High-Index 1.60', 'Anti-Static']),
      wa_message: "Hi Vision Opticals, I'm interested in the Titanium Silver Half-Rim Reading Classic.",
      is_published: 1,
      is_featured: 1,
      is_bestseller: 1,
      is_new_arrival: 0,
      is_trending: 1,
      initial_stock: 20
    },
    {
      slug: 'vintage-clubmaster-browline-tortoise',
      name: 'Vintage Clubmaster Browline Tortoise & Gold',
      category_slug: 'frames',
      brand: 'Ray-Ban',
      price: 8490,
      compare_at_price: 9990,
      badge: 'Premium',
      description: 'Iconic retro browline silhouette uniting acetate tortoiseshell browbars with gold filigree engraved bridge. A classic for intellectuals.',
      primary_image: 'images/tortoise_round_front.jpg',
      secondary_image: 'images/tortoise_round_angle.jpg',
      color_family: 'Tortoise',
      product_tags: JSON.stringify(['metallic', 'computer', 'reading', 'new_design', 'men', 'unisex']),
      lens_uv_cut: '100% UV400',
      lens_blue_cut: '98% Blue-Cut Prevencia',
      lens_transmission: '99.5% Anti-Reflective Night Purity',
      gender: 'Unisex',
      frame_shape: 'Browline',
      frame_type: 'Half Rim',
      frame_material: 'Italian Acetate & Engraved Metal',
      lens_width: '51 mm',
      bridge: '21 mm',
      temple_length: '145 mm',
      available_colors: JSON.stringify([
        { name: 'Mock Tortoise / Arista Gold', hex: '#78350f' },
        { name: 'Ebony Black / Gold', hex: '#0f172a' }
      ]),
      available_sizes: JSON.stringify(['M (49)', 'L (51)']),
      lens_coatings: JSON.stringify(['Ray-Ban Authentic Prescription Lenses', 'Crizal Prevencia', 'Oleophobic']),
      wa_message: "Hi Vision Opticals, I want details about the Vintage Clubmaster Browline Tortoise frame.",
      is_published: 1,
      is_featured: 1,
      is_bestseller: 1,
      is_new_arrival: 1,
      is_trending: 1,
      initial_stock: 15
    },
    {
      slug: 'polarized-gold-aviator-sunglasses',
      name: 'Polarized Gold Aviator Sunglasses',
      category_slug: 'sunglasses',
      brand: 'Titan Eye+',
      price: 3999,
      compare_at_price: 4999,
      badge: 'Popular',
      description: 'Classic double-bridge aviator crafted in high-luster gold with polarized dark green lenses providing 100% glare elimination for driving.',
      primary_image: 'uploads/demo.jpeg',
      secondary_image: 'images/image5.webp',
      color_family: 'Gold',
      product_tags: JSON.stringify(['sunglasses', 'metallic', 'men', 'women']),
      lens_uv_cut: '100% UV400 Polarized',
      lens_blue_cut: '95% Outdoor Glare Block',
      lens_transmission: '14% Cat 3 Daylight Spec',
      gender: 'Men',
      frame_shape: 'Aviator',
      frame_type: 'Full Rim',
      frame_material: 'Corrosion-Resistant Gold Alloy',
      lens_width: '58 mm',
      bridge: '14 mm',
      temple_length: '138 mm',
      available_colors: JSON.stringify([
        { name: 'Gold / Dark Green', hex: '#d97706' },
        { name: 'Silver / Grey', hex: '#94a3b8' }
      ]),
      available_sizes: JSON.stringify(['M', 'L']),
      lens_coatings: JSON.stringify(['Tri-Acetate Polarized Filter', 'UV400', 'Hydrophobic']),
      wa_message: "Hi Vision Opticals, I want to buy the Polarized Gold Aviator Sunglasses (Titan Eye+).",
      is_published: 1,
      is_featured: 1,
      is_bestseller: 0,
      is_new_arrival: 1,
      is_trending: 1,
      initial_stock: 22
    },
    {
      slug: 'gunmetal-titanium-square-rimless',
      name: 'Gunmetal Titanium Square Rimless',
      category_slug: 'premium',
      brand: 'Silhouette',
      price: 7990,
      compare_at_price: 10500,
      badge: 'Premium',
      description: 'Minimalist Austrian rimless design with zero screws or hinges. Ultra-flexible SPX memory titanium temples weighing an astounding 8.5 grams.',
      primary_image: 'uploads/b13_26d0f43d-c626-48ef-9465-1a192c4a73d6_1200x.webp',
      secondary_image: 'images/tortoise_round_angle.jpg',
      color_family: 'Gunmetal',
      product_tags: JSON.stringify(['metallic', 'men', 'premium', 'computer', 'reading']),
      lens_uv_cut: '100% UV400 Shield',
      lens_blue_cut: 'Zeiss DuraVision Platinum AR 99.4%',
      lens_transmission: '99.6% Transmittance',
      gender: 'Men',
      frame_shape: 'Square',
      frame_type: 'Rimless',
      frame_material: 'High-Tensile Titanium Wire',
      lens_width: '53 mm',
      bridge: '19 mm',
      temple_length: '145 mm',
      available_colors: JSON.stringify([
        { name: 'Matte Gunmetal', hex: '#334155' },
        { name: 'Titanium Blue', hex: '#1e3a5f' }
      ]),
      available_sizes: JSON.stringify(['M', 'L', 'XL']),
      lens_coatings: JSON.stringify(['Zeiss High-Index 1.67 Polycarbonate', 'Hard Coat', 'Anti-Reflective']),
      wa_message: "Hi Vision Opticals, I'm interested in the Gunmetal Titanium Square Rimless frame.",
      is_published: 1,
      is_featured: 1,
      is_bestseller: 1,
      is_new_arrival: 1,
      is_trending: 1,
      initial_stock: 10
    }
  ];

  for (const p of productsList) {
    const res = await db.run(
      `INSERT INTO products (
        slug, name, category_slug, brand, price, compare_at_price, badge, description,
        primary_image, secondary_image, color_family, product_tags, lens_uv_cut, lens_blue_cut, lens_transmission,
        gender, frame_shape, frame_type, frame_material, lens_width, bridge, temple_length,
        available_colors, available_sizes, lens_coatings,
        lens_power_range, lens_water_content, lens_material, lens_duration, lens_features,
        wa_message, is_published, is_featured, is_bestseller, is_new_arrival, is_trending
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        p.slug, p.name, p.category_slug, p.brand, p.price, p.compare_at_price, p.badge, p.description,
        p.primary_image, p.secondary_image, p.color_family, p.product_tags, p.lens_uv_cut, p.lens_blue_cut, p.lens_transmission,
        p.gender, p.frame_shape, p.frame_type, p.frame_material, p.lens_width, p.bridge, p.temple_length,
        p.available_colors, p.available_sizes, p.lens_coatings,
        p.lens_power_range, p.lens_water_content, p.lens_material, p.lens_duration, p.lens_features,
        p.wa_message, p.is_published, p.is_featured, p.is_bestseller, p.is_new_arrival, p.is_trending
      ]
    );

    const productId = res.lastID;

    // Add primary and secondary images to product_images
    if (p.primary_image) {
      await db.run(
        `INSERT INTO product_images (product_id, url, angle_label, is_primary, sort_order) VALUES (?, ?, 'Front View', 1, 1)`,
        [productId, p.primary_image]
      );
    }
    if (p.secondary_image) {
      await db.run(
        `INSERT INTO product_images (product_id, url, angle_label, is_primary, sort_order) VALUES (?, ?, 'Angle View (Hover)', 0, 2)`,
        [productId, p.secondary_image]
      );
    }

    // Inventory
    await db.run(
      `INSERT INTO inventory (product_id, quantity, low_stock_threshold, sku) VALUES (?, ?, 4, ?)`,
      [productId, p.initial_stock, 'SKU-VO-' + productId.toString().padStart(4, '0')]
    );
    await db.run(
      `INSERT INTO inventory_logs (product_id, change_amount, final_quantity, reason, user_name) VALUES (?, ?, ?, ?, ?)`,
      [productId, p.initial_stock, p.initial_stock, 'Initial Catalog Seed', 'System Seed']
    );
  }
  console.log(`✓ Seeded ${productsList.length} premium products with dual hover angles & lens advantage metrics`);

  // 5. Seed Modular Website Components (with Add & Undo architecture)
  await db.run('DELETE FROM modular_components');
  const initialComponents = [
    {
      component_id: 'comp_hero',
      type: 'banner',
      title: 'Eyewear Crafted for Every Face',
      subtitle: '500+ luxury styles · 20+ world-class brands · 25 years of precision optometry in Thiruvarur.',
      badge: 'Vision Opticals since 2000',
      display_order: 1,
      is_enabled: 1,
      config_json: JSON.stringify({
        bg_image: 'images/Gemini_Generated_Image_8f7nbf8f7nbf8f7n.png',
        cta_text: 'Explore Eyewear Collection',
        cta_link: '#catalog'
      })
    },
    {
      component_id: 'comp_quick_attributes',
      type: 'category_chips',
      title: 'Shop By Style & Needs',
      subtitle: 'Instant filters for your exact eyewear lifestyle.',
      badge: 'Quick Discovery',
      display_order: 2,
      is_enabled: 1,
      config_json: JSON.stringify({
        chips: [
          { label: '👓 Computer Glasses', tag: 'computer' },
          { label: '📖 Reading Glasses', tag: 'reading' },
          { label: '🕶️ Sunglasses', tag: 'sunglasses' },
          { label: '✨ Metallic / Titanium', tag: 'metallic' },
          { label: '🔥 New Designs', tag: 'new_design' },
          { label: '👨 Men', tag: 'men' },
          { label: '👩 Women', tag: 'women' },
          { label: '🎨 Shop by Color', tag: 'colors' }
        ]
      })
    },
    {
      component_id: 'comp_lens_advantages',
      type: 'lens_guide',
      title: 'Precision Lens Coatings & Advantages',
      subtitle: 'Compare scientific protection metrics before selecting your lenses.',
      badge: 'Optical Science',
      display_order: 3,
      is_enabled: 1,
      config_json: JSON.stringify({
        items: [
          { name: 'Anti-Glare (AR) Clarity', metric: '99.4% Clarity', desc: 'Eliminates halo reflections and nighttime driving glare' },
          { name: 'Blue-Cut Digital Shield', metric: '98% HEV Cut', desc: 'Blocks high-energy 400-450nm digital blue light' },
          { name: 'Photochromic Transitions', metric: '100% UV400', desc: 'Darkens from clear indoors to 85% tint in sunlight' },
          { name: '1.67 High Index Thin', metric: '40% Thinner', desc: 'Flattens edge thickness for strong minus & plus powers' }
        ]
      })
    },
    {
      component_id: 'comp_brands',
      type: 'brand_strip',
      title: 'Shop By Official Brands',
      subtitle: 'Authorized dealer for Titan Eye+, Ray-Ban, Essilor, Zeiss, and Silhouette.',
      badge: '100% Genuine',
      display_order: 4,
      is_enabled: 1,
      config_json: JSON.stringify({})
    }
  ];

  for (const c of initialComponents) {
    await db.run(
      `INSERT INTO modular_components (component_id, type, title, subtitle, badge, display_order, is_enabled, config_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [c.component_id, c.type, c.title, c.subtitle, c.badge, c.display_order, c.is_enabled, c.config_json]
    );
  }
  console.log(`✓ Seeded ${initialComponents.length} modular components`);

  // 6. Seed Sample Appointment & Order
  const sampleApt = await db.get('SELECT COUNT(*) as count FROM appointments');
  if (sampleApt.count === 0) {
    await db.run(
      `INSERT INTO appointments (appointment_number, customer_name, phone, appointment_date, time_slot, service_type, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['VO-APT-1001', 'Sundaram Ramanathan', '98421 11234', '2026-11-20', '10:30 AM – 11:30 AM', 'Computerised Eye Test', 'Annual vision checkup and progressive trial']
    );
    console.log('✓ Seeded sample in-store appointment');
  }

  console.log('\n=========================================');
  console.log('✓ Vision Opticals Part 2 Database Seeded!');
  console.log('=========================================\n');
}

if (require.main === module) {
  seed().then(() => process.exit(0)).catch(err => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
}

module.exports = seed;
