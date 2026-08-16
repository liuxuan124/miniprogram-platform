#!/usr/bin/env node
/**
 * BATCH-QA-015: exploration P1 regression (AUTH / UI-002 path / UI-014 jump / PROD list / FORM / MEMBER / MKT).
 * Evidence only. Does not modify business code. Does not publish homepage id=1.
 */
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const require = createRequire('/Users/lx/.npm/_npx/31e32ef8478fbf80/node_modules/playwright/package.json')
const { chromium } = require('playwright')

const ADMIN = 'http://127.0.0.1:3000'
const API = 'http://127.0.0.1:8080'
const ROOT = '/Users/lx/项目文件/liuxuan/小程序搭建运营系统'
const EVID = join(ROOT, 'agent-team/testing/evidence/BATCH-QA-015')
const MP = join(ROOT, 'miniapp')
mkdirSync(EVID, { recursive: true })

const now = new Date().toISOString()
const results = []
const dump = { batch: 'BATCH-QA-015', started: now }

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
  return { http: res.status, json, text: text.slice(0, 3000) }
}

async function shot(page, name) {
  const p = join(EVID, `${name}.png`)
  await page.screenshot({ path: p, fullPage: true })
  return p
}

async function dismissPwd(page) {
  const dlg = page.locator('.el-dialog').filter({ hasText: '请修改初始密码' })
  if (await dlg.first().isVisible({ timeout: 2500 }).catch(() => false)) {
    const close = page.locator('.el-dialog__headerbtn').first()
    if (await close.isVisible().catch(() => false)) await close.click()
    else await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
    return true
  }
  return false
}

const login = await req('POST', '/api/v1/admin/auth/login', { body: { username: 'admin', password: 'admin123' } })
const token = login.json?.data?.accessToken
dump.login = { http: login.http, code: login.json?.code }
if (!token) throw new Error('login failed')

const browser = await chromium.launch({ headless: true, channel: 'chrome' })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()

