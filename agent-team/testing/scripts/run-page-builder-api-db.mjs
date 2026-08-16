#!/usr/bin/env node
/**
 * Execute FP-API-001~078 + FP-DB-001~005 against local env.
 * Evidence only. Does not publish homepage id=1. Does not create extra admin users.
 */
import { execFileSync } from 'node:child_process'
import { createHmac } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const API = 'http://127.0.0.1:8080'
const EVIDENCE = join(
  '/Users/lx/项目文件/liuxuan/小程序搭建运营系统',
  'agent-team/testing/evidence/BATCH-QA-010',
)
mkdirSync(EVIDENCE, { recursive: true })

const now = new Date().toISOString()
const stamp = now.replace(/[:.]/g, '-')
const results = []

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

function miniDsl(name = 'QA-API', extraComps = []) {
  return {
    schema_version: '1.0',
    page: { id: 'qa_api', name, type: 'custom', path: 'pages/custom/qa-api' },
    components: extraComps.length ? extraComps : [{ id: 'sp1', type: 'spacer', props: { height: 16 } }],
    global_config: { pull_refresh: false, reach_bottom_load: false },
  }
}

const dump = {}

const login = await req('POST', '/api/v1/admin/auth/login', { body: { username: 'admin', password: 'admin123' } })
dump.login = { http: login.http, code: login.json?.code, keys: login.json?.data ? Object.keys(login.json.data) : [] }
const token = login.json?.data?.accessToken
if (!token) {
  writeFileSync(join(EVIDENCE, 'api-db-results.json'), JSON.stringify({ error: 'login failed', login }, null, 2))
  throw new Error('login failed')
}

const dbPages = mysql('SELECT id,name,type,path,status,current_version FROM mp_page ORDER BY id')
dump.dbPages = dbPages
const list0 = await req('GET', '/api/v1/admin/pages?current=1&size=100', { token })
dump.list0 = { http: list0.http, code: list0.json?.code, total: list0.json?.data?.total, size: list0.json?.data?.size, current: list0.json?.data?.current, n: list0.json?.data?.records?.length }

// --- list ---
{
  const r = list0
  const records = r.json?.data?.records || []
  const pass = okBiz(r) && Array.isArray(records) && r.json.data.total >= 1
  rec('FP-API-001', pass ? 'PASS' : 'FAIL', pass ? `total=${r.json.data.total}` : `http=${r.http} code=${r.json?.code}`, { http: r.http, code: r.json?.code, db: dbPages.split('\n').length })
}

{
  const r = await req('GET', '/api/v1/admin/pages?keyword=__no_such_page_xyz__', { token })
  dump.emptyKeyword = r.json
  const total = r.json?.data?.total
  rec('FP-API-002', okBiz(r) && total === 0 ? 'PASS' : (okBiz(r) ? 'FAIL' : 'FAIL'), `total=${total} (filtered empty; env not globally empty)`)
}

{
  const r = await req('GET', '/api/v1/admin/pages?page=1', { token })
  dump.pageParam = { http: r.http, current: r.json?.data?.current, size: r.json?.data?.size, keys: r.json?.data ? Object.keys(r.json.data) : [] }
  const usesPage = r.json?.data && ('page' in r.json.data || Number(r.json.data.current) === 1) && /page=/.test('page=1')
  // Contract: page starts at 1. Implementation uses `current`. If `page` is ignored but current defaults 1, PARTIAL.
  const pass = okBiz(r) && Number(r.json?.data?.current) === 1 && r.json.data.page === 1
  rec('FP-API-003', pass ? 'PASS' : 'FAIL', `current=${r.json?.data?.current} pageField=${r.json?.data?.page} (contract page, impl current)`)
}

{
  const r = await req('GET', '/api/v1/admin/pages', { token })
  dump.defaultPageSize = { size: r.json?.data?.size, n: r.json?.data?.records?.length }
  rec('FP-API-004', okBiz(r) && Number(r.json?.data?.size) === 20 ? 'PASS' : 'FAIL', `default size=${r.json?.data?.size} expected 20`)
}

{
  const a = await req('GET', '/api/v1/admin/pages?page_size=101', { token })
  const b = await req('GET', '/api/v1/admin/pages?size=101', { token })
  dump.pageSizeOver = { page_size: { http: a.http, code: a.json?.code, size: a.json?.data?.size }, size: { http: b.http, code: b.json?.code, size: b.json?.data?.size } }
  const rejected = (x) => x.http >= 400 || (x.json && x.json.code && x.json.code !== 0 && x.json.code !== 200)
  rec('FP-API-005', rejected(a) || rejected(b) ? 'PASS' : 'FAIL', `page_size=101 size=${a.json?.data?.size}; size=101 size=${b.json?.data?.size}`)
}

