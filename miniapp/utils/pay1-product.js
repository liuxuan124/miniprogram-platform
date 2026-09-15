/**
 * 暖阁 ¥1 支付验通路（demo=pay1）→ 解析真实 productId
 * 优先 GET smoke/pay1（后端可自动补种）；404 表示生产未部署该接口。
 */
const request = require('./request')
const productService = require('../services/product')

const PAY1_NAME = '暖阁体验包 · 1元'
const PAY1_NAME_RE = /暖阁体验包|体验包.*1元/

function isPay1Name(name) {
  return PAY1_NAME_RE.test(String(name || ''))
}

function hasValidProductId(id) {
  if (id == null || id === '') return false
  const n = Number(id)
  return Number.isFinite(n) && n > 0
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function idFromProduct(p) {
  const id = p && (p.id != null ? p.id : p.productId)
  return hasValidProductId(id) ? Number(id) : null
}

function fetchSmokePay1() {
  return request
    .get('/api/v1/mp/products/smoke/pay1', {}, { auth: false, showError: false })
    .then((p) => {
      const id = idFromProduct(p)
      if (id) return id
      const err = new Error('smoke pay1 missing id')
      err.code = 'PAY1_BAD_PAYLOAD'
      throw err
    })
}

function fetchSmokeWithRetry(times) {
  let chain = fetchSmokePay1()
  for (let i = 1; i < times; i += 1) {
    chain = chain.catch((err) => {
      // 404=路由未上线，重试无意义；其它瞬时失败可再试
      if (err && Number(err.code) === 404) throw err
      return sleep(350 * i).then(() => fetchSmokePay1())
    })
  }
  return chain
}

function findPay1InList() {
  return productService
    .getProductList({ current: 1, size: 50, keyword: '体验包', showError: false })
    .then((res) => {
      const list = (res && (res.records || res.list || res.items)) || []
      const hit =
        list.find((p) => isPay1Name(p.name)) ||
        list.find((p) => Number(p.price) === 1 && /体验|暖阁/.test(String(p.name || '')))
      return idFromProduct(hit)
    })
    .catch(() => null)
}

/**
 * @returns {Promise<number>}
 * @throws {{ code: string, message: string }}
 */
function resolvePay1ProductId() {
  return fetchSmokeWithRetry(3).catch((smokeErr) =>
    findPay1InList().then((id) => {
      if (hasValidProductId(id)) return id
      const code = smokeErr && smokeErr.code
      const undeployed =
        Number(code) === 404 ||
        /接口不存在|Not Found/i.test(String((smokeErr && smokeErr.message) || ''))
      const err = new Error(
        undeployed
          ? '体验包接口未上线，需部署后端'
          : '体验包未入库，请稍后重试',
      )
      err.code = undeployed ? 'PAY1_UNDEPLOYED' : 'PAY1_MISSING'
      err.cause = smokeErr
      throw err
    }),
  )
}

module.exports = {
  PAY1_NAME,
  isPay1Name,
  hasValidProductId,
  resolvePay1ProductId,
}
