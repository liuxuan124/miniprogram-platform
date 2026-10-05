/**
 * 把 global-resource 组件注册进指定页面的 json（幂等）。
 *
 * ⚠️ **逐页注册，不要挂 app.json 的全局 `usingComponents`** ——
 *    全局注册会让组件进主包并对所有分包生效，体积与影响面都不可控。
 *    项目里 `login-sheet` 是这么做的（13.8KB），是已知取舍，新组件不要再扩大这个口子。
 *
 * 用法：node miniapp/scripts/qa/register-global-resource.js <pageDir> [pageDir...]
 * 例：  node miniapp/scripts/qa/register-global-resource.js pages/index pages/shop
 */
'use strict'

const fs = require('fs')
const path = require('path')

const MINIAPP = path.resolve(__dirname, '../..')
const KEY = 'global-resource'
const COMP = '/components/global-resource/global-resource'

const dirs = process.argv.slice(2)
if (!dirs.length) {
  console.error('用法: node register-global-resource.js <pageDir> [pageDir...]')
  process.exit(2)
}

let changed = 0
let skipped = 0
const problems = []

for (const dir of dirs) {
  // 传进来的 dir 形如 pages/index（相对 miniapp 根）
  // 页面三件套在 pages/index/index.{json,wxml} —— 文件名与目录名同名，不是 pages/index.json
  const name = path.basename(dir)
  const jsonFile = path.join(MINIAPP, dir, name + '.json')
  const wxml = path.join(MINIAPP, dir, name + '.wxml')

  if (!fs.existsSync(jsonFile)) {
    problems.push(dir + ': 找不到 ' + path.relative(MINIAPP, jsonFile))
    continue
  }
  if (!fs.existsSync(wxml)) {
    // 页面目录里的 wxml 命名不一定与目录同名（custom-nav 等），不阻塞，只提示
    console.log('  · ' + dir + ' 未找到同名 wxml，跳过 wxml 检查')
  }

  let json
  try {
    json = JSON.parse(fs.readFileSync(jsonFile, 'utf8'))
  } catch (e) {
    problems.push(dir + ': JSON 解析失败 —— ' + e.message)
    continue
  }
  // ① 注册组件
  json.usingComponents = json.usingComponents || {}
  if (json.usingComponents[KEY] === COMP) {
    console.log('  · ' + dir + ' json 已注册，跳过')
    skipped++
  } else {
    json.usingComponents[KEY] = COMP
    fs.writeFileSync(jsonFile, JSON.stringify(json, null, 2) + '\n', 'utf8')
    console.log('  ✓ ' + dir + ' json 已注册')
    changed++
  }

  // ② wxml 插标签（幂等：已含则跳过）
  if (fs.existsSync(wxml)) {
    const t = fs.readFileSync(wxml, 'utf8')
    if (t.indexOf('<global-resource') >= 0) {
      console.log('    · wxml 已含 <global-resource />')
      skipped++
    } else {
      // 插到第一个顶层标签之前
      // ⚠️ 坑：不能用 /^\s*<[a-zA-Z]/ 定位 —— 它只匹配到标签的**第一个字母**
      //   （`<env-badge />` 会匹配成 `<e`），插进去就把标签劈开了。
      //   正确做法：匹配完整的自闭合或开标签名 `<([a-zA-Z][\w-]*)`。
      const m = t.match(/^[ \t]*<([a-zA-Z][\w-]*)/m)
      let out
      if (m) {
        const at = t.indexOf(m[0])
        out = t.slice(0, at) + '  <global-resource />\n' + t.slice(at)
      } else {
        out = '  <global-resource />\n' + t
      }
      fs.writeFileSync(wxml, out, 'utf8')
      console.log('    ✓ wxml 已插入 <global-resource />')
      changed++
    }
  }
}

console.log('')
console.log('改动 ' + changed + ' 处，跳过 ' + skipped + ' 处')
if (problems.length) {
  console.log('问题:')
  problems.forEach((p) => console.log('  🔴 ' + p))
  process.exit(1)
}
process.exit(0)