<template>
  <div class="prototype-canvas">
    <div class="canvas-meta">
      <span class="canvas-meta__title">编辑画布</span>
      <span class="canvas-meta__device">手机 · 375 × 812</span>
    </div>
    <!-- 缩放不改变文档流占位尺寸，用等比容器包裹避免 scale>1 时视觉溢出压住下方缩放条 -->
    <div class="phone-scale-wrap" :style="{ width: PHONE_WIDTH * zoom + 'px', height: PHONE_HEIGHT * zoom + 'px' }">
      <div class="phone" :style="{ transform: `scale(${zoom})` }">
      <div class="phone-notch">
        <div class="phone-speaker"></div>
      </div>
      <div class="phone-screen">
        <div class="mini-top">
          <span>{{ pageStore.pageConfig.name || '未命名页面' }}</span>
        </div>
        <div
          class="mini-content"
          :style="{ backgroundColor: pageStore.pageConfig.background_color || '#f6f8fb' }"
          @dragover.prevent="handleContainerDragOver"
          @dragleave="handleContainerDragLeave"
          @drop="handleContainerDrop"
        >
          <template v-if="pageStore.components.length">
            <template v-for="(comp, index) in pageStore.components" :key="comp.id">
              <template v-if="comp.type !== ComponentType.FloatButton">
                <div class="drop-indicator" :class="{ visible: dragOverIndex === index }"></div>
                <div
                  class="canvas-item-wrap"
                  :class="{ dragging: draggingIndex === index }"
                  draggable="true"
                  @dragstart="handleItemDragStart($event, index)"
                  @dragend="handleDragEnd"
                  @dragover.prevent.stop="handleItemDragOver($event, index)"
                  @drop.stop="handleItemDrop($event, index)"
                >
                  <ComponentItem
                    :component="comp"
                    :index="index"
                    :selected="comp.id === pageStore.selectedComponentId"
                    @select="pageStore.selectComponent(comp.id)"
                    @delete="pageStore.removeComponent(comp.id)"
                    @copy="pageStore.duplicateComponent(comp.id)"
                    @move-up="handleMoveUp(index)"
                    @move-down="handleMoveDown(index)"
                  />
                </div>
              </template>
            </template>
            <div class="drop-indicator" :class="{ visible: dragOverIndex === pageStore.components.length }"></div>
          </template>
          <div
            v-else
            class="empty-canvas"
            :class="{ 'drag-hover': dragOverIndex === 0 }"
            @click="pageStore.selectComponent(null)"
          >
            <div class="empty-title">空白页面</div>
            <div class="empty-desc">从左侧组件库拖入组件开始装修</div>
          </div>
        </div>
        <!-- 悬浮按钮贴在手机屏内，不随内容滚动 -->
        <div v-if="floatEntries.length" class="canvas-fab-layer">
          <ComponentItem
            v-for="item in floatEntries"
            :key="`fab-${item.comp.id}`"
            :component="item.comp"
            :index="item.index"
            :selected="item.comp.id === pageStore.selectedComponentId"
            :fab-only="true"
            @select="pageStore.selectComponent(item.comp.id)"
            @delete="pageStore.removeComponent(item.comp.id)"
            @copy="pageStore.duplicateComponent(item.comp.id)"
            @move-up="handleMoveUp(item.index)"
            @move-down="handleMoveDown(item.index)"
          />
        </div>
      </div>
      </div>
    </div>

    <!-- B5：缩放档位，小屏笔记本上装修时可以缩小画布看到更多内容 -->
    <div class="zoom-controls">
      <button
        v-for="level in ZOOM_LEVELS"
        :key="level"
        class="zoom-btn"
        :class="{ active: zoom === level }"
        @click="zoom = level"
      >{{ Math.round(level * 100) }}%</button>
    </div>
    <div class="canvas-shortcuts">Delete 删除 · ⌘D 复制 · ⌘Z 撤销</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { usePageStore } from '@/stores/page'
import { ComponentType } from '@/types/page'
import ComponentItem from './ComponentItem.vue'

const pageStore = usePageStore()

const floatEntries = computed(() =>
  pageStore.components
    .map((comp, index) => ({ comp, index }))
    .filter(({ comp }) => comp.type === ComponentType.FloatButton),
)

