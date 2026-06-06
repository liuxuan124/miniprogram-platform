<template>
  <div class="render-contact-info">
    <div class="title">{{ component.props.title || '联系我们' }}</div>
    <div class="line">☎ {{ component.props.phone || '未设置电话' }}</div>
    <div class="line">📍 {{ component.props.address || '未设置地址' }}</div>
    <div class="line">🕘 {{ component.props.service_time || '未设置时间' }}</div>
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
.render-contact-info {
  margin: 10px;
  padding: 12px;
  background: #fff;
  border: 1px solid #e6edf6;
  border-radius: 10px;

  .title {
    margin-bottom: 6px;
    color: #172033;
    font-size: 14px;
    font-weight: 700;
  }

  .line {
    margin-top: 4px;
    color: #475569;
    font-size: 12px;
  }
}
</style>
