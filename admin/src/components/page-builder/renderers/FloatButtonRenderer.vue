<template>
  <div
    class="render-float-button"
    :class="{ 'is-preview': previewMode, 'is-overlay': fabOnly, selected }"
  >
    <div
      class="float-fab"
      :class="[
        `pos-${positionKey}`,
        {
          'is-docked': docked,
          'is-dragging': dragging,
          'is-draggable': draggableEnabled,
        },
      ]"
      :style="fabStyle"
      @click.stop="onFabClick"
      @pointerdown.stop.prevent="onPointerDown"
      @mouseenter="expandFab"
      @mouseleave="onMouseLeave"
    >
      <img v-if="iconImage" :src="iconImage" class="float-fab__img" alt="" />
      <span v-else class="float-fab__emoji">{{ displayEmoji }}</span>
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

const IDLE_MS = 2200
const EDGE_GAP = 8

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
const dragging = ref(false)
const dragPos = ref<{ left: number; top: number } | null>(null)
/** 吸附边：用中心点判断后固化，避免 left<180 误判成只能贴左 */
const dockSide = ref<'left' | 'right'>('right')
let dockTimer: ReturnType<typeof setTimeout> | null = null
let dragOrigin = { left: 0, top: 0, x: 0, y: 0 }
let moved = false
let boundWidth = 375
let boundHeight = 667

function getFabBounds(el?: HTMLElement | null) {
  const layer =
    (el?.closest('.phone-fab-layer') as HTMLElement | null) ||
    (el?.closest('.canvas-fab-layer') as HTMLElement | null) ||
    (document.querySelector('.phone-fab-layer') as HTMLElement | null) ||
    (document.querySelector('.canvas-fab-layer') as HTMLElement | null) ||
    (el?.closest('.render-float-button') as HTMLElement | null) ||
    (document.querySelector('.render-float-button.is-overlay') as HTMLElement | null)
  const width = Math.max(200, layer?.clientWidth || 375)
  const height = Math.max(200, layer?.clientHeight || 667)
  boundWidth = width
  boundHeight = height
  return { width, height, layer }
}

const edgeHideEnabled = computed(() => props.component.props?.edge_hide !== false)
const draggableEnabled = computed(() => {
  const p = props.component.props || {}
  if (p.allow_drag === true) return true
  return p.draggable !== false
})
const iconImage = computed(() => normalizeUploadUrl(String(props.component.props?.icon_image || '')))

const displayEmoji = computed(() => {
  const emoji = String(props.component.props?.icon_emoji || '').trim()
  if (emoji) return emoji
  const icon = String(props.component.props?.icon || 'service')
  if (ICON_MAP[icon]) return ICON_MAP[icon]
  if (icon && !/^[a-z_]+$/i.test(icon)) return icon
  return '🎧'
})

const fabSize = computed(() => Math.min(72, Math.max(40, Number(props.component.props?.size || 52))))

const positionKey = computed(() => {
  const raw = String(props.component.props?.position || 'right_bottom')
  if (raw === 'bottom-right' || raw === 'right_bottom') return 'right_bottom'
  if (raw === 'bottom-left' || raw === 'left_bottom') return 'left_bottom'
  if (raw === 'right_middle' || raw === 'right-center') return 'right_middle'
  if (raw === 'left_middle' || raw === 'left-center') return 'left_middle'
  return 'right_bottom'
})

