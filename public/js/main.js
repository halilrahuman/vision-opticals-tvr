/* ══════════════════════════════════════
   VISION OPTICALS — main.js
   Handles:
   - Nav scroll effect
   - Mobile menu toggle
   - Scroll reveal animations
   - Product loading from CMS content files
   - Eyewear filter tabs
   - Frame finder quiz
   - WhatsApp float visibility
══════════════════════════════════════ */

// ── GLOBAL STATE ──
let allProducts = [];   // stores all loaded products
let shopSettings = {};  // stores shop info from shop.json
let quizAnswers = {};   // stores quiz selections
const CMS_REPO = 'Jashwanth12707/client-optical-shop';
const CMS_BRANCH = 'cms';

// ══════════════════════════════════════
// NAV — scroll effect + mobile menu
// ══════════════════════════════════════
const nav = document.getElementById('nav');
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobile-menu');

// Add scrolled class when user scrolls down
window.addEventListener('scroll', () => {
    if (window.scrollY > 60) {
        nav.classList.add('scrolled');
    } else {
        nav.classList.remove('scrolled');
    }
});

// Hamburger toggles mobile menu
hamburger.addEventListener('click', () => {
    mobileMenu.classList.toggle('open');
});

// Close mobile menu when a link is clicked
document.querySelectorAll('.mobile-link').forEach(link => {
    link.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
    });
});

// ══════════════════════════════════════
// SCROLL REVEAL ANIMATIONS
// Fades elements in as they enter viewport
// ══════════════════════════════════════
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            // Stagger children if the element has data-stagger
            const children = entry.target.querySelectorAll('[data-stagger]');
            children.forEach((child, i) => {
                setTimeout(() => child.classList.add('visible'), i * 100);
            });
        }
    });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

// Observe all .reveal and .reveal-right elements
document.querySelectorAll('.reveal, .reveal-right').forEach(el => {
    revealObserver.observe(el);
});

// ══════════════════════════════════════
// LOAD SHOP SETTINGS
// Reads from content/settings/shop.json
// Updates WhatsApp links, phone, hours etc.
// ══════════════════════════════════════
async function loadShopSettings() {
    try {
        const res = await fetch('/content/settings/shop.json');
        if (!res.ok) throw new Error('settings not found');
        shopSettings = await res.json();
        applyShopSettings(shopSettings);
    } catch (e) {
        // Use default values already in HTML if fetch fails
        console.log('Using default shop settings');
    }
}

function applyShopSettings(s) {
    // Update WhatsApp number everywhere
    if (s.whatsapp) {
        const waUrl = `https://wa.me/${s.whatsapp}?text=Hi%20I%20want%20to%20enquire%20about%20frames%20and%20lenses`;
        document.querySelectorAll('a[href*="wa.me"]').forEach(el => {
            // Preserve the custom message if it has one, just update the number
            el.href = el.href.replace(/wa\.me\/[^?]+/, `wa.me/${s.whatsapp}`);
        });
    }

    // Update phone number
    if (s.phone) {
        document.querySelectorAll('a[href^="tel:"]').forEach(el => {
            el.href = `tel:${s.phone.replace(/\s/g, '')}`;
            if (el.textContent.includes('04366')) el.textContent = s.phone;
        });
    }

    // Update email
    if (s.email) {
        document.querySelectorAll('a[href^="mailto:"]').forEach(el => {
            el.href = `mailto:${s.email}`;
            el.textContent = s.email;
        });
    }

    // Update weekday hours
    if (s.hoursWeekday) {
        const weekdayEl = document.getElementById('hours-weekday');
        if (weekdayEl) weekdayEl.textContent = s.hoursWeekday;
    }

    // Update Sunday hours
    if (s.hoursSunday) {
        const sundayEl = document.getElementById('hours-sunday');
        if (sundayEl) sundayEl.textContent = s.hoursSunday;
    }
}

// ══════════════════════════════════════
// LOAD PRODUCTS FROM CMS
// Reads markdown files from content/products/
// Falls back to demo products if none found
// ══════════════════════════════════════
async function loadProducts() {
    // Try fetching pre-built products.json (production after build step)
    try {
        const res = await fetch('/products.json');
        if (res.ok) {
            allProducts = await res.json();
            renderEyewear('all');
            renderLenses();
            return;
        }
    } catch (e) { }

    // Fallback: discover markdown files from GitHub and fetch by slug
    const slugs = await fetchProductSlugs();
    const loaded = [];

    for (const slug of slugs) {
        try {
            const res = await fetch(`/content/products/${slug}.md`);
            if (!res.ok) continue;
            const text = await res.text();
            const product = parseFrontmatter(text, slug);
            if (product && product.published !== 'false') {
                loaded.push(product);
            }
        } catch (e) { }
    }

    // Use loaded or fall back to demo data
    allProducts = loaded.length > 0 ? loaded : getDemoProducts();
    renderEyewear('all');
    renderLenses();
}

