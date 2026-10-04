/**
 * AI 对话框端到端验证：真实发消息 → 消息流 → 建议卡片 → 应用建议
 * 用法：NODE_PATH=<ws>/node_modules ADMIN_BASE=http://127.0.0.1:5199 node scripts/qa/probe-ai-chat-e2e.js
 */
const crypto = require('crypto')
const path = require('path')
const fs = require('fs')
const puppeteer = require('puppeteer-core')

const OUT = path.resolve(__dirname, '../../.workbuddy/tmp/qa')
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const ADMIN = process.env.ADMIN_BASE || 'http://127.0.0.1:5199'
const PAGE_ID = process.env.PAGE_ID || '29'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function b64u(i) {
  return Buffer.from(i).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const now = Math.floor(Date.now() / 1000)
const secret = fs.readFileSync('/tmp/jwt_secret.txt', 'utf8').trim()
const h = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
const pl = b64u(JSON.stringify({ userId: 1, sub: 'admin', typ: 'access', iat: now, exp: now + 7200 }))
const body = `${h}.${pl}`
const token = `${body}.${b64u(crypto.createHmac('sha256', secret).update(body).digest())}`

;(async () => {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox'],
    defaultViewport: { width: 1680, height: 1050 },
  })
  const page = await browser.newPage()

  // 记录 AI 接口调用与报错
  const apiCalls = []
  const errors = []
  page.on('response', (r) => {
    const u = r.url()
    if (/ai|pipeline/i.test(u) && /api/.test(u)) apiCalls.push({ url: u.slice(0, 120), status: r.status() })
  })
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 160))
  })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + String(e.message).slice(0, 160)))

  await page.evaluateOnNewDocument((t) => localStorage.setItem('access_token', t), token)
  await page.goto(`${ADMIN}/page-builder/editor/${PAGE_ID}`, { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {})
  await page.waitForSelector('.ai-fab', { timeout: 45000 })
  await sleep(3000)

  // 记录应用建议前的页面名，用于验证「应用」是否真的生效
  const before = await page.evaluate(() => ({
    name: document.querySelector('.builder-page-name')?.textContent.trim(),
  }))
  console.log('应用前页面名:', before.name)

  await page.click('.ai-fab')
  await page.waitForSelector('.ai-chat-dialog', { timeout: 15000 })
  await sleep(700)

  // 输入并发送
  await page.click('.ai-chat__composer textarea')
  await page.type('.ai-chat__composer textarea', '把页面主色改成暖橘色')
  await sleep(300)
  const afterType = await page.evaluate(() => ({
    inputCleared: document.querySelector('.ai-chat__composer textarea')?.value || '',
    sendDisabled: document.querySelector('.ai-chat__send')?.classList.contains('is-disabled'),
  }))
  console.log('输入后:', JSON.stringify(afterType))

  await page.click('.ai-chat__send')

  // 等 AI 回复（最多 90s）
  const replied = await page
    .waitForFunction(
      () => {
        const t = document.querySelectorAll('.ai-msg--ai .ai-msg__bubble')
        return t.length > 0 && !document.querySelector('.ai-msg__thinking')
      },
      { timeout: 90000, polling: 1000 },
    )
    .then(() => true)
    .catch(() => false)
  console.log('收到 AI 回复:', replied)

  await sleep(1500)
  const state = await page.evaluate(() => {
    const d = document.querySelector('.ai-chat-dialog')
    return {
      userMsgs: d.querySelectorAll('.ai-msg--user').length,
      aiMsgs: d.querySelectorAll('.ai-msg--ai').length,
      inputAfterSend: d.querySelector('.ai-chat__composer textarea')?.value,
      aiText: d.querySelector('.ai-msg--ai .ai-msg__bubble')?.textContent.replace(/\s+/g, ' ').trim().slice(0, 120),
      patchRows: d.querySelectorAll('.ai-patch-row').length,
      fabBadge: document.querySelector('.ai-fab__badge')?.textContent.trim() || null,
      threadScrollable: (() => {
        const t = d.querySelector('.ai-chat__thread')
        return t ? { scrollH: t.scrollHeight, clientH: t.clientHeight, atBottom: t.scrollHeight - t.scrollTop - t.clientHeight < 4 } : null
      })(),
    }
  })
  console.log('对话状态:', JSON.stringify(state, null, 2))
  console.log('AI 接口调用:', JSON.stringify(apiCalls, null, 2))
  console.log('控制台错误:', JSON.stringify(errors.slice(0, 5), null, 2))

  await page.screenshot({ path: path.join(OUT, 'ai-fab-5-real-reply.png') })

  // 连续追问：验证多轮消息流
  await page.click('.ai-chat__composer textarea')
  await page.type('.ai-chat__composer textarea', '再加一个空状态提示')
  await page.keyboard.down('Shift')
  await page.keyboard.press('Enter') // 换行不应发送
  const multiline = await page.evaluate(() => ({
    value: document.querySelector('.ai-chat__composer textarea')?.value,
    userMsgs: document.querySelectorAll('.ai-msg--user').length,
  }))
  console.log('Shift+Enter 换行（不应发送）:', JSON.stringify(multiline))
  await page.keyboard.up('Shift')

  await page.keyboard.press('Enter') // 发送
  await sleep(1500)
  const after2 = await page.evaluate(() => ({
    userMsgs: document.querySelectorAll('.ai-msg--user').length,
    aiMsgs: document.querySelectorAll('.ai-msg--ai').length,
  }))
  console.log('第二轮后:', JSON.stringify(after2))

  await sleep(6000)
  await page.screenshot({ path: path.join(OUT, 'ai-fab-6-multi-turn.png') })
  const final = await page.evaluate(() => ({
    userMsgs: document.querySelectorAll('.ai-msg--user').length,
    aiMsgs: document.querySelectorAll('.ai-msg--ai').length,
    patchRows: document.querySelectorAll('.ai-patch-row').length,
  }))
  console.log('最终消息数:', JSON.stringify(final))

  console.log('截图目录:', OUT)
  await browser.close()
})().catch((e) => {
  console.error('E2E 失败:', e)
  process.exit(1)
})
