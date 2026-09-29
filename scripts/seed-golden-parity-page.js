#!/usr/bin/env node
/**
 * 发布黄金 DSL：全量页（H5/后台）+ 分批页（小程序 automator）
 */
const fs = require('fs')
const path = require('path')
const http = require('http')

const ROOT = path.join(__dirname, '..')
const BASE = (process.env.API_BASE || 'http://127.0.0.1:8080').replace(/\/$/, '')
const USER = process.env.ADMIN_USER || 'admin'
const PASS = process.env.ADMIN_PASS
if (!PASS) {
  console.error('请设置环境变量 ADMIN_PASS（仓库公开，禁止硬编码后台密码）')
  process.exit(1)
}
const FULL_PATH = 'pages/custom/golden-render-parity'
const BATCHES_FILE = path.join(ROOT, 'agent-team/testing/golden-dsl-batches.json')

function req(method, urlPath, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE)
    const data = body == null ? null : JSON.stringify(body)
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`
    const r = http.request(
      { method, hostname: url.hostname, port: url.port, path: url.pathname + url.search, headers },
      (res) => {
        let raw = ''
        res.on('data', (c) => { raw += c })
        res.on('end', () => {
          let json
          try { json = JSON.parse(raw) } catch (e) { json = { raw } }
          if (res.statusCode >= 400) {
            reject(new Error(`${method} ${urlPath} → ${res.statusCode}: ${raw.slice(0, 400)}`))
          } else resolve(json)
        })
      },
    )
    r.on('error', reject)
    if (data) r.write(data)
    r.end()
  })
}

function unwrap(payload) {
  if (payload && typeof payload === 'object' && 'data' in payload) return payload.data
  return payload
}

async function upsertPublish(token, pagePath, name, dsl) {
  const key = String(pagePath).replace(/^\/+/, '')
  const listed = unwrap(await req('GET', '/api/v1/admin/pages?current=1&size=100', null, token))
  const records = listed.records || listed || []
  let row = records.find((r) => String(r.path || '').replace(/^\/+/, '') === key)

  if (!row) {
    row = unwrap(await req('POST', '/api/v1/admin/pages', {
      name,
      type: 3,
      path: `/${key}`,
      shareTitle: '渲染比对',
      description: 'RENDER-PARITY 自动测试页，勿绑 Tab',
    }, token))
  }

  const pid = row.id
  await req('POST', `/api/v1/admin/pages/${pid}/draft`, {
    dslContent: JSON.stringify(dsl),
  }, token)
  await req('POST', `/api/v1/admin/pages/${pid}/publish`, {}, token)
  return { pageId: pid, path: key, components: dsl.components?.length ?? 0 }
}

async function main() {
  const dsl = JSON.parse(fs.readFileSync(path.join(ROOT, 'agent-team/testing/golden-dsl.json'), 'utf8'))
  if (!fs.existsSync(BATCHES_FILE)) {
    throw new Error(`缺少 ${BATCHES_FILE}，请先 node scripts/generate-golden-dsl.js`)
  }
  const manifest = JSON.parse(fs.readFileSync(BATCHES_FILE, 'utf8'))

  const login = unwrap(await req('POST', '/api/v1/admin/auth/login', { username: USER, password: PASS }))
  const token = login.accessToken || login.token
  if (!token) throw new Error(`login failed: ${JSON.stringify(login)}`)

  const published = []
  published.push(await upsertPublish(token, FULL_PATH, dsl.page?.name || '渲染比对黄金页', dsl))

  for (const batch of manifest.batches || []) {
    published.push(await upsertPublish(
      token,
      batch.path,
      batch.dsl?.page?.name || `渲染比对黄金页 ${batch.index}`,
      batch.dsl,
    ))
  }

  const mp = unwrap(await req('GET', `/api/v1/mp/pages?path=${encodeURIComponent(FULL_PATH)}`, null, token))
  const count = mp?.components?.length ?? 0
  console.log(JSON.stringify({ ok: true, published, mpComponentCount: count }, null, 2))
  if (!count) throw new Error('mp pages API 全量黄金页为空')
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
