/**
 * 把微信里正在用的「出海笔记」首页写入后台首页装修并发布。
 * 用法: node scripts/apply-chuhai-home.mjs
 * 环境: API_BASE, ADMIN_USER, ADMIN_PASS
 */
const fs = require('fs')
const path = require('path')

const API_BASE = process.env.API_BASE || 'https://api.zfculture.site'
const USER = process.env.ADMIN_USER || 'admin'
const PASS = process.env.ADMIN_PASS || 'admin@123'
const dsl = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../admin/src/data/chuhai-notes-home.json'), 'utf8'),
)

async function req(p, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${API_BASE}${p}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json()
  if (!res.ok || (json.code && json.code !== 200)) {
    throw new Error(`${method} ${p} => ${json.code || res.status} ${json.message || ''}`)
  }
  return json.data
}

async function main() {
  const login = await req('/api/v1/admin/auth/login', {
    method: 'POST',
    body: { username: USER, password: PASS },
  })
  const token = login.token || login.accessToken || login.access_token
  if (!token) throw new Error('login ok but no token')

  const list = await req('/api/v1/admin/pages?current=1&size=50', { token })
  const records = list.records || list.list || []
  const home =
    records.find((p) => String(p.path || '').includes('pages/index/index')) ||
    records.find((p) => p.type === 1 || p.type === 'home')
  if (!home) throw new Error('homepage not found')

  await req(`/api/v1/admin/pages/${home.id}/draft`, {
    method: 'POST',
    token,
    body: { dslContent: JSON.stringify(dsl) },
  })
  await req(`/api/v1/admin/pages/${home.id}/publish`, { method: 'POST', token })
  console.log('applied chuhai home dsl to page', home.id, home.name, home.path)
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
