<template>
  <div class="render-rich-text split-text-typography" :style="richTextStyle" v-html="richTextHtml"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ComponentInstance } from '@/types/page'

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

defineEmits<{
  'preview-action': [payload: { tab: string; message: string; detailType?: string; detailTitle?: string; detailDesc?: string }]
}>()

const richTextHtml = computed(() => {
  const content = String(props.component.props?.content || '').trim()
  if (!content) return '<p style="color:#9ca3af">请输入富文本内容</p>'
  return content
})

const richTextStyle = computed<Record<string, string>>(() => {
  const style: Record<string, string> = {}
  const color = props.component.props?.text_color
  if (color) style.color = String(color)
  const bg = props.component.props?.background_color || props.component.style?.background_color
  if (bg) style.backgroundColor = String(bg)
  return style
})
</script>

<style lang="scss" scoped>
.render-rich-text {
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.7;
  color: #303133;
  word-break: break-word;
  background: #fff;

  :deep(h1) {
    margin: 0.4em 0;
    font-size: 22px;
    font-weight: 800;
  }

  :deep(h2) {
    margin: 0.4em 0;
    font-size: 18px;
    font-weight: 700;
  }

  :deep(h3) {
    margin: 0.35em 0;
    font-size: 15px;
    font-weight: 700;
  }

  :deep(p) {
    margin: 0.35em 0;
  }

  :deep(ul),
  :deep(ol) {
    margin: 0.35em 0;
    padding-left: 1.4em;
  }

  :deep(a) {
    color: #1769ff;
  }

  :deep(img) {
    max-width: 100%;
    height: auto;
    border-radius: 6px;
  }

  :deep(blockquote) {
    margin: 0.5em 0;
    padding: 6px 10px;
    color: #64748b;
    background: #f8fafc;
    border-left: 3px solid #cbd5e1;
  }
}
</style>
