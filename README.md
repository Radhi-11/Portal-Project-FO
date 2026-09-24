# Portal Project FO

Web application for managing Fiber Optic (FO) project submissions — validation, review, approval, and monitoring.

## Quick Start (Development)

### Prerequisites
- Node.js 20+
- npm 10+
- Docker (optional, for production PostgreSQL+PostGIS)

### Starting the Backend (dev mode with in-memory DB)

The backend can run with an in-memory PostgreSQL-compatible database (via `pg-mem`) for development without a real PostgreSQL server:

```bash
cd backend
npm run dev:mem
# Server starts on http://localhost:5000
# Admin: admin / Admin123!
```

For production with real PostgreSQL:
```bash
cd backend
npm run dev
# Requires PostgreSQL running with the schema loaded
```

### Starting the Frontend

```bash
cd frontend
npm run dev
# Dev server on http://localhost:5173
# Proxies /api requests to http://localhost:5000
```

### Production with Docker

```bash
docker-compose up -d
cd backend
npm run db:init
cd ../frontend
npm run build
```

## Project Structure

```
│
├── docker-compose.yml        # PostgreSQL + PostGIS
├── PRD.md                    # Product Requirements Document
│
├── backend/
│   ├── src/
│   │   ├── app.js            # Express application
│   │   ├── server.js         # Dev server (starts pg-mem)
│   │   ├── config/           # Environment + database config
│   │   ├── controllers/      # Auth + user controllers
│   │   ├── middlewares/      # Auth + error handling
│   │   ├── routes/           # API routes
│   │   └── utils/            # JWT + password utilities
│   ├── sql/schema.sql        # Database schema
│   ├── scripts/              # DB init + password utilities
│   ├── tests/                # Jest test suite (pg-mem)
│   └── package.json
│
└── frontend/
    └── src/
        ├── api/              # Axios client
        ├── contexts/         # Auth context + provider
        ├── components/       # Layout, ProtectedRoute, Spinner
        └── pages/            # Login, Dashboard, Users, Profile, ChangePassword
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | — | Health check |
| POST | `/api/auth/login` | — | Login with username + password |
| POST | `/api/auth/register` | — | Register new user |
| POST | `/api/auth/change-password` | ✓ | Change current user's password |
| GET | `/api/auth/me` | ✓ | Get current user profile |
| GET | `/api/users` | Admin | List users (with pagination, search, filters) |
| GET | `/api/users/:id` | Admin | Get user by ID |
| PUT | `/api/users/:id` | Admin | Update user |
| DELETE | `/api/users/:id` | Admin | Delete user |
| PUT | `/api/users/:id/set-password` | Admin | Set user password |

## Testing

```bash
# Backend (uses pg-mem, no external DB required)
cd backend
npm test

# Backend lint
npm run lint

# Frontend build
cd ../frontend
npm run build

# Frontend lint
npm run lint
```
