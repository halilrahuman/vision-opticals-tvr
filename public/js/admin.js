/**
 * Vision Opticals — Admin Management Application Logic
 * Full-featured mobile-first PWA & desktop management controller
 * Includes inventory, products, offers, CMS, in-store appointments,
 * orders & optical lab pipeline, and modular components with undo capability.
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'vo_admin_jwt';
  const state = {
    token: localStorage.getItem(STORAGE_KEY) || '',
    user: null,
    products: [],
    inventory: [],
    offers: [],
    sections: [],
    settings: {},
    library: [],
    appointments: [],
    orders: [],
    components: [],
    activeTab: 'dashboard',
    activeProductFilter: 'all',
    activeInvFilter: 'all',
    activeAptFilter: 'all',
    activeOrdFilter: 'all',
    currentEditingProductId: null,
    currentEditingOfferId: null,
    currentEditingComponentId: null,
    lastDeletedComponentId: null,
    selectedImageForProduct: ''
  };

  // ── INIT ──────────────────────────────────────────────
  async function init() {
    setupAuthListeners();
    if (state.token) {
      await verifySession();
    } else {
      showLogin();
    }
  }

  // ── AUTHENTICATION ─────────────────────────────────────
  async function verifySession() {
    try {
      const res = await API.auth.me(state.token);
      if (res.success && res.user) {
        state.user = res.user;
        showDashboard();
      } else {
        logout();
      }
    } catch (e) {
      console.warn('Session expired or invalid:', e.message);
      logout();
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    const userInp = document.getElementById('login-username');
    const passInp = document.getElementById('login-password');
    const btn = document.getElementById('btn-login-submit');

    const username = (userInp?.value || '').trim();
    const password = (passInp?.value || '').trim();

    if (!username || !password) {
      toast('Please enter both username and password.', 'err');
      return;
    }

    try {
      btn.disabled = true;
      btn.textContent = 'Signing in…';
      const res = await API.auth.login(username, password);

      if (res.success && res.token) {
        state.token = res.token;
        state.user = res.user;
        localStorage.setItem(STORAGE_KEY, res.token);
        toast('Welcome back to Vision Opticals Admin!', 'ok');
        showDashboard();
      } else {
        toast(res.message || 'Login failed.', 'err');
      }
    } catch (err) {
      toast(err.message || 'Login failed. Please check credentials.', 'err');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Sign In to Dashboard';
    }
  }

  function logout() {
    state.token = '';
    state.user = null;
    localStorage.removeItem(STORAGE_KEY);
    showLogin();
    toast('Signed out successfully.');
  }

  function showLogin() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('main-screen').style.display = 'none';
  }

  function showDashboard() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('main-screen').style.display = 'block';

    const userLabel = document.getElementById('topbar-user-name');
    if (userLabel && state.user) {
      userLabel.textContent = state.user.name || state.user.username;
    }

    const exportLink = document.querySelector('a[href*="/api/bulk/export-csv"]');
    if (exportLink && state.token) {
      exportLink.href = `/api/bulk/export-csv?token=${encodeURIComponent(state.token)}`;
    }

    switchSection('dashboard');
  }

  // ── SECTION SWITCHING ──────────────────────────────────
  function switchSection(secId) {
    state.activeTab = secId;

    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(`sec-${secId}`);
    if (target) target.classList.add('active');

    document.querySelectorAll('.admin-nav-item').forEach(b => {
      b.classList.toggle('active', b.dataset.sec === secId);
    });

    document.querySelectorAll('.m-nav-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.sec === secId);
    });

    if (secId === 'dashboard') loadDashboardData();
    if (secId === 'products') loadProductsData();
    if (secId === 'inventory') loadInventoryData();
    if (secId === 'appointments') loadAppointmentsData();
    if (secId === 'orders') loadOrdersData();
    if (secId === 'components') loadComponentsData();
    if (secId === 'offers') loadOffersData();
    if (secId === 'content') loadContentData();
    if (secId === 'settings') loadSettingsData();
    if (secId === 'library') loadLibraryData();

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── 1. DASHBOARD OVERVIEW ──────────────────────────────
  async function loadDashboardData() {
    try {
      const summaryRes = await API.inventory.summary(state.token);
      if (summaryRes.success && summaryRes.summary) {
        const s = summaryRes.summary;
        document.getElementById('kpi-total-prod').textContent = s.totalProducts || 0;
        document.getElementById('kpi-active-prod').textContent = s.activeProducts || 0;
        document.getElementById('kpi-low-stock').textContent = s.lowStock || 0;
        document.getElementById('kpi-out-stock').textContent = s.outOfStock || 0;
        document.getElementById('kpi-active-offers').textContent = s.activeOffers || 0;
        document.getElementById('kpi-total-units').textContent = (s.totalUnits || 0).toLocaleString('en-IN');
      }

      const logsRes = await API.inventory.logs('', state.token);
      const tbody = document.getElementById('dash-logs-tbody');
      if (tbody && logsRes.success && logsRes.logs) {
        const logs = logsRes.logs.slice(0, 8);
        if (logs.length === 0) {
          tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--ink3);padding:2rem;">No recent stock movements.</td></tr>';
        } else {
          tbody.innerHTML = logs.map(l => `
            <tr>
              <td><strong>${escapeHtml(l.product_name || 'Product #' + l.product_id)}</strong></td>
              <td>${l.change_amount > 0 ? '+' + l.change_amount : l.change_amount}</td>
              <td>${l.final_quantity} units</td>
              <td><span class="badge-tag published">${escapeHtml(l.reason || 'Update')}</span></td>
              <td style="font-size:11.5px;color:var(--ink3);">${new Date(l.timestamp).toLocaleDateString()} ${new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
            </tr>
          `).join('');
        }
      }
    } catch (e) {
      console.error('Error loading dashboard:', e);
    }
  }

  // ── 2. PRODUCT MANAGEMENT ──────────────────────────────
  async function loadProductsData() {
    const tbody = document.getElementById('products-tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--ink3);">Loading catalog…</td></tr>';

    try {
      const search = (document.getElementById('prod-search-input')?.value || '').trim();
      const res = await API.products.list({
        category: state.activeProductFilter,
        search,
        includeUnpublished: 1
      });

      if (res.success && res.products) {
        state.products = res.products;
        renderProductsTable(res.products);
      }
    } catch (e) {
      console.error('Error loading products:', e);
      toast('Failed to load products: ' + e.message, 'err');
    }
  }

  function renderProductsTable(list) {
    const tbody = document.getElementById('products-tbody');
    if (!tbody) return;

    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:3rem;color:var(--ink3);">No products found in this category. Click "Add Product" to create one.</td></tr>';
      return;
    }

    tbody.innerHTML = list.map(p => {
      const imgSrc = p.primary_image ? (p.primary_image.startsWith('http') ? p.primary_image : `/${p.primary_image}`) : '';
      const statusBadge = p.is_published
        ? '<span class="badge-tag published" onclick="admin.togglePublish(' + p.id + ')" style="cursor:pointer;" title="Click to Unpublish">Published</span>'
        : '<span class="badge-tag draft" onclick="admin.togglePublish(' + p.id + ')" style="cursor:pointer;" title="Click to Publish">Draft</span>';

      let invBadge = `<span class="badge-tag in-stock">${p.stock} in stock</span>`;
      if (!p.in_stock) {
        invBadge = '<span class="badge-tag out-of-stock">0 Stock</span>';
      } else if (p.low_stock) {
        invBadge = `<span class="badge-tag low-stock">Low (${p.stock})</span>`;
      }

      return `
        <tr>
          <td>
            ${imgSrc ? `<img src="${imgSrc}" style="width:44px;height:36px;object-fit:cover;border-radius:4px;border:0.5px solid var(--border);" alt="" onerror="this.style.display='none';" />` : '<div style="width:44px;height:36px;background:var(--bg2);border-radius:4px;"></div>'}
          </td>
          <td>
            <strong>${escapeHtml(p.name)}</strong>
            <div style="font-size:11.5px;color:var(--ink3);">${escapeHtml(p.brand || 'Vision Opticals')} · ${escapeHtml(p.category_name || p.category_slug)}</div>
          </td>
          <td>₹${(p.price || 0).toLocaleString('en-IN')}</td>
          <td>${p.badge ? `<span class="badge-tag published">${escapeHtml(p.badge)}</span>` : '<span style="color:var(--ink3);font-size:11px;">None</span>'}</td>
          <td>${invBadge}</td>
          <td>${statusBadge}</td>
          <td>
            <div style="display:flex;gap:6px;">
              <button class="btn-action" onclick="admin.openProductModal(${p.id})">Edit</button>
              <button class="btn-action" style="color:var(--red);" onclick="admin.deleteProduct(${p.id})">Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function filterProductCategory(cat, btnEl) {
    state.activeProductFilter = cat;
    document.querySelectorAll('.prod-tab').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    loadProductsData();
  }

  async function togglePublish(productId) {
    const p = state.products.find(x => x.id === productId);
    if (!p) return;

    try {
      const res = await API.products.togglePublish(productId, state.token);
      if (res.success) {
        p.is_published = res.is_published;
        toast(res.is_published ? 'Product is now LIVE on website!' : 'Product moved to Drafts.', 'ok');
        renderProductsTable(state.products);
      }
    } catch (e) {
      toast('Failed to change publish status: ' + e.message, 'err');
    }
  }

  function openProductModal(productId = null) {
    state.currentEditingProductId = productId;
    state.selectedImageForProduct = '';
    const form = document.getElementById('product-form');
    form.reset();
    document.getElementById('pm-img-preview').style.display = 'none';
    document.getElementById('pm-img-lbl').textContent = 'No photo selected';

    const modalTitle = document.getElementById('pm-title');
    if (productId) {
      modalTitle.textContent = 'Edit Product';
      const p = state.products.find(x => x.id === productId);
      if (p) populateProductForm(p);
    } else {
      modalTitle.textContent = 'Add New Product';
      document.getElementById('pm-cat').value = 'frames';
      onProductCategoryChange();
    }

    document.getElementById('product-modal').classList.add('open');
  }

  function populateProductForm(p) {
    document.getElementById('pm-name').value = p.name || '';
    document.getElementById('pm-cat').value = p.category_slug || 'frames';
    document.getElementById('pm-brand').value = p.brand || '';
    document.getElementById('pm-price').value = p.price || '';
    document.getElementById('pm-compare-price').value = p.compare_at_price || '';
    document.getElementById('pm-badge').value = p.badge || '';
    document.getElementById('pm-desc').value = p.description || '';
    document.getElementById('pm-gender').value = p.gender || 'Unisex';
    document.getElementById('pm-stock').value = p.stock != null ? p.stock : 10;
    document.getElementById('pm-low-stock').value = p.low_stock_threshold || 3;
    document.getElementById('pm-published').checked = p.is_published;
    document.getElementById('pm-featured').checked = p.is_featured;
    document.getElementById('pm-trending').checked = p.is_trending;

    // Specs
    document.getElementById('pm-shape').value = p.frame_shape || '';
    document.getElementById('pm-frametype').value = p.frame_type || 'Full Rim';
    document.getElementById('pm-material').value = p.frame_material || '';
    document.getElementById('pm-lensw').value = p.lens_width || '';
    document.getElementById('pm-bridge').value = p.bridge || '';
    document.getElementById('pm-temple').value = p.temple_length || '';

    // Colors & Sizes
    const colors = (p.available_colors || []).map(c => `${c.name}:${c.hex}`).join(', ');
    document.getElementById('pm-colors').value = colors;
    document.getElementById('pm-sizes').value = (p.available_sizes || []).join(', ');
    document.getElementById('pm-coatings').value = (p.lens_coatings || []).join(', ');

    // Lenses fields
    document.getElementById('pm-lens-power').value = p.lens_power_range || '';
    document.getElementById('pm-lens-water').value = p.lens_water_content || '';
    document.getElementById('pm-lens-duration').value = p.lens_duration || '';
    document.getElementById('pm-lens-mat').value = p.lens_material || '';
    document.getElementById('pm-lens-features').value = (p.lens_features || []).join(', ');

    // Secondary Image & New Attributes
    document.getElementById('pm-secondary-img').value = p.secondary_image || '';
    document.getElementById('pm-color-family').value = p.color_family || '';
    document.getElementById('pm-tags').value = p.product_tags || '';
    document.getElementById('pm-uv-cut').value = p.lens_uv_cut || '';
    document.getElementById('pm-blue-cut').value = p.lens_blue_cut || '';

    if (p.primary_image) {
      state.selectedImageForProduct = p.primary_image;
      updateProductImagePreview(p.primary_image);
    }

    onProductCategoryChange();
  }

  function onProductCategoryChange() {
    const cat = document.getElementById('pm-cat')?.value || 'frames';
    const isLenses = cat === 'lenses';
    const frameFields = document.getElementById('pm-frame-fields');
    const lensFields = document.getElementById('pm-lens-fields');

    if (frameFields) frameFields.style.display = isLenses ? 'none' : 'block';
    if (lensFields) lensFields.style.display = isLenses ? 'block' : 'none';
  }

  async function saveProduct(e) {
    e.preventDefault();
    const btn = document.getElementById('pm-save-btn');
    btn.disabled = true;
    btn.textContent = 'Saving…';

    try {
      const name = document.getElementById('pm-name').value.trim();
      const category_slug = document.getElementById('pm-cat').value;
      const brand = document.getElementById('pm-brand').value.trim();
      const price = document.getElementById('pm-price').value;
      const compare_at_price = document.getElementById('pm-compare-price').value;
      const badge = document.getElementById('pm-badge').value;
      const description = document.getElementById('pm-desc').value.trim();
      const gender = document.getElementById('pm-gender').value;
      const stock_quantity = document.getElementById('pm-stock').value;
      const low_stock_threshold = document.getElementById('pm-low-stock').value;
      const is_published = document.getElementById('pm-published').checked;
      const is_featured = document.getElementById('pm-featured').checked;
      const is_trending = document.getElementById('pm-trending').checked;

      const colorsRaw = document.getElementById('pm-colors').value.trim();
      const available_colors = colorsRaw ? colorsRaw.split(',').map(s => {
        const [cName, cHex] = s.split(':').map(x => x.trim());
        return { name: cName, hex: cHex || '#1a1a1a' };
      }).filter(c => c.name) : [];

      const sizesRaw = document.getElementById('pm-sizes').value.trim();
      const available_sizes = sizesRaw ? sizesRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

      const coatingsRaw = document.getElementById('pm-coatings').value.trim();
      const lens_coatings = coatingsRaw ? coatingsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

      const payload = {
        name,
        category_slug,
        brand,
        price: price ? parseFloat(price) : null,
        compare_at_price: compare_at_price ? parseFloat(compare_at_price) : null,
        badge,
        description,
        primary_image: state.selectedImageForProduct || '',
        secondary_image: document.getElementById('pm-secondary-img')?.value.trim() || '',
        color_family: document.getElementById('pm-color-family')?.value || '',
        product_tags: document.getElementById('pm-tags')?.value.trim() || '',
        lens_uv_cut: document.getElementById('pm-uv-cut')?.value.trim() || '',
        lens_blue_cut: document.getElementById('pm-blue-cut')?.value.trim() || '',
        gender,
        frame_shape: document.getElementById('pm-shape')?.value || null,
        frame_type: document.getElementById('pm-frametype')?.value || null,
        frame_material: document.getElementById('pm-material')?.value.trim() || null,
        lens_width: document.getElementById('pm-lensw')?.value.trim() || null,
        bridge: document.getElementById('pm-bridge')?.value.trim() || null,
        temple_length: document.getElementById('pm-temple')?.value.trim() || null,
        available_colors,
        available_sizes,
        lens_coatings,
        lens_power_range: document.getElementById('pm-lens-power')?.value.trim() || null,
        lens_water_content: document.getElementById('pm-lens-water')?.value.trim() || null,
        lens_duration: document.getElementById('pm-lens-duration')?.value.trim() || null,
        lens_material: document.getElementById('pm-lens-mat')?.value.trim() || null,
        lens_features: document.getElementById('pm-lens-features')?.value.split(',').map(s => s.trim()).filter(Boolean) || [],
        stock_quantity: parseInt(stock_quantity, 10) || 0,
        low_stock_threshold: parseInt(low_stock_threshold, 10) || 3,
        is_published,
        is_featured,
        is_trending
      };

      let res;
      if (state.currentEditingProductId) {
        res = await API.products.update(state.currentEditingProductId, payload, state.token);
      } else {
        res = await API.products.create(payload, state.token);
      }

      if (res.success) {
        toast(`Product ${state.currentEditingProductId ? 'updated' : 'created'} successfully!`, 'ok');
        closeModal('product-modal');
        loadProductsData();
      } else {
        toast(res.message || 'Save failed', 'err');
      }
    } catch (e) {
      toast('Error saving product: ' + e.message, 'err');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save Product';
    }
  }

  async function deleteProduct(id) {
    if (!confirm('Are you sure you want to permanently delete this optical product from catalog?')) return;

    try {
      const res = await API.products.delete(id, state.token);
      if (res.success) {
        toast('Product deleted.', 'ok');
        loadProductsData();
      }
    } catch (e) {
      toast('Failed to delete product: ' + e.message, 'err');
    }
  }

  // ── 3. INVENTORY & STOCK ───────────────────────────────
  async function loadInventoryData() {
    const tbody = document.querySelector('#sec-inventory tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--ink3);">Loading inventory records…</td></tr>';

    try {
      const search = (document.getElementById('inv-search-input')?.value || '').trim();
      const res = await API.inventory.list({
        status: state.activeInvFilter,
        search
      }, state.token);

      if (res.success && res.items) {
        state.inventory = res.items;
        renderInventoryTable(res.items);
      }
    } catch (e) {
      toast('Failed to load inventory: ' + e.message, 'err');
    }
  }

  function renderInventoryTable(items) {
    const tbody = document.querySelector('#sec-inventory tbody');
    if (!tbody) return;

    if (items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:3rem;color:var(--ink3);">No stock items matched filter.</td></tr>';
      return;
    }

    tbody.innerHTML = items.map(item => {
      let statusBadge = '<span class="badge-tag in-stock">Healthy</span>';
      if (item.stock_quantity === 0) {
        statusBadge = '<span class="badge-tag out-of-stock">Out of Stock</span>';
      } else if (item.stock_quantity <= item.low_stock_threshold) {
        statusBadge = '<span class="badge-tag low-stock">Low Stock</span>';
      }

      return `
        <tr>
          <td><strong>${escapeHtml(item.product_name)}</strong></td>
          <td><code>${escapeHtml(item.sku || 'VO-' + item.product_id)}</code></td>
          <td>${escapeHtml(item.brand || 'Vision Opticals')}</td>
          <td>
            <div style="display:flex;align-items:center;gap:6px;">
              <button class="btn-action" style="padding:2px 8px;" onclick="admin.adjustStockQuick(${item.product_id}, -1)">-</button>
              <strong style="min-width:32px;text-align:center;">${item.stock_quantity}</strong>
              <button class="btn-action" style="padding:2px 8px;" onclick="admin.adjustStockQuick(${item.product_id}, 1)">+</button>
            </div>
          </td>
          <td>≤ ${item.low_stock_threshold}</td>
          <td>${statusBadge}</td>
          <td>
            <button class="btn-action" onclick="admin.openStockOverrideModal(${item.product_id}, ${item.stock_quantity}, ${item.low_stock_threshold})">
              Set Exact Qty
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  function filterInventory(status, btnEl) {
    state.activeInvFilter = status;
    document.querySelectorAll('.inv-tab').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    loadInventoryData();
  }

  async function adjustStockQuick(productId, delta) {
    try {
      const res = await API.inventory.adjust(productId, delta, delta > 0 ? 'Restock / Delivery' : 'Store sale adjustment', state.token);
      if (res.success) {
        toast(`Stock adjusted (${delta > 0 ? '+' + delta : delta}). New quantity: ${res.new_quantity}`, 'ok');
        loadInventoryData();
      }
    } catch (e) {
      toast('Stock adjustment failed: ' + e.message, 'err');
    }
  }

  function openStockOverrideModal(productId, currentQty, currentThresh) {
    document.getElementById('so-product-id').value = productId;
    document.getElementById('so-qty').value = currentQty;
    document.getElementById('so-threshold').value = currentThresh;
    document.getElementById('stock-override-modal').classList.add('open');
  }

  async function saveStockOverride(e) {
    e.preventDefault();
    const pid = document.getElementById('so-product-id').value;
    const qty = parseInt(document.getElementById('so-qty').value, 10);
    const th = parseInt(document.getElementById('so-threshold').value, 10);
    const reason = document.getElementById('so-reason').value;

    try {
      const res = await API.inventory.set(pid, qty, th, reason, state.token);
      if (res.success) {
        toast('Inventory level updated successfully!', 'ok');
        closeModal('stock-override-modal');
        loadInventoryData();
      }
    } catch (err) {
      toast('Failed to update stock: ' + err.message, 'err');
    }
  }

  // ── 4. IN-STORE APPOINTMENTS MANAGEMENT ────────────────
  async function loadAppointmentsData() {
    const tbody = document.getElementById('appointments-tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--ink3);">Loading clinic appointments…</td></tr>';

    try {
      const res = await API.appointments.list(state.activeAptFilter, state.token);
      if (res.success && res.appointments) {
        state.appointments = res.appointments;
        renderAppointmentsTable(res.appointments);
      }
    } catch (e) {
      toast('Failed to load appointments: ' + e.message, 'err');
    }
  }

  function renderAppointmentsTable(items) {
    const tbody = document.getElementById('appointments-tbody');
    if (!tbody) return;

    if (items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:3rem;color:var(--ink3);">No clinic appointments recorded for this filter.</td></tr>';
      return;
    }

    tbody.innerHTML = items.map(a => {
      const waText = encodeURIComponent(`Hi ${a.customer_name}, confirming your in-store eye test appointment with Vision Opticals, Thiruvarur on ${a.appointment_date} at ${a.time_slot}.`);
      const waLink = `https://wa.me/${a.phone.replace(/\D/g, '')}?text=${waText}`;

      let stClass = 'badge-tag draft';
      if (a.status === 'confirmed') stClass = 'badge-tag published';
      if (a.status === 'completed') stClass = 'badge-tag in-stock';
      if (a.status === 'cancelled') stClass = 'badge-tag out-of-stock';

      return `
        <tr>
          <td><strong>VO-APT-${a.id}</strong></td>
          <td>${escapeHtml(a.customer_name)}</td>
          <td>
            <a href="${waLink}" target="_blank" style="color:var(--green);font-weight:600;text-decoration:none;">
              💬 ${escapeHtml(a.phone)}
            </a>
          </td>
          <td><strong>${a.appointment_date}</strong><br><span style="font-size:11.5px;color:var(--ink3);">${escapeHtml(a.time_slot)}</span></td>
          <td>${escapeHtml(a.service_type)}</td>
          <td><span class="${stClass}">${escapeHtml(a.status.toUpperCase())}</span></td>
          <td>
            <div style="display:flex;gap:4px;">
              ${a.status !== 'confirmed' ? `<button class="btn-action" style="color:var(--green);" onclick="admin.updateAppointmentStatus(${a.id}, 'confirmed')">Confirm</button>` : ''}
              ${a.status !== 'completed' ? `<button class="btn-action" onclick="admin.updateAppointmentStatus(${a.id}, 'completed')">Complete</button>` : ''}
              ${a.status !== 'cancelled' ? `<button class="btn-action" style="color:var(--red);" onclick="admin.updateAppointmentStatus(${a.id}, 'cancelled')">Cancel</button>` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function filterAppointments(filter, el) {
    state.activeAptFilter = filter;
    document.querySelectorAll('.apt-tab').forEach(b => b.classList.remove('active'));
    if (el) el.classList.add('active');
    loadAppointmentsData();
  }

  async function updateAppointmentStatus(id, newStatus) {
    try {
      const res = await API.appointments.updateStatus(id, newStatus, state.token);
      if (res.success) {
        toast(`Appointment status updated to ${newStatus.toUpperCase()}`, 'ok');
        loadAppointmentsData();
      }
    } catch (e) {
      toast('Failed to update status: ' + e.message, 'err');
    }
  }

  // ── 5. ORDERS & LAB PIPELINE MANAGEMENT ────────────────
  async function loadOrdersData() {
    const tbody = document.getElementById('orders-tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--ink3);">Loading lab orders…</td></tr>';

    try {
      const res = await API.orders.list(state.activeOrdFilter, state.token);
      if (res.success && res.orders) {
        state.orders = res.orders;
        renderOrdersTable(res.orders);
      }
    } catch (e) {
      toast('Failed to load orders: ' + e.message, 'err');
    }
  }

  function renderOrdersTable(items) {
    const tbody = document.getElementById('orders-tbody');
    if (!tbody) return;

    if (items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:3rem;color:var(--ink3);">No optical orders matched your filter.</td></tr>';
      return;
    }

    tbody.innerHTML = items.map(o => {
      const itemsList = Array.isArray(o.items) ? o.items : [];
      const itemDesc = itemsList.map(it => `${it.product_name} (${it.lens_package?.name || 'Standard Lens'})`).join('; ') || 'Eyewear Frame';

      return `
        <tr>
          <td><strong>${escapeHtml(o.order_number)}</strong></td>
          <td style="font-size:11.5px;color:var(--ink3);">${new Date(o.created_at).toLocaleDateString()}</td>
          <td>
            <strong>${escapeHtml(o.customer_name)}</strong><br>
            <span style="font-size:11.5px;color:var(--ink2);">📱 ${escapeHtml(o.phone)}</span>
          </td>
          <td style="font-size:12px;max-width:240px;">${escapeHtml(itemDesc)}</td>
          <td><strong>₹${(o.total_amount || 0).toLocaleString('en-IN')}</strong></td>
          <td><span class="badge-tag published">${escapeHtml((o.payment_method || 'UPI').toUpperCase())}</span></td>
          <td>
            <select class="form-control" style="font-size:12px;padding:4px 8px;width:170px;" onchange="admin.updateOrderStatus(${o.id}, this.value)">
              <option value="placed" ${o.status === 'placed' ? 'selected' : ''}>1. Order Placed</option>
              <option value="prescription_verified" ${o.status === 'prescription_verified' ? 'selected' : ''}>2. Rx Verified</option>
              <option value="lab_fitting" ${o.status === 'lab_fitting' ? 'selected' : ''}>3. Lab CNC Fitting</option>
              <option value="qc_passed" ${o.status === 'qc_passed' ? 'selected' : ''}>4. Laser QC Passed</option>
              <option value="dispatched" ${o.status === 'dispatched' ? 'selected' : ''}>5. Dispatched</option>
              <option value="delivered" ${o.status === 'delivered' ? 'selected' : ''}>6. Delivered</option>
              <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
          </td>
          <td>
            <button class="btn-action" onclick="admin.viewOrderPrescription('${o.order_number}')">
              View Rx
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  function filterOrders(filter, el) {
    state.activeOrdFilter = filter;
    document.querySelectorAll('.ord-tab').forEach(b => b.classList.remove('active'));
    if (el) el.classList.add('active');
    loadOrdersData();
  }

  async function updateOrderStatus(id, newStatus) {
    try {
      const res = await API.orders.updateStatus(id, newStatus, state.token);
      if (res.success) {
        toast(`Order updated to: ${newStatus.replace(/_/g, ' ').toUpperCase()}`, 'ok');
      }
    } catch (e) {
      toast('Failed to update status: ' + e.message, 'err');
    }
  }

  function viewOrderPrescription(orderNumber) {
    const o = state.orders.find(x => x.order_number === orderNumber);
    if (!o) return;

    document.getElementById('rx-view-orderno').textContent = o.order_number;
    document.getElementById('rx-view-cust').textContent = o.customer_name;
    document.getElementById('rx-view-phone').textContent = o.phone;

    const rx = o.prescription_details || {};
    const matrixBox = document.getElementById('rx-view-matrix-container');
    const fileBox = document.getElementById('rx-view-file-container');
    const waBox = document.getElementById('rx-view-wa-container');

    matrixBox.style.display = 'none';
    fileBox.style.display = 'none';
    waBox.style.display = 'none';

    if (rx.type === 'matrix' && rx.right_eye && rx.left_eye) {
      matrixBox.style.display = 'block';
      document.getElementById('rx-od-sph').textContent = rx.right_eye.sph || '0.00';
      document.getElementById('rx-od-cyl').textContent = rx.right_eye.cyl || '0.00';
      document.getElementById('rx-od-axis').textContent = rx.right_eye.axis || '0';
      document.getElementById('rx-od-add').textContent = rx.right_eye.add || '-';

      document.getElementById('rx-os-sph').textContent = rx.left_eye.sph || '0.00';
      document.getElementById('rx-os-cyl').textContent = rx.left_eye.cyl || '0.00';
      document.getElementById('rx-os-axis').textContent = rx.left_eye.axis || '0';
      document.getElementById('rx-os-add').textContent = rx.left_eye.add || '-';
    } else if (o.prescription_file_url) {
      fileBox.style.display = 'block';
      document.getElementById('rx-view-file-link').href = `/${o.prescription_file_url}`;
    } else {
      waBox.style.display = 'block';
    }

    document.getElementById('view-rx-modal').classList.add('open');
  }

  // ── 6. MODULAR COMPONENTS (WITH UNDO) ──────────────────
  async function loadComponentsData() {
    const tbody = document.getElementById('components-tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--ink3);">Loading modular components…</td></tr>';

    try {
      const res = await API.components.getAdmin(state.token);
      if (res.success && res.components) {
        state.components = res.components;
        renderComponentsTable(res.components);
      }
    } catch (e) {
      toast('Failed to load components: ' + e.message, 'err');
    }
  }

  function renderComponentsTable(items) {
    const tbody = document.getElementById('components-tbody');
    if (!tbody) return;

    if (items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:3rem;color:var(--ink3);">No active components found. Click "Add Component" to add one.</td></tr>';
      return;
    }

    tbody.innerHTML = items.map(c => `
      <tr>
        <td><strong>${escapeHtml(c.title)}</strong></td>
        <td><span class="badge-tag published">${escapeHtml(c.component_type)}</span></td>
        <td style="font-size:12px;max-width:260px;">${escapeHtml(c.subtitle || '')}</td>
        <td><code>${c.sort_order}</code></td>
        <td>
          <span class="badge-tag ${c.is_active ? 'in-stock' : 'draft'}" style="cursor:pointer;" onclick="admin.toggleComponentActive(${c.id}, ${c.is_active})">
            ${c.is_active ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td>
          <button class="btn-action" style="color:var(--red);" onclick="admin.deleteComponent(${c.id})">
            Delete
          </button>
        </td>
      </tr>
    `).join('');
  }

  function openAddComponentModal() {
    state.currentEditingComponentId = null;
    document.getElementById('cm-id').value = '';
    document.getElementById('cm-title').value = '';
    document.getElementById('cm-subtitle').value = '';
    document.getElementById('cm-order').value = '10';
    document.getElementById('cm-active').checked = true;
    document.getElementById('cm-modal-title').textContent = 'Add Website Component';
    document.getElementById('component-modal').classList.add('open');
  }

  async function saveComponent(e) {
    e.preventDefault();
    const title = document.getElementById('cm-title').value.trim();
    const type = document.getElementById('cm-type').value;
    const subtitle = document.getElementById('cm-subtitle').value.trim();
    const sort_order = parseInt(document.getElementById('cm-order').value, 10) || 10;
    const is_active = document.getElementById('cm-active').checked ? 1 : 0;

    try {
      const payload = {
        title,
        component_type: type,
        subtitle,
        sort_order,
        is_active,
        config: {}
      };

      const res = await API.components.create(payload, state.token);
      if (res.success) {
        toast('Component added to website!', 'ok');
        closeModal('component-modal');
        loadComponentsData();
      } else {
        toast(res.message || 'Could not add component.', 'err');
      }
    } catch (err) {
      toast('Failed to save component: ' + err.message, 'err');
    }
  }

  async function toggleComponentActive(id, curActive) {
    try {
      const res = await API.components.update(id, { is_active: curActive ? 0 : 1 }, state.token);
      if (res.success) {
        toast(`Component is now ${curActive ? 'hidden' : 'active on homepage'}!`, 'ok');
        loadComponentsData();
      }
    } catch (e) {
      toast('Failed to toggle component: ' + e.message, 'err');
    }
  }

  async function deleteComponent(id) {
    if (!confirm('Delete this homepage component? You can undo this action immediately.')) return;

    try {
      const res = await API.components.delete(id, state.token);
      if (res.success) {
        state.lastDeletedComponentId = id;
        const undoBtn = document.getElementById('btn-undo-component');
        if (undoBtn) undoBtn.style.display = 'inline-flex';
        toast('Component deleted. Click "Undo Last Deletion" above to restore!', 'ok');
        loadComponentsData();
      }
    } catch (e) {
      toast('Failed to delete component: ' + e.message, 'err');
    }
  }

  async function undoLastDeletedComponent() {
    if (!state.lastDeletedComponentId) return;

    try {
      const res = await API.components.undo(state.lastDeletedComponentId, state.token);
      if (res.success) {
        toast('Component restored successfully!', 'ok');
        state.lastDeletedComponentId = null;
        const undoBtn = document.getElementById('btn-undo-component');
        if (undoBtn) undoBtn.style.display = 'none';
        loadComponentsData();
      } else {
        toast(res.message || 'Could not restore component.', 'err');
      }
    } catch (e) {
      toast('Undo failed: ' + e.message, 'err');
    }
  }

  // ── 7. OFFERS & PROMOTIONS ─────────────────────────────
  async function loadOffersData() {
    const tbody = document.getElementById('offers-tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--ink3);">Loading promotions…</td></tr>';

    try {
      const res = await API.offers.list(state.token);
      if (res.success && res.offers) {
        state.offers = res.offers;
        renderOffersTable(res.offers);
      }
    } catch (e) {
      toast('Failed to load offers: ' + e.message, 'err');
    }
  }

  function renderOffersTable(offers) {
    const tbody = document.getElementById('offers-tbody');
    if (!tbody) return;

    if (offers.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:3rem;color:var(--ink3);">No promotions created yet. Click "Add Offer" to publish one.</td></tr>';
      return;
    }

    tbody.innerHTML = offers.map(o => `
      <tr>
        <td><strong>${escapeHtml(o.title)}</strong></td>
        <td><code>${escapeHtml(o.code || 'None')}</code></td>
        <td>${o.discount_type === 'percentage' ? o.discount_value + '%' : '₹' + o.discount_value}</td>
        <td>${escapeHtml(o.applicable_category || 'All')}</td>
        <td>${o.is_active ? '<span class="badge-tag published">Active</span>' : '<span class="badge-tag draft">Inactive</span>'}</td>
        <td>
          <button class="btn-action" style="color:var(--red);" onclick="admin.deleteOffer(${o.id})">Delete</button>
        </td>
      </tr>
    `).join('');
  }

  function openOfferModal() {
    document.getElementById('offer-form').reset();
    document.getElementById('offer-modal').classList.add('open');
  }

  async function saveOffer(e) {
    e.preventDefault();
    try {
      const title = document.getElementById('o-title').value.trim();
      const subtitle = document.getElementById('o-sub').value.trim();
      const code = document.getElementById('o-code').value.trim();
      const applicable_category = document.getElementById('o-cat').value;
      const discount_type = document.getElementById('o-type').value;
      const discount_value = parseFloat(document.getElementById('o-val').value);
      const is_active = document.getElementById('o-active').checked;

      const res = await API.offers.create({
        title,
        subtitle,
        code,
        applicable_category,
        discount_type,
        discount_value,
        is_active
      }, state.token);

      if (res.success) {
        toast('Promotion offer activated!', 'ok');
        closeModal('offer-modal');
        loadOffersData();
      }
    } catch (err) {
      toast('Failed to save offer: ' + err.message, 'err');
    }
  }

  async function deleteOffer(id) {
    if (!confirm('Remove this offer?')) return;
    try {
      const res = await API.offers.delete(id, state.token);
      if (res.success) {
        toast('Offer deleted.', 'ok');
        loadOffersData();
      }
    } catch (e) {
      toast('Failed to delete offer: ' + e.message, 'err');
    }
  }

  // ── 8. WEBSITE CONTENT & SECTIONS ──────────────────────
  async function loadContentData() {
    try {
      const sRes = await API.settings.get();
      if (sRes.success && sRes.settings) {
        const s = sRes.settings;
        document.getElementById('ann-text-input').value = s.announcement_text || '';
        document.getElementById('ann-enabled-check').checked = (s.announcement_enabled === 'true' || s.announcement_enabled === true);
      }

      const cRes = await API.content.getAllSections(state.token);
      if (cRes.success && cRes.sections) {
        state.sections = cRes.sections;
        renderSectionsTable(cRes.sections);
      }
    } catch (e) {
      console.warn('Content load error:', e);
    }
  }

  function renderSectionsTable(sections) {
    const tbody = document.getElementById('sections-tbody');
    if (!tbody) return;

    tbody.innerHTML = sections.map(s => `
      <tr>
        <td><strong>${escapeHtml(s.section_key)}</strong></td>
        <td>${escapeHtml(s.title || 'Default')}</td>
        <td>${escapeHtml(s.subtitle || '')}</td>
        <td>
          <span class="badge-tag ${s.is_enabled ? 'published' : 'draft'}" onclick="admin.toggleSectionEnabled('${s.section_key}', ${s.is_enabled})" style="cursor:pointer;">
            ${s.is_enabled ? 'Visible' : 'Hidden'}
          </span>
        </td>
        <td>
          <button class="btn-action" onclick="admin.openSectionEditor('${s.section_key}')">Edit Text</button>
        </td>
      </tr>
    `).join('');
  }

  async function saveAnnouncement() {
    const text = document.getElementById('ann-text-input').value.trim();
    const enabled = document.getElementById('ann-enabled-check').checked;

    try {
      const res = await API.settings.update({
        announcement_text: text,
        announcement_enabled: enabled
      }, state.token);

      if (res.success) {
        toast('Top announcement bar updated!', 'ok');
      }
    } catch (e) {
      toast('Failed to update announcement: ' + e.message, 'err');
    }
  }

  async function toggleSectionEnabled(key, cur) {
    try {
      const res = await API.content.updateSection(key, { is_enabled: !cur }, state.token);
      if (res.success) {
        toast(`Section ${key} ${!cur ? 'enabled' : 'hidden'}!`, 'ok');
        loadContentData();
      }
    } catch (e) {
      toast('Failed to toggle section: ' + e.message, 'err');
    }
  }

  function openSectionEditor(key) {
    const s = state.sections.find(x => x.section_key === key);
    if (!s) return;

    document.getElementById('se-key').value = key;
    document.getElementById('se-title').value = s.title || '';
    document.getElementById('se-sub').value = s.subtitle || '';
    document.getElementById('se-badge').value = s.badge || '';
    document.getElementById('section-editor-modal').classList.add('open');
  }

  async function saveSectionEditor(e) {
    e.preventDefault();
    const key = document.getElementById('se-key').value;
    const title = document.getElementById('se-title').value.trim();
    const subtitle = document.getElementById('se-sub').value.trim();
    const badge = document.getElementById('se-badge').value.trim();

    try {
      const res = await API.content.updateSection(key, { title, subtitle, badge }, state.token);
      if (res.success) {
        toast('Section content updated!', 'ok');
        closeModal('section-editor-modal');
        loadContentData();
      }
    } catch (err) {
      toast('Failed to update section: ' + err.message, 'err');
    }
  }

  // ── 9. STORE SETTINGS ──────────────────────────────────
  async function loadSettingsData() {
    try {
      const res = await API.settings.get();
      if (res.success && res.settings) {
        const s = res.settings;
        document.getElementById('set-phone').value = s.phone || '';
        document.getElementById('set-whatsapp').value = s.whatsapp || '';
        document.getElementById('set-email').value = s.email || '';
        document.getElementById('set-address').value = s.address || '';
        document.getElementById('set-weekday-hours').value = s.hours_weekday || '';
        document.getElementById('set-sunday-hours').value = s.hours_sunday || '';
        document.getElementById('set-maps-url').value = s.google_maps_url || '';
      }
    } catch (e) {
      console.warn('Settings load error:', e);
    }
  }

  async function saveStoreSettings(e) {
    e.preventDefault();
    const payload = {
      phone: document.getElementById('set-phone').value.trim(),
      whatsapp: document.getElementById('set-whatsapp').value.trim(),
      email: document.getElementById('set-email').value.trim(),
      address: document.getElementById('set-address').value.trim(),
      hours_weekday: document.getElementById('set-weekday-hours').value.trim(),
      hours_sunday: document.getElementById('set-sunday-hours').value.trim(),
      google_maps_url: document.getElementById('set-maps-url').value.trim()
    };

    try {
      const res = await API.settings.update(payload, state.token);
      if (res.success) {
        toast('Store details and hours updated successfully!', 'ok');
      }
    } catch (err) {
      toast('Failed to update settings: ' + err.message, 'err');
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    const current = document.getElementById('pwd-current').value;
    const newPwd = document.getElementById('pwd-new').value;

    try {
      const res = await API.auth.changePassword(current, newPwd, state.token);
      if (res.success) {
        toast('Password updated successfully!', 'ok');
        document.getElementById('pwd-current').value = '';
        document.getElementById('pwd-new').value = '';
      } else {
        toast(res.message || 'Password change failed', 'err');
      }
    } catch (err) {
      toast('Failed: ' + err.message, 'err');
    }
  }

  // ── 10. PHOTO LIBRARY & PICKER ─────────────────────────
  async function loadLibraryData() {
    const grid = document.getElementById('library-grid');
    if (grid) grid.innerHTML = '<div style="color:var(--ink3);">Loading media library…</div>';

    try {
      const res = await API.photos.list(state.token);
      if (res.success && res.files) {
        state.library = res.files;
        renderLibraryGrid(res.files);
      }
    } catch (e) {
      toast('Failed to load photos: ' + e.message, 'err');
    }
  }

  function renderLibraryGrid(files) {
    const grid = document.getElementById('library-grid');
    if (!grid) return;

    if (files.length === 0) {
      grid.innerHTML = '<div style="color:var(--ink3);grid-column:1/-1;text-align:center;padding:2rem;">No images uploaded yet.</div>';
      return;
    }

    grid.innerHTML = files.map(f => `
      <div class="photo-card">
        <img src="/${f.url}" alt="${escapeHtml(f.name)}" />
        <div class="photo-actions">
          <span style="font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block;">${escapeHtml(f.name)}</span>
          <div style="display:flex;gap:6px;margin-top:6px;">
            <button class="btn-action" style="font-size:11px;" onclick="admin.copyToClipboard('${f.url}')">Copy URL</button>
            <button class="btn-action" style="font-size:11px;color:var(--red);" onclick="admin.deleteLibraryPhoto('${f.name}')">Delete</button>
          </div>
        </div>
      </div>
    `).join('');
  }

  async function uploadFiles(files) {
    if (!files || files.length === 0) return;
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('images', files[i]);
    }

    try {
      toast('Uploading photos…');
      const res = await API.photos.upload(formData, state.token);
      if (res.success) {
        toast('Photos uploaded to store storage!', 'ok');
        loadLibraryData();
      }
    } catch (e) {
      toast('Upload failed: ' + e.message, 'err');
    }
  }

  async function deleteLibraryPhoto(filename) {
    if (!confirm(`Delete image "${filename}"?`)) return;
    try {
      const res = await API.photos.delete(filename, state.token);
      if (res.success) {
        toast('Photo removed.', 'ok');
        loadLibraryData();
      }
    } catch (e) {
      toast('Failed to delete photo: ' + e.message, 'err');
    }
  }

  async function loadPickerLibrary() {
    const grid = document.getElementById('pm-picker-grid');
    if (grid) grid.innerHTML = '<div style="font-size:12px;color:var(--ink3);">Loading…</div>';

    try {
      const res = await API.photos.list(state.token);
      if (res.success && res.files) {
        grid.innerHTML = res.files.map(f => `
          <div class="pick-thumb ${state.selectedImageForProduct === f.url ? 'selected' : ''}" onclick="admin.selectPickerImage('${f.url}', this)">
            <img src="/${f.url}" alt="" />
          </div>
        `).join('');
      }
    } catch (e) {
      if (grid) grid.innerHTML = '<div style="font-size:12px;color:var(--red);">Error loading media</div>';
    }
  }

  function selectPickerImage(url, el) {
    document.querySelectorAll('.pick-thumb').forEach(t => t.classList.remove('selected'));
    el.classList.add('selected');
    state.selectedImageForProduct = url;
    updateProductImagePreview(url);
  }

  function updateProductImagePreview(url) {
    const img = document.getElementById('pm-img-preview');
    const lbl = document.getElementById('pm-img-lbl');
    if (img && lbl) {
      img.src = url.startsWith('http') ? url : `/${url}`;
      img.style.display = 'block';
      lbl.textContent = url;
    }
  }

  async function uploadProductPhotoDirect(file) {
    if (!file) return;
    const formData = new FormData();
    formData.append('images', file);

    try {
      toast('Uploading photo from device…');
      const res = await API.photos.upload(formData, state.token);
      if (res.success && res.files && res.files[0]) {
        state.selectedImageForProduct = res.files[0].url;
        updateProductImagePreview(res.files[0].url);
        toast('Photo uploaded and selected!', 'ok');
      }
    } catch (e) {
      toast('Photo upload failed: ' + e.message, 'err');
    }
  }

  async function uploadSecondaryPhotoDirect(file) {
    if (!file) return;
    const formData = new FormData();
    formData.append('images', file);

    try {
      toast('Uploading secondary angle view…');
      const res = await API.photos.upload(formData, state.token);
      if (res.success && res.files && res.files[0]) {
        document.getElementById('pm-secondary-img').value = res.files[0].url;
        toast('Angle photo saved!', 'ok');
      }
    } catch (e) {
      toast('Upload failed: ' + e.message, 'err');
    }
  }

  // ── 11. BULK CSV IMPORT / EXPORT ───────────────────────
  async function handleCSVUpload(file) {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);

    const resultBox = document.getElementById('bulk-import-result');
    if (resultBox) {
      resultBox.style.display = 'block';
      resultBox.innerHTML = '<div style="color:var(--ink2);">Processing CSV records and creating inventory items…</div>';
    }

    try {
      const res = await API.bulk.importCSV(formData, state.token);
      if (resultBox) {
        resultBox.innerHTML = `
          <div style="font-weight:600;color:var(--green);margin-bottom:6px;">✓ ${escapeHtml(res.message)}</div>
          ${res.errors && res.errors.length > 0 ? `<div style="font-size:12px;color:var(--red);margin-top:6px;"><strong>Notes/Warnings:</strong><br>${res.errors.join('<br>')}</div>` : ''}
        `;
      }
      toast('Bulk import complete!', 'ok');
    } catch (e) {
      if (resultBox) {
        resultBox.innerHTML = `<div style="color:var(--red);font-weight:600;">✗ Import Error: ${escapeHtml(e.message)}</div>`;
      }
      toast('CSV Import failed: ' + e.message, 'err');
    }
  }

  // ── UTILITIES ──────────────────────────────────────────
  function closeModal(modalId) {
    document.getElementById(modalId)?.classList.remove('open');
  }

  function toast(msg, type = '') {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.className = 'toast-msg show ' + (type ? type : '');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 3500);
  }

  function copyToClipboard(txt) {
    navigator.clipboard.writeText(txt).then(() => {
      toast(`Copied path: ${txt}`, 'ok');
    }).catch(() => {
      toast(txt);
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function setupAuthListeners() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
  }

  // Expose methods to global scope
  window.admin = {
    init,
    logout,
    switchSection,
    filterProductCategory,
    togglePublish,
    openProductModal,
    onProductCategoryChange,
    saveProduct,
    deleteProduct,
    filterInventory,
    adjustStockQuick,
    openStockOverrideModal,
    saveStockOverride,
    loadAppointmentsData,
    filterAppointments,
    updateAppointmentStatus,
    loadOrdersData,
    filterOrders,
    updateOrderStatus,
    viewOrderPrescription,
    loadComponentsData,
    openAddComponentModal,
    saveComponent,
    toggleComponentActive,
    deleteComponent,
    undoLastDeletedComponent,
    openOfferModal,
    saveOffer,
    deleteOffer,
    saveAnnouncement,
    toggleSectionEnabled,
    openSectionEditor,
    saveSectionEditor,
    saveStoreSettings,
    changePassword,
    uploadFiles,
    deleteLibraryPhoto,
    loadPickerLibrary,
    selectPickerImage,
    uploadProductPhotoDirect,
    uploadSecondaryPhotoDirect,
    handleCSVUpload,
    closeModal,
    copyToClipboard
  };

  document.addEventListener('DOMContentLoaded', init);
})();