const request = require('supertest');
const { app } = require('../src/app');
const { getTestPool } = require('./setup');
const xlsx = require('xlsx');
const JSZip = require('jszip');

function createValidBoqBuffer() {
  const wb = xlsx.utils.book_new();
  const data = [
    ['No.', 'Kategori', 'No. KHS', 'Material', 'Qty', 'Satuan', 'Harga Satuan', 'Harga Total'],
    [1, 'MATERIAL', 'KHS_001_M', 'Test Material', 100, 'meter', 8200, 820000],
  ];
  const ws = xlsx.utils.aoa_to_sheet(data);
  xlsx.utils.book_append_sheet(wb, ws, 'BOQ');
  return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

async function createValidKmzBuffer() {
  const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Test</name>
    <Placemark>
      <name>Jalur Eksisting</name>
      <LineString>
        <coordinates>106.8272,-6.1748,0 106.8280,-6.1750,0</coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>`;
  const zip = new JSZip();
  zip.file('doc.kml', kml);
  return zip.generateAsync({ type: 'nodebuffer' });
}

describe('Audit & Notification API', () => {
  let adminToken;
  let userToken;
  let projectId;
  let boqBuffer;
  let kmzBuffer;

  beforeAll(async () => {
    boqBuffer = createValidBoqBuffer();
    kmzBuffer = await createValidKmzBuffer();

    const testDb = getTestPool();
    await testDb.query('DELETE FROM audit_logs');
    await testDb.query('DELETE FROM notifications');
    await testDb.query('DELETE FROM projects');

    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'Admin123!' });
    adminToken = adminRes.body.token;

    await request(app)
      .post('/api/auth/register')
      .send({
        username: 'audituser',
        email: 'audituser@test.local',
        full_name: 'Audit Test User',
        password: 'Password1',
        role: 'USER',
      });

    const userRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'audituser', password: 'Password1' });
    userToken = userRes.body.token;
  });

  describe('GET /api/audit/audit-logs', () => {
    it('should return audit logs for admin', async () => {
      const res = await request(app)
        .get('/api/audit/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should reject without token', async () => {
      const res = await request(app).get('/api/audit/audit-logs');
      expect(res.status).toBe(401);
    });

    it('should reject USER role', async () => {
      const res = await request(app)
        .get('/api/audit/audit-logs')
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(403);
    });

    it('should filter by entity_type', async () => {
      const res = await request(app)
        .get('/api/audit/audit-logs?entity_type=PROJECT')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should filter by action', async () => {
      const res = await request(app)
        .get('/api/audit/audit-logs?action=CREATE')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Audit logging on project creation', () => {
    it('should log audit entry when admin creates a project', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('project_code', 'PROJ_AUDIT_TEST')
        .field('project_name', 'Audit Test Project')
        .attach('boq', boqBuffer, {
          filename: 'test-boq.xlsx',
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
        .attach('kmz', kmzBuffer, {
          filename: 'test-route.kmz',
          contentType: 'application/vnd.google-earth.kmz',
        });

      expect(res.status).toBe(201);

      projectId = res.body.project.id;

      const auditRes = await request(app)
        .get('/api/audit/audit-logs?entity_type=PROJECT&action=CREATE')
        .set('Authorization', `Bearer ${adminToken}`);

      const createLog = auditRes.body.data.find(
        (log) => log.action === 'CREATE',
      );
      expect(createLog).toBeDefined();
      expect(createLog.entity_type).toBe('PROJECT');
    });
  });

  describe('Audit logging on project review', () => {
    it('should log audit entry when admin reviews a project', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ review_status: 'APPROVED', notes: 'Test review' });

      expect(res.status).toBe(200);

      const auditRes = await request(app)
        .get('/api/audit/audit-logs?action=REVIEW&entity_type=PROJECT')
        .set('Authorization', `Bearer ${adminToken}`);

      const reviewLog = auditRes.body.data.find(
        (log) => log.action === 'REVIEW' && log.entity_id === projectId,
      );
      expect(reviewLog).toBeDefined();
    });
  });

  describe('GET /api/audit/notifications', () => {
    it('should return notifications for user', async () => {
      const res = await request(app)
        .get('/api/audit/notifications')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should reject without token', async () => {
      const res = await request(app).get('/api/audit/notifications');
      expect(res.status).toBe(401);
    });

    it('should return unread count', async () => {
      const res = await request(app)
        .get('/api/audit/notifications/unread-count')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.count).toBe('number');
    });

    it('should mark notifications as read', async () => {
      const res = await request(app)
        .put('/api/audit/notifications/read')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('read');
    });
  });
});
