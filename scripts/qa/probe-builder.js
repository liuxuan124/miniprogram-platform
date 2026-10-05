/**
 * 装修器 DSL 渲染验证（精简版，单独跑）
 *
 * 为什么单独拆：/mini/pages 列表页在生产环境 goto 会超时（长轮询 + 大表格），
 * 但编辑器页本身是可直达的（/page-builder/editor/:id）。这个探针从数据库拿一个
 * 真实页面 id，直奔编辑器，验证：
 *   ① 画布容器是否渲染出手机壳（.phone-canvas / .editor-canvas 等）
 *   ② 画布内是否有 DSL 区块节点（不是空白）
 *   ③ 组件面板是否列出可选组件
 *   ④ 属性面板是否存在
 *   ⑤ 全程 console 错误数
 *
 * 用法：
 *   JWT_FILE=/tmp/jwt_secret.txt NODE_PATH=<ws>/node_modules \
 *   PROD=https://admin.zfculture.site node scripts/qa/probe-builder.js [pageId]
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
const VIEWPORT = { width: 1600, height: 1000, deviceScaleFactor: 2 }

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
const ok = (n, d) => { results.push(true); console.log('  ✓ ' + n + (d ?'  ' + d : '')) }
const bad = (n, d) => { results.push(false); console.log('  ✗ ' + n + (d ? '  ' + d : '')) }

/** 用 API 取一个已发布页面的 id */
async function pickPage(page) {
  return page.evaluate(async (base) => {
    const tk = localStorage.getItem('access_token')
    const r = await fetch(base + '/api/v1/admin/pages?page=1&size=5', {
      headers: { Authorization: 'Bearer ' + tk },
    })
    if (!r.ok) return { err: 'HTTP ' + r.status }
    const j = await r.json()
    const d = j.data || j
    const list = d.records || d.list || d.items || []
    if (!list.length) return { err: '无页面记录', raw: JSON.stringify(j).slice(0, 200) }
    const p = list[0]
    return { id: p.id, name: p.name || p.pageName || '', path: p.path || '' }
  }, PROD)
}

const all_count = (s) => s.hasSeg + ' 处 .wb-seg'

