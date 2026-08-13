<template>
  <div class="render-flash-sale split-text-typography">
    <div class="flash-header">
      <span class="title" :style="titleStyle">{{ component.props.title || '限时秒杀' }}</span>
      <span v-if="showCountdown" class="countdown" :class="{ 'countdown--expired': isExpired }">
        {{ countdownLabel }}
      </span>
      <span class="tag">{{ isExpired ? '已结束' : '进行中' }}</span>
    </div>
    <div class="flash-grid">
      <div v-for="(item, idx) in flashSaleItems" :key="`flash-${idx}`" class="flash-item">
        <div class="flash-img">🔥</div>
        <div class="flash-name" :style="itemTitleStyle">{{ item.name }}</div>
        <div class="flash-price" :style="itemMetaStyle">¥{{ item.price }}</div>
      </div>
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

const showCountdown = computed(() => props.component.props?.countdown !== false)
const titleStyle = computed(() => titleFontStyle(props.component.props?.title_font_size, 15))
const itemTitleStyle = computed(() => titleFontStyle(props.component.props?.title_font_size, 12))
const itemMetaStyle = computed(() => titleFontStyle(props.component.props?.subtitle_font_size, 12))

const remainSeconds = ref(0)
const isExpired = ref(false)
let countdownTimer: ReturnType<typeof setInterval> | null = null

function parseEndTime(raw?: string): number | null {
  if (!raw) return null
  const ms = new Date(String(raw).replace(/-/g, '/')).getTime()
  return Number.isFinite(ms) ? ms : null
}

function tickCountdown() {
  const endMs = parseEndTime(props.component.props?.end_time)
  if (!endMs) {
    remainSeconds.value = 0
    isExpired.value = false
    return
  }
  const diff = Math.floor((endMs - Date.now()) / 1000)
  if (diff <= 0) {
    remainSeconds.value = 0
    isExpired.value = true
    return
  }
  remainSeconds.value = diff
  isExpired.value = false
}

const countdownText = computed(() => {
  const s = Math.max(remainSeconds.value, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`
})

const countdownLabel = computed(() => {
  if (!props.component.props?.end_time) return '请设置结束时间'
  if (isExpired.value) return '已结束'
  return `距结束 ${countdownText.value}`
})

onMounted(() => {
  tickCountdown()
  countdownTimer = setInterval(tickCountdown, 1000)
})

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})

watch(() => props.component.props?.end_time, tickCountdown)
watch(() => props.component.props?.countdown, tickCountdown)

const flashSaleItems = computed<Array<{ name: string; price: string }>>(() => {
  const limit = Math.max(Number(props.component.props?.limit || 4), 1)
  return [
    { name: '限时爆款A', price: '69.00' },
    { name: '限时爆款B', price: '89.00' },
    { name: '限时爆款C', price: '129.00' },
    { name: '限时爆款D', price: '199.00' },
  ].slice(0, limit)
})
</script>

<style lang="scss" scoped>
.render-flash-sale {
  padding: 10px;
  background: linear-gradient(180deg, #fff7ed, #ffffff);
  border: 1px solid #fed7aa;
  border-radius: var(--card-radius, 10px);

  .flash-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;

    .title {
      color: #9a3412;
      font-size: 14px;
      font-weight: 800;
    }

    .countdown {
      margin-left: auto;
      margin-right: 6px;
      padding: 2px 8px;
      color: #9a3412;
      font-size: 11px;
      font-variant-numeric: tabular-nums;
      background: #ffedd5;
      border-radius: 999px;

      &.countdown--expired {
        color: #64748b;
        background: #f1f5f9;
      }
    }

    .tag {
      padding: 2px 6px;
      color: #fff;
      font-size: 10px;
      background: #ea580c;
      border-radius: 999px;
    }
  }

  .flash-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .flash-item {
    padding: 8px;
    background: #fff;
    border: 1px solid #fde5d2;
    border-radius: var(--card-radius, 8px);

    .flash-img {
      text-align: center;
      font-size: 20px;
    }

    .flash-name {
      margin-top: 4px;
      color: #475569;
      font-size: 11px;
    }

    .flash-price {
      margin-top: 2px;
      color: #dc2626;
      font-size: 13px;
      font-weight: 700;
    }
  }
}
</style>
