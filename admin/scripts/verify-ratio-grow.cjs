/**
 * 实测 parseRatioGrow：从真实 schema.ts 提取函数体后执行，
 * 校验 5 种 GRID_RATIO_PRESETS 比例串 → flex-grow 数组
 */
const fs = require('fs')
const path = require('path')

const SCHEMA = path.resolve(
  __dirname,
  '../src/components/page-builder/layout/layout-flexible-grid/schema.ts',
)
const TOKENS = path.resolve(__dirname, '../src/components/page-builder/shared/warm-tokens.ts')

const schemaSrc = fs.readFileSync(SCHEMA, 'utf8')

// 抠出 parseRatioGrow 与 normalizeAlign 的函数体，并剥掉 TS 语法
function extractFn(name) {
  const start = schemaSrc.indexOf(`export function ${name}(`)
  if (start < 0) throw new Error(`未在 schema.ts 中找到 ${name}`)
  let i = schemaSrc.indexOf('{', start)
  let depth = 0
  for (let j = i; j < schemaSrc.length; j++) {
    if (schemaSrc[j] === '{') depth++
    else if (schemaSrc[j] === '}') {
      depth--
      if (depth === 0) {
        return schemaSrc
          .slice(start, j + 1)
          .replace(/^export\s+/, '')
          .replace(/:\s*unknown/g, '')
          .replace(/:\s*number\[\]/g, '')
          .replace(/:\s*LayoutGridAlign/g, '')
          .replace(/\s+as\s+[A-Za-z_][\w.[\]<>]*/g, '')
      }
    }
  }
  throw new Error(`${name} 函数体提取失败`)
}

// GRID_RATIO_PRESETS 直接从 warm-tokens.ts 读取，保证测的是同一份真源
const tokensSrc = fs.readFileSync(TOKENS, 'utf8')
const presetMatch = tokensSrc.match(
  /export const GRID_RATIO_PRESETS\s*=\s*\[([\s\S]*?)\]\s*as const/,
)
if (!presetMatch) throw new Error('未在 warm-tokens.ts 中找到 GRID_RATIO_PRESETS')
const GRID_RATIO_PRESETS = eval(`[${presetMatch[1]}]`)

const factory = new Function(
  'GRID_RATIO_PRESETS',
  'ALIGN_VALUES',
  `${extractFn('parseRatioGrow')}\n${extractFn('normalizeAlign')}\nreturn { parseRatioGrow, normalizeAlign }`,
)(GRID_RATIO_PRESETS, ['stretch', 'center', 'start'])

const { parseRatioGrow, normalizeAlign } = factory

console.log('GRID_RATIO_PRESETS 预设：', GRID_RATIO_PRESETS.map((x) => x.value).join('  '))
console.log('')

const expected = {
  '1:1': [1, 1],
  '1:2': [1, 2],
  '2:1': [2, 1],
  '2:1:1': [2, 1, 1],
  '1:1:1': [1, 1, 1],
}

let pass = 0
let fail = 0

for (const preset of GRID_RATIO_PRESETS) {
  const got = parseRatioGrow(preset.value)
  const want = expected[preset.value]
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ratio="${preset.value}"`.padEnd(28) +
      `=> [${got.join(', ')}]`.padEnd(24) +
      `期望 [${want.join(', ')}]  (${preset.label})`,
  )
}

// 边界：非法输入必须退回 1:1
console.log('')
const edge = [
  ['2:5', [1, 1]],
  ['', [1, 1]],
  [undefined, [1, 1]],
  ['abc', [1, 1]],
  ['1:0:3', [1, 1]],
]
for (const [input, want] of edge) {
  const got = parseRatioGrow(input)
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  边界 ratio=${JSON.stringify(input)}`.padEnd(34) +
      `=> [${got.join(', ')}]  期望 [${want.join(', ')}]`,
  )
}

console.log('')
console.log('alignItems 收敛：')
for (const [input, want] of [
  ['stretch', 'stretch'],
  ['center', 'center'],
  ['start', 'start'],
  ['flex-end', 'stretch'],
  ['', 'stretch'],
]) {
  const got = normalizeAlign(input)
  const ok = got === want
  ok ? pass++ : fail++
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  "${input}" => "${got}"  期望 "${want}"`)
}

console.log('')
console.log(`合计：${pass} 通过，${fail} 失败`)
process.exit(fail === 0 ? 0 : 1)
