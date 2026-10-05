#!/usr/bin/env node
/**
 * 单独用 @vue/compiler-sfc 解析指定 SFC，验证模板/脚本/样式三段结构。
 * 用途：整包 vite build 被他人的坏文件阻塞时，验证「我改的文件」是否结构 OK。
 * 用法: node tools/verify-sfc-parse.mjs admin/src/views/ops/notification.vue ...
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { parse } = require('@vue/compiler-sfc')

const files = process.argv.slice(2)
if (!files.length) {
  console.error('用法: node tools/verify-sfc-parse.mjs <file.vue> [more.vue]')
  process.exit(2)
}

let failed = 0
for (const file of files) {
  const source = readFileSync(file, 'utf8')
  const { descriptor, errors } = parse(source, { filename: file })
  const blocks = []
  if (descriptor.template) blocks.push('template')
  if (descriptor.script || descriptor.scriptSetup) blocks.push('script')
  for (const s of descriptor.styles || []) blocks.push(s.scoped ? 'style(scoped)' : 'style')
  if (errors.length) {
    failed++
    console.log(`FAIL  ${file}`)
    for (const e of errors) console.log(`      ${e.message}`)
  } else {
    console.log(`OK    ${file}  [${blocks.join(' / ')}]`)
  }
}

console.log(`\n通过 ${files.length - failed} · 失败 ${failed}`)
process.exit(failed ? 1 : 0)
