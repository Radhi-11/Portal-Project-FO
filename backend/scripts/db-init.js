const fs = require('fs');
const path = require('path');
const db = require('../src/config/database');

async function init() {
  try {
    console.log('Running database schema...');

    const schemaPath = path.join(__dirname, '..', 'sql', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    await db.query(schema);
    console.log('Schema initialized successfully.');

    console.log('Admin user seeded: admin / Admin123!');
    console.log('Database initialization complete.');
  } catch (error) {
    console.error('Database initialization failed:', error.message);
    process.exit(1);
  }
}

init();
