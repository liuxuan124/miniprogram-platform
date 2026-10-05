/**
 * 笔记瀑布流「内容类型大 Tab」预览筛选逻辑单测
 *
 * 背景（2026-10-05 线上故障）：页签 1「全部」配 filter_type='all' +
 * content_types=['note','article','moment','product']，预览却显示
 * 「当前筛选下没有已发布笔记」。根因是 NoteFeedRenderer 只读旧的单值字段
 * content_type（线上残留值 'note'），完全不认新的多选字段 content_types。
 *
 * 做法：把 <script setup> 整块抽出来，用 esbuild（TS loader）转成 JS，
 * 注入 vue/ref/computed 的极简替身，再把内部 computed 暴露出来跑断言。
 * 覆盖线上真实配置 / 旧配置 / 降级路径。
 */
const fs = require('fs')
const path = require('path')
const esbuild = require(path.resolve(__dirname, '../admin/node_modules/esbuild'))
const vm = require('vm')

const RENDERER = path.resolve(__dirname, '../admin/src/components/page-builder/renderers/NoteFeedRenderer.vue')
const vueSrc = fs.readFileSync(RENDERER, 'utf8')

const m = /<script setup lang="ts">([\s\S]*?)<\/script>/.exec(vueSrc)
if (!m) throw new Error('未找到 <script setup lang="ts">')
let script = m[1]

// 去掉 import（替身里手工提供），并在末尾导出内部 computed 供断言
script = script.replace(/^\s*import .*?from\s+['"][^'"]+['"]\s*$/gm, '')
script += `
;globalThis.__probe = {
  get typeTabs() { return typeTabs },
  get activeTab() { return activeTab },
  get filteredNoteItems() { return filteredNoteItems },
  setTypeTabs(v) { hydratedItems.value = v },
  setPool(v) { hydratedItems.value = (v || []).map(normalizeNote) },
  dumpPool() { return hydratedItems.value },

  setCategoryTabs(v) { categoryTabs.value = v },
  setActiveTabId(v) { activeTabId.value = v },
  setActiveType(v) { activeType.value = v },
  setLive(v) { liveItems.value = v },
  setLiveLoading(v) { liveLoading.value = v },
  setTabLoading(v) { tabLoading.value = v },
  setPreviewMode(v) { previewModeRef.value = v },
}
`

// vue 替身：保留 ref 的 `.value` 读写与 computed 的惰性求值语义（业务代码里就是 `typeTabs.value`）
const VUE_SHIM = `
const ref = (init) => ({ __isRef: true, value: init })
const computed = (fn) => ({ __isComputed: true, __fn: fn, get value() { return this.__fn() } })
`
const STUBS = `
const ElMessage = { info() {}, error() {} }
const loadHydratedComponent = async () => ({ props: { items: [] } })
const useEditorLiveItems = () => ({
  items: ref([]), loading: ref(false), empty: ref(false), failed: ref(false), refresh: async () => {},
})
const fetchTopContentCategoryTabs = async () => []
const withAllCategoryTab = (tabs) => [{ id: '', name: '全部' }, ...tabs]
const previewModeRef = ref(false)
const watch = () => {}
// defineProps 是编译宏：返回可变宿主对象，测试里改它就能换配置
const defineProps = () => globalThis.__probeProps
`
const compiled = esbuild.transformSync(script, {
  loader: 'ts',
  format: 'cjs',
  target: 'es2020',
}).code

const wrapper = `
${VUE_SHIM}
${STUBS}
;(function(){
${compiled}
})();
`
const ctx = { console, __probeProps: { component: { props: {} }, previewMode: false } }
ctx.globalThis = ctx
vm.createContext(ctx)
try {
  vm.runInContext(wrapper, ctx, { filename: 'NoteFeedRenderer.probe.js' })
} catch (e) {
  console.error('脚本执行失败：', e.message)
  process.exit(1)
}
const probe = ctx.__probe
/** computed 在 vm 内是 {__fn} 对象，宿主侧取值统一走 .value（shim 的 getter 会触发求值） */
const val = (r) => (r && r.__isComputed ? r.value : r)

// ── 线上真实配置（从生产 mp_page_version id=774 提取） ──
const REAL_TABS = [
  {
    label: '全部', filter_type: 'all', category_id: '', content_ids: [], tag: '',
    content_type: 'note', content_types: ['note', 'article', 'moment', 'product'], category_ids: [],
  },
  {
    label: '笔记', filter_type: 'tag', category_id: '21', content_ids: [], tag: '公众号',
    content_type: 'note', content_types: ['note'], category_ids: ['21'],
  },
]

// 宽取池：基础 20 条被 article 霸占 + 补拉进来的 note/moment/product
const POOL = [
  { id: 300, contentType: 'article', categoryId: 21, tags: ['公众号'] },
  { id: 301, contentType: 'article', categoryId: 11, tags: [] },
  { id: 302, contentType: 'note', categoryId: 21, tags: ['公众号'] },
  { id: 303, contentType: 'moment', categoryId: '', tags: [] },
  { id: 304, contentType: 'product', isProduct: true, categoryId: 5, price: 39.9 },
  { id: 305, contentType: 'note', categoryId: 30, tags: ['选品'] },
]

let pass = 0
let fail = 0
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (ok) { pass++; console.log(`  ✓ ${name}`) }
  else {
    fail++
    console.log(`  ✗ ${name}\n      期望: ${JSON.stringify(expected)}\n      实际: ${JSON.stringify(actual)}`)
  }
}
/** 重置探针：换页签配置 + 数据池 */
function setup(typeTabs, pool, opts = {}) {
  ctx.__probeProps.component = { props: { type_tabs: typeTabs, show_category_tabs: false, ...(opts.props || {}) } }
  ctx.__probeProps.previewMode = false
  probe.setLive([])
  probe.setLiveLoading(false)
  probe.setTabLoading(false)
  probe.setActiveTabId('')
  probe.setCategoryTabs([])
  probe.setPool(pool || [])
  probe.setActiveType(0)
}

