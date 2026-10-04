/**
 * 定位 AI 对话框未水平居中的根因：读 overlay / dialog 的实际计算样式
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
  await pg.click('.ai-fab')
  await pg.waitForSelector('.ai-chat-dialog', { timeout: 15000 })
  await new Promise((r) => setTimeout(r, 800))

  const info = await pg.evaluate(() => {
    const d = document.querySelector('.ai-chat-dialog')
    const chain = []
    let el = d
    while (el && el !== document.body) {
      const cs = getComputedStyle(el)
      const r = el.getBoundingClientRect()
      chain.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className || '').toString().slice(0, 60),
        display: cs.display,
        position: cs.position,
        textAlign: cs.textAlign,
        marginLeft: cs.marginLeft,
        marginRight: cs.marginRight,
        marginTop: cs.marginTop,
        inlineStyle: (el.getAttribute('style') || '').slice(0, 120),
        rect: { x: Math.round(r.x), w: Math.round(r.width) },
      })
      el = el.parentElement
    }
    return { chain, innerWidth: window.innerWidth }
  })
  console.log(JSON.stringify(info, null, 2))
  await b.close()
})()
