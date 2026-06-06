<template>
  <div class="render-countdown">
    <div class="countdown-title">{{ component.props.title || '限时抢购' }}</div>
    <div class="countdown-timer">
      <span class="time-block">00</span>天
      <span class="time-block">00</span>时
      <span class="time-block">00</span>分
      <span class="time-block">00</span>秒
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
.render-countdown {
  background: #fff;
  padding: 12px;
  text-align: center;

  .countdown-title {
    font-size: 15px;
    font-weight: 600;
    color: #303133;
    margin-bottom: 8px;
  }

  .countdown-timer {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    font-size: 12px;
    color: #606266;

    .time-block {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      background: #303133;
      color: #fff;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 700;
    }
  }
}
</style>
