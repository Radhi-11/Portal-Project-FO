const xlsx = require('xlsx');
const fs = require('fs');
const JSZip = require('jszip');

const wb = xlsx.utils.book_new();

const summaryData = [
  ['BOQ Summary', '', '', '', '', '', '', '', '', '', ''],
  ['NAMA PEKERJAAN', 'PANJANG JALUR FO (M)', 'HARGA MATERIAL', 'HARGA JASA', 'BIAYA KOORDINASI', 'BIAYA IZIN', 'TOTAL HARGA', 'BIAYA IZIN /METER', 'TOTAL HARGA / METER', 'PLANNER', 'REVIEW'],
  ['[PASANG BARU AKSES FIBER OPTIC PANJANG JALUR 180 M] 2026509882 CATUR MITRA SEJATI SENTOSA, JL. PERINTIS KEMERDEKAAN, MAKASSAR', 180, 49100, 1775100, 0, 0, 1824200, 0, 10134.44, 'OK', 'OK'],
];
const summaryWs = xlsx.utils.aoa_to_sheet(summaryData);
xlsx.utils.book_append_sheet(wb, summaryWs, 'Summary');

const boqData = [
  ['', '', '', '', '', '', '', '', ''],
  ['Bill of Quantity', '', '', '', '', '', '', '', ''],
  ['Nama Project', '', '[PASANG BARU AKSES FIBER OPTIC PANJANG JALUR 180 M] 2026509882 CATUR MITRA SEJATI SENTOSA, JL. PERINTIS KEMERDEKAAN, MAKASSAR', '', '', '', '', ''],
  ['Panjang Jalur DW 2C', '', 180, 'Meter', '', '', '', ''],
  ['Alamat', '', '-5.143349439588899, 119.4772975576448', '', '', '', '', ''],
  ['No.', 'Kategori', 'No. KHS', 'Material', 'Qty', 'Satuan', 'Harga Satuan', 'Harga Total'],
  [3, 'MATERIAL', 'KHS_SMUO_048_M', 'Pengadaan dan Pemasangan Roset/Optical Outlet', 1, 'Unit', 49100, 49100],
  [1, 'SERVICE', 'KHS_SMUO_005_S', 'Kabel Udara FOC 2 core G652D Drop Core', 250, 'meter', 3000, 750000],
  [2, 'SERVICE', 'KHS_SMUO_015_S', 'Fusion splice 1 core', 4, 'Core', 60400, 241600],
];
const boqWs = xlsx.utils.aoa_to_sheet(boqData);
xlsx.utils.book_append_sheet(wb, boqWs, 'boq');

const boqPath = 'C:/Users/ASUS/AppData/Local/Temp/kilo/test-boq.xlsx';
xlsx.writeFile(wb, boqPath);
console.log('Created test BoQ:', boqPath);

const kml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<kml xmlns="http://www.opengis.net/kml/2.2">',
  '  <Document>',
  '    <name>Test Project</name>',
  '    <Placemark>',
  '      <name>Customer Location</name>',
  '      <Point>',
  '        <coordinates>106.8272,-6.1748,0</coordinates>',
  '      </Point>',
  '    </Placemark>',
  '    <Placemark>',
  '      <name>Jalur Kabel KU Eksisting</name>',
  '      <LineString>',
  '        <coordinates>106.8272,-6.1748,0 106.8280,-6.1750,0 106.8290,-6.1755,0</coordinates>',
  '      </LineString>',
  '    </Placemark>',
  '  </Document>',
  '</kml>',
].join('\n');

(async () => {
  const zip = new JSZip();
  zip.file('doc.kml', kml);
  const buffer = await zip.generateAsync({ type: 'nodebuffer' });
  const kmzPath = 'C:/Users/ASUS/AppData/Local/Temp/kilo/test-route.kmz';
  fs.writeFileSync(kmzPath, buffer);
  console.log('Created test KMZ:', kmzPath);

  // Test the BoQ parser
  const { extractProjectInfoFromBoq } = require('../src/services/boqParser');
  const result = extractProjectInfoFromBoq(boqPath, 'test-boq.xlsx');
  console.log('\n=== BoQ Parser Result ===');
  console.log('ProjectName:', result.projectName);
  console.log('BoqLength:', result.boqProposedLength);
  console.log('TotalValue:', result.totalValue);
  console.log('Items:', result.boqItems.length);
  if (result.boqItems.length > 0) {
    console.log('First item:', JSON.stringify(result.boqItems[0], null, 2));
  }

  // Test the KMZ parser
  const { parseKmz, extractFirstCoordinate } = require('../src/services/kmzParser');
  const kmzResult = await parseKmz(kmzPath);
  console.log('\n=== KMZ Parser Result ===');
  console.log('Objects:', kmzResult.totalObjects);
  console.log('Points:', kmzResult.points.length);
  console.log('LineStrings:', kmzResult.lineStrings.length);
  for (const ls of kmzResult.lineStrings) {
    console.log('  LineString:', ls.name, 'Length:', ls.calculated_length.toFixed(2), 'm');
  }

  const coord = await extractFirstCoordinate(kmzPath);
  console.log('First coordinate:', coord);
})();