/** B5：画布缩放档位 */
const PHONE_WIDTH = 334
const PHONE_HEIGHT = 636 // 26px 刘海 + 610px 屏幕
const ZOOM_LEVELS = [0.75, 1, 1.25]
const zoom = ref(1)

/** B2：拖拽落点指示。dragOverIndex 表示"插入到该下标之前"，null 表示无有效落点 */
const dragOverIndex = ref<number | null>(null)
/** 画布内正在被拖拽换位的组件下标（用于视觉上淡化被拖拽项） */
const draggingIndex = ref<number | null>(null)

const REORDER_MIME = 'application/x-canvas-reorder-index'

/** 从画布内某个已有组件开始拖拽（用于换位排序） */
function handleItemDragStart(event: DragEvent, index: number) {
  draggingIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData(REORDER_MIME, String(index))
  }
}

function handleDragEnd() {
  draggingIndex.value = null
  dragOverIndex.value = null
}

/** 根据鼠标 Y 坐标相对目标项的位置，计算插入点在其前还是其后 */
function computeInsertIndex(event: DragEvent, itemIndex: number): number {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const midpoint = rect.top + rect.height / 2
  return event.clientY < midpoint ? itemIndex : itemIndex + 1
}

function handleItemDragOver(event: DragEvent, index: number) {
  if (event.dataTransfer) event.dataTransfer.dropEffect = draggingIndex.value !== null ? 'move' : 'copy'
  dragOverIndex.value = computeInsertIndex(event, index)
}

/** 容器级兜底：仅在画布为空（无任何组件项可命中）时用于高亮空态占位 */
function handleContainerDragOver() {
  if (pageStore.components.length === 0) {
    dragOverIndex.value = 0
  }
}

function handleContainerDragLeave(event: DragEvent) {
  // 只有真正离开容器（而非在子元素间切换）时才清空指示线，避免闪烁
  const related = event.relatedTarget as Node | null
  if (related && (event.currentTarget as HTMLElement).contains(related)) return
  dragOverIndex.value = null
}

/** 落到具体某一项上：使用该项计算出的插入点 */
function handleItemDrop(event: DragEvent, index: number) {
  const insertAt = computeInsertIndex(event, index)
  commitDrop(event, insertAt)
}

/** 落到容器空白处（列表下方留白 / 空画布）：追加到末尾，或使用最后一次计算的指示位置 */
function handleContainerDrop(event: DragEvent) {
  const insertAt = dragOverIndex.value ?? pageStore.components.length
  commitDrop(event, insertAt)
}

function commitDrop(event: DragEvent, insertAt: number) {
  const reorderFromRaw = event.dataTransfer?.getData(REORDER_MIME)
  dragOverIndex.value = null
  draggingIndex.value = null

  if (reorderFromRaw) {
    const fromIndex = Number(reorderFromRaw)
    if (Number.isNaN(fromIndex)) return
    const adjustedTo = insertAt > fromIndex ? insertAt - 1 : insertAt
    if (adjustedTo === fromIndex) return
    pageStore.moveComponent(fromIndex, adjustedTo)
    return
  }

  const type = event.dataTransfer?.getData('componentType') as ComponentType
  if (type) {
    pageStore.addComponent(type, insertAt)
  }
}

function handleMoveUp(index: number) {
  if (index > 0) {
    pageStore.moveComponent(index, index - 1)
  }
}

function handleMoveDown(index: number) {
  if (index < pageStore.components.length - 1) {
    pageStore.moveComponent(index, index + 1)
  }
}

/** B5：Delete 删除选中组件、Ctrl+D 复制选中组件。输入框内不拦截，交给浏览器原生行为 */
function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable
}

function handleKeydown(event: KeyboardEvent) {
  if (isEditableTarget(event.target)) return
  const selectedId = pageStore.selectedComponentId
  if (!selectedId) return

  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault()
    pageStore.removeComponent(selectedId)
    return
  }

  const isMod = event.ctrlKey || event.metaKey
  if (isMod && event.key.toLowerCase() === 'd') {
    event.preventDefault()
    pageStore.duplicateComponent(selectedId)
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style lang="scss" scoped>
.prototype-canvas {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding: 18px 0 52px;
}

.canvas-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: min(100%, 520px);
  margin-bottom: 16px;
  color: #7b8798;
  font-size: 12px;
}

