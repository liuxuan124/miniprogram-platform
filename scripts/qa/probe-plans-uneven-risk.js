/**
 * 验证「等宽卡片网格 + align-items:start」在数据不等时的真实后果。
 *
 * 做法：登录线上会员套餐页 → 用 CDP 直接改 DOM，把第 2 张卡的权益区
 * 删掉两条（模拟「各卡权益条数不同」的生产数据）→ 再量三卡高度。
 * 若高度不等，说明 align-items:start 是真隐患（当前生产只是数据恰好相同）。
 *
 * 不改后端、不落库，纯前端 DOM 注入，刷新即恢复。
 */
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const puppeteer = require('puppeteer-core')

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const ADMIN = process.env.ADMIN_BASE || 'https://admin.zfculture.site'
const OUT = path.resolve(__dirname, '../../.workbuddy/tmp/qa/equal-height')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function makeToken() {
  const secret = fs.readFileSync('/tmp/jwt_secret.txt', 'utf8').trim()
  const b64u = (i) => Buffer.from(i).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const now = Math.floor(Date.now() / 1000)
  const h = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const pl = b64u(JSON.stringify({ userId: 1, sub: 'admin', typ: 'access', iat: now, exp: now + 7200 }))
  const body = `${h}.${pl}`
  return `${body}.${b64u(crypto.createHmac('sha256', secret).update(body).digest())}`
}

const HEIGHTS = () =>
  Array.from(document.querySelectorAll('.member-wb .plans .plan, .plans .plan')).map((n) => ({
    h: Math.round(n.getBoundingClientRect().height),
    perks: n.querySelectorAll('.perk').length,
  }))

;(async () => {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })
  const token = makeToken()
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox'],
    defaultViewport: { width: 1680, height: 1100 },
  })
  const page = await browser.newPage()

  await page.evaluateOnNewDocument((tk) => {
    localStorage.setItem('access_token', tk)
    localStorage.setItem('admin-theme', 'warm')
  }, token)
  await page.goto(`${ADMIN}/member/plans`, { waitUntil: 'networkidle2', timeout: 45000 })
  await sleep(2400)

  console.log('align-items =', await page.evaluate(() => getComputedStyle(document.querySelector('.plans')).alignItems))
  const before = await page.evaluate(HEIGHTS)
  console.log('改数据前:', JSON.stringify(before))
  await page.screenshot({ path: path.join(OUT, '10-plans-before.png') })

  // 注入：把第 2 张卡的权益删到 1 条，第 3 张保留全部 —— 模拟「各卡权益数不同」
  const injected = await page.evaluate(() => {
    const plans = document.querySelectorAll('.plans .plan')
    if (plans.length < 2) return 'no-enough-plans'
    const perks = plans[1].querySelectorAll('.perk')
    for (let i = perks.length - 1; i >= 1; i--) perks[i].remove()
    return `plan[1] perks ${perks.length} -> 1`
  })
  console.log('注入:', injected)
  await sleep(600)

  const after = await page.evaluate(HEIGHTS)
  console.log('改数据后:', JSON.stringify(after))
  await page.screenshot({ path: path.join(OUT, '11-plans-after-uneven.png') })

  const hs = after.map((x) => x.h)
  const diff = hs.length ? Math.max(...hs) - Math.min(...hs) : 0
  console.log(`\n结论：权益条数不同时，卡片高度差 = ${diff}px ${diff > 12 ? '❌ 肉眼可见不齐' : '✅ 齐'}`)

  // 对照：临时把 align-items 改成 stretch，再量一次
  await page.addStyleTag({ content: '.plans{align-items:stretch !important}' })
  await sleep(400)
  const fixed = await page.evaluate(HEIGHTS)
  const fhs = fixed.map((x) => x.h)
  const fdiff = fhs.length ? Math.max(...fhs) - Math.min(...fhs) : 0
  console.log(`对照 stretch: ${JSON.stringify(fixed)}  高度差 = ${fdiff}px`)
  await page.screenshot({ path: path.join(OUT, '12-plans-after-stretch.png') })

  await browser.close()
})()
