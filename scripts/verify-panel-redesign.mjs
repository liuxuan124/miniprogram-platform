import { createRequire } from 'node:module'
const require = createRequire(process.cwd() + '/')
const { chromium } = require('playwright')
import { readFileSync } from 'node:fs'
const TOKEN = readFileSync('/tmp/wb_tk.txt', 'utf8').trim()
const URL = process.env.URL || 'http://localhost:5180/page-builder/editor/21'
const OUT = process.env.OUT || '/tmp/hover-preview.png'

const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1600, height: 900 } })
await p.addInitScript(([t]) => {
  localStorage.setItem('access_token', t)
  localStorage.setItem('pagebuilder_recent_components', JSON.stringify(['banner', 'product_list']))
}, [TOKEN])
await p.goto(URL, { waitUntil: 'networkidle' })
await p.waitForTimeout(3000)

const ok = [], fail = []
const check = (c, m) => (c ? ok.push(m) : fail.push(m))

/* 1. hover 出现骨架预览 */
for (const label of ['轮播图', '商品列表', '会员方案', '笔记瀑布流']) {
  const card = p.locator('.component-card', { hasText: label }).first()
  if (!(await card.count())) { fail.push('找不到 ' + label); continue }
  await card.scrollIntoViewIfNeeded()
  await card.hover()
  await p.waitForTimeout(700)
  const pop = p.locator('.comp-help-pop')
  const vis = await pop.isVisible().catch(() => false)
  check(vis, `${label} hover 弹出浮层`)
  if (!vis) continue
  const info = await p.evaluate(() => {
    const pop = document.querySelector('.comp-help-pop')
    const thumb = pop?.querySelector('.block-thumb')
    const canvas = pop?.querySelector('.block-thumb__canvas')
    return {
      wide: pop?.classList.contains('comp-help-pop--wide'),
      hasThumb: !!thumb,
      thumbW: thumb ? Math.round(thumb.getBoundingClientRect().width) : 0,
      thumbH: thumb ? Math.round(thumb.getBoundingClientRect().height) : 0,
      // canvas 是否有实际内容（非空白）
      canvasChildren: canvas ? canvas.children.length : 0,
      canvasH: canvas ? Math.round(canvas.getBoundingClientRect().height) : 0,
      tag: pop?.querySelector('.comp-help-pop__previewTag')?.textContent?.trim() || '',
    }
  })
  check(info.hasThumb, `${label} 浮层含骨架缩略图`)
  check(info.canvasChildren > 0, `${label} 骨架有实际内容（${info.canvasChildren} 个子节点）`)
  check(info.thumbW > 100 && info.thumbH > 80, `${label} 骨架尺寸正常 ${info.thumbW}×${info.thumbH}`)
  check(info.wide, `${label} 宽版布局生效`)
  if (label === '会员方案') await p.screenshot({ path: OUT })
}

/* 2. 容器类组件不应显示骨架（预览是空壳，看了等于没看） */
const divider = p.locator('.component-card', { hasText: '分割线' }).first()
if (await divider.count()) {
  await divider.hover()
  await p.waitForTimeout(600)
  const hasThumb = await p.locator('.comp-help-pop .block-thumb').count()
  check(hasThumb === 0, '「分割线」不显示骨架（空壳组件）')
  await p.mouse.move(1200, 700)
}

/* 2.5 最近使用区：必须**全部可见 + 文字不裁**
 * ⚠️ 判据来自实测：面板 249px，单行横滑时 6 个胶囊内容总宽 459px
 * → 只露 2.3 个，「星球顶栏」被硬裁成「星球顶…」，看起来像坏了。
 * ⇒ 改为 2 列换行铺开；此处固化「全部在容器内 + 无文字裁切」两条。
 */
const strip = await p.evaluate(() => {
  const grid = document.querySelector('.recent-strip__grid')
  if (!grid) return { none: true }
  const gr = grid.getBoundingClientRect()
  const chips = [...document.querySelectorAll('.recent-chip')]
  return {
    none: false,
    count: chips.length,
    allInside: chips.every((c) => {
      const r = c.getBoundingClientRect()
      return r.right <= gr.right + 1 && r.left >= gr.left - 1 && r.bottom <= gr.bottom + 1
    }),
    clipped: chips
      .map((c) => {
        const s = c.querySelector('span')
        return { t: c.textContent.trim(), cut: s.scrollWidth > s.clientWidth + 1 }
      })
      .filter((x) => x.cut)
      .map((x) => x.t),
    rows: Math.round(gr.height / 28),
  }
})
if (strip.none) {
  console.log('  （本浏览器无最近使用记录，跳过该检查）')
} else {
  check(strip.allInside, `最近使用 ${strip.count} 个全部在容器内（未横滑裁切）`)
  check(strip.clipped.length === 0, `最近使用文字无裁切${strip.clipped.length ? '：' + strip.clipped.join('/') : ''}`)
}

