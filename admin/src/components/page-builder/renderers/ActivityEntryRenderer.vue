<template>
  <div class="render-activity-entry" :class="`theme-${component.props.theme || 'blue'}`">
    <div class="activity-card">
      <div class="activity-image">🎪 品牌开放日沙龙</div>
      <div class="activity-info">
        <div class="activity-title">{{ component.props.title || '品牌开放日沙龙' }}</div>
        <div class="activity-meta">
          <span>📅 2026-05-10</span>
          <span>📍 品牌中心</span>
        </div>
        <button class="activity-reserve-btn" type="button">立即预约</button>
      </div>
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
.render-activity-entry {
  padding: 10px;

  .activity-card {
    overflow: hidden;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 8px 22px rgba(15, 31, 60, 0.08);
  }

  .activity-image {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 110px;
    color: #fff;
    font-size: 14px;
    font-weight: 800;
    background: linear-gradient(135deg, #1769ff, #20b7ff);
  }

  .activity-info {
    padding: 10px 12px;
  }

  .activity-title {
    color: #172033;
    font-size: 14px;
    font-weight: 800;
  }

  .activity-meta {
    display: flex;
    justify-content: space-between;
    margin-top: 5px;
    color: #7b8798;
    font-size: 11px;
  }

  .activity-reserve-btn {
    margin-top: 8px;
    padding: 6px 12px;
    color: #fff;
    font-size: 12px;
    font-weight: 700;
    background: #1769ff;
    border: 0;
    border-radius: 8px;
    cursor: pointer;
  }

  &.theme-purple .activity-image {
    background: linear-gradient(135deg, #7c3aed, #a855f7);
  }

  &.theme-dark .activity-image {
    background: linear-gradient(135deg, #111827, #374151);
  }

  &.theme-gold .activity-image {
    background: linear-gradient(135deg, #b45309, #f59e0b);
  }
}
</style>
