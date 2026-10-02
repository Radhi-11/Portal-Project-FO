# Deployment Guide (Nginx + Docker)

## Server Setup

### 1. Install Docker & Docker Compose
```bash
sudo apt-get update
sudo apt-get install docker.io docker-compose -y
sudo systemctl enable docker
sudo systemctl start docker
```

### 2. Clone Repository
```bash
git clone https://github.com/Radhi-11/Portal-Project-FO.git
cd Portal-Project-FO
```

### 3. Configure Environment
```bash
cp backend/.env.example backend/.env
nano backend/.env
```

Update these values:
- `JWT_SECRET` — change to a secure random string (min 32 chars)
- `CORS_ORIGIN` — set to your server's IP (e.g., `http://192.168.1.100`)

### 4. Deploy with Docker Compose
```bash
docker compose up -d --build
```

### 5. Check Status
```bash
docker compose ps
```

All services should be "Up":
- `portal-nginx` — port 80 (entry point)
- `portal-frontend` — port 5173 (internal)
- `portal-backend` — port 5000 (internal)
- `portal-pg` — port 5432 (internal)

### 6. Access
```
http://SERVER_IP
```

### 7. Default Admin Credentials
- Username: `admin`
- Password: `Admin123!`

## Architecture

```
Browser → nginx (port 80) → frontend:5173
                            backend:5000 → postgres:5432
```

Nginx proxies `/api/*` to backend and everything else to frontend.

## Database Initialization
The backend auto-initializes the DB schema on first run. No manual DB setup needed.

## Troubleshooting

### View logs
```bash
docker compose logs -f nginx
docker compose logs -f frontend
docker compose logs -f backend
docker compose logs -f postgres
```

### Restart services
```bash
docker compose down
docker compose up -d --build
```

### Reset database
```bash
docker compose down -v   # WARNING: deletes all data
docker compose up -d --build
```
