/**
 * 双端口径一致性验证（2026-10-06）
 *
 * 🔴 项目铁律：ArticleList 的字段规则在后台渲染器与小程序端必须**完全一致**，
 * 不一致就会「画布长这样、真机长那样」，运营无从排查。
 *
 * 本脚本把小程序端 dsl-article-list.js 里的纯函数抽出来，
 * 与后台 articleListSchema.ts 的对应实现跑同一批用例，逐一比对。
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const jsSrc = fs.readFileSync(
  path.join(ROOT, 'miniapp/components/dsl-article-list/dsl-article-list.js'), 'utf8')
const tsSrc = fs.readFileSync(
  path.join(ROOT, 'admin/src/components/page-builder/articleFeed/articleListSchema.ts'), 'utf8')

// 从小程序端源码里摘出纯函数（eval 到隔离作用域，require 会被 stub 掉）
function extractFns(src, names) {
  const out = {}
  for (const name of names) {
    const start = src.indexOf(`function ${name}(`)
    if (start < 0) throw new Error(`小程序端找不到函数 ${name}`)
    // 花括号配平截取函数体
    let i = src.indexOf('{', start)
    let depth = 0
    for (; i < src.length; i++) {
      if (src[i] === '{') depth++
      else if (src[i] === '}') { depth--; if (depth === 0) { i++; break } }
    }
    const body = src.slice(start, i)
    // eslint-disable-next-line no-new-func
    out[name] = new Function(`return (${body})`)()
  }
  return out
}

const mini = extractFns(jsSrc, ['resolveShowSummary', 'formatViewsText', 'applyPinned'])

// 后台侧：把 TS 语法降到可执行
const tsJs = tsSrc
  .replace(/export interface[\s\S]*?\n}/g, '')
  .replace(/export type[^;]*;/g, '')
  .replace(/export const/g, 'const')
  .replace(/export function/g, 'function')
/** 去掉 TS 类型标注，让纯函数能在 Node 里直接跑 */
function stripTsTypes(src) {
  return src
    // 参数/返回值类型：`(a: Foo, b: Bar): Ret {` → `(a, b) {`
    .replace(/:\s*[A-Za-z_$][\w$<>|\[\]\s]*(?=\s*[,)])/g, '')
    .replace(/\)\s*:\s*[A-Za-z_$][\w$<>|\[\]\s]*\s*\{/g, ') {')
}

const admin = {}
{
  const fnNames = ['resolveShowSummary', 'normalizeLimit', 'limitStepOf', 'limitParityWarningOf']
  const consts = ['EMPTY_ICON_OPTIONS', 'PIN_MAX_LIMIT', 'LIMIT_MIN', 'LIMIT_MAX', 'LIMIT_FALLBACK']
  const src = consts.map((c) => {
    const m = tsJs.match(new RegExp(`const ${c}[^\\n]*`))
    // 去掉 TS 的 `as const` —— 纯 JS 跑不了
    return m ? m[0].replace(/\s+as const$/, '') : ''
  }).join('\n') + '\n' + fnNames.map((f) => {
    const start = tsJs.indexOf(`export function ${f}(`) >= 0 ? tsJs.indexOf(`function ${f}(`) : tsJs.indexOf(`function ${f}(`)
    let i = tsJs.indexOf('{', start)
    let depth = 0
    for (; i < tsJs.length; i++) {
      if (tsJs[i] === '{') depth++
      else if (tsJs[i] === '}') { depth--; if (depth === 0) { i++; break } }
    }
    return tsJs.slice(start, i)
  }).join('\n')
  // eslint-disable-next-line no-new-func
  Object.assign(admin, new Function(`${stripTsTypes(src)}\nreturn { resolveShowSummary, normalizeLimit, limitStepOf, limitParityWarningOf }`)())
}

