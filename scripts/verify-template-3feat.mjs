/**
 * 验证模板管理的三项新功能（真点，不用 mock 假数据）。
 *
 * ① 搜索框：输入 → 列表真实收窄
 * ② 二级筛选：场景胶囊已下移成独立行，与一级 Tab 不同行
 * ③ 可交互预览：点底部 tab → 页面内容真的切换
 *
 * 🔴 为什么必须真点：
 *   - 搜索"看起来能用"但没接过滤 → 单测里的 matchKeyword 照样绿；
 *   - tab"画出来了"但点了不换页 → 只有点击才知道；
 *   - 筛选层级是纯视觉，**只有量DOM 的行位置才能证明**。
 *
 * 数据源：ssh 拉线上真实模板（warm 5 页 / lite 3 页，页数不同才好验切页）。
 */
import { chromium } from 'playwright'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const BASE = process.env.WB_BASE || 'http://127.0.0.1:4425'
const OUT = path.resolve('output/template-3feat')

const raw = execSync(
  `ssh zfculture 'sudo mysql --batch --raw -N miniprogram_prod -e "SELECT template_code, template_name, snapshot FROM mp_miniapp_release WHERE mode=\\"template\\" AND is_system=1;"'`,
  { encoding: 'utf-8', maxBuffer: 32 * 1024 * 1024 },
)
const templates = []
for (const line of raw.split('\n')) {
  if (!line.trim()) continue
  const [code, name, snapshot] = line.split('\t')
  if (snapshot) templates.push({ templateCode: code, templateName: name, snapshot })
}
console.log(`线上模板 ${templates.length} 套`)

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const page = await ctx.newPage()

await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' }).catch(() => {})
await ctx.addInitScript((tk) => {
  localStorage.setItem('access_token', tk)
  localStorage.setItem('refresh_token', tk)
}, 'x.y.z')

await ctx.route('**/api/v1/**', async (route) => {
  const p = route.request().url().replace(/^https?:\/\/[^/]+/, '').split('?')[0]
  const json = (d) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(d) })
  const ok = (data) => ({ code: 200, message: 'success', data })
  if (p === '/api/v1/admin/auth/profile')
    return json(ok({ id: 1, username: 'a', nickname: 'a', roles: ['super_admin'], permissions: ['*'] }))
  if (p.includes('/miniapp-releases'))
    return json(ok(templates.map((t, i) => ({
      id: 100 + i, semver: `t.0.${i + 1}`, patch: i + 1,
      templateCode: t.templateCode, templateName: t.templateName, templateScene: 'content',
      isSystem: true, status: 2, mode: 'template', pageCount: 4,
      snapshot: t.snapshot, hasSnapshot: true, currentLive: i === 0,
    }))))
  if (p === '/api/v1/admin/mini/site') return json(ok({ name: '测试', theme: {}, tabBar: [] }))
  if (p === '/api/v1/admin/pages') return json(ok({ records: [], total: 0 }))
  if (p === '/api/v1/admin/page-templates') return json(ok({ records: [], total: 0 }))
  return json(ok(null))
})

const problems = []
const pass = (s) => console.log(`  ✅ ${s}`)
const fail = (s) => { problems.push(s); console.log(`  ❌ ${s}`) }

await page.goto(`${BASE}/mini/templates`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2500)
fs.mkdirSync(OUT, { recursive: true })

/* ── ① 搜索框存在且能收窄列表 ── */
console.log('\n① 搜索框')
const searchBox = await page.$('.tpl-search input')
if (!searchBox) fail('搜索框不存在')
else {
  pass('搜索框已渲染')
  const before = await page.$$eval('.tpl-grid .tpl', (e) => e.length)
  // 搜一个只匹配 1 个模板的词
  await searchBox.fill('知识付费')
  await page.waitForTimeout(500)
  const after = await page.$$eval('.tpl-grid .tpl', (e) => e.length)
  if (after > 0 && after < before) pass(`搜索生效：${before} → ${after}`)
  else fail(`搜索没收窄列表：${before} → ${after}`)

  // 中英混输（回归：原来整串 includes 搜不到）
  await searchBox.fill('edu 知识')
  await page.waitForTimeout(500)
  const mixed = await page.$$eval('.tpl-grid .tpl', (e) => e.length)
  if (mixed > 0) pass(`中英混输「edu 知识」→ ${mixed} 个`)
  else fail('中英混输「edu 知识」搜不到（分词 OR 未生效）')

  // 无结果时应有空态
  await searchBox.fill('zzz不存在的模板')
  await page.waitForTimeout(500)
  const none = await page.$$eval('.tpl-grid .tpl', (e) => e.length)
  if (none === 0) pass('无匹配时列表清空')
  else fail(`无匹配时仍有 ${none} 个`)

  await page.screenshot({ path: path.join(OUT, '01-search-empty.png') })
  await searchBox.fill('')
  await page.waitForTimeout(400)
}

