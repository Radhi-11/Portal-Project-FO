const { newDb } = require('pg-mem');
const fs = require('fs');
const path = require('path');

let memDb = null;
let pool = null;

async function setupTestDb() {
  if (memDb) {
    return { memDb, pool };
  }

  memDb = newDb();

  const { Pool } = memDb.adapters.createPg({});
  pool = new Pool({
    database: 'test',
    host: '127.0.0.1',
    port: 5432,
  });

  const schemaPath = path.join(__dirname, '..', 'sql', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  await pool.query(schema);

  return { memDb, pool };
}

function getTestPool() {
  if (!pool) {
    throw new Error('Test database not initialized. Call setupTestDb() first.');
  }
  return pool;
}

function getTestDb() {
  if (!memDb) {
    throw new Error('Test database not initialized. Call setupTestDb() first.');
  }
  return memDb;
}

async function closeTestDb() {
  if (pool) {
    await pool.end();
    pool = null;
  }
  memDb = null;
}

module.exports = {
  setupTestDb,
  getTestPool,
  getTestDb,
  closeTestDb,
};
