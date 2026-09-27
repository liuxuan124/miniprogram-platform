/** iOS 虚拟商品支付限制（与后端 commerce_ios_virtual_pay 对齐） */

const { getPlatform } = require('./system-info')

let cachedBlockMessage = ''

function isIos() {
  try {
    return getPlatform() === 'ios'
  } catch (e) {
    return false
  }
}

function getClientPlatform() {
  try {
    return getPlatform()
  } catch (e) {
    return ''
  }
}

function applyPublicConfig(publicConfigs) {
  const cfg = publicConfigs && publicConfigs.commerce_ios_virtual_pay
  if (cfg && cfg.blockMessage) {
    cachedBlockMessage = String(cfg.blockMessage)
  }
}

function virtualPayHint() {
  return cachedBlockMessage
    || '根据微信小程序规则，iOS 端暂不支持直接购买此类虚拟商品，请使用 Android 或联系客服。'
}

function shouldBlockVirtualPurchase(productType, product) {
  if (product && product.canPurchase === false) {
    return true
  }
  if (product && product.canPurchase === true) {
    return false
  }
  if (!isIos()) return false
  const virtualTypes = ['member', 'membership', 'column', 'ebook', 'digital', 'virtual', 'planet', 'resource_pack']
  const t = String(productType || '').toLowerCase()
  return virtualTypes.some((v) => t.includes(v))
}

function blockReason(product) {
  if (product && product.purchaseBlockReason) return product.purchaseBlockReason
  return virtualPayHint()
}

module.exports = {
  isIos,
  getClientPlatform,
  applyPublicConfig,
  shouldBlockVirtualPurchase,
  virtualPayHint,
  blockReason,
}
