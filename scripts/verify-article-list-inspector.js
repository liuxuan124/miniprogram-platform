/**
 * ArticleList Inspector 重构 —— 真机验证（2026-10-06）
 *
 * 用 vite dev + harness 挂载**真实组件** ArticleListProps（不碰 DB、不登录），
 * 逐条核对本次重构的每一项。
 */
const { chromium } = require('playwright')
const fs = require('fs')

const BASE = 'http://localhost:5199/harness-article-list.html'
// admin token：让分类下拉与实时预览能真实取到已发布内容（只读，不写库）
const TOKEN = (() => {
  try { return fs.readFileSync('/tmp/wb_tk.txt', 'utf8').trim() } catch { return '' }
})()
const url = (extra = '') =>
  `${BASE}?token=${encodeURIComponent(TOKEN)}${extra}`

;(async () => {
  const results = []
  const ok = (name, pass, detail = '') => {
    results.push({ name, pass, detail })
    console.log(`${pass ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`)
  }

  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 900, height: 1400 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e.message || e)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })

  // ───── 默认布局（list / limit=3） ─────
  await page.goto(url('&layout=list&limit=3'), { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.article-list-props', { timeout: 20000 })
  await page.waitForTimeout(1800)

  const panel = await page.evaluate(() => document.querySelector('.article-list-props').innerText)
  const full = await page.evaluate(() => document.body.innerText)

  ok('Inspector 渲染成功', panel.length > 40, `文本长度 ${panel.length}`)

  // 1) 技术调试字段必须消失
  ok('无「数据源绑定」卡', !full.includes('数据源绑定'))
  ok('无 type/query 调试标签', !full.includes('已配置 1 项') && !/type\s*content/.test(full))
  ok('无「仅推荐」独立开关', !panel.includes('仅推荐'))

  // 2) 内容筛选规则区块 + 4 字段
  ok('有【内容筛选规则】区块', panel.includes('内容筛选规则'))
  ok('保留 4 字段（分类/类型/排序/数量）',
    ['内容分类', '内容类型', '排序规则', '显示数量'].every((k) => panel.includes(k)))

  // 3) 去发布文章外链
  const link = await page.evaluate(() => {
    const a = document.querySelector('.ds-extlink')
    return a ? { text: a.textContent.trim(), href: a.getAttribute('href'), target: a.getAttribute('target') } : null
  })
  ok('「去发布文章 ↗」外链存在', !!link, link ? link.text : '未找到')
  if (link) {
    ok('指向 /content/articles', /\/content\/articles$/.test(link.href || ''), link.href)
    ok('target=_blank', link.target === '_blank', `target=${link.target}`)
  }

  // 4) 布局选择器：3 列 + Checkmark + 等高 + 不溢出
  const picker = await page.evaluate(() => {
    const grid = document.querySelector('.layout-pick')
    if (!grid) return null
    const items = Array.from(grid.querySelectorAll('.layout-pick__item'))
    const on = grid.querySelector('.layout-pick__item.is-on')
    const rects = items.map((it) => it.getBoundingClientRect())
    const rowH = rects.slice(0, 3).map((r) => Math.round(r.height))
    return {
      cols: getComputedStyle(grid).gridTemplateColumns.split(' ').length,
      count: items.length,
      hasCheck: !!on && !!on.querySelector('.layout-pick__check'),
      overflow: items.filter((it) => {
        const t = it.querySelector('.alt')
        return t && t.getBoundingClientRect().width > it.getBoundingClientRect().width + 1
      }).length,
      rowH,
      labels: items.map((i) => i.innerText.trim()),
    }
  })
  ok('布局选择器 3 列', picker && picker.cols === 3, picker ? `${picker.cols} 列` : '未找到')
  ok('共 7 种布局', picker && picker.count === 7, picker ? picker.labels.join('/') : '')
  ok('选中项有 Checkmark', picker && picker.hasCheck)
  ok('缩略图未溢出格子', picker && picker.overflow === 0, picker ? `溢出 ${picker.overflow}` : '')
  ok('同行卡片等高', picker && new Set(picker.rowH).size === 1, picker ? `高度 ${picker.rowH}` : '')

  // 5) 显示数量单位=篇（不是 px）
  const unit = await page.evaluate(() => {
    for (const r of document.querySelectorAll('.num-slider')) {
      const item = r.closest('.el-form-item')
      if (item && item.innerText.includes('显示数量')) {
        return {
          unit: r.querySelector('.num-slider__unit')?.textContent.trim(),
          value: r.querySelector('.el-input__inner')?.value,
        }
      }
    }
    return null
  })
  ok('「显示数量」单位=篇', unit && unit.unit === '篇', unit ? `实际「${unit.unit}」值=${unit.value}` : '未找到')

  // 6) 展示元素组
  const metas = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.ds-meta__name')).map((n) => n.innerText.trim()))
  ok('有【展示元素】分组', panel.includes('展示元素'))
  ok('含封面/发布日期/来源角标/阅读热度/摘要简介',
    ['封面图', '发布日期', '来源角标', '阅读热度', '摘要简介'].every((k) => metas.some((m) => m.includes(k))),
    metas.join(' | '))

  // 7) 空状态策略 + 图标
  ok('空状态有「隐藏整个组件 / 展示空状态卡片」',
    panel.includes('隐藏整个组件') && panel.includes('展示空状态卡片'))
  const iconRows = await page.evaluate(() => document.querySelectorAll('.ds-icon-btn').length)
  ok('空状态图标可选（6 个）', iconRows === 6, `${iconRows} 个`)

  // 8) 实时预览 + 刷新按钮
  await page.waitForTimeout(2500) // 等真实内容拉回
  const live = await page.evaluate(() => {
    const box = document.querySelector('.ds-live')
    if (!box) return null
    return {
      hasRefresh: !!box.querySelector('.ds-live__refresh'),
      rows: box.querySelectorAll('.ds-live__row').length,
      pins: box.querySelectorAll('.ds-live__pin').length,
      text: box.innerText.replace(/\n/g, ' ').slice(0, 80),
    }
  })
  ok('有「刷新实时数据」按钮', live && live.hasRefresh)
  ok('实时预览区存在', !!live, live ? live.text : '未渲染')

  // 9) Pin 实点：点第 1 行星标 → props.pinned 长度 +1
  if (live && live.rows > 0) {
    const before = await page.evaluate(() => (window.__harnessProps.pinned || []).length)
    await page.click('.ds-live__row:first-child .ds-live__pin')
    await page.waitForTimeout(700)
    const after = await page.evaluate(() => ((window.__harnessProps.pinned || []).length))
    ok('点星标可置顶（pinned 0→1）', after === before + 1, `${before} → ${after}`)
    const flagged = await page.evaluate(() => document.querySelectorAll('.ds-live__flag').length)
    ok('置顶项有「置顶」标记', flagged >= 1, `${flagged} 个`)
    // 再点一次取消
    await page.click('.ds-live__row:first-child .ds-live__pin')
    await page.waitForTimeout(600)
    const after2 = await page.evaluate(() => ((window.__harnessProps.pinned || []).length))
    ok('再点可取消置顶', after2 === before, `${after} → ${after2}`)
  } else {
    ok('实时预览有数据（跳过 Pin 实点）', false, '无已发布内容，Pin 交互未验证')
  }

  // ───── grid 布局：步长 2 + 奇数提示 ─────
  await page.goto(url('&layout=grid&limit=3'), { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.article-list-props', { timeout: 20000 })
  await page.waitForTimeout(1500)
  const gridState = await page.evaluate(() => {
    for (const r of document.querySelectorAll('.num-slider')) {
      const item = r.closest('.el-form-item')
      if (item && item.innerText.includes('显示数量')) {
        return {
          text: item.innerText.replace(/\n/g, ' '),
          warn: item.querySelector('.ds-hint--warn')?.innerText.trim() || null,
        }
      }
    }
    return null
  })
  ok('grid + 奇数 → 出现偶数提示', gridState && /偶数/.test(gridState.warn || ''),
    gridState ? `提示「${gridState.warn}」` : '未找到')

  // grid + 偶数 → 不提示
  await page.goto(url('&layout=grid&limit=4'), { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.article-list-props', { timeout: 20000 })
  await page.waitForTimeout(1500)
  const evenState = await page.evaluate(() => {
    for (const r of document.querySelectorAll('.num-slider')) {
      const item = r.closest('.el-form-item')
      if (item && item.innerText.includes('显示数量')) {
        return item.querySelector('.ds-hint--warn')?.innerText.trim() || null
      }
    }
    return null
  })
  ok('grid + 偶数 → 无提示', evenState === null, evenState || '无提示 ✅')

  // ───── 报刊细排布局：摘要开关应隐藏（强制显示） ─────
  await page.goto(url('&layout=editorial'), { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.article-list-props', { timeout: 20000 })
  await page.waitForTimeout(1500)
  const edMetas = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.ds-meta__name')).map((n) => n.innerText.trim()))
  ok('报刊细排下摘要开关隐藏（强制显示）',
    !edMetas.some((m) => m.includes('摘要简介')), edMetas.join(' | '))

  // ───── limit 越界夹紧 ─────
  await page.goto(url('&layout=list&limit=99'), { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.article-list-props', { timeout: 20000 })
  await page.waitForTimeout(1500)
  const clamped = await page.evaluate(() => {
    for (const r of document.querySelectorAll('.num-slider')) {
      const item = r.closest('.el-form-item')
      if (item && item.innerText.includes('显示数量')) return r.querySelector('.el-input__inner')?.value
    }
    return null
  })
  ok('limit=99 被夹到 20', clamped === '20', `实际 ${clamped}`)

  console.log('\n页面错误:', errors.length ? errors.slice(0, 5) : '无')
  const failed = results.filter((r) => !r.pass)
  console.log(`\n通过 ${results.length - failed.length}/${results.length}`)
  await browser.close()
  process.exit(failed.length ? 1 : 0)
})().catch((e) => { console.error('脚本异常:', e); process.exit(2) })