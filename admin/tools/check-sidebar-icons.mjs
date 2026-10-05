#!/usr/bin/env node
/**
 * 侧栏图标注册门禁。
 *
 * 背景（2026-10-06 踩过）：新增菜单项时配了 `icon: 'Bell'`，但忘了在
 * `Sidebar.vue` 的 `iconMap` 里注册 → `<component :is="iconMap['Bell']" />`
 * 解析成 undefined，**图标位空白且不报任何错**。
 * 静态扫一遍「菜单里用到的 icon 名」vs「iconMap 已注册」，成本远低于肉眼看图。
 *
 * 用法: node tools/check-sidebar-icons.mjs
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const sidebarPath = resolve(here, '../src/layout/Sidebar.vue')
const src = readFileSync(sidebarPath, 'utf8')

// 1) 收集菜单项声明的 icon 名
const declared = new Set()
const itemRe = /\{\s*title:\s*'[^']+'\s*,\s*path:\s*'[^']*'\s*,\s*icon:\s*'([^']+)'/g
let m
while ((m = itemRe.exec(src)) !== null) declared.add(m[1])

// 2) 收集 iconMap 的 key（形如 "  Name," 出现在 iconMap 块内）
const mapStart = src.indexOf('const iconMap')
const mapEnd = src.indexOf('\n}', mapStart)
const mapBody = mapStart >= 0 ? src.slice(mapStart, mapEnd > 0 ? mapEnd : undefined) : ''
const registered = new Set()
const keyRe = /^\s{2}([A-Z][A-Za-z0-9_]*),?\s*$/gm
while ((m = keyRe.exec(mapBody)) !== null) registered.add(m[1])

// 3) 收集 element-plus 实际导入的图标名
// ⚠️ 必须取「最后一个 import {」到 from 行之间的整段 —— 之前用 lastIndexOf 会被
//    其它 import 语句里的对象解构干扰，误判成缺导入。
// ⚠️ 必须处理别名：`Document as InvoiceIcon` → 导入名是 InvoiceIcon。
const fromIdx = src.indexOf("from '@element-plus/icons-vue'")
if (fromIdx < 0) {
  console.error('✗ 找不到 element-plus icons 导入语句')
  process.exit(1)
}
const importBrace = src.lastIndexOf('import {', fromIdx)
// ⚠️ 必须先剥掉行注释 —— 导入块里常有 `// 说明：xxx` 这样的注释，
//    不剥会把注释文字当成导入名，报出一堆假的「未导入」。
const importBody = src
  .slice(importBrace, fromIdx)
  .replace(/\/\/[^\n]*/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
const imported = new Set()
for (const n of importBody.replace(/import\s*\{/, '').split(',')) {
  const t = n.trim()
  if (!t) continue
  // `Document as InvoiceIcon` → 取 as 后的本地名（这才是能引用的标识符）
  const parts = t.split(/\s+as\s+/)
  imported.add((parts[1] || parts[0]).trim())
}

const missingMap = [...declared].filter((n) => !registered.has(n))
const missingImport = [...registered].filter((n) => !imported.has(n))
const declaredButNotImported = [...declared].filter((n) => registered.has(n) && !imported.has(n))

let failed = 0
console.log(`菜单声明 icon：${declared.size} 个；iconMap 注册：${registered.size} 个；已导入：${imported.size} 个\n`)

if (missingMap.length) {
  failed++
  console.log('✗ 菜单用了但 iconMap 未注册（图标会空白且不报错）:')
  for (const n of missingMap) console.log(`    ${n}`)
} else {
  console.log('✓ 所有菜单 icon 都已在 iconMap 注册')
}

if (missingImport.length) {
  failed++
  console.log('\n✗ iconMap 注册了但未从 element-plus 导入（解析 undefined）:')
  for (const n of missingImport) console.log(`    ${n}`)
} else {
  console.log('✓ iconMap 全部已从 element-plus 导入')
}

if (declaredButNotImported.length) {
  failed++
  console.log('\n✗ 声明链断裂:')
  for (const n of declaredButNotImported) console.log(`    ${n}`)
}

// 4) 重复导入检测 —— 补图标时容易「以为没导入」而重复 import 一遍，
//    报 TS2300 Duplicate identifier，且症状（图标不显示）容易被误判成别的问题。
//    从原文按出现次数统计（上面的 imported 是 Set，已去重）。
const rawCounts = new Map()
for (const n of importBody.replace(/import\s*\{/, '').split(',')) {
  const t = n.trim()
  if (!t) continue
  const parts = t.split(/\s+as\s+/)
  const local = (parts[1] || parts[0]).trim()
  rawCounts.set(local, (rawCounts.get(local) || 0) + 1)
}
const dup = [...rawCounts.entries()].filter(([, c]) => c > 1)
if (dup.length) {
  failed++
  console.log('\n✗ 重复导入（TS2300 Duplicate identifier）:')
  for (const [n, c] of dup) console.log(`    ${n} × ${c}`)
} else {
  console.log('✓ 无重复导入')
}

console.log()
console.log('='.repeat(46))
console.log(failed ? `失败 ${failed} 组` : '全部通过')
console.log('='.repeat(46))
process.exit(failed ? 1 : 0)
