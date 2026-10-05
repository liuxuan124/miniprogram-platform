/*
 * warm_authors 作者列表数据源优先级测试
 * 背景：2026-10-04 之前，作者区块的头像/名称/身份只能来自首页聚合接口
 *       warm_home_config.authors，装修器面板没有任何入口（用户报「好像写死了」）。
 *       现在 DSL props.authors 可配，规则必须是「配了就用配的，没配才回落接口」。
 *
 * 关键：后台预览 DslWarmBlock.authorList 与端上 dsl-warm-block.resolveAuthors
 *      必须同规则，否则运营在后台看到的效果和线上不一样。
 * 运行：node scripts/qa/test-warm-authors-priority.js
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '../..')
const MINIAPP_JS = path.join(ROOT, 'miniapp/components/dsl-warm-block/dsl-warm-block.js')
const ADMIN_VUE = path.join(ROOT, 'admin/src/components/page-builder/renderers/warm/DslWarmBlock.vue')
// esbuild 只装在 admin/node_modules（仓库既有做法，见 test-block-unpack.js）
const esbuild = require(path.join(ROOT, 'admin/node_modules/esbuild'))

let pass = 0
let fail = 0
const failures = []

function check(name, cond, detail) {
  if (cond) {
    pass++
  } else {
    fail++
    failures.push(`${name}${detail ? ' → ' + detail : ''}`)
  }
}

/**
 * 抽一段完整的函数/箭头函数源码（从 signature 起，到配平的 `}`止，**含形参列表**）。
 * 扫描时跳过字符串/模板串/行注释/块注释，否则函数体里的 '{' 会算错层级。
 * 返回的是可直接求值的源码片段（声明或表达式都行），调用方自己决定怎么包。
 */
function extractFunctionSource(source, signature) {
  const start = source.indexOf(signature)
  if (start < 0) throw new Error(`未找到：${signature}`)
  const bodyStart = source.indexOf('{', start + signature.length - 1)
  if (bodyStart < 0) throw new Error(`未找到函数体起点：${signature}`)
  let depth = 0
  let i = bodyStart
  let quote = ''      // ' " `
  let lineComment = false
  let blockComment = false
  while (i < source.length) {
    const ch = source[i]
    const next = source[i + 1]
    if (lineComment) {
      if (ch === '\n') lineComment = false
      i++
      continue
    }
    if (blockComment) {
      if (ch === '*' && next === '/') { blockComment = false; i += 2; continue }
      i++
      continue
    }
    if (quote) {
      if (ch === '\\') { i += 2; continue }
      if (ch === quote) quote = ''
      i++
      continue
    }
    if (ch === '/' && next === '/') { lineComment = true; i += 2; continue }
    if (ch === '/' && next === '*') { blockComment = true; i += 2; continue }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; i++; continue }
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) return source.slice(start, i + 1)
    }
    i++
  }
  throw new Error(`函数体未闭合：${signature}`)
}

// ---------- 端上 resolveAuthors ----------
// ⚠️ 抽出来的是**函数声明**（形参在原文里），不能写成 `return (fn)`——
//    函数体是语句块不是表达式。整段声明 + 尾部 `return f` 一次求值。
const miniappSrc = fs.readFileSync(MINIAPP_JS, 'utf8')
const resolveAuthors = new Function(
  extractFunctionSource(miniappSrc, 'function resolveAuthors') + '\nreturn resolveAuthors'
)()

// ---------- 后台 authorList（computed(() => { … }) 里的箭头函数） ----------
const adminSrc = fs.readFileSync(ADMIN_VUE, 'utf8')
// 箭头函数体是 computed 的第一个实参；抽出 `computed(() => {…})` 整段后，
// 去掉 computed 包装、把 config.value / warm.value 换成入参即可求值。
const adminComputedSrc = extractFunctionSource(adminSrc, 'const authorList = computed(')
const arrowSrc = adminComputedSrc
  .replace(/^const authorList = computed\(/, '')
  .replace(/\)$/, '')
/**
 * 后台这段是 TS（`: Array<Record<string, unknown>>` / `as` 断言），纯 new Function 跑不了。
 * 用 esbuild 转译（项目既有做法，见 test-block-unpack.js）。
 * ⚠️ 两个坑：① esbuild 会在表达式末尾补一个 `;`，直接塞进 `return (...)` 报 SyntaxError，必须先剥掉；
 *    ② 抽取到的片段结尾是箭头函数的 `}` 而不是 computed 的 `)`，所以那句`.replace(/\)$/,'')` 是空操作。
 * 顺带把 config.value / warm.value 换成入参，让它脱离 Vue computed 独立跑。
 */
