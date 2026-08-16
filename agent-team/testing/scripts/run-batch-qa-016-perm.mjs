#!/usr/bin/env node
/**
 * BATCH-QA-016: permission matrix + forms/members 500 + disable account.
 * Uses qa_staff / qa_temp. Evidence only. Does not publish homepage id=1.
 */
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const require = createRequire('/Users/lx/.npm/_npx/31e32ef8478fbf80/node_modules/playwright/package.json')
const { chromium } = require('playwright')

const API = 'http://127.0.0.1:8080'
const ADMIN = 'http://127.0.0.1:3000'
const ROOT = '/Users/lx/项目文件/liuxuan/小程序搭建运营系统'
const EVID = join(ROOT, 'agent-team/testing/evidence/BATCH-QA-016')
mkdirSync(EVID, { recursive: true })

const now = new Date().toISOString()
const results = []
const dump = { batch: 'BATCH-QA-016', started: now }

function rec(id, status, note, extra = {}) {
  results.push({ id, status, note, time: now, ...extra })
  console.log(`${id} ${status} ${note}`)
}

async function req(method, path, { token, body } = {}) {
  const h = { Accept: 'application/json' }
  if (token) h.Authorization = `Bearer ${token}`
  if (body !== undefined) h['Content-Type'] = 'application/json'
  const res = await fetch(API + path, {
    method,
    headers: h,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json = null
  try { json = JSON.parse(text) } catch {}
  return { http: res.status, json, text: text.slice(0, 2500) }
}

function expectForbidden(r) {
  // Contract: 403 + 200301 for insufficient role
  return r.http === 403 && (r.json?.code === 200301 || r.json?.code === 403)
}

function okBiz(r) {
  return r.http >= 200 && r.http < 300 && (r.json?.code === 0 || r.json?.code === 200)
}

const adminLogin = await req('POST', '/api/v1/admin/auth/login', { body: { username: 'admin', password: 'admin123' } })
const adminToken = adminLogin.json?.data?.accessToken
if (!adminToken) throw new Error('admin login failed')

const staffLogin = await req('POST', '/api/v1/admin/auth/login', { body: { username: 'qa_staff', password: 'QaStaff123' } })
const staffToken = staffLogin.json?.data?.accessToken
dump.staffLogin = { http: staffLogin.http, code: staffLogin.json?.code, role: staffLogin.json?.data?.roleCode }
if (!staffToken) throw new Error('qa_staff login failed')

const tempLogin = await req('POST', '/api/v1/admin/auth/login', { body: { username: 'qa_temp', password: 'QaTemp123' } })
const tempToken = tempLogin.json?.data?.accessToken
dump.tempLogin = { http: tempLogin.http, code: tempLogin.json?.code }

// Find a page id for write ops
const list = await req('GET', '/api/v1/admin/pages?current=1&size=20', { token: adminToken })
const pages = list.json?.data?.records || []
const draft = pages.find((p) => p.id !== 1 && (p.status === 0 || p.status === '0')) || pages.find((p) => p.id !== 1) || pages[0]
const pageId = draft?.id
dump.pageId = pageId

// FP-API-020 create page role insufficient
{
  const r = await req('POST', '/api/v1/admin/pages', {
    token: staffToken,
    body: { name: 'QA016权限拒绝', type: 3, path: `pages/custom/qa016-deny-${Date.now()}` },
  })
  dump.api020 = { http: r.http, code: r.json?.code, msg: r.json?.message, created: okBiz(r), id: r.json?.data?.id }
  if (expectForbidden(r)) rec('FP-API-020', 'PASS', `拒绝 http=${r.http} code=${r.json?.code}`)
  else if (okBiz(r)) rec('FP-API-020', 'FAIL', `低权限仍可创建页面 id=${r.json?.data?.id}`, { bug: 'BUG-API-011' })
  else rec('FP-API-020', 'FAIL', `非契约拒绝 http=${r.http} code=${r.json?.code}`, { bug: 'BUG-API-011' })
  // cleanup if created
  if (okBiz(r) && r.json?.data?.id) {
    await req('DELETE', `/api/v1/admin/pages/${r.json.data.id}`, { token: adminToken })
  }
}

async function staffWrite(id, method, path, body) {
  const r = await req(method, path, { token: staffToken, body })
  dump[id] = { http: r.http, code: r.json?.code, msg: r.json?.message }
  if (expectForbidden(r)) rec(id, 'PASS', `拒绝 http=${r.http} code=${r.json?.code}`)
  else if (okBiz(r)) rec(id, 'FAIL', `低权限写成功 http=${r.http} code=${r.json?.code}`, { bug: 'BUG-API-011' })
  else rec(id, 'FAIL', `非契约拒绝 http=${r.http} code=${r.json?.code}`, { bug: 'BUG-API-011' })
}

if (pageId) {
  await staffWrite('FP-API-030', 'PUT', `/api/v1/admin/pages/${pageId}`, { name: 'QA016-hack' })
  await staffWrite('FP-API-036', 'DELETE', `/api/v1/admin/pages/999991016`)
  await staffWrite('FP-API-043', 'POST', `/api/v1/admin/pages/${pageId}/draft`, {
    content: {
      schema_version: '1.0',
      page: { id: String(pageId), name: 'x', type: 'custom', path: 'pages/custom/x' },
      components: [{ id: 'sp1', type: 'spacer', props: { height: 8 } }],
      global_config: {},
    },
    base_version: 0,
  })
  await staffWrite('FP-API-049', 'POST', `/api/v1/admin/pages/${pageId}/publish`)
  await staffWrite('FP-API-055', 'POST', `/api/v1/admin/pages/${pageId}/unpublish`)
  await staffWrite('FP-API-065', 'POST', `/api/v1/admin/pages/${pageId}/versions/1/rollback`)
} else {
  for (const id of ['FP-API-030', 'FP-API-036', 'FP-API-043', 'FP-API-049', 'FP-API-055', 'FP-API-065']) {
    rec(id, 'BLOCKED', '无可用页面 id')
  }
}

// FP-API-074 disabled account
{
  // disable qa_temp
  const users = await req('GET', '/api/v1/admin/admin-users?current=1&size=20', { token: adminToken })
  const temp = (users.json?.data?.records || []).find((u) => u.username === 'qa_temp')
  dump.tempUser = temp
  if (!temp?.id) {
    rec('FP-API-074', 'BLOCKED', '找不到 qa_temp')
  } else {
    const dis = await req('PUT', `/api/v1/admin/admin-users/${temp.id}`, {
      token: adminToken,
      body: { username: 'qa_temp', realName: 'QA可禁用账号', roleId: 4, status: 0 },
    })
    dump.disable = { http: dis.http, code: dis.json?.code }
    const loginDis = await req('POST', '/api/v1/admin/auth/login', { body: { username: 'qa_temp', password: 'QaTemp123' } })
    dump.loginDisabled = { http: loginDis.http, code: loginDis.json?.code, msg: loginDis.json?.message }
    // Contract 110103 for disabled; also try using old token if any
    const pass =
      (loginDis.http === 403 || loginDis.http === 401) &&
      (loginDis.json?.code === 110103 || loginDis.json?.code === 110101 || /禁用|停用|disabled/i.test(loginDis.json?.message || ''))
    rec(
      'FP-API-074',
      pass ? 'PASS' : (loginDis.json?.code === 200 && loginDis.json?.data?.accessToken ? 'FAIL' : 'FAIL'),
      `禁用后登录 http=${loginDis.http} code=${loginDis.json?.code} msg=${loginDis.json?.message}`,
      { bug: pass ? '' : 'BUG-API-012' },
    )
    // re-enable for future
    await req('PUT', `/api/v1/admin/admin-users/${temp.id}`, {
      token: adminToken,
      body: { username: 'qa_temp', realName: 'QA可禁用账号', roleId: 4, status: 1 },
    })
  }
}

// forms / members 500
{
  const forms = await req('GET', '/api/v1/admin/forms?current=1&size=10', { token: adminToken })
  dump.forms = { http: forms.http, code: forms.json?.code, msg: forms.json?.message, text: forms.text.slice(0, 500) }
  rec('EXP-LINE3-ADMIN-CREATE', forms.http === 500 || forms.json?.code === 500 ? 'FAIL' : (okBiz(forms) ? 'PARTIAL' : 'FAIL'),
    `GET /admin/forms http=${forms.http} code=${forms.json?.code}`, { bug: 'BUG-FORM-005' })

  const members = await req('GET', '/api/v1/admin/members?current=1&size=10', { token: adminToken })
  dump.members = { http: members.http, code: members.json?.code, msg: members.json?.message, text: members.text.slice(0, 500) }
  rec('EXP-MEMBER-LIST', members.http === 500 || members.json?.code === 500 ? 'FAIL' : (okBiz(members) ? 'PARTIAL' : 'FAIL'),
    `GET /admin/members http=${members.http} code=${members.json?.code}`, { bug: 'BUG-MEMBER-003' })
}

// UI no-permission state with Playwright
let browser
try {
  browser = await chromium.launch({ headless: true, channel: 'chrome' })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()

  async function dismissPwd(p) {
    const dlg = p.locator('.el-dialog').filter({ hasText: '请修改初始密码' })
    if (await dlg.first().isVisible({ timeout: 1500 }).catch(() => false)) {
      await p.locator('.el-dialog__headerbtn').first().click().catch(() => p.keyboard.press('Escape'))
      await p.waitForTimeout(300)
    }
  }

  await page.goto(`${ADMIN}/login`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.getByPlaceholder(/用户名|账号/).fill('qa_staff')
  await page.getByPlaceholder(/密码/).fill('QaStaff123')
  await page.getByRole('button', { name: /登\s*录|登录/ }).click()
  await page.waitForTimeout(1500)
  await dismissPwd(page)
  await page.goto(`${ADMIN}/page-builder`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {})
  await dismissPwd(page)
  await page.waitForTimeout(800)
  const bodyText = await page.locator('body').innerText().catch(() => '')
  await page.screenshot({ path: join(EVID, '01-qa-staff-page-builder.png'), fullPage: true })
  const deniedUi = /无权限|没有权限|403|Forbidden|权限不足/.test(bodyText)
  const canNew = await page.getByRole('button', { name: /新建/ }).count()
  dump.ui005 = { deniedUi, canNew, url: page.url(), snippet: bodyText.slice(0, 300) }
  // FP-UI-005: 无权限态 — if staff can fully use page builder, FAIL
  if (deniedUi) rec('FP-UI-005', 'PASS', '展示无权限态')
  else if (canNew > 0 || /页面管理|新建页面/.test(bodyText)) {
    rec('FP-UI-005', 'FAIL', '低权限仍可见页面管理/新建', { bug: 'BUG-UI-015' })
  } else {
    rec('FP-UI-005', 'PARTIAL', `未见明确无权限文案 url=${page.url()}`)
  }

  // FP-UI-029: editor no permission — try open editor
  if (pageId) {
    await page.goto(`${ADMIN}/page-builder/editor/${pageId}`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {})
    await dismissPwd(page)
    await page.waitForTimeout(800)
    const t2 = await page.locator('body').innerText().catch(() => '')
    await page.screenshot({ path: join(EVID, '02-qa-staff-editor.png'), fullPage: true })
    const deniedEd = /无权限|没有权限|403|权限不足/.test(t2)
    const hasCanvas = /组件|画布|保存|发布/.test(t2)
    dump.ui029 = { deniedEd, hasCanvas, url: page.url() }
    if (deniedEd) rec('FP-UI-029', 'PASS', '编辑器无权限态')
    else if (hasCanvas) rec('FP-UI-029', 'FAIL', '低权限仍可进入装修器', { bug: 'BUG-UI-015' })
    else rec('FP-UI-029', 'PARTIAL', `表现不明 url=${page.url()}`)
  } else {
    rec('FP-UI-029', 'BLOCKED', '无 pageId')
  }
} catch (e) {
  dump.uiError = String(e)
  rec('FP-UI-005', 'BLOCKED', `UI 未跑起来: ${e.message}`)
  rec('FP-UI-029', 'BLOCKED', `UI 未跑起来: ${e.message}`)
} finally {
  if (browser) await browser.close()
}

const summary = {
  PASS: results.filter((r) => r.status === 'PASS').length,
  FAIL: results.filter((r) => r.status === 'FAIL').length,
  PARTIAL: results.filter((r) => r.status === 'PARTIAL').length,
  BLOCKED: results.filter((r) => r.status === 'BLOCKED').length,
}
dump.finished = new Date().toISOString()
dump.results = results
dump.summary = summary
writeFileSync(join(EVID, 'results.json'), JSON.stringify(dump, null, 2))
writeFileSync(join(EVID, '00-summary.md'), `# BATCH-QA-016\n\n- ${dump.finished}\n- PASS ${summary.PASS} FAIL ${summary.FAIL} PARTIAL ${summary.PARTIAL} BLOCKED ${summary.BLOCKED}\n`)
console.log('SUMMARY', summary)