async function fetchProductSlugs() {
    try {
        const apiUrl = `https://api.github.com/repos/${CMS_REPO}/contents/public/content/products?ref=${CMS_BRANCH}`;
        const res = await fetch(apiUrl);
        if (!res.ok) return ['frame1', 'frame2', 'frame3'];
        const files = await res.json();
        return files
            .filter(file => file.type === 'file' && file.name.endsWith('.md'))
            .map(file => file.name.replace(/\.md$/, ''));
    } catch (e) {
        return ['frame1', 'frame2', 'frame3'];
    }
}

// Parse markdown frontmatter (the --- block at top of .md files)
function parseFrontmatter(text, slug) {
    const match = text.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return null;
    const obj = { slug };
    match[1].split('\n').forEach(line => {
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0) {
            const key = line.slice(0, colonIdx).trim();
            const val = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');
            obj[key] = val;
        }
    });
    return obj;
}

// ── DEMO PRODUCTS (used before client uploads real ones) ──
function getDemoProducts() {
    return [
        // Eyewear frames
        {
            name: 'Classic Rectangle',
            category: 'frames',
            price: '₹1,299',
            badge: 'Bestseller',
            image: 'https://images.unsplash.com/photo-1516062423079-7ca13cdc7f5a?w=400&q=80',
            description: 'Lightweight everyday frame, suits all face shapes',
            faceShape: 'round',
            style: 'professional',
            published: true
        },
        {
            name: 'Round Acetate',
            category: 'frames',
            price: '₹2,199',
            badge: 'Premium',
            image: 'https://images.unsplash.com/photo-1577803645773-f96470509666?w=400&q=80',
            description: 'Italian-style round frame with spring hinges',
            faceShape: 'square',
            style: 'trendy',
            published: true
        },
        {
            name: 'Slim Titanium',
            category: 'frames',
            price: '₹3,499',
            badge: 'Premium',
            image: 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=400&q=80',
            description: 'Ultra-light titanium frame for all-day comfort',
            faceShape: 'heart',
            style: 'minimal',
            published: true
        },
        {
            name: 'Aviator Classic',
            category: 'sunglasses',
            price: '₹999',
            badge: 'UV400',
            image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&q=80',
            description: 'Timeless aviator with full UV400 protection',
            faceShape: 'oval',
            style: 'casual',
            published: true
        },
        {
            name: 'Sport Wrap',
            category: 'sunglasses',
            price: '₹1,499',
            badge: 'Polarized',
            image: 'https://images.unsplash.com/photo-1583394293253-535e7882b0a5?w=400&q=80',
            description: 'Polarized lenses for outdoor and sports use',
            faceShape: 'round',
            style: 'casual',
            published: true
        },
        {
            name: 'Wayfarer Square',
            category: 'frames',
            price: '₹1,099',
            badge: 'New',
            image: 'https://images.unsplash.com/photo-1508296695146-257a814070b4?w=400&q=80',
            description: 'Modern squared wayfarer with anti-glare coating',
            faceShape: 'oval',
            style: 'trendy',
            published: true
        },
        // Contact lenses
        {
            name: 'Acuvue Daily',
            category: 'lenses',
            price: '₹1500 - 2500',
            badge: 'Daily',
            image: 'https://i.pinimg.com/1200x/42/c6/1c/42c61c28241395fde943fa6657c2edc2.jpg',
            description: 'Fresh daily disposables with UV blocking',
            published: true
        },

        {
            name: 'Air Optix Monthly',
            category: 'lenses',
            price: '₹1,200 – ₹2000',
            badge: 'Monthly',
            image: 'https://i.pinimg.com/1200x/d1/31/0c/d1310c12b9f5a6d6a075a2f341d77e78.jpg',
            description: 'Breathable silicone hydrogel for monthly wear',
            published: true
        },
        {
            name: 'FreshLook Colour',
            category: 'lenses',
            price: '₹1,200 – ₹2,500',
            badge: 'Coloured',
            image: 'https://i.pinimg.com/1200x/82/8f/30/828f3079be53fbb62ea3d13b8f811ccd.jpg',
            description: 'Natural-looking colour lenses with UV protection',
            published: true
        },
    ];
}