const transpiled = esbuild
  .transformSync('(' + arrowSrc + ')', { loader: 'ts' })
  .code.replace(/;\s*$/, '')
/**
 * ⚠️ 转译结果是 `(() => {…})`——**箭头函数本身**，不是它的返回值。
 *    `return (…)` 只会把那函数原样返回（实测得到 undefined 的下一层），必须显式调用一次。
 */
const adminArrowFn = new Function(
  'config', 'warm',
  'return (' + transpiled
    .replace(/config\.value/g, 'config')
    .replace(/warm\.value/g, 'warm') + ')(config, warm)'
)
const adminAuthorList = (cfg, warm) => adminArrowFn(cfg, warm)

// ============ 端上 ============

// 1. DSL 配了 authors → 用配的，忽略接口数据
{
  const r = resolveAuthors(
    { authors: [{ name: '太白', role: '主理人', avatar: '/uploads/a.png' }] },
    { authors: [{ name: '接口作者', role: '接口身份' }] }
  )
  check('端上·DSL 配了覆盖接口', r.length === 1 && r[0].name === '太白' && r[0].role === '主理人', JSON.stringify(r))
  check('端上·覆盖后头像取配置值', r[0].avatar === '/uploads/a.png', r[0].avatar)
}

// 2. 没配 → 回落接口数据（历史页面外观不变）
{
  const r = resolveAuthors({}, { authors: [{ id: 7, name: '接口作者', role: '专栏作者', avatar: '/uploads/b.png' }] })
  check('端上·没配回落接口', r.length === 1 && r[0].name === '接口作者', JSON.stringify(r))
  check('端上·回落保留 id（点进作者页要用）', r[0].id === 7, String(r[0].id))
}

// 3. config.authors 是空数组 → 也算「没配」，回落接口
{
  const r = resolveAuthors({ authors: [] }, { authors: [{ name: '接口作者' }] })
  check('端上·空数组视为没配', r.length === 1 && r[0].name === '接口作者', JSON.stringify(r))
}

// 4. 两边都没有 → 空数组 + 首字兜底，不能抛错
{
  const r = resolveAuthors({}, {})
  check('端上·两边都空不抛错', Array.isArray(r) && r.length === 0, JSON.stringify(r))
}

// 5. 归一化出 wxml 需要的字段；key 稳定可用作 wx:key
{
  const r = resolveAuthors(
    { authors: [{ name: '甲' }, { name: '乙' }, { name: '丙' }] },
    {}
  )
  check('端上·key 唯一（wx:key）', new Set(r.map((x) => x.key)).size === 3, JSON.stringify(r.map((x) => x.key)))
  check('端上·无 key 时按序号生成', r[0].key === 'author_0' && r[2].key === 'author_2', JSON.stringify(r.map((x) => x.key)))
  check('端上·无头像时给首字 initial', r[0].initial === '甲' && r[0].avatar === '', JSON.stringify(r[0]))
  check('端上·空名兜底首字为「作」', resolveAuthors({ authors: [{}] }, {})[0].initial === '作', '')
  check('端上·字段齐备', ['key', 'id', 'name', 'role', 'avatar', 'url', 'apply', 'initial'].every((k) => k in r[0]), JSON.stringify(r[0]))
}

// 6. apply 招募位：只认 true，不被字符串 'true' 误判
{
  const t = resolveAuthors({ authors: [{ name: '甲', apply: true }, { name: '乙', apply: 'true' }] }, {})
  check('端上·apply 只认布尔 true', t[0].apply === true && t[1].apply === false, JSON.stringify(t.map((x) => x.apply)))
}

// 7. 自定义跳转 url 原样透传
{
  const r = resolveAuthors({ authors: [{ name: '甲', url: '/pkg-content/author-feed/author-feed?author=x' }] }, {})
  check('端上·自定义 url 透传', r[0].url === '/pkg-content/author-feed/author-feed?author=x', r[0].url)
}

// 8. warm 传 null 不炸
{
  let ok = true
  try { resolveAuthors({ authors: [{ name: '甲' }] }, null) } catch (e) { ok = false }
  check('端上·warm=null 不抛错', ok, '')
}

// ============ 后台预览 ============

// 9. 后台与端上同规则：配了覆盖
{
  const r = adminAuthorList({ authors: [{ name: '太白' }] }, { authors: [{ name: '接口作者' }] })
  check('后台·DSL 配了覆盖接口', r.length === 1 && r[0].name === '太白', JSON.stringify(r))
}

