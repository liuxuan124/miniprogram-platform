/**
 * 一次性脚本：按交付规范从 editor.vue 生成 runtime.vue
 * 仅做 4 处改动，其余逐字节保持一致：
 *   1. defineProps 删掉 `previewMode?: boolean`
 *   2. `editorMode: computed(() => !props.previewMode)` -> `computed(() => false)`
 *   3. 模板删掉 `:class="{ 'wk-guard': editing }"`
 *   4. 模板删掉 `@click="guard($event)"`
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '../src/components/page-builder/layout')

const DIRS = [
  'layout-overlap-wrapper',
  'layout-paper-sheet',
  'layout-sticky-wrapper',
  'layout-flexible-grid',
]

const REPLACEMENTS = [
  {
    name: '删 previewMode?: boolean',
    from: /^[ \t]*previewMode\?: boolean\r?\n/m,
    to: '',
  },
  {
    name: 'editorMode 恒为 false',
    from: /editorMode: computed\(\(\) => !props\.previewMode\)/,
    to: 'editorMode: computed(() => false)',
  },
  {
    name: '删 wk-guard 绑定',
    from: /^[ \t]*:class="\{ 'wk-guard': editing \}"\r?\n/m,
    to: '',
  },
  {
    name: '删 guard 点击绑定',
    from: /^[ \t]*@click="guard\(\$event\)"\r?\n/m,
    to: '',
  },
]

let failed = false

for (const dir of DIRS) {
  const editorPath = path.join(ROOT, dir, 'editor.vue')
  const runtimePath = path.join(ROOT, dir, 'runtime.vue')
  const src = fs.readFileSync(editorPath, 'utf8')

  const hits = []
  let out = src
  for (const r of REPLACEMENTS) {
    if (!r.from.test(out)) {
      console.error(`[FAIL] ${dir}: 未命中规则「${r.name}」`)
      failed = true
      continue
    }
    out = out.replace(r.from, r.to)
    hits.push(r.name)
  }

  fs.writeFileSync(runtimePath, out, 'utf8')
  console.log(`[OK] ${dir}/runtime.vue  应用 ${hits.length} 处改动`)
}

process.exit(failed ? 1 : 0)
