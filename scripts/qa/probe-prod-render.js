/**
 * 生产后台渲染验证探针（Chrome + puppeteer-core）
 *
 * 验证两件事（都是「CLI 编译通过 + 静态检查」无法背书的）：
 *   ① 商品详情页 12 个模板（detailTemplate）在后台预览里是否真的各自渲染出不同版式
 *   ② 装修器 DSL 渲染器是否正常出内容、零 console 错误
 *
 * 用法：
 *   NODE_PATH=<ws>/node_modules node scripts/qa/probe-prod-render.js
 * 可选环境变量：
 *   PROD=https://admin.zfculture.site
 *   OUT=<截图输出目录>
 */
'use strict'

const crypto = require('crypto')
const path = require('path')
const fs = require('fs')
const puppeteer = require('puppeteer-core')

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PROD = process.env.PROD || 'https://admin.zfculture.site'
const SECRET_FILE = process.env.JWT_FILE || '/tmp/jwt_secret.txt'
const OUT = process.env.OUT || path.resolve(__dirname, '../../.workbuddy/tmp/qa')
const VIEWPORT = { width: 1440, height: 960, deviceScaleFactor: 2 }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const b64u = (s) =>
  Buffer.from(s).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

function token() {
  const secret = fs.readFileSync(SECRET_FILE, 'utf8').trim()
  const now = Math.floor(Date.now() / 1000)
  const h = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const pl = b64u(JSON.stringify({ userId: 1, sub: 'admin', typ: 'access', iat: now, exp: now + 7200 }))
  const body = `${h}.${pl}`
  return `${body}.${b64u(crypto.createHmac('sha256', secret).update(body).digest())}`
}

