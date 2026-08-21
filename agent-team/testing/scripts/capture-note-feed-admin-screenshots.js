const fs = require('fs')
const path = require('path')
const { chromium } = require('playwright')

const EVID = path.resolve(__dirname, '../evidence/note-feed-verify')
const ADMIN = process.env.ADMIN_URL || 'http://127.0.0.1:3000'

async function login(page) {
  await page.goto(`${ADMIN}/login`, { waitUntil: 'networkidle' })
  await page.fill('input[placeholder*="用户名"], input[type="text"]', 'admin')
  await page.fill('input[type="password"]', 'admin123')
  await page.click('button:has-text("登录"), button[type="submit"]')
  await page.waitForURL(/^(?!.*login).*$/, { timeout: 15000 })
}

async function main() {
  fs.mkdirSync(EVID, { recursive: true })
  const metaPath = path.join(EVID, 'page-meta.json')
  if (!fs.existsSync(metaPath)) {
    console.error('missing page-meta.json, run setup-note-feed-page.py first')
    process.exit(1)
  }
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'))
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } })

  try {
    await login(page)

    // 1) 装修器手机预览：笔记瀑布流组件
    await page.goto(meta.previewUrl, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2500)
    await page.screenshot({ path: path.join(EVID, '04-admin-note-feed-preview.png'), fullPage: true })

    // 2) 内容编辑页：笔记形态
    await page.goto(`${ADMIN}/content/edit`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1200)
    await page.click('label:has-text("笔记"), .el-radio-button:has-text("笔记")')
    await page.waitForTimeout(800)
    await page.screenshot({ path: path.join(EVID, '05-admin-note-editor.png'), fullPage: true })

    // 3) 内容列表 API 已在 seed 阶段验证；再截一张内容管理列表
    await page.goto(`${ADMIN}/content/article`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    await page.screenshot({ path: path.join(EVID, '06-admin-content-list.png'), fullPage: true })

    console.log(JSON.stringify({ ok: true, shots: fs.readdirSync(EVID).filter((f) => f.endsWith('.png')) }, null, 2))
  } finally {
    await browser.close()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
