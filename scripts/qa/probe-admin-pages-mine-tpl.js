/**
 * 页面管理「系统页」组 —— 「我的」行 + 我的页模板库 验证
 *
 * 覆盖四件事：
 *  ① 「我的」行出现「模板 · xx」徽标，「配置」按钮改成「配置模板」并指向 /page-builder/mine
 *  ② 行下方列出 6 套模板，每套都有真实渲染缩略图
 *  ③ 点一套 → 确认 → 写入待上线草稿 → 徽标/「使用中」跟着变
 *  ④ 悬停「我的」行浮出真实预览卡
 *
 * 用法：NODE_PATH=<workspace>/node_modules node scripts/qa/probe-admin-pages-mine-tpl.js
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
  const body = `${b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${b64u(
    JSON.stringify({ userId: 1, sub: 'admin', typ: 'access', iat: now, exp: now + 7200 }),
  )}`
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
  return line.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '')
}

async function main() {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })
  const token = signJwt(readJwtSecret())

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-http2'],
    defaultViewport: { width: 1680, height: 1180 },
  })
  const page = await browser.newPage()
  page.on('pageerror', (e) => console.log('PAGEERR', String(e.message).slice(0, 200)))
  page.on('console', (m) => {
    if (m.type() === 'error') console.log('[console.error]', String(m.text()).slice(0, 200))
  })

  await page.evaluateOnNewDocument((t) => {
    try { localStorage.setItem('access_token', t) } catch (e) { /* noop */ }
  }, token)

  try {
    await page.goto(`${ADMIN}/mini/pages`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  } catch (e) {
    console.log('goto 超时，继续等渲染：', String(e.message).slice(0, 70))
  }

  // goto 超时后 Chrome 偶尔会留下半加载文档，这里改成轮询等 SPA 真正挂上
  try {
    for (let i = 0; i < 20; i += 1) {
      const ok = await page.evaluate(() => !!document.querySelector('.tpl-stack')).catch(() => false)
      if (ok) break
      await sleep(2000)
    }
    await page.waitForSelector('.tpl-stack', { timeout: 20000 })
  } catch (e) {
    const diag = await page.evaluate(() => ({
      href: location.href,
      text: (document.body.innerText || '').slice(0, 260),
    }))
    console.log('未出现 .tpl-stack，诊断：', JSON.stringify(diag, null, 1))
    await page.screenshot({ path: `${OUT}/admin-pages-mine-fail.png` })
    await browser.close()
    return
  }
  await sleep(2500)

  const rows = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.sys-row')).map((r) => ({
      name: r.querySelector('.pname b')?.textContent?.trim(),
      tags: Array.from(r.querySelectorAll('.tag')).map((t) => t.textContent.trim()),
      button: r.querySelector('.prow-ops button')?.textContent?.trim(),
      buttonTitle: r.querySelector('.prow-ops button')?.getAttribute('title'),
    }))
  })
  console.log('系统页行：', JSON.stringify(rows, null, 1))

  const tplInfo = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.tpl-item'))
    return {
      count: items.length,
      head: document.querySelector('.tpl-stack__hd')?.innerText.replace(/\s+/g, ' ').trim(),
      items: items.map((el) => ({
        name: el.querySelector('.tpl-item__name')?.innerText.replace(/\s+/g, ' ').trim(),
        meta: el.querySelector('.tpl-item__meta')?.innerText.trim(),
        op: el.querySelector('.tpl-item__op')?.textContent?.trim(),
        active: el.classList.contains('tpl-item--active'),
        hasPreview: !!el.querySelector('.tpl-item__inner .mine-page-preview'),
        thumbH: Math.round(el.querySelector('.tpl-item__thumb')?.getBoundingClientRect().height || 0),
      })),
    }
  })
  console.log('模板子行：', JSON.stringify(tplInfo, null, 1))

  // 系统页组整体截图
  const groupEl = await page.$('.groups-stack section')
  if (groupEl) {
    await groupEl.screenshot({ path: `${OUT}/pages-sysgroup.png` })
    console.log(`截图：${OUT}/pages-sysgroup.png`)
  }

  // ④ 悬停「我的」行 → 浮出真实预览
  const mineRow = await page.evaluateHandle(() => {
    return Array.from(document.querySelectorAll('.sys-row')).find((r) =>
      (r.querySelector('.pname b')?.textContent || '').trim() === '我的',
    )
  })
  const box = await mineRow.asElement()?.boundingBox()
  if (box) {
    await page.mouse.move(box.x + box.width * 0.4, box.y + box.height / 2)
    await sleep(1200)
    const hover = await page.evaluate(() => {
      const card = document.querySelector('.mine-hp')
      return card
        ? {
            visible: getComputedStyle(card).display !== 'none',
            head: card.querySelector('.mine-hp__hd')?.innerText.replace(/\s+/g, ' ').trim(),
            hasPreview: !!card.querySelector('.mine-page-preview'),
          }
        : null
    })
    console.log('悬停预览：', JSON.stringify(hover))
    await page.screenshot({ path: `${OUT}/pages-mine-hover.png` })
    console.log(`截图：${OUT}/pages-mine-hover.png`)
    await page.mouse.move(20, 20)
    await sleep(400)
  } else {
    console.log('未找到「我的」行，跳过悬停验证')
  }

  // ③ 套用第 4 套（交易版）——与当前兜底菜单不同，便于确认状态真的变了
  const before = tplInfo.items.map((i) => i.name).join(' / ')
  await page.evaluate(() => {
    const items = document.querySelectorAll('.tpl-item')
    const target = items[3] || items[0]
    target.scrollIntoView({ block: 'center' })
    target.click()
  })
  await sleep(1200)
  await page.screenshot({ path: `${OUT}/pages-mine-apply-confirm.png` })
  console.log(`截图：${OUT}/pages-mine-apply-confirm.png`)

  const confirmText = await page.evaluate(() => {
    const dlg = document.querySelector('.el-message-box')
    return dlg ? dlg.innerText.replace(/\s+/g, ' ').trim() : null
  })
  console.log('确认弹窗：', confirmText)

  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.el-message-box__btns button'))
    const ok = btns.find((b) => /套用/.test(b.innerText)) || btns[btns.length - 1]
    ok && ok.click()
  })
  await sleep(3500)

  const after = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.sys-row'))
    const mine = rows.find((r) => (r.querySelector('.pname b')?.textContent || '').trim() === '我的')
    const active = document.querySelector('.tpl-item--active')
    return {
      mineTags: mine ? Array.from(mine.querySelectorAll('.tag')).map((t) => t.textContent.trim()) : [],
      activeName: active?.querySelector('.tpl-item__name')?.innerText.replace(/\s+/g, ' ').trim() || '',
      toast: Array.from(document.querySelectorAll('.el-message')).map((m) => m.innerText.trim()).join(' | '),
    }
  })
  console.log('套用后：', JSON.stringify(after, null, 1))
  console.log(`模板顺序：${before}`)
  await page.screenshot({ path: `${OUT}/pages-mine-applied.png`, fullPage: true })
  console.log(`截图：${OUT}/pages-mine-applied.png`)

  // ① 「配置模板」按钮 → 应进入 /page-builder/mine（不是 /mini/appearance）
  await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.sys-row'))
    const mine = rows.find((r) => (r.querySelector('.pname b')?.textContent || '').trim() === '我的')
    mine.querySelector('.prow-ops button').click()
  })
  await sleep(4000)
  const landed = await page.evaluate(() => ({
    href: location.href,
    hasTplGrid: !!document.querySelector('.tpl-grid'),
  }))
  console.log('点「配置模板」后：', JSON.stringify(landed))

  await browser.close()
  console.log('done')
}

main().catch((e) => {
  console.log('FATAL:', e && (e.message || e))
  process.exit(1)
})