{
  const r = await req('GET', '/api/v1/admin/pages?type=1', { token })
  const recs = r.json?.data?.records || []
  const all = recs.every((p) => p.type === 1 || p.type === 'home' || p.type === '1')
  rec('FP-API-006', okBiz(r) && recs.length > 0 && all ? 'PASS' : (okBiz(r) && recs.length === 0 ? 'PARTIAL' : 'FAIL'), `n=${recs.length} types=${[...new Set(recs.map((p) => p.type))]}`)
}

{
  const r = await req('GET', '/api/v1/admin/pages?status=1', { token })
  const recs = r.json?.data?.records || []
  const all = recs.every((p) => p.status === 1 || p.status === 'published')
  rec('FP-API-007', okBiz(r) && recs.length > 0 && all ? 'PASS' : 'FAIL', `n=${recs.length} statuses=${[...new Set(recs.map((p) => p.status))]}`)
}

{
  const r = await req('GET', '/api/v1/admin/pages?keyword=出海', { token })
  rec('FP-API-008', okBiz(r) && (r.json?.data?.total > 0) ? 'PASS' : 'FAIL', `total=${r.json?.data?.total}`)
}

{
  const r = await req('GET', '/api/v1/admin/pages')
  dump.unauthList = { http: r.http, code: r.json?.code, message: r.json?.message, text: r.text.slice(0, 300) }
  rec('FP-API-009', r.http === 401 && r.json?.code === 110101 ? 'PASS' : 'FAIL', `http=${r.http} code=${r.json?.code}`)
}

{
  const expired = mintJwt({ expOffsetSec: -3600 })
  const r = await req('GET', '/api/v1/admin/pages', { token: expired })
  dump.expired = { http: r.http, code: r.json?.code, message: r.json?.message, text: r.text.slice(0, 300) }
  rec('FP-API-010', r.http === 401 && r.json?.code === 110102 ? 'PASS' : 'FAIL', `http=${r.http} code=${r.json?.code}`)
}

{
  const r = await req('GET', '/api/v1/admin/pages?current=abc', { token })
  dump.badParam = { http: r.http, code: r.json?.code, message: r.json?.message }
  rec('FP-API-011', r.http === 400 && r.json?.code === 100101 ? 'PASS' : 'FAIL', `http=${r.http} code=${r.json?.code} msg=${r.json?.message}`)
}

const uniq = `qa-api-${Date.now()}`
const createBody = { name: `QA接口页-${uniq.slice(-6)}`, type: 3, path: `/pages/custom/${uniq}` }

{
  const r = await req('POST', '/api/v1/admin/pages', { token, body: createBody })
  dump.create = r.json
  const id = r.json?.data?.id
  rec('FP-API-012', (r.http === 200 || r.http === 201) && okBiz(r) && id ? 'PASS' : 'FAIL', `http=${r.http} id=${id}`)
}

const qaId = dump.create?.data?.id
const qaPath = createBody.path

