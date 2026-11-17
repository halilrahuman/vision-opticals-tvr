const http = require('http');

const PORT = 5000;
const HOST = 'localhost';

function request(path, options = {}) {
  return new Promise((resolve) => {
    const method = options.method || 'GET';
    const headers = { ...(options.headers || {}) };
    let body = options.body;

    if (body && typeof body === 'object' && !(body instanceof Buffer)) {
      body = JSON.stringify(body);
      if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
    }

    if (body) {
      headers['Content-Length'] = Buffer.byteLength(body);
    } else if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      headers['Content-Length'] = 0;
    } else {
      delete headers['Content-Length'];
    }

    const req = http.request({
      hostname: HOST,
      port: PORT,
      path,
      method,
      headers,
      timeout: 5000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch (_) {
          parsed = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsed
        });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 408, error: 'Request Timeout (5s)' });
    });

    req.on('error', (err) => {
      resolve({ status: 0, error: err.message });
    });

    if (body) req.write(body);
    req.end();
  });
}

async function runAudit() {
  console.log('====================================================');
  console.log('🔬 STARTING COMPLETE API AUDIT FOR VISION OPTICALS');
  console.log('====================================================\n');

  const results = [];

  function record(name, endpoint, passed, details, status) {
    results.push({ name, endpoint, passed, details, status });
    const mark = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${mark} | [${status || 'ERR'}] ${name} (${endpoint})`);
    if (!passed) {
      console.log(`   -> Error Details:`, typeof details === 'object' ? JSON.stringify(details) : details);
    }
  }

  // 1. Health
  const health = await request('/api/health');
  record('Health Check', '/api/health', health.status === 200 && health.data.status === 'ok', health.data, health.status);

  // 2. Auth Login
  const login = await request('/api/auth/login', {
    method: 'POST',
    body: { username: 'admin', password: 'vision123' }
  });
  const token = login.data && login.data.token;
  record('Auth Login', '/api/auth/login', login.status === 200 && !!token, login.data, login.status);

  const authHeader = { 'Authorization': `Bearer ${token}` };

  // 3. Auth Me
  const me = await request('/api/auth/me', { headers: authHeader });
  record('Auth Me', '/api/auth/me', me.status === 200 && me.data.user && me.data.user.username === 'admin', me.data, me.status);

  // 4. Categories & Brands
  const cats = await request('/api/categories');
  record('Get Categories', '/api/categories', cats.status === 200 && Array.isArray(cats.data.categories), cats.data, cats.status);

  const brands = await request('/api/categories/brands');
  record('Get Brands', '/api/categories/brands', brands.status === 200 && Array.isArray(brands.data.brands), brands.data, brands.status);

  const addBrand = await request('/api/categories/brands', {
    method: 'POST',
    headers: authHeader,
    body: { name: 'Audit Brand ' + Date.now(), is_featured: 1 }
  });
  record('Add Brand (Admin)', '/api/categories/brands', addBrand.status === 201 && addBrand.data.success, addBrand.data, addBrand.status);

  // 5. Products
  const prods = await request('/api/products');
  record('List Products', '/api/products', prods.status === 200 && prods.data.count > 0, prods.data, prods.status);

  const firstProdId = prods.data.products && prods.data.products[0] ? prods.data.products[0].id : null;
  const firstProdSlug = prods.data.products && prods.data.products[0] ? prods.data.products[0].slug : null;

  if (firstProdId) {
    const prodById = await request(`/api/products/${firstProdId}`);
    record('Get Product by ID', `/api/products/${firstProdId}`, prodById.status === 200 && prodById.data.product, prodById.data, prodById.status);

    const prodBySlug = await request(`/api/products/${firstProdSlug}`);
    record('Get Product by Slug', `/api/products/${firstProdSlug}`, prodBySlug.status === 200 && prodBySlug.data.product, prodBySlug.data, prodBySlug.status);
  }

  // Create test product
  const createProd = await request('/api/products', {
    method: 'POST',
    headers: authHeader,
    body: {
      name: 'API Audit Frame Model X',
      category_slug: 'frames',
      brand: 'Vision Lab',
      price: 2499,
      compare_at_price: 3499,
      stock_quantity: 12,
      low_stock_threshold: 4,
      gender: 'Unisex',
      frame_shape: 'Round',
      frame_type: 'Full Rim',
      frame_material: 'Acetate',
      primary_image: 'images/tortoise_round_front.jpg',
      secondary_image: 'images/tortoise_round_angle.jpg'
    }
  });
  const createdProdId = createProd.data && createProd.data.productId;
  record('Create Product (Admin)', '/api/products', createProd.status === 201 && !!createdProdId, createProd.data, createProd.status);

  if (createdProdId) {
    const updateProd = await request(`/api/products/${createdProdId}`, {
      method: 'PUT',
      headers: authHeader,
      body: {
        name: 'API Audit Frame Model X Updated',
        price: 2699,
        stock_quantity: 15
      }
    });
    record('Update Product (Admin)', `/api/products/${createdProdId}`, updateProd.status === 200 && updateProd.data.success, updateProd.data, updateProd.status);

    const toggleProd = await request(`/api/products/${createdProdId}/toggle-publish`, {
      method: 'PATCH',
      headers: authHeader
    });
    record('Toggle Publish Product', `/api/products/${createdProdId}/toggle-publish`, toggleProd.status === 200 && toggleProd.data.success, toggleProd.data, toggleProd.status);

    const delProd = await request(`/api/products/${createdProdId}`, {
      method: 'DELETE',
      headers: authHeader
    });
    record('Delete Product (Admin)', `/api/products/${createdProdId}`, delProd.status === 200 && delProd.data.success, delProd.data, delProd.status);
  }

  // 6. Inventory
  const invSummary = await request('/api/inventory/summary', { headers: authHeader });
  record('Inventory Summary', '/api/inventory/summary', invSummary.status === 200 && invSummary.data.summary, invSummary.data, invSummary.status);

  const invList = await request('/api/inventory', { headers: authHeader });
  record('Inventory List', '/api/inventory', invList.status === 200 && Array.isArray(invList.data.items), invList.data, invList.status);

  const invAdjust = await request('/api/inventory/adjust', {
    method: 'POST',
    headers: authHeader,
    body: { productId: firstProdId, delta: 1, reason: 'API Audit Restock' }
  });
  record('Inventory Adjust (+/-)', '/api/inventory/adjust', invAdjust.status === 200 && invAdjust.data.success, invAdjust.data, invAdjust.status);

  const invSet = await request('/api/inventory/set', {
    method: 'POST',
    headers: authHeader,
    body: { productId: firstProdId, quantity: 20, lowStockThreshold: 3, reason: 'API Audit Set' }
  });
  record('Inventory Set Exact', '/api/inventory/set', invSet.status === 200 && invSet.data.success, invSet.data, invSet.status);

  const invLogs = await request('/api/inventory/logs', { headers: authHeader });
  record('Inventory Logs (Global)', '/api/inventory/logs', invLogs.status === 200 && Array.isArray(invLogs.data.logs), invLogs.data, invLogs.status);

  const invProdLogs = await request(`/api/inventory/logs/${firstProdId}`, { headers: authHeader });
  record('Inventory Logs (By Product)', `/api/inventory/logs/${firstProdId}`, invProdLogs.status === 200 && Array.isArray(invProdLogs.data.logs), invProdLogs.data, invProdLogs.status);

  // 7. Offers & Promotions
  const activeOffers = await request('/api/offers/active');
  record('Active Offers (Public)', '/api/offers/active', activeOffers.status === 200 && Array.isArray(activeOffers.data.offers), activeOffers.data, activeOffers.status);

  const allOffers = await request('/api/offers', { headers: authHeader });
  record('Offers List (Admin)', '/api/offers', allOffers.status === 200 && Array.isArray(allOffers.data.offers), allOffers.data, allOffers.status);

  const createOffer = await request('/api/offers', {
    method: 'POST',
    headers: authHeader,
    body: {
      title: 'Audit Test Offer 10%',
      subtitle: 'Special promo for test',
      code: 'TEST10',
      discount_type: 'percentage',
      discount_value: 10,
      applicable_category: 'all',
      is_active: 1
    }
  });
  const createdOfferId = createOffer.data && createOffer.data.offerId;
  record('Create Offer (Admin)', '/api/offers', createOffer.status === 201 && !!createdOfferId, createOffer.data, createOffer.status);

  if (createdOfferId) {
    const toggleOffer = await request(`/api/offers/${createdOfferId}/toggle`, {
      method: 'PATCH',
      headers: authHeader
    });
    record('Toggle Offer (Admin)', `/api/offers/${createdOfferId}/toggle`, toggleOffer.status === 200 && toggleOffer.data.success, toggleOffer.data, toggleOffer.status);

    const delOffer = await request(`/api/offers/${createdOfferId}`, {
      method: 'DELETE',
      headers: authHeader
    });
    record('Delete Offer (Admin)', `/api/offers/${createdOfferId}`, delOffer.status === 200 && delOffer.data.success, delOffer.data, delOffer.status);
  }

  // 8. Content & Sections
  const hpContent = await request('/api/content/homepage');
  record('Homepage Content (Public)', '/api/content/homepage', hpContent.status === 200 && Array.isArray(hpContent.data.sections), hpContent.data, hpContent.status);

  const allSections = await request('/api/content/sections', { headers: authHeader });
  record('All Sections (Admin)', '/api/content/sections', allSections.status === 200 && Array.isArray(allSections.data.sections), allSections.data, allSections.status);

  const updateSection = await request('/api/content/sections/hero', {
    method: 'PUT',
    headers: authHeader,
    body: {
      title: 'Precision Optical Care & Luxury Eyewear',
      subtitle: 'Verified by optometrists at Vision Opticals Thiruvarur.',
      badge: 'Thiruvarur Eyewear Destination'
    }
  });
  record('Update Section (Admin)', '/api/content/sections/hero', updateSection.status === 200 && updateSection.data.success, updateSection.data, updateSection.status);

  // 9. Store Settings
  const settings = await request('/api/settings');
  record('Store Settings (Public)', '/api/settings', settings.status === 200 && settings.data.settings, settings.data, settings.status);

  const updateSettings = await request('/api/settings', {
    method: 'PUT',
    headers: authHeader,
    body: {
      phone: '94865 52324',
      whatsapp: '919486552324',
      email: 'info@visionopticals.in'
    }
  });
  record('Update Settings (Admin)', '/api/settings', updateSettings.status === 200 && updateSettings.data.success, updateSettings.data, updateSettings.status);

  // 10. Photo Library & Bulk CSV
  const library = await request('/api/upload/library', { headers: authHeader });
  record('Photo Library (Admin)', '/api/upload/library', library.status === 200 && Array.isArray(library.data.images), library.data, library.status);

  const templateCsv = await request('/api/bulk/template-csv', { headers: authHeader });
  record('Bulk Template CSV', '/api/bulk/template-csv', templateCsv.status === 200, 'CSV template received', templateCsv.status);

  const exportCsv = await request('/api/bulk/export-csv', { headers: authHeader });
  record('Bulk Export CSV', '/api/bulk/export-csv', exportCsv.status === 200, 'CSV export received', exportCsv.status);

  // 11. Appointments
  const bookApt = await request('/api/appointments', {
    method: 'POST',
    body: {
      customer_name: 'Audit Patient',
      phone: '9876543210',
      appointment_date: '2026-11-20',
      time_slot: '11:00 AM - 12:00 PM',
      service_type: 'Computerised Eye Test'
    }
  });
  const aptNo = bookApt.data && bookApt.data.appointment_number;
  const aptId = bookApt.data && bookApt.data.appointment && bookApt.data.appointment.id;
  record('Book In-Store Eye Test', '/api/appointments', bookApt.status === 201 && !!aptNo, bookApt.data, bookApt.status);

  const aptList = await request('/api/appointments', { headers: authHeader });
  record('List Appointments (Admin)', '/api/appointments', aptList.status === 200 && Array.isArray(aptList.data.appointments), aptList.data, aptList.status);

  if (aptId) {
    const updateApt = await request(`/api/appointments/${aptId}/status`, {
      method: 'PATCH',
      headers: authHeader,
      body: { status: 'completed' }
    });
    record('Update Appointment Status', `/api/appointments/${aptId}/status`, updateApt.status === 200 && updateApt.data.success, updateApt.data, updateApt.status);
  }

  // 12. Orders & Lab Tracking
  const createOrder = await request('/api/orders', {
    method: 'POST',
    body: {
      customer_name: 'Audit Customer',
      customer_phone: '9876543210',
      customer_email: 'audit@example.com',
      shipping_address: 'Main Road, Thiruvarur',
      items: [
        {
          product_id: firstProdId,
          name: 'Acetate Frame',
          price: 1999,
          lens_package: 'Anti-Glare + Blue Cut',
          lens_price: 999,
          quantity: 1
        }
      ]
    }
  });
  const orderNo = createOrder.data && createOrder.data.order_number;
  record('Place Optical Order', '/api/orders', createOrder.status === 201 && !!orderNo, createOrder.data, createOrder.status);

  if (orderNo) {
    const trackOrder = await request(`/api/orders/track/${orderNo}`);
    record('Track Optical Order', `/api/orders/track/${orderNo}`, trackOrder.status === 200 && trackOrder.data.order && trackOrder.data.order.stages, trackOrder.data, trackOrder.status);
  }

  const orderList = await request('/api/orders', { headers: authHeader });
  record('List Orders (Admin)', '/api/orders', orderList.status === 200 && Array.isArray(orderList.data.orders), orderList.data, orderList.status);

  const firstOrderId = orderList.data && orderList.data.orders && orderList.data.orders[0] ? orderList.data.orders[0].id : null;
  if (firstOrderId) {
    const updateOrder = await request(`/api/orders/${firstOrderId}/status`, {
      method: 'PATCH',
      headers: authHeader,
      body: { status: 'lab_fitting', tracking_number: 'LAB-VO-8821' }
    });
    record('Update Order Status', `/api/orders/${firstOrderId}/status`, updateOrder.status === 200 && updateOrder.data.success, updateOrder.data, updateOrder.status);
  }

  // 13. Modular Components with Undo
  const pubComponents = await request('/api/components');
  record('Modular Components (Public)', '/api/components', pubComponents.status === 200 && Array.isArray(pubComponents.data.components), pubComponents.data, pubComponents.status);

  const adminComponents = await request('/api/components/admin', { headers: authHeader });
  record('Modular Components (Admin)', '/api/components/admin', adminComponents.status === 200 && Array.isArray(adminComponents.data.components), adminComponents.data, adminComponents.status);

  const addComp = await request('/api/components', {
    method: 'POST',
    headers: authHeader,
    body: {
      type: 'promo_banner',
      title: 'Audit Modular Banner',
      subtitle: 'Dynamic addition test',
      badge: 'Test Component',
      config: { button_text: 'Explore' }
    }
  });
  const compId = addComp.data && addComp.data.id;
  record('Add Modular Component (Admin)', '/api/components', addComp.status === 201 && !!compId, addComp.data, addComp.status);

  if (compId) {
    const editComp = await request(`/api/components/${compId}`, {
      method: 'PUT',
      headers: authHeader,
      body: { title: 'Audit Modular Banner (Edited)', is_active: 1 }
    });
    record('Edit Modular Component', `/api/components/${compId}`, editComp.status === 200 && editComp.data.success, editComp.data, editComp.status);

    const delComp = await request(`/api/components/${compId}`, {
      method: 'DELETE',
      headers: authHeader
    });
    record('Delete Component (Soft Delete)', `/api/components/${compId}`, delComp.status === 200 && delComp.data.success, delComp.data, delComp.status);

    const undoComp = await request(`/api/components/${compId}/undo`, {
      method: 'POST',
      headers: authHeader
    });
    record('Undo Component Deletion (Restore)', `/api/components/${compId}/undo`, undoComp.status === 200 && undoComp.data.success, undoComp.data, undoComp.status);
  }

  console.log('\n====================================================');
  const failed = results.filter(r => !r.passed);
  console.log(`TOTAL TESTS: ${results.length} | PASSED: ${results.length - failed.length} | FAILED: ${failed.length}`);
  console.log('====================================================');
}

runAudit();
