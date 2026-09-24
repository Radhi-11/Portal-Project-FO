const request = require('supertest');
const bcrypt = require('bcrypt');
const { app } = require('../src/app');
const db = require('../src/config/database');

describe('Auth API', () => {
  beforeAll(async () => {
    const testDb = require('./setup').getTestPool();
    await testDb.query('DELETE FROM users');
    const adminHash = await bcrypt.hash('Admin123!', 4);
    await testDb.query(
      "INSERT INTO users (id, username, full_name, email, password_hash, role, must_change_password, is_active) VALUES (1, 'admin', 'Administrator', 'admin@test.local', $1, 'ADMIN', false, true)",
      [adminHash],
    );
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'Admin123!' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.username).toBe('admin');
      expect(res.body.user.role).toBe('ADMIN');
    });

    it('should reject wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Invalid credentials');
    });

    it('should reject non-existent user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'nonexistent', password: 'password123' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });

    it('should reject missing username', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ password: 'password' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject missing password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          full_name: 'Test User',
          password: 'Password1',
          role: 'USER',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.user.username).toBe('testuser');
      expect(res.body.user.role).toBe('USER');
    });

    it('should reject weak password (no uppercase)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'weakuser',
          email: 'weak@example.com',
          full_name: 'Weak User',
          password: 'password1',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('uppercase');
    });

    it('should reject weak password (too short)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'shortuser',
          email: 'short@example.com',
          full_name: 'Short User',
          password: 'Short1',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('at least 8 characters');
    });

    it('should reject duplicate username', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'admin',
          email: 'another@example.com',
          full_name: 'Another User',
          password: 'Password1',
          role: 'USER',
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('already exists');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user with valid token', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'Admin123!' });

      const token = loginRes.body.token;

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.username).toBe('admin');
    });

    it('should reject without token', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalidtoken123');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/change-password', () => {
    let token;

    beforeAll(async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'Admin123!' });
      token = loginRes.body.token;
    });

    it('should change password with correct current password', async () => {
      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          current_password: 'Admin123!',
          new_password: 'NewPassword1',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Password changed');
    });

    it('should reject wrong current password', async () => {
      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          current_password: 'wrongpassword',
          new_password: 'AnotherPass1',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('incorrect');
    });

    it('should reject weak new password', async () => {
      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          current_password: 'NewPassword1',
          new_password: 'weak',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('at least 8 characters');
    });
  });
});
