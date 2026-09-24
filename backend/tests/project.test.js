const request = require('supertest');
const path = require('path');
const fs = require('fs');
const JSZip = require('jszip');
const xlsx = require('xlsx');
const { app } = require('../src/app');

async function createTestKmz() {
  const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Test Project</name>
    <Placemark>
      <name>Customer Location</name>
      <Point>
        <coordinates>106.8272,-6.1748,0</coordinates>
      </Point>
    </Placemark>
    <Placemark>
      <name>Jalur Kabel KU Eksisting</name>
      <LineString>
        <coordinates>106.8272,-6.1748,0 106.8280,-6.1750,0 106.8290,-6.1755,0</coordinates>
      </LineString>
    </Placemark>
    <Placemark>
      <name>Area Coverage</name>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>106.8272,-6.1748,0 106.8280,-6.1748,0 106.8280,-6.1755,0 106.8272,-6.1755,0 106.8272,-6.1748,0</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
  </Document>
</kml>`;

  const zip = new JSZip();
  zip.file('doc.kml', kml);
  const content = await zip.generateAsync({ type: 'nodebuffer' });
  return content;
}

function createTestKhsWorkbook() {
  const wb = xlsx.utils.book_new();
  const data = [
    ['ItemCategory', 'ProductNo', 'ProductDesc', 'ItemPrice'],
    ['MATERIAL', 'KHS_SMUO_001_M', 'Pengadaan kabel ADSS FO 12 core', 8200],
    ['SERVICE', 'KHS_SMUO_001_S', 'Pemasangan kabel ADSS FO 12 core', 4600],
    ['MATERIAL', 'KHS_SMUO_002_M', 'Pengadaan kabel ADSS FO 24 core', 9800],
    ['SERVICE', 'KHS_SMUO_015_S', 'Fusion splice 1 core', 60400],
  ];
  const ws = xlsx.utils.aoa_to_sheet(data);
  xlsx.utils.book_append_sheet(wb, ws, 'KHS');
  return wb;
}

async function createTestKhsBuffer() {
  const wb = createTestKhsWorkbook();
  return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

describe('Project API', () => {
  let adminToken;
  let userToken;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'Admin123!' });
    adminToken = res.body.token;

    await request(app)
      .post('/api/auth/register')
      .send({
        username: 'testuser2',
        email: 'user2@test.com',
        full_name: 'Test User 2',
        password: 'Password1',
        role: 'USER',
      });

    const userRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser2', password: 'Password1' });
    userToken = userRes.body.token;
  });

  describe('GET /api/projects/types', () => {
    it('should return project types', async () => {
      const res = await request(app)
        .get('/api/projects/types')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should reject without token', async () => {
      const res = await request(app).get('/api/projects/types');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/projects (List)', () => {
    it('should return user projects for USER', async () => {
      const res = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return all projects for ADMIN', async () => {
      const res = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should reject without token', async () => {
      const res = await request(app).get('/api/projects');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/projects (Create)', () => {
    const boqContent = Buffer.from('test');
    const kmzContent = Buffer.from('test');

    it('should create a project with BoQ and KMZ files', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('project_name', 'Test Project')
        .field('project_type', 'PASANG_BARU')
        .field('province', 'Jakarta')
        .field('city', 'Jakarta Pusat')
        .field('address', 'Jl. Test No. 1')
        .field('boq_proposed_length', '180')
        .attach('boq', Buffer.from(boqContent), { filename: 'test-boq.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        .attach('kmz', Buffer.from(kmzContent), { filename: 'test-route.kmz', contentType: 'application/vnd.google-earth.kmz' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.project).toBeDefined();
    });

    it('should reject invalid BoQ file type', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('project_name', 'Bad File Type')
        .attach('boq', Buffer.from('test'), { filename: 'test.txt', contentType: 'text/plain' })
        .attach('kmz', Buffer.from(kmzContent), { filename: 'test-route.kmz', contentType: 'application/vnd.google-earth.kmz' });

      expect(res.status).toBe(400);
    });

    it('should reject missing BoQ file', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('project_name', 'Missing BoQ')
        .attach('kmz', Buffer.from(kmzContent), { filename: 'test-route.kmz', contentType: 'application/vnd.google-earth.kmz' });

      expect(res.status).toBe(400);
    });

    it('should reject missing KMZ file', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('project_name', 'Missing KMZ')
        .attach('boq', Buffer.from(boqContent), { filename: 'test-boq.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      expect(res.status).toBe(400);
    });

    it('should reject without token', async () => {
      const res = await request(app)
        .post('/api/projects')
        .field('project_name', 'No Auth')
        .attach('boq', Buffer.from(boqContent), { filename: 'test-boq.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        .attach('kmz', Buffer.from(kmzContent), { filename: 'test-route.kmz', contentType: 'application/vnd.google-earth.kmz' });

      expect(res.status).toBe(401);
    });

    it('should reject missing project name', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('boq', Buffer.from(boqContent), { filename: 'test-boq.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        .attach('kmz', Buffer.from(kmzContent), { filename: 'test-route.kmz', contentType: 'application/vnd.google-earth.kmz' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/projects/:id/review (Admin Review)', () => {
    let projectId;

    beforeAll(async () => {
      const kmzBuffer = await createTestKmz();
      const boqContent = Buffer.from('dummy boq content');

      const createRes = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('project_name', 'Review Test Project')
        .attach('boq', boqContent, { filename: 'test-boq.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        .attach('kmz', kmzBuffer, { filename: 'test-route.kmz', contentType: 'application/vnd.google-earth.kmz' });

      projectId = createRes.body.project.id;
    });

    it('should approve a project as admin', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ review_status: 'APPROVED', notes: 'Approved after validation' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.project.review_status).toBe('APPROVED');
    });

    it('should reject approval if already approved', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ review_status: 'APPROVED' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('already approved');
    });

    it('should reject non-admin from reviewing', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/review`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ review_status: 'REJECTED' });

      expect(res.status).toBe(403);
    });

    it('should validate review_status field', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ review_status: 'INVALID_STATUS' });

      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent project', async () => {
      const res = await request(app)
        .post('/api/projects/99999/review')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ review_status: 'APPROVED' });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/projects/:id', () => {
    it('should get project by id', async () => {
      const listRes = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`);

      const projectId = listRes.body.data[0].id;

      const res = await request(app)
        .get(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.project.id).toBeDefined();
      expect(Array.isArray(res.body.files)).toBe(true);
    });

    it('should return 404 for non-existent project', async () => {
      const res = await request(app)
        .get('/api/projects/99999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('should deny USER access to other users projects', async () => {
      const listRes = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`);

      const projectId = listRes.body.data[0].id;

      const res = await request(app)
        .get(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/projects/:id/kmz (KMZ Geometry)', () => {
    let kmzProjectId;

    beforeAll(async () => {
      kmzBuffer = await createTestKmz();
      const boqContent = Buffer.from('dummy boq content');

      const createRes = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('project_name', 'KMZ Map Test')
        .attach('boq', boqContent, { filename: 'test-boq.xlsx' })
        .attach('kmz', kmzBuffer, { filename: 'test-route.kmz' });

      kmzProjectId = createRes.body.project.id;
    });

    it('should return KMZ geometry for project', async () => {
      const res = await request(app)
        .get(`/api/projects/${kmzProjectId}/kmz`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.objects)).toBe(true);
    });

    it('should reject without token', async () => {
      const res = await request(app)
        .get('/api/projects/1/kmz');

      expect(res.status).toBe(401);
    });

    it('should return 404 for non-existent project', async () => {
      const res = await request(app)
        .get('/api/projects/99999/kmz')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/projects/geomap/projects (Geomap Dashboard)', () => {
    let kmzProjectId;

    beforeAll(async () => {
      const kmzBuffer = await createTestKmz();
      const boqContent = Buffer.from('dummy boq content');

      const createRes = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('project_name', 'Geomap Test Project')
        .attach('boq', boqContent, { filename: 'test-boq.xlsx' })
        .attach('kmz', kmzBuffer, { filename: 'test-route.kmz' });

      kmzProjectId = createRes.body.project.id;
    });

    it('should reject without token', async () => {
      const res = await request(app).get('/api/projects/geomap/projects');
      expect(res.status).toBe(401);
    });

    it('should return empty array when no approved projects', async () => {
      const res = await request(app)
        .get('/api/projects/geomap/projects')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return approved projects with coordinates', async () => {
      await request(app)
        .post(`/api/projects/${kmzProjectId}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ review_status: 'APPROVED' });

      const res = await request(app)
        .get('/api/projects/geomap/projects')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      const project = res.body.data[0];
      expect(project).toHaveProperty('id');
      expect(project).toHaveProperty('project_name');
      expect(project).toHaveProperty('total_project_value');
      expect(project).toHaveProperty('latitude');
      expect(project).toHaveProperty('longitude');
      expect(project).toHaveProperty('review_status', 'APPROVED');
    });
  });

  describe('POST /api/projects/parse (Parse Files)', () => {
    let kmzBuffer;

    beforeAll(async () => {
      kmzBuffer = await createTestKmz();
    });

    it('should parse BoQ and KMZ files and return extracted data', async () => {
      const boqContent = Buffer.from('dummy boq content');

      const res = await request(app)
        .post('/api/projects/parse')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('boq', boqContent, {
          filename: 'BOQ CATUR MITRA.xlsx',
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
        .attach('kmz', kmzBuffer, {
          filename: 'project-route.kmz',
          contentType: 'application/vnd.google-earth.kmz',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.project_name).toBeDefined();
      expect(res.body.data).toHaveProperty('coordinates');
    });

    it('should reject without token', async () => {
      const res = await request(app)
        .post('/api/projects/parse')
        .attach('boq', Buffer.from('test'), { filename: 'test.xlsx' })
        .attach('kmz', kmzBuffer, { filename: 'test.kmz' });

      expect(res.status).toBe(401);
    });

    it('should reject missing BoQ file', async () => {
      const res = await request(app)
        .post('/api/projects/parse')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('kmz', kmzBuffer, { filename: 'test.kmz' });

      expect(res.status).toBe(400);
    });

    it('should reject missing KMZ file', async () => {
      const res = await request(app)
        .post('/api/projects/parse')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('boq', Buffer.from('test'), { filename: 'test.xlsx' });

      expect(res.status).toBe(400);
    });

    it('should reject invalid BoQ file type', async () => {
      const res = await request(app)
        .post('/api/projects/parse')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('boq', Buffer.from('test'), { filename: 'test.txt' })
        .attach('kmz', kmzBuffer, { filename: 'test.kmz' });

      expect(res.status).toBe(400);
    });

    it('should parse KMZ with Polygon geometry', async () => {
      const res = await request(app)
        .post('/api/projects/parse')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('boq', Buffer.from('dummy boq content'), {
          filename: 'BOQ CATUR MITRA.xlsx',
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
        .attach('kmz', kmzBuffer, {
          filename: 'project-route.kmz',
          contentType: 'application/vnd.google-earth.kmz',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.kmz_objects.some((o) => o.type === 'POLYGON')).toBe(true);
      expect(res.body.data.kmz_objects.some((o) => o.type === 'POINT')).toBe(true);
      expect(res.body.data.kmz_objects.some((o) => o.type === 'LINESTRING')).toBe(true);
    });
  });

  describe('POST /api/projects/parse-khs (Parse KHS)', () => {
    it('should parse KHS file and extract items', async () => {
      const khsBuffer = await createTestKhsBuffer();

      const res = await request(app)
        .post('/api/projects/parse-khs')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('khs', khsBuffer, {
          filename: 'AcuanKHSSMUO.xlsx',
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalItems).toBe(4);
      expect(res.body.data.materialCount).toBe(2);
      expect(res.body.data.serviceCount).toBe(2);
      expect(res.body.data.valid).toBe(true);
      expect(res.body.data.khsItems[0].product_no).toBe('KHS_SMUO_001_M');
    });

    it('should reject without token', async () => {
      const khsBuffer = await createTestKhsBuffer();

      const res = await request(app)
        .post('/api/projects/parse-khs')
        .attach('khs', khsBuffer, { filename: 'test.xlsx' });

      expect(res.status).toBe(401);
    });

    it('should reject missing KHS file', async () => {
      const res = await request(app)
        .post('/api/projects/parse-khs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
    });

    it('should detect duplicate ProductNo', async () => {
      const wb = xlsx.utils.book_new();
      const data = [
        ['ItemCategory', 'ProductNo', 'ProductDesc', 'ItemPrice'],
        ['MATERIAL', 'KHS_SMUO_001_M', 'Cable A', 8200],
        ['MATERIAL', 'KHS_SMUO_001_M', 'Cable A dup', 8200],
      ];
      const ws = xlsx.utils.aoa_to_sheet(data);
      xlsx.utils.book_append_sheet(wb, ws, 'KHS');
      const khsBuffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

      const res = await request(app)
        .post('/api/projects/parse-khs')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('khs', khsBuffer, {
          filename: 'duplicate.xlsx',
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.valid).toBe(false);
      expect(res.body.data.validationErrors.duplicates.length).toBe(1);
    });

    it('should detect missing KHS sheet', async () => {
      const wb = xlsx.utils.book_new();
      const data = [
        ['ItemCategory', 'ProductNo', 'ProductDesc', 'ItemPrice'],
        ['MATERIAL', 'KHS_001', 'Item', 1000],
      ];
      const ws = xlsx.utils.aoa_to_sheet(data);
      xlsx.utils.book_append_sheet(wb, ws, 'OtherSheet');
      const khsBuffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

      const res = await request(app)
        .post('/api/projects/parse-khs')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('khs', khsBuffer, {
          filename: 'no-khs-sheet.xlsx',
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.hasSheetKHS).toBe(false);
    });
  });

  describe('POST /api/projects/validate (Validate BoQ vs KHS)', () => {
    let kmzBuffer;

    beforeAll(async () => {
      kmzBuffer = await createTestKmz();
    });

    it('should validate BoQ against KHS and return price comparisons', async () => {
      const khsBuffer = await createTestKhsBuffer();

      const boqWb = xlsx.utils.book_new();
      const boqData = [
        ['No.', 'Kategori', 'No. KHS', 'Material', 'Qty', 'Satuan', 'Harga Satuan', 'Harga Total'],
        [1, 'MATERIAL', 'KHS_SMUO_001_M', 'Pengadaan kabel ADSS FO 12 core', 1000, 'meter', 8500, 8500000],
        [2, 'SERVICE', 'KHS_SMUO_001_S', 'Pemasangan kabel', 1000, 'meter', 4800, 4800000],
      ];
      const boqWs = xlsx.utils.aoa_to_sheet(boqData);
      xlsx.utils.book_append_sheet(boqWb, boqWs, 'BOQ');
      const boqBuffer = xlsx.write(boqWb, { type: 'buffer', bookType: 'xlsx' });

      const res = await request(app)
        .post('/api/projects/validate')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('boq', boqBuffer, {
          filename: 'BOQ CATUR MITRA.xlsx',
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
        .attach('khs', khsBuffer, {
          filename: 'AcuanKHSSMUO.xlsx',
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
        .attach('kmz', kmzBuffer, {
          filename: 'project-route.kmz',
          contentType: 'application/vnd.google-earth.kmz',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.priceComparisons).toBeDefined();
      expect(res.body.data.stats).toBeDefined();
      expect(res.body.data.stats.totalCompared).toBeGreaterThan(0);
      expect(res.body.data.lengthValidation).toBeDefined();
    });

    it('should reject without token', async () => {
      const res = await request(app)
        .post('/api/projects/validate')
        .attach('boq', Buffer.from('test'), { filename: 'test.xlsx' })
        .attach('khs', Buffer.from('test'), { filename: 'test.xlsx' });

      expect(res.status).toBe(401);
    });

    it('should reject missing KHS file', async () => {
      const res = await request(app)
        .post('/api/projects/validate')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('boq', Buffer.from('test'), { filename: 'test.xlsx' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/reports/summary (Project Reports)', () => {
    it('should reject without token', async () => {
      const res = await request(app).get('/api/reports/summary');
      expect(res.status).toBe(401);
    });

    it('should return report summary with filters', async () => {
      const res = await request(app)
        .get('/api/reports/summary')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('summary');
      expect(res.body.data).toHaveProperty('status_distribution');
      expect(res.body.data).toHaveProperty('province_distribution');
      expect(res.body.data).toHaveProperty('city_distribution');
      expect(res.body.data).toHaveProperty('monthly_trend');
      expect(res.body.data).toHaveProperty('projects');
      expect(res.body.data).toHaveProperty('filters');
    });

    it('should return project count and total value', async () => {
      const res = await request(app)
        .get('/api/reports/summary')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.body.data.summary).toHaveProperty('total_projects');
      expect(res.body.data.summary).toHaveProperty('total_value');
      expect(typeof res.body.data.summary.total_projects).toBe('number');
    });

    it('should filter by review_status', async () => {
      const res = await request(app)
        .get('/api/reports/summary?review_status=APPROVED')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.projects)).toBe(true);
    });
  });

  describe('KHS Master API', () => {
    describe('GET /api/khs', () => {
      it('should return khs items for admin', async () => {
        const res = await request(app)
          .get('/api/khs')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body).toHaveProperty('pagination');
      });

      it('should reject without token', async () => {
        const res = await request(app).get('/api/khs');
        expect(res.status).toBe(401);
      });

      it('should reject USER role', async () => {
        const res = await request(app)
          .get('/api/khs')
          .set('Authorization', `Bearer ${userToken}`);
        expect(res.status).toBe(403);
      });
    });

    describe('GET /api/khs/stats', () => {
      it('should return khs stats', async () => {
        const res = await request(app)
          .get('/api/khs/stats')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('total_items');
        expect(res.body.data).toHaveProperty('material_count');
        expect(res.body.data).toHaveProperty('service_count');
        expect(res.body.data).toHaveProperty('total_value');
      });
    });

    describe('POST /api/khs', () => {
      it('should create a khs item', async () => {
        const res = await request(app)
          .post('/api/khs')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            item_category: 'MATERIAL',
            product_no: 'MAT-TEST-001',
            product_desc: 'Test Material Item',
            item_price: 150000,
          });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.product_no).toBe('MAT-TEST-001');
      });

      it('should reject duplicate product_no', async () => {
        await request(app)
          .post('/api/khs')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            item_category: 'MATERIAL',
            product_no: 'MAT-DUP-001',
            product_desc: 'Duplicate Test',
            item_price: 100000,
          });

        const res = await request(app)
          .post('/api/khs')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            item_category: 'MATERIAL',
            product_no: 'MAT-DUP-001',
            product_desc: 'Duplicate Test 2',
            item_price: 100000,
          });

        expect(res.status).toBe(409);
        expect(res.body.success).toBe(false);
      });

      it('should validate required fields', async () => {
        const res = await request(app)
          .post('/api/khs')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            item_category: '',
            product_no: '',
            product_desc: '',
            item_price: -10,
          });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
      });
    });

    describe('GET /api/khs/:id', () => {
      it('should return khs item by id', async () => {
        await request(app)
          .post('/api/khs')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            item_category: 'SERVICE',
            product_no: 'SVC-TEST-001',
            product_desc: 'Test Service Item',
            item_price: 200000,
          });

        const listRes = await request(app)
          .get('/api/khs')
          .set('Authorization', `Bearer ${adminToken}`);

        const createdItem = listRes.body.data.find(
          (i) => i.product_no === 'SVC-TEST-001',
        );

        const res = await request(app)
          .get(`/api/khs/${createdItem.id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.product_no).toBe('SVC-TEST-001');
      });
    });

    describe('PUT /api/khs/:id', () => {
      it('should update khs item', async () => {
        await request(app)
          .post('/api/khs')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            item_category: 'MATERIAL',
            product_no: 'MAT-UPDATE-001',
            product_desc: 'Update Test',
            item_price: 100000,
          });

        const listRes = await request(app)
          .get('/api/khs')
          .set('Authorization', `Bearer ${adminToken}`);

        const item = listRes.body.data.find(
          (i) => i.product_no === 'MAT-UPDATE-001',
        );

        const res = await request(app)
          .put(`/api/khs/${item.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            product_desc: 'Updated Description',
            item_price: 200000,
          });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.product_desc).toBe('Updated Description');
        expect(parseFloat(res.body.data.item_price)).toBe(200000);
      });
    });

    describe('DELETE /api/khs/:id', () => {
      it('should deactivate khs item', async () => {
        await request(app)
          .post('/api/khs')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            item_category: 'MATERIAL',
            product_no: 'MAT-DEL-001',
            product_desc: 'Delete Test',
            item_price: 50000,
          });

        const listRes = await request(app)
          .get('/api/khs?is_active=false')
          .set('Authorization', `Bearer ${adminToken}`)
          .query({ is_active: false });

        let item = null;
        const activeRes = await request(app)
          .get('/api/khs')
          .set('Authorization', `Bearer ${adminToken}`);
        item = activeRes.body.data.find((i) => i.product_no === 'MAT-DEL-001');

        const res = await request(app)
          .delete(`/api/khs/${item.id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
      });
    });
  });
});
