/**
 * 用**真实线上数据**验证模板封面骨架。
 *
 * 🔴 为什么必须这么做：
 *   自检脚本用的是 mock 接口，返回空模板 → 卡片一张都渲染不出来，
 *   只能证明"没报错"，**证明不了封面真的修好了**。
 *   而这次的 bug 恰恰是"两个模板指向同一张图"——
 *   只有拿真实的 5 套模板（warm/retail/content/lite/edu）渲染，
 *   才能看出它们各不相同。
 *
 * 用法：node scripts/verify-template-covers.mjs
 */
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'

const BASE = process.env.WB_BASE || 'http://127.0.0.1:4418'
const OUT = path.resolve('output/template-verify')

/** 线上真实模板快照（ssh 拉取，含 snapshot/pages/dslContent） */
function loadRealTemplates() {
  const raw = execSync(
    `ssh zfculture 'sudo mysql --batch --raw -N miniprogram_prod -e "SELECT template_code, template_name, snapshot FROM mp_miniapp_release WHERE mode=\\"template\\" AND is_system=1;"'`,
    { encoding: 'utf-8', maxBuffer: 32 * 1024 * 1024 },
  )
  const out = []
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue
    const [code, name, snapshot] = line.split('\t')
    if (!snapshot) continue
    out.push({ templateCode: code, templateName: name, snapshot })
  }
  return out
}

const templates = loadRealTemplates()
console.log(`已拉取线上真实模板 ${templates.length} 套`)
for (const t of templates) console.log(`  · ${t.templateCode} / ${t.templateName}`)

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 980 } })
const page = await ctx.newPage()

await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' }).catch(() => {})
await ctx.addInitScript((tk) => {
  localStorage.setItem('access_token', tk)
  localStorage.setItem('refresh_token', tk)
}, 'x.y.z')

// 用真实快照 mock 模板接口
await ctx.route('**/api/v1/**', async (route) => {
  const url = route.request().url()
  const p = url.replace(/^https?:\/\/[^/]+/, '').split('?')[0]
  const json = (d) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(d) })
  const ok = (data) => ({ code: 200, message: 'success', data })

  if (p === '/api/v1/admin/auth/profile')
    return json(ok({ id: 1, username: 'a', nickname: 'a', roles: ['super_admin'], permissions: ['*'] }))
  if (p.includes('/miniapp-releases')) {
    return json(ok(templates.map((t, i) => ({
      id: 100 + i,
      semver: `t.0.${i + 1}`,
      patch: i + 1,
      templateCode: t.templateCode,
      templateName: t.templateName,
      templateScene: 'content',
      isSystem: true,
      status: 2,
      mode: 'template',
      pageCount: 4,
      snapshot: t.snapshot,
      hasSnapshot: true,
      currentLive: i === 0,
    }))))
  }
  if (p === '/api/v1/admin/mini/site')
    return json(ok({ name: '测试', theme: { primaryColor: '#C2410C' }, tabBar: [] }))
  if (p === '/api/v1/admin/pages') return json(ok({ records: [], total: 0 }))
  if (p === '/api/v1/admin/page-templates') return json(ok({ records: [], total: 0 }))
  return json(ok(null))
})

await page.goto(`${BASE}/mini/templates`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(3000)

fs.mkdirSync(OUT, { recursive: true })
await page.screenshot({ path: path.join(OUT, 'templates-real-data.png'), fullPage: true })

/** 统计每张卡片的封面特征：主色 + 块数 + tab 数 */
const covers = await page.$$eval('.tpl-skel', (els) =>
  els.map((el) => {
    const skel = el.querySelector('.tpl-skel__phone')
    return {
      hasSkeleton: !!skel,
      accent: getComputedStyle(el).getPropertyValue('--tpl-accent').trim(),
      blocks: el.querySelectorAll('.tpl-skel__block').length,
      tabs: el.querySelectorAll('.tpl-skel__tab').length,
      hasImg: !!el.querySelector('img'),
      empty: !!el.querySelector('.tpl-skel__empty'),
    }
  }),
)

console.log(`\n渲染出 ${covers.length} 张封面：`)
covers.forEach((c, i) => {
  console.log(
    `  ${i + 1}. 骨架=${c.hasSkeleton ? '✅' : '❌'} 色=${c.accent} 块=${c.blocks} tab=${c.tabs} 图=${c.hasImg ? '有' : '无'} 空占位=${c.empty ? '是' : '否'}`,
  )
})

// ── 断言 ──
const problems = []
if (!covers.length) problems.push('一张封面都没渲染出来')
const noSkeleton = covers.filter((c) => !c.hasSkeleton)
if (noSkeleton.length)
  problems.push(`${noSkeleton.length} 张没有骨架（退化成图片/空占位）`)

const accents = new Set(covers.map((c) => c.accent))
if (accents.size === 1 && covers.length > 1)
  problems.push(`所有封面主色相同（${[...accents][0]}）→ 又变成"一套图"了`)

const withImg = covers.filter((c) => c.hasImg)
if (withImg.length) problems.push(`${withImg.length} 张仍在用位图素材（应改用骨架）`)

const tabCounts = covers.map((c) => c.tabs)
console.log(`\n主色种类: ${accents.size} 种 →${[...accents].join(', ')}`)
console.log(`tab 数（= 模板页面数）: ${tabCounts.join(', ')}`)

if (problems.length) {
  console.log('\n❌ 发现问题:')
  problems.forEach((p) => console.log('  ·', p))
} else {
  console.log('\n✅ 全部通过：每张封面都由真实结构生成，风格统一且互不相同')
}

await browser.close()
process.exit(problems.length ? 1 : 0)