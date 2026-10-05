/**
 * 全局资源位运行时纯 Node 单测
 *
 * 跑法：node miniapp/scripts/qa/test-global-resource.js
 *
 * 为什么能纯 Node 跑：global-resource.js 只依赖
 *   services/system.js（getCachedConfig）
 *   utils/storage.js（StorageUtil.get/set）
 *   utils/render.js（navigatePage）
 * 三个依赖全部可替换 → 抽函数体 + new Function 注入替身。
 *
 * 覆盖重点（都是「看起来对但实际会错」的点）：
 *   ① 同type 取 priority 最大
 *   ② enabled=false 跳过
 *   ③ 生效窗口：未到/已过都跳过
 *   ④ dailyLimit 频次：超限不再展示；跨天重置
 *   ⑤ 手动关闭后当天不再自动弹
 *   ⑥ bar/bulletin 不计入频次（常驻类不该被计数）
 *   ⑦ 非法 type 一律忽略
 *   ⑧ 时间解析兼容「空格 / T / 斜杠」三种格式
 */
'use strict'

const fs = require('fs')
const path = require('path')

const SRC = path.resolve(__dirname, '../../utils/global-resource.js')
let src = fs.readFileSync(SRC, 'utf8')
// 剥掉 require（要被替身取代）
src = src.replace(/^const .*require\(.*\)$/gm, '')
src = src.replace(/^\/\*\*[\s\S]*?\*\/\n(?=const TYPES)/, '')

/** 抽一个具名函数（含前置的辅助函数） */
function grab(name) {
  const i = src.indexOf('function ' + name)
  if (i < 0) return ''
  const st = src.indexOf('{', i)
  let d = 0
  for (let j = st; j < src.length; j++) {
    if (src[j] === '{') d++
    else if (src[j] === '}') {
      d--
      if (d === 0) return src.slice(i, j + 1)
    }
  }
  return ''
}

// 注入替身
function build(overrides) {
  const o = overrides || {}
  const sys = o.SystemService || { getCachedConfig: () => ({}) }
  const sto = o.StorageUtil || { get: () => null, set: () => {} }
  const nav = o.navigatePage || function () {}
  const code = [
    "const TYPES = ['popup','bar','float','bulletin']",
    "const SHOWN_KEY = 'globalResourceShown'",
    "const CLOSED_KEY = 'globalResourceClosed'",
    'const SystemService = global.__sys',
    'const StorageUtil = global.__sto',
    'const navigatePage = global.__nav',
    grab('today'),
    grab('readMap'),
    grab('writeMap'),
    grab('parseTime'),
    grab('pickSlots'),
    grab('markShown'),
    grab('markClosed'),
    'return { pickSlots, markShown, markClosed, parseTime, today }',
  ].join('\n')
  return new Function('global', code)({ __sys: sys, __sto: sto, __nav: nav })
}

let pass = 0
let fail = 0
const results = []
function t(name, expect, got) {
  const ok = JSON.stringify(expect) === JSON.stringify(got)
  if (ok) {
    pass++
    results.push('  ✓ ' + name)
  } else {
    fail++
    results.push('  ✗ ' + name + '\n      期望 ' + JSON.stringify(expect) + '\n      实得 ' + JSON.stringify(got))
  }
}

// ─────────── ① 基础：优先级 / enabled / 类型 ───────────
{
  const g = build()
  const day = g.today()
  const r = g.pickSlots({
    global_resource_slots: [
      { type: 'popup', title: '低', priority: 1 },
      { type: 'popup', title: '高', priority: 9 },
      { type: 'bar', title: '横条', priority: 0 },
      { type: 'popup', title: '关掉的', priority: 99, enabled: false },
      { type: 'unknown', title: '非法类型' },
    ],
  })
  t('① 同type 取 priority 最大（且 enabled=false 被忽略、非法 type 被忽略）',
    { popup: '高', bar: '横条', float: null, bulletin: null },
    { popup: r.popup.title, bar: r.bar.title, float: r.float, bulletin: r.bulletin })
  void day
}

// ─────────── ② 生效窗口 ───────────
{
  const g = build()
  const past = '2020-01-01 00:00:00'
  const future = '2099-01-01 00:00:00'
  const r = g.pickSlots({
    global_resource_slots: [
      { type: 'popup', title: '未开始', startAt: future },
      { type: 'bar', title: '已过期', endAt: past },
      { type: 'bulletin', title: '窗口内', startAt: past, endAt: future },
    ],
  })
  t('② 生效窗口：未到 startAt 跳过 / 已过 endAt 跳过 / 窗口内保留',
    { popup: null, bar: null, bulletin: '窗口内' },
    { popup: r.popup, bar: r.bar, bulletin: r.bulletin && r.bulletin.title })
}

