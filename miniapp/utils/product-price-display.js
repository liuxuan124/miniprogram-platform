/** 商品价格为 0 时的展示方式 */
function isZeroProductPrice(price) {
  const n = Number(price)
  return Number.isFinite(n) && n === 0
}

/** 列表/卡片上展示用的价格文案（含是否带 ¥ 前缀） */
function formatProductPriceLabel(price, zeroPriceDisplay, freeText = '免费领取') {
  const mode = zeroPriceDisplay === 'free' ? 'free' : 'amount'
  if (isZeroProductPrice(price) && mode === 'free') {
    return { text: freeText, withYuan: false }
  }
  const n = Number(price)
  const amount = Number.isFinite(n) ? n.toFixed(2) : String(price != null ? price : '0.00')
  return { text: amount, withYuan: true }
}

/** 销量/已领文案：免费商品（售价 0）显示「已领」，其余显示「已售」，数据均来自 sales */
function formatProductSalesLabel(price, sales) {
  const count = Number(sales)
  const n = Number.isFinite(count) ? count : 0
  return (isZeroProductPrice(price) ? '已领' : '已售') + n
}

module.exports = {
  isZeroProductPrice,
  formatProductPriceLabel,
  formatProductSalesLabel,
}