const results = []
const eq = (name, a, b) => {
  const pass = JSON.stringify(a) === JSON.stringify(b)
  results.push(pass)
  console.log(`${pass ? '✅' : '❌'} ${name}${pass ? '' : ` — 后台=${JSON.stringify(a)} 小程序=${JSON.stringify(b)}`}`)
}

console.log('── resolveShowSummary（摘要是否展示）──')
for (const layout of ['list', 'card', 'compact', 'overlay', 'editorial', 'magazine', 'grid']) {
  for (const ss of [true, false, undefined]) {
    eq(`${layout} / show_summary=${ss}`,
      admin.resolveShowSummary(layout, ss), mini.resolveShowSummary(layout, ss))
  }
}

console.log('\n── applyPinned（置顶顺序）──')
const rows = [
  { id: 1, title: 'A' }, { id: 2, title: 'B' }, { id: 3, title: 'C' },
]
const cases = [
  ['无置顶', [], rows],
  ['置顶中间项', [{ id: 2, title: 'B' }], rows],
  ['置顶两项', [{ id: 3, title: 'C' }, { id: 1, title: 'A' }], rows],
  ['置顶不在结果里', [{ id: 99, title: 'Z' }], rows],
  ['空数组', [], []],
]
for (const [name, pinned, list] of cases) {
  const r = mini.applyPinned(list, pinned)
  console.log(`   ${name} → [${r.map((x) => x.id).join(',')}] ${r.map((x) => x.title).join('|')}`)
}
// 后台 displayArticleItems 逻辑内联复刻（同一段算法）验证一致
const adminPinned = (pool, pinned) => {
  if (!pinned.length) return pool
  const byId = new Map(pool.map((it) => [String(it.id ?? ''), it]))
  const head = []
  for (const p of pinned) {
    const hit = byId.get(String(p.id))
    if (hit) { head.push(hit); byId.delete(String(p.id)) } else {
      head.push({ id: p.id, title: p.title || `文章 #${p.id}`, cover: p.cover })
    }
  }
  const headIds = new Set(head.map((h) => String(h.id ?? '')))
  return [...head, ...pool.filter((it) => !headIds.has(String(it.id ?? '')))]
}
for (const [name, pinned, list] of cases) {
  const a = adminPinned(list, pinned).map((x) => String(x.id))
  const m = mini.applyPinned(list, pinned).map((x) => String(x.id))
  eq(`置顶顺序 ${name}`, a, m)
}

console.log('\n── limit 区间与步长（后台侧）──')
eq('normalizeLimit(99) = 20', admin.normalizeLimit(99), 20)
eq('normalizeLimit(0) = 1', admin.normalizeLimit(0), 1)
eq('normalizeLimit(-5) = 1', admin.normalizeLimit(-5), 1)
eq('normalizeLimit(abc) = 6', admin.normalizeLimit('abc'), 6)
eq('normalizeLimit(4.6) = 5', admin.normalizeLimit(4.6), 5)
eq('grid 步长 = 2', admin.limitStepOf('grid'), 2)
eq('list 步长 = 1', admin.limitStepOf('list'), 1)
eq('grid+3 有偶数提示', admin.limitParityWarningOf('grid', 3), '建议设置为偶数以保持网格对齐')
eq('grid+4 无提示', admin.limitParityWarningOf('grid', 4), '')
eq('list+3 无提示', admin.limitParityWarningOf('list', 3), '')

console.log('\n── 阅读量文案（小程序端格式）──')
for (const [v, expect] of [[0, '0 阅读'], [999, '999 阅读'], [10000, '1.0万 阅读'], [12345, '1.2万 阅读']]) {
  const got = mini.formatViewsText(true, v)
  eq(`views=${v}`, got, expect)
}
eq('show_views 关闭 → 空串', mini.formatViewsText(false, 5000), '')

const failed = results.filter((r) => !r).length
console.log(`\n双端口径一致：${results.length - failed}/${results.length}`)
process.exit(failed ? 1 : 0)