// 10. 后台与端上同规则：没配回落
{
  const r = adminAuthorList({}, { authors: [{ id: 7, name: '接口作者' }] })
  check('后台·没配回落接口', r.length === 1 && r[0].name === '接口作者', JSON.stringify(r))
  check('后台·回落时 key 用 id', r[0].key === '7', r[0].key)
}

// 11. 后台两端同输入 → 同输出（关键：预览与真机必须一致）
//     只比「共有语义字段」：端上多带 id（点进作者页要用）和 initial（无头像首字占位），
//     后台渲染层不消费这两个，比全量 JSON 会误报。
{
  const SHARED = ['key', 'name', 'role', 'avatar', 'url', 'apply']
  const pick = (list) => (list || []).map((x) => SHARED.map((k) => x[k]))
  const cases = [
    [{ authors: [{ name: '太白', role: '主理人' }] }, { authors: [{ name: '接口作者' }] }],
    [{}, { authors: [{ id: 3, name: '接口作者', avatar: '/uploads/x.png' }] }],
    [{ authors: [] }, { authors: [{ name: 'A' }] }],
    [{ authors: [{ name: '甲', apply: true }, { name: '乙' }] }, {}],
    [{}, {}],
  ]
  let same = true
  const detail = []
  for (const [cfg, warm] of cases) {
    const a = JSON.stringify(pick(adminAuthorList(cfg, warm)))
    const b = JSON.stringify(pick(resolveAuthors(cfg, warm)))
    if (a !== b) {
      same = false
      detail.push(`后台=${a} 端上=${b}`)
    }
  }
  check('后台与端上 5 组用例共有字段完全一致', same, detail.join(' | '))
}

// ============ 模板/结构约束 ============

// 12. wxml 不再直接读 warm.authors（否则绕过优先级又变成写死）
{
  const wxml = fs.readFileSync(path.join(ROOT, 'miniapp/components/dsl-warm-block/dsl-warm-block.wxml'), 'utf8')
  check('wxml·不再直读 warm.authors', !wxml.includes('warm.authors'), '')
  check('wxml·改读归一化后的 authors', wxml.includes('wx:for="{{authors}}"'), '')
  check('wxml·空态读 authorsEmptyText', wxml.includes('{{authorsEmptyText}}'), '')
  check('wxml·作者带 data-url（自定义跳转）', wxml.includes('data-url="{{item.url}}"'), '')
}

// 13. 属性面板确实暴露了作者配置入口
{
  const props = fs.readFileSync(path.join(ROOT, 'admin/src/components/page-builder/props/WarmHomeBlockProps.vue'), 'utf8')
  check('面板·有作者条目编辑器', props.includes('作者条目'), '')
  check('面板·有空态文案', props.includes('empty_text'), '')
  check('面板·有招募位开关', props.includes('招募位'), '')
  check('面板·有清空回退接口的入口', props.includes('clearAuthors'), '')
  check('面板·作者可排序', props.includes('moveAuthor') && props.includes('patchAuthor'), '')
  check('面板·头像走素材库', props.includes('authorPickerVisible') && props.includes('AssetPickerDialog'), '')
}

// 14. 组件注册表给了新块默认键（避免新块缺 authors 键）
{
  const reg = fs.readFileSync(path.join(ROOT, 'admin/src/components/page-builder/componentRegistry.ts'), 'utf8')
  const seg = reg.slice(reg.indexOf('ComponentType.WarmAuthors'))
  check('注册表·默认 props 含 authors 空数组', /authors:\s*\[\]/.test(seg.slice(0, 600)), '')
  check('注册表·默认 props 含 empty_text', /empty_text:\s*'暂无作者'/.test(seg.slice(0, 600)), '')
}

// 15. 首字占位样式两端都在（否则无头像时是空白圆）
{
  const wxss = fs.readFileSync(path.join(ROOT, 'miniapp/styles/warm-home-blocks.wxss'), 'utf8')
  const css = fs.readFileSync(path.join(ROOT, 'admin/src/styles/warm-home-blocks.css'), 'utf8')
  check('样式·端上首字占位', wxss.includes('.wh-author__av--initial'), '')
  check('样式·后台首字占位', css.includes('.wh-author__av--initial'), '')
}

console.log(`\n通过 ${pass} / 失败 ${fail}`)
if (fail) {
  console.log('\n失败明细：')
  failures.forEach((f) => console.log('  ✗ ' + f))
  process.exit(1)
}
console.log('warm_authors 作者配置优先级测试全通过 ✅')
