const xlsx = require('xlsx');

function extractProjectNameFromFilename(filename) {
  const baseName = filename.replace(/\.[^/.]+$/, '');
  return baseName.replace(/\s+/g, ' ').trim();
}

function extractProjectInfoFromBoq(filePath, filename) {
  try {
    const workbook = xlsx.readFile(filePath);

    let projectName = extractProjectNameFromFilename(filename);
    let customer = null;
    let address = null;

    let foundProjectName = false;
    let foundAddress = false;

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;

      const range = xlsx.utils.decode_range(sheet['!ref'] || '');
      if (!range) continue;

      for (let r = range.s.r; r <= range.e.r; r++) {
        const row = [];
        for (let c = range.s.c; c <= range.e.c; c++) {
          const cellRef = xlsx.utils.encode_cell({ c, r });
          const cell = sheet[cellRef];
          row.push(cell ? cell.v : '');
        }

        for (let c = 0; c < row.length; c++) {
          const cellValue = String(row[c] || '').toUpperCase().trim();

          if (!foundProjectName && cellValue.includes('NAMA PROJECT') && !cellValue.includes('MATERIAL')) {
            for (let dc = c + 1; dc < row.length; dc++) {
              if (row[dc]) {
                projectName = String(row[dc]).trim();
                foundProjectName = true;
                break;
              }
            }
          }

          if (cellValue.includes('ALAMAT') || cellValue === 'ADDRESS') {
            for (let dc = c + 1; dc < row.length; dc++) {
              if (row[dc]) {
                address = String(row[dc]).trim();
                foundAddress = true;
                break;
              }
            }
          }

          if (cellValue.includes('LOKASI') || cellValue === 'LOCATION') {
            for (let dc = c + 1; dc < row.length; dc++) {
              if (row[dc] && !foundAddress) {
                address = String(row[dc]).trim();
                foundAddress = true;
                break;
              }
            }
          }
        }

        if (!foundProjectName) {
          for (let c = 0; c < row.length; c++) {
            const val = String(row[c] || '').trim();
            if (val.includes('CATUR MITRA') || val.includes('CUSTOMER') ||
                val.match(/\[.*\w+\]/)) {
              projectName = val;
              foundProjectName = true;
              break;
            }
          }
        }
      }
    }

    const boqItems = [];

    const itemSheetName = workbook.SheetNames.find(
      (name) => name.toLowerCase() !== 'penamaanboq' && name.toLowerCase() !== 'khs' && name.toLowerCase() !== 'summary',
    ) || workbook.SheetNames.find(
      (name) => name.toLowerCase() !== 'penamaanboq' && name.toLowerCase() !== 'khs',
    );

    if (itemSheetName) {
      const sheet = workbook.Sheets[itemSheetName];
      const range = xlsx.utils.decode_range(sheet['!ref'] || '');
      if (range) {
        let headerRow = -1;
        for (let r = range.s.r; r <= range.e.r; r++) {
          const row = [];
          for (let c = range.s.c; c <= range.e.c; c++) {
            const cellRef = xlsx.utils.encode_cell({ c, r });
            const cell = sheet[cellRef];
            row.push(cell ? String(cell.v || '') : '');
          }

          const rowLower = row.map((v) => v.toLowerCase());

          const hasProductNo = rowLower.some(
            (v) => v.includes('no. khs') || v.includes('productno') ||
                   v.includes('item code') ||             (v === 'no.' || v.trim() === 'no.'),
          );
          const hasQty = rowLower.some(
            (v) => v.includes('qty') || v.includes('quantity'),
          );
          const hasPrice = rowLower.some(
            (v) => v.includes('harga') || v.includes('price'),
          );

          if (hasProductNo && hasQty && hasPrice) {
            headerRow = r;
            break;
          }
        }

        if (headerRow >= 0) {
          const headers = [];
          for (let c = range.s.c; c <= range.e.c; c++) {
            const cellRef = xlsx.utils.encode_cell({ c, r: headerRow });
            const cell = sheet[cellRef];
            headers.push(cell ? String(cell.v || '').toLowerCase().trim() : '');
          }

          const colMap = {};
          headers.forEach((h, idx) => {
            if (h.includes('no. khs') || h.includes('productno') || h.includes('item code') ||
                (h === 'no.' && idx === 2)) {
              colMap.productNo = idx;
            }
            if (h.includes('material') || h.includes('desc')) {
              colMap.productDesc = idx;
            }
            if (h.includes('qty') || h.includes('quantity')) {
              colMap.qty = idx;
            }
            if (h.includes('harga satuan') || h.includes('unit price')) {
              colMap.unitPrice = idx;
            } else if (h.includes('satuan') || h.includes('unit')) {
              colMap.unit = idx;
            }
            if (h.includes('harga total') || h.includes('total price')) {
              colMap.totalPrice = idx;
            }
          });

          for (let r = headerRow + 1; r <= range.e.r; r++) {
            const row = [];
            for (let c = range.s.c; c <= range.e.c; c++) {
              const cellRef = xlsx.utils.encode_cell({ c, r });
              const cell = sheet[cellRef];
              row.push(cell ? cell.v : '');
            }

            const productNo = colMap.productNo !== undefined ? row[colMap.productNo] : null;
            if (!productNo) continue;

            const qty = colMap.qty !== undefined ? parseFloat(row[colMap.qty]) || 0 : 0;
            const unitPrice = colMap.unitPrice !== undefined
              ? parseFloat(row[colMap.unitPrice]) || 0
              : 0;

            boqItems.push({
              product_no: String(productNo),
              product_desc: colMap.productDesc !== undefined ? String(row[colMap.productDesc] || '') : '',
              quantity: qty,
              unit: colMap.unit !== undefined ? String(row[colMap.unit] || '') : '',
              unit_price: unitPrice,
              total_price: colMap.totalPrice !== undefined
                ? (parseFloat(row[colMap.totalPrice]) || qty * unitPrice)
                : qty * unitPrice,
            });
          }
        }
      }
    }

    const totalValue = boqItems.reduce((sum, item) => sum + (item.total_price || 0), 0);
    const boqLength = extractBoqLength(workbook, filename);

    return {
      projectName: projectName.trim(),
      customer: customer || null,
      address: address || null,
      boqItems,
      totalValue,
      boqProposedLength: boqLength,
      sheetCount: workbook.SheetNames.length,
      sheets: workbook.SheetNames,
    };
  } catch (error) {
    return {
      projectName: extractProjectNameFromFilename(filename),
      customer: null,
      address: null,
      boqItems: [],
      totalValue: 0,
      boqProposedLength: null,
      error: error.message,
    };
  }
}

