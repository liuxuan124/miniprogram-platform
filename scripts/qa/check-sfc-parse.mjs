#!/usr/bin/env node
/**
 * Vue SFC 结构门禁：抓「标签未闭合 / 多余闭合 / 解析失败」。
 *
 * 为什么要它：2026-10-05 改商品编辑页栅格时，连续两次把 `</div>` 补错位置
 * （一个补到 `<template v-if>` 外面、一个多补了一个），
 * 而 `vue-tsc` **不报这种错**（它只查类型，标签结构错在编译期），
 * 只靠 `vite build` 或浏览器白屏才发现 —— 一次往返 1 分钟。
 * `vue-tsc` + 本脚本 = 类型与结构两道门禁，缺一不可。
 *
 * 用法：
 *   node scripts/qa/check-sfc-parse.mjs                    # 扫 admin/src/views 下全部 .vue
 *   node scripts/qa/check-sfc-parse.mjs admin/src/views/product/edit.vue
 * ⚠️ 必须从**仓库根**跑（脚本按 `admin/node_modules` 解析 @vue/compiler-sfc）。
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const ROOT = process.cwd()
const ADMIN = path.join(ROOT, 'admin')
const require = createRequire(path.join(ADMIN, 'package.json'))
const { parse } = require('@vue/compiler-sfc')

const args = process.argv.slice(2)

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    if (fs.statSync(p).isDirectory()) walk(p, out)
    else if (name.endsWith('.vue')) out.push(p)
  }
  return out
}

const files = args.length ? args.map((f) => path.resolve(ROOT, f)) : walk(path.join(ADMIN, 'src', 'views'))

let bad = 0
for (const f of files) {
  if (!fs.existsSync(f)) {
    console.log(`✗ ${path.relative(ROOT, f)} —— 文件不存在`)
    bad++
    continue
  }
  const r = parse(fs.readFileSync(f, 'utf8'))
  if (r.errors.length) {
    bad++
    console.log(`✗ ${path.relative(ROOT, f)}`)
    r.errors.slice(0, 3).forEach((e) => {
      console.log(`    ${e.message}${e.loc ? `（第 ${e.loc.start.line} 行）` : ''}`)
    })
  } else {
    console.log(`✓ ${path.relative(ROOT, f)}`)
  }
}

console.log(bad ? `\n${bad} 个文件有 SFC 结构错误` : `\n全部 ${files.length} 个文件结构通过 ✅`)
process.exit(bad ? 1 : 0)
