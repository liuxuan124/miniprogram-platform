// scripts/warm-kit-normalize-test.js — 暖调 22 组件归一化兜底压测
//
// 校验两件事：
//   1. 22 个 type × 4 种极端输入（空 / null / 类型污染 / 数值越界）都不抛异常
//   2. WXML 里真实引用的每个 comp.props.X 都有值，绝不 undefined 导致白屏
const fs = require('fs')
const path = require('path')
const wk = require(path.join(__dirname, '../utils/warm-kit.js'))

const WXML = path.join(__dirname, '../components/dsl-renderer/dsl-renderer.wxml')
const wxml = fs.readFileSync(WXML, 'utf8')

/* ---- 从 WXML 反推每个 type 实际引用了哪些 props ---- */
const need = {}
wk.WARM_TYPES.forEach((t) => {
  const i = wxml.indexOf(`comp.type === '${t}'`)
  if (i < 0) {
    console.error(`✗ WXML 缺少分支：${t}`)
    process.exit(1)
  }
  const rest = wxml.slice(i)
  const n = rest.slice(1).search(/\n\s*(wx:elif|wx:else)/)
  const seg = rest.slice(0, n < 0 ? rest.length : n)
  const set = new Set()
  const re = /comp\.props\.([A-Za-z_][\w]*)/g
  let m
  while ((m = re.exec(seg)) !== null) {
    if (['item', 'pt', 'kid'].indexOf(m[1]) < 0) set.add(m[1])
  }
  need[t] = [...set]
})

/* ---- 允许为空的字段：设计上就是「运营可留空」的槽位 ---- */
const MAY_BE_EMPTY = [
  'ctaText', 'moreText', 'moreLink', 'askLink', 'ctaLink', 'leftLink', 'rightLink', 'link',
  'placeholderText', 'hintText', 'originalPrice', 'qrImage', 'cover', 'hostAvatar', 'audioUrl',
  'leftNote', 'rightNote', 'qrTip', 'fallbackWechat', 'collapsedHint', 'fileSize',
  'tag', 'role', 'emptyText', 'description', 'icon',
]
/* 由 dsl-renderer 结合外壳 margin 二次加工的字段 */
const SECOND_PASS = ['enabled', 'accordionMode', 'showShadow', 'stickyTop']

const CASES = [
  ['空 props', {}],
  ['null', null],
  ['类型污染', {
    items: 'x', benefits: 1, cards: {}, milestones: 'no', title: null, showViews: 'yes',
    limit: 'abc', overlap: 999, ratio: '9:9', align: 'weird', alignItems: 'weird',
    unlockMode: 'x', leadFields: 1, speeds: 1, activeIndex: null, defaultOpenIndex: 'x',
  }],
  ['数值越界', {
    limit: 999, totalDays: -5, checkedDays: 9999, calendarMax: 1, columns: 99, maxVisible: 0,
    defaultOpenIndex: 99, activeIndex: 999, zIndex: 0, fontSize: 0, peekRatio: 99, gap: -5,
    cardHeight: 1, duration: 0, moreCount: -1, invitedCount: -1, targetCount: 0, pageCount: -1,
    answeredCount: -1, stickyTop: -5, padding: -1, radius: -1, gap2: 999, cardHeight2: 99999,
  }],
]

let fail = 0
let checked = 0
const ARRAY_FIELDS = ['_items', '_cells', '_left', '_right', '_speeds', '_points']

wk.WARM_TYPES.forEach((t) => {
  CASES.forEach(([cn, pv]) => {
    let out
    try {
      out = wk.normalizeWarm(t, pv)
    } catch (e) {
      console.error(`✗ ${t} / ${cn} 抛异常：${e.message}`)
      fail++
      return
    }
    if (!out || typeof out !== 'object') {
      console.error(`✗ ${t} / ${cn} 未返回对象`)
      fail++
      return
    }
    // 数组字段不能被脏输入污染
    ARRAY_FIELDS.forEach((f) => {
      if (f in out && !Array.isArray(out[f])) {
        console.error(`✗ ${t} / ${cn} 数组字段 ${f} 被污染为 ${typeof out[f]}`)
        fail++
      }
    })
    if (Array.isArray(out._items) && out._items.some((x) => !x || typeof x !== 'object')) {
      console.error(`✗ ${t} / ${cn} _items 含非对象元素`)
      fail++
    }
    // WXML 实际引用的字段必须有值
    need[t].forEach((f) => {
      if (SECOND_PASS.indexOf(f) >= 0) return
      checked++
      const v = out[f]
      if (v === undefined || v === null || (v === '' && MAY_BE_EMPTY.indexOf(f) < 0)) {
        console.error(`✗ ${t} / ${cn} 字段 ${f} = ${JSON.stringify(v)}`)
        fail++
      }
    })
  })
})

// DEFAULTS 键数清单
const keyTotal = Object.values(wk.DEFAULTS).reduce((n, o) => n + Object.keys(o).length, 0)

if (fail) {
  console.error(`\n✗ 归一化兜底压测未通过：${fail} 处问题`)
  process.exit(1)
}
console.log(`✓ 22 个 type × ${CASES.length} 种极端输入 = ${22 * CASES.length} 组全部通过`)
console.log(`✓ 校验 ${checked} 个「WXML 实际引用 × 极端输入」组合，无 undefined / 无类型污染`)
console.log(`✓ DEFAULTS 共 ${Object.keys(wk.DEFAULTS).length} 个 type，${keyTotal} 个 mock 字段`)