console.log('\n【1】typeTabs 归一化：读多选 content_types，忽略残留的旧单值 content_type')
{
  setup(REAL_TABS, POOL)
  const tabs = val(probe.typeTabs)
  check('页签1 content_types 保留 4 项多选', tabs[0].content_types, ['note', 'article', 'moment', 'product'])
  check('页签1 filter_type 归一为 all', tabs[0].filter_type, 'all')
  check('页签1 category_ids 归一为空数组', tabs[0].category_ids, [])
  check('页签2 tag 模式 + category_ids 多选', [tabs[1].filter_type, tabs[1].category_ids], ['tag', ['21']])
}

console.log('\n【2】typeTabs 降级：旧配置只有 content_type 单值')
{
  setup([{ label: '旧页签', filter_type: 'type', content_type: 'note' }], POOL)
  check('content_type 映射为单元素 content_types', val(probe.typeTabs)[0].content_types, ['note'])
  check('旧值 filter_type=type 归一为 all', val(probe.typeTabs)[0].filter_type, 'all')
}
{
  setup([{ label: '旧页签', filter_type: 'type', content_type: 'moment' }], POOL)
  check('content_type=moment 正确映射', val(probe.typeTabs)[0].content_types, ['moment'])
}
{
  setup([{ label: '空类型', filter_type: 'all', content_type: '', content_types: [], category_ids: [], tag: '', content_ids: [] }], POOL)
  check('content_types 空数组保持空（= 全部形式）', val(probe.typeTabs)[0].content_types, [])
}

console.log('\n【3】筛选：页签1「全部」应显示全部类型（含商品），不再空白')
{
  setup(REAL_TABS, POOL)
  const got = val(probe.filteredNoteItems).map((x) => x.contentType).sort()
  check('页签1 命中 6 条（含 note/article/moment/product）', got,
    ['article', 'article', 'moment', 'note', 'note', 'product'])
}

console.log('\n【4】筛选：单选内容形式只显示该类型')
{
  setup([{ label: '笔记', filter_type: 'all', content_type: '', content_types: ['note'], category_ids: [], tag: '', content_ids: [] }], POOL)
  check('只显示 2 条 note', val(probe.filteredNoteItems).map((x) => x.contentType), ['note', 'note'])
}
{
  setup([{ label: '好物', filter_type: 'all', content_type: '', content_types: ['product'], category_ids: [], tag: '', content_ids: [] }], POOL)
  const poolAfter = probe.dumpPool().map((x) => [x.contentType, x.isProduct])
  check('池子归一化后 product 项被识别为商品', poolAfter.filter((r) => r[0] === 'product'), [['product', true]])
  check('只选好物 → 仅商品卡（不放行内容）', val(probe.filteredNoteItems).map((x) => x.contentType), ['product'])
}

console.log('\n【5】筛选：content_types 为空 = 全部形式（不过滤）')
{
  setup([{ label: '全部', filter_type: 'all', content_type: '', content_types: [], category_ids: [], tag: '', content_ids: [] }], POOL)
  check('空 content_types 不过滤，6 条全出', val(probe.filteredNoteItems).length, 6)
}

console.log('\n【6】筛选：tag 模式（页签2 线上配置 tag=公众号）')
{
  setup(REAL_TABS, POOL)
  probe.setActiveType(1)
  check('页签2 命中 note + 公众号标签 = id302', val(probe.filteredNoteItems).map((x) => x.id), [302])
}

console.log('\n【7】筛选：category 模式多选')
{
  setup([
    { label: '分类', filter_type: 'category', content_type: '', content_types: ['note', 'article'],
      category_ids: ['11', '30'], category_id: '', tag: '', content_ids: [] },
  ], POOL)
  check('category_ids=[11,30] 命中 article(11) + note(30)', val(probe.filteredNoteItems).map((x) => x.id).sort(), [301, 305])
}
{
  setup([
    { label: '分类', filter_type: 'category', content_type: '', content_types: ['note'],
      category_ids: [], category_id: '', tag: '', content_ids: [] },
  ], POOL)
  check('category 模式未配类别 → 置空（与小程序端一致，不给脏数据）', val(probe.filteredNoteItems).length, 0)
}

console.log('\n【8】降级路径：数据层全空 / contentType 缺失 不应抛错')
{
  setup(REAL_TABS, [])
  let threw = null
  let got = null
  try { got = val(probe.filteredNoteItems) } catch (e) { threw = e }
  check('空池不抛错且返回空数组', [threw, got], [null, []])
}
{
  setup(REAL_TABS, [{ id: 1, title: 'x' }, { id: 2, title: 'y' }])
  let threw = null
  let got = null
  try { got = val(probe.filteredNoteItems) } catch (e) { threw = e }
  // normalizeNote 把缺失 contentType 兜底成 'note'（既有行为），页签1 含 note → 命中
  check('contentType 缺失项按 note 兜底命中，不抛错', [threw, got && got.map((x) => x.contentType)], [null, ['note', 'note']])
}
{
  // 后端未升级 / 接口全空：type_tabs 整个缺失
  setup(undefined, POOL)
  let threw = null
  let got = null
  try { got = val(probe.filteredNoteItems) } catch (e) { threw = e }
  check('type_tabs 缺失 → showTypeTabs=false，放行全部数据不过滤', [threw, got && got.length], [null, 6])
}

console.log(`\n结果: ${pass} 通过, ${fail} 失败\n`)
process.exit(fail ? 1 : 0)
