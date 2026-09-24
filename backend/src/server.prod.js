const db = require('./config/database');
const fs = require('fs');
const path = require('path');

async function initDatabase() {
  try {
    const schemaPath = path.join(__dirname, '..', 'sql', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf-8');
      const client = await db.getClient();
      try {
        await client.query(schema);
        console.log('[Prod] Database schema loaded successfully.');
      } finally {
        client.release();
      }
    }
  } catch (error) {
    console.error('[Prod] Failed to initialize database schema:', error.message);
  }
}

async function startProdServer() {
  const config = require('./config');

  await initDatabase();

  const { app } = require('./app');

  app.listen(config.port, '0.0.0.0', () => {
    console.log(`
┌──────────────────────────────────────┐
│  Portal Project FO - PROD SERVER      │
├──────────────────────────────────────┤
│  Backend:  http://localhost:${config.port}  │
│  Mode:     PostgreSQL                 │
│  DB Host:  ${config.db.host}          │
└──────────────────────────────────────┘
    `);
  });
}

startProdServer().catch((err) => {
  console.error('[Prod] Fatal error starting server:', err);
  process.exit(1);
});
