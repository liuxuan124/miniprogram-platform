/*
 * 用户列表「重复账号排查模式」筛选状态机测试
 *
 * 背景：顶部提示条显示「3 组重复账号待合并」，点【查看重复】界面完全无变化。
 *       真因不是「筛选条件冲突」，而是 loadDups() 只重新拉一次统计并把同一句
 *       提示文案写回 dupHint，从不碰 users / 筛选器 / 路由 —— 按钮压根没接筛选逻辑。
 *       修法：URL 的 dup=1 作为唯一真源，进入模式前强制清空互斥筛选。
 *
 * 本测试锁三件事：
 *   1. 纯函数 resetFiltersFor 确实把 role/source/pay/keyword 全清（改坏一处就红）
 *   2. enterDupMode 里「清筛选」在「push 路由」之前（顺序反了必然空集）
 *   3. 重复点击不再静默：走 fetchUsers + 提示，而不是重复 push 相同 query
 *
 * 运行：node scripts/qa/test-member-dup-mode.js
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '../..')
const VUE = path.join(ROOT, 'admin/src/views/member-ops/users.vue')
const DTO = path.join(
  ROOT,
  'backend/src/main/java/com/miniprogram/dto/MiniProgramUserQueryDTO.java',
)
const VO = path.join(
  ROOT,
  'backend/src/main/java/com/miniprogram/dto/MiniProgramUserVO.java',
)
const WRAPPER = path.join(
  ROOT,
  'backend/src/main/java/com/miniprogram/service/impl/MiniProgramUserServiceImpl.java',
)

let pass = 0
let fail = 0
const failures = []

function check(name, cond, detail) {
  if (cond) {
    pass++
    console.log(`  ✓ ${name}`)
  } else {
    fail++
    failures.push(`${name}${detail ? ' → ' + detail : ''}`)
    console.log(`  ✗ ${name}${detail ? ' → ' + detail : ''}`)
  }
}

/**
 * 抽一段函数源码：从 signature 起，到函数体配平的 `}` 止（含形参列表）。
 *
 * 注意 bodyStart 的取法：不能直接用「signature 后的第一个 `{`」——
 * 目标文件是 TS，形参 `state: {...}` 这种类型注解自带花括号，
 * 会在注解处就判定配平、抽出一段残缺源码。必须先扫过闭合的 `)` 再找 `{`。
 */
function extractFunctionSource(source, signature) {
  const start = source.indexOf(signature)
  if (start < 0) throw new Error(`未找到：${signature}`)
  // 跳过形参列表（含类型注解里的括号），扫描到深度归零的 ')'
  // 起点要退回 1：signature 末尾已含左括号，从它开始计 paren 才归得到 0
  let scan = start + signature.length - 1
  let paren = 0
  let paramEnd = -1
  while (scan < source.length) {
    const c = source[scan]
    if (c === '(') paren++
    else if (c === ')') {
      paren--
      if (paren === 0) {
        paramEnd = scan
        break
      }
    }
    scan++
  }
  if (paramEnd < 0) throw new Error(`未找到形参列表结束：${signature}`)
  const bodyStart = source.indexOf('{', paramEnd)
  if (bodyStart < 0) throw new Error(`未找到函数体起点：${signature}`)
  let depth = 0
  let i = bodyStart
  let quote = ''
  let lineComment = false
  let blockComment = false
  while (i < source.length) {
    const ch = source[i]
    const next = source[i + 1]
    if (lineComment) {
      if (ch === '\n') lineComment = false
    } else if (blockComment) {
      if (ch === '*' && next === '/') {
        blockComment = false
        i++
      }
    } else if (quote) {
      if (ch === '\\') i++
      else if (ch === quote) quote = ''
    } else if (ch === '/' && next === '/') {
      lineComment = true
      i++
    } else if (ch === '/' && next === '*') {
      blockComment = true
      i++
    } else if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch
    } else if (ch === '{') {
      depth++
    } else if (ch === '}') {
      depth--
      if (depth === 0) return source.slice(start, i + 1)
    }
    i++
  }
  throw new Error(`函数体未配平：${signature}`)
}

