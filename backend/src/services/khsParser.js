const xlsx = require('xlsx');

function extractKhsItems(filePath) {
  try {
    const workbook = xlsx.readFile(filePath);

    let khsSheet = null;
    let khsSheetName = null;

    const khsSheetCandidate = workbook.SheetNames.find(
      (name) => name.toLowerCase().includes('khs'),
    );

    if (khsSheetCandidate) {
      khsSheetName = khsSheetCandidate;
      khsSheet = workbook.Sheets[khsSheetName];
    } else {
      khsSheetName = workbook.SheetNames[0];
      khsSheet = workbook.Sheets[khsSheetName];
    }

    if (!khsSheet) {
      return {
        khsItems: [],
        totalItems: 0,
        materialCount: 0,
        serviceCount: 0,
        error: 'No KHS sheet found',
      };
    }

    const range = xlsx.utils.decode_range(khsSheet['!ref'] || '');
    if (!range) {
      return {
        khsItems: [],
        totalItems: 0,
        materialCount: 0,
        serviceCount: 0,
        error: 'Invalid sheet structure',
      };
    }

    let headerRow = -1;
    let headerColMap = {};

    for (let r = range.s.r; r <= range.e.r; r++) {
      const row = [];
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cellRef = xlsx.utils.encode_cell({ c, r });
        const cell = khsSheet[cellRef];
        row.push(cell ? String(cell.v || '').toLowerCase().trim() : '');
      }

      const hasItemCategory = row.some(
        (v) => v === 'itemcategory' || v === 'kategori item',
      );
      const hasProductNo = row.some(
        (v) => v === 'productno' || v === 'no. khs' || v === 'kode item',
      );
      const hasItemPrice = row.some(
        (v) => v === 'itemprice' || v === 'harga' || v === 'price',
      );

      if (hasItemCategory && hasProductNo && hasItemPrice) {
        headerRow = r;
        row.forEach((h, idx) => {
          headerColMap[idx] = h;
        });
        break;
      }
    }

    if (headerRow < 0) {
      const firstRow = [];
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cellRef = xlsx.utils.encode_cell({ c, r: range.s.r });
        const cell = khsSheet[cellRef];
        firstRow.push(cell ? String(cell.v || '').toLowerCase().trim() : '');
      }

      const hasItemCategory = firstRow.some(
        (v) => v === 'itemcategory' || v === 'kategori item',
      );
      if (hasItemCategory) {
        headerRow = range.s.r;
      }
    }

    if (headerRow < 0) {
      return {
        khsItems: [],
        totalItems: 0,
        materialCount: 0,
        serviceCount: 0,
        error: 'Could not find KHS header row',
      };
    }

    const headers = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellRef = xlsx.utils.encode_cell({ c, r: headerRow });
      const cell = khsSheet[cellRef];
      headers.push(cell ? String(cell.v || '').toLowerCase().trim() : '');
    }

    headerColMap = {};
    headers.forEach((h, idx) => {
      if (h === 'itemcategory' || h === 'kategori item') {
        headerColMap.itemCategory = idx;
      } else if (h === 'productno' || h === 'no. khs' || h === 'kode item') {
        headerColMap.productNo = idx;
      } else if (h === 'productdesc' || h === 'deskripsi') {
        headerColMap.productDesc = idx;
      } else if (h === 'itemprice' || h === 'harga' || h === 'price') {
        headerColMap.itemPrice = idx;
      }
    });

    const khsItems = [];
    let materialCount = 0;
    let serviceCount = 0;
    const seenProductNos = new Set();

    for (let r = headerRow + 1; r <= range.e.r; r++) {
      const row = [];
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cellRef = xlsx.utils.encode_cell({ c, r });
        const cell = khsSheet[cellRef];
        row.push(cell ? cell.v : '');
      }

      const itemCategory = headerColMap.itemCategory !== undefined
        ? String(row[headerColMap.itemCategory] || '').trim()
        : '';
      const productNo = headerColMap.productNo !== undefined
        ? String(row[headerColMap.productNo] || '').trim()
        : '';

      if (!productNo) continue;

      const categoryUpper = itemCategory.toUpperCase();

      if (seenProductNos.has(productNo)) {
        khsItems.push({
          item_category: categoryUpper || 'UNKNOWN',
          product_no: productNo,
          product_desc: headerColMap.productDesc !== undefined
            ? String(row[headerColMap.productDesc] || '').trim()
            : '',
          item_price: headerColMap.itemPrice !== undefined
            ? parseFloat(row[headerColMap.itemPrice]) || 0
            : 0,
          is_duplicate: true,
          error: 'Duplicate ProductNo',
        });
        continue;
      }

      seenProductNos.add(productNo);

      if (categoryUpper === 'MATERIAL') {
        materialCount += 1;
      } else if (categoryUpper === 'SERVICE') {
        serviceCount += 1;
      }

      khsItems.push({
        item_category: categoryUpper || 'UNKNOWN',
        product_no: productNo,
        product_desc: headerColMap.productDesc !== undefined
          ? String(row[headerColMap.productDesc] || '').trim()
          : '',
        item_price: headerColMap.itemPrice !== undefined
          ? parseFloat(row[headerColMap.itemPrice]) || 0
          : 0,
        is_duplicate: false,
      });
    }

    return {
      khsItems,
      totalItems: khsItems.length,
      materialCount,
      serviceCount,
      sheetName: khsSheetName,
      sheets: workbook.SheetNames,
      hasSheetKHS: !!khsSheetCandidate,
    };
  } catch (error) {
    return {
      khsItems: [],
      totalItems: 0,
      materialCount: 0,
      serviceCount: 0,
      error: error.message,
    };
  }
}

module.exports = {
  extractKhsItems,
};