// ─────────── ③ dailyLimit 频次（含跨天重置） ───────────
{
  const day = new Date()
  const p = (n) => String(n).padStart(2, '0')
  const todayStr = day.getFullYear() + '-' + p(day.getMonth() + 1) + '-' + p(day.getDate())
  const yesterdayStr = '2020-01-01'

  const store = {}
  const sto = {
    get: (k) => (k in store ? store[k] : null),
    set: (k, v) => { store[k] = v },
  }

  // 第一次：1 次额度已用完 → 第二次不该再展示
  const g1 = build({ StorageUtil: sto })
  g1.markShown('popup', { id: 'x' })
  const r1 = g1.pickSlots({ global_resource_slots: [{ type: 'popup', title: '弹窗', dailyLimit: 1 }] })
  t('③a dailyLimit=1 且当天已展示过 → 不再展示', null, r1.popup)

  // dailyLimit=0 → 不限
  const g2 = build({ StorageUtil: sto })
  const r2 = g2.pickSlots({ global_resource_slots: [{ type: 'popup', title: '弹窗', dailyLimit: 0 }] })
  t('③b dailyLimit=0 → 不限频次，仍展示', '弹窗', r2.popup && r2.popup.title)

  // 昨天展示过 → 今天应重置
  const store2 = { globalResourceShown: { popup: { day: yesterdayStr, count: 5 } } }
  const g3 = build({ StorageUtil: { get: (k) => (k in store2 ? store2[k] : null), set: () => {} } })
  const r3 = g3.pickSlots({ global_resource_slots: [{ type: 'popup', title: '弹窗', dailyLimit: 1 }] })
  t('③c 昨天用过 → 今天频次重置，可展示', '弹窗', r3.popup && r3.popup.title)

  // 同一天内 count=1 但 limit=2 → 还能再展
  const store3 = { globalResourceShown: { popup: { day: todayStr, count: 1 } } }
  const g4 = build({ StorageUtil: { get: (k) => (k in store3 ? store3[k] : null), set: () => {} } })
  const r4 = g4.pickSlots({ global_resource_slots: [{ type: 'popup', title: '弹窗', dailyLimit: 2 }] })
  t('③d 当天已展 1 次、limit=2 → 还能再展 1 次', '弹窗', r4.popup && r4.popup.title)
}

// ─────────── ④ 手动关闭后当天不再自动弹 ───────────
{
  const day = new Date()
  const p = (n) => String(n).padStart(2, '0')
  const todayStr = day.getFullYear() + '-' + p(day.getMonth() + 1) + '-' + p(day.getDate())
  const store = {
    globalResourceClosed: { popup: { day: todayStr, id: 'myAd' } },
  }
  const g = build({ StorageUtil: { get: (k) => (k in store ? store[k] : null), set: () => {} } })
  const r = g.pickSlots({
    global_resource_slots: [{ type: 'popup', title: '弹窗', id: 'myAd', dailyLimit: 1 }],
  })
  t('④ 用户当天手动关过同一条 → 当天不再自动弹', null, r.popup)

  // 换了另一条 → 仍可弹
  const r2 = g.pickSlots({
    global_resource_slots: [{ type: 'popup', title: '新弹窗', id: 'otherAd', dailyLimit: 1 }],
  })
  t('④b 关掉的是 A、当前配的是 B → B仍可展示', '新弹窗', r2.popup && r2.popup.title)
}

// ─────────── ⑤ bar/bulletin 不计入频次 ───────────
{
  const sto = (() => {
    const store = {}
    return { get: (k) => (k in store ? store[k] : null), set: (k, v) => { store[k] = v } }
  })()
  const g = build({ StorageUtil: sto })
  // 反复展示 bar 100 次，频次桶里也不该有 bar 记录
  for (let i = 0; i < 100; i++) {
    g.pickSlots({ global_resource_slots: [{ type: 'bar', title: '横条' }] })
  }
  t('⑤ bar/bulletin 不写频次桶（常驻类不参与 dailyLimit）',
    { hasBarInShown: false, shownKeys: 0 },
    {
      hasBarInShown: !!(sto.get('globalResourceShown') && sto.get('globalResourceShown').bar),
      shownKeys: sto.get('globalResourceShown') ? Object.keys(sto.get('globalResourceShown')).length : 0,
    })
}

// ─────────── ⑥ 配置缺失/脏数据不崩 ───────────
{
  const g = build()
  const empty = { popup: null, bar: null, float: null, bulletin: null }
  t('⑥a 配置为 undefined → 全 null 不抛错', empty, g.pickSlots(undefined))
  t('⑥b global_resource_slots 不是数组 → 全 null', empty, g.pickSlots({ global_resource_slots: 'oops' }))
  t('⑥c 数组含 null 元素 → 跳过不崩', empty, g.pickSlots({ global_resource_slots: [null, undefined] }))
  t('⑥d 元素缺 type → 忽略', empty, g.pickSlots({ global_resource_slots: [{ title: '无类型' }] }))
}

// ─────────── ⑦ 时间格式兼容 ───────────
{
  const g = build()
  const a = g.parseTime('2026-03-15 10:00:00')
  const b = g.parseTime('2026-03-15T10:00:00')
  const c = g.parseTime('2026/03/15 10:00:00')
  t('⑦a 空格 / T / 斜杠 三种格式解析结果一致', true, a === b && b === c && a > 0)
  t('⑦b 空值与垃圾值→ 0（表示不限/无效）', 0, g.parseTime(''))
  t('⑦c 非法字符串 → 0 不抛错', 0, g.parseTime('not-a-time'))
  t('⑦d null / undefined → 0', 0, g.parseTime(null))
}

console.log('=== 全局资源位运行时单测 ===')
results.forEach((r) => console.log(r))
console.log('')
console.log('通过 ' + pass + '/' + (pass + fail))
process.exit(fail ? 1 : 0)