// ── 1. 纯函数：重置互斥筛选 ────────────────────────────────────────
console.log('\n[1] resetFiltersFor —— 纯函数重置互斥筛选')
const vueSrc = fs.readFileSync(VUE, 'utf8')
const voSrc = fs.readFileSync(VO, 'utf8')
const resetSrc = extractFunctionSource(vueSrc, 'function resetFiltersFor(')
// users.vue 是 TS，裸 new Function 求值会挂在类型标注上，须先用 esbuild 剥掉。
// esbuild 只装在 admin/node_modules（仓库既有做法，见 test-warm-authors-priority.js）。
const esbuild = require(path.join(ROOT, 'admin/node_modules/esbuild'))
const stripped = esbuild.transformSync(resetSrc, { loader: 'ts' }).code
// 声明不是表达式，尾部补 return 才能求值
const resetFiltersFor = new Function(
  `${stripped}\nreturn resetFiltersFor`,
)()

const freshState = () => ({
  keyword: '1380000',
  payFilter: 'paid',
  accountFilter: 'test',
  roleFilterId: 7,
  selectedIds: [1, 2, 3],
})
const s1 = freshState()
resetFiltersFor(s1)
check('keyword 清空', s1.keyword === '', `实际 "${s1.keyword}"`)
check('payFilter 归位 all', s1.payFilter === 'all', `实际 "${s1.payFilter}"`)
check('accountFilter 归位空', s1.accountFilter === '', `实际 "${s1.accountFilter}"`)
check('roleFilterId 归位 null', s1.roleFilterId === null, `实际 ${s1.roleFilterId}`)
check('selectedIds 清空', Array.isArray(s1.selectedIds) && s1.selectedIds.length === 0)

// 已是最干净状态时不应抛错（幂等）
const s2 = { keyword: '', payFilter: 'all', accountFilter: '', roleFilterId: null, selectedIds: [] }
let idemOk = true
try {
  resetFiltersFor(s2)
} catch (e) {
  idemOk = false
}
check('对已清空状态幂等不抛错', idemOk)