// ══════════════════════════════════════
// RENDER EYEWEAR GRID
// Filters by category tab selection
// ══════════════════════════════════════
function renderEyewear(filter) {
    const grid = document.getElementById('eyewear-grid');
    if (!grid) return;

    // Filter: 'all' shows frames + sunglasses (not lenses)
    const eyewearCats = ['frames', 'daily', 'premium', 'sunglasses'];
    let filtered = allProducts.filter(p => {
        if (filter === 'all') return p.category !== 'lenses';
        if (filter === 'daily') return p.category === 'frames' || p.category === 'daily';
        if (filter === 'premium') return p.category === 'premium';
        if (filter === 'sunglasses') return p.category === 'sunglasses';
        return p.category === filter;
    });

    if (filtered.length === 0) {
        grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px;color:#8A8A8A;">
        <div style="font-size:3rem;margin-bottom:12px;">🕶️</div>
        <p style="font-weight:600;">No frames in this category yet.</p>
        <p style="font-size:0.85rem;margin-top:6px;">Check back soon — new stock added regularly!</p>
      </div>`;
        return;
    }

    grid.innerHTML = filtered.map(p => buildProductCard(p)).join('');
}

// ══════════════════════════════════════
// RENDER LENSES GRID
// Only shows contact lens products
// ══════════════════════════════════════
function renderLenses() {
    const grid = document.getElementById('lenses-grid');
    if (!grid) return;

    const lenses = allProducts.filter(p => p.category === 'lenses');

    if (lenses.length === 0) {
        grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px;color:rgba(255,255,255,0.4);">
        <div style="font-size:3rem;margin-bottom:12px;">👁️</div>
        <p style="font-weight:600;color:rgba(255,255,255,0.6);">Contact lens products coming soon.</p>
      </div>`;
        return;
    }

    grid.innerHTML = lenses.map(p => buildProductCard(p)).join('');
}

// ── BUILD PRODUCT CARD HTML ──
function buildProductCard(p) {
    const wa = shopSettings.whatsapp || '919486552324';
    const goldBadges = ['Premium', 'Polarized', 'UV400', 'Coloured'];
    const badgeClass = goldBadges.includes(p.badge) ? 'gold' : '';

    return `
    <div class="product-card">
      <div class="product-img">
        <img
          src="${p.image || 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=400&q=80'}"
          alt="${p.name}"
          loading="lazy"
          onerror="this.src='https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=400&q=80'"
        />
        ${p.badge ? `<div class="product-badge ${badgeClass}">${p.badge}</div>` : ''}
      </div>
      <div class="product-body">
        <div class="product-name">${p.name}</div>
        ${p.description ? `<div class="product-desc">${p.description}</div>` : ''}
        <div class="product-footer">
          <div class="product-price">${p.price || '₹Ask Us'}</div>
          <a
            href="https://wa.me/${wa}?text=Hi%20I%20am%20interested%20in%20${encodeURIComponent(p.name)}"
            target="_blank"
            class="product-wa"
          >
            💬 Enquire
          </a>
        </div>
      </div>
    </div>`;
}

// ══════════════════════════════════════
// FILTER TABS (eyewear section)
// ══════════════════════════════════════
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        // Remove active from all tabs
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        // Add active to clicked
        tab.classList.add('active');
        // Re-render with filter
        renderEyewear(tab.dataset.filter);
    });
});

// ══════════════════════════════════════
// FRAME FINDER QUIZ
// ══════════════════════════════════════

// Pick an option in a quiz step
function pickOpt(el, key, value) {
    // Deselect others in same step
    el.closest('.quiz-opts').querySelectorAll('.qopt').forEach(o => o.classList.remove('selected'));
    el.classList.add('selected');
    quizAnswers[key] = value;
}

// Move to quiz step number
function goQuizStep(n) {
    // Hide all steps
    document.querySelectorAll('.quiz-step').forEach(s => s.classList.remove('active'));
    // Show target step
    document.getElementById('qs' + n).classList.add('active');

    // Update progress dots
    document.querySelectorAll('.qdot').forEach((d, i) => {
        d.classList.toggle('active', i < n);
    });

    // Update progress bar fill
    const fills = { 1: '33%', 2: '66%', 3: '100%' };
    document.getElementById('quiz-progress-fill').style.width = fills[n] || '33%';
}

