function compareBoqWithKhs(boqItems, khsItems) {
  const khsMap = new Map();
  khsItems.forEach((item) => {
    if (!khsMap.has(item.product_no)) {
      khsMap.set(item.product_no, item);
    }
  });

  const comparisons = [];
  const missingInKhs = [];
  const notInBoq = [];

  for (const boqItem of boqItems) {
    const khsItem = khsMap.get(boqItem.product_no);

    if (!khsItem) {
      missingInKhs.push(boqItem.product_no);
      comparisons.push({
        product_no: boqItem.product_no,
        product_desc: boqItem.product_desc,
        boq_quantity: boqItem.quantity,
        boq_unit_price: boqItem.unit_price,
        boq_total_price: boqItem.total_price,
        khs_item_price: null,
        price_difference: null,
        price_difference_percentage: null,
        status: 'NOT_FOUND_IN_KHS',
      });
    } else {
      const priceDiff = boqItem.unit_price - khsItem.item_price;
      const priceDiffPct = khsItem.item_price > 0
        ? (priceDiff / khsItem.item_price) * 100
        : 0;
      const status = priceDiff > 0
        ? 'BOQ_HIGHER'
        : priceDiff < 0
          ? 'BOQ_LOWER'
          : 'MATCH';

      comparisons.push({
        product_no: boqItem.product_no,
        product_desc: boqItem.product_desc,
        item_category: khsItem.item_category,
        boq_quantity: boqItem.quantity,
        boq_unit_price: boqItem.unit_price,
        boq_total_price: boqItem.total_price,
        khs_item_price: khsItem.item_price,
        price_difference: priceDiff,
        price_difference_percentage: parseFloat(priceDiffPct.toFixed(2)),
        status,
      });
    }
  }

  for (const khsItem of khsItems) {
    if (!boqItems.some((bi) => bi.product_no === khsItem.product_no)) {
      notInBoq.push(khsItem.product_no);
    }
  }

  const stats = {
    totalCompared: comparisons.length,
    matched: comparisons.filter((c) => c.status === 'MATCH').length,
    boqHigher: comparisons.filter((c) => c.status === 'BOQ_HIGHER').length,
    boqLower: comparisons.filter((c) => c.status === 'BOQ_LOWER').length,
    notFoundInKhs: missingInKhs.length,
    notInBoq: notInBoq.length,
  };

  return {
    comparisons,
    missingInKhs,
    notInBoq,
    stats,
  };
}

function validateBoqVsKmzLengths(boqLength, kmzTotalLength) {
  if (boqLength === null || kmzTotalLength === null) {
    return {
      valid: false,
      error: 'Both BoQ length and KMZ route length are required for comparison',
    };
  }

  const difference = Math.abs(boqLength - kmzTotalLength);
  const differencePercentage = (difference / boqLength) * 100;
  const withinTolerance = differencePercentage <= 5;

  return {
    valid: withinTolerance,
    boqLength,
    kmzLength: kmzTotalLength,
    difference: parseFloat(difference.toFixed(2)),
    differencePercentage: parseFloat(differencePercentage.toFixed(2)),
    withinTolerance,
    message: withinTolerance
      ? 'Lengths are within 5% tolerance'
      : 'Length difference exceeds 5% tolerance',
  };
}

module.exports = {
  compareBoqWithKhs,
  validateBoqVsKmzLengths,
};
