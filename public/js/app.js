/**
 * Vision Opticals — Customer Website Application Logic
 * Integrates dynamic catalog, promotions, faceted filters, WhatsApp enquiry,
 * dual-image hover flips, lifestyle chips, lens advantages, custom prescription funnel,
 * in-store eye test bookings, cart drawer, checkout, and order tracking pipeline.
 */

(function () {
  'use strict';

  // Global State
  const state = {
    products: [],
    activeCategory: 'all',
    activeShape: 'all',
    activeFrameType: 'all',
    activeBrand: 'all',
    activeGender: 'all',
    activeSort: 'popular',
    activeTag: 'all',
    activeColorFamily: 'all',
    searchQuery: '',
    settings: {},
    offers: [],
    sections: [],
    components: [],
    cart: JSON.parse(localStorage.getItem('vo_cart') || '[]'),
    selectedProduct: null,
    selectedColor: null,
    selectedSize: null,
    selectedSlot: '10:30 AM',
    selectedVisionType: 'single_vision',
    selectedCoatingPackage: { code: 'blue_cut', price: 999, name: 'Blue-Cut Digital Shield (98% HEV420 Cut)' },
    selectedRxTab: 'manual'
  };

  // Badge CSS Class Mapper
  const badgeClasses = {
    'Popular': 'b-popular',
    'New': 'b-new',
    'Sale': 'b-sale',
    'Premium': 'b-premium',
    'Kids': 'b-kids',
    'Daily': 'b-daily',
    'Monthly': 'b-monthly',
    'Coloured': 'b-coloured',
    'Toric': 'b-toric'
  };

  // ── INIT ──────────────────────────────────────────────
  async function init() {
    setupEventListeners();
    updateCartUI();

    const today = new Date().toISOString().split('T')[0];
    const dateInp = document.getElementById('ap-date');
    if (dateInp) {
      dateInp.min = today;
      dateInp.value = today;
    }

    await Promise.all([
      loadStoreSettings(),
      loadHomepageSections(),
      loadModularComponents(),
      loadActiveOffers(),
      loadProducts()
    ]);
  }

  // ── LOAD SETTINGS ──────────────────────────────────────
  async function loadStoreSettings() {
    try {
      const res = await API.settings.get();
      if (res.success) {
        state.settings = res.settings;
        applyStoreSettings(res.settings);
      }
    } catch (e) {
      console.warn('Could not load settings:', e);
    }
  }

  function applyStoreSettings(s) {
    const annBar = document.getElementById('announcement-bar');
    const annText = document.getElementById('announcement-text');
    if (annBar && annText) {
      if (s.announcement_enabled === 'false' || s.announcement_enabled === false) {
        annBar.style.display = 'none';
      } else {
        annBar.style.display = 'flex';
        annText.textContent = s.announcement_text || '🎉 Free Computerised Eye Testing With Every Frame Purchase';
      }
    }

    const phone = s.phone || '94865 52324';
    const wa = s.whatsapp || '919486552324';

    document.querySelectorAll('.js-phone-link').forEach(el => {
      el.href = `tel:${phone.replace(/\s+/g, '')}`;
      el.textContent = phone;
    });

    document.querySelectorAll('.js-wa-link').forEach(el => {
      el.href = `https://wa.me/${wa}?text=${encodeURIComponent("Hi Vision Opticals, I want to enquire about eyewear and eye testing.")}`;
    });

    const hoursEl = document.getElementById('store-hours-display');
    if (hoursEl) {
      hoursEl.innerHTML = `
        <div><strong>Mon – Sat:</strong> ${s.hours_weekday || '10:00 AM – 9:30 PM'}</div>
        <div style="margin-top:4px;"><strong>Sunday:</strong> ${s.hours_sunday || '10:30 AM – 2:00 PM / 5:00 PM – 9:30 PM'}</div>
      `;
    }

    const addrEl = document.getElementById('store-address-display');
    if (addrEl && s.address) {
      addrEl.textContent = s.address;
    }

    const mapBtn = document.getElementById('store-map-btn');
    if (mapBtn && s.google_maps_url) {
      mapBtn.href = s.google_maps_url;
    }
  }

  // ── LOAD SECTIONS ──────────────────────────────────────
  async function loadHomepageSections() {
    try {
      const res = await API.content.getHomepage();
      if (res.success && res.sections) {
        state.sections = res.sections;
        applyHomepageSections(res.sections);
      }
    } catch (e) {
      console.warn('Could not load sections:', e);
    }
  }

  function applyHomepageSections(sections) {
    const heroSec = sections.find(s => s.section_key === 'hero');
    if (heroSec) {
      const heroTitle = document.getElementById('hero-title');
      const heroSub = document.getElementById('hero-desc');
      if (heroTitle && heroSec.title) {
        heroTitle.innerHTML = heroSec.title.replace(/\./g, '.<br><em>') + '</em>';
      }
      if (heroSub && heroSec.subtitle) {
        heroSub.textContent = heroSec.subtitle;
      }
      if (heroSec.config) {
        const c = heroSec.config;
        if (c.stat1_num) document.getElementById('stat1-num').textContent = c.stat1_num;
        if (c.stat2_num) document.getElementById('stat2-num').textContent = c.stat2_num;
        if (c.stat3_num) document.getElementById('stat3-num').textContent = c.stat3_num;
      }
    }
  }

  // ── LOAD MODULAR COMPONENTS ────────────────────────────
  async function loadModularComponents() {
    try {
      const res = await API.components.getHomepage();
      if (res.success && res.components) {
        state.components = res.components;
        renderModularComponents(res.components);
      }
    } catch (e) {
      console.warn('Could not load modular components:', e);
    }
  }

  function renderModularComponents(comps) {
    const area = document.getElementById('modular-components-area');
    if (!area) return;
    if (!comps || comps.length === 0) {
      area.innerHTML = '';
      return;
    }

    area.innerHTML = comps.map(c => {
      if (c.component_type === 'brand_marquee') {
        return `
          <section style="max-width:1400px;margin:1.75rem auto;padding:0 2rem;">
            <div style="background:var(--white);border:0.5px solid var(--border);border-radius:var(--radius);padding:1.5rem;text-align:center;">
              <span style="font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--ink3);">${escapeHtml(c.title || 'Official Authorized Optical Brands')}</span>
              <div style="display:flex;justify-content:center;align-items:center;gap:2.5rem;flex-wrap:wrap;margin-top:1.25rem;">
                <span style="font-family:var(--f-display);font-size:20px;color:var(--ink);font-weight:600;">Titan Eye+</span>
                <span style="font-family:var(--f-display);font-size:20px;color:var(--ink);font-weight:600;">Ray-Ban</span>
                <span style="font-family:var(--f-display);font-size:20px;color:var(--ink);font-weight:600;">Carl Zeiss</span>
                <span style="font-family:var(--f-display);font-size:20px;color:var(--ink);font-weight:600;">Essilor Crizal</span>
                <span style="font-family:var(--f-display);font-size:20px;color:var(--ink);font-weight:600;">Silhouette</span>
                <span style="font-family:var(--f-display);font-size:20px;color:var(--ink);font-weight:600;">Fastrack</span>
              </div>
            </div>
          </section>
        `;
      }
      if (c.component_type === 'banner') {
        return `
          <section style="max-width:1400px;margin:2rem auto;padding:0 2rem;">
            <div style="background:linear-gradient(135deg, #1a1714 0%, #352f2a 100%);color:#fff;border-radius:var(--radius-lg);padding:2.5rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1.5rem;">
              <div>
                <span style="background:rgba(255,255,255,0.15);color:#fef08a;font-size:10px;padding:3px 8px;border-radius:6px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Featured Highlight</span>
                <h3 style="font-family:var(--f-display);font-size:28px;margin-top:8px;">${escapeHtml(c.title)}</h3>
                <p style="color:rgba(255,255,255,0.8);font-size:13px;max-width:520px;margin-top:6px;line-height:1.6;">${escapeHtml(c.subtitle || '')}</p>
              </div>
              <button class="btn-header-action" style="background:#fff;color:#1a1714;font-weight:600;padding:12px 22px;border-radius:24px;" onclick="app.openAppointmentModal()">
                Book In-Store Eye Trial →
              </button>
            </div>
          </section>
        `;
      }
      return '';
    }).join('');
  }

  // ── LOAD OFFERS ────────────────────────────────────────
  async function loadActiveOffers() {
    try {
      const res = await API.offers.getActive();
      if (res.success && res.offers && res.offers.length > 0) {
        state.offers = res.offers;
        renderOffers(res.offers);
      } else {
        const wrap = document.getElementById('promo-strip-container');
        if (wrap) wrap.style.display = 'none';
      }
    } catch (e) {
      console.warn('Could not load offers:', e);
    }
  }

  function renderOffers(offers) {
    const container = document.getElementById('promo-cards-list');
    const wrap = document.getElementById('promo-strip-container');
    if (!container || !wrap) return;

    wrap.style.display = 'block';
    container.innerHTML = offers.map(o => `
      <div class="promo-banner">
        <div>
          <span class="promo-badge">${o.discount_type === 'percentage' ? o.discount_value + '% OFF' : '₹' + o.discount_value + ' OFF'}</span>
          <div class="promo-title">${escapeHtml(o.title)}</div>
          <p class="promo-sub">${escapeHtml(o.subtitle || '')}</p>
        </div>
        <button class="promo-btn" onclick="app.filterByCategory('${o.applicable_category || 'all'}')">
          Explore applicable eyewear →
        </button>
      </div>
    `).join('');
  }

  // ── LOAD PRODUCTS ──────────────────────────────────────
  async function loadProducts() {
    const grid = document.getElementById('products-grid');
    if (grid) {
      grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--ink3);">Loading premium catalog…</div>';
    }

    try {
      const params = {
        category: state.activeCategory,
        shape: state.activeShape,
        frame_type: state.activeFrameType,
        brand: state.activeBrand,
        gender: state.activeGender,
        sort: state.activeSort,
        search: state.searchQuery
      };

      const res = await API.products.list(params);
      if (res.success) {
        state.products = res.products;
        renderProducts(res.products);
      }
    } catch (e) {
      console.error('Failed to load products:', e);
      if (grid) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--red);">Error loading products. Please refresh.</div>';
      }
    }
  }

  // ── RENDER PRODUCTS (WITH DUAL-IMAGE HOVER FLIP) ───────
  function renderProducts(list) {
    const grid = document.getElementById('products-grid');
    const countEl = document.getElementById('product-count-lbl');
    const emptyEl = document.getElementById('products-empty');

    // Filter by active lifestyle tag and color family
    let filtered = list;
    if (state.activeTag && state.activeTag !== 'all') {
      const tagLower = state.activeTag.toLowerCase();
      filtered = filtered.filter(p => {
        const t = (p.product_tags || '').toLowerCase();
        const cat = (p.category_slug || '').toLowerCase();
        const mat = (p.frame_material || '').toLowerCase();
        const gen = (p.gender || '').toLowerCase();

        if (tagLower === 'computer') return t.includes('computer') || (p.lens_coatings && JSON.stringify(p.lens_coatings).toLowerCase().includes('blue'));
        if (tagLower === 'reading') return t.includes('reading') || cat.includes('frame');
        if (tagLower === 'sunglasses') return cat.includes('sunglass');
        if (tagLower === 'metallic') return mat.includes('metal') || mat.includes('titanium') || t.includes('metallic');
        if (tagLower === 'new_design') return p.badge === 'New' || t.includes('new');
        if (tagLower === 'men') return gen === 'men' || gen === 'unisex';
        if (tagLower === 'women') return gen === 'women' || gen === 'unisex';
        return t.includes(tagLower);
      });
    }

    if (state.activeColorFamily && state.activeColorFamily !== 'all') {
      const colorLower = state.activeColorFamily.toLowerCase();
      filtered = filtered.filter(p => {
        const cf = (p.color_family || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        const name = (p.name || '').toLowerCase();
        return cf.includes(colorLower) || desc.includes(colorLower) || name.includes(colorLower);
      });
    }

    if (countEl) {
      countEl.textContent = `${filtered.length} product${filtered.length !== 1 ? 's' : ''}`;
    }

    if (!filtered || filtered.length === 0) {
      if (grid) grid.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'block';
      return;
    }

    if (emptyEl) emptyEl.style.display = 'none';

    grid.innerHTML = filtered.map(p => {
      const bc = badgeClasses[p.badge] || 'b-popular';
      const imgSrc = p.primary_image ? (p.primary_image.startsWith('http') ? p.primary_image : `/${p.primary_image}`) : '';
      const hoverSrc = p.secondary_image ? (p.secondary_image.startsWith('http') ? p.secondary_image : `/${p.secondary_image}`) : '';
      const fallbackSvg = `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke-width="1.2" stroke-linecap="round"><path d="M2 10s3-3 10-3 10 3 10 3v4s-3 3-10 3-10-3-10-3v-4z"/><circle cx="12" cy="12" r="2"/></svg>`;

      // Stock status
      let stockBadge = '<span class="pcard-stock in">In Stock</span>';
      if (!p.in_stock) {
        stockBadge = '<span class="pcard-stock out">Out of Stock</span>';
      } else if (p.low_stock) {
        stockBadge = `<span class="pcard-stock low">Only ${p.stock} left</span>`;
      }

      // Price calculations
      const priceDisplay = p.price ? `₹${p.price.toLocaleString('en-IN')}` : 'Enquire';
      const origPriceDisplay = p.compare_at_price && p.compare_at_price > p.price ? `₹${p.compare_at_price.toLocaleString('en-IN')}` : '';

      // Lens Advantage metric on card
      const lensAdvTag = p.lens_blue_cut ? '98% Blue-Cut' : (p.lens_uv_cut ? p.lens_uv_cut : 'UV400 Certified');

      return `
        <div class="pcard" onclick="app.openDetail('${p.id}')">
          <div class="pcard-img">
            ${imgSrc ? `
              <img class="img-front" src="${imgSrc}" alt="${escapeHtml(p.name)}" loading="lazy" onerror="this.style.display='none';" />
              ${hoverSrc ? `<img class="img-hover" src="${hoverSrc}" alt="${escapeHtml(p.name)} Side Angle" loading="lazy" />` : ''}
            ` : fallbackSvg}
            ${p.badge ? `<span class="pbadge ${bc}">${escapeHtml(p.badge)}</span>` : ''}
            ${stockBadge}
          </div>
          <div class="pcard-body">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;">
              <span class="pcard-brand">${escapeHtml(p.brand || 'Vision Opticals')}</span>
              <span class="chip" style="font-size:9.5px;padding:2px 6px;background:var(--green-bg);color:var(--green);font-weight:600;border:none;">${lensAdvTag}</span>
            </div>
            <div class="pcard-name">${escapeHtml(p.name)}</div>
            <div style="display:flex;align-items:center;gap:6px;margin-top:2px;">
              <span class="pcard-specs-chip">${escapeHtml(p.frame_shape ? `${p.frame_shape} · ${p.frame_material || 'Acetate'}` : (p.lens_duration || p.category_slug))}</span>
              ${p.color_family ? `<span style="font-size:10.5px;color:var(--ink3);">(${escapeHtml(p.color_family)})</span>` : ''}
            </div>
            <div class="pcard-foot">
              <div class="pcard-price-wrap">
                <span class="pcard-price">${priceDisplay}</span>
                ${origPriceDisplay ? `<span class="pcard-orig-price">${origPriceDisplay}</span>` : ''}
              </div>
              <div class="pcard-wa-icon" title="Customize Lens or Order">
                <svg viewBox="0 0 24 24" fill="none" stroke-width="2"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // ── PRODUCT DETAIL MODAL ───────────────────────────────
  async function openDetail(idOrSlug) {
    try {
      const res = await API.products.get(idOrSlug);
      if (!res.success || !res.product) return;

      const p = res.product;
      state.selectedProduct = p;
      state.selectedColor = (p.available_colors && p.available_colors[0]) ? p.available_colors[0].name : '';
      state.selectedSize = (p.available_sizes && p.available_sizes[0]) ? p.available_sizes[0] : '';

      document.getElementById('modal-product-brand').textContent = p.brand || 'Vision Opticals';
      document.getElementById('modal-product-name').textContent = p.name;
      document.getElementById('modal-product-desc').textContent = p.description || '';

      const badgeEl = document.getElementById('modal-product-badge');
      if (p.badge) {
        badgeEl.textContent = p.badge;
        badgeEl.className = 'd-badge ' + (badgeClasses[p.badge] || 'b-popular');
        badgeEl.style.display = 'inline-block';
      } else {
        badgeEl.style.display = 'none';
      }

      document.getElementById('modal-product-price').textContent = p.price ? `₹${p.price.toLocaleString('en-IN')}` : 'Contact for Price';
      const origEl = document.getElementById('modal-product-orig');
      if (p.compare_at_price && p.compare_at_price > p.price) {
        origEl.textContent = `₹${p.compare_at_price.toLocaleString('en-IN')}`;
        origEl.style.display = 'inline';
      } else {
        origEl.style.display = 'none';
      }

      const stockEl = document.getElementById('modal-product-stock');
      if (!p.in_stock) {
        stockEl.textContent = 'Out of Stock';
        stockEl.className = 'd-stock-badge b-sale';
      } else if (p.low_stock) {
        stockEl.textContent = `Low Stock (${p.stock} units left)`;
        stockEl.className = 'd-stock-badge b-popular';
      } else {
        stockEl.textContent = 'In Stock — Available in Store';
        stockEl.className = 'd-stock-badge b-new';
      }

      // Gallery Images (front & angle)
      const mainImg = document.getElementById('modal-main-img');
      const thumbsContainer = document.getElementById('modal-thumbs');
      let images = p.images || [];
      if (images.length === 0 && p.primary_image) {
        images = [{ url: p.primary_image }];
        if (p.secondary_image) images.push({ url: p.secondary_image });
      }

      mainImg.src = images[0]?.url ? (images[0].url.startsWith('http') ? images[0].url : `/${images[0].url}`) : '';
      thumbsContainer.innerHTML = images.map((img, idx) => `
        <div class="thumb ${idx === 0 ? 'on' : ''}" onclick="app.switchGalleryImg('${img.url}', this)">
          <img src="${img.url.startsWith('http') ? img.url : `/${img.url}`}" alt="" />
        </div>
      `).join('');

      // Colors Swatches
      const colorsContainer = document.getElementById('modal-swatches');
      const colorsRow = document.getElementById('modal-colors-row');
      if (p.available_colors && p.available_colors.length > 0) {
        colorsRow.style.display = 'block';
        colorsContainer.innerHTML = p.available_colors.map((c, i) => `
          <div class="sw ${i === 0 ? 'on' : ''}" style="background:${c.hex}" title="${c.name}" onclick="app.selectColor('${c.name}', this)"></div>
        `).join('');
      } else {
        colorsRow.style.display = 'none';
      }

      // Sizes
      const sizesContainer = document.getElementById('modal-sizes');
      const sizesRow = document.getElementById('modal-sizes-row');
      if (p.available_sizes && p.available_sizes.length > 0) {
        sizesRow.style.display = 'block';
        sizesContainer.innerHTML = p.available_sizes.map((s, i) => `
          <button class="sz ${i === 0 ? 'on' : ''}" onclick="app.selectSize('${s}', this)">${s}</button>
        `).join('');
      } else {
        sizesRow.style.display = 'none';
      }

      // Specifications
      const isLenses = p.category_slug === 'lenses';
      document.getElementById('modal-frame-specs').style.display = isLenses ? 'none' : 'block';
      document.getElementById('modal-lens-specs').style.display = isLenses ? 'block' : 'none';
      document.getElementById('detail-lens-wizard').style.display = isLenses ? 'none' : 'block';

      if (!isLenses) {
        document.getElementById('spec-val-shape').textContent = p.frame_shape || 'Classic';
        document.getElementById('spec-val-material').textContent = p.frame_material || 'Acetate';
        document.getElementById('spec-val-width').textContent = p.lens_width || '52 mm';
        document.getElementById('spec-val-bridge').textContent = p.bridge || '16 mm';

        const coatingsEl = document.getElementById('modal-coatings');
        coatingsEl.innerHTML = (p.lens_coatings || ['Anti-Glare', 'Blue-Cut 420nm', 'Hydrophobic']).map(c => `<span class="chip">${escapeHtml(c)}</span>`).join('');
      } else {
        document.getElementById('spec-val-power').textContent = p.lens_power_range || 'All standard powers';
        document.getElementById('spec-val-water').textContent = p.lens_water_content || '58%';
        document.getElementById('spec-val-duration').textContent = p.lens_duration || 'Daily disposable';
        document.getElementById('spec-val-lensmat').textContent = p.lens_material || 'Hydrogel';

        const featuresEl = document.getElementById('modal-lens-features');
        featuresEl.innerHTML = (p.lens_features || ['UV Blocking', 'High Oxygen Flow', 'Moisture Lock']).map(f => `
          <div style="font-size:12px;color:var(--ink2);display:flex;align-items:center;gap:6px;margin-bottom:4px;">
            <svg style="width:14px;height:14px;stroke:var(--green);flex-shrink:0;" viewBox="0 0 24 24" fill="none" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            ${escapeHtml(f)}
          </div>
        `).join('');
      }

      updateModalWhatsAppLink();
      document.getElementById('detail-modal-overlay').classList.add('open');
      document.body.style.overflow = 'hidden';
    } catch (e) {
      console.error('Error opening detail modal:', e);
    }
  }

  function closeDetailModal() {
    document.getElementById('detail-modal-overlay').classList.remove('open');
    document.body.style.overflow = '';
  }

  function switchGalleryImg(url, el) {
    document.querySelectorAll('#modal-thumbs .thumb').forEach(t => t.classList.remove('on'));
    el.classList.add('on');
    document.getElementById('modal-main-img').src = url.startsWith('http') ? url : `/${url}`;
  }

  function selectColor(colorName, el) {
    document.querySelectorAll('#modal-swatches .sw').forEach(s => s.classList.remove('on'));
    el.classList.add('on');
    state.selectedColor = colorName;
    updateModalWhatsAppLink();
  }

  function selectSize(sizeStr, el) {
    document.querySelectorAll('#modal-sizes .sz').forEach(s => s.classList.remove('on'));
    el.classList.add('on');
    state.selectedSize = sizeStr;
    updateModalWhatsAppLink();
  }

  function updateModalWhatsAppLink() {
    const p = state.selectedProduct;
    if (!p) return;

    const wa = state.settings.whatsapp || '919486552324';
    let text = `Hi Vision Opticals, I'm interested in the "${p.name}" (${p.brand || 'Vision'})`;
    if (state.selectedColor) text += ` in Color: ${state.selectedColor}`;
    if (state.selectedSize) text += ` [Size: ${state.selectedSize}]`;
    if (p.price) text += ` (Listed Price: ₹${p.price.toLocaleString('en-IN')})`;
    text += `. Is it available for in-store trial or custom lens dispensing?`;

    const btn = document.getElementById('modal-wa-btn');
    if (btn) {
      btn.href = `https://wa.me/${wa}?text=${encodeURIComponent(text)}`;
    }
  }

  // ── PRESCRIPTION & LENS SELECTION WIZARD ───────────────
  function selectVisionType(type, el) {
    state.selectedVisionType = type;
    document.querySelectorAll('#vision-type-options .lens-type-card').forEach(c => c.classList.remove('selected'));
    if (el) el.classList.add('selected');
  }

  function selectCoatingPackage(code, price, name, el) {
    state.selectedCoatingPackage = { code, price, name };
    document.querySelectorAll('#coating-package-options .lens-type-card').forEach(c => c.classList.remove('selected'));
    if (el) el.classList.add('selected');
  }

  function switchRxTab(tab) {
    state.selectedRxTab = tab;
    document.getElementById('rx-tab-manual').classList.toggle('active', tab === 'manual');
    document.getElementById('rx-tab-upload').classList.toggle('active', tab === 'upload');
    document.getElementById('rx-tab-later').classList.toggle('active', tab === 'later');

    document.getElementById('rx-mode-manual').style.display = tab === 'manual' ? 'block' : 'none';
    document.getElementById('rx-mode-upload').style.display = tab === 'upload' ? 'block' : 'none';
    document.getElementById('rx-mode-later').style.display = tab === 'later' ? 'block' : 'none';
  }

  function addToBagWithLenses() {
    const p = state.selectedProduct;
    if (!p) return;

    let prescriptionData = {};
    if (state.selectedRxTab === 'manual') {
      prescriptionData = {
        type: 'matrix',
        right_eye: {
          sph: document.getElementById('od-sph')?.value || '0.00',
          cyl: document.getElementById('od-cyl')?.value || '0.00',
          axis: document.getElementById('od-axis')?.value || '0',
          add: document.getElementById('od-add')?.value || ''
        },
        left_eye: {
          sph: document.getElementById('os-sph')?.value || '0.00',
          cyl: document.getElementById('os-cyl')?.value || '0.00',
          axis: document.getElementById('os-axis')?.value || '0',
          add: document.getElementById('os-add')?.value || ''
        }
      };
    } else if (state.selectedRxTab === 'upload') {
      const fileInput = document.getElementById('rx-file-input');
      prescriptionData = {
        type: 'upload',
        file_name: fileInput?.files[0]?.name || 'rx_photo.jpg'
      };
    } else {
      prescriptionData = {
        type: 'whatsapp_later'
      };
    }

    const framePrice = p.price || 0;
    const lensPrice = state.selectedCoatingPackage.price || 0;
    const itemTotal = framePrice + lensPrice;

    const cartItem = {
      product_id: p.id,
      product_name: p.name,
      brand: p.brand || 'Vision Opticals',
      image: p.primary_image || '',
      color: state.selectedColor || 'Standard',
      size: state.selectedSize || 'Standard',
      frame_price: framePrice,
      lens_package: state.selectedCoatingPackage,
      vision_type: state.selectedVisionType,
      prescription: prescriptionData,
      total_price: itemTotal
    };

    state.cart.push(cartItem);
    localStorage.setItem('vo_cart', JSON.stringify(state.cart));
    updateCartUI();
    closeDetailModal();
    openCartDrawer();
  }

  // ── CART DRAWER & STATE ────────────────────────────────
  function updateCartUI() {
    const count = state.cart.length;
    const navCount = document.getElementById('cart-nav-count');
    const drawerCount = document.getElementById('cart-drawer-count');
    if (navCount) navCount.textContent = count;
    if (drawerCount) drawerCount.textContent = count;

    const list = document.getElementById('cart-items-list');
    const foot = document.getElementById('cart-foot-wrap');
    const subtotalEl = document.getElementById('cart-subtotal-val');

    if (!list) return;

    if (count === 0) {
      list.innerHTML = `
        <div style="text-align:center;padding:3rem 1rem;color:var(--ink3);">
          <svg style="width:48px;height:48px;stroke:var(--ink3);margin:0 auto 10px;display:block;" viewBox="0 0 24 24" fill="none" stroke-width="1.5"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          <div style="font-size:14px;font-weight:600;color:var(--ink);">Your optical bag is empty</div>
          <p style="font-size:12px;margin-top:4px;">Browse our 500+ designer frames and customize your lenses.</p>
        </div>
      `;
      if (foot) foot.style.display = 'none';
      return;
    }

    if (foot) foot.style.display = 'block';

    let total = 0;
    list.innerHTML = state.cart.map((item, idx) => {
      total += item.total_price;
      const imgSrc = item.image ? (item.image.startsWith('http') ? item.image : `/${item.image}`) : '';
      let rxSummary = 'Zero Power / Protective';
      if (item.prescription?.type === 'matrix') {
        rxSummary = `OD: ${item.prescription.right_eye.sph} · OS: ${item.prescription.left_eye.sph}`;
      } else if (item.prescription?.type === 'whatsapp_later') {
        rxSummary = 'Prescription via WhatsApp';
      } else if (item.prescription?.type === 'upload') {
        rxSummary = `Rx File: ${item.prescription.file_name}`;
      }

      return `
        <div class="cart-item">
          <img src="${imgSrc}" alt="${escapeHtml(item.product_name)}" onerror="this.src='/images/Gemini_Generated_Image_8f7nbf8f7nbf8f7n.png';" />
          <div class="cart-item-details">
            <div class="cart-item-name">${escapeHtml(item.product_name)}</div>
            <div class="cart-item-lens">${escapeHtml(item.lens_package?.name || 'Standard Lens')}</div>
            <div style="font-size:11px;color:var(--ink3);margin-top:2px;">${rxSummary} (${escapeHtml(item.color)})</div>
            <div class="cart-item-price">₹${item.total_price.toLocaleString('en-IN')}</div>
          </div>
          <button style="background:none;border:none;cursor:pointer;color:var(--ink3);padding:4px;" title="Remove" onclick="app.removeFromCart(${idx})">
            <svg style="width:16px;height:16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      `;
    }).join('');

    if (subtotalEl) {
      subtotalEl.textContent = `₹${total.toLocaleString('en-IN')}`;
    }
  }

  function removeFromCart(idx) {
    state.cart.splice(idx, 1);
    localStorage.setItem('vo_cart', JSON.stringify(state.cart));
    updateCartUI();
  }

  function openCartDrawer() {
    document.getElementById('cart-drawer-overlay').classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeCartDrawer() {
    document.getElementById('cart-drawer-overlay').classList.remove('open');
    document.body.style.overflow = '';
  }

  // ── IN-STORE APPOINTMENT BOOKING ───────────────────────
  function openAppointmentModal() {
    document.getElementById('appointment-form-wrap').style.display = 'block';
    document.getElementById('appointment-success-wrap').style.display = 'none';
    document.getElementById('appointment-modal-overlay').classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeAppointmentModal() {
    document.getElementById('appointment-modal-overlay').classList.remove('open');
    document.body.style.overflow = '';
  }

  function selectSlot(slot, el) {
    state.selectedSlot = slot;
    document.querySelectorAll('#ap-slots-grid .slot-chip').forEach(c => c.classList.remove('selected'));
    if (el) el.classList.add('selected');
  }

  async function submitAppointment(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-appointment');
    const name = document.getElementById('ap-name')?.value.trim();
    const phone = document.getElementById('ap-phone')?.value.trim();
    const email = document.getElementById('ap-email')?.value.trim();
    const service = document.getElementById('ap-service')?.value;
    const date = document.getElementById('ap-date')?.value;
    const notes = document.getElementById('ap-notes')?.value.trim();

    if (!name || !phone || !date) {
      alert('Please fill all mandatory fields (Name, Phone, Date).');
      return;
    }

    try {
      btn.disabled = true;
      btn.textContent = 'Securing Clinic Slot…';

      const payload = {
        customer_name: name,
        phone,
        email,
        appointment_date: date,
        time_slot: state.selectedSlot,
        service_type: service,
        doctor_optometrist: 'Senior Optometrist (M.Optom) - Vision Opticals Clinic',
        notes
      };

      const res = await API.appointments.book(payload);
      if (res.success) {
        document.getElementById('appointment-form-wrap').style.display = 'none';
        document.getElementById('appointment-success-wrap').style.display = 'block';
        const aptNo = res.appointment_number || (res.appointment ? `VO-APT-${res.appointment.id}` : 'VO-APT-1001');
        document.getElementById('ap-res-id').textContent = aptNo;
        document.getElementById('ap-res-details').textContent = `${service} on ${date} at ${state.selectedSlot}`;

        const waText = encodeURIComponent(`Hi Vision Opticals, I booked an in-store appointment (Booking ID: ${aptNo}) for ${service} on ${date} at ${state.selectedSlot}.`);
        document.getElementById('ap-res-wa-btn').href = `https://wa.me/919486552324?text=${waText}`;
      } else {
        alert(res.message || 'Could not complete appointment booking.');
      }
    } catch (err) {
      console.error('Appointment error:', err);
      alert('Failed to connect to store system. Please try again or WhatsApp us.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Confirm In-Store Appointment';
    }
  }

  // ── ORDER CHECKOUT ─────────────────────────────────────
  function openCheckoutModal() {
    if (state.cart.length === 0) return;
    closeCartDrawer();

    let total = 0;
    state.cart.forEach(item => total += item.total_price);
    document.getElementById('checkout-total-val').textContent = `₹${total.toLocaleString('en-IN')}`;

    document.getElementById('checkout-form-wrap').style.display = 'block';
    document.getElementById('checkout-success-wrap').style.display = 'none';
    document.getElementById('checkout-modal-overlay').classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeCheckoutModal() {
    document.getElementById('checkout-modal-overlay').classList.remove('open');
    document.body.style.overflow = '';
  }

  function onFulfillmentChange() {
    const f = document.getElementById('co-fulfillment')?.value;
    document.getElementById('co-address-wrap').style.display = f === 'delivery' ? 'block' : 'none';
  }

  async function submitOrder(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-order');
    const name = document.getElementById('co-name')?.value.trim();
    const phone = document.getElementById('co-phone')?.value.trim();
    const fulfillment = document.getElementById('co-fulfillment')?.value;
    const address = document.getElementById('co-address')?.value.trim();
    const payment = document.getElementById('co-payment')?.value;

    if (!name || !phone) {
      alert('Please enter your name and WhatsApp number.');
      return;
    }

    let total = 0;
    state.cart.forEach(item => total += item.total_price);

    const payload = {
      customer_name: name,
      phone,
      fulfillment_method: fulfillment,
      delivery_address: fulfillment === 'delivery' ? address : 'Store Pickup at Vision Opticals Thiruvarur',
      payment_method: payment,
      total_amount: total,
      items: state.cart,
      prescription_details: state.cart[0]?.prescription || {}
    };

    try {
      btn.disabled = true;
      btn.textContent = 'Routing Order to Optical Lab…';

      const res = await API.orders.create(payload);
      if (res.success && res.order) {
        document.getElementById('checkout-form-wrap').style.display = 'none';
        document.getElementById('checkout-success-wrap').style.display = 'block';
        document.getElementById('co-res-order-no').textContent = res.order.order_number;

        const waText = encodeURIComponent(`Hi Vision Opticals, I placed Order #${res.order.order_number} for optical frames & lenses. Here is my prescription details.`);
        document.getElementById('co-res-wa-btn').href = `https://wa.me/919486552324?text=${waText}`;

        // Clear Cart
        state.cart = [];
        localStorage.removeItem('vo_cart');
        updateCartUI();
      } else {
        alert(res.message || 'Could not place order.');
      }
    } catch (err) {
      console.error('Order error:', err);
      alert('Failed to place order. Please try again.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Place Optical Order';
    }
  }

  // ── ORDER TRACKING PIPELINE ────────────────────────────
  function openTrackOrderModal() {
    document.getElementById('track-modal-overlay').classList.add('open');
    document.getElementById('track-result-container').style.display = 'none';
    document.getElementById('track-error-msg').style.display = 'none';
    document.body.style.overflow = 'hidden';
  }

  function closeTrackModal() {
    document.getElementById('track-modal-overlay').classList.remove('open');
    document.body.style.overflow = '';
  }

  async function trackOrderLookup() {
    const input = document.getElementById('track-input-order-no');
    const orderNo = (input?.value || '').trim();
    if (!orderNo) return;
    await trackOrderById(orderNo);
  }

  async function trackOrderById(orderNo) {
    openTrackOrderModal();
    document.getElementById('track-input-order-no').value = orderNo;
    document.getElementById('track-error-msg').style.display = 'none';

    try {
      const res = await API.orders.track(orderNo);
      if (res.success && res.order) {
        const o = res.order;
        document.getElementById('track-result-container').style.display = 'block';
        document.getElementById('trk-num').textContent = o.order_number;
        document.getElementById('trk-cust').textContent = o.customer_name;
        document.getElementById('trk-total').textContent = `₹${(o.total_amount || 0).toLocaleString('en-IN')}`;
        document.getElementById('trk-status-pill').textContent = o.status.replace(/_/g, ' ').toUpperCase();

        renderPipelineStages(o.status);
      } else {
        document.getElementById('track-result-container').style.display = 'none';
        document.getElementById('track-error-msg').style.display = 'block';
      }
    } catch (err) {
      console.error('Tracking error:', err);
      document.getElementById('track-error-msg').style.display = 'block';
    }
  }

  function renderPipelineStages(currentStatus) {
    const stages = [
      'placed',
      'prescription_verified',
      'lab_fitting',
      'qc_passed',
      'dispatched',
      'delivered'
    ];

    const curIdx = stages.indexOf(currentStatus);

    stages.forEach((st, i) => {
      const el = document.getElementById(`tl-${st}`);
      if (!el) return;
      el.classList.remove('completed', 'current', 'pending');
      if (i < curIdx) {
        el.classList.add('completed');
      } else if (i === curIdx) {
        el.classList.add('current');
      } else {
        el.classList.add('pending');
      }
    });
  }

  // ── FILTER ACTIONS ─────────────────────────────────────
  function filterByCategory(cat, btnEl) {
    state.activeCategory = cat;
    document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    loadProducts();
  }

  function filterByTag(tag, btnEl) {
    state.activeTag = tag;
    document.querySelectorAll('.quick-chips-strip .quick-chip').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    renderProducts(state.products);
  }

  function filterByColorFamily(color, btnEl) {
    state.activeColorFamily = color;
    document.querySelectorAll('.color-dot-pill').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    renderProducts(state.products);
  }

  function onFacetChange() {
    state.activeShape = document.getElementById('facet-shape')?.value || 'all';
    state.activeFrameType = document.getElementById('facet-type')?.value || 'all';
    state.activeGender = document.getElementById('facet-gender')?.value || 'all';
    state.activeSort = document.getElementById('facet-sort')?.value || 'popular';
    loadProducts();
  }

  let searchTimeout = null;
  function onSearchInput(val) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      state.searchQuery = val.trim();
      loadProducts();
    }, 280);
  }

  function showPage(pageId) {
    document.querySelectorAll('.page-view').forEach(p => p.style.display = 'none');
    const target = document.getElementById(`page-${pageId}`);
    if (target) target.style.display = 'block';

    document.querySelectorAll('.nav-tab, .mobile-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.page === pageId);
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── EVENT LISTENERS ────────────────────────────────────
  function setupEventListeners() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => onSearchInput(e.target.value));
    }

    const modalOverlay = document.getElementById('detail-modal-overlay');
    if (modalOverlay) {
      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeDetailModal();
      });
    }

    const aptOverlay = document.getElementById('appointment-modal-overlay');
    if (aptOverlay) {
      aptOverlay.addEventListener('click', (e) => {
        if (e.target === aptOverlay) closeAppointmentModal();
      });
    }

    const cartOverlay = document.getElementById('cart-drawer-overlay');
    if (cartOverlay) {
      cartOverlay.addEventListener('click', (e) => {
        if (e.target === cartOverlay) closeCartDrawer();
      });
    }

    const checkoutOverlay = document.getElementById('checkout-modal-overlay');
    if (checkoutOverlay) {
      checkoutOverlay.addEventListener('click', (e) => {
        if (e.target === checkoutOverlay) closeCheckoutModal();
      });
    }

    const trackOverlay = document.getElementById('track-modal-overlay');
    if (trackOverlay) {
      trackOverlay.addEventListener('click', (e) => {
        if (e.target === trackOverlay) closeTrackModal();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeDetailModal();
        closeAppointmentModal();
        closeCartDrawer();
        closeCheckoutModal();
        closeTrackModal();
      }
    });
  }

  // Helper
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Expose methods to global scope
  window.app = {
    init,
    filterByCategory,
    filterByTag,
    filterByColorFamily,
    onFacetChange,
    onSearchInput,
    showPage,
    openDetail,
    closeDetailModal,
    switchGalleryImg,
    selectColor,
    selectSize,
    selectVisionType,
    selectCoatingPackage,
    switchRxTab,
    addToBagWithLenses,
    openCartDrawer,
    closeCartDrawer,
    removeFromCart,
    openAppointmentModal,
    closeAppointmentModal,
    selectSlot,
    submitAppointment,
    openCheckoutModal,
    closeCheckoutModal,
    onFulfillmentChange,
    submitOrder,
    openTrackOrderModal,
    closeTrackModal,
    trackOrderLookup,
    trackOrderById
  };

  document.addEventListener('DOMContentLoaded', init);
})();