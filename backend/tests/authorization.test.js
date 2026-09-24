const request = require('supertest');
const { app } = require('../src/app');
const { getTestPool } = require('./setup');

describe('Authorization Tests', () => {
  let adminToken;
  let userToken;

  beforeAll(async () => {
    const testDb = getTestPool();
    await testDb.query('DELETE FROM projects');

    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'Admin123!' });
    adminToken = adminRes.body.token;

    await request(app)
      .post('/api/auth/register')
      .send({
        username: 'authuser',
        email: 'authuser@test.local',
        full_name: 'Auth Test User',
        password: 'Password1',
        role: 'USER',
      });

    const userRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'authuser', password: 'Password1' });
    userToken = userRes.body.token;
  });

  describe('Admin-only endpoints', () => {
    it('should allow ADMIN access to /api/users', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('should deny USER access to /api/users', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
    });

    it('should allow ADMIN access to /api/khs', async () => {
      const res = await request(app)
        .get('/api/khs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('should deny USER access to /api/khs', async () => {
      const res = await request(app)
        .get('/api/khs')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
    });

    it('should allow ADMIN access to /api/audit/audit-logs', async () => {
      const res = await request(app)
        .get('/api/audit/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('should deny USER access to /api/audit/audit-logs', async () => {
      const res = await request(app)
        .get('/api/audit/audit-logs')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('User-specific project access', () => {
    let userProjectId;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${userToken}`)
        .field('project_name', 'User Auth Test Project')
        .attach('boq', Buffer.from('test'), {
          filename: 'test-boq.xlsx',
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
        .attach('kmz', Buffer.from('test'), {
          filename: 'test-route.kmz',
          contentType: 'application/vnd.google-earth.kmz',
        });

      userProjectId = res.body.project.id;
    });

    it('should allow user to view their own project', async () => {
      const res = await request(app)
        .get(`/api/projects/${userProjectId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should deny user from reviewing their own project', async () => {
      const res = await request(app)
        .post(`/api/projects/${userProjectId}/review`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ review_status: 'APPROVED' });

      expect(res.status).toBe(403);
    });

    it('should allow admin to view any user project', async () => {
      const res = await request(app)
        .get(`/api/projects/${userProjectId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should filter projects for USER (only their own)', async () => {
      const res = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const projects = res.body.data;
      projects.forEach((p) => {
        expect(p.creator).toBe('authuser');
      });
    });

    it('should show all projects for ADMIN', async () => {
      const res = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Token validation', () => {
    it('should reject expired/invalid token', async () => {
      const res = await request(app)
        .get('/api/projects')
        .set('Authorization', 'Bearer invalidtoken123');

      expect(res.status).toBe(401);
    });

    it('should reject malformed Authorization header', async () => {
      const res = await request(app)
        .get('/api/projects')
        .set('Authorization', 'InvalidToken');

      expect(res.status).toBe(401);
    });

    it('should reject missing Authorization header', async () => {
      const res = await request(app).get('/api/projects');
      expect(res.status).toBe(401);
    });
  });
});
