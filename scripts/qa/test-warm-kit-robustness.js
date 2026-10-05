/**
 * 暖调组件健壮性回归测试（用真实 TS 编译器，不用正则抠代码）
 *
 * 验证需求「强制 Mock 兜底：拖拽入画布的一瞬间必须立即可视化，
 * 严禁因字段缺失触发 undefined 错误导致画布白屏」。
 *
 * 做法：用 typescript 的 transpileModule 把 schema.ts 编译成 JS 后 require，
 * 直接调用真实的 defaultProps 工厂拿数据 —— 拿到的是真实运行结果，不是猜测。
 */
const fs = require('fs')
const path = require('path')
const assert = require('assert')
const ts = require(path.join(__dirname, '../../admin/node_modules/typescript'))

const BASE = path.join(__dirname, '../../admin/src/components/page-builder')
const ADMIN_SRC = path.join(__dirname, '../../admin/src')
const CATS = ['planet', 'growth', 'horizontal', 'content', 'layout']

/**
 * 极简 TS→CJS 编译器 + 模块注册表
 * schema.ts 会 import 共享模块，这里把整个依赖图编译进一个注册表，
 * 用自建的 require 解析，而不是靠 Node 的解析器（Node 不认 .ts 与 @/ 别名）。
 */
const Module = require('module')
const registry = new Map()

function compileTs(file) {
  const key = path.resolve(file)
  if (registry.has(key)) return registry.get(key)
  const src = fs.readFileSync(file, 'utf8')
  const js = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 },
  }).outputText
  const mod = { exports: {} }
  registry.set(key, mod.exports)
  const localRequire = (request) => {
    const base = request.startsWith('@/')
      ? path.join(ADMIN_SRC, request.slice(2))
      : path.resolve(path.dirname(file), request)
    for (const ext of ['', '.ts', '.js', '/index.ts', '/index.js']) {
      if (fs.existsSync(base + ext) && fs.statSync(base + ext).isFile()) {
        return compileTs(base + ext)
      }
    }
    return require(request)
  }
  // eslint-disable-next-line no-new-func
  new Function('exports', 'module', 'require', js)(mod.exports, mod, localRequire)
  registry.set(key, mod.exports)
  return mod.exports
}

/** 加载一个 schema.ts，返回其全部导出 */
function loadExports(file) {
  return compileTs(file)
}

const results = { pass: 0, fail: 0, failures: [] }

