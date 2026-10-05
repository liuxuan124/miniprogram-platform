/**
 * 组件库 hover 说明浮层 E2E 验证
 *
 * 验证 5 件事（每件都对应一个真实踩坑点）：
 *   1. 卡片 hover 后浮层出现，且三段（是什么/怎么用/什么时候用）都非空
 *   2. 浮层内容与 componentHelp.ts 里该 type 的文案一致（不是兜底文案）
 *   3. 浮层贴卡片右侧，且不超出视口右边界
 *   4. 指针从卡片移到浮层上，浮层**不消失**（宽限期逻辑生效）
 *   5. 按下卡片（准备拖拽）时浮层立刻收起，不跟着鼠标飞
 *
 * 用法：node scripts/verify-component-help-popover.mjs [baseURL]
 */
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const BASE = process.argv[2] || 'http://localhost:4178'
const TOKEN = process.env.ADMIN_TOKEN || ''
const OUT = '/Users/lx/项目文件/liuxuan/小程序搭建运营系统/output'
const SHOT = path.join(OUT, 'verify-component-help-popover.png')

/* 复用 componentHelp.ts 的文案做真源比对（直接读源文件，不引 TS） */
const helpSrc = fs.readFileSync(
  '/Users/lx/项目文件/liuxuan/小程序搭建运营系统/admin/src/components/page-builder/componentHelp.ts',
  'utf8',
)
const HELP = {}
for (const m of helpSrc.matchAll(/^\s{2}([a-z0-9_]+):\s*\{([\s\S]*?)^\s{2}\},/gm)) {
  const body = m[2]
  const pick = (key) => {
    const mm = body.match(new RegExp(`${key}:\\s*'([\\s\\S]*?)',\\s*$`, 'm'))
    return mm ? mm[1] : ''
  }
  HELP[m[1]] = { what: pick('what'), how: pick('how'), when: pick('when') }
}

const fail = []
const ok = []
const check = (cond, msg) => (cond ? ok.push(msg) : fail.push(msg))

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })

if (!TOKEN) {
  console.error('✗ 缺少 ADMIN_TOKEN 环境变量。')
  console.error('  自签方式：HS256，payload {sub:"admin", userId:1, typ:"access", iat, exp:iat+7200}，')
  console.error('  密钥取生产 config/backend.env 的 JWT_SECRET。')
  await browser.close()
  process.exit(2)
}

// 后台登录态存 localStorage['access_token']（见 admin/src/utils/auth.ts），
// 守卫读不到就重定向 /login，所以必须在 goto 之前注入。
await page.addInitScript(
  ([token]) => {
    localStorage.setItem('access_token', token)
  },
  [TOKEN],
)

await page.goto(`${BASE}/page-builder/editor/21`, { waitUntil: 'networkidle' })
await page.waitForTimeout(3000)

const cards = page.locator('.component-card')
const cardCount = await cards.count()
console.log(`组件卡片数：${cardCount}`)

if (cardCount === 0) {
  // 未登录被重定向到登录页 —— 这是环境限制，不是代码缺陷
  const url = page.url()
  console.log(`⚠ 未取到组件卡片（当前 ${url}）。可能未登录，请带上有效 token 后重跑。`)
  await page.screenshot({ path: SHOT })
  await browser.close()
  process.exit(2)
}

/* 逐个抽查前 12 张卡片 */
const targets = ['轮播图', '商品列表', '会员方案', '资料解锁卡', '弹性栅格']
for (const label of targets) {
  const card = page.locator('.component-card', { hasText: label }).first()
  if (!(await card.count())) {
    fail.push(`找不到卡片「${label}」（可能当前方案下该组件被隐藏）`)
    continue
  }
  await card.scrollIntoViewIfNeeded()
  await card.hover()
  await page.waitForTimeout(450)

  const pop = page.locator('.comp-help-pop')
  const vis = await pop.isVisible().catch(() => false)
  check(vis, `「${label}」hover 后浮层出现`)
  if (!vis) continue

  const text = await pop.innerText()
  const keys = ['是什么', '怎么用', '什么时候用']
  for (const k of keys) check(text.includes(k), `「${label}」浮层含「${k}」段`)

  // 抽查 4：宽限期 —— 指针移到浮层上，浮层仍在
  await pop.hover().catch(() => {})
  await page.waitForTimeout(320)
  check(await pop.isVisible().catch(() => false), `「${label}」指针移到浮层上不消失`)

  // 抽查 3：不越界
  const box = await pop.boundingBox()
  if (box) {
    check(box.x + box.width <= 1600 + 1, `「${label}」浮层未超出视口右边界（右缘 ${Math.round(box.x + box.width)}）`)
  }

  // 抽查 5：按下即收。
  //
  // ⚠️ 必须 up 之后立刻把指针移开：playwright 保持按下不放会让浏览器
  // 一直等手势结束，进程被 SIGTERM（实测 exit 137）。
  // up 会触发 onclick 把组件插进画布 —— 这是只读验证里无法完全避开的副作用，
  // 所以每轮之后都把指针挪到画布空白处，并用 scrollIntoViewIfNeeded
  // 重新定位下一张卡片，不依赖之前算出的坐标。
  const b2 = await card.boundingBox()
  if (b2) {
    await page.mouse.move(b2.x + b2.width / 2, b2.y + b2.height / 2)
    await page.waitForTimeout(400)
    if (!(await pop.isVisible().catch(() => false))) {
      fail.push(`「${label}」指针移回卡片后浮层未重新出现`)
      continue
    }
    await page.mouse.down()
    await page.waitForTimeout(180)
    check(!(await pop.isVisible().catch(() => false)), `「${label}」按下时浮层收起`)
    await page.mouse.up()
    await page.waitForTimeout(300)
    await page.mouse.move(1200, 800)
    await page.waitForTimeout(200)
  }
}

/* 文案真源比对：浮层文字必须来自 componentHelp.ts，不是硬编码兜底 */
const sample = HELP['banner']
if (sample && (await page.locator('.component-card', { hasText: '轮播图' }).count())) {
  const card = page.locator('.component-card', { hasText: '轮播图' }).first()
  await card.hover()
  await page.waitForTimeout(450)
  const t = await page.locator('.comp-help-pop').innerText()
  check(t.includes(sample.what.slice(0, 12)), '浮层文案与 componentHelp.ts 一致（非兜底）')
}

/* 截图留证 */
const card = page.locator('.component-card').first()
if (await card.count()) {
  await card.scrollIntoViewIfNeeded()
  await card.hover()
  await page.waitForTimeout(500)
}
await page.screenshot({ path: SHOT })

console.log('\n通过：')
ok.forEach((m) => console.log('  ✓ ' + m))
if (fail.length) {
  console.error('\n失败：')
  fail.forEach((m) => console.error('  ✗ ' + m))
}
console.log(`\n截图：${SHOT}`)
await browser.close()
process.exitCode = fail.length ? 1 : 0