// ── 2. enterDupMode 的顺序：先清筛选，后改路由 ──────────────────────
console.log('\n[2] enterDupMode —— 清筛选必须早于 push 路由')
const enterSrc = extractFunctionSource(vueSrc, 'async function enterDupMode(')
// enterDupMode 调的是包装函数 resetFilters()（内部再调纯函数 resetFiltersFor），
// 这里断言调用点即可 —— 顺序约束落在「重置动作」与「改路由」的先后上。
const resetIdx = enterSrc.search(/resetFilters(?:For)?\(/)
const pushIdx = enterSrc.indexOf('router.push(')
check('enterDupMode 内调用了重置筛选', resetIdx >= 0)
check('enterDupMode 内有 router.push', pushIdx >= 0)
check(
  '重置筛选出现在 router.push 之前（顺序反了必然空集）',
  resetIdx >= 0 && pushIdx >= 0 && resetIdx < pushIdx,
  `reset@${resetIdx} push@${pushIdx}`,
)
// 顺序反了是这个 bug 的直接成因，单独再钉一条：三处入口都不能漏
const dupEntryPoints = [
  ['enterDupMode', enterSrc],
  ['watch(dupMode)', extractFunctionSource(vueSrc, 'watch(dupMode,')],
  ['onMounted', extractFunctionSource(vueSrc, 'onMounted(async () =>')],
]
for (const [label, src] of dupEntryPoints) {
  check(`${label} 进入重复模式时都会重置筛选`, /resetFilters(?:For)?\(/.test(src))
}
check('push 时写入 dup=1', /dup:\s*'1'/.test(enterSrc))
check(
  '重复点击分支不重复 push（改为刷新 + 反馈）',
  /already|已刷新重复账号列表/.test(enterSrc) && /fetchUsers\(\)/.test(enterSrc),
)

const exitSrc = extractFunctionSource(vueSrc, 'async function exitDupMode(')
check('exitDupMode 删除 dup 参数', /delete\s+next\.dup/.test(exitSrc))
check('exitDupMode 不 push 空 query', !/push\(\{\s*query:\s*\{\s*\}\s*\}\)/.test(exitSrc))

// ── 3. dup 模式是路由派生的，不是独立 ref ────────────────────────────
console.log('\n[3] 状态真源 —— dupMode 由 route.query 派生')
check(
  'dupMode 是 computed 且读 route.query.dup',
  /const dupMode = computed\(\(\) => route\.query\.dup === '1'\)/.test(vueSrc),
)
check('存在 watch(dupMode) 驱动重新拉取', /watch\(dupMode,/.test(vueSrc))
check(
  'fetchUsers 传了 duplicateOnly',
  /duplicateOnly:\s*dupMode\.value\s*\?\s*true\s*:\s*undefined/.test(vueSrc),
)
check(
  'fetchUsers 传了 roleTagId（角色筛选已下推）',
  /roleTagId:\s*roleFilterId\.value\s*\?\?\s*undefined/.test(vueSrc),
)
check(
  '本地角色过滤已删除（否则表格空但 total 是全量）',
  !/rows\s*=\s*rows\.filter\(/.test(vueSrc) && !vueSrc.includes('function roleNameOf('),
)
// 语义断言：抓 planName 的整条赋值行，看有没有拿 levelName（成长等级）兜底。
// 不能写死匹配某一版历史写法（`|| r.memberLevel || r.levelName`）——
// 那样换个变体（如 `|| r.levelName`）就会静默溜过去，检查器自身失效。
const planNameLine = (vueSrc.match(/^\s*planName:.*$/m) || [''])[0]
check(
  'planName 不回退到 levelName（否则成长等级被当付费档显示）',
  planNameLine.includes('planName') && !planNameLine.includes('levelName'),
  `实际：${planNameLine.trim() || '未找到 planName 赋值'}`,
)
check('后端 VO 补了 planName 字段', /private String planName;/.test(voSrc))
check('激活态用 dup-on 提示条', /class="hint dup-on"/.test(vueSrc))
check('提供退出按钮', /@click="exitDupMode"/.test(vueSrc))

// ── 4. 后端筛选条件真的落到 SQL ────────────────────────────────────
console.log('\n[4] 后端 —— 三个筛选参数落到 buildListWrapper')
const dtoSrc = fs.readFileSync(DTO, 'utf8')
const wrapperSrc = fs.readFileSync(WRAPPER, 'utf8')

for (const [field, desc] of [
  ['payStatus', '付费会员状态'],
  ['roleTagId', '角色标签'],
  ['duplicateOnly', '只看重复'],
]) {
  check(`DTO 声明了 ${field}（${desc}）`, new RegExp(`private\\s+\\w+\\s+${field};`).test(dtoSrc))
}
check(
  'payStatus 用 EXISTS 查 mp_member_subscription（真源，不是 member_expire_at 镜像）',
  /scope\s*=\s*'platform'/.test(wrapperSrc) && /wrapper\.exists\(activePlatformSub\)/.test(wrapperSrc),
)
check('payStatus=none 走 notExists', /wrapper\.notExists\(activePlatformSub\)/.test(wrapperSrc))
check(
  'roleTagId 下推到 mp_user_member_tag',
  /exists\("SELECT 1 FROM mp_user_member_tag t/.test(wrapperSrc),
)
check(
  'duplicateOnly 用 inSql + GROUP BY HAVING COUNT\\(\\*\\) > 1',
  /inSql\(MiniProgramUser::getPhone/.test(wrapperSrc) &&
    /HAVING COUNT\(\*\) > 1/.test(wrapperSrc),
)
check(
  '重复子查询显式带 deleted = 0（@TableLogic 不作用于裸 SQL）',
  /SELECT phone FROM mp_user WHERE deleted = 0/.test(wrapperSrc),
)

// ── 汇总 ──────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(52)}`)
console.log(`通过 ${pass} · 失败 ${fail}`)
if (fail) {
  console.log('\n失败项：')
  failures.forEach((f) => console.log(`  · ${f}`))
  process.exit(1)
}
console.log('重复账号模式筛选状态机：全部通过')
