const request = require('supertest');
const { app } = require('../src/app');

describe('User API', () => {
  let adminToken;
  let userToken;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'Admin123!' });
    adminToken = res.body.token;
  });

  describe('GET /api/users (List)', () => {
    it('should list users when authenticated as admin', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should reject without token', async () => {
      const res = await request(app).get('/api/users');
      expect(res.status).toBe(401);
    });
  });

  describe('Role-based access', () => {
    it('should reject USER role from /api/users', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'regularuser',
          email: 'user@example.com',
          full_name: 'Regular User',
          password: 'Password1',
          role: 'USER',
        });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ username: 'regularuser', password: 'Password1' });

      userToken = loginRes.body.token;

      const usersRes = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${userToken}`);

      expect(usersRes.status).toBe(403);
    });
  });

  describe('PUT /api/users/:id (Update)', () => {
    it('should update user full name and email', async () => {
      const res = await request(app)
        .put('/api/users/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          full_name: 'Updated Admin',
          email: 'updated.admin@test.local',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
