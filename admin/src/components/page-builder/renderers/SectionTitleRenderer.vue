<template>
  <div class="render-section-title">
    <div class="main">{{ component.props.title || '栏目标题' }}</div>
    <div class="sub">{{ component.props.subtitle || '' }}</div>
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
.render-section-title {
  margin: 8px 12px;
  padding-left: 8px;
  border-left: 3px solid #1769ff;

  .main {
    color: #172033;
    font-size: 17px;
    font-weight: 800;
  }

  .sub {
    margin-top: 2px;
    color: #7b8798;
    font-size: 11px;
  }
}
</style>
