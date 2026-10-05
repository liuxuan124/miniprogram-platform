// ColorPickerField 的 HEX 归一化纯函数单测
// 用法：node scripts/qa/test-color-field.mjs <项目根>
//
// ⚠️ 两个必须记住的坑（写这个脚本时踩过）：
//  ① toHex 是 TS（带 `: string` 标注），必须先用 esbuild 转译再喂 vm，
//     否则报 `Unexpected token ':'`。esbuild 在 admin/node_modules 下（仓库根没装）。
//  ② 用「写临时 .mjs + 动态 import」而不是 vm.runInContext：
//     vm 里 IIFE 的 return拿不到（转译结果是函数声明，非表达式）。
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const ROOT = path.resolve(process.argv[2] || '.')
const SRC = path.join(ROOT, 'admin/src/components/page-builder/ColorPickerField.vue')

let pass = 0
let fail = 0
function eq(actual, expected, name) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a === e) {
    pass++
  } else {
    fail++
    console.log('  FAIL ' + name)
    console.log('       期望 ' + e)
    console.log('       实际 ' + a)
  }
}

let src = fs.readFileSync(SRC, 'utf8')
// 剥注释，避免注释里的花括号/关键字干扰函数体提取
src = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const start = src.indexOf('function toHex')
if (start < 0) {
  console.error('未找到 toHex')
  process.exit(1)
}
// 花括号配平，抽出完整函数体
let body = ''
let depth = 0
for (let j = src.indexOf('{', start); j < src.length; j++) {
  if (src[j] === '{') depth++
  else if (src[j] === '}') {
    depth--
    if (depth === 0) {
      body = src.slice(start, j + 1)
      break
    }
  }
}
if (!body) {
  console.error('toHex 提取失败')
  process.exit(1)
}

const esbuild = createRequire(import.meta.url)(
  path.join(ROOT, 'admin/node_modules/esbuild')
)
// 写到临时 .mjs 再动态 import —— 避免 vm 的返回值/作用域坑。
// ⚠️ esbuild 转译 TS→JS 时会自动加 type=module 语义，用 .mjs 后缀最稳。
const js = esbuild.transformSync(body, { loader: 'ts', format: 'esm' }).code.trim()
const tmp = path.join(path.dirname(SRC), '__color_field_tohex.mjs')
fs.writeFileSync(tmp, js + '\nexport { toHex };\n', 'utf8')
let toHex
try {
  ;({ toHex } = await import('file://' + tmp))
} finally {
  fs.unlinkSync(tmp)
}

if (typeof toHex !== 'function') {
  console.error('转译后 toHex 不是函数，实际是：' + typeof toHex)
  process.exit(1)
}

console.log('== 合法输入 ==')
eq(toHex('#C08E6E'), '#c08e6e', '大写带# 转小写')
eq(toHex('c08e6e'), '#c08e6e', '无# 自动补')
eq(toHex('  #C08E6E  '), '#c08e6e', '首尾空格容忍')
eq(toHex('#FFF'), '#ffffff', '三位缩写展开')
eq(toHex('fff'), '#ffffff', '三位缩写无#')
eq(toHex('rgb(192, 142, 110)'), '#c08e6e', 'rgb 解析')
eq(toHex('rgba(192,142,110,0.5)'), '#c08e6e', 'rgba 忽略 alpha')
eq(toHex('rgb(0,0,0)'), '#000000', 'rgb 下边界')
eq(toHex('rgb(255,255,255)'), '#ffffff', 'rgb 上边界')

console.log('== 非法输入必须返回 null ==')
eq(toHex(''), null, '空串')
eq(toHex('   '), null, '纯空格')
eq(toHex('#'), null, '只有#')
eq(toHex('#12345'), null, '5 位 hex')
eq(toHex('#1234567'), null, '7 位 hex')
eq(toHex('#gggggg'), null, '非 hex 字符')
eq(toHex('rgb(300,0,0)'), null, 'rgb 超范围')
eq(toHex('rgb(a,b,c)'), null, 'rgb 非数字')
eq(toHex('rgb(1,2)'), null, 'rgb 参数不足')
eq(toHex('hsl(0,0%,0%)'), null, 'hsl 不支持')
eq(toHex('url(#fff)'), null, 'css 注入')
eq(toHex(null), null, 'null')
eq(toHex(undefined), null, 'undefined')

console.log('')
console.log((fail === 0 ? 'PASS' : 'FAIL') + ' ' + pass + ' 通过 / ' + fail + ' 失败')
process.exit(fail === 0 ? 0 : 1)
