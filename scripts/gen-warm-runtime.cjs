#!/usr/bin/env node
/**
 * 由 editor.vue 生成 runtime.vue
 * 严格 4 处差异：
 *   1. defineProps 删除 previewMode?: boolean
 *   2. editorMode: computed(() => !props.previewMode) -> computed(() => false)
 *   3. 模板删除 :class="{ 'wk-guard': editing }"
 *   4. 模板删除 @click="guard($event)"
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '../admin/src/components/page-builder/content')

const TARGETS = ['content-faq-accordion', 'content-mini-audio', 'content-milestone-tracker']

function gen(dir) {
  const src = path.join(ROOT, dir, 'editor.vue')
  const out = path.join(ROOT, dir, 'runtime.vue')
  if (!fs.existsSync(src)) {
    console.log(`skip ${dir}: editor.vue 不存在`)
    return
  }
  const before = fs.readFileSync(src, 'utf8')

  const edits = [
    [`  component: ComponentInstance\n  previewMode?: boolean\n}>()`, `  component: ComponentInstance\n}>()`],
    [`    :class="{ 'wk-guard': editing }"\n`, ``],
    [`\n    @click="guard($event)"`, ``],
    [`editorMode: computed(() => !props.previewMode),`, `editorMode: computed(() => false),`],
  ]

  let after = before
  for (const [from, to] of edits) {
    if (!after.includes(from)) {
      throw new Error(`${dir}: 未找到待替换片段 -> ${JSON.stringify(from)}`)
    }
    after = after.replace(from, to)
  }

  fs.writeFileSync(out, after, 'utf8')
  console.log(`生成 ${dir}/runtime.vue`)
}

TARGETS.forEach(gen)
