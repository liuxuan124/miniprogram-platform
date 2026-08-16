#!/usr/bin/env node
/**
 * BATCH-QA-014: retest page-builder FAIL / DB FAIL FPs (evidence only).
 * Does not create low-privilege accounts. Does not publish homepage id=1.
 */
import { execFileSync } from 'node:child_process'
import { createHmac } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const API = 'http://127.0.0.1:8080'
const ROOT = '/Users/lx/项目文件/liuxuan/小程序搭建运营系统'
const EVIDENCE = join(ROOT, 'agent-team/testing/evidence/BATCH-QA-014')
mkdirSync(EVIDENCE, { recursive: true })

const now = new Date().toISOString()
const results = []
const dump = { batch: 'BATCH-QA-014', started: now }

function mysql(sql) {
  try {
    return execFileSync(
      'docker',
      ['exec', 'miniapp-mysql', 'mysql', '-uminiapp', '-pminiapp123456', 'miniapp', '-N', '-e', sql],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    ).replace(/Warning: Using a password[^\n]*\n/g, '').trim()
  } catch (e) {
    return `MYSQL_ERR ${e.stderr || e.message}`
  }
}

async function req(method, path, { token, body, raw, headers } = {}) {
  const h = { Accept: 'application/json', ...(headers || {}) }
  if (token) h.Authorization = `Bearer ${token}`
  if (body !== undefined && !raw) h['Content-Type'] = 'application/json'
  const res = await fetch(API + path, {
    method,
    headers: h,
    body: raw ? body : body !== undefined ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json = null
  try { json = JSON.parse(text) } catch {}
  return { http: res.status, json, text: text.slice(0, 4000) }
}

function rec(id, status, note, extra = {}) {
  results.push({ id, status, note, time: now, ...extra })
  console.log(`${id} ${status} ${note}`)
}

function okBiz(r) {
  return r.http >= 200 && r.http < 300 && r.json && (r.json.code === 0 || r.json.code === 200)
}

function b64url(buf) {
  return Buffer.from(buf).toString('base64url')
}

function mintJwt({ expOffsetSec = -3600 } = {}) {
  const secret = 'miniprogram-platform-jwt-secret-key-must-be-at-least-256-bits-long-for-hs256'
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const nowSec = Math.floor(Date.now() / 1000)
  const payload = b64url(JSON.stringify({
    sub: 'admin',
    userId: 1,
    iat: nowSec - 7200,
    exp: nowSec + expOffsetSec,
  }))
  const sig = createHmac('sha256', secret).update(`${header}.${payload}`).digest()
  return `${header}.${payload}.${b64url(sig)}`
}

const login = await req('POST', '/api/v1/admin/auth/login', { body: { username: 'admin', password: 'admin123' } })
dump.login = { http: login.http, code: login.json?.code }
const token = login.json?.data?.accessToken
if (!token) {
  writeFileSync(join(EVIDENCE, 'api-retest.json'), JSON.stringify({ error: 'login failed', login }, null, 2))
  throw new Error('login failed')
}

// FP-API-003 page vs current
{
  const r = await req('GET', '/api/v1/admin/pages?page=1', { token })
  dump.api003 = { http: r.http, dataKeys: r.json?.data ? Object.keys(r.json.data) : [], current: r.json?.data?.current, page: r.json?.data?.page }
  const pass = okBiz(r) && r.json?.data?.page === 1
  rec('FP-API-003', pass ? 'PASS' : 'FAIL', pass ? 'page=1' : `current=${r.json?.data?.current} pageField=${r.json?.data?.page}`, { bug: 'BUG-API-001' })
}

// FP-API-004 default page_size 20
{
  const r = await req('GET', '/api/v1/admin/pages', { token })
  const size = r.json?.data?.size ?? r.json?.data?.page_size
  dump.api004 = { size, keys: r.json?.data ? Object.keys(r.json.data) : [] }
  const pass = okBiz(r) && Number(size) === 20
  rec('FP-API-004', pass ? 'PASS' : 'FAIL', `default size=${size} expected 20`, { bug: 'BUG-API-001' })
}

// FP-API-005 page_size > 100 rejected
{
  const r1 = await req('GET', '/api/v1/admin/pages?page_size=101', { token })
  const r2 = await req('GET', '/api/v1/admin/pages?size=101', { token })
  dump.api005 = {
    page_size: { http: r1.http, code: r1.json?.code, size: r1.json?.data?.size },
    size: { http: r2.http, code: r2.json?.code, size: r2.json?.data?.size },
  }
  const rejected = (r1.http === 400 || r1.json?.code === 100101) || (r2.http === 400 || r2.json?.code === 100101)
  const stillCaps = Number(r1.json?.data?.size) <= 100 && Number(r2.json?.data?.size) <= 100
  rec('FP-API-005', rejected ? 'PASS' : (stillCaps ? 'FAIL' : 'FAIL'), rejected ? 'rejected' : `page_size size=${r1.json?.data?.size}; size size=${r2.json?.data?.size}`, { bug: 'BUG-API-001' })
}

// Auth codes: unauthenticated should be 401 + 110101
const authCases = [
  ['FP-API-009', 'GET', '/api/v1/admin/pages'],
  ['FP-API-019', 'POST', '/api/v1/admin/pages'],
  ['FP-API-025', 'GET', '/api/v1/admin/pages/5'],
  ['FP-API-029', 'PUT', '/api/v1/admin/pages/5'],
  ['FP-API-035', 'DELETE', '/api/v1/admin/pages/999999'],
  ['FP-API-042', 'POST', '/api/v1/admin/pages/5/draft'],
  ['FP-API-048', 'POST', '/api/v1/admin/pages/5/publish'],
  ['FP-API-054', 'POST', '/api/v1/admin/pages/5/unpublish'],
  ['FP-API-060', 'GET', '/api/v1/admin/pages/5/versions'],
  ['FP-API-064', 'POST', '/api/v1/admin/pages/5/versions/1/rollback'],
  ['FP-API-069', 'GET', '/api/v1/admin/page-templates'],
]
dump.auth = {}
for (const [id, method, path] of authCases) {
  const body = method === 'POST' && path.endsWith('/draft')
    ? { content: { schema_version: '1.0', page: {}, components: [] }, base_version: 1 }
    : method === 'POST' && path === '/api/v1/admin/pages'
      ? { name: 'x', type: 3, path: 'pages/custom/x' }
      : method === 'PUT'
        ? { name: 'x' }
        : undefined
  const r = await req(method, path, { body })
  dump.auth[id] = { http: r.http, code: r.json?.code, msg: r.json?.message }
  const pass = r.http === 401 && (r.json?.code === 110101 || r.json?.code === 401)
  rec(id, pass ? 'PASS' : 'FAIL', `http=${r.http} code=${r.json?.code}`, { bug: 'BUG-API-002' })
}

// Expired token
{
  const expired = mintJwt({ expOffsetSec: -3600 })
  const r = await req('GET', '/api/v1/admin/pages', { token: expired })
  dump.api010 = { http: r.http, code: r.json?.code, msg: r.json?.message }
  const pass = r.http === 401 && (r.json?.code === 110102 || r.json?.code === 110101)
  rec('FP-API-010', pass ? 'PASS' : 'FAIL', `http=${r.http} code=${r.json?.code}`, { bug: 'BUG-API-002' })
}

// Illegal params / missing fields
{
  const r = await req('GET', '/api/v1/admin/pages?current=abc', { token })
  dump.api011 = { http: r.http, code: r.json?.code, msg: r.json?.message }
  const pass = r.http === 400 && (r.json?.code === 100101 || r.json?.code === 400)
  // Contract wants 100101; Spring conversion often 400 unstructured
  rec('FP-API-011', pass && r.json?.code === 100101 ? 'PASS' : 'FAIL', `http=${r.http} code=${r.json?.code} msg=${r.json?.message}`, { bug: 'BUG-API-003' })
}

{
  const r = await req('POST', '/api/v1/admin/pages', { token, body: { type: 3, path: 'pages/custom/qa014-a' } })
  dump.api013 = { http: r.http, code: r.json?.code, msg: r.json?.message }
  rec('FP-API-013', r.http === 400 && (r.json?.code === 100101 || r.json?.code === 400) && r.json?.code === 100101 ? 'PASS' : 'FAIL', `http=${r.http} code=${r.json?.code}`, { bug: 'BUG-API-003' })
}

{
  const r = await req('POST', '/api/v1/admin/pages', { token, body: { name: 'QA014', path: 'pages/custom/qa014-b' } })
  dump.api014 = { http: r.http, code: r.json?.code }
  rec('FP-API-014', r.json?.code === 100101 ? 'PASS' : 'FAIL', `http=${r.http} code=${r.json?.code}`, { bug: 'BUG-API-003' })
}

{
  const r = await req('POST', '/api/v1/admin/pages', { token, body: { name: 'QA014', type: 3 } })
  dump.api015 = { http: r.http, code: r.json?.code }
  rec('FP-API-015', r.json?.code === 100101 ? 'PASS' : 'FAIL', `http=${r.http} code=${r.json?.code}`, { bug: 'BUG-API-003' })
}

{
  const longName = 'N'.repeat(129)
  const r = await req('POST', '/api/v1/admin/pages', { token, body: { name: longName, type: 3, path: `pages/custom/qa014-long-${Date.now()}` } })
  dump.api016 = { http: r.http, code: r.json?.code, msg: r.json?.message }
  const pass = r.http === 400 && r.json?.code === 100101
  rec('FP-API-016', pass ? 'PASS' : 'FAIL', `http=${r.http} code=${r.json?.code}`, { bug: 'BUG-API-004' })
}

{
  const r = await req('POST', '/api/v1/admin/pages', { token, body: { name: 'QA014-badtype', type: 99, path: `pages/custom/qa014-bt-${Date.now()}` } })
  dump.api017 = { http: r.http, code: r.json?.code, created: okBiz(r) }
  const pass = !okBiz(r) && (r.json?.code === 100101 || r.http === 400)
  rec('FP-API-017', pass ? 'PASS' : 'FAIL', `http=${r.http} code=${r.json?.code} created=${okBiz(r)}`, { bug: 'BUG-API-005' })
}

{
  const r = await req('POST', '/api/v1/admin/pages', { token, raw: '{bad json', headers: { 'Content-Type': 'application/json' } })
  dump.api018 = { http: r.http, code: r.json?.code }
  rec('FP-API-018', r.json?.code === 100102 || (r.http === 400 && r.json?.code === 100101) ? 'PASS' : 'FAIL', `http=${r.http} code=${r.json?.code}`, { bug: 'BUG-API-003' })
}

// Create a disposable page for PUT empty / versions / mp path tests
const createPath = `pages/custom/qa014-${Date.now()}`
const created = await req('POST', '/api/v1/admin/pages', {
  token,
  body: { name: 'QA014-retest', type: 3, path: createPath },
})
dump.created = { http: created.http, code: created.json?.code, id: created.json?.data?.id ?? created.json?.data }
const pageId = created.json?.data?.id ?? created.json?.data
if (!pageId) {
  writeFileSync(join(EVIDENCE, 'api-retest.json'), JSON.stringify({ error: 'create failed', dump, results }, null, 2))
  throw new Error('create page failed')
}

{
  const r = await req('PUT', `/api/v1/admin/pages/${pageId}`, { token, body: {} })
  dump.api028 = { http: r.http, code: r.json?.code }
  // empty PUT accepted = FAIL vs "缺少必填"
  rec('FP-API-028', !okBiz(r) && r.http === 400 ? 'PASS' : 'FAIL', `empty PUT http=${r.http} code=${r.json?.code}`, { bug: 'BUG-API-003' })
}

{
  const r = await req('GET', `/api/v1/admin/pages/999999001/versions`, { token })
  dump.api059 = { http: r.http, code: r.json?.code }
  const pass = r.http === 404 || r.json?.code === 300401 || r.json?.code === 404
  // contract: 404 for missing page
  rec('FP-API-059', r.http === 404 ? 'PASS' : 'FAIL', `http=${r.http} code=${r.json?.code}`, { bug: 'BUG-API-006' })
}

// Draft conflict HTTP code
{
  const dsl = {
    schema_version: '1.0',
    page: { id: String(pageId), name: 'QA014-retest', type: 'custom', path: createPath },
    components: [{ id: 'sp1', type: 'spacer', props: { height: 8 } }],
    global_config: { pull_refresh: false, reach_bottom_load: false },
  }
  const d1 = await req('POST', `/api/v1/admin/pages/${pageId}/draft`, { token, body: { content: dsl, base_version: 0 } })
  const d2 = await req('POST', `/api/v1/admin/pages/${pageId}/draft`, { token, body: { content: dsl, base_version: 0 } })
  dump.api044 = { first: { http: d1.http, code: d1.json?.code }, second: { http: d2.http, code: d2.json?.code, msg: d2.json?.message } }
  const conflict = d2.http === 409 || d2.json?.code === 300409
  rec('FP-API-044', conflict && d2.http === 409 ? 'PASS' : 'FAIL', `conflict http=${d2.http} code=${d2.json?.code}`, { bug: 'BUG-API-009' })
}

// MP page path HTTP status
{
  const r = await req('GET', '/api/v1/mp/pages/pages%2Fnot-exist%2Fqa014')
  dump.api071 = { http: r.http, code: r.json?.code, msg: r.json?.message }
  rec('FP-API-071', r.http === 404 ? 'PASS' : 'FAIL', `http=${r.http} code=${r.json?.code}`, { bug: 'BUG-API-010' })
}

{
  // draft-only page should not be publicly published
  const r = await req('GET', `/api/v1/mp/pages/${encodeURIComponent(createPath)}`)
  dump.api072 = { http: r.http, code: r.json?.code, msg: r.json?.message }
  const unpublished = r.http === 404 || (r.json?.code !== 0 && r.json?.code !== 200)
  rec('FP-API-072', r.http === 404 ? 'PASS' : (unpublished ? 'FAIL' : 'FAIL'), `http=${r.http} code=${r.json?.code}`, { bug: 'BUG-API-010' })
}

// Rate limit
{
  const tasks = Array.from({ length: 80 }, () => req('GET', '/api/v1/admin/pages?current=1&size=1', { token }))
  const rs = await Promise.all(tasks)
  const limited = rs.filter((r) => r.http === 429 || r.json?.code === 100201).length
  dump.api075 = { limited, sample: rs.slice(0, 3).map((r) => ({ http: r.http, code: r.json?.code })) }
  rec('FP-API-075', limited > 0 ? 'PASS' : 'FAIL', `80 concurrent, 100201/429 count=${limited}`, { bug: 'BUG-API-007' })
}

// ID type as string
{
  const r = await req('GET', `/api/v1/admin/pages/${pageId}`, { token })
  const idVal = r.json?.data?.id
  dump.api077 = { typeofId: typeof idVal, idVal }
  const pass = typeof idVal === 'string'
  rec('FP-API-077', pass ? 'PASS' : 'FAIL', `create id typeof ${typeof idVal} value=${idVal}`, { bug: 'BUG-API-008' })
}

// DB FK
{
  const fk = mysql("SELECT CONSTRAINT_NAME, DELETE_RULE FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='mp_page_version'")
  dump.db002 = fk
  const hasFk = fk && !fk.startsWith('MYSQL_ERR') && fk.length > 0
  rec('FP-DB-002', hasFk ? 'PASS' : 'FAIL', hasFk ? fk : 'no FK', { bug: 'BUG-DB-001' })
}

// current vs published max
{
  const row = mysql('SELECT p.id, p.current_version, COALESCE(MAX(CASE WHEN v.is_published=1 THEN v.version END),0) FROM mp_page p LEFT JOIN mp_page_version v ON v.page_id=p.id WHERE p.id=1 GROUP BY p.id, p.current_version')
  dump.db005 = row
  const parts = (row || '').split(/\s+/)
  const current = Number(parts[1])
  const publishedMax = Number(parts[2])
  // For published home, current should equal published max when published; mismatch = FAIL per prior bug
  const pass = Number.isFinite(current) && Number.isFinite(publishedMax) && current === publishedMax
  rec('FP-DB-005', pass ? 'PASS' : 'FAIL', `current=${current} publishedMax=${publishedMax}`, { bug: 'BUG-DB-002' })
}

// Cleanup disposable page if still draft
try {
  await req('DELETE', `/api/v1/admin/pages/${pageId}`, { token })
} catch {}

const summary = {
  PASS: results.filter((r) => r.status === 'PASS').length,
  FAIL: results.filter((r) => r.status === 'FAIL').length,
  PARTIAL: results.filter((r) => r.status === 'PARTIAL').length,
  BLOCKED: results.filter((r) => r.status === 'BLOCKED').length,
}
dump.finished = new Date().toISOString()
dump.summary = summary
dump.results = results
writeFileSync(join(EVIDENCE, 'api-retest.json'), JSON.stringify(dump, null, 2))
writeFileSync(join(EVIDENCE, '00-summary.md'), `# BATCH-QA-014 API/DB retest\n\n- time: ${dump.finished}\n- PASS: ${summary.PASS}\n- FAIL: ${summary.FAIL}\n- evidence: api-retest.json\n`)
console.log('SUMMARY', summary)
