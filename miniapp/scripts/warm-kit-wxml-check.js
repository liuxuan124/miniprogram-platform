// scripts/warm-kit-wxml-check.js — 暖调 22 组件 WXML 结构自检
//
// node --check 查不出 WXML 结构错，微信编译又慢，这个脚本在提交前先拦一道：
//   1. 标签闭合配对（只校验暖调 22 分支，不动既有 40+ 组件）
//   2. {{ }} 花括号与双引号平衡
//   3. wx: 指令白名单
//   4. 分支内引用的 comp.props.X 是否在 warm-kit / dsl-renderer 中真的产出
//   5. 绑定的事件处理函数是否已定义
const fs = require('fs')
const path = require('path')

const WXML = path.join(__dirname, '../components/dsl-renderer/dsl-renderer.wxml')
const JS = path.join(__dirname, '../components/dsl-renderer/dsl-renderer.js')
const WK = path.join(__dirname, '../utils/warm-kit.js')

const src = fs.readFileSync(WXML, 'utf8')
const stripped = src.replace(/<!--[\s\S]*?-->/g, '')

// 只取暖调 22 分支：从 planet_qa_card 分支的 <view 起点到末尾的未知组件兜底（wx:else）之前
// 注意：stripped 已剥掉注释，所以锚点必须用标签而不是注释文本
const anchor = stripped.indexOf(`wx:elif="{{comp.type === 'planet_qa_card'}}"`)
const warmEnd = stripped.lastIndexOf('wx:else')
if (anchor < 0 || warmEnd < 0 || warmEnd < anchor) {
  console.error('✗ 未能定位暖调 22 分支区间（planet_qa_card → 未知组件 wx:else）')
  process.exit(1)
}
// 回退到该 elif 所属的 <view 开标签，避免把开标签切掉导致配对错位
const warmStart = stripped.lastIndexOf('<view', anchor)
const warm = stripped.slice(warmStart, warmEnd)
const lineOffset = stripped.slice(0, warmStart).split('\n').length - 1

const errors = []

/* WXML 里真正自闭合、不能带结束标签的标签。
   注意：scroll-view / swiper / movable-view 在 WXML 里是普通容器，必须闭合。 */
const VOID_TAGS = new Set([
  'image', 'input', 'icon', 'progress', 'slider', 'switch', 'textarea',
  'audio', 'video', 'camera', 'canvas', 'br', 'hr', 'import', 'include', 'wxs', 'import-src',
])

