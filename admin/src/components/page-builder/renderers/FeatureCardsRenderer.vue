<template>
  <div class="render-feature-cards" :style="{ gap: gap + 'px' }">
    <div
      v-for="(item, idx) in items"
      :key="idx"
      class="render-feature-card"
      :style="{ width: `calc(${100 / columns}% - ${gap}px)` }"
    >
      <div class="render-feature-card__icon">{{ item.icon || '✨' }}</div>
      <div class="render-feature-card__title">{{ item.title || '卖点' }}</div>
      <div class="render-feature-card__desc">{{ item.desc || '' }}</div>
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

const items = computed(() => Array.isArray(props.component.props?.items) ? props.component.props.items : [])
const columns = computed(() => Math.max(Number(props.component.props?.columns) || 3, 1))
const gap = computed(() => Number(props.component.style?.item_gap ?? props.component.props?.gap ?? 10))
</script>

<style scoped>
.render-feature-cards {
  display: flex;
  flex-wrap: wrap;
}
.render-feature-card {
  box-sizing: border-box;
  padding: 12px 10px;
  background: #fff;
  border: 1px solid #eef2f7;
  border-radius: 10px;
  text-align: center;
}
.render-feature-card__icon { font-size: 22px; line-height: 1.2; }
.render-feature-card__title {
  margin-top: 6px;
  font-size: 13px;
  font-weight: 700;
  color: #172033;
}
.render-feature-card__desc {
  margin-top: 4px;
  font-size: 11px;
  color: #64748b;
  line-height: 1.4;
}
</style>
