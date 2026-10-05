/**
 * 管理端「固定页 · 我的」模板库 UI 验证
 * 用法：NODE_PATH=<workspace>/node_modules node scripts/qa/probe-admin-mine-tpl.js
 * 前置：docker 无需；需要服务器 ssh 别名 zfculture 可读 backend.env（自签 JWT）
 */
const { execSync } = require('child_process')
const crypto = require('crypto')
const path = require('path')
const fs = require('fs')
const puppeteer = require('puppeteer-core')

const OUT = path.resolve(__dirname, '../../.workbuddy/tmp/qa')
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const ADMIN = 'https://admin.zfculture.site'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function b64u(input) {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function signJwt(secret) {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'HS256', typ: 'JWT' }
  const payload = { userId: 1, sub: 'admin', typ: 'access', iat: now, exp: now + 7200 }
  const body = `${b64u(JSON.stringify(header))}.${b64u(JSON.stringify(payload))}`
  const sig = crypto.createHmac('sha256', secret).update(body).digest()
  return `${body}.${b64u(sig)}`
}

function readJwtSecret() {
  if (fs.existsSync('/tmp/jwt_secret.txt')) {
    const cached = fs.readFileSync('/tmp/jwt_secret.txt', 'utf8').trim()
    if (cached) return cached
  }
  const line = execSync(
    `ssh zfculture "sudo grep -E '^JWT_SECRET' /opt/miniprogram-platform/config/backend.env | head -1"`,
    { encoding: 'utf8' },
  ).trim()
  const secret = line.split('=').slice(1).join('=').trim()
  if (!secret) throw new Error('未取到 JWT_SECRET')
  return secret.replace(/^["']|["']$/g, '')
}

async function main() {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })
  const token = signJwt(readJwtSecret())
  console.log('JWT 已签发')

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-http2', '--disable-features=IsolateOrigins,site-per-process'],
    defaultViewport: { width: 1680, height: 1180 },
  })
  const page = await browser.newPage()
  page.on('response', (r) => {
    const u = r.url()
    if (u.indexOf('/api/') >= 0 || u.indexOf('admin.zfculture') >= 0) console.log('RESP', r.status(), u.slice(0, 120))
  })
  page.on('requestfailed', (r) => console.log('REQFAIL', r.url().replace('https://api.zfculture.site', ''), r.failure() && r.failure().errorText))
  page.on('console', (m) => {
    const t = String(m.text())
    if (m.type() === 'error' || m.type() === 'warning' || t.indexOf('[') === 0) console.log('[console]', m.type(), t.slice(0, 200))
  })

  // 在每次文档加载前注入 token，避免登录页的清理逻辑把 token 抹掉
  await page.evaluateOnNewDocument((t) => {
    try { localStorage.setItem('access_token', t) } catch (e) { /* noop */ }
  }, token)
  try {
    await page.goto(`${ADMIN}/page-builder/mine`, { waitUntil: 'domcontentloaded', timeout: 25000 })
  } catch (e) {
    console.log('goto 未在超时内完成，继续等待渲染：', String(e.message).slice(0, 80))
  }

  try {
    await page.waitForSelector('.tpl-grid', { timeout: 40000 })
  } catch (e) {
    const diag = await page.evaluate(() => ({
      href: location.href,
      title: document.title,
      tokenLen: (localStorage.getItem('access_token') || '').length,
      lsKeys: Object.keys(localStorage),
      ssKeys: Object.keys(sessionStorage),
      text: (document.body.innerText || '').slice(0, 200),
    }))
    console.log('未出现 .tpl-grid，诊断:', JSON.stringify(diag, null, 1))
    await page.screenshot({ path: `${OUT}/admin-mine-tpl-fail.png` })
    console.log(`失败截图：${OUT}/admin-mine-tpl-fail.png`)
    await browser.close()
    return
  }
  await sleep(3000)

  const cardInfo = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.tpl-card'))
    return cards.map((c) => ({
      name: c.querySelector('.tpl-body__name')?.textContent?.trim(),
      desc: c.querySelector('.tpl-body__scene')?.textContent?.trim(),
      hasPreview: !!c.querySelector('.tpl-thumb__inner .mine-page-preview'),
      previewHeight: c.querySelector('.tpl-thumb__inner')?.getBoundingClientRect().height || 0,
    }))
  })
  console.log('模板卡片:', JSON.stringify(cardInfo, null, 1))

  await page.screenshot({ path: `${OUT}/admin-mine-tpl.png`, fullPage: true })
  console.log(`截图：${OUT}/admin-mine-tpl.png`)

  // 打开第 2 套模板的大预览
  await page.evaluate(() => {
    const cards = document.querySelectorAll('.tpl-card')
    const target = cards[1]
    target.scrollIntoView({ block: 'center' })
    target.click()
  })
  await page.waitForSelector('.pv__phone', { timeout: 20000 })
  await sleep(2000)
  await page.screenshot({ path: `${OUT}/admin-mine-tpl-dialog.png` })
  console.log(`截图：${OUT}/admin-mine-tpl-dialog.png`)

  // 关闭弹窗，滚到菜单编排区（验证访问页面选择器）
  await page.keyboard.press('Escape')
  await sleep(1200)
  await page.evaluate(() => {
    const row = document.querySelector('.menu-item')
    if (row) row.scrollIntoView({ block: 'center' })
  })
  await sleep(1200)
  await page.screenshot({ path: `${OUT}/admin-mine-tpl-menu.png` })
  console.log(`截图：${OUT}/admin-mine-tpl-menu.png`)

  const rowHandle = await page.$('.menu-item')
  if (rowHandle) {
    await rowHandle.screenshot({ path: `${OUT}/admin-mine-menu-row.png` })
    console.log(`菜单行截图：${OUT}/admin-mine-menu-row.png`)
    const rowHtml = await page.evaluate(() => {
      const row = document.querySelector('.menu-item')
      return row ? row.innerHTML.replace(/\s+/g, ' ').slice(0, 700) : ''
    })
    console.log('菜单行 HTML:', rowHtml)
  } else {
    console.log('未找到 .menu-item（当前配置无菜单项）')
  }

  const menuInfo = await page.evaluate(() => {
    const row = document.querySelector('.menu-item')
    if (!row) return null
    return {
      title: row.querySelector('.el-input__inner')?.value,
      pickerKinds: Array.from(row.querySelectorAll('.mine-target .el-select')).length,
      hasLoginBox: !!row.querySelector('.mine-target__login'),
      groupField: row.querySelectorAll('.menu-fields > *').length,
    }
  })
  console.log('菜单行结构:', JSON.stringify(menuInfo))

  await browser.close()
  console.log('done')
}

main().catch((e) => {
  console.log('FATAL:', e && (e.message || e))
  process.exit(1)
})
