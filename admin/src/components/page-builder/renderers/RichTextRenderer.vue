<template>
  <div class="render-rich-text" :style="richTextStyle" v-html="richTextHtml"></div>
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
  const color = String(props.component.props?.text_color || '#303133')
  return {
    color,
  }
})
</script>

<style lang="scss" scoped>
.render-rich-text {
  font-size: 13px;
  line-height: 1.6;
  color: #303133;
  word-break: break-all;
}
</style>