{
  const r = await req('POST', '/api/v1/admin/pages', { token, body: { type: 3, path: `/pages/custom/${uniq}-noname` } })
  dump.createNoName = { http: r.http, code: r.json?.code, message: r.json?.message }
  rec('FP-API-013', r.http === 400 && r.json?.code === 100101 ? 'PASS' : 'FAIL', `http=${r.http} code=${r.json?.code}`)
}
{
  const r = await req('POST', '/api/v1/admin/pages', { token, body: { name: 'x', path: `/pages/custom/${uniq}-notype` } })
  dump.createNoType = { http: r.http, code: r.json?.code, message: r.json?.message }
  rec('FP-API-014', r.http === 400 && r.json?.code === 100101 ? 'PASS' : 'FAIL', `http=${r.http} code=${r.json?.code}`)
}
{
  const r = await req('POST', '/api/v1/admin/pages', { token, body: { name: 'x', type: 3 } })
  dump.createNoPath = { http: r.http, code: r.json?.code, message: r.json?.message }
  rec('FP-API-015', r.http === 400 && r.json?.code === 100101 ? 'PASS' : 'FAIL', `http=${r.http} code=${r.json?.code}`)
}
{
  const r = await req('POST', '/api/v1/admin/pages', { token, body: { name: 'N'.repeat(129), type: 3, path: `/pages/custom/${uniq}-long` } })
  dump.createLongName = { http: r.http, code: r.json?.code, message: r.json?.message }
  rec('FP-API-016', r.http >= 400 ? 'PASS' : 'FAIL', `http=${r.http} code=${r.json?.code}`)
}
{
  const r = await req('POST', '/api/v1/admin/pages', { token, body: { name: 'x', type: 99, path: `/pages/custom/${uniq}-badtype` } })
  dump.createBadType = { http: r.http, code: r.json?.code, message: r.json?.message, id: r.json?.data?.id }
  rec('FP-API-017', r.http >= 400 ? 'PASS' : 'FAIL', `http=${r.http} code=${r.json?.code} created=${!!r.json?.data?.id}`)
}
{
  const r = await req('POST', '/api/v1/admin/pages', { token, raw: '{not-json', headers: { 'Content-Type': 'application/json' } })
  dump.createBadJson = { http: r.http, code: r.json?.code, message: r.json?.message }
  rec('FP-API-018', r.http === 400 && r.json?.code === 100102 ? 'PASS' : 'FAIL', `http=${r.http} code=${r.json?.code}`)
}
{
  const r = await req('POST', '/api/v1/admin/pages', { body: createBody })
  rec('FP-API-019', r.http === 401 && r.json?.code === 110101 ? 'PASS' : 'FAIL', `http=${r.http} code=${r.json?.code}`)
}
{
  rec('FP-API-020', 'BLOCKED', '环境仅超管 admin，未创建低权限账号（总控禁止额外开账号）')
}

{
  const r = await req('POST', '/api/v1/admin/pages', { token, body: createBody })
  dump.createDup = { http: r.http, code: r.json?.code, message: r.json?.message, id: r.json?.data?.id }
  const rejected = r.http >= 400 || (r.json && r.json.code !== 0 && r.json.code !== 200)
  rec('FP-API-021', rejected && !r.json?.data?.id ? 'PASS' : 'FAIL', `second create http=${r.http} code=${r.json?.code}`)
}

{
  const r = await req('GET', `/api/v1/admin/pages/${qaId}`, { token })
  dump.detail = r.json
  rec('FP-API-022', okBiz(r) && String(r.json?.data?.id) === String(qaId) ? 'PASS' : 'FAIL', `id=${r.json?.data?.id}`)
}
{
  const r = await req('GET', '/api/v1/admin/pages/999999001', { token })
  dump.detail404 = { http: r.http, code: r.json?.code, message: r.json?.message }
  rec('FP-API-023', r.http === 404 || r.json?.code === 404 || r.json?.code === 300401 ? 'PASS' : 'FAIL', `http=${r.http} code=${r.json?.code}`)
}
{
  const r = await req('GET', '/api/v1/admin/pages/abc', { token })
  dump.detailBadId = { http: r.http, code: r.json?.code, message: r.json?.message }
  rec('FP-API-024', r.http >= 400 ? 'PASS' : 'FAIL', `http=${r.http} code=${r.json?.code}`)
}
{
  const r = await req('GET', `/api/v1/admin/pages/${qaId}`)
  rec('FP-API-025', r.http === 401 && r.json?.code === 110101 ? 'PASS' : 'FAIL', `http=${r.http} code=${r.json?.code}`)
}

{
  const r = await req('PUT', `/api/v1/admin/pages/${qaId}`, { token, body: { name: `QA接口页-改名`, description: 'updated' } })
  dump.update = r.json
  const db = mysql(`SELECT name,description FROM mp_page WHERE id=${qaId}`)
  rec('FP-API-026', okBiz(r) && db.includes('QA接口页-改名') ? 'PASS' : 'FAIL', `db=${db} code=${r.json?.code}`)
}
{
  const r = await req('PUT', '/api/v1/admin/pages/999999001', { token, body: { name: 'nope' } })
  rec('FP-API-027', r.http === 404 || r.json?.code === 300401 ? 'PASS' : 'FAIL', `http=${r.http} code=${r.json?.code}`)
}
{
  const r = await req('PUT', `/api/v1/admin/pages/${qaId}`, { token, body: {} })
  dump.updateEmpty = { http: r.http, code: r.json?.code }
  rec('FP-API-028', r.http >= 400 ? 'PASS' : 'FAIL', `empty PUT http=${r.http} code=${r.json?.code} (UpdateDTO fields optional — may not 400)`)
}
{
  const r = await req('PUT', `/api/v1/admin/pages/${qaId}`, { body: { name: 'x' } })
  rec('FP-API-029', r.http === 401 && r.json?.code === 110101 ? 'PASS' : 'FAIL', `http=${r.http} code=${r.json?.code}`)
}
rec('FP-API-030', 'BLOCKED', '无低于 content_ops 的第二账号')

