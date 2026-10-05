/**
 * 交付校验：defaultProps 必须给完整 mock 假数据，不允许空字符串 / undefined / null 占位
 * 用 TypeScript transpileModule 正确剥离类型（不做脆弱的正则替换）
 */
const ts = require('typescript')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '../src/components/page-builder/layout')
const DIRS = [
  'layout-overlap-wrapper',
  'layout-paper-sheet',
  'layout-sticky-wrapper',
  'layout-flexible-grid',
]

const WARM = {
  paper: '#FDF6EC',
  paperTop: '#FFFDF9',
  brick: '#C2410C',
  clay: '#B45309',
  line: '#ECD9C4',
  card: '#FFFAF3',
}
const WARM_RADIUS = { sm: '6px', md: '10px', lg: '14px', xl: '20px' }
const OVERLAP_PRESETS = [
  { value: 0, label: '不重叠' },
  { value: 20, label: '轻微 20px' },
  { value: 30, label: '适中 30px' },
  { value: 40, label: '明显 40px' },
]
const GRID_RATIO_PRESETS = [
  { value: '1:1', label: '等分 1:1' },
  { value: '1:2', label: '左窄右宽 1:2' },
  { value: '2:1', label: '左宽右窄 2:1' },
  { value: '2:1:1', label: '三栏 2:1:1' },
  { value: '1:1:1', label: '三栏等分 1:1:1' },
]

let bad = 0

for (const dir of DIRS) {
  const file = path.join(ROOT, dir, 'schema.ts')
  const raw = fs.readFileSync(file, 'utf8')

  // 收集需要调用的导出名（defaultProps 可能是 const 箭头函数或 function 声明）
  // 注意源码里是 DefaultProps / Validate（大写开头），故用小写比较
  const lower = (s) => s.toLowerCase()
  const names = [
    ...new Set(
      [...raw.matchAll(/export (?:const|function) (\w+)/g)]
        .map((m) => m[1])
        .filter((n) => lower(n).endsWith('defaultprops') || lower(n).endsWith('validate')),
    ),
  ]

  // 剥掉 import 语句后交给 TS 转译（import 已在下面用参数注入）
  const noImports = raw.replace(/^import[\s\S]*?from\s+'[^']*'$/gm, '')
  const js = ts.transpileModule(noImports, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
    },
  }).outputText

  // 转译产物是 CommonJS，会往参数 exports 上挂属性；用同一个对象接收
  const exp = {}
  new Function(
    'WARM_TOKENS',
    'WARM_RADIUS',
    'OVERLAP_PRESETS',
    'GRID_RATIO_PRESETS',
    'exports',
    js,
  )(WARM, WARM_RADIUS, OVERLAP_PRESETS, GRID_RATIO_PRESETS, exp)
  const api = exp

  const dpName = names.find((n) => lower(n).endsWith('defaultprops'))
  const vName = names.find((n) => lower(n).endsWith('validate'))
  const defaults = api[dpName]()

  const problems = []
  for (const [k, val] of Object.entries(defaults)) {
    if (val === '' || val === undefined || val === null) problems.push(k + '=' + JSON.stringify(val))
  }
  if (Object.keys(defaults).length === 0) problems.push('defaultProps 为空对象')

  const warnings = vName ? api[vName](defaults) : []

  if (problems.length === 0) {
    console.log('[PASS] ' + dir.padEnd(23) + ' defaultProps ' + Object.keys(defaults).length + ' 项均有值')
  } else {
    bad += problems.length
    console.log('[FAIL] ' + dir.padEnd(23) + ' ' + problems.join(', '))
  }
  console.log('       ' + JSON.stringify(defaults))
  console.log('       validate 警告：' + (warnings.length ? warnings.join(' / ') : '无'))
  console.log('')
}

console.log(bad === 0 ? '结论：4 个组件 defaultProps 均无空字符串占位' : '结论：存在 ' + bad + ' 处空值')
process.exit(bad === 0 ? 0 : 1)