// Show quiz result based on answers
function showQuizResult() {
    // Hide all steps, show result
    document.querySelectorAll('.quiz-step').forEach(s => s.classList.remove('active'));
    document.getElementById('quiz-result').classList.add('show');

    const face = quizAnswers.face || 'oval';
    const style = quizAnswers.style || 'casual';
    const use = quizAnswers.use || 'office';

    // Recommendations text based on face shape
    const recs = {
        oval: {
            title: 'Most Frames Suit You — Lucky!',
            desc: 'Oval faces are the most versatile. We recommend classic rectangles for office, round frames for a trendy look.',
        },
        round: {
            title: 'Rectangle & Angular Frames',
            desc: 'Angular frames add definition to round faces. Wide rectangular or geometric styles work best for you.',
        },
        square: {
            title: 'Oval & Round Frames',
            desc: 'Soft, curved frames beautifully balance a strong jaw and broad forehead. Oval and round styles are your ideal match.',
        },
        heart: {
            title: 'Bottom-Heavy & Rimless Frames',
            desc: 'Frames that are wider at the bottom balance your wider forehead. Light rimless styles also suit you perfectly.',
        },
    };

    // Lens tip based on usage
    const lensTips = {
        screen: '💡 Tip: Ask us about Blue-Cut lenses — they filter harmful screen light and reduce eye strain significantly.',
        outdoor: '💡 Tip: Photochromic or polarized lenses are ideal for outdoor use — they auto-adjust to light conditions.',
        reading: '💡 Tip: Anti-reflective coatings on reading glasses reduce glare from pages and screens.',
        office: '💡 Tip: Anti-glare coating with a lightweight frame makes all-day office wear comfortable.',
    };

    const rec = recs[face] || recs['oval'];
    document.getElementById('result-title').textContent = rec.title;
    document.getElementById('result-desc').textContent = rec.desc;

    // Show lens tip
    const tipEl = document.getElementById('result-lens-tip');
    if (lensTips[use]) {
        tipEl.textContent = lensTips[use];
        tipEl.style.display = 'block';
    }

    // ── SMART FILTERING FOR QUIZ RESULTS ──
    let frames = allProducts.filter(p => p.category !== 'lenses');

    // 1. Try to find frames that match both face shape and style
    let matches = frames.filter(f => f.faceShape === face && f.style === style);

    // 2. If not enough, add those matching face shape
    if (matches.length < 3) {
        const faceMatches = frames.filter(f => f.faceShape === face && !matches.includes(f));
        matches = [...matches, ...faceMatches];
    }

    // 3. If still not enough, add those matching style
    if (matches.length < 3) {
        const styleMatches = frames.filter(f => f.style === style && !matches.includes(f));
        matches = [...matches, ...styleMatches];
    }

    // 4. Fallback: Add other frames until we have 3
    if (matches.length < 3) {
        const others = frames.filter(f => !matches.includes(f));
        matches = [...matches, ...others];
    }

    // 5. Always shuffle slightly based on the answer combo to keep it fresh
    const seed = (face.length + style.length + use.length) % 5;
    const finalSelection = matches.slice(seed, seed + 3);

    document.getElementById('result-frames').innerHTML = finalSelection.map(f => `
    <div class="result-frame">
      <img src="${f.image}" alt="${f.name}" loading="lazy"/>
      <div class="result-frame-name">${f.name}</div>
      <div class="result-frame-price">${f.price}</div>
    </div>`).join('');
}

// Retake quiz — reset everything
function retakeQuiz() {
    quizAnswers = {};
    document.getElementById('quiz-result').classList.remove('show');
    document.querySelectorAll('.quiz-step').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.qopt').forEach(o => o.classList.remove('selected'));
    document.getElementById('qs1').classList.add('active');
    document.querySelectorAll('.qdot').forEach((d, i) => d.classList.toggle('active', i === 0));
    document.getElementById('quiz-progress-fill').style.width = '33%';
}

// ══════════════════════════════════════
// FLOATING WHATSAPP BUTTON
// Hides on very small scroll, shows after
// ══════════════════════════════════════
const waFloat = document.getElementById('wa-float');
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const current = window.scrollY;
    // Hide when scrolling down fast, show otherwise
    if (current > 200) {
        waFloat.style.opacity = '1';
        waFloat.style.transform = 'translateY(0)';
    } else {
        waFloat.style.opacity = '0.85';
    }
    lastScroll = current;
}, { passive: true });

// ══════════════════════════════════════
// INITIALISE EVERYTHING ON PAGE LOAD
// ══════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    loadShopSettings();   // load phone/WA/hours from CMS
    loadProducts();       // load frames + lenses from CMS
});