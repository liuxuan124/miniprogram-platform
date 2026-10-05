/**
 * 交付校验：用项目内 @vue/compiler-sfc 对 8 个 .vue 跑 compileScript + compileTemplate
 * 要求 errors 全部为 0
 */
const fs = require('fs')
const path = require('path')
const sfc = require('@vue/compiler-sfc')

const ROOT = path.resolve(__dirname, '../src/components/page-builder/layout')
const DIRS = [
  'layout-overlap-wrapper',
  'layout-paper-sheet',
  'layout-sticky-wrapper',
  'layout-flexible-grid',
]

let totalErrors = 0

for (const dir of DIRS) {
  for (const file of ['editor.vue', 'runtime.vue']) {
    const filePath = path.join(ROOT, dir, file)
    const source = fs.readFileSync(filePath, 'utf8')
    const id = `${dir}/${file}`
    const { descriptor, errors: parseErrors } = sfc.parse(source, { filename: filePath })

    const errs = [...parseErrors]

    if (descriptor.script || descriptor.scriptSetup) {
      try {
        sfc.compileScript(descriptor, { id })
      } catch (e) {
        errs.push(e)
      }
    }

    if (descriptor.template) {
      const res = sfc.compileTemplate({
        source: descriptor.template.content,
        filename: filePath,
        id,
      })
      errs.push(...res.errors)
    }

    const label = `${id.padEnd(46)}`
    if (errs.length === 0) {
      console.log(`[PASS] ${label} errors = 0`)
    } else {
      totalErrors += errs.length
      console.log(`[FAIL] ${label} errors = ${errs.length}`)
      errs.forEach((e) => console.log('       ' + (e.message || String(e))))
    }
  }
}

console.log('\n结论：' + (totalErrors === 0 ? '8 个 .vue 全部 errors = 0' : `累计 ${totalErrors} 个错误`))
process.exit(totalErrors === 0 ? 0 : 1)