function extractBoqLength(workbook, filename) {
  const match = filename.match(/(\d+)\s*[Mm]/);
  if (match) {
    return parseFloat(match[1]);
  }

  if (!workbook || !workbook.SheetNames) {
    return null;
  }

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const range = xlsx.utils.decode_range(sheet['!ref'] || '');
    if (!range) continue;

    for (let r = range.s.r; r <= range.e.r; r++) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cellRef = xlsx.utils.encode_cell({ c, r });
        const cell = sheet[cellRef];
        if (cell && typeof cell.v === 'string') {
          const lenMatch = cell.v.match(/PANJANG[_ ]JALUR\s+(\d+(?:\.\d+)?)\s*[Mm]/i);
          if (lenMatch) return parseFloat(lenMatch[1]);
        }
        if (cell && typeof cell.v === 'number') {
          const cellAbove = sheet[xlsx.utils.encode_cell({ c, r: r - 1 })];
          if (cellAbove && typeof cellAbove.v === 'string' &&
              cellAbove.v.toLowerCase().includes('panjang') &&
              cellAbove.v.toLowerCase().includes('meter')) {
            return cell.v;
          }
        }
      }
    }
  }

  return null;
}

module.exports = {
  extractProjectNameFromFilename,
  extractProjectInfoFromBoq,
  extractBoqLength,
};