{
  const r1 = await req('PUT', `/api/v1/admin/pages/${qaId}`, { token, body: { description: 'idem-1' } })
  const r2 = await req('PUT', `/api/v1/admin/pages/${qaId}`, { token, body: { description: 'idem-1' } })
  rec('FP-API-031', okBiz(r1) && okBiz(r2) ? 'PASS' : 'FAIL', `repeat PUT codes ${r1.json?.code}/${r2.json?.code}`)
}

// draft page for delete success
const delCreate = await req('POST', '/api/v1/admin/pages', { token, body: { name: `QA待删-${uniq.slice(-4)}`, type: 3, path: `/pages/custom/${uniq}-del` } })
const delId = delCreate.json?.data?.id
{
  const r = await req('DELETE', `/api/v1/admin/pages/${delId}`, { token })
  const db = mysql(`SELECT id,deleted FROM mp_page WHERE id=${delId}`)
  dump.deleteDraft = { http: r.http, code: r.json?.code, db }
  rec('FP-API-032', okBiz(r) && (!db || db.includes('\t1') || db === '') ? 'PASS' : 'FAIL', `http=${r.http} db=${db}`)
}
{
  const r = await req('DELETE', '/api/v1/admin/pages/1', { token })
  dump.deleteHome = { http: r.http, code: r.json?.code, message: r.json?.message }
  rec('FP-API-033', r.json?.code === 300201 ? 'PASS' : 'FAIL', `DELETE id=1 http=${r.http} code=${r.json?.code} msg=${r.json?.message}`)
}
{
  const r = await req('DELETE', '/api/v1/admin/pages/999999001', { token })
  rec('FP-API-034', r.http === 404 || r.json?.code === 300401 ? 'PASS' : 'FAIL', `http=${r.http} code=${r.json?.code}`)
}
{
  const r = await req('DELETE', `/api/v1/admin/pages/${qaId}`)
  rec('FP-API-035', r.http === 401 && r.json?.code === 110101 ? 'PASS' : 'FAIL', `http=${r.http} code=${r.json?.code}`)
}
rec('FP-API-036', 'BLOCKED', '无低于 content_ops 的第二账号')
{
  const r = await req('DELETE', `/api/v1/admin/pages/${delId}`, { token })
  dump.deleteAgain = { http: r.http, code: r.json?.code, message: r.json?.message }
  rec('FP-API-037', r.http === 404 || r.json?.code === 300401 || okBiz(r) ? 'PASS' : 'FAIL', `repeat DELETE http=${r.http} code=${r.json?.code}`)
}

const dsl = miniDsl()
{
  const r = await req('POST', `/api/v1/admin/pages/${qaId}/draft`, { token, body: { dslContent: JSON.stringify(dsl) } })
  dump.draft1 = r.json
  const db = mysql(`SELECT version,status FROM mp_page_version WHERE page_id=${qaId} ORDER BY version`)
  rec('FP-API-038', okBiz(r) ? 'PASS' : 'FAIL', `code=${r.json?.code} versions=${db.replace(/\n/g, ' | ')}`)
}
{
  const r = await req('POST', `/api/v1/admin/pages/${qaId}/draft`, { token, body: {} })
  rec('FP-API-039', r.http >= 400 ? 'PASS' : 'FAIL', `http=${r.http} code=${r.json?.code}`)
}
{
  const r = await req('POST', `/api/v1/admin/pages/${qaId}/draft`, { token, body: { dslContent: '{bad' } })
  dump.draftBadJson = { http: r.http, code: r.json?.code, message: r.json?.message }
  rec('FP-API-040', r.http >= 400 ? 'PASS' : 'FAIL', `http=${r.http} code=${r.json?.code}`)
}
{
  const r = await req('POST', '/api/v1/admin/pages/999999001/draft', { token, body: { dslContent: JSON.stringify(dsl) } })
  rec('FP-API-041', r.http === 404 || r.json?.code === 300401 ? 'PASS' : 'FAIL', `http=${r.http} code=${r.json?.code}`)
}
{
  const r = await req('POST', `/api/v1/admin/pages/${qaId}/draft`, { body: { dslContent: JSON.stringify(dsl) } })
  rec('FP-API-042', r.http === 401 && r.json?.code === 110101 ? 'PASS' : 'FAIL', `http=${r.http} code=${r.json?.code}`)
}
rec('FP-API-043', 'BLOCKED', '无低于 content_ops 的第二账号')

