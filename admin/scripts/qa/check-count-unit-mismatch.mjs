#!/usr/bin/env node
/**
 * 🔴 常驻门禁：禁止「数量类字段被加上 px 单位」。
 *
 * 背景（2026-10-06）：装修器里「每页条数6 px」「商品数量 8 px」这类错配
 * 反复出现。根因不是某个调用方忘了传 unit，而是 `NumSliderRow` 的
 * `unit` **默认值就是 'px'** —— 全站 70 处调用，靠自觉必然复发。
 *
 * 现在组件已支持 `semantic="count"`（强制无单位），
 * 本门禁确保：**凡是绑定了数量类字段的 NumSliderRow，都必须标 semantic="count"**。
 *
 * 判据：字段名命中数量语义关键词 → 该块必须含 semantic="count"。
 * 新增数量字段时若忘了标，门禁立刻报错。
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// ⚠️ 脚本在 admin/scripts/qa/ 下，ROOT 要退两级到 admin
const ROOT = path.resolve(__dirname, '../..')
const BASE = path.join(ROOT, 'src/components/page-builder')

/** 数量类字段名特征 —— 命中即要求 semantic="count" */
const COUNT_HINTS = [
  'limit', 'page_size', 'count', 'num', 'total', 'rows', 'cols',
  'columns', 'items', 'display_limit', 'max_count', 'per_page', 'batch',
]

/**
 * 明确是长度的字段。
 * 🔴🔴 这里必须是**精确相等**，绝不能做子串匹配！
 * 教训：`page_size`（数量）里含 `size`（长度）—— 用 `f.includes(e)` 判定时
 * `page_size` 被长度豁免词命中，**门禁对它完全失效**，
 * 注入回归（去掉 semantic）照样报全绿，差点让我以为门禁在跑。
 * `includes` 适合 HINTS（宁可多报），但 EXEMPT 必须精确相等。
 */
const LENGTH_EXEMPT = new Set([
  'width', 'height', 'radius', 'size', 'gap', 'padding', 'margin',
  'offset', 'line_height', 'font_size', 'title_size', 'desc_size',
  'max_width', 'min_width', 'custom_height', 'logo_height',
  'logo_max_width', 'base_font_size', 'paragraph_gap', 'item_gap',
])

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name)
    if (statSync(p).isDirectory()) { walk(p, out); continue }
    if (p.endsWith('.vue')) out.push(p)
  }
  return out
}

let pass = 0
const problems = []

for (const file of walk(BASE)) {
  const src = readFileSync(file, 'utf8')
  const rel = path.relative(ROOT, file)

  // 逐个 <NumSliderRow ... /> 块
  const re = /<NumSliderRow\b[\s\S]*?\/>/g
  let m
  while ((m = re.exec(src))) {
    const block = m[0]
    //⚠️ 两种合法写法：① 标 semantic="count"（推荐，强制无单位）
    //② 显式给了**非 px** 的单位（如 unit="件"/"条"）—— 也算对
    if (block.includes('semantic="count"')) { pass++; continue }
    const unitM = block.match(/\bunit="([^"]*)"/)
    if (unitM && unitM[1] && unitM[1] !== 'px') { pass++; continue }

    // 提取绑定的字段名
    // 🔴 判据的教训：这里原本写 `model-value="[\w.?]*\.?([a-z_]+)"`，
    // 结果捕获到的是 'e'（贪婪把 cfg.page_size 吃掉了）→ **门禁形同虚设**，
    // 注入回归时照样全绿。**正则提取字段名必须用非贪婪 + 显式分隔符**：
    //   [^"\s]*?\.([a-z_]+)  ← 只取最后一段，点号前的内容不参与匹配
    const fields = [
      ...block.matchAll(/:model-value="[^"\s]*?\.([a-z_]+)"/g),
      ...block.matchAll(/:model-value="([^".\s][a-z_]*)"/g),
      ...block.matchAll(/cfg\?\.([a-z_]+)/g),
    ].map((x) => x[1])
    if (!fields.length) continue

    const hit = fields.find(
      (f) => COUNT_HINTS.some((h) => f.includes(h))
        && !LENGTH_EXEMPT.has(f),
    )
    if (!hit) { pass++; continue }

    const line = src.slice(0, m.index).split('\n').length
    problems.push({ file: rel, line, field: hit })
  }
}

console.log('=== 数量类字段单位门禁 ===')
console.log(`  检查通过: ${pass}`)
if (problems.length === 0) {
  console.log('  ✅ 没有「数量字段带 px」的错配')
  process.exit(0)
}
console.log(`  ❌ 发现 ${problems.length} 处数量字段未标 semantic="count"（会显示 px）:`)
for (const p of problems) {
  console.log(`     ${p.file}:${p.line}  cfg.${p.field}`)
}
console.log('')
console.log('  修法：给该 <NumSliderRow> 加 semantic="count"（数量类强制无单位）')
console.log('  （或显式传非px 单位，如 unit="件"）')
// ⚠️ 必须 exit 1 —— 否则 CI 不会拦这个错配
process.exitCode = 1