try {
  // --- BUG-AUTH-001 ---
  await page.goto(`${ADMIN}/login`, { waitUntil: 'networkidle' })
  await page.getByPlaceholder(/用户名|账号/).fill('admin')
  await page.getByPlaceholder(/密码/).fill('admin123')
  await page.getByRole('button', { name: /登\s*录|登录/ }).click()
  await page.waitForTimeout(1500)
  const pwdVisible = await page.locator('.el-dialog').filter({ hasText: '请修改初始密码' }).first().isVisible().catch(() => false)
  await shot(page, '01-auth-force-password')
  let dismissed = false
  if (pwdVisible) dismissed = await dismissPwd(page)
  await page.waitForTimeout(500)
  const stillOnLogin = page.url().includes('/login')
  // try enter builder
  let canOperate = false
  if (!stillOnLogin) {
    await page.goto(`${ADMIN}/page-builder`, { waitUntil: 'networkidle' })
    await dismissPwd(page)
    canOperate = await page.locator('text=页面管理').first().isVisible({ timeout: 3000 }).catch(() => false)
      || await page.locator('.page-builder, .el-table').first().isVisible().catch(() => false)
  }
  await shot(page, '02-auth-after-dismiss')
  dump.auth = { pwdVisible, dismissed, stillOnLogin, canOperate, url: page.url() }
  // FAIL if force password can be dismissed and still operate
  if (pwdVisible && dismissed && canOperate) {
    rec('EXP-AUTH-FORCE-PWD', 'FAIL', '强制改密可关闭且仍可进入页面管理', { bug: 'BUG-AUTH-001' })
  } else if (!pwdVisible && canOperate) {
    rec('EXP-AUTH-FORCE-PWD', 'PARTIAL', '本轮未弹出强制改密弹窗，无法复现关闭绕过；页面可操作', { bug: 'BUG-AUTH-001' })
  } else if (pwdVisible && !canOperate) {
    rec('EXP-AUTH-FORCE-PWD', 'PASS', '强制改密阻断后续操作', { bug: 'BUG-AUTH-001' })
  } else {
    rec('EXP-AUTH-FORCE-PWD', 'PARTIAL', `pwdVisible=${pwdVisible} canOperate=${canOperate}`, { bug: 'BUG-AUTH-001' })
  }

  // --- BUG-UI-002: published custom path vs miniapp package ---
  await dismissPwd(page)
  const pagesList = await req('GET', '/api/v1/admin/pages?current=1&size=50', { token })
  const records = pagesList.json?.data?.records || pagesList.json?.data?.list || []
  const publishedCustom = records.find((r) => (r.path || '').includes('index-2') || (r.path || '').includes('index/index-'))
    || records.find((r) => String(r.status) === '2' || r.status === 2)
  dump.ui002_pages = records.slice(0, 8).map((r) => ({ id: r.id, name: r.name, path: r.path, status: r.status }))
  const appJsonPath = join(MP, 'app.json')
  let appJson = null
  if (existsSync(appJsonPath)) {
    appJson = JSON.parse(await import('node:fs').then((fs) => fs.readFileSync(appJsonPath, 'utf8')))
  }
  const packagePages = new Set([...(appJson?.pages || []), ...((appJson?.subPackages || []).flatMap((s) => (s.pages || []).map((p) => `${s.root}/${p}`)))])
  const samplePath = (publishedCustom?.path || '').replace(/^\//, '')
  const inPackage = samplePath ? [...packagePages].some((p) => p === samplePath || p === samplePath.replace(/^pages\//, 'pages/')) : false
  // Also check pages/index/index-2 explicitly
  const index2InPkg = [...packagePages].some((p) => p.includes('index-2'))
  dump.ui002 = { samplePath, inPackage, index2InPkg, packageSample: [...packagePages].slice(0, 20) }
  await shot(page, '03-page-list')
  if (index2InPkg || (samplePath && inPackage)) {
    rec('EXP-LINE1-MP', 'PASS', `路径在包内 sample=${samplePath}`, { bug: 'BUG-UI-002' })
  } else {
    rec('EXP-LINE1-MP', 'FAIL', `发布路径不在小程序包内 sample=${samplePath || 'n/a'} index2InPkg=${index2InPkg}`, { bug: 'BUG-UI-002' })
  }

  // --- BUG-UI-014 / FP-UI-175-176: jump missing type/target validation ---
  await page.goto(`${ADMIN}/page-builder`, { waitUntil: 'networkidle' })
  await dismissPwd(page)
  // open first editable page or create via API
  const draft = records.find((r) => String(r.status) !== '2' && r.id !== 1) || records.find((r) => r.id !== 1)
  let editorId = draft?.id
  if (!editorId) {
    const path = `pages/custom/qa015-${Date.now()}`
    const c = await req('POST', '/api/v1/admin/pages', { token, body: { name: 'QA015跳转校验', type: 3, path } })
    editorId = c.json?.data?.id ?? c.json?.data
    dump.createdEditor = c.json
  }
  if (editorId) {
    await page.goto(`${ADMIN}/page-builder/editor/${editorId}`, { waitUntil: 'networkidle' })
    await dismissPwd(page)
    await page.waitForTimeout(800)
    // add banner if empty
    const empty = await page.locator('text=从左侧拖拽').isVisible().catch(() => false)
      || (await page.locator('.canvas-item, .component-item').count()) === 0
    if (empty || true) {
      const search = page.getByPlaceholder('搜索组件')
      if (await search.count()) {
        await search.fill('轮播')
        await page.waitForTimeout(200)
        const card = page.locator('.component-card').first()
        if (await card.count()) await card.click()
        await page.waitForTimeout(400)
      }
    }
    await shot(page, '04-editor-jump')
    // try publish without configuring jump target
    const publishBtn = page.getByRole('button', { name: /发布/ }).first()
    let publishBlocked = false
    let publishMsg = ''
    if (await publishBtn.isVisible().catch(() => false)) {
      await publishBtn.click()
      await page.waitForTimeout(800)
      publishMsg = (await page.locator('.el-message, .el-dialog, .el-form-item__error').allInnerTexts().catch(() => [])).join(' | ')
      publishBlocked = /跳转|必填|校验|target|type|完善/.test(publishMsg)
      await shot(page, '05-publish-attempt')
      // close dialogs
      await page.keyboard.press('Escape')
    }
    dump.ui014 = { publishMsg: publishMsg.slice(0, 500), publishBlocked }
    rec('FP-UI-175', publishBlocked ? 'PASS' : 'FAIL', publishBlocked ? '缺跳转字段被拦截' : `发布未校验跳转缺字段 msg=${publishMsg.slice(0, 120)}`, { bug: 'BUG-UI-014' })
    rec('FP-UI-176', publishBlocked ? 'PASS' : 'FAIL', publishBlocked ? '缺 target 被拦截' : '缺 target 仍无发布/保存校验', { bug: 'BUG-UI-014' })
  } else {
    rec('FP-UI-175', 'BLOCKED', '无法打开编辑器页', { bug: 'BUG-UI-014' })
    rec('FP-UI-176', 'BLOCKED', '无法打开编辑器页', { bug: 'BUG-UI-014' })
  }

  // --- BUG-PROD-001 / category ---
  await page.goto(`${ADMIN}/product`, { waitUntil: 'networkidle' }).catch(() => page.goto(`${ADMIN}/products`, { waitUntil: 'networkidle' }))
  await dismissPwd(page)
  await page.waitForTimeout(800)
  const prodUrl = page.url()
  const prodText = await page.locator('body').innerText().catch(() => '')
  await shot(page, '06-product-list')
  const uncategorized = /未分类/.test(prodText)
  dump.prod = { url: prodUrl, uncategorized, snippet: prodText.slice(0, 400) }
  if (!/商品/.test(prodText) && !prodUrl.includes('product')) {
    // try menu
    await page.goto(`${ADMIN}/`, { waitUntil: 'networkidle' })
    await dismissPwd(page)
    const link = page.getByText('商品管理').first()
    if (await link.isVisible().catch(() => false)) {
      await link.click()
      await page.waitForTimeout(1000)
      await shot(page, '06b-product-list')
    }
  }
  const prodText2 = await page.locator('body').innerText().catch(() => '')
  rec('EXP-PRODUCT-CATEGORY', /未分类/.test(prodText2) ? 'FAIL' : ( /商品/.test(prodText2) ? 'PARTIAL' : 'BLOCKED' ), /未分类/.test(prodText2) ? '列表仍见未分类' : `url=${page.url()}`, { bug: 'BUG-PROD-001' })

  // API side product 9
  const products = await req('GET', '/api/v1/admin/products?current=1&size=20', { token })
  dump.productsApi = { http: products.http, code: products.json?.code, n: (products.json?.data?.records || []).length }
  const p9 = (products.json?.data?.records || []).find((p) => p.id === 9 || p.name?.includes('QA'))
  if (p9) {
    const catOk = p9.categoryId || p9.category_id || p9.categoryName
    rec('EXP-LINE2-ADMIN-CREATE', catOk ? 'PASS' : 'FAIL', `product id=${p9.id} category=${catOk || 'empty'}`, { bug: 'BUG-PROD-001' })
  } else {
    rec('EXP-LINE2-ADMIN-CREATE', 'PARTIAL', '未找到 id=9/QA 商品，仅确认列表可访问', { bug: 'BUG-PROD-001' })
  }

  // --- FORM ---
  await page.goto(`${ADMIN}/form`, { waitUntil: 'networkidle' }).catch(() => page.goto(`${ADMIN}/forms`, { waitUntil: 'networkidle' }))
  await dismissPwd(page)
  await page.waitForTimeout(800)
  await shot(page, '07-form-list')
  const forms = await req('GET', '/api/v1/admin/forms?current=1&size=20', { token })
  dump.forms = { http: forms.http, code: forms.json?.code, sample: (forms.json?.data?.records || []).slice(0, 5) }
  const formRows = forms.json?.data?.records || []
  const draftLike = formRows.find((f) => /草稿|停用|已停用/.test(String(f.statusName || f.status || '')))
  rec('EXP-LINE3-ADMIN-CREATE', formRows.length ? 'PARTIAL' : 'FAIL', `forms=${formRows.length} sampleStatus=${formRows[0]?.status ?? formRows[0]?.statusName}`, { bug: 'BUG-FORM-001' })

  // --- MEMBER ---
  const members = await req('GET', '/api/v1/admin/members?current=1&size=20', { token })
  dump.members = { http: members.http, code: members.json?.code, n: (members.json?.data?.records || []).length, sample: (members.json?.data?.records || []).slice(0, 3) }
  await page.goto(`${ADMIN}/member`, { waitUntil: 'networkidle' }).catch(() => page.goto(`${ADMIN}/members`, { waitUntil: 'networkidle' }))
  await dismissPwd(page)
  await page.waitForTimeout(800)
  await shot(page, '08-member-list')
  const memberText = await page.locator('body').innerText().catch(() => '')
  const mismatchHint = /4\s*单|¥\s*2680|2680/.test(memberText)
  rec('EXP-MEMBER-LIST', mismatchHint ? 'FAIL' : (members.http < 400 ? 'PARTIAL' : 'FAIL'), mismatchHint ? '仍见消费笔数/金额异常展示线索' : `api_n=${dump.members.n}`, { bug: 'BUG-MEMBER-001' })

  // --- MKT coupon ---
  const coupons = await req('GET', '/api/v1/admin/coupons?current=1&size=20', { token })
  dump.coupons = { http: coupons.http, code: coupons.json?.code, sample: (coupons.json?.data?.records || []).slice(0, 5) }
  await page.goto(`${ADMIN}/marketing/coupon`, { waitUntil: 'networkidle' }).catch(() => page.goto(`${ADMIN}/coupon`, { waitUntil: 'networkidle' }))
  await dismissPwd(page)
  await page.waitForTimeout(800)
  await shot(page, '09-coupon-list')
  const couponText = await page.locator('body').innerText().catch(() => '')
  const badDiscount = /0\.9\s*折|0.9折/.test(couponText)
  rec('EXP-COUPON-LIST', badDiscount ? 'FAIL' : (/券|优惠/.test(couponText) ? 'PARTIAL' : 'BLOCKED'), badDiscount ? '仍展示 0.9折' : `textHasCoupon=${/券|优惠/.test(couponText)}`, { bug: 'BUG-MKT-001' })

  // --- MP order empty state via API (no automator if blocked) ---
  const mpOrders = await req('GET', '/api/v1/mp/orders')
  dump.mpOrdersUnauth = { http: mpOrders.http, code: mpOrders.json?.code, msg: mpOrders.json?.message }
  rec('EXP-LINE2-MP-ORDER', mpOrders.http === 401 || mpOrders.json?.code === 110101 ? 'PARTIAL' : 'FAIL', `未登录订单 http=${mpOrders.http} code=${mpOrders.json?.code}`, { bug: 'BUG-MP-001' })

} finally {
  await browser.close()
}

dump.finished = new Date().toISOString()
dump.results = results
const summary = {
  PASS: results.filter((r) => r.status === 'PASS').length,
  FAIL: results.filter((r) => r.status === 'FAIL').length,
  PARTIAL: results.filter((r) => r.status === 'PARTIAL').length,
  BLOCKED: results.filter((r) => r.status === 'BLOCKED').length,
}
dump.summary = summary
writeFileSync(join(EVID, 'p1-regression.json'), JSON.stringify(dump, null, 2))
writeFileSync(join(EVID, '00-summary.md'), `# BATCH-QA-015 P1 regression\n\n- ${dump.finished}\n- PASS ${summary.PASS} / FAIL ${summary.FAIL} / PARTIAL ${summary.PARTIAL} / BLOCKED ${summary.BLOCKED}\n`)
console.log('SUMMARY', summary)