{
  const verRow = mysql(`SELECT MAX(version) FROM mp_page_version WHERE page_id=${qaId}`)
  const stale = Number(verRow) > 0 ? Number(verRow) - 1 : 0
  const r = await req('POST', `/api/v1/admin/pages/${qaId}/draft`, { token, body: { dslContent: JSON.stringify(dsl), expectedVersion: stale } })
  dump.draftConflict = { stale, http: r.http, code: r.json?.code, message: r.json?.message }
  rec('FP-API-044', r.http === 409 || /冲突|修改/.test(r.json?.message || '') ? 'PASS' : 'FAIL', `http=${r.http} code=${r.json?.code} msg=${r.json?.message}`)
}
{
  const cur = Number(mysql(`SELECT MAX(version) FROM mp_page_version WHERE page_id=${qaId}`))
  const r1 = await req('POST', `/api/v1/admin/pages/${qaId}/draft`, { token, body: { dslContent: JSON.stringify(dsl), expectedVersion: cur } })
  const r2 = await req('POST', `/api/v1/admin/pages/${qaId}/draft`, { token, body: { dslContent: JSON.stringify(dsl), expectedVersion: cur } })
  dump.draftIdem = { cur, c1: r1.json?.code, c2: r2.json?.code, m2: r2.json?.message }
  rec('FP-API-045', okBiz(r1) && (r2.http === 409 || /冲突|修改/.test(r2.json?.message || '') || okBiz(r2)) ? 'PARTIAL' : 'FAIL', `first=${r1.json?.code} second=${r2.json?.code}`)
}

{
  const r = await req('POST', `/api/v1/admin/pages/${qaId}/publish`, { token })
  dump.publish = r.json
  const db = mysql(`SELECT status,current_version FROM mp_page WHERE id=${qaId}`)
  rec('FP-API-046', okBiz(r) && db.startsWith('1\t') ? 'PASS' : 'FAIL', `db=${db} code=${r.json?.code}`)
}
{
  const r = await req('POST', '/api/v1/admin/pages/999999001/publish', { token })
  rec('FP-API-047', r.http === 404 || r.json?.code === 300401 ? 'PASS' : 'FAIL', `http=${r.http} code=${r.json?.code}`)
}
{
  const r = await req('POST', `/api/v1/admin/pages/${qaId}/publish`)
  rec('FP-API-048', r.http === 401 && r.json?.code === 110101 ? 'PASS' : 'FAIL', `http=${r.http} code=${r.json?.code}`)
}
rec('FP-API-049', 'BLOCKED', '无低于 content_ops 的第二账号')
{
  const before = mysql(`SELECT current_version FROM mp_page WHERE id=${qaId}`)
  const r = await req('POST', `/api/v1/admin/pages/${qaId}/publish`, { token })
  const after = mysql(`SELECT current_version FROM mp_page WHERE id=${qaId}`)
  dump.republish = { before, after, http: r.http, code: r.json?.code, message: r.json?.message }
  rec('FP-API-050', okBiz(r) || r.http >= 400 ? 'PARTIAL' : 'FAIL', `repeat publish ${before}->${after} http=${r.http} code=${r.json?.code}`)
}

