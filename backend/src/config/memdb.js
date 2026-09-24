const { newDb } = require('pg-mem');
const fs = require('fs');
const path = require('path');

let memDb = null;
let memPool = null;

class MemPool {
  constructor(pool) {
    this.pool = pool;
  }

  query(text, params) {
    return this.pool.query(text, params);
  }

  async connect() {
    return this.pool.connect();
  }

  async end() {
    return this.pool.end();
  }

  on(event, handler) {
    return this.pool.on(event, handler);
  }
}

async function initMemDb() {
  if (memDb) {
    return memPool;
  }

  memDb = newDb();

  const { Pool } = memDb.adapters.createPg({});
  const pgPool = new Pool({
    database: 'test',
    host: '127.0.0.1',
    port: 5432,
  });

  const schemaPath = path.join(__dirname, '..', '..', 'sql', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  await pgPool.query(schema);

  memPool = new MemPool(pgPool);

  console.log('[MemDB] In-memory database initialized with schema.');

  return memPool;
}

function getMemPool() {
  if (!memPool) {
    throw new Error('MemDB not initialized. Call initMemDb() first.');
  }
  return memPool;
}

function getMemDb() {
  if (!memDb) {
    throw new Error('MemDB not initialized. Call initMemDb() first.');
  }
  return memDb;
}

module.exports = {
  initMemDb,
  getMemPool,
  getMemDb,
};
