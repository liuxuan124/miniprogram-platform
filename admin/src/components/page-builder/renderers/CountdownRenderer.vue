<template>
  <div
    class="render-countdown split-text-typography"
    :class="[`style-${styleType}`, { expired: isExpired }]"
  >
    <div class="countdown-title" :style="titleStyle">{{ component.props.title || '距离活动开始' }}</div>
    <div v-if="!component.props.end_time" class="countdown-hint">请设置结束时间</div>
    <div v-else-if="isExpired" class="countdown-expired">{{ endText }}</div>
    <div v-else class="countdown-timer">
      <template v-if="showDays">
        <span class="time-block">{{ parts.days }}</span>
        <span class="unit">天</span>
      </template>
      <span class="time-block">{{ parts.hours }}</span>
      <span class="unit">时</span>
      <span class="time-block">{{ parts.minutes }}</span>
      <span class="unit">分</span>
      <span class="time-block">{{ parts.seconds }}</span>
      <span class="unit">秒</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type { ComponentInstance } from '@/types/page'
import { titleFontStyle } from '../composables/titleFontStyle'

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

defineEmits<{
  'preview-action': [payload: { tab: string; message: string; detailType?: string; detailTitle?: string; detailDesc?: string }]
}>()

const remainMs = ref(0)
const isExpired = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

const styleType = computed(() => (props.component.props?.style_type === 'banner' ? 'banner' : 'card'))
const showDays = computed(() => props.component.props?.show_days !== false)
const endText = computed(() => props.component.props?.end_text || '已结束')
const titleStyle = computed(() => titleFontStyle(props.component.props?.title_font_size, 15))

function parseEndTime(raw?: string): number | null {
  if (!raw) return null
  const ms = new Date(String(raw).replace(/-/g, '/')).getTime()
  return Number.isFinite(ms) ? ms : null
}

function tick() {
  const endMs = parseEndTime(props.component.props?.end_time)
  if (!endMs) {
    remainMs.value = 0
    isExpired.value = false
    return
  }
  const diff = endMs - Date.now()
  if (diff <= 0) {
    remainMs.value = 0
    isExpired.value = true
    return
  }
  remainMs.value = diff
  isExpired.value = false
}

const parts = computed(() => {
  const pad = (n: number) => String(n).padStart(2, '0')
  let ms = Math.max(remainMs.value, 0)
  const days = Math.floor(ms / 86400000)
  ms %= 86400000
  const hours = Math.floor(ms / 3600000)
  ms %= 3600000
  const minutes = Math.floor(ms / 60000)
  ms %= 60000
  const seconds = Math.floor(ms / 1000)
  // 不显示天数时，小时累加天数
  const displayHours = showDays.value ? hours : days * 24 + hours
  return {
    days: pad(days),
    hours: pad(displayHours),
    minutes: pad(minutes),
    seconds: pad(seconds),
  }
})

onMounted(() => {
  tick()
  timer = setInterval(tick, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

watch(
  () => [props.component.props?.end_time, props.component.props?.show_days],
  () => tick(),
)
</script>

<style lang="scss" scoped>
.render-countdown {
  text-align: center;
  color: #303133;

  &.style-card {
    padding: 12px;
    background: #fff;
    border: 1px solid #e6edf6;
    border-radius: var(--card-radius, 10px);
  }

  &.style-banner {
    padding: 14px 12px;
    background: linear-gradient(135deg, #fff7ed, #ffedd5);
    border: 1px solid #fed7aa;
    border-radius: var(--card-radius, 8px);
  }

  .countdown-title {
    margin-bottom: 8px;
    font-size: 15px;
    font-weight: 700;
  }

  .countdown-hint,
  .countdown-expired {
    color: #94a3b8;
    font-size: 13px;
  }

  .countdown-expired {
    color: #ef4444;
    font-weight: 600;
  }

  .countdown-timer {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    font-size: 12px;
    color: #64748b;
  }

  .time-block {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 28px;
    height: 28px;
    padding: 0 4px;
    background: #172033;
    color: #fff;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 700;
  }

  &.style-banner .time-block {
    background: #c2410c;
  }

  .unit {
    margin: 0 2px;
  }
}
</style>