{
  const r = await req('POST', `/api/v1/admin/pages/${qaId}/unpublish`, { token })
  dump.unpublish = r.json
  const db = mysql(`SELECT status FROM mp_page WHERE id=${qaId}`)
  rec('FP-API-051', okBiz(r) && db === '2' ? 'PASS' : 'FAIL', `db status=${db} code=${r.json?.code}`)
}
{
  const r = await req('POST', `/api/v1/admin/pages/${qaId}/unpublish`, { token })
  dump.unpublishAgain = { http: r.http, code: r.json?.code, message: r.json?.message }
  rec('FP-API-052', r.http === 422 || r.json?.code === 422 ? 'PASS' : 'FAIL', `second unpublish http=${r.http} code=${r.json?.code}`)
}
{
  const r = await req('POST', '/api/v1/admin/pages/999999001/unpublish', { token })
  rec('FP-API-053', r.http === 404 || r.json?.code === 300401 ? 'PASS' : 'FAIL', `http=${r.http} code=${r.json?.code}`)
}
{
  const r = await req('POST', `/api/v1/admin/pages/${qaId}/unpublish`)
  rec('FP-API-054', r.http === 401 && r.json?.code === 110101 ? 'PASS' : 'FAIL', `http=${r.http} code=${r.json?.code}`)
}
rec('FP-API-055', 'BLOCKED', '无低于 content_ops 的第二账号')
{
  rec('FP-API-056', dump.unpublishAgain ? (dump.unpublishAgain.http >= 400 ? 'PASS' : 'FAIL') : 'FAIL', `repeat unpublish http=${dump.unpublishAgain?.http} code=${dump.unpublishAgain?.code}`)
}

{
  const r = await req('GET', `/api/v1/admin/pages/${qaId}/versions`, { token })
  dump.versions = r.json
  rec('FP-API-057', okBiz(r) && (r.json?.data?.records?.length > 0 || Array.isArray(r.json?.data)) ? 'PASS' : 'FAIL', `type=${typeof r.json?.data} n=${r.json?.data?.records?.length ?? r.json?.data?.length}`)
}

const emptyVerCreate = await req('POST', '/api/v1/admin/pages', { token, body: { name: `QA无版本-${uniq.slice(-4)}`, type: 3, path: `/pages/custom/${uniq}-nover` } })
const emptyVerId = emptyVerCreate.json?.data?.id
{
  const r = await req('GET', `/api/v1/admin/pages/${emptyVerId}/versions`, { token })
  dump.emptyVersions = r.json
  const n = r.json?.data?.records?.length ?? r.json?.data?.length ?? -1
  rec('FP-API-058', okBiz(r) && n === 0 ? 'PASS' : 'FAIL', `n=${n} (create may auto-insert v1)`)
}
{
  const r = await req('GET', '/api/v1/admin/pages/999999001/versions', { token })
  rec('FP-API-059', r.http === 404 || r.json?.code === 300401 || (okBiz(r) && (r.json?.data?.records?.length === 0)) ? 'FAIL' : (r.http === 404 || r.json?.code === 300401 ? 'PASS' : 'FAIL'), `http=${r.http} code=${r.json?.code}`)
  // fix: if 404 PASS
  results[results.length - 1].status = (r.http === 404 || r.json?.code === 300401) ? 'PASS' : 'FAIL'
  results[results.length - 1].note = `http=${r.http} code=${r.json?.code}`
}
{
  const r = await req('GET', `/api/v1/admin/pages/${qaId}/versions`)
  rec('FP-API-060', r.http === 401 && r.json?.code === 110101 ? 'PASS' : 'FAIL', `http=${r.http} code=${r.json?.code}`)
}

{
  await req('POST', `/api/v1/admin/pages/${qaId}/draft`, { token, body: { dslContent: JSON.stringify(miniDsl('v2')) } })
  await req('POST', `/api/v1/admin/pages/${qaId}/publish`, { token })
  const vers = mysql(`SELECT version,status FROM mp_page_version WHERE page_id=${qaId} ORDER BY version`)
  const firstVer = Number((vers.split('\n')[0] || '1').split('\t')[0])
  const beforeMax = Number(mysql(`SELECT MAX(version) FROM mp_page_version WHERE page_id=${qaId}`))
  const r = await req('POST', `/api/v1/admin/pages/${qaId}/versions/${firstVer}/rollback`, { token })
  const afterMax = Number(mysql(`SELECT MAX(version) FROM mp_page_version WHERE page_id=${qaId}`))
  dump.rollback = { firstVer, beforeMax, afterMax, http: r.http, code: r.json?.code, message: r.json?.message, vers }
  rec('FP-API-061', okBiz(r) && afterMax > beforeMax ? 'PASS' : 'FAIL', `${beforeMax}->${afterMax} http=${r.http} code=${r.json?.code}`)
}
{
  const r = await req('POST', '/api/v1/admin/pages/999999001/versions/1/rollback', { token })
  rec('FP-API-062', r.http === 404 || r.json?.code === 300401 ? 'PASS' : 'FAIL', `http=${r.http} code=${r.json?.code}`)
}
{
  const r = await req('POST', `/api/v1/admin/pages/${qaId}/versions/99999/rollback`, { token })
  rec('FP-API-063', r.http === 404 || r.json?.code === 300402 || r.json?.code === 300401 ? 'PASS' : 'FAIL', `http=${r.http} code=${r.json?.code}`)
}
{
  const r = await req('POST', `/api/v1/admin/pages/${qaId}/versions/1/rollback`)
  rec('FP-API-064', r.http === 401 && r.json?.code === 110101 ? 'PASS' : 'FAIL', `http=${r.http} code=${r.json?.code}`)
}
rec('FP-API-065', 'BLOCKED', '无低于 content_ops 的第二账号')
{
  const beforeMax = Number(mysql(`SELECT MAX(version) FROM mp_page_version WHERE page_id=${qaId}`))
  const r = await req('POST', `/api/v1/admin/pages/${qaId}/versions/1/rollback`, { token })
  const afterMax = Number(mysql(`SELECT MAX(version) FROM mp_page_version WHERE page_id=${qaId}`))
  dump.rollback2 = { beforeMax, afterMax, http: r.http, code: r.json?.code }
  rec('FP-API-066', okBiz(r) && afterMax === beforeMax + 1 ? 'PASS' : (okBiz(r) ? 'PARTIAL' : 'FAIL'), `repeat rollback ${beforeMax}->${afterMax}`)
}

