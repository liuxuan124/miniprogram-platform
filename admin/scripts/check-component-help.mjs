#!/usr/bin/env node
/**
 * 校验 componentHelp.ts 是否覆盖 componentRegistry 里的全部组件。
 * 漏写的组件 hover 时拿不到说明 → 运营看到空白浮层，比没有更糟。
 * 用法：node scripts/check-component-help.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const base = path.resolve(process.argv[2] || 'src/components/page-builder')

/**
 * 组件清单有两个来源，必须都扫：
 * 1. componentRegistry.ts 里内联的 `type: ComponentType.Xxx` 字面量
 * 2. warmKitRegistry.ts 通过 `xxxMeta` 动态 set 进注册表的 22 个新组件
 *    （它们不出现在 componentRegistry 的字面量里，只扫前者会误报「说明多余」）
 */
function readList(file) {
  const p = path.join(base, file)
  if (!fs.existsSync(p)) return []
  const s = fs.readFileSync(p, 'utf8')
  const out = new Set()
  const camel = (name) =>
    name
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
      .toLowerCase()
  // componentRegistry: `type: ComponentType.Xxx,` + `label: '...'`
  const re = /type:\s*ComponentType\.(\w+),\s*\n\s*label:\s*'([^']*)'/g
  let m
  while ((m = re.exec(s))) out.add(camel(m[1]))
  // warmKitRegistry: `import { planetQaCardMeta } from './planet/planet-qa-card'`
  const re2 = /import\s*\{\s*(\w+)Meta\s*\}\s*from/g
  while ((m = re2.exec(s))) out.add(camel(m[1]))
  return [...out]
}

function readHelp() {
  const p = path.join(base, 'componentHelp.ts')
  const s = fs.readFileSync(p, 'utf8')
  const out = new Set()
  const re = /^\s{2}([a-z0-9_]+):\s*\{/gm
  let m
  while ((m = re.exec(s))) out.add(m[1])
  return out
}

const types = [...new Set([...readList('componentRegistry.ts'), ...readList('warmKitRegistry.ts')])]
const helps = readHelp()

const missing = types.filter((t) => !helps.has(t))
const orphan = [...helps].filter((h) => !types.includes(h))

console.log(`注册表组件：${types.length} 个`)
console.log(`说明文案：${helps.size} 条`)
if (missing.length) {
  console.error(`\n✗ 缺少说明（${missing.length}）：`)
  missing.forEach((t) => console.error('  - ' + t))
  process.exitCode = 1
} else {
  console.log('✓ 全部组件都有说明文案')
}
if (orphan.length) {
  console.warn(`\n⚠ 说明多余，registry 里没有对应组件（${orphan.length}）：`)
  orphan.forEach((t) => console.warn('  - ' + t))
}
