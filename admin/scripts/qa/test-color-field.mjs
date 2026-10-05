// ColorPickerField 的 HEX 归一化纯函数单测
// 用法：node scripts/qa/test-color-field.mjs
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'

const ROOT = path.resolve(process.argv[2] || '../..')
const SRC = path.join(ROOT, 'src/components/page-builder/ColorPickerField.vue')

let pass = 0
let fail = 0
function eq(actual, expected, name) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a === e) {
    pass++
  } else {
    fail++
    console.log(`  ❌ ${name}\n     期望 ${e}\n     实际 ${a}`)
  }
}

// 从 SFC 里抽出 toHex 函数体（必须剥注释）
let src = fs.readFileSync(SRC, 'utf8')
src = src.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')

const start = src.indexOf('function toHex')
if (start < 0) {
  console.error('❌ 未在 ColorPickerField.vue 中找到 toHex')
  process.exit(1)
}
// 花括号配平抽函数
let i = src.indexOf('{', start)
let depth = 0
let body = ''
for (let j = i; j < src.length; j++) {
  if (src[j] === '{') depth++
  if (src[j] === '}') {
    depth--
    if (depth === 0) {
      body = src.slice(start, j + 1)
      break
    }
  }
}
if (!body) {
  console.error('❌ toHex 函数体提取失败')
  process.exit(1)
}

const ctx = {}
vm.createContext(ctx)
vm.runInContext(`${body}\nthis.toHex = toHex;`, ctx)
const toHex = ctx.toHex

console.log('== 合法输入 ==')
eq(toHex('#C08E6E'), '#c08e6e', '大写带# → 小写')
eq(toHex('c08e6e'), '#c08e6e', '无# 补上')
eq(toHex('  #C08E6E  '), '#c08e6e', '首尾空格容忍')
eq(toHex('#FFF'), '#ffffff', '三位缩写展开')
eq(toHex('fff'), '#ffffff', '三位缩写无#')
eq(toHex('rgb(192, 142, 110)'), '#c08e6e', 'rgb() 解析')
eq(toHex('rgba(192,142,110,0.5)'), '#c08e6e', 'rgba() 忽略 alpha')
eq(toHex('rgb(0,0,0)'), '#000000', 'rgb 边界 0')
eq(toHex('rgb(255,255,255)'), '#ffffff', 'rgb 边界 255')

console.log('== 非法输入必须返回 null（不能崩、不能返回脏值）==')
eq(toHex(''), null, '空串')
eq(toHex('   '), null, '纯空格')
eq(toHex('#'), null, '只有#')
eq(toHex('#12345'), null, '5 位hex')
eq(toHex('#1234567'), null, '7 位 hex')
eq(toHex('#gggggg'), null, '非 hex 字符')
eq(toHex('rgb(300,0,0)'), null, 'rgb 超范围')
eq(toHex('rgb(a,b,c)'), null, 'rgb 非数字')
eq(toHex('rgb(1,2)'), null, 'rgb 参数不足')
eq(toHex('hsl(0,0%,0%)'), null, '不支持 hsl → null')
eq(toHex('url(#fff)'), null, 'css 注入样式→ null')
eq(toHex(null), null, 'null')
eq(toHex(undefined), null, 'undefined')

console.log(`\n${fail === 0 ? '✅' : '❌'} ${pass} 通过 / ${fail} 失败`)
process.exit(fail === 0 ? 0 : 1)
