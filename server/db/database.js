/**
 * Vision Opticals — Database access layer (Netlify Database / Postgres)
 *
 * Keeps the same small API the routes were written against
 * (`db.get`, `db.all`, `db.run`) so the existing SQL keeps working:
 *  - `?` placeholders are rewritten to Postgres `$1, $2, ...`
 *  - INSERTs return `lastID` via `RETURNING id`
 *  - booleans are stored as 0/1 integers, counts/sums come back as numbers
 *  - timestamps come back as "YYYY-MM-DD HH:MM:SS" strings
 *
 * The schema lives in db/schema.ts; migrations are applied by Netlify at deploy time.
 */
const { getDatabase } = require('@netlify/database');

let connection = null;
function getPool() {
  if (!connection) connection = getDatabase();
  return connection.pool;
}

// Tables without an `id` column (no RETURNING id on insert)
const TABLES_WITHOUT_ID = new Set(['store_settings']);

// Postgres type OIDs
const INT8 = 20;
const NUMERIC = 1700;
const DATE = 1082;
const TIMESTAMP = 1114;
const TIMESTAMPTZ = 1184;

function toPgPlaceholders(sql) {
  let out = '';
  let n = 0;
  let inString = false;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "'") inString = !inString;
    if (ch === '?' && !inString) {
      out += '$' + (++n);
    } else {
      out += ch;
    }
  }
  return out;
}

function normalizeParams(params = []) {
  return params.map((p) => {
    if (p === undefined) return null;
    if (p === true) return 1;
    if (p === false) return 0;
    return p;
  });
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function formatTimestamp(value) {
  if (value == null) return value;
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())} ` +
      `${pad(value.getUTCHours())}:${pad(value.getUTCMinutes())}:${pad(value.getUTCSeconds())}`;
  }
  // String form from the driver, e.g. "2026-11-16 08:46:03.123"
  return String(value).replace('T', ' ').slice(0, 19);
}

function normalizeRows(result) {
  const fields = result.fields || [];
  const numeric = fields.filter((f) => f.dataTypeID === INT8 || f.dataTypeID === NUMERIC).map((f) => f.name);
  const dates = fields.filter((f) => f.dataTypeID === TIMESTAMP || f.dataTypeID === TIMESTAMPTZ).map((f) => f.name);
  const plainDates = fields.filter((f) => f.dataTypeID === DATE).map((f) => f.name);

  if (!numeric.length && !dates.length && !plainDates.length) return result.rows || [];

  return (result.rows || []).map((row) => {
    for (const k of numeric) {
      if (row[k] != null) row[k] = Number(row[k]);
    }
    for (const k of dates) {
      row[k] = formatTimestamp(row[k]);
    }
    for (const k of plainDates) {
      if (row[k] instanceof Date) row[k] = formatTimestamp(row[k]).slice(0, 10);
    }
    return row;
  });
}

async function query(sql, params) {
  const result = await getPool().query(toPgPlaceholders(sql), normalizeParams(params));
  return { ...result, rows: normalizeRows(result) };
}

const dbAsync = {
  async get(sql, params = []) {
    const { rows } = await query(sql, params);
    return rows[0];
  },

  async all(sql, params = []) {
    const { rows } = await query(sql, params);
    return rows || [];
  },

  async run(sql, params = []) {
    let text = sql.trim().replace(/;\s*$/, '');
    const insert = /^insert\s+into\s+"?(\w+)"?/i.exec(text);
    if (insert && !/\breturning\b/i.test(text) && !TABLES_WITHOUT_ID.has(insert[1].toLowerCase())) {
      text += ' RETURNING id';
    }
    const result = await query(text, params);
    return {
      lastID: result.rows && result.rows[0] ? result.rows[0].id : undefined,
      changes: result.rowCount || 0
    };
  }
};

// Schema is managed by migrations in netlify/database/migrations.
const initSchema = async () => {};

module.exports = {
  db: dbAsync,
  initSchema
};
