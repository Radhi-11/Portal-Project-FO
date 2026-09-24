const { setupTestDb, closeTestDb, getTestPool } = require('./setup');
const db = require('../src/config/database');

let originalPool;
let originalQuery;
let originalGetClient;

beforeAll(async () => {
  originalPool = db.getPool;
  originalQuery = db.query;
  originalGetClient = db.getClient;

  const { pool } = await setupTestDb();
  const testPool = getTestPool();

  db.getPool = () => testPool;
  db.query = async (text, params) => {
    const client = await testPool.connect();
    try {
      return await client.query(text, params);
    } finally {
      client.release();
    }
  };
  db.getClient = async () => testPool.connect();
});

afterAll(async () => {
  db.getPool = originalPool;
  db.query = originalQuery;
  db.getClient = originalGetClient;
  await closeTestDb();
});
