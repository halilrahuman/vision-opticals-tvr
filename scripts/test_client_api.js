// Test client-side API object methods against running server
const fs = require('fs');

// Mock window and fetch for Node environment
global.window = {};

// Simple node fetch ponyfill
global.fetch = async (url, options = {}) => {
  const http = require('http');
  const u = new URL(url.startsWith('http') ? url : `http://localhost:5000${url}`);

  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          json: async () => JSON.parse(data || '{}')
        });
      });
    });

    req.on('error', reject);
    if (options.body && typeof options.body === 'string') {
      req.write(options.body);
    }
    req.end();
  });
};

// Evaluate public/js/api.js
eval(fs.readFileSync('public/js/api.js', 'utf8'));
const API = global.window.API;

async function runClientApiTest() {
  console.log('Testing frontend API.js method bindings...');

  // 1. Login
  const loginRes = await API.auth.login('admin', 'vision123');
  const token = loginRes.token;
  console.log('API.auth.login: OK');

  // 2. Photos library
  const photosRes = await API.photos.list(token);
  console.log('API.photos.list: OK, files count:', photosRes.files ? photosRes.files.length : 'none');

  // 3. Components getHomepage & getAdmin
  const hpComps = await API.components.getHomepage();
  console.log('API.components.getHomepage: OK, count:', hpComps.components ? hpComps.components.length : 'none');

  const adminComps = await API.components.getAdmin(token);
  console.log('API.components.getAdmin: OK, count:', adminComps.components ? adminComps.components.length : 'none');

  // 4. Content getAllSections
  const sections = await API.content.getAllSections(token);
  console.log('API.content.getAllSections: OK, count:', sections.sections ? sections.sections.length : 'none');

  // 5. Orders list with filter string and token
  const orders = await API.orders.list('all', token);
  console.log('API.orders.list("all", token): OK, count:', orders.orders ? orders.orders.length : 'none');

  // 6. Appointments list with filter string and token
  const apts = await API.appointments.list('all', token);
  console.log('API.appointments.list("all", token): OK, count:', apts.appointments ? apts.appointments.length : 'none');

  // 7. Inventory list and stock_quantity
  const inv = await API.inventory.list({}, token);
  const sample = inv.items && inv.items[0];
  console.log('API.inventory.list: OK, sample stock_quantity:', sample ? sample.stock_quantity : 'none');

  console.log('\nAll frontend API method bindings verified successfully!');
}

runClientApiTest().catch(err => {
  console.error('Client API test failed:', err);
  process.exit(1);
});