{
  const r = await req('GET', '/api/v1/admin/page-templates', { token })
  dump.templates = { http: r.http, code: r.json?.code, total: r.json?.data?.total, n: r.json?.data?.records?.length ?? r.json?.data?.length }
  rec('FP-API-067', okBiz(r) ? 'PASS' : 'FAIL', `http=${r.http} total=${dump.templates.total}`)
}
{
  const r = await req('GET', '/api/v1/admin/page-templates?keyword=__no_tpl_xyz__', { token })
  const n = r.json?.data?.total ?? r.json?.data?.records?.length
  rec('FP-API-068', okBiz(r) && (n === 0 || n === undefined) ? 'PASS' : 'FAIL', `n=${n}`)
}
{
  const r = await req('GET', '/api/v1/admin/page-templates')
  rec('FP-API-069', r.http === 401 && r.json?.code === 110101 ? 'PASS' : 'FAIL', `http=${r.http} code=${r.json?.code}`)
}

const homePath = mysql("SELECT path FROM mp_page WHERE id=1")
{
  const encoded = encodeURIComponent(homePath.replace(/^\//, ''))
  const r = await req('GET', `/api/v1/mp/pages?path=${encodeURIComponent(homePath)}`)
  dump.mpPage = { homePath, http: r.http, code: r.json?.code, keys: r.json?.data ? Object.keys(r.json.data) : [], text: r.text.slice(0, 400) }
  rec('FP-API-070', okBiz(r) && r.json?.data ? 'PASS' : 'FAIL', `path=${homePath} http=${r.http} code=${r.json?.code}`)
}
{
  const r = await req('GET', '/api/v1/mp/pages?path=pages/custom/does-not-exist-xyz')
  rec('FP-API-071', r.http === 404 || r.json?.code === 404 || r.json?.code === 300401 ? 'PASS' : 'FAIL', `http=${r.http} code=${r.json?.code}`)
}

const draftOnlyPath = `/pages/custom/${uniq}-draftonly`
const draftOnly = await req('POST', '/api/v1/admin/pages', { token, body: { name: 'QA仅草稿', type: 3, path: draftOnlyPath } })
const draftOnlyId = draftOnly.json?.data?.id
if (draftOnlyId) {
  await req('POST', `/api/v1/admin/pages/${draftOnlyId}/draft`, { token, body: { dslContent: JSON.stringify(miniDsl('draft-only')) } })
}
{
  const r = await req('GET', `/api/v1/mp/pages?path=${encodeURIComponent(draftOnlyPath)}`)
  dump.mpDraftOnly = { http: r.http, code: r.json?.code, message: r.json?.message }
  rec('FP-API-072', r.http === 404 || r.json?.code === 404 || /未发布|不存在/.test(r.json?.message || '') ? 'PASS' : 'FAIL', `http=${r.http} code=${r.json?.code} msg=${r.json?.message}`)
}
{
  const r = await req('GET', `/api/v1/mp/pages?path=${encodeURIComponent(homePath)}`)
  rec('FP-API-073', okBiz(r) ? 'PASS' : 'FAIL', `no token http=${r.http} code=${r.json?.code}`)
}

rec('FP-API-074', 'BLOCKED', '禁止禁用超管账号；环境无其它可禁用账号')

{
  const calls = []
  for (let i = 0; i < 80; i++) calls.push(req('GET', '/api/v1/admin/pages', { token }))
  const rs = await Promise.all(calls)
  const hit = rs.filter((x) => x.http === 429 || x.json?.code === 100201)
  dump.ratelimit = { n: rs.length, hit: hit.length, codes: [...new Set(rs.map((x) => x.json?.code))] }
  rec('FP-API-075', hit.length ? 'PASS' : 'FAIL', `80 concurrent, 100201/429 count=${hit.length}`)
}

{
  const cols = mysql('SHOW COLUMNS FROM mp_page')
  dump.pageCols = cols
  rec('FP-API-076', /tenant/i.test(cols) ? 'FAIL' : 'BLOCKED', /tenant/i.test(cols) ? '有 tenant 列但未测跨租户' : 'mp_page 无租户字段，无法测越权')
}

{
  const idType = typeof dump.create?.data?.id
  rec('FP-API-077', idType === 'string' ? 'PASS' : 'FAIL', `create id typeof ${idType} value=${dump.create?.data?.id}`)
}

{
  const r = await req('GET', '/api/v1/admin/pages/%00', { token })
  dump.maybe500 = { http: r.http, code: r.json?.code, keys: r.json ? Object.keys(r.json) : [], text: r.text.slice(0, 400) }
  const structured = r.json && 'code' in r.json && 'message' in r.json
  rec('FP-API-078', r.http >= 500 ? (structured ? 'PASS' : 'FAIL') : 'BLOCKED', `could not force 500; sample http=${r.http} structured=${structured}`)
}

// DB
{
  const show = mysql('SHOW CREATE TABLE mp_page_version')
  dump.createVersionTable = show
  const ins = mysql(`INSERT INTO mp_page_version (page_id, version, dsl_content, status) SELECT ${qaId}, version, '{}', 0 FROM mp_page_version WHERE page_id=${qaId} LIMIT 1`)
  dump.ukInsert = ins
  rec('FP-DB-001', /Duplicate|uk_page_version|1062/.test(ins) ? 'PASS' : 'FAIL', ins.slice(0, 200))
}
{
  const fk = mysql('SELECT CONSTRAINT_NAME, DELETE_RULE FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME="mp_page_version"')
  dump.fk = fk
  rec('FP-DB-002', /CASCADE|RESTRICT|SET NULL/.test(fk) ? 'PASS' : 'FAIL', fk || 'no FK')
}
{
  const idx = mysql('SHOW INDEX FROM mp_page WHERE Column_name="path"')
  rec('FP-DB-003', idx.length > 0 ? 'PASS' : 'FAIL', idx.slice(0, 200))
}
{
  const bad = mysql(`INSERT INTO mp_page_version (page_id, version, dsl_content, status) VALUES (${qaId}, 999001, 'not-json', 0)`)
  dump.badJsonInsert = bad
  rec('FP-DB-004', /Invalid JSON|3140|3141|error/i.test(bad) ? 'PASS' : 'FAIL', bad.slice(0, 200))
}
{
  const row = mysql(`SELECT p.current_version, (SELECT MAX(v.version) FROM mp_page_version v WHERE v.page_id=p.id AND v.status=1) pub FROM mp_page p WHERE p.id=${qaId}`)
  dump.currentVsPub = row
  const [cur, pub] = row.split('\t')
  rec('FP-DB-005', cur && pub && cur === pub ? 'PASS' : 'FAIL', `current=${cur} publishedMax=${pub}`)
}

// unpublish QA page if still published so we don't leave extra published custom pages? optional
await req('POST', `/api/v1/admin/pages/${qaId}/unpublish`, { token }).catch(() => {})

const summary = results.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc }, {})
const out = { stamp, qaId, qaPath, summary, results, dump }
writeFileSync(join(EVIDENCE, 'api-db-results.json'), JSON.stringify(out, null, 2))
writeFileSync(join(EVIDENCE, 'api-db-summary.txt'), `${JSON.stringify(summary)}\n${results.map((r) => `${r.id}\t${r.status}\t${r.note}`).join('\n')}\n`)
console.log('SUMMARY', summary)
console.log('evidence', EVIDENCE)
