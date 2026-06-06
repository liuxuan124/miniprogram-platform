<template>
  <div class="render-search">
    <span class="search-icon">🔍</span>
    <span class="search-text">{{ component.props.placeholder || '搜索商品 / 文章 / 活动' }}</span>
  </div>
</template>

<script setup lang="ts">
import type { ComponentInstance } from '@/types/page'

defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

defineEmits<{
  'preview-action': [payload: { tab: string; message: string; detailType?: string; detailTitle?: string; detailDesc?: string }]
}>()
</script>

<style lang="scss" scoped>
.render-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  margin: 10px;
  color: #8a94a6;
  background: #f4f7fb;
  border: 1px solid #e3e8f0;
  border-radius: 10px;

  .search-icon {
    font-size: 14px;
  }

  .search-text {
    font-size: 12px;
  }
}
</style>
