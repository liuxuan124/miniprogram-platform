/**
 * 星球「首次进入选主星球」判定：纯 Node 单测
 *
 * 不依赖小程序运行时：从源文件正则抽函数体，用 new Function 造出来跑。
 * 重点覆盖三条降级路径 —— 接口失败 / 只剩 1 社区 / 已跳过，
 * 这三条任一判错都会把用户拦在门口（白屏或进不去）。
 *
 * 用法：node scripts/qa/test-planet-onboarding.js
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..', '..')
const TARGET = path.join(ROOT, 'miniapp/utils/planet-onboarding.js')

/** 从源文件抽函数体并变成可调用函数（与 test-planet-rec-block 同款 harness） */
function extractFunction(file, name) {
  const src = fs.readFileSync(file, 'utf8')
  const patterns = [`function ${name}(`, `\n    ${name}(`, `\n  ${name}(`]
  let start = -1
  let decl = ''
  for (const p of patterns) {
    const idx = src.indexOf(p)
    if (idx >= 0) { start = idx; decl = p.trim(); break }
  }
  if (start < 0) throw new Error(`未找到函数 ${name}`)
  const head = start + (decl.startsWith('function') ? 0 : decl.indexOf(name))
  const braceAt = src.indexOf('{', head)
  let depth = 0
  for (let j = braceAt; j < src.length; j++) {
    if (src[j] === '{') depth++
    else if (src[j] === '}') {
      depth--
      if (depth === 0) {
        // ⚠️ new Function(body) 里的 function 声明不会成为返回值，必须显式 return
        return new Function(`${src.slice(head, j + 1)}\nreturn ${name}`)()
      }
    }
  }
  throw new Error(`函数 ${name} 括号不匹配`)
}

const shouldGuide = extractFunction(TARGET, 'shouldGuidePlanetPick')
const detectFallback = extractFunction(TARGET, 'detectPlanetFallback')

let pass = 0
let fail = 0
const failures = []

function eq(actual, expected, label) {
  if (actual === expected) { pass++; return }
  fail++
  failures.push(`${label}\n    期望: ${expected}\n    实际: ${actual}`)
}

const LIST3 = [
  { id: 'warm-main', primary: true },
  { id: 'warm-read' },
  { id: 'warm-write' },
]

/* ============ 一、该弹的弹 ============ */
eq(
  shouldGuide({ loggedIn: true, main: { planetId: 'warm-main', userSet: false }, list: LIST3, skipped: false, cachedId: '' }),
  true,
  '首次进入（已登录+userSet=false+无缓存+3社区）→ 弹'
)

eq(
  shouldGuide({ loggedIn: true, main: { planetId: 'warm-main', userSet: false }, list: LIST3, skipped: false, cachedId: '' }),
  true,
  '首次进入即使接口回落了配置 primary，也应弹（userSet=false 才是判据）'
)

/* ============ 二、不该弹的（拦住就是 bug） ============ */
eq(
  shouldGuide({ loggedIn: false, main: { planetId: 'warm-main', userSet: false }, list: LIST3, skipped: false, cachedId: '' }),
  false,
  '游客不弹（浏览不拦登录，否则审核驳回）'
)

eq(
  shouldGuide({ loggedIn: true, main: { planetId: 'warm-read', userSet: true }, list: LIST3, skipped: false, cachedId: 'warm-read' }),
  false,
  '已主动设过主星球不弹'
)

eq(
  shouldGuide({ loggedIn: true, main: { planetId: 'warm-main', userSet: false }, list: LIST3, skipped: true, cachedId: '' }),
  false,
  '点过「先逛逛」不弹'
)

eq(
  shouldGuide({ loggedIn: true, main: null, list: LIST3, skipped: false, cachedId: 'warm-read' }),
  false,
  '主星球接口失败但本地有缓存 → 不弹（缓存说明之前设过）'
)

eq(
  shouldGuide({ loggedIn: true, main: null, list: LIST3, skipped: false, cachedId: '' }),
  false,
  '主星球接口失败且无缓存 → 静默放行，不能卡在判定上'
)

eq(
  shouldGuide({ loggedIn: true, main: { planetId: 'warm-main', userSet: false }, list: [LIST3[0]], skipped: false, cachedId: '' }),
  false,
  '只剩 1 个启用社区 → 不弹（没得选不该让用户选）'
)

eq(
  shouldGuide({ loggedIn: true, main: { planetId: 'warm-main', userSet: false }, list: [], skipped: false, cachedId: '' }),
  false,
  '社区列表为空 → 不弹'
)

