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

describe('File Security Tests', () => {
  let adminToken;

  beforeAll(async () => {
    const testDb = getTestPool();
    await testDb.query('DELETE FROM projects');
    await testDb.query('DELETE FROM project_files');

    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'Admin123!' });
    adminToken = adminRes.body.token;
  });

  describe('File Type Validation', () => {
    it('should reject non-xlsx BoQ file (txt extension)', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('project_name', 'File Security Test 1')
        .attach('boq', Buffer.from('test'), { filename: 'test.txt', contentType: 'text/plain' })
        .attach('kmz', Buffer.from('test'), {
          filename: 'test.kmz',
          contentType: 'application/vnd.google-earth.kmz',
        });

      expect(res.status).toBe(400);
    });

    it('should reject non-xlsx BoQ file (pdf extension)', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('project_name', 'File Security Test 2')
        .attach('boq', Buffer.from('test'), { filename: 'test.pdf', contentType: 'application/pdf' })
        .attach('kmz', Buffer.from('test'), {
          filename: 'test.kmz',
          contentType: 'application/vnd.google-earth.kmz',
        });

      expect(res.status).toBe(400);
    });

    it('should reject non-kmz KMZ file', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('project_name', 'File Security Test 3')
        .attach('boq', createValidBoqBuffer(), {
          filename: 'test-boq.xlsx',
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
        .attach('kmz', Buffer.from('test'), { filename: 'test.txt', contentType: 'text/plain' });

      expect(res.status).toBe(400);
    });
  });

  describe('File Access Control', () => {
    let projectId;
    let fileId;

    beforeAll(async () => {
      const kmzBuffer = await createValidKmzBuffer();

      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('project_name', 'File Access Test')
        .attach('boq', createValidBoqBuffer(), {
          filename: 'test-boq.xlsx',
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
        .attach('kmz', kmzBuffer, {
          filename: 'test-route.kmz',
          contentType: 'application/vnd.google-earth.kmz',
        });

      projectId = res.body.project.id;

      const filesRes = await request(app)
        .get(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      fileId = filesRes.body.files?.[0]?.id;
    });

    it('should reject file download without authentication', async () => {
      const res = await request(app).get(`/api/projects/${projectId}/files/${fileId}/download`);
      expect(res.status).toBe(401);
    });

    it('should reject invalid file ID', async () => {
      const res = await request(app)
        .get(`/api/projects/${projectId}/files/99999/download`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('should allow authenticated admin to download valid file', async () => {
      const res = await request(app)
        .get(`/api/projects/${projectId}/files/${fileId}/download`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });
  });
});
