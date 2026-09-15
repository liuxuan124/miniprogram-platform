#!/usr/bin/env node
/**
 * 一键补种「暖阁体验包 · 1元」（支付验通路）
 *
 * 用法:
 *   API_BASE=https://api.zfculture.site ADMIN_USER=admin ADMIN_PASS=*** node scripts/seed-pay1-smoke.js
 *
 * 流程:
 *   1) GET /api/v1/mp/products/smoke/pay1 —— 若已部署 V61+ 后端会自动补种并返回 id
 *   2) 若 404「接口不存在」—— 说明生产未部署 smoke 接口，改走管理端创建商品
 *   3) 管理端需有效账号（仓库默认 admin@123 对生产无效，请用环境变量传入）
 */
const API_BASE = (process.env.API_BASE || 'https://api.zfculture.site').replace(/\/$/, '')
const USER = process.env.ADMIN_USER || 'admin'
const PASS = process.env.ADMIN_PASS || 'admin@123'
const PAY1_NAME = '暖阁体验包 · 1元'

async function req(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch (_) {
    json = { raw: text }
  }
  return { http: res.status, json }
}

function okData(json) {
  if (!json) return null
  if (json.code === 0 || json.code === 200) return json.data
  return null
}

async function trySmoke() {
  const { http, json } = await req('GET', '/api/v1/mp/products/smoke/pay1')
  const data = okData(json)
  if (data && data.id) {
    console.log(`[OK] smoke/pay1 → id=${data.id} name=${data.name || ''}`)
    return data.id
  }
  const msg = (json && json.message) || `HTTP ${http}`
  console.log(`[INFO] smoke/pay1 不可用: ${msg}`)
  if (http === 404 || /接口不存在/.test(String(msg))) {
    console.log('[HINT] 生产后端尚未包含 GET /api/v1/mp/products/smoke/pay1，请部署含 ensurePay1 的后端；或继续用管理端补种。')
  }
  return null
}

async function adminLogin() {
  const { http, json } = await req('POST', '/api/v1/admin/auth/login', {
    body: { username: USER, password: PASS },
  })
  const data = okData(json)
  const token = data && (data.token || data.accessToken || data.access_token)
  if (!token) {
    console.error(`[FAIL] 管理端登录失败 HTTP=${http} msg=${(json && json.message) || ''}`)
    console.error('请设置环境变量 ADMIN_USER / ADMIN_PASS 后重试。')
    process.exit(2)
  }
  return token
}

async function findExisting(token) {
  const { json } = await req('GET', '/api/v1/admin/products?page=1&pageSize=100&keyword=' + encodeURIComponent('体验包'), {
    token,
  })
  const data = okData(json) || {}
  const records = data.records || data.list || []
  const hit = records.find((p) => p && p.name === PAY1_NAME)
  return hit || null
}

async function ensureViaAdmin(token) {
  const existing = await findExisting(token)
  if (existing && existing.id) {
    const pid = existing.id
    console.log(`[SKIP] 商品已存在 id=${pid}，尝试上架`)
    await req('PUT', `/api/v1/admin/products/${pid}/on-sale`, { token })
    return pid
  }

  const body = {
    name: PAY1_NAME,
    productType: 'digital',
    productTypes: ['digital'],
    mainImage: 'https://picsum.photos/seed/pay1/400/400',
    images: ['https://picsum.photos/seed/pay1/400/400'],
    description: '支付体验 · 虚拟商品 · 无需收货地址',
    detail:
      '<p>暖阁体验包。虚拟商品，支付成功后立即开通体验权限，不发实体、无需填写收货地址。用于支付通路体验，实付 ¥1（展示原价 ¥9.9）。</p>',
    price: 1,
    originalPrice: 9.9,
    stock: 9999,
    unit: '份',
    sortOrder: 5,
    autoFulfill: 1,
    deliveryMode: 'auto',
    refundPolicy: 'none',
  }
  const { http, json } = await req('POST', '/api/v1/admin/products', { token, body })
  const data = okData(json)
  const pid = data && data.id
  if (!pid) {
    console.error(`[FAIL] 创建商品失败 HTTP=${http} msg=${(json && json.message) || JSON.stringify(json)}`)
    process.exit(3)
  }
  await req('PUT', `/api/v1/admin/products/${pid}/on-sale`, { token })
  console.log(`[OK] 管理端已创建并上架 id=${pid}`)
  return pid
}

async function main() {
  console.log(`API_BASE=${API_BASE}`)
  const smokeId = await trySmoke()
  if (smokeId) {
    console.log('完成：可通过小程序 demo=pay1 购买。')
    return
  }
  const token = await adminLogin()
  const id = await ensureViaAdmin(token)
  console.log(`完成：productId=${id}。小程序「立即购买」会按名解析该商品。`)
  console.log('若仍走 smoke 且 404，请部署后端；客户端已回退到商品列表按名查找。')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
