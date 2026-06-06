<template>
  <div class="render-brand-intro">
    <div class="title">{{ component.props.title || '品牌介绍' }}</div>
    <div class="subtitle">{{ component.props.subtitle || '' }}</div>
    <div class="desc">{{ component.props.desc || '请输入品牌介绍内容' }}</div>
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
.render-brand-intro {
  margin: 10px;
  padding: 12px;
  color: #fff;
  background: linear-gradient(135deg, #0f172a, #1e3a8a);
  border-radius: 10px;

  .title {
    font-size: 15px;
    font-weight: 800;
  }

  .subtitle {
    margin-top: 4px;
    font-size: 11px;
    opacity: 0.85;
  }

  .desc {
    margin-top: 8px;
    font-size: 12px;
    line-height: 1.6;
    opacity: 0.92;
  }
}
</style>
