/**
 * 找出覆盖 .el-dialog margin 的具体 CSS 规则
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

  const rules = await pg.evaluate(() => {
    const hits = []
    for (const sheet of Array.from(document.styleSheets)) {
      let list
      try {
        list = sheet.cssRules
      } catch (e) {
        continue
      }
      const walk = (rl, media) => {
        for (const r of Array.from(rl)) {
          if (r.cssRules) {
            walk(r.cssRules, r.conditionText || media)
            continue
          }
          if (!r.selectorText) continue
          // 只关心命中 .el-dialog / .el-overlay-dialog 的规则
          if (!/\.el-(overlay-)?dialog/.test(r.selectorText)) continue
          const m = r.style?.margin || r.style?.marginLeft || r.style?.display
          if (!m) continue
          hits.push({
            selector: r.selectorText.slice(0, 140),
            margin: r.style.margin || '',
            marginLeft: r.style.marginLeft || '',
            display: r.style.display || '',
            href: (sheet.href || 'inline').split('/').pop().slice(0, 60),
            media: media || '',
          })
        }
      }
      walk(list, '')
    }
    return hits
  })
  console.log('命中 .el-dialog 的规则:')
  console.log(JSON.stringify(rules, null, 2))
  await b.close()
})()
