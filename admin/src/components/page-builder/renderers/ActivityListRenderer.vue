<template>
  <div class="render-activity-list">
    <div class="section-title">{{ component.props.title || '热门活动' }}</div>
    <div v-for="(item, idx) in activityListItems" :key="`act-${idx}`" class="activity-list-item">
      <div>
        <div class="name">{{ item.title }}</div>
        <div class="meta">{{ item.date }} · {{ item.location }}</div>
      </div>
      <button type="button">报名</button>
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

const activityListItems = computed<Array<{ title: string; date: string; location: string }>>(() => {
  const items = props.component.props?.items
  if (Array.isArray(items) && items.length) return items
  return [
    { title: '品牌开放日沙龙', date: '2026-05-20', location: '品牌中心' },
    { title: '药食同源研学活动', date: '2026-05-24', location: '展会中心' },
  ]
})
</script>

<style lang="scss" scoped>
.render-activity-list {
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

  .activity-list-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
    padding: 8px;
    background: #f8faff;
    border-radius: 8px;

    .name {
      color: #1e293b;
      font-size: 12px;
      font-weight: 600;
    }

    .meta {
      margin-top: 2px;
      color: #64748b;
      font-size: 10px;
    }

    button {
      padding: 4px 10px;
      color: #fff;
      font-size: 11px;
      background: #1769ff;
      border: 0;
      border-radius: 999px;
    }
  }
}
</style>
