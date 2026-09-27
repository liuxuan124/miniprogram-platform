#!/usr/bin/env node
/**
 * 从 admin 装修器组件注册表生成 miniapp/capabilities.json（CI / 上传前执行）
 *
 * 注意：type 字符串必须取自 `admin/src/types/page.ts` 的 ComponentType 枚举值，
 * 不能由枚举名做 PascalCase→snake_case 推导——`AIEntry` 会被推成 `a_i_entry`，
 * 而真实值是 `ai_entry`，导致发布前能力校验把含该组件的页面误判为「不支持」。
 */
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const registryPath = path.join(root, 'admin/src/components/page-builder/componentRegistry.ts')
const enumPath = path.join(root, 'admin/src/types/page.ts')
const outPath = path.join(root, 'miniapp/capabilities.json')

/** ComponentType 枚举名 → 实际 type 字符串 */
function loadEnumMap(source) {
  const block = source.match(/export enum ComponentType \{([\s\S]*?)\n\}/)
  const map = {}
  if (!block) return map
  const re = /^\s*(\w+)\s*=\s*'([^']+)'/gm
  let m
  while ((m = re.exec(block[1])) !== null) {
    map[m[1]] = m[2]
  }
  return map
}

function extractTypes(registrySource, enumMap) {
  const types = new Set()
  const unresolved = new Set()
  const re = /type:\s*ComponentType\.(\w+)/g
  let m
  while ((m = re.exec(registrySource)) !== null) {
    const name = m[1]
    if (enumMap[name]) types.add(enumMap[name])
    else unresolved.add(name)
  }
  return { types: Array.from(types).sort(), unresolved: Array.from(unresolved).sort() }
}

function main() {
  for (const p of [registryPath, enumPath]) {
    if (!fs.existsSync(p)) {
      console.error(`${path.relative(root, p)} not found`)
      process.exit(1)
    }
  }
  const enumMap = loadEnumMap(fs.readFileSync(enumPath, 'utf8'))
  if (!Object.keys(enumMap).length) {
    console.error('ComponentType 枚举解析失败，拒绝生成（避免写出错误清单）')
    process.exit(1)
  }
  const { types: supported, unresolved } = extractTypes(fs.readFileSync(registryPath, 'utf8'), enumMap)
  if (unresolved.length) {
    // 宁可失败也不要写出缺项的清单——它会被当成「小程序不支持」
    console.error(`注册表引用了枚举中不存在的成员: ${unresolved.join(', ')}`)
    process.exit(1)
  }
  const manifest = {
    generated_at: new Date().toISOString(),
    supported_component_types: supported,
    schema_version: 1,
  }
  fs.writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify({ ok: true, path: outPath, count: supported.length }))
}

main()
