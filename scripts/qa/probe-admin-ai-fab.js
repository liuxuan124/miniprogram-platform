/**
 * 装修器 AI 助手入口改造后的视觉验证
 * 验证点：① 画布底部不再有常驻 AI 抽屉 ② 右下角悬浮按钮存在且美观
 *        ③ 点击后弹出 AI 对话框，含空态引导 + 快捷胶囊 + 输入区
 * 用法：NODE_PATH=<workspace>/node_modules node scripts/qa/probe-admin-ai-fab.js
 */
const crypto = require('crypto')
const path = require('path')
const fs = require('fs')
const puppeteer = require('puppeteer-core')

const OUT = path.resolve(__dirname, '../../.workbuddy/tmp/qa')
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const ADMIN = process.env.ADMIN_BASE || 'https://admin.zfculture.site'
const PAGE_ID = process.env.PAGE_ID || '29'
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
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1680, height: 1050 },
  })
  const page = await browser.newPage()
  await page.evaluateOnNewDocument((t) => {
    localStorage.setItem('access_token', t)
  }, token)

  const url = `${ADMIN}/page-builder/editor/${PAGE_ID}`
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 })
  } catch (e) {
    console.log('goto 超时容忍:', e.message)
  }

  const loaded = await page
    .waitForSelector('.ai-fab', { timeout: 45000 })
    .then(() => true)
    .catch(() => false)
  console.log('AI 悬浮按钮出现:', loaded)
  await sleep(3500)

  // 1) 旧抽屉必须已下线
  const legacy = await page.evaluate(() => ({
    aiDrawer: document.querySelectorAll('.ai-drawer').length,
    aiReplyBox: document.querySelectorAll('.ai-assistant__reply').length,
  }))
  console.log('旧抽屉残留:', JSON.stringify(legacy))

  // 2) 悬浮按钮几何与样式
  const fab = await page.evaluate(() => {
    const el = document.querySelector('.ai-fab')
    if (!el) return null
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return {
      text: el.textContent.replace(/\s+/g, ' ').trim(),
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      radius: cs.borderRadius,
      background: cs.backgroundImage.slice(0, 60),
      color: cs.color,
      shadow: cs.boxShadow.slice(0, 60),
      viewport: { w: window.innerWidth, h: window.innerHeight },
    }
  })
  console.log('悬浮按钮:', JSON.stringify(fab, null, 2))

  await page.screenshot({ path: path.join(OUT, 'ai-fab-1-editor.png') })

  // 3) 点击打开对话框
  await page.click('.ai-fab')
  const dialogOk = await page
    .waitForSelector('.ai-chat-dialog', { timeout: 15000 })
    .then(() => true)
    .catch(() => false)
  console.log('AI 对话框打开:', dialogOk)
  await sleep(1200)

  const dlg = await page.evaluate(() => {
    const d = document.querySelector('.ai-chat-dialog')
    if (!d) return null
    const r = d.getBoundingClientRect()
    return {
      title: d.querySelector('.ai-chat__head-title')?.textContent.trim() || '',
      sub: d.querySelector('.ai-chat__head-sub')?.textContent.trim() || '',
      emptyTitle: d.querySelector('.ai-chat__empty-title')?.textContent.trim() || '',
      pills: Array.from(d.querySelectorAll('.ai-pill')).map((p) => p.textContent.trim()),
      hasTextarea: !!d.querySelector('.ai-chat__composer textarea'),
      sendBtn: d.querySelector('.ai-chat__send')?.textContent.trim() || '',
      threadH: Math.round(d.querySelector('.ai-chat__thread')?.getBoundingClientRect().height || 0),
      rect: { w: Math.round(r.width), h: Math.round(r.height) },
    }
  })
  console.log('对话框内容:', JSON.stringify(dlg, null, 2))

  await page.screenshot({ path: path.join(OUT, 'ai-fab-2-dialog.png') })

  // 4) 注入假消息，验证聊天气泡 + 建议卡片视觉（不发真实请求）
  await page.evaluate(() => {
    const d = document.querySelector('.ai-chat-dialog')
    const t = d.querySelector('.ai-chat__thread')
    t.innerHTML = `
      <div class="ai-msg ai-msg--user"><div class="ai-msg__main"><div class="ai-msg__bubble">把首屏轮播换成节日氛围，底色偏暖一点</div></div></div>
      <div class="ai-msg ai-msg--ai">
        <span class="ai-msg__avatar"></span>
        <div class="ai-msg__main">
          <div class="ai-msg__bubble">可以这样改：主色换成暖橘，轮播图替换为 3 张节日主视觉，并给主按钮加上描边。下面几条可以直接应用。</div>
          <div class="ai-patch-list">
            <div class="ai-patch-list__title">可应用的改动</div>
            <div class="ai-patch-row"><div class="ai-patch-row__text">页面名称改为「冬至暖宴」</div><div class="ai-patch-row__actions"><button class="el-button el-button--small el-button--primary is-plain">应用</button><button class="el-button el-button--small is-text">忽略</button></div></div>
            <div class="ai-patch-row"><div class="ai-patch-row__text">页面背景色 → #FBF1E7</div><div class="ai-patch-row__actions"><button class="el-button el-button--small el-button--primary is-plain">应用</button><button class="el-button el-button--small is-text">忽略</button></div></div>
            <div class="ai-patch-row"><div class="ai-patch-row__text">插入组件「轮播图」</div><div class="ai-patch-row__actions"><button class="el-button el-button--small el-button--primary is-plain">应用</button><button class="el-button el-button--small is-text">忽略</button></div></div>
            <div class="ai-patch-list__foot"><button class="el-button el-button--small is-text">全部应用</button><button class="el-button el-button--small is-text">撤销上次应用</button></div>
          </div>
        </div>
      </div>`
    // 隐藏空态，露出注入内容
    const empty = d.querySelector('.ai-chat__empty')
    if (empty) empty.style.display = 'none'
  })
  await sleep(600)
  await page.screenshot({ path: path.join(OUT, 'ai-fab-3-thread.png') })

  console.log('截图目录:', OUT)
  await browser.close()
}

main().catch((e) => {
  console.error('探针失败:', e)
  process.exit(1)
})
