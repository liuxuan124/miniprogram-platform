/**
 * 商品编辑页「详情模板」选择器 + 预览 验证
 * 用法：NODE_PATH=<wb-workspace>/node_modules node scripts/qa/probe-admin-product-template.js
 */
const crypto = require('crypto')
const path = require('path')
const fs = require('fs')
const puppeteer = require('puppeteer-core')

const OUT = path.resolve(__dirname, '../../.workbuddy/tmp/qa')
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const ADMIN = 'http://localhost:3000'
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

async function main() {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })
  const secret = fs.readFileSync('/tmp/jwt_secret.txt', 'utf8').trim()
  const token = signJwt(secret)
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1440, height: 1000 },
  })
  const page = await browser.newPage()
  await page.evaluateOnNewDocument((t) => { localStorage.setItem('access_token', t) }, token)

  // 新建商品表单（无需有效 id，能渲染选择器即可）
  try { await page.goto(`${ADMIN}/commerce/product/edit`, { waitUntil: 'networkidle2', timeout: 60000 }) }
  catch (e) { console.log('goto 容忍:', e.message) }

  await sleep(3000)
  const ok = await page.waitForSelector('.detail-template-preview', { timeout: 30000 }).then(() => true).catch(() => false)
  console.log('详情模板预览组件出现:', ok)

  if (ok) {
    // 截整个表单区域
    const form = await page.$('.detail-template-preview')
    if (form) await form.screenshot({ path: path.join(OUT, 'product-template-preview.png') })
    // 尝试切换模板验证预览刷新
    await page.evaluate(() => {
      const sel = document.querySelector('.detail-template-row .el-select')
      if (sel) sel.click()
    })
    await sleep(800)
    await page.screenshot({ path: path.join(OUT, 'product-template-selector.png'), fullPage: false })
    console.log('截图已存')
  } else {
    console.log('预览组件未出现，可能有运行时错误')
    await page.screenshot({ path: path.join(OUT, 'product-template-fail.png'), fullPage: false })
  }
  await browser.close()
}
main().catch((e) => { console.error('FAILED:', e.message); process.exit(1) })
