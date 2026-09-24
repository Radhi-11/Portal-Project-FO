const { Pool } = require('pg');
const config = require('./index');

let pool;
let memPool;
let isMemMode = false;

function getPool() {
  if (isMemMode && memPool) {
    return memPool;
  }
  if (!pool) {
    pool = new Pool({
      host: config.db.host,
      port: config.db.port,
      database: config.db.database,
      user: config.db.user,
      password: config.db.password,
      ssl: config.db.ssl ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }
  return pool;
}

async function query(text, params) {
  const p = getPool();
  const client = await p.connect();
  try {
    const res = await client.query(text, params);
    return res;
  } finally {
    client.release();
  }
}

async function getClient() {
  return await getPool().connect();
}

function setMemMode(memPoolInstance) {
  isMemMode = true;
  memPool = memPoolInstance;
  if (pool) {
    pool.end();
    pool = null;
  }
}

async function close() {
  if (pool) {
    await pool.end();
    pool = null;
  }
  if (memPool) {
    await memPool.end();
    memPool = null;
    isMemMode = false;
  }
}

module.exports = {
  query,
  getClient,
  getPool,
  setMemMode,
  close,
};