.canvas-meta__title {
  color: #334155;
  font-weight: 700;
}

.canvas-meta__device {
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid #dbe2ec;
  border-radius: 999px;
}

.phone-scale-wrap {
  position: relative;
  flex-shrink: 0;
}

.phone {
  width: 334px;
  overflow: hidden;
  background: #fff;
  border-radius: 36px;
  box-shadow:
    0 0 0 9px #111827,
    0 24px 54px rgba(15, 23, 42, 0.22);
  transform-origin: top center;
  transition: transform 0.15s ease;
}

/* B5：缩放档位控制条，吸附在编辑区底部，随滚动保持可见 */
.zoom-controls {
  position: sticky;
  bottom: 14px;
  align-self: flex-end;
  margin-right: 18px;
  display: flex;
  gap: 2px;
  margin-top: 10px;
  padding: 3px;
  background: var(--bg-elevated, #fff);
  border: 1px solid var(--border, #e3e8f0);
  border-radius: var(--radius-lg, 12px);
  box-shadow: var(--shadow-md, 0 4px 12px rgba(15, 23, 42, 0.12));
}

.canvas-shortcuts {
  position: sticky;
  bottom: 18px;
  align-self: flex-start;
  margin: -34px 0 0 18px;
  color: #94a3b8;
  font-size: 11px;
}

.zoom-btn {
  padding: 5px 10px;
  color: var(--text-muted, #7b8798);
  font-family: inherit;
  font-size: 12px;
  background: transparent;
  border: 0;
  border-radius: var(--radius-sm, 6px);
  cursor: pointer;

  &:hover {
    color: var(--brand, #1769ff);
    background: var(--brand-soft, #eaf1ff);
  }

  &.active {
    color: #fff;
    font-weight: 600;
    background: var(--brand, #1769ff);
  }
}

.phone-notch {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 26px;
  background: #111827;
}

.phone-speaker {
  width: 76px;
  height: 5px;
  background: #000;
  border-radius: 99px;
  opacity: 0.55;
}

.phone-screen {
  position: relative;
  height: 610px;
  overflow: hidden;
  background: #f6f8fb;
}

.mini-top {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 44px;
  color: #172033;
  font-size: 14px;
  font-weight: 800;
  background: #fff;
  border-bottom: 1px solid #e3e8f0;
}

.mini-content {
  display: flex;
  flex-direction: column;
  height: 566px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 0;
  }
}

.canvas-fab-layer {
  position: absolute;
  left: 0;
  right: 0;
  top: 44px;
  bottom: 0;
  z-index: 40;
  pointer-events: none;
}

.canvas-fab-layer :deep(.fab-only-wrap) {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.canvas-fab-layer :deep(.float-fab) {
  pointer-events: auto;
}

.canvas-fab-layer :deep(.fab-only-wrap.selected .float-fab) {
  outline: 2px solid #1769ff;
  outline-offset: 2px;
}

.canvas-item-wrap {
  cursor: grab;
  transition: opacity 0.12s ease;

  &.dragging {
    opacity: 0.35;
  }

  &:active {
    cursor: grabbing;
  }
}

/* B2：拖拽落点指示线 */
.drop-indicator {
  height: 0;
  margin: 0 10px;
  background: var(--brand, #1769ff);
  border-radius: 2px;
  opacity: 0;
  transition: height 0.1s ease, opacity 0.1s ease, margin 0.1s ease;

  &.visible {
    height: 3px;
    margin: 3px 10px;
    opacity: 1;
    box-shadow: 0 0 0 3px rgba(23, 105, 255, 0.15);
  }
}

.empty-canvas {
  margin: 20px;
  padding: 34px 18px;
  color: #7b8798;
  font-size: 12px;
  text-align: center;
  background: #fff;
  border: 1px dashed #cfd8e6;
  border-radius: 12px;
  cursor: default;
  transition: border-color 0.12s ease, background 0.12s ease;

  &.drag-hover {
    background: var(--brand-soft, #eaf1ff);
    border-color: var(--brand, #1769ff);
    border-style: solid;
  }
}

.empty-title {
  margin-bottom: 6px;
  color: #172033;
  font-size: 15px;
  font-weight: 800;
}

.empty-desc {
  color: #8a94a6;
  font-size: 12px;
}
</style>