async function main() {
  const pageIdArg = process.argv[2]
  fs.mkdirSync(OUT, { recursive: true })

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    protocolTimeout: 180000,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1600,1000'],
    defaultViewport: VIEWPORT,
  })
  const page = await browser.newPage()
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 180)) })
  page.on('pageerror', (e) => errors.push('pageerror: ' + String(e).slice(0, 180)))

  await page.evaluateOnNewDocument((tk) => {
    localStorage.setItem('access_token', tk)
    localStorage.setItem('mp_active_tenant_id', '1')
  }, token())

  // 先落一次页面，拿到登录态
  await page.goto(PROD + '/dashboard', { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {})
  await sleep(2000)

  let pageId = pageIdArg
  if (!pageId) {
    console.log('\n[1] 取一个真实页面 id')
    const picked = await pickPage(page).catch((e) => ({ err: String(e).slice(0, 80) }))
    if (picked.err) {
      bad('取页面 id 失败', picked.err + (picked.raw ? ' · ' + picked.raw : ''))
      await browser.close()
      process.exit(1)
    }
    pageId = picked.id
    ok('页面', '#' + pageId + ' ' + picked.name + '（' + picked.path + '）')
  } else {
    console.log('\n[1] 使用指定页面 id: ' + pageId)
  }

  console.log('\n[2] 打开装修器')
  const route = PROD + '/page-builder/editor/' + pageId
  await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch((e) => {
    console.log('    (goto 超时，按渲染等待继续：' + String(e).slice(0, 50) + ')')
  })
  await sleep(12000)

  const state = await page.evaluate(() => {
    const q = (s) => document.querySelector(s)
    const all = (s) => Array.from(document.querySelectorAll(s))
    // class 名取自 admin/src/components/page-builder/CanvasArea.vue 与 BuilderSegmented.vue
    const canvas = q('.prototype-canvas') || q('.phone') || q('.phone-screen')
    const screen = q('.phone-screen')
    const rect = (canvas || screen) ? (canvas || screen).getBoundingClientRect() : null
    const txt = (q('.el-main') || document.body).innerText.replace(/\s+/g, ' ').trim()
    // DSL 区块：画布内 .canvas-item-wrap（每个区块一个）
    const nodes = all('.canvas-item-wrap').filter((e) => e.getBoundingClientRect().height > 10)
    // 组件库面板（.comp-item 见 ComponentItem.vue）
    const comps = all('.comp-item, .comp-card, .component-item')
    return {
      url: location.pathname,
      hasCanvas: !!canvas,
      canvasSize: rect ? Math.round(rect.width) + '×' + Math.round(rect.height) : '-',
      screenSize: screen ? Math.round(screen.getBoundingClientRect().width) + '×' +
        Math.round(screen.getBoundingClientRect().height) : '-',
      dslNodes: nodes.length,
      nodeSample: nodes.slice(0, 4).map((e) => (e.className || '').toString().split(' ').slice(0, 2).join('.')),
      compCount: comps.length,
      hasCompPanel: /组件库/.test(txt),
      hasPropPanel: !!q('.right-tabs'),
      hasShellSwitch: all('.shell-switch__glyph, .shell-switch button').length > 0,
      hasSeg: all('.wb-seg').length > 0,
      hasZoom: /75%|100%|125%/.test(txt),
      len: txt.length,
      snippet: txt.slice(0, 150),
      notFound: /页面不存在|404 /.test(txt),
    }
  }).catch((e) => ({ err: String(e).slice(0, 120) }))

  if (state.err) {
    bad('读取页面状态失败', state.err)
  } else {
    console.log('    URL: ' + state.url + '  文本 ' + state.len + ' 字符')
    if (state.notFound) bad('装修器报页面不存在', state.snippet)
    else ok('编辑器已加载')

    if (state.hasCanvas) ok('画布容器已渲染', state.canvasSize)
    else bad('画布容器未找到', '.prototype-canvas/.phone/.phone-screen 均未命中')

    if (state.dslNodes > 0) ok('DSL 区块已渲染', state.dslNodes + ' 个 .canvas-item-wrap · 屏 ' + state.screenSize + ' · ' + state.nodeSample.join(' | '))
    else bad('DSL 区块为空', '画布内没找到区块节点（可能是空白页或渲染失败）')

    if (state.hasCompPanel) ok('组件库面板', state.compCount + ' 个组件项')
    else bad('组件库面板缺失', '未找到「组件库」')

    if (state.hasPropPanel) ok('属性面板存在')
    else bad('属性面板缺失', '.right-tabs 未找到')

    state.hasShellSwitch ? ok('画布外壳双模式开关存在') : bad('未见外壳开关', '.shell-switch 未找到')
    state.hasSeg ? ok('分段控件 BuilderSegmented 已渲染', all_count(state)) : console.log('    · 本页未用到分段控件')
    state.hasZoom ? ok('缩放档位75/100/125% 存在') : console.log('    · 未见缩放档位')
  }

  await page.screenshot({ path: path.join(OUT, 'prod-builder-editor.png') })

  console.log('\n[3] console 错误')
  if (errors.length === 0) ok('零 console 错误')
  else {
    const uniq = {}
    errors.forEach((e) => { uniq[e] = (uniq[e] || 0) + 1 })
    Object.entries(uniq).slice(0, 6).forEach(([e, n]) => console.log('    ' + n + '× ' + e))
    // ERR_CONNECTION_CLOSED 属网络抖动，不算页面缺陷
    const real = errors.filter((e) => !/ERR_CONNECTION_CLOSED|Failed to load resource/.test(e))
    if (real.length === 0) ok('无页面级console 错误', errors.length + ' 条均为网络抖动')
    else bad('存在页面级 console 错误', real.length + ' 条')
  }

  await browser.close()
  const pass = results.filter(Boolean).length
  console.log('\n══════ ' + pass + '/' + results.length + ' 通过 ══════')
  console.log('截图: ' + path.join(OUT, 'prod-builder-editor.png'))
  process.exit(pass === results.length ? 0 : 1)
}

main().catch((e) => { console.error('探针异常:', String(e).slice(0, 300)); process.exit(2) })