function assertNoUndefined(obj) {
  const problems = []
  const walk = (v, p) => {
    if (v === undefined) problems.push(`${p} === undefined`)
    if (typeof v === 'function') problems.push(`${p} === function（漏了工厂调用）`)
    if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${p}[${i}]`))
    else if (v && typeof v === 'object') Object.keys(v).forEach((k) => walk(v[k], `${p}.${k}`))
  }
  walk(obj, 'props')
  return problems
}

/**
 * 空串/空数组检查
 *
 * 区分两类字段：
 *   - 展示性字段（标题/文案/条目/标签…）→ 必须有内容，否则拖进画布是白板
 *   - 配置性字段（bgColor/各种 link/图片 URL）→ 允许留空，
 *     留空即「用设计系统默认值」，这是刻意的约定（见 warm-tokens 的纸感底色）
 */
const CONFIG_KEYS = new Set([
  'bgColor', 'accentColor', 'progressColor', 'valueColor', 'labelColor',
  'leftColor', 'rightColor', 'leftBg', 'rightBg', 'lineColor', 'tagColor',
  'paperTint', 'borderColor', 'hostAvatar', 'answererAvatar', 'cover',
  'qrImage', 'audioUrl', 'moreLink', 'askLink', 'ctaLink', 'leftLink',
  'rightLink', 'link', 'image', 'avatar',
])

function assertNoEmptyPlaceholder(obj) {
  const problems = []
  const walk = (v, p, key = '') => {
    if (key && CONFIG_KEYS.has(key)) return // 配置项允许留空
    if (typeof v === 'string' && v.trim() === '') problems.push(`${p} 空串占位`)
    if (Array.isArray(v) && v.length === 0) problems.push(`${p} 空数组占位`)
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.keys(v).forEach((k) => walk(v[k], `${p}.${k}`, k))
    }
  }
  walk(obj, 'props')
  return problems
}

let total = 0
for (const cat of CATS) {
  for (const name of fs.readdirSync(path.join(BASE, cat))) {
    const dir = path.join(BASE, cat, name)
    if (!fs.statSync(dir).isDirectory()) continue
    total++
    const label = `${cat}/${name}`
    try {
      const ex = loadExports(path.join(dir, 'schema.ts'))

      // 1. 必须导出 defaultProps 工厂（名字统一以 DefaultProps 结尾）
      const factoryKey = Object.keys(ex).find((k) => /DefaultProps$/.test(k))
      assert(factoryKey, `未导出 *DefaultProps 工厂（现有：${Object.keys(ex).join(', ')}）`)
      assert(typeof ex[factoryKey] === 'function', `${factoryKey} 不是函数`)

      // 2. 调用真实工厂拿数据
      const defaults = ex[factoryKey]()
      assert(defaults && typeof defaults === 'object', 'defaultProps 返回值不是对象')

      // 3. 无 undefined（白屏根因）
      const undef = assertNoUndefined(defaults)
      assert(undef.length === 0, undef.slice(0, 3).join(' | '))

      // 4. 无空串/空数组占位（拖入画布必须有内容）
      const empty = assertNoEmptyPlaceholder(defaults)
      assert(empty.length === 0, empty.slice(0, 3).join(' | '))

      // 5. 必须有 formSchema（右侧属性面板要有东西可配）
      const formKey = Object.keys(ex).find((k) => /FormSchema$/.test(k))
      assert(formKey, '缺少 *FormSchema，右侧属性面板会是空的')
      assert(Array.isArray(ex[formKey]) && ex[formKey].length > 0, 'formSchema 为空数组')

      // 6. 必须有 defaultStyle（画布边距/圆角）
      const styleKey = Object.keys(ex).find((k) => /DefaultStyle$/.test(k))
      assert(styleKey, '缺少 *DefaultStyle')

      // 7. index.ts 必须导出 meta 与 re-export schema
      const indexSrc = fs.readFileSync(path.join(dir, 'index.ts'), 'utf8')
      assert(/export const \w+Meta/.test(indexSrc), 'index.ts 未导出 meta')
      assert(indexSrc.includes("export * from './schema'"), "index.ts 缺少 export * from './schema'")

      // 8. editor/runtime 双层：都用兜底，editor 做隔离，runtime 不做
      const ed = fs.readFileSync(path.join(dir, 'editor.vue'), 'utf8')
      const rt = fs.readFileSync(path.join(dir, 'runtime.vue'), 'utf8')
      assert(ed.includes('useWarmKit'), 'editor.vue 未用 useWarmKit 兜底')
      assert(rt.includes('useWarmKit'), 'runtime.vue 未用 useWarmKit 兜底')
      assert(/guard/.test(ed), 'editor.vue 未做事件穿透保护')
      assert(!/previewMode/.test(rt), 'runtime.vue 残留 previewMode（应是纯运行时）')
      // runtime 的 <template> 里不应再绑编辑态类/事件（scoped style 里有 .wk-guard
      // 定义属正常，那是样式不是绑定）
      const rtTpl = (rt.match(/<template>([\s\S]*?)<\/template>/) || ['', ''])[1]
      assert(!/wk-guard/.test(rtTpl), 'runtime 模板残留 wk-guard 编辑态类')
      assert(!/@click="guard/.test(rtTpl), 'runtime 模板残留 guard 事件拦截')

      // 9. 冷灰检查：禁止 slate/gray/zinc/neutral 系
      const styleTxt = ed + rt
      const cold = styleTxt.match(/#[0-9a-f]*(?:64748b|6b7280|71717a|a8a29e|94a3b8|9ca3af|d1d5db|e5e7eb|f3f4f6|111827|374151)/gi)
      assert(!cold, `含冷灰色值 ${cold && cold.slice(0, 3).join(', ')}`)

      results.pass++
      const n = Object.keys(defaults).length
      console.log(`  ✅ ${label.padEnd(32)} ${String(n).padStart(2)} 字段 · form ${ex[formKey].length} 组`)
    } catch (e) {
      results.fail++
      results.failures.push(`${label} → ${e.message}`)
      console.log(`  ❌ ${label.padEnd(32)} ${e.message}`)
    }
  }
}

console.log('\n' + '='.repeat(66))
console.log(`结果：${results.pass} 通过 / ${results.fail} 失败（共 ${total} 个组件）`)
if (results.failures.length) {
  console.log('\n失败明细：')
  results.failures.forEach((f) => console.log('  - ' + f))
  process.exit(1)
}
console.log('✅ 全部通过 —— 拖拽即渲染，无 undefined 白屏风险，无冷灰')
