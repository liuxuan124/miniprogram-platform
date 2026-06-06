<template>
  <div class="render-coupon">
    <div v-if="component.props.title" class="section-title">{{ component.props.title }}</div>
    <div class="coupon-item">
      <div class="coupon-amount">¥10</div>
      <div class="coupon-info">
        <div>满100可用</div>
        <div class="coupon-btn">领取</div>
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
.render-coupon {
  background: #fff;
  padding: 8px;

  .section-title {
    font-size: 15px;
    font-weight: 600;
    color: #303133;
    margin-bottom: 8px;
  }

  .coupon-item {
    display: flex;
    align-items: center;
    background: #fff5f5;
    border: 1px solid #fde2e2;
    border-radius: 6px;
    overflow: hidden;

    .coupon-amount {
      width: 80px;
      text-align: center;
      font-size: 20px;
      font-weight: 700;
      color: #f56c6c;
      padding: 12px 0;
      border-right: 1px dashed #fde2e2;
    }

    .coupon-info {
      flex: 1;
      padding: 8px 12px;
      font-size: 12px;
      color: #909399;
      display: flex;
      justify-content: space-between;
      align-items: center;

      .coupon-btn {
        background: #f56c6c;
        color: #fff;
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 11px;
      }
    }
  }
}
</style>