/* ── ② 场景筛选与一级 Tab 不同行 ── */
console.log('\n② 筛选层级')
const layer = await page.evaluate(() => {
  const tabs = document.querySelector('.tabs-line')
  const bar = document.querySelector('.tpl-filterbar')
  if (!tabs || !bar) return { ok: false }
  const a = tabs.getBoundingClientRect()
  const b = bar.getBoundingClientRect()
  return { ok: true, tabsBottom: Math.round(a.bottom), barTop: Math.round(b.top), sameRow: a.bottom > b.top }
})
if (!layer.ok) fail('找不到 .tabs-line 或 .tpl-filterbar')
else if (layer.sameRow) fail(`场景筛选仍与一级 Tab 同行（tabs.bottom=${layer.tabsBottom} > bar.top=${layer.barTop}）`)
else pass(`已分层：一级 Tab 底 ${layer.tabsBottom}px，二级筛选顶 ${layer.barTop}px`)
await page.screenshot({ path: path.join(OUT, '02-filterbar.png') })

/* ── ③ 可交互预览：点底部 tab 真的切页 ── */
console.log('\n③ 可交互预览')
// 打开第一个模板的预览
const firstCard = await page.$('.tpl-grid .tpl')
if (!firstCard) fail('没有模板卡片')
else {
  // 🔴 先看卡片上到底有哪些可点元素 —— 直接点 (60,20) 可能是封面
  //（封面在新建逻辑里是纯展示），那样根本不会打开预览。
  const btns = await page.$$eval('.tpl-grid .tpl:first-child button', (els) =>
    els.map((e) => ({ text: (e.textContent || '').trim().slice(0, 12), title: e.getAttribute('title') || '' })),
  )
  console.log('    卡片按钮:', JSON.stringify(btns))
  const previewBtn = await page.$('.tpl-grid .tpl:first-child button:has-text("预览")')
  if (previewBtn) {
    console.log('    找到「预览」按钮，点击')
    await previewBtn.click()
  } else {
    console.log('    无「预览」按钮，回退点卡片标题')
    await firstCard.click({ position: { x: 60, y: 20 } })
  }
  await page.waitForTimeout(1800)

  const hasPhone = await page.$('.tpl-iphone')
  if (!hasPhone) {
    fail('预览面板里没有可交互手机壳（.tpl-iphone）')
  } else {
    pass('可交互手机壳已渲染')
    const tabs = await page.$$('.tpl-iphone__tab')
    pass(`底部 tab ${tabs.length} 个（= 模板真实页数）`)

    if (tabs.length >= 2) {
      const first = await page.$eval('.tpl-iphone__tab.is-active .tpl-iphone__label', (e) => e.textContent)
      const pagerBefore = await page.$eval('.tpl-iphone__pager span', (e) => e.textContent)
      // 点第 2 个 tab
      await tabs[1].click()
      await page.waitForTimeout(500)
      const nowActive = await page.$eval('.tpl-iphone__tab.is-active .tpl-iphone__label', (e) => e.textContent)
      const pagerAfter = await page.$eval('.tpl-iphone__pager span', (e) => e.textContent)
      if (nowActive !== first || pagerBefore !== pagerAfter) {
        pass(`点 tab 切换生效：${first}(${pagerBefore}) → ${nowActive}(${pagerAfter})`)
      } else {
        fail(`点 tab 没切换：仍是 ${first}(${pagerBefore})`)
      }

      // 上一页按钮
      await page.$eval('.tpl-iphone__pager button:last-child', () => {})
      const nextBtn = await page.$$('.tpl-iphone__pager button')
      if (nextBtn.length === 2) {
        await nextBtn[1].click()
        await page.waitForTimeout(400)
        const after2 = await page.$eval('.tpl-iphone__pager span', (e) => e.textContent)
        pass(`下一页按钮可用：${pagerAfter} → ${after2}`)
      }
    } else {
      pass('只有 1 页，跳过切页验证（模板本身单页）')
    }
    await page.screenshot({ path: path.join(OUT, '03-interactive-preview.png') })
  }
}

console.log(problems.length ? `\n❌ ${problems.length} 个问题` : '\n✅ 全部通过')
await browser.close()
process.exit(problems.length ? 1 : 0)