<template>
  <div class="render-appointment-service">
    <div class="section-title">{{ component.props.title || '预约服务' }}</div>
    <div v-for="(item, idx) in appointmentServiceItems" :key="`service-${idx}`" class="service-item">
      <div class="service-name">{{ item.name }}</div>
      <div class="service-desc">{{ item.desc }}</div>
    </div>
    <button type="button" class="service-btn">{{ component.props.button_text || '立即预约' }}</button>
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

const appointmentServiceItems = computed<Array<{ name: string; desc: string }>>(() => {
  const items = props.component.props?.services
  if (Array.isArray(items) && items.length) return items
  return [
    { name: '专家咨询', desc: '一对一咨询服务' },
    { name: '到店体验', desc: '门店体验预约' },
  ]
})
</script>

<style lang="scss" scoped>
.render-appointment-service {
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

  .service-item {
    margin-bottom: 8px;
    padding: 8px;
    background: #f8faff;
    border-radius: 8px;
  }

  .service-name {
    color: #1e293b;
    font-size: 12px;
    font-weight: 600;
  }

  .service-desc {
    margin-top: 2px;
    color: #64748b;
    font-size: 11px;
  }

  .service-btn {
    width: 100%;
    height: 30px;
    color: #fff;
    font-size: 12px;
    font-weight: 700;
    background: #1769ff;
    border: 0;
    border-radius: 8px;
  }
}
</style>
