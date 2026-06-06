<template>
  <div class="render-certificate">
    <div class="section-title">{{ component.props.title || '资质证书' }}</div>
    <div class="certificate-grid">
      <div v-for="(item, idx) in certificateItems" :key="`cert-${idx}`" class="certificate-item">
        <div class="img">📜</div>
        <div class="name">{{ item.name }}</div>
      </div>
    </div>
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

const certificateItems = computed<Array<{ name: string }>>(() => {
  const items = props.component.props?.items
  if (Array.isArray(items) && items.length) return items
  return [{ name: '有机产品认证' }, { name: '质量检测报告' }]
})
</script>

<style lang="scss" scoped>
.render-certificate {
  margin: 10px;
  padding: 10px;
  background: #fff;
  border: 1px solid #e6edf6;
  border-radius: 10px;

  .section-title {
    margin-bottom: 8px;
    color: #172033;
    font-size: 15px;
    font-weight: 700;
  }

  .certificate-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .certificate-item {
    padding: 8px;
    text-align: center;
    background: #f8faff;
    border-radius: 8px;

    .img {
      font-size: 20px;
    }

    .name {
      margin-top: 4px;
      color: #475569;
      font-size: 11px;
    }
  }
}
</style>
