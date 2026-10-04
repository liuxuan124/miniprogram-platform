/**
 * 管理端顶栏「个人中心」跳转验证
 * 用法：NODE_PATH=<workspace>/node_modules node scripts/qa/probe-admin-profile-menu.js
 * 前置：需要服务器 ssh 别名 zfculture 可读 backend.env（自签 JWT）
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
  fs.writeFileSync('/tmp/jwt_secret.txt', secret)
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
  page.on('console', (m) => {
    const t = String(m.text())
    if (m.type() === 'error') console.log('[console]', m.type(), t.slice(0, 160))
  })
  await page.evaluateOnNewDocument((t) => {
    try { localStorage.setItem('access_token', t) } catch (e) { /* noop */ }
  }, token)

  try {
    await page.goto(`${ADMIN}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  } catch (e) {
    console.log('goto 超时，继续等待：', String(e.message).slice(0, 80))
  }

  await page.waitForSelector('.header-right .el-dropdown', { timeout: 40000 })
  await sleep(2500)
  console.log('当前路径:', await page.evaluate(() => location.pathname))

  // 打开右上角下拉
  await page.click('.header-right .el-dropdown .el-dropdown__trigger, .header-right .el-dropdown').catch(async () => {
    await page.evaluate(() => {
      const el = document.querySelector('.header-right .el-dropdown')
      el && el.click()
    })
  })
  await sleep(1200)

  const items = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.el-dropdown-menu__item')).map((n) => n.textContent.trim()),
  )
  console.log('下拉项:', JSON.stringify(items))

  const clicked = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('.el-dropdown-menu__item')).find(
      (n) => n.textContent.trim() === '个人中心',
    )
    if (!el) return false
    el.click()
    return true
  })
  console.log('点击「个人中心」:', clicked ? 'OK' : '未找到该项')
  if (!clicked) {
    await page.screenshot({ path: `${OUT}/admin-profile-menu-fail.png` })
    console.log(`截图：${OUT}/admin-profile-menu-fail.png`)
    await browser.close()
    return
  }

  await sleep(3000)
  const state = await page.evaluate(() => ({
    path: location.pathname,
    h2: document.querySelector('h2')?.textContent?.trim(),
    hasTable: !!document.querySelector('.el-table'),
  }))
  console.log('跳转后状态:', JSON.stringify(state))
  await page.screenshot({ path: `${OUT}/admin-profile-menu.png` })
  console.log(`截图：${OUT}/admin-profile-menu.png`)

  const pass = state.path === '/settings/admin-user'
  console.log(pass ? '✅ 个人中心跳转生效' : '❌ 个人中心跳转未生效')
  await browser.close()
}

main().catch((e) => {
  console.error('脚本异常:', e)
  process.exit(1)
})
