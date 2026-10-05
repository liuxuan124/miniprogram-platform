/**
 * 用项目内@vue/compiler-sfc 校验新写的 6 个 .vue
 * 逐个跑 compileScript + compileTemplate + compileStyleAsync，确认 errors = 0
 */
const fs = require('fs')
const path = require('path')
const sfc = require('../admin/node_modules/@vue/compiler-sfc')

const ROOT = path.resolve(
  __dirname,
  '../admin/src/components/page-builder/content',
)

const FILES = [
  'content-faq-accordion/editor.vue',
  'content-faq-accordion/runtime.vue',
  'content-mini-audio/editor.vue',
  'content-mini-audio/runtime.vue',
  'content-milestone-tracker/editor.vue',
  'content-milestone-tracker/runtime.vue',
]

let failed = 0

for (const rel of FILES) {
  const filename = path.join(ROOT, rel)
  const source = fs.readFileSync(filename, 'utf8')
  const id = rel.replace(/[/.]/g, '_')

  const { descriptor, errors: parseErrors } = sfc.parse(source, { filename })
  const errs = [...parseErrors]

  if (descriptor.script || descriptor.scriptSetup) {
    try {
      sfc.compileScript(descriptor, { id, inlineTemplate: false })
    } catch (e) {
      errs.push(e)
    }
  }

  if (descriptor.template) {
    const r = sfc.compileTemplate({
      source: descriptor.template.content,
      filename,
      id,
      scoped: true,
    })
    errs.push(...r.errors)
  }

  if (descriptor.styles.length) {
    for (const style of descriptor.styles) {
      const r = sfc.compileStyleAsync
        ? null
        : sfc.compileStyle({ source: style.content, filename, id, scoped: style.scoped })
      if (r) errs.push(...r.errors)
    }
  }

  if (errs.length) {
    failed++
    console.log(`FAIL ${rel}`)
    errs.forEach((e) => console.log('   ', e.message || e))
  } else {
    console.log(`PASS ${rel}`)
  }
}

console.log(failed === 0 ? '\n全部 6 个 .vue errors = 0' : `\n${failed} 个文件存在错误`)
process.exit(failed === 0 ? 0 : 1)