const fabStyle = computed(() => {
  const size = fabSize.value
  const opacity = Math.min(100, Math.max(40, Number(props.component.props?.opacity ?? 100))) / 100
  const color = String(props.component.props?.color || props.component.props?.button_color || '#0f766e')
  const ox = Number(props.component.props?.offset_x ?? 16)
  const oy = Number(props.component.props?.offset_y ?? 100)
  const style: Record<string, string> = {
    width: `${size}px`,
    height: `${size}px`,
    minWidth: `${size}px`,
    background: color,
    opacity: String(opacity),
    borderRadius: '50%',
    padding: '0',
    overflow: 'hidden',
    transition: dragging.value
      ? 'opacity 0.15s ease'
      : 'transform 0.28s ease, opacity 0.28s ease, left 0.2s ease, right 0.2s ease, top 0.2s ease',
  }

  const hideX = Math.round(size * 0.55)
  const side = dockSide.value

  if (dragPos.value) {
    style.top = `${dragPos.value.top}px`
    style.bottom = 'auto'
    if (side === 'right') {
      // 右侧用 right 定位，贴边更稳
      const right = Math.max(EDGE_GAP, boundWidth - dragPos.value.left - size)
      style.right = `${right}px`
      style.left = 'auto'
      if (docked.value && edgeHideEnabled.value) {
        style.transform = `translateX(${hideX}px)`
        style.opacity = String(Math.max(0.5, opacity * 0.8))
      }
    } else {
      style.left = `${dragPos.value.left}px`
      style.right = 'auto'
      if (docked.value && edgeHideEnabled.value) {
        style.transform = `translateX(-${hideX}px)`
        style.opacity = String(Math.max(0.5, opacity * 0.8))
      }
    }
    return style
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

  if (docked.value && edgeHideEnabled.value) {
    const towardLeft = side === 'left' || pos.includes('left')
    if (pos.includes('middle')) {
      style.transform = towardLeft
        ? `translate(-${hideX}px, -50%)`
        : `translate(${hideX}px, -50%)`
    } else {
      style.transform = towardLeft ? `translateX(-${hideX}px)` : `translateX(${hideX}px)`
    }
    style.opacity = String(Math.max(0.5, opacity * 0.8))
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

function snapDragToEdge() {
  if (!dragPos.value) return
  const size = fabSize.value
  const { width, height } = getFabBounds()
  const mid = width / 2
  const centerX = dragPos.value.left + size / 2
  const side: 'left' | 'right' = centerX < mid ? 'left' : 'right'
  dockSide.value = side
  const left = side === 'left'
    ? EDGE_GAP
    : Math.max(EDGE_GAP, width - size - EDGE_GAP)
  const top = Math.max(EDGE_GAP, Math.min(dragPos.value.top, height - size - EDGE_GAP))
  dragPos.value = { left, top }
}

function scheduleDock() {
  clearDockTimer()
  if (!edgeHideEnabled.value) {
    docked.value = false
    return
  }
  dockTimer = setTimeout(() => {
    snapDragToEdge()
    docked.value = true
  }, IDLE_MS)
}

function onMouseLeave() {
  if (!dragging.value) scheduleDock()
}

function ensureDragOrigin(el: HTMLElement) {
  if (dragPos.value) return
  const { width, height } = getFabBounds(el)
  const size = fabSize.value
  const ox = Number(props.component.props?.offset_x ?? 16)
  const oy = Number(props.component.props?.offset_y ?? 100)
  const side: 'left' | 'right' = positionKey.value.includes('left') ? 'left' : 'right'
  dockSide.value = side
  const left = side === 'left'
    ? ox
    : Math.max(EDGE_GAP, width - size - ox)
  const top = positionKey.value.includes('middle')
    ? Math.max(EDGE_GAP, (height - size) / 2)
    : Math.max(EDGE_GAP, height - size - oy)
  dragPos.value = { left, top }
}

function onPointerDown(e: PointerEvent) {
  expandFab()
  if (!props.previewMode) {
    emit('select-hint')
    return
  }
  if (!draggableEnabled.value) return
  const el = e.currentTarget as HTMLElement
  getFabBounds(el)
  ensureDragOrigin(el)
  dragging.value = true
  moved = false
  dragOrigin = {
    left: dragPos.value!.left,
    top: dragPos.value!.top,
    x: e.clientX,
    y: e.clientY,
  }
  el.setPointerCapture?.(e.pointerId)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)
}

function onPointerMove(e: PointerEvent) {
  if (!dragging.value || !dragPos.value) return
  const { width, height } = getFabBounds()
  const size = fabSize.value
  const dx = e.clientX - dragOrigin.x
  const dy = e.clientY - dragOrigin.y
  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true
  let left = dragOrigin.left + dx
  let top = dragOrigin.top + dy
  left = Math.max(0, Math.min(left, width - size))
  top = Math.max(0, Math.min(top, height - size))
  dragPos.value = { left, top }
  dockSide.value = left + size / 2 < width / 2 ? 'left' : 'right'
}

function onPointerUp() {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerUp)
  if (dragging.value) {
    snapDragToEdge()
  }
  dragging.value = false
  scheduleDock()
}

function onFabClick() {
  expandFab()
  scheduleDock()
  if (moved) {
    moved = false
    return
  }
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
  dockSide.value = positionKey.value.includes('left') ? 'left' : 'right'
  scheduleDock()
})

onUnmounted(() => {
  clearDockTimer()
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerUp)
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
  color: #fff;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.22);
  border: 1px solid rgba(255, 255, 255, 0.85);
  cursor: pointer;
  box-sizing: border-box;
  user-select: none;
  touch-action: none;
}

.float-fab.is-draggable {
  cursor: grab;
}

.float-fab.is-dragging {
  cursor: grabbing;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.3);
}

.render-float-button:not(.is-overlay) > .float-fab {
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
</style>
