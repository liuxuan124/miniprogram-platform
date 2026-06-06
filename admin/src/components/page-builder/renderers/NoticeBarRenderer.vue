<template>
  <div class="render-notice-bar">
    <span class="notice-label">{{ component.props.title || '公告' }}</span>
    <span class="notice-text">{{ noticeItems[0] || '暂无公告内容' }}</span>
  </div>
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

const noticeItems = computed<string[]>(() => {
  const items = props.component.props?.items
  return Array.isArray(items) ? items : []
})
</script>

<style lang="scss" scoped>
.render-notice-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 10px;
  padding: 8px 10px;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 8px;

  .notice-label {
    flex-shrink: 0;
    color: #c2410c;
    font-size: 11px;
    font-weight: 700;
  }

  .notice-text {
    color: #9a3412;
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
