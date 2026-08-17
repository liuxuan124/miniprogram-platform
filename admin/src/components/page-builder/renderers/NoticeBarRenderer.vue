<template>
  <div
    v-if="!closed"
    class="render-notice-bar"
    :class="{ clickable: !!component.props.link_url }"
    :style="barStyle"
    @click="onClick"
  >
    <span v-if="component.props.show_icon !== false" class="notice-icon">📢</span>
    <span v-if="component.props.title" class="notice-label">{{ component.props.title }}</span>

    <!-- 水平滚动 -->
    <div v-if="isHorizontalScroll" class="notice-viewport">
      <div class="notice-track" :style="trackStyle">
        <span class="notice-text">{{ marqueeText }}</span>
        <span class="notice-text notice-text--clone" aria-hidden="true">{{ marqueeText }}</span>
      </div>
    </div>

    <!-- 垂直轮播 -->
    <div v-else-if="isVertical" class="notice-viewport notice-viewport--vertical">
      <transition name="notice-slide" mode="out-in">
        <span :key="verticalIndex" class="notice-text notice-text--vertical">{{ noticeItems[verticalIndex] || '暂无公告内容' }}</span>
      </transition>
    </div>

    <!-- 静态 -->
    <div v-else class="notice-viewport">
      <span class="notice-text notice-text--static">{{ noticeItems[0] || '暂无公告内容' }}</span>
    </div>

    <span v-if="component.props.show_more" class="notice-more">›</span>
    <button v-if="component.props.closable" type="button" class="notice-close" @click.stop="closed = true">×</button>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type { ComponentInstance } from '@/types/page'

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

const emit = defineEmits<{
  'preview-action': [payload: { tab: string; message: string; detailType?: string; detailTitle?: string; detailDesc?: string }]
}>()

const closed = ref(false)
const verticalIndex = ref(0)
let verticalTimer: ReturnType<typeof setInterval> | null = null

const noticeItems = computed<string[]>(() => {
  const items = props.component.props?.items
  if (!Array.isArray(items)) return []
  return items.map((x) => String(x || '').trim()).filter(Boolean)
})

const marqueeText = computed(() => {
  const list = noticeItems.value
  if (!list.length) return '暂无公告内容'
  return list.join('　　')
})

const isHorizontalScroll = computed(() => {
  return props.component.props?.scrollable !== false && (props.component.props?.direction || 'horizontal') !== 'vertical'
})

const isVertical = computed(() => {
  return props.component.props?.scrollable !== false && props.component.props?.direction === 'vertical'
})

const barStyle = computed(() => {
  const fontSize = Number(props.component.props?.font_size) || 12
  const radius = props.component.style?.border_radius
  const style: Record<string, string> = {
    color: props.component.props?.text_color || '#E53935',
    backgroundColor: props.component.props?.background_color || '#FFF9E6',
    fontSize: `${fontSize}px`,
  }
  // 显式绑定样式面板圆角（含 0 = 直角），不依赖 CSS 变量继承
  if (radius !== undefined && radius !== null && radius !== '') {
    style.borderRadius = `${Number(radius)}px`
  }
  return style
})

const trackStyle = computed(() => {
  const speed = Math.max(Number(props.component.props?.speed) || 50, 20)
  const len = Math.max(marqueeText.value.length, 8)
  // 约按 px/s：文本越长周期越长，速度越大周期越短
  const duration = Math.max(4, (len * 14) / speed)
  return {
    animationDuration: `${duration}s`,
  }
})

function clearVerticalTimer() {
  if (verticalTimer) {
    clearInterval(verticalTimer)
    verticalTimer = null
  }
}

function startVerticalTimer() {
  clearVerticalTimer()
  if (!isVertical.value || noticeItems.value.length <= 1) return
  const ms = Math.max(Number(props.component.props?.duration) || 3000, 1000)
  verticalTimer = setInterval(() => {
    verticalIndex.value = (verticalIndex.value + 1) % noticeItems.value.length
  }, ms)
}

function onClick() {
  const link = String(props.component.props?.link_url || '').trim()
  if (!link || !props.previewMode) return
  emit('preview-action', {
    tab: 'home',
    message: `公告跳转：${link}`,
    detailType: 'notice',
    detailTitle: props.component.props?.title || '公告',
    detailDesc: noticeItems.value[0] || '',
  })
}

watch(
  () => [isVertical.value, noticeItems.value.join('|'), props.component.props?.duration],
  () => {
    verticalIndex.value = 0
    startVerticalTimer()
  },
)

onMounted(startVerticalTimer)
onUnmounted(clearVerticalTimer)
</script>

<style lang="scss" scoped>
.render-notice-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border: 1px solid rgba(255, 224, 130, 0.8);
  border-radius: var(--card-radius, 8px);
  overflow: hidden;

  &.clickable {
    cursor: pointer;
  }

  .notice-icon {
    flex-shrink: 0;
    font-size: 13px;
    line-height: 1;
  }

  .notice-label {
    flex-shrink: 0;
    font-size: 0.92em;
    font-weight: 700;
    opacity: 0.95;
  }

  .notice-viewport {
    flex: 1;
    min-width: 0;
    overflow: hidden;
  }

  .notice-viewport--vertical {
    height: 1.4em;
    display: flex;
    align-items: center;
  }

  .notice-track {
    display: inline-flex;
    width: max-content;
    white-space: nowrap;
    animation-name: notice-marquee;
    animation-timing-function: linear;
    animation-iteration-count: infinite;
  }

  .notice-text {
    padding-right: 48px;
    white-space: nowrap;
    line-height: 1.4;
  }

  .notice-text--static {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .notice-text--vertical {
    display: block;
    width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .notice-more,
  .notice-close {
    flex-shrink: 0;
    color: inherit;
    opacity: 0.75;
    font-size: 14px;
    line-height: 1;
  }

  .notice-close {
    width: 18px;
    height: 18px;
    padding: 0;
    background: transparent;
    border: 0;
    cursor: pointer;
  }
}

.notice-slide-enter-active,
.notice-slide-leave-active {
  transition: all 0.28s ease;
}

.notice-slide-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.notice-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@keyframes notice-marquee {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-50%);
  }
}
</style>
