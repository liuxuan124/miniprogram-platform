/**
 * 用 CDP getMatchedStylesForNode 拿权威样式匹配，定位谁把 .el-dialog 的 margin 压成 0
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

async function matched(page, sel, label) {
  const client = await page.createCDPSession()
  await client.send('DOM.enable')
  await client.send('CSS.enable')
  const { root } = await client.send('DOM.getDocument', { depth: -1 })
  const { nodeId } = await client.send('DOM.querySelector', { nodeId: root.nodeId, selector: sel })
  if (!nodeId) return console.log(label, '未找到')
  const m = await client.send('CSS.getMatchedStylesForNode', { nodeId })
  const out = []
  for (const e of m.matchedCSSRules || []) {
    const decl = (e.rule.style.cssProperties || []).filter((p) => /^(margin|inset|top|left|right|position|display|width)/.test(p.name))
    if (!decl.length) continue
    out.push({
      selector: e.rule.selectorList.text.slice(0, 160),
      origin: e.rule.origin,
      decls: decl.map((d) => `${d.name}:${d.value}${d.important ? ' !important' : ''}`).join('; '),
    })
  }
  console.log(`\n===== ${label} (${sel}) 匹配规则 =====`)
  console.log(JSON.stringify(out, null, 2))
  await client.detach()
}

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
  await new Promise((r) => setTimeout(r, 900))

  await matched(pg, '.ai-chat-dialog', 'AI 对话框')
  await matched(pg, '.el-overlay-dialog', 'AI 弹窗遮罩容器')

  await b.close()
})()
