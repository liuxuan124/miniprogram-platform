<template>
  <div
    class="render-float-button"
    :class="{ 'is-preview': previewMode, 'is-overlay': fabOnly, selected }"
  >
    <div
      class="float-fab"
      :class="[`pos-${positionKey}`, { 'with-text': showText, 'is-docked': docked }]"
      :style="fabStyle"
      @click.stop="onFabClick"
      @mouseenter="expandFab"
      @mouseleave="scheduleDock"
    >
      <img v-if="iconImage" :src="iconImage" class="float-fab__img" alt="" />
      <span v-else class="float-fab__emoji">{{ displayEmoji }}</span>
      <span v-if="showText" class="float-fab__text">{{ component.props.title || '客服' }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { normalizeUploadUrl } from '@/api/system'
import type { ComponentInstance } from '@/types/page'

const ICON_MAP: Record<string, string> = {
  service: '🎧',
  cart: '🛒',
  home: '🏠',
  top: '⬆️',
  phone: '📞',
}

const IDLE_MS = 2500

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
  fabOnly?: boolean
  selected?: boolean
}>()

const emit = defineEmits<{
  'preview-action': [payload: { tab: string; message: string; detailType?: string; detailTitle?: string; detailDesc?: string }]
  'select-hint': []
}>()

const docked = ref(false)
let dockTimer: ReturnType<typeof setTimeout> | null = null

const edgeHideEnabled = computed(() => props.component.props?.edge_hide !== false)
const showText = computed(() => !!props.component.props?.show_text)
const iconImage = computed(() => normalizeUploadUrl(String(props.component.props?.icon_image || '')))

const displayEmoji = computed(() => {
  const emoji = String(props.component.props?.icon_emoji || '').trim()
  if (emoji) return emoji
  const icon = String(props.component.props?.icon || 'service')
  if (ICON_MAP[icon]) return ICON_MAP[icon]
  if (icon && !/^[a-z_]+$/i.test(icon)) return icon
  return '🎧'
})

const positionKey = computed(() => {
  const raw = String(props.component.props?.position || 'right_bottom')
  if (raw === 'bottom-right' || raw === 'right_bottom') return 'right_bottom'
  if (raw === 'bottom-left' || raw === 'left_bottom') return 'left_bottom'
  if (raw === 'right_middle' || raw === 'right-center') return 'right_middle'
  if (raw === 'left_middle' || raw === 'left-center') return 'left_middle'
  return 'right_bottom'
})

const isLeftSide = computed(() => positionKey.value.includes('left'))

const fabStyle = computed(() => {
  const size = Math.min(72, Math.max(36, Number(props.component.props?.size || 48)))
  const opacity = Math.min(100, Math.max(40, Number(props.component.props?.opacity ?? 100))) / 100
  const color = String(props.component.props?.color || props.component.props?.button_color || '#1769ff')
  const ox = Number(props.component.props?.offset_x ?? 16)
  const oy = Number(props.component.props?.offset_y ?? 100)
  const style: Record<string, string> = {
    width: showText.value ? 'auto' : `${size}px`,
    minWidth: `${size}px`,
    height: `${size}px`,
    background: color,
    opacity: String(opacity),
    borderRadius: showText.value ? '999px' : '50%',
    padding: showText.value ? `0 ${Math.round(size / 3)}px` : '0',
    transition: 'transform 0.28s ease, opacity 0.28s ease',
  }
  const pos = positionKey.value
  if (pos.includes('right')) style.right = `${ox}px`
  else style.left = `${ox}px`
  if (pos.includes('middle')) {
    style.top = '50%'
    style.bottom = 'auto'
  } else {
    style.bottom = `${oy}px`
  }

  const hideX = Math.round(size * 0.6)
  if (docked.value && edgeHideEnabled.value) {
    if (pos.includes('middle')) {
      style.transform = isLeftSide.value
        ? `translate(-${hideX}px, -50%)`
        : `translate(${hideX}px, -50%)`
    } else {
      style.transform = isLeftSide.value ? `translateX(-${hideX}px)` : `translateX(${hideX}px)`
    }
    style.opacity = String(Math.max(0.55, opacity * 0.85))
  } else if (pos.includes('middle')) {
    style.transform = 'translateY(-50%)'
  }

  return style
})

function clearDockTimer() {
  if (dockTimer) {
    clearTimeout(dockTimer)
    dockTimer = null
  }
}

function expandFab() {
  docked.value = false
  clearDockTimer()
}

function scheduleDock() {
  clearDockTimer()
  if (!edgeHideEnabled.value) {
    docked.value = false
    return
  }
  dockTimer = setTimeout(() => {
    docked.value = true
  }, IDLE_MS)
}

function onFabClick() {
  expandFab()
  scheduleDock()
  if (!props.previewMode) {
    emit('select-hint')
    return
  }
  const action = String(props.component.props?.action_type || 'link')
  let message = '悬浮按钮'
  if (action === 'top') message = '返回顶部'
  else if (action === 'phone') message = `拨打 ${props.component.props?.phone || ''}`
  else if (action === 'ai') message = '打开客服'
  else message = `跳转 ${props.component.props?.link_url || '(未设置链接)'}`
  emit('preview-action', {
    tab: 'home',
    message,
    detailType: 'float_button',
    detailTitle: props.component.props?.title || '悬浮按钮',
    detailDesc: message,
  })
}

onMounted(() => {
  scheduleDock()
})

onUnmounted(() => {
  clearDockTimer()
})

watch(edgeHideEnabled, (enabled) => {
  if (!enabled) expandFab()
  else scheduleDock()
})
</script>

<style lang="scss" scoped>
.render-float-button {
  position: relative;
}

.float-fab {
  position: absolute;
  z-index: 30;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #fff;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.22);
  cursor: pointer;
  box-sizing: border-box;
}

.render-float-button:not(.is-overlay) > .float-fab {
  /* 非浮层模式（极少）也直接显示圆钮 */
  position: relative;
  display: inline-flex;
}

.render-float-button.is-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;

  .float-fab {
    display: inline-flex;
    position: absolute;
    pointer-events: auto;
  }
}

.float-fab__emoji {
  font-size: 20px;
  line-height: 1;
}

.float-fab__img {
  width: 22px;
  height: 22px;
  object-fit: contain;
}

.float-fab__text {
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}
</style>