eq(
  shouldGuide({ loggedIn: true, main: { planetId: 'warm-main', userSet: false }, list: LIST3, skipped: false, cachedId: 'warm-read' }),
  false,
  '有本地缓存 → 不弹（哪怕接口说 userSet=false，缓存优先，避免反复弹）'
)

/* ============ 三、异常输入必须不崩 ============ */
eq(shouldGuide({}), false, '空 ctx 不弹')
eq(shouldGuide(null), false, 'null ctx 不弹')
eq(shouldGuide({ loggedIn: true, main: 'oops', list: LIST3 }), false, 'main 类型错 → 不弹')
eq(shouldGuide({ loggedIn: true, main: {}, list: 'not-array', cachedId: '' }), false, 'list 类型错 → 不弹')
eq(shouldGuide({ loggedIn: 'yes', main: { userSet: false }, list: LIST3, cachedId: '' }), true, 'loggedIn 为真值字符串也认')

/* ============ 四、主星球停用回落检测 ============ */
// ⚠️ 用例里必须真的把那颗从 list 里去掉，否则测的是「换了主星球」而不是「主星球被停用」
const LIST_WITHOUT_READ = [
  { id: 'warm-main', primary: true },
  { id: 'warm-write' },
]

eq(
  detectFallback({ main: { planetId: 'warm-main' }, list: LIST_WITHOUT_READ, cachedId: 'warm-read' }).fallback,
  true,
  '缓存那颗不在启用列表里 → 判定为停用回落'
)

eq(
  detectFallback({ main: { planetId: 'warm-read' }, list: LIST3, cachedId: 'warm-read' }).fallback,
  false,
  '缓存与解析一致 → 没回落'
)

eq(
  detectFallback({ main: { planetId: 'warm-read' }, list: LIST3, cachedId: 'warm-main' }).fallback,
  false,
  '缓存那颗仍在启用列表（只是主星球被换了）→ 不是停用'
)

eq(
  detectFallback({ main: { planetId: 'warm-write' }, list: LIST_WITHOUT_READ, cachedId: '' }).fallback,
  false,
  '无缓存 → 无回落'
)

eq(
  detectFallback({}).fallback,
  false,
  '空 ctx → 无回落（不崩）'
)

const fb = detectFallback({ main: { planetId: 'warm-main' }, list: LIST_WITHOUT_READ, cachedId: 'warm-read' })
eq(fb.from, 'warm-read', '回落时记录原星球')
eq(fb.to, 'warm-main', '回落时记录新星球')

/* ============ 五、normalizeCommunities 兜底（后端未升级场景） ============ */
function extractService(file, name) {
  const src = fs.readFileSync(file, 'utf8')
  const idx = src.indexOf(`function ${name}(`)
  if (idx < 0) throw new Error(`未找到 ${name}`)
  const braceAt = src.indexOf('{', idx)
  let depth = 0
  for (let j = braceAt; j < src.length; j++) {
    if (src[j] === '{') depth++
    else if (src[j] === '}') {
      depth--
      if (depth === 0) return new Function(`${src.slice(idx, j + 1)}\nreturn ${name}`)()
    }
  }
  throw new Error('括号不匹配')
}
const normalize = extractService(path.join(ROOT, 'miniapp/services/planet.js'), 'normalizeCommunities')

eq(normalize(null).length, 0, 'normalize(null) → 空数组')
eq(normalize(undefined).length, 0, 'normalize(undefined) → 空数组')
eq(normalize([{}, null]).length, 0, '空壳项被剔除（缺 id 会让设常驻静默失败）')
eq(normalize([{ planetId: 'warm-read' }])[0].id, 'warm-read', '只有 planetId 时映射成 id')
eq(normalize([{ }])[0], undefined, '无任何 id 的项被剔除')
eq(normalize([{ id: '  warm-read  ' }])[0].id, 'warm-read', 'id 去空格')
eq(normalize([{ id: 'warm-main' }, { id: 'warm-read' }]).length, 2, '正常项全保留')
eq(normalize([{ id: 'warm-main', title: 'A' }])[0].title, 'A', '其它字段保留')

/* ============ 输出 ============ */
console.log(`\n星球首次引导判定：${pass} 通过 / ${fail} 失败`)
if (fail) {
  console.log('\n失败明细：')
  failures.forEach((f, i) => console.log(`${i + 1}. ${f}`))
  process.exit(1)
}
console.log('全部通过 ✅')
