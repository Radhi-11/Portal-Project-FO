const xlsx = require('xlsx');
const JSZip = require('jszip');
const {
  extractProjectNameFromFilename,
  extractProjectInfoFromBoq,
  extractBoqLength,
} = require('../src/services/boqParser');
const {
  parseKmz,
  extractFirstCoordinate,
  classifyRoute,
  calculateLineStringLength,
  haversineDistance,
} = require('../src/services/kmzParser');
const { extractKhsItems } = require('../src/services/khsParser');
const { compareBoqWithKhs, validateBoqVsKmzLengths } = require('../src/services/validationEngine');
const fs = require('fs');
const path = require('path');
const os = require('os');

let tmpDir;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'parser-tests-'));
});

afterAll(() => {
  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

function createBoqWorkbookWithMultipleItems() {
  const wb = xlsx.utils.book_new();
  const data = [
    ['No.', 'Kategori', 'No. KHS', 'Material', 'Qty', 'Satuan', 'Harga Satuan', 'Harga Total'],
    [1, 'MATERIAL', 'KHS_001_M', 'Pengadaan kabel ADSS FO 12 core', 1000, 'meter', 8200, 8200000],
    [2, 'SERVICE', 'KHS_001_S', 'Pemasangan kabel ADSS FO 12 core', 1000, 'meter', 4600, 4600000],
    [3, 'MATERIAL', 'KHS_002_M', 'Pengadaan kabel ADSS FO 24 core', 500, 'meter', 9800, 4900000],
    [4, 'SERVICE', 'KHS_015_S', 'Fusion splice 1 core', 1000, 'meter', 60400, 60400000],
  ];
  const ws = xlsx.utils.aoa_to_sheet(data);
  xlsx.utils.book_append_sheet(wb, ws, 'BOQ');
  return wb;
}

function createBoqWorkbookWithLength() {
  const wb = xlsx.utils.book_new();
  const data = [
    ['Project Info', 'Value'],
    ['NAMA PROJECT', 'Test Project 500M'],
    ['ALAMAT', 'Jl. Test No. 1'],
    ['PANJANG JALUR', 500, 'M'],
  ];
  const ws = xlsx.utils.aoa_to_sheet(data);
  xlsx.utils.book_append_sheet(wb, ws, 'BOQ');
  return wb;
}

function createKhsWorkbookWithMultipleItems() {
  const wb = xlsx.utils.book_new();
  const data = [
    ['ItemCategory', 'ProductNo', 'ProductDesc', 'ItemPrice'],
    ['MATERIAL', 'KHS_001_M', 'Pengadaan kabel ADSS FO 12 core', 8200],
    ['SERVICE', 'KHS_001_S', 'Pemasangan kabel ADSS FO 12 core', 4600],
    ['MATERIAL', 'KHS_002_M', 'Pengadaan kabel ADSS FO 24 core', 9800],
    ['SERVICE', 'KHS_015_S', 'Fusion splice 1 core', 60400],
  ];
  const ws = xlsx.utils.aoa_to_sheet(data);
  xlsx.utils.book_append_sheet(wb, ws, 'KHS');
  return wb;
}

function createKhsWorkbookWithInvalidCategory() {
  const wb = xlsx.utils.book_new();
  const data = [
    ['ItemCategory', 'ProductNo', 'ProductDesc', 'ItemPrice'],
    ['MATERIAL', 'KHS_001_M', 'Valid Material', 8200],
    ['INVALID_CATEGORY', 'KHS_002_INVALID', 'Invalid Category Item', 5000],
    ['SERVICE', 'KHS_001_S', 'Valid Service', 4600],
  ];
  const ws = xlsx.utils.aoa_to_sheet(data);
  xlsx.utils.book_append_sheet(wb, ws, 'KHS');
  return wb;
}

async function createTestKmzWithMultipleLineStrings() {
  const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Test Project</name>
    <Placemark>
      <name>Jalur Eksisting</name>
      <LineString>
        <coordinates>106.8272,-6.1748,0 106.8280,-6.1750,0 106.8290,-6.1755,0</coordinates>
      </LineString>
    </Placemark>
    <Placemark>
      <name>Jalur Proposed</name>
      <LineString>
        <coordinates>106.8300,-6.1760,0 106.8310,-6.1765,0 106.8320,-6.1770,0</coordinates>
      </LineString>
    </Placemark>
    <Placemark>
      <name>Customer Location</name>
      <Point>
        <coordinates>106.8272,-6.1748,0</coordinates>
      </Point>
    </Placemark>
  </Document>
</kml>`;

  const zip = new JSZip();
  zip.file('doc.kml', kml);
  return zip.generateAsync({ type: 'nodebuffer' });
}

function writeWorkbookToTempFile(wb, filename) {
  const filePath = path.join(tmpDir, filename);
  const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

async function writeKmzToTempFile(kmzBuffer, filename) {
  const filePath = path.join(tmpDir, filename);
  fs.writeFileSync(filePath, kmzBuffer);
  return filePath;
}

describe('BoQ Parser Tests', () => {
  describe('extractProjectNameFromFilename', () => {
    it('should extract project name from filename without extension', () => {
      const result = extractProjectNameFromFilename('BOQ CATUR MITRA.xlsx');
      expect(result).toBe('BOQ CATUR MITRA');
    });

    it('should handle filenames with no spaces', () => {
      const result = extractProjectNameFromFilename('project.xlsx');
      expect(result).toBe('project');
    });
  });

  describe('extractProjectInfoFromBoq', () => {
    it('should parse multiple BoQ items with correct fields', () => {
      const wb = createBoqWorkbookWithMultipleItems();
      const filePath = writeWorkbookToTempFile(wb, 'boq-multi.xlsx');

      const result = extractProjectInfoFromBoq(filePath, 'boq-multi.xlsx');

      expect(result.boqItems.length).toBe(4);
      expect(result.boqItems[0].product_no).toBe('KHS_001_M');
      expect(result.boqItems[0].quantity).toBe(1000);
      expect(result.boqItems[0].unit_price).toBe(8200);
      expect(result.boqItems[0].total_price).toBe(8200000);
      expect(result.boqItems[1].item_category === undefined);
      expect(result.boqItems[2].product_no).toBe('KHS_002_M');
      expect(result.boqItems[2].quantity).toBe(500);
      expect(result.boqItems[3].product_no).toBe('KHS_015_S');
    });

    it('should extract BoQ length from project name in filename', () => {
      const result = extractBoqLength({}, 'Project 500M.xlsx');
      expect(result).toBe(500);
    });

    it('should return boqProposedLength as null when no length found', () => {
      const wb = createBoqWorkbookWithMultipleItems();
      const filePath = writeWorkbookToTempFile(wb, 'boq-nolength.xlsx');

      const result = extractProjectInfoFromBoq(filePath, 'no-length.xlsx');
      expect(result.boqProposedLength).toBe(null);
    });

    it('should return error for empty workbook', () => {
      const wb = xlsx.utils.book_new();
      const ws = xlsx.utils.aoa_to_sheet([]);
      xlsx.utils.book_append_sheet(wb, ws, 'Empty');
      const filePath = writeWorkbookToTempFile(wb, 'empty.xlsx');

      const result = extractProjectInfoFromBoq(filePath, 'empty.xlsx');
      expect(result.boqItems.length).toBe(0);
      expect(result.totalValue).toBe(0);
    });

    it('should correctly calculate total value', () => {
      const wb = createBoqWorkbookWithMultipleItems();
      const filePath = writeWorkbookToTempFile(wb, 'boq-total.xlsx');

      const result = extractProjectInfoFromBoq(filePath, 'boq-total.xlsx');
      expect(result.totalValue).toBe(8200000 + 4600000 + 4900000 + 60400000);
    });
  });

  describe('extractBoqLength', () => {
    it('should extract length from filename pattern', () => {
      expect(extractBoqLength({}, 'Project 2500M.xlsx')).toBe(2500);
      expect(extractBoqLength({}, 'Project 150 M.xlsx')).toBe(150);
    });

    it('should not crash with null workbook', () => {
      expect(extractBoqLength(null, 'no-length.xlsx')).toBe(null);
    });

    it('should return null for no length match', () => {
      const wb = xlsx.utils.book_new();
      const ws = xlsx.utils.aoa_to_sheet([['A', 'B']]);
      xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
      expect(extractBoqLength(wb, 'no-length.xlsx')).toBe(null);
    });

    it('should extract length from cell values in worksheet', () => {
      const wb = xlsx.utils.book_new();
      const data = [
        ['Panjang Jalur Meter'],
        [500],
      ];
      const ws = xlsx.utils.aoa_to_sheet(data);
      xlsx.utils.book_append_sheet(wb, ws, 'BOQ');
      const filePath = writeWorkbookToTempFile(wb, 'boq-length.xlsx');
      const workbook = xlsx.readFile(filePath);
      expect(extractBoqLength(workbook, 'boq-length.xlsx')).toBe(500);
    });
  });
});

describe('KMZ Parser Tests', () => {
  describe('parseKmz', () => {
    let kmzPath;

    beforeAll(async () => {
      const kmzBuffer = await createTestKmzWithMultipleLineStrings();
      kmzPath = await writeKmzToTempFile(kmzBuffer, 'test-routes.kmz');
    });

    it('should parse multiple LineString objects', async () => {
      const result = await parseKmz(kmzPath);

      expect(result.success).toBe(true);
      expect(result.lineStrings.length).toBeGreaterThanOrEqual(2);
      expect(result.totalObjects).toBeGreaterThanOrEqual(3);
    });

    it('should classify routes as EXISTING', async () => {
      const result = await parseKmz(kmzPath);
      const existingRoute = result.objects.find((o) => o.name === 'Jalur Eksisting');
      expect(existingRoute).toBeDefined();
      expect(existingRoute.route_type).toBe('EXISTING');
      expect(existingRoute.type).toBe('LINESTRING');
    });

    it('should classify routes as PROPOSED', async () => {
      const result = await parseKmz(kmzPath);
      const proposedRoute = result.objects.find((o) => o.name === 'Jalur Proposed');
      expect(proposedRoute).toBeDefined();
      expect(proposedRoute.route_type).toBe('PROPOSED');
      expect(proposedRoute.type).toBe('LINESTRING');
    });

    it('should calculate length for LineString objects', async () => {
      const result = await parseKmz(kmzPath);
      result.lineStrings.forEach((ls) => {
        expect(ls.calculated_length).toBeGreaterThan(0);
      });
    });

    it('should parse Point objects', async () => {
      const result = await parseKmz(kmzPath);
      expect(result.points.length).toBeGreaterThan(0);
    });

    it('should throw error for invalid KMZ file', async () => {
      const badPath = path.join(tmpDir, 'bad.kmz');
      fs.writeFileSync(badPath, Buffer.from('not a real kmz'));

      await expect(parseKmz(badPath)).rejects.toThrow();
    });
  });

  describe('classifyRoute', () => {
    it('should classify "Eksisting" as EXISTING', () => {
      expect(classifyRoute('Jalur Eksisting')).toBe('EXISTING');
    });

    it('should classify "Existing" as EXISTING', () => {
      expect(classifyRoute('Existing Route')).toBe('EXISTING');
    });

    it('should classify "Proposed" as PROPOSED', () => {
      expect(classifyRoute('Proposed Route')).toBe('PROPOSED');
    });

    it('should classify "Usul" as PROPOSED', () => {
      expect(classifyRoute('Usulan Jalur')).toBe('PROPOSED');
    });

    it('should classify "Baru" as PROPOSED', () => {
      expect(classifyRoute('Jalur Baru')).toBe('PROPOSED');
    });

    it('should return UNKNOWN for unrecognized names', () => {
      expect(classifyRoute('Some Random Name')).toBe('UNKNOWN');
    });

    it('should return UNKNOWN for null/undefined', () => {
      expect(classifyRoute(null)).toBe('UNKNOWN');
    });
  });
});

describe('KHS Parser Tests', () => {
  describe('extractKhsItems', () => {
    it('should parse multiple KHS items', () => {
      const wb = createKhsWorkbookWithMultipleItems();
      const filePath = writeWorkbookToTempFile(wb, 'khs-multi.xlsx');

      const result = extractKhsItems(filePath);

      expect(result.khsItems.length).toBe(4);
      expect(result.materialCount).toBe(2);
      expect(result.serviceCount).toBe(2);
      expect(result.khsItems[0].product_no).toBe('KHS_001_M');
      expect(result.khsItems[0].item_category).toBe('MATERIAL');
      expect(result.khsItems[0].item_price).toBe(8200);
    });

    it('should detect invalid item category', () => {
      const wb = createKhsWorkbookWithInvalidCategory();
      const filePath = writeWorkbookToTempFile(wb, 'khs-invalid.xlsx');

      const result = extractKhsItems(filePath);

      expect(result.khsItems.length).toBe(3);
      const invalidItem = result.khsItems.find(
        (item) => item.item_category === 'INVALID_CATEGORY',
      );
      expect(invalidItem).toBeDefined();
      expect(invalidItem.product_no).toBe('KHS_002_INVALID');
    });

    it('should return error for missing KHS sheet', () => {
      const wb = xlsx.utils.book_new();
      const data = [
        ['ItemCategory', 'ProductNo', 'ProductDesc', 'ItemPrice'],
        ['MATERIAL', 'KHS_001', 'Test Item', 1000],
      ];
      const ws = xlsx.utils.aoa_to_sheet(data);
      xlsx.utils.book_append_sheet(wb, ws, 'OtherSheet');
      const filePath = writeWorkbookToTempFile(wb, 'no-khs-sheet.xlsx');

      const result = extractKhsItems(filePath);
      expect(result.hasSheetKHS).toBe(false);
      expect(result.khsItems.length).toBeGreaterThanOrEqual(0);
    });

    it('should return error for file not found', () => {
      const result = extractKhsItems('/nonexistent/file.xlsx');
      expect(result.error).toBeDefined();
      expect(result.khsItems.length).toBe(0);
    });
  });
});

describe('Validation Engine Tests', () => {
  describe('compareBoqWithKhs', () => {
    const boqItems = [
      { product_no: 'KHS_001_M', product_desc: 'Material A', quantity: 100, unit_price: 8200, total_price: 820000 },
      { product_no: 'KHS_001_S', product_desc: 'Service A', quantity: 100, unit_price: 4600, total_price: 460000 },
      { product_no: 'KHS_999_M', product_desc: 'Not in KHS', quantity: 50, unit_price: 1000, total_price: 50000 },
    ];

    const khsItems = [
      { product_no: 'KHS_001_M', item_category: 'MATERIAL', item_price: 8000 },
      { product_no: 'KHS_001_S', item_category: 'SERVICE', item_price: 4600 },
    ];

    it('should compare BoQ with KHS and return comparisons', () => {
      const result = compareBoqWithKhs(boqItems, khsItems);

      expect(result.comparisons.length).toBe(3);
    });

    it('should detect when BoQ price is higher than KHS', () => {
      const result = compareBoqWithKhs(boqItems, khsItems);
      const comparison = result.comparisons.find((c) => c.product_no === 'KHS_001_M');

      expect(comparison.status).toBe('BOQ_HIGHER');
      expect(comparison.price_difference).toBe(200);
      expect(comparison.price_difference_percentage).toBe(2.5);
    });

    it('should detect when BoQ price matches KHS price', () => {
      const result = compareBoqWithKhs(boqItems, khsItems);
      const comparison = result.comparisons.find((c) => c.product_no === 'KHS_001_S');

      expect(comparison.status).toBe('MATCH');
      expect(comparison.price_difference).toBe(0);
      expect(comparison.price_difference_percentage).toBe(0);
    });

    it('should detect items in BoQ but not in KHS', () => {
      const result = compareBoqWithKhs(boqItems, khsItems);
      const missing = result.comparisons.find((c) => c.product_no === 'KHS_999_M');

      expect(missing.status).toBe('NOT_FOUND_IN_KHS');
      expect(missing.boq_unit_price).toBe(1000);
      expect(missing.khs_item_price).toBe(null);
    });

    it('should calculate correct statistics', () => {
      const result = compareBoqWithKhs(boqItems, khsItems);

      expect(result.stats.totalCompared).toBe(3);
      expect(result.stats.matched).toBe(1);
      expect(result.stats.boqHigher).toBe(1);
      expect(result.stats.notFoundInKhs).toBe(1);
    });
  });

  describe('validateBoqVsKmzLengths', () => {
    it('should return valid when lengths are within 5% tolerance', () => {
      const result = validateBoqVsKmzLengths(500, 495);
      expect(result.valid).toBe(true);
      expect(result.withinTolerance).toBe(true);
      expect(result.difference).toBe(5);
    });

    it('should return invalid when difference exceeds 5% tolerance', () => {
      const result = validateBoqVsKmzLengths(500, 450);
      expect(result.valid).toBe(false);
      expect(result.withinTolerance).toBe(false);
      expect(result.difference).toBe(50);
    });

    it('should return error when BoQ length is null', () => {
      const result = validateBoqVsKmzLengths(null, 500);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return error when KMZ length is null', () => {
      const result = validateBoqVsKmzLengths(500, null);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle zero difference', () => {
      const result = validateBoqVsKmzLengths(500, 500);
      expect(result.valid).toBe(true);
      expect(result.difference).toBe(0);
    });
  });
});