/* 3. 分类切换跳转 */
const before = await p.evaluate(() => document.querySelector('.component-grid')?.scrollTop ?? 0)
const tab = p.locator('.cat-tabs__item', { hasText: '营销' }).first()
if (await tab.count()) {
  await tab.click()
  // ⚠️ grid 上有 scroll-behavior: smooth，必须等滚动**停稳**再断言，
  // 否则量到的是动画中间态（会误报「没进可视区」）
  await p.waitForFunction(
    () => {
      const b = document.querySelector('.component-grid')
      if (!b) return false
      if (b._lastTop === b.scrollTop) return true
      b._lastTop = b.scrollTop
      return false
    },
    null,
    { timeout: 5000, polling: 200 },
  )
  await p.waitForTimeout(300)
  const after = await p.evaluate(() => {
    const box = document.querySelector('.component-grid')
    const target = document.querySelector('#cat-marketing')
    if (!box || !target) return { hasTarget: false }
    const r = target.getBoundingClientRect()
    const br = box.getBoundingClientRect()
    return {
      hasTarget: true,
      top: box.scrollTop,
      // 相对容器的位置：0 ~ clientHeight 即在可视区
      relTop: Math.round(r.top - br.top),
      clientH: Math.round(br.height),
      inView: r.top >= br.top - 4 && r.top <= br.bottom - 20,
      // 该分类第一张卡片也要在视口内
      firstCardInView: (() => {
        const first = target.nextElementSibling
        if (!first) return null
        const fr = first.getBoundingClientRect()
        return fr.top <= br.bottom
      })(),
    }
  })
  check(after.hasTarget, '营销锚点存在')
  check(after.inView, `营销标题在可视区内（相对位置 ${after.relTop}px / 容器高 ${after.clientH}px）`)
  /*
   * ⚠️ 不能断言「scrollTop 必须变化」：jumpToCategory 有「目标已在可视区就不动」
   * 的优化（点了没反应会让人以为按钮坏了）。所以正确判据是**跳转后目标在视口内**。
   * 跨分类的滚动能力另用一个必定跨越视口的场景验证。
   */
  if (after.top === before) {
    ok.push(`scrollTop 未变是预期行为（营销已在可视区 ${after.relTop}px，跳转逻辑跳过滚动）`)
  } else {
    ok.push(`点「营销」后发生滚动 ${before} → ${Math.round(after.top)}`)
  }
  check(after.firstCardInView !== false, '营销分类第一张卡片也在视口内')

  /* 4. 跨屏跳转：点最后一个分类（品牌），必然需要滚动 */
  const lastTab = p.locator('.cat-tabs__item').last()
  if (await lastTab.count()) {
    const lastLabel = (await lastTab.innerText()).trim().split('\n')[0].trim()
    await lastTab.click()
    await p.waitForFunction(
      () => {
        const b = document.querySelector('.component-grid')
        if (!b) return false
        if (b._l2 === b.scrollTop) return true
        b._l2 = b.scrollTop
        return false
      },
      null,
      { timeout: 5000, polling: 200 },
    )
    await p.waitForTimeout(300)
    const jump = await p.evaluate(() => {
      const box = document.querySelector('.component-grid')
      const br = box.getBoundingClientRect()
      // 最后一个分类锚点（#cat-warm）的位置 —— 必须查「被点的那个」，
      // 不能查「视口内第一个标题」，后者是内容类，与本次跳转无关
      const target = document.querySelector('#cat-warm')
      return {
        top: Math.round(box.scrollTop),
        exists: !!target,
        rel: target ? Math.round(target.getBoundingClientRect().top - br.top) : null,
        firstCardRel: (() => {
          if (!target) return null
          const first = target.nextElementSibling
          if (!first) return null
          return Math.round(first.getBoundingClientRect().top - br.top)
        })(),
      }
    })
    check(jump.exists, `末位分类（${lastLabel}）锚点存在`)
    /*
     * ⚠️ 末位分类**不可能**滚到视口顶部：它是最后一个，下面内容不足以填满视口，
     * scrollTop 已到 max（实测 1085/1085）时品牌标题 rel=502px 是几何极限，
     * 再滚也不会动。正确判据是「目标在视口内且已滚到不能再滚」，
     * 而不是强求 rel≈0 —— 否则会写出一个永远失败的断言。
     */
    const box2 = await p.evaluate(() => {
      const b = document.querySelector('.component-grid')
      return { atMax: Math.abs(b.scrollTop - (b.scrollHeight - b.clientHeight)) < 2 }
    })
    check(
      jump.rel !== null && jump.rel >= -4 && jump.rel <= 656,
      `点「${lastLabel}」后其标题在视口内（rel=${jump.rel}px, scrollTop=${jump.top}）`,
    )
    if (jump.rel > 200) {
      check(box2.atMax, `rel>200 是因为末位分类已滚到底（scrollTop 达 max），非跳转失败`)
    }
    check(
      jump.firstCardRel !== null && jump.firstCardRel <= jump.rel + 200,
      `「${lastLabel}」第一张卡片紧跟标题（rel=${jump.firstCardRel}px）`,
    )
  }
  await p.screenshot({ path: '/tmp/after-jump.png' })
} else {
  fail.push('找不到营销分类按钮')
}

console.log('通过：')
ok.forEach(m => console.log('  ✓ ' + m))
if (fail.length) { console.error('失败：'); fail.forEach(m => console.error('  ✗ ' + m)) }
console.log(`\n通过 ${ok.length} / 失败 ${fail.length}`)
await b.close()
process.exitCode = fail.length ? 1 : 0