const stack = []
const re = /<\/?([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g
let m
while ((m = re.exec(warm)) !== null) {
  const raw = m[0]
  const tag = m[1]
  const selfClose = m[3] === '/'
  const closing = raw.startsWith('</')
  if (VOID_TAGS.has(tag)) {
    if (closing) errors.push(`自闭合标签 <${tag}> 不应写结束标签 </${tag}>`)
    else if (!selfClose) errors.push(`<${tag}> 是自闭合标签，必须写成 <${tag} ... />`)
    continue
  }
  if (closing) {
    const top = stack.pop()
    if (!top) errors.push(`多出来的结束标签 </${tag}>`)
    else if (top.tag !== tag) {
      errors.push(`标签不匹配：第 ${top.line} 行开启的 <${top.tag}>，遇到 </${tag}>`)
    }
  } else if (!selfClose) {
    stack.push({ tag, line: lineOf(raw) })
  }
}
stack.forEach((s) => errors.push(`第 ${s.line} 行的 <${s.tag}> 未闭合`))

/* {{ }} 平衡 */
const openCount = (warm.match(/\{\{/g) || []).length
const closeCount = (warm.match(/\}\}/g) || []).length
if (openCount !== closeCount) errors.push(`{{ 与 }} 不平衡：${openCount} / ${closeCount}`)

/* 双引号平衡（属性值里的引号） */
const dq = (warm.match(/"/g) || []).length
if (dq % 2 !== 0) errors.push(`双引号数量为奇数(${dq})，存在未闭合属性值`)

/* wx: 指令白名单 */
const ALLOWED_WX = ['if', 'elif', 'else', 'for', 'key', 'model', 'show', 'for-item', 'for-index']
const dirRe = /\bwx:([a-zA-Z-]+)=/g
let d
while ((d = dirRe.exec(warm)) !== null) {
  if (ALLOWED_WX.indexOf(d[1]) < 0) errors.push(`可疑的 wx 指令 wx:${d[1]}`)
}

/* 22 个 type 是否都有分支 */
const REQUIRED = [
  'planet_qa_card', 'planet_ask_banner', 'planet_members_strip', 'planet_challenge_card', 'planet_benefit_card',
  'op_creator_banner', 'op_quote_card', 'op_smart_group_card', 'op_referral_banner', 'op_gated_download_card',
  'h_peek_carousel', 'h_comparison_card', 'h_metric_strip', 'h_filter_chips', 'h_split_banner',
  'content_faq_accordion', 'content_mini_audio', 'content_milestone_tracker',
  'layout_overlap_wrapper', 'layout_paper_sheet', 'layout_sticky_wrapper', 'layout_flexible_grid',
]
REQUIRED.forEach((t) => {
  if (warm.indexOf(`comp.type === '${t}'`) < 0) errors.push(`缺少分支：${t}`)
})

/* 分支内引用的 comp.props.X 是否真的被产出。
   产出有三种形态，都要认：
     1. 对象字面量键  { foo: 1 }   → warm-kit 的归一化返回值
     2. 赋值语句      props.foo =  → dsl-renderer 里对 props 的二次加工
     3. 顶层 const 声明           */
const js = fs.readFileSync(JS, 'utf8')
const wk = fs.readFileSync(WK, 'utf8')
const produced = new Set()
const prodRe = /([A-Za-z_][\w]*)\s*:/g
let q
while ((q = prodRe.exec(wk)) !== null) produced.add(q[1])
while ((q = prodRe.exec(js)) !== null) produced.add(q[1])
// props.xxx = 形式
const assignRe = /props\.([A-Za-z_][\w]*)\s*=/g
let a
while ((a = assignRe.exec(js)) !== null) produced.add(a[1])
// 顶层/嵌套 const foo = 形式
const constRe = /(?:const|let)\s+([A-Za-z_][\w]*)\s*=/g
while ((a = constRe.exec(js)) !== null) produced.add(a[1])

// 循环内变量，其字段不在静态校验范围
const LOOP_VARS = ['item', 'pt', 'kid', 'm', 'c', 'it', 'i', 'index', 'e']
const used = new Set()
const useRe = /comp\.props\.([A-Za-z_][\w]*)/g
let u
while ((u = useRe.exec(warm)) !== null) used.add(u[1])
const missing = [...used].filter((n) => !LOOP_VARS.includes(n) && !produced.has(n))
if (missing.length) errors.push(`引用了未被产出的 props 字段：${missing.join(', ')}`)

/* 绑定的事件处理函数是否已定义 */
const declared = new Set()
const dataBlock = (js.match(/\n  data:\s*\{[\s\S]*?\n  \},\n/) || [''])[0]
let dm
const decRe = /^\s{4}([a-zA-Z_][\w]*):/gm
while ((dm = decRe.exec(dataBlock)) !== null) declared.add(dm[1])
const methBlock = (js.match(/\n  methods:\s*\{[\s\S]*\n  \},\n\}\)/) || [''])[0]
let mm
const methRe = /^\s{4}([a-zA-Z_][\w]*)\s*\(/gm
while ((mm = methRe.exec(methBlock)) !== null) declared.add(mm[1])

const handlers = new Set()
const hRe = /(?:catchtap|catchtouchstart|bindtap|bindinput|bindscroll)="([a-zA-Z_][\w]*)"/g
let h
while ((h = hRe.exec(warm)) !== null) handlers.add(h[1])
const undef = [...handlers].filter((n) => !declared.has(n))
if (undef.length) errors.push(`绑定了未定义的处理函数：${undef.join(', ')}`)

/* 交互区必须用 catchtap（避免冒泡到 dsl-renderer 导航拦截） */
const bindtapOnWarm = (warm.match(/\bbindtap="/g) || []).length
if (bindtapOnWarm > 0) errors.push(`暖调分支里出现了 ${bindtapOnWarm} 处 bindtap，应统一用 catchtap`)

/* ---- elif 链完整性：wx:elif 的前一个兄弟节点必须带 wx:if / wx:elif ----
   编译器对「elif 前面没有 if」直接报编译错误，这是最容易踩的坑 */
const sibRe = /<(\/?)([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g
const flat = []
let s2
while ((s2 = sibRe.exec(warm)) !== null) {
  if (s2[1] === '/') {
    // 粗粒度出栈：只关心最近的开标签
    for (let i = flat.length - 1; i >= 0; i--) {
      if (!flat[i].closed) { flat[i].closed = true; break }
    }
    continue
  }
  flat.push({
    tag: s2[2],
    attrs: s2[3] || '',
    selfClose: s2[4] === '/',
    closed: s2[4] === '/',
    idx: s2.index,
  })
  if (s2[4] === '/') flat.pop()
}
// 逐个开标签检查：带 wx:elif 的，其前一个未闭合兄弟必须有 wx:if 或 wx:elif
for (let i = 0; i < flat.length; i++) {
  const cur = flat[i]
  if (!/\bwx:elif=/.test(cur.attrs)) continue
  // 往前找最近一个还没闭合的兄弟
  let prev = null
  for (let k = i - 1; k >= 0; k--) {
    if (!flat[k].closed) { prev = flat[k]; break }
  }
  if (!prev) continue
  const prevOk = /\bwx:if=/.test(prev.attrs) || /\bwx:elif=/.test(prev.attrs)
  if (!prevOk) {
    errors.push(
      `第 ${lineOf(cur.idx)} 行的 <${cur.tag} wx:elif> 前一个兄弟 <${prev.tag}> 没有 wx:if / wx:elif，编译会报「elif 前面必须是 if」`
    )
  }
}

/* ---- wx:for 必须配 wx:key，且 key 不能是对象的虚拟字段 ----
   wx:key="index" 在 wx:for-item 是对象时会取不到值（编译器警告 + 列表 diff 失效） */
const forNodes = []
const forRe = /<[a-zA-Z][\w-]*((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g
let fn
while ((fn = forRe.exec(warm)) !== null) {
  const attrs = fn[1] || ''
  if (!/\bwx:for=/.test(attrs)) continue
  const keyM = attrs.match(/\bwx:key="([^"]*)"/)
  forNodes.push({ attrs, key: keyM ? keyM[1] : null, idx: fn.index })
}
forNodes.forEach((n) => {
  if (n.key === null) {
    errors.push(`第 ${lineOf(n.idx)} 行的 wx:for 缺 wx:key`)
  }
})

function lineOf(idx) {
  return warm.slice(0, idx).split('\n').length + lineOffset
}

/* ---- elif 链完整性（按嵌套深度精确判定）
   编译器对「wx:elif 前面没有 wx:if/wx:elif」直接报编译错误。
   判定方式：只统计根 <view class="dsl-renderer"> 的直接子节点，
   暖调 22 分支必须构成一段连续的 elif，且前一个兄弟带 wx:if/wx:elif。 */
const rootIdx = src.indexOf('<view\n  class="dsl-renderer"')
if (rootIdx < 0) {
  console.error('✗ 未找到根 <view class="dsl-renderer">，无法校验 elif 链')
  process.exit(1)
}
const tokRe = /<(\/?)([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g
const chain = []
let depth = 0
let rootSeen = false
let tk
while ((tk = tokRe.exec(src.slice(rootIdx))) !== null) {
  const [, closing, tag, attrsRaw, selfClose] = tk
  const attrs = attrsRaw || ''
  if (closing) { depth--; continue }
  if (!rootSeen) { rootSeen = true; depth = 1; continue }
  if (depth === 1) {
    // 注意 wx:else 是无值属性（没有 =），所以不能只匹配 wx:(if|elif|else)\s*=
    const dirM = attrs.match(/\bwx:(if|elif|else)\b/)
    const typeM = attrs.match(/comp\.type === '([a-z_]+)'/)
    chain.push({ dir: dirM ? dirM[1] : '-', type: typeM ? typeM[1] : '', tag })
  }
  if (selfClose !== '/') depth++
}
// 断链检查
chain.forEach((c, k) => {
  if (c.dir !== 'elif' || k === 0) return
  const prev = chain[k - 1]
  if (prev.dir !== 'if' && prev.dir !== 'elif') {
    errors.push(`<${c.tag}> 的 wx:elif 前一个兄弟 <${prev.tag}> 没有 wx:if / wx:elif，编译会报错`)
  }
})
// 暖调 22 分支必须连续成段
const warmIdx = []
chain.forEach((c, k) => { if (REQUIRED.indexOf(c.type) >= 0) warmIdx.push(k) })
if (warmIdx.length) {
  const contiguous = warmIdx.every((v, i) => i === 0 || v === warmIdx[i - 1] + 1)
  if (!contiguous) errors.push('暖调 22 分支在 elif 链里不连续，会被 wx:else 截断')
  const first = warmIdx[0]
  if (first > 0 && chain[first - 1].dir !== 'elif' && chain[first - 1].dir !== 'if') {
    errors.push('暖调分支区段的前一个兄弟没有 wx:if / wx:elif，链会断')
  }
  // 区段之后必须紧跟唯一的 wx:else 兜底
  const after = chain[warmIdx[warmIdx.length - 1] + 1]
  if (!after || after.dir !== 'else') {
    errors.push('暖调分支区段之后没有紧跟 wx:else 兜底，未知组件分支会被挤掉')
  }
}

if (errors.length) {
  console.error('✗ 暖调 WXML 自检未通过：')
  errors.forEach((e) => console.error('  · ' + e))
  process.exit(1)
}
console.log(`✓ 暖调 WXML 自检通过：22 个分支齐全，标签闭合正常，字段与处理函数均已定义（catchtap ${handlers.size} 类事件）`)
