const { initMemDb } = require('./config/memdb');
const db = require('./config/database');

async function startDevServer() {
  try {
    console.log('[Dev] Starting in-memory database for development...');
    const memPool = await initMemDb();
    db.setMemMode(memPool);
    console.log('[Dev] In-memory database ready.');
  } catch (error) {
    console.error('[Dev] Failed to start in-memory database:', error.message);
    console.log('[Dev] Falling back to PostgreSQL connection.');
  }

  const config = require('./config');
  const { app } = require('./app');

  const server = app.listen(config.port, '0.0.0.0', () => {
    console.log(`
┌──────────────────────────────────────┐
│  Portal Project FO - DEV SERVER       │
├──────────────────────────────────────┤
│  Backend:  http://localhost:${config.port}  │
│  Frontend: http://localhost:5173     │
│  Mode:     In-Memory (pg-mem)         │
│                                          │
│  Admin:    admin / Admin123!            │
└──────────────────────────────────────┘
    `);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      const nextPort = config.port + 1;
      console.log(`[Dev] Port ${config.port} in use, trying ${nextPort}...`);
      const fallback = app.listen(nextPort, '0.0.0.0', () => {
        console.log(`[Dev] Backend running on http://localhost:${nextPort}`);
      });
      fallback.on('error', (e) => {
        console.error('[Dev] Could not start server:', e.message);
        process.exit(1);
      });
    } else {
      console.error('[Dev] Server error:', err.message);
    }
  });
}

startDevServer();
