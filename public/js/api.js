/**
 * Vision Opticals — Centralized API Client
 * Connects Customer Website & Admin Dashboard to the Node.js / SQLite backend
 */

const API = (function () {
  const BASE = '/api';

  async function request(endpoint, options = {}) {
    const url = `${BASE}${endpoint}`;
    const headers = options.headers || {};

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    if (options.token) {
      headers['Authorization'] = `Bearer ${options.token}`;
      delete options.token;
    }

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err.message);
      throw err;
    }
  }

  return {
    // Auth APIs
    auth: {
      login: (username, password) =>
        request('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ username, password })
        }),
      me: (token) =>
        request('/auth/me', { token }),
      changePassword: (currentPassword, newPassword, token) =>
        request('/auth/change-password', {
          method: 'POST',
          token,
          body: JSON.stringify({ currentPassword, newPassword })
        })
    },

    // Products APIs
    products: {
      list: (params = {}) => {
        const q = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => {
          if (v != null && v !== '' && v !== 'all') q.append(k, v);
        });
        const qs = q.toString() ? `?${q.toString()}` : '';
        return request(`/products${qs}`);
      },
      get: (idOrSlug) =>
        request(`/products/${idOrSlug}`),
      create: (data, token) =>
        request('/products', {
          method: 'POST',
          token,
          body: JSON.stringify(data)
        }),
      update: (id, data, token) =>
        request(`/products/${id}`, {
          method: 'PUT',
          token,
          body: JSON.stringify(data)
        }),
      delete: (id, token) =>
        request(`/products/${id}`, {
          method: 'DELETE',
          token
        }),
      togglePublish: (id, token) =>
        request(`/products/${id}/toggle-publish`, {
          method: 'PATCH',
          token
        })
    },

    // Categories & Brands
    categories: {
      list: () => request('/categories'),
      brands: () => request('/categories/brands'),
      addBrand: (data, token) =>
        request('/categories/brands', {
          method: 'POST',
          token,
          body: JSON.stringify(data)
        })
    },

    // Inventory APIs
    inventory: {
      list: (params = {}, token) => {
        const q = new URLSearchParams();
        if (params.status) q.append('status', params.status);
        if (params.search) q.append('search', params.search);
        const qs = q.toString() ? `?${q.toString()}` : '';
        return request(`/inventory${qs}`, { token });
      },
      summary: (token) =>
        request('/inventory/summary', { token }),
      adjust: (productId, delta, reason, token) =>
        request('/inventory/adjust', {
          method: 'POST',
          token,
          body: JSON.stringify({ productId, delta, reason })
        }),
      set: (productId, quantity, lowStockThreshold, reason, token) =>
        request('/inventory/set', {
          method: 'POST',
          token,
          body: JSON.stringify({ productId, quantity, lowStockThreshold, reason })
        }),
      logs: (productId, token) => {
        const endpoint = productId ? `/inventory/logs/${productId}` : '/inventory/logs';
        return request(endpoint, { token });
      }
    },

    // Offers & Promotions APIs
    offers: {
      getActive: () => request('/offers/active'),
      list: (token) => request('/offers', { token }),
      create: (data, token) =>
        request('/offers', {
          method: 'POST',
          token,
          body: JSON.stringify(data)
        }),
      update: (id, data, token) =>
        request(`/offers/${id}`, {
          method: 'PUT',
          token,
          body: JSON.stringify(data)
        }),
      delete: (id, token) =>
        request(`/offers/${id}`, {
          method: 'DELETE',
          token
        }),
      toggle: (id, token) =>
        request(`/offers/${id}/toggle`, {
          method: 'PATCH',
          token
        })
    },

    // Appointments (In-Store Eye Test Booking)
    appointments: {
      book: (data) =>
        request('/appointments', {
          method: 'POST',
          body: JSON.stringify(data)
        }),
      list: (filterOrParams = {}, token = null) => {
        let params = {};
        let actualToken = token;
        if (typeof filterOrParams === 'string' && token) {
          if (filterOrParams !== 'all') params.status = filterOrParams;
        } else if (typeof filterOrParams === 'string' && !token) {
          actualToken = filterOrParams;
        } else if (typeof filterOrParams === 'object' && filterOrParams) {
          params = filterOrParams;
        }
        const q = new URLSearchParams();
        if (params.status && params.status !== 'all') q.append('status', params.status);
        if (params.date) q.append('date', params.date);
        const qs = q.toString() ? `?${q.toString()}` : '';
        return request(`/appointments${qs}`, { token: actualToken });
      },
      updateStatus: (id, status, token) =>
        request(`/appointments/${id}/status`, {
          method: 'PATCH',
          token,
          body: JSON.stringify({ status })
        })
    },

    // Orders & Tracking
    orders: {
      create: (data) =>
        request('/orders', {
          method: 'POST',
          body: JSON.stringify(data)
        }),
      track: (orderNumber) =>
        request(`/orders/track/${orderNumber}`),
      list: (filterOrToken, maybeToken = null) => {
        let status = null;
        let actualToken = maybeToken;
        if (typeof filterOrToken === 'string' && maybeToken) {
          if (filterOrToken !== 'all') status = filterOrToken;
        } else if (typeof filterOrToken === 'string' && !maybeToken) {
          actualToken = filterOrToken;
        }
        const q = new URLSearchParams();
        if (status && status !== 'all') q.append('status', status);
        const qs = q.toString() ? `?${q.toString()}` : '';
        return request(`/orders${qs}`, { token: actualToken });
      },
      updateStatus: (id, status, tracking_number, token) =>
        request(`/orders/${id}/status`, {
          method: 'PATCH',
          token,
          body: JSON.stringify({ status, tracking_number })
        })
    },

    // Modular Website Components (With Undo / Add / Reorder)
    components: {
      getActive: () => request('/components'),
      getHomepage: () => request('/components'),
      getAdmin: (token) => request('/components/admin', { token }),
      getAdminList: (token) => request('/components/admin', { token }),
      create: (data, token) =>
        request('/components', {
          method: 'POST',
          token,
          body: JSON.stringify(data)
        }),
      update: (id, data, token) =>
        request(`/components/${id}`, {
          method: 'PUT',
          token,
          body: JSON.stringify(data)
        }),
      delete: (id, token) =>
        request(`/components/${id}`, {
          method: 'DELETE',
          token
        }),
      undo: (id, token) =>
        request(`/components/${id}/undo`, {
          method: 'POST',
          token
        }),
      reorder: (orderedIds, token) =>
        request('/components/reorder', {
          method: 'PUT',
          token,
          body: JSON.stringify({ orderedIds })
        })
    },

    // Homepage Content & Customization APIs
    content: {
      getHomepage: () => request('/content/homepage'),
      getSections: (token) => request('/content/sections', { token }),
      getAllSections: (token) => request('/content/sections', { token }),
      updateSection: (key, data, token) =>
        request(`/content/sections/${key}`, {
          method: 'PUT',
          token,
          body: JSON.stringify(data)
        }),
      reorder: (orderedKeys, token) =>
        request('/content/reorder', {
          method: 'PUT',
          token,
          body: JSON.stringify({ orderedKeys })
        })
    },

    // Store Settings APIs
    settings: {
      get: () => request('/settings'),
      update: (data, token) =>
        request('/settings', {
          method: 'PUT',
          token,
          body: JSON.stringify(data)
        })
    },

    // Media & Image Upload APIs
    upload: {
      images: async (formData, token) => {
        const res = await request('/upload', {
          method: 'POST',
          token,
          body: formData
        });
        if (res && res.images && !res.files) res.files = res.images;
        return res;
      },
      getLibrary: async (token) => {
        const res = await request('/upload/library', { token });
        if (res && res.images && !res.files) res.files = res.images;
        return res;
      },
      deleteImage: (url, token) =>
        request('/upload', {
          method: 'DELETE',
          token,
          body: JSON.stringify({ url })
        })
    },

    // Photos alias for Admin Media library
    photos: {
      list: async (token) => {
        const res = await request('/upload/library', { token });
        if (res && res.images && !res.files) res.files = res.images;
        return res;
      },
      upload: async (formData, token) => {
        const res = await request('/upload', {
          method: 'POST',
          token,
          body: formData
        });
        if (res && res.images && !res.files) res.files = res.images;
        return res;
      },
      delete: (filenameOrUrl, token) => {
        const url = filenameOrUrl.startsWith('uploads/') ? filenameOrUrl : `uploads/${filenameOrUrl}`;
        return request('/upload', {
          method: 'DELETE',
          token,
          body: JSON.stringify({ url, filename: filenameOrUrl })
        });
      }
    },

    // Bulk CSV APIs
    bulk: {
      importCSV: (formData, token) =>
        request('/bulk/import-csv', {
          method: 'POST',
          token,
          body: formData
        }),
      exportUrl: '/api/bulk/export-csv',
      templateUrl: '/api/bulk/template-csv'
    }
  };
})();

// Attach to window
window.API = API;
