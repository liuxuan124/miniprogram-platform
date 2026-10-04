/**
 * 对照测试：AI 对话框 vs 站内已有弹窗（DSL 弹窗），判断「贴左」是全站问题还是本次改动引入
 */
const crypto = require('crypto')
const puppeteer = require('puppeteer-core')

function b64u(i) {
  return Buffer.from(i).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const now = Math.floor(Date.now() / 1000)
const secret = require('fs').readFileSync('/tmp/jwt_secret.txt', 'utf8').trim()
const h = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
const pl = b64u(JSON.stringify({ userId: 1, sub: 'admin', typ: 'access', iat: now, exp: now + 7200 }))
const body = `${h}.${pl}`
const token = `${body}.${b64u(crypto.createHmac('sha256', secret).update(body).digest())}`

const rectOf = (page, sel) =>
  page.evaluate((s) => {
    const el = document.querySelector(s)
    if (!el) return null
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return {
      sel: s,
      x: Math.round(r.x),
      y: Math.round(r.y),
      w: Math.round(r.width),
      margin: cs.margin,
      ml: cs.marginLeft,
      display: cs.display,
    }
  }, sel)

;(async () => {
  const b = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
    args: ['--no-sandbox'],
    defaultViewport: { width: 1680, height: 1050 },
  })
  const pg = await b.newPage()
  await pg.evaluateOnNewDocument((t) => localStorage.setItem('access_token', t), token)
  await pg.goto('http://127.0.0.1:5199/page-builder/editor/29', { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {})
  await new Promise((r) => setTimeout(r, 4000))
  await pg.waitForSelector('.ai-fab', { timeout: 30000 })

  // 1) 打开 DSL 弹窗（改动前就存在的弹窗）
  await pg.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.el-dropdown-menu__item, button'))
    const t = btns.find((b) => b.textContent.includes('查看 DSL'))
    if (t) t.click()
  })
  await new Promise((r) => setTimeout(r, 1200))
  console.log('已有 DSL 弹窗:', JSON.stringify(await rectOf(pg, '.el-dialog'), null, 2))
  await pg.screenshot({ path: '/Users/lx/项目文件/liuxuan/小程序搭建运营系统/.workbuddy/tmp/qa/ai-fab-4-existing-dialog.png' })
  await pg.keyboard.press('Escape')
  await new Promise((r) => setTimeout(r, 900))

  // 2) 打开本次新增的 AI 对话框
  await pg.click('.ai-fab')
  await pg.waitForSelector('.ai-chat-dialog', { timeout: 15000 })
  await new Promise((r) => setTimeout(r, 900))
  console.log('AI 对话框:', JSON.stringify(await rectOf(pg, '.ai-chat-dialog'), null, 2))

  await b.close()
})()
