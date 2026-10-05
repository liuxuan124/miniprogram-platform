/**
 * SFC 标签结构体检（常驻门禁）。
 *
 * 🔴 为什么需要它：`vue-tsc` 对**模板标签闭合**几乎不敏感 ——
 * 多一个 `</div>` / 少一个 `</template>`，tsc 常常全绿，
 * 只有 `vite build` 才报 "Invalid end tag"，而 build 的报错只给行号不给原因。
 * 本脚本用 @vue/compiler-sfc 的 parse 直接定位到具体行与具体原因。
 *
 * 用法：node scripts/qa/check-sfc-structure.mjs [文件...]
 *        不传文件则检查本次 git 改动里所有 .vue
 */
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import path from 'node:path'
import { parse } from '@vue/compiler-sfc'

const files = process.argv.slice(2)
let list = files
if (!list.length) {
  try {
    const out = execSync('git diff --name-only -- "*.vue" && git diff --cached --name-only -- "*.vue"', {
      encoding: 'utf8',
    })
    list = [...new Set(out.split('\n').map((s) => s.trim()).filter(Boolean))]
  } catch {
    list = []
  }
}

let bad = 0
for (const f of list) {
  let src = ''
  try {
    src = readFileSync(f, 'utf8')
  } catch {
    continue
  }
  const { descriptor, errors } = parse(src, { filename: f })
  const problems = [...errors]

  // parse 通过后再补一条「根节点存在性」检查：
  // 误删根 <div> 时 parse 有时仍不报错，但后续所有样式选择器都失效（静默）
  const tpl = descriptor.template?.content || ''
  if (tpl && !/^\s*<[a-zA-Z]/.test(tpl)) {
    problems.push({ message: '模板根节点缺失（可能被误删）', loc: { line: 1 } })
  }

  if (problems.length) {
    bad += 1
    console.log(`✗ ${f}`)
    for (const p of problems) {
      console.log(`   L${p.loc?.start?.line ?? '?'}: ${p.message}`)
    }
  } else {
    console.log(`✓ ${f}`)
  }
}

console.log(bad ? `\n${bad} 个文件结构有问题` : `\n全部 ${list.length} 个 SFC 结构通过 ✅`)
process.exit(bad ? 1 : 0)