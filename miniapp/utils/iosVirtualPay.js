/** iOS 虚拟商品支付限制：详情页购买前检测 */
function isIos() {
  try {
    const sys = wx.getSystemInfoSync()
    return (sys.platform || '').toLowerCase() === 'ios'
  } catch (e) {
    return false
  }
}

function shouldBlockVirtualPurchase(productType) {
  if (!isIos()) return false
  const virtualTypes = ['member', 'column', 'ebook', 'digital', 'virtual', 'planet']
  const t = String(productType || '').toLowerCase()
  return virtualTypes.some((v) => t.includes(v))
}

function virtualPayHint() {
  return '根据微信小程序规则，iOS 端暂不支持直接购买此类虚拟商品，请使用 Android 或联系客服。'
}

module.exports = {
  isIos,
  shouldBlockVirtualPurchase,
  virtualPayHint,
}
