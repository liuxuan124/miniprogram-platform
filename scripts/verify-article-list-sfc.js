/**
 * 只编译本轮改动的 SFC，确认语法/结构无误。
 *
 * 为什么不跑全量 vite build：PropsPanel.vue 正被**并行会话**大改中
 * （+1341 行，template 暂时不配平，vite build 报 Invalid end tag）。
 * 那是别人的在途改动，不该由本轮去"修"，也不能拿它当本轮的验证结论。
 */
const fs = require('node:fs')
const path = require('node:path')
const { parse, compileTemplate, compileScript } = require('/Users/lx/项目文件/liuxuan/小程序搭建运营系统/admin/node_modules/@vue/compiler-sfc')

const ROOT = '/Users/lx/项目文件/liuxuan/小程序搭建运营系统/admin'
const files = [
  'src/components/page-builder/props/ArticleListProps.vue',
  'src/components/page-builder/props/ArticleListStyleProps.vue',
  'src/components/page-builder/props/NumSliderRow.vue',
  'src/components/page-builder/renderers/ArticleListRenderer.vue',
  'src/components/page-builder/articleFeed/ArticleLayoutPicker.vue',
  'src/components/page-builder/articleFeed/ArticleLayoutThumb.vue',
]

let fail = 0
for (const f of files) {
  const filename = path.join(ROOT, f)
  const source = fs.readFileSync(filename, 'utf8')
  try {
    const { descriptor, errors } = parse(source, { filename })
    if (errors.length) throw new Error(errors[0].message)
    const id = f
    if (descriptor.script || descriptor.scriptSetup) {
      compileScript(descriptor, { id })
    }
    if (descriptor.template) {
      const r = compileTemplate({
        source: descriptor.template.content,
        filename,
        id,
      })
      if (r.errors.length) throw new Error(String(r.errors[0]))
    }
    console.log(`✅ ${f}`)
  } catch (e) {
    fail++
    console.log(`❌ ${f} — ${e.message}`)
  }
}
console.log(`\nSFC 编译：${files.length - fail}/${files.length} 通过`)
process.exit(fail ? 1 : 0)