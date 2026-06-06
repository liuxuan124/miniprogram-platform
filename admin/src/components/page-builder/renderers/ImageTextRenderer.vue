<template>
  <div class="render-image-text" :class="`layout-${component.props.layout || 'left-image'}`">
    <div class="image-box">{{ component.props.image ? '🖼️' : '📷' }}</div>
    <div class="text-box">
      <div class="title">{{ component.props.title || '图文组合' }}</div>
      <div class="desc">{{ component.props.content || '请输入图文说明' }}</div>
    </div>
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
.render-image-text {
  display: grid;
  grid-template-columns: 86px 1fr;
  gap: 8px;
  margin: 10px;
  padding: 10px;
  background: #fff;
  border: 1px solid #e6edf6;
  border-radius: 10px;

  &.layout-top-image {
    grid-template-columns: 1fr;
  }

  &.layout-three-card {
    grid-template-columns: repeat(3, 1fr);
  }

  .image-box {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 70px;
    font-size: 24px;
    background: #f1f5fb;
    border-radius: 8px;
  }

  .text-box {
    .title {
      color: #1e293b;
      font-size: 13px;
      font-weight: 700;
    }

    .desc {
      margin-top: 4px;
      color: #64748b;
      font-size: 11px;
      line-height: 1.6;
    }
  }
}
</style>