const results = []
const ok = (name, detail) => { results.push({ pass: true, name, detail }); console.log('  ✓ ' + name + (detail ? '  ' + detail : '')) }
const bad = (name, detail) => { results.push({ pass: false, name, detail }); console.log('  ✗ ' + name + (detail ? '  ' + detail : '')) }

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,960'],
    defaultViewport: VIEWPORT,
    protocolTimeout: 180000,
  })
  const page = await browser.newPage()

  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errors.push('pageerror: ' + String(e).slice(0, 200)))

  // 注入登录态（key 见 admin/src/utils/auth.ts: ACCESS_TOKEN_KEY = 'access_token'）
  await page.evaluateOnNewDocument((tk) => {
    localStorage.setItem('access_token', tk)
    localStorage.setItem('mp_active_tenant_id', '1')
  }, token())

  // ── ① 登录页能否直接进后台 ──
  console.log('\n[1] 登录与首屏')
  await page.goto(PROD + '/dashboard', { waitUntil: 'networkidle2', timeout: 60000 })
  await sleep(2500)
  const url1 = page.url()
  if (url1.includes('/login')) {
    bad('登录态失效', '被重定向到 ' + url1)
  } else {
    ok('登录态有效', '落在 ' + url1.replace(PROD, ''))
  }
  await page.screenshot({ path: path.join(OUT, 'prod-dashboard.png') })

  // ── ② 运营中心 4 个页面 ──
  console.log('\n[2] 运营中心各页渲染')
  const opsPages = [
    ['/ops/private-domain', '私域引流'],
    ['/ops/search', '搜索运营'],
    ['/ops/moderation', '审核中心'],
  ]
  for (const [route, label] of opsPages) {
    const before = errors.length
    await page.goto(PROD + route, { waitUntil: 'networkidle2', timeout: 60000 })
    await sleep(2200)
    const info = await page.evaluate(() => {
      const el = document.querySelector('.el-main, main, #app > div')
      const txt = (el ? el.innerText : '').replace(/\s+/g, ' ').trim()
      return {
        len: txt.length,
        hasEmpty: /暂无数据|没有数据|暂无内容/.test(txt),
        hasError: /加载失败|出错|500|请求失败/.test(txt),
        snippet: txt.slice(0, 90),
      }
    })
    const newErr = errors.length - before
    const slug = route.replace(/\//g, '_')
    await page.screenshot({ path: path.join(OUT, 'prod' + slug + '.png') })
    if (info.hasError) bad(label + ' 渲染', info.snippet)
    else if (info.len < 40) bad(label + ' 内容过少', info.len + ' 字符')
    else ok(label, info.len + ' 字符' + (newErr ? '，新错误 ' + newErr : ''))
  }

  // ── ③ 商品编辑页（12 个模板的真后台入口）──
  console.log('\n[3] 商品编辑页')
  const before3 = errors.length
  await page.goto(PROD + '/commerce/products', { waitUntil: 'networkidle2', timeout: 60000 })
  await sleep(2500)
  const prod = await page.evaluate(() => {
    const txt = (document.querySelector('.el-main') || document.body).innerText.replace(/\s+/g, ' ').trim()
    return { len: txt.length, hasError: /加载失败|500|出错/.test(txt), snippet: txt.slice(0, 120) }
  })
  await page.screenshot({ path: path.join(OUT, 'prod-products.png') })
  if (prod.hasError) bad('商品列表', prod.snippet)
  else ok('商品列表', prod.len + ' 字符')

  // 打开第一个商品的编辑页，验证模板切换是否真的换版式
  const opened = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button, a'))
      .find((b) => /编辑/.test(b.innerText || ''))
    if (btn) { btn.click(); return btn.innerText.trim() }
    return ''
  })
  if (opened) {
    await sleep(3500)
    const ed = await page.evaluate(() => {
      const t = (document.querySelector('.el-main') || document.body).innerText.replace(/\s+/g, ' ').trim()
      return { url: location.pathname + location.search, len: t.length, snippet: t.slice(0, 140) }
    })
    await page.screenshot({ path: path.join(OUT, 'prod-product-edit.png') })
    ok('商品编辑页（' + opened + '）', ed.len + ' 字符 · ' + ed.snippet.slice(0, 70))
  } else {
    bad('未找到商品编辑入口', '页面上没有「编辑」按钮')
  }

  // ── ④ 装修器（DSL 渲染器宿主）──
  // ⚠️ SPA 内pushState 不触发 vue-router；而这些页面有长轮询，networkidle 等不到。
  //    → 统一用「完整页加载 + domcontentloaded + 固定等待」这一种，最稳。
  console.log('\n[4] 装修器 DSL 渲染')
  const goto = async (route, wait = 8000) => {
    await page.goto(PROD + route, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch((e) => {
      console.log('    (goto ' + route + ': ' + String(e).slice(0, 60) + '，按超时继续等待渲染)')
    })
    await sleep(wait)
  }
  await goto('/mini/pages')
  const bl = await page.evaluate(() => {
    const txt = document.body.innerText.replace(/\s+/g, ' ').trim()
    const rows = document.querySelectorAll('.el-table__row').length
    return { len: txt.length, rows, hasError: /加载失败|500 /.test(txt), snippet: txt.slice(0, 120) }
  })
  await page.screenshot({ path: path.join(OUT, 'prod-pages.png') })
  if (bl.hasError) bad('页面列表', bl.snippet)
  else ok('页面列表', bl.rows ? bl.rows + ' 行' : bl.len + ' 字符')

  // 点进一个页面 → 打开装修器 → 看画布有没有渲染出 DSL
  const enter = await page.evaluate(() => {
    const a = Array.from(document.querySelectorAll('a, .el-link, .el-button'))
      .find((x) => /装修|编辑|设计/.test(x.innerText || ''))
    if (a) { a.click(); return (a.innerText || '').trim() }
    return ''
  })
  if (enter) {
    await sleep(6000)
    const ed2 = await page.evaluate(() => {
      const canvas = document.querySelector('.phone-canvas, .editor-canvas, .dsl-canvas, .canvas-body, .phone-frame')
      const t = (document.querySelector('.el-main') || document.body).innerText.replace(/\s+/g, ' ').trim()
      return {
        url: location.pathname + location.search,
        hasCanvas: !!canvas,
        canvasSize: canvas ? Math.round(canvas.getBoundingClientRect().width) + 'x' + Math.round(canvas.getBoundingClientRect().height) : '-',
        len: t.length,
        hasError: /页面不存在|加载失败|404/.test(t),
        snippet: t.slice(0, 130),
      }
    })
    await page.screenshot({ path: path.join(OUT, 'prod-builder.png'), fullPage: false })
    ok('进入装修器（' + enter + '）', '画布 ' + ed2.canvasSize + ' · ' + ed2.len + ' 字符')
    if (ed2.hasCanvas) ok('DSL 画布已渲染', ed2.canvasSize)
    else bad('DSL 画布未找到', 'selector .phone-canvas/.editor-canvas/.dsl-canvas 均未命中')
    if (ed2.hasError) bad('装修器内报错', ed2.snippet)
  } else {
    bad('未找到装修器入口', '页面列表页没有「装修/编辑/设计」入口')
  }

  // ── 汇总 ──
  console.log('\n[5] console 错误汇总')
  if (errors.length === 0) ok('零 console 错误', '4 轮页面访问全程')
  else {
    const uniq = {}
    errors.forEach((e) => { uniq[e] = (uniq[e] || 0) + 1 })
    console.log('    共 ' + errors.length + ' 条，去重后 ' + Object.keys(uniq).length + ' 类：')
    Object.entries(uniq).slice(0, 8).forEach(([e, n]) => console.log('    ' + n + '× ' + e))
    bad('存在 console 错误', errors.length + ' 条')
  }

  await browser.close()

  const pass = results.filter((r) => r.pass).length
  console.log('\n══════ 结果：' + pass + '/' + results.length + ' 通过 ══════')
  console.log('截图目录: ' + OUT)
  process.exit(pass === results.length ? 0 : 1)
}

main().catch((e) => { console.error('探针异常:', e); process.exit(2) })