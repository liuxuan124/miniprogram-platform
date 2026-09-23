<template>
  <div class="prototype-canvas">
    <div class="canvas-meta">
      <span class="canvas-meta__title">
        {{ warmPreview.enabled ? '暖阁首页预览' : '画布预览 · 375×812' }}
      </span>
      <div class="canvas-meta__right">
        <el-segmented
          v-model="canvasDataMode"
          size="small"
          :options="dataModeOptions"
        />
        <span v-if="hydrating" class="canvas-meta__device">同步列表数据…</span>
        <span v-else class="canvas-meta__device">
          {{ canvasDataMode === 'live' ? '真实数据' : '演示数据' }}
          <template v-if="warmPreview.enabled"> · 与小程序显示一致</template>
        </span>
      </div>
    </div>
    <div v-if="heatMode && heatLoaded && !heatHasData" class="heat-empty-tip">
      暂无热力数据，请上线后在「增长」模块采集后再查看。
    </div>
    <!-- 缩放不改变文档流占位尺寸，用等比容器包裹避免 scale>1 时视觉溢出压住下方缩放条 -->
    <div class="phone-scale-wrap">
      <div class="phone" :class="{ 'phone--brand-header': hasBrandHeader }" :style="{ zoom }">
      <div v-if="!hasBrandHeader" class="phone-notch">
        <div class="phone-speaker"></div>
      </div>
      <div class="phone-screen" :class="{ 'phone-screen--brand-header': hasBrandHeader }">
        <div class="mini-top" v-if="!hasBrandHeader">
          <span>{{ pageStore.pageConfig.name || '未命名页面' }}</span>
        </div>
        <div
          v-if="pinnedBrandHeader"
          ref="pinnedHeaderEl"
          class="canvas-pinned-brand-header"
        >
          <ComponentItem
            :component="pinnedBrandHeader"
            :index="pinnedBrandHeaderIndex"
            :selected="pinnedBrandHeader.id === pageStore.selectedComponentId"
            @select="pageStore.selectComponent(pinnedBrandHeader.id)"
            @delete="handleDeleteComponent(pinnedBrandHeader)"
            @copy="pageStore.duplicateComponent(pinnedBrandHeader.id)"
            @move-up="handleMoveUp(pinnedBrandHeaderIndex)"
            @move-down="handleMoveDown(pinnedBrandHeaderIndex)"
          />
        </div>
        <div
          ref="miniContentEl"
          class="mini-content"
          data-testid="canvas-drop-zone"
          :style="{ backgroundColor: pageStore.pageConfig.background_color || '#f6f8fb' }"
          @dragover.prevent="handleContainerDragOver"
          @dragleave="handleContainerDragLeave"
          @drop="handleContainerDrop"
        >
          <WarmTabPreview
            v-if="warmTabShellPath"
            :path="warmTabShellPath"
            :shell-props="warmTabShellProps"
          />
          <template v-else-if="canvasComponents.length">
            <template v-for="(comp, index) in canvasComponents" :key="comp.id">
              <template v-if="comp.type !== ComponentType.FloatButton">
                <div class="drop-indicator" :class="{ visible: dragOverIndex === index }"></div>
                <div
                  v-if="isPinnedBrandHeader(comp, index)"
                  class="brand-header-flow-spacer"
                  :style="{ height: `${pinnedBrandHeaderHeight}px` }"
                />
                <div
                  v-else
                  class="canvas-item-wrap"
                  :data-component-id="comp.id"
                  :class="{
                    dragging: draggingIndex === index,
                    'heat-on': heatMode,
                    'ai-highlight': isAiHighlighted(comp.id),
                  }"
                  :style="heatStyle(comp.id)"
                  draggable="true"
                  @dragstart="handleItemDragStart($event, index)"
                  @dragend="handleDragEnd"
                  @dragover.prevent.stop="handleItemDragOver($event, index)"
                  @drop.stop="handleItemDrop($event, index)"
                >
                  <div v-if="isAiHighlighted(comp.id)" class="ai-new-badge">AI 新增</div>
                  <div v-if="heatMode && heatMap[comp.id]" class="heat-badge">
                    {{ heatMap[comp.id].clicks || 0 }} 次点击
                  </div>
                  <ComponentItem
                    :component="comp"
                    :index="index"
                    :selected="comp.id === pageStore.selectedComponentId"
                    @select="pageStore.selectComponent(comp.id)"
                    @delete="handleDeleteComponent(comp)"
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
        <div v-if="floatEntries.length" class="canvas-fab-layer" :class="{ 'canvas-fab-layer--brand-header': hasBrandHeader }">
          <ComponentItem
            v-for="item in floatEntries"
            :key="`fab-${item.comp.id}`"
            :component="item.comp"
            :index="item.index"
            :selected="item.comp.id === pageStore.selectedComponentId"
            :fab-only="true"
            @select="pageStore.selectComponent(item.comp.id)"
            @delete="handleDeleteComponent(item.comp)"
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
        class="zoom-btn"
        :class="{ active: heatMode }"
        @click="toggleHeatMode"
      >热力</button>
      <button
        v-for="level in ZOOM_LEVELS"
        :key="level"
        class="zoom-btn"
        :class="{ active: zoom === level }"
        @click="zoom = level"
      >{{ Math.round(level * 100) }}%</button>
    </div>
    <div class="canvas-shortcuts">Delete 删除 · Ctrl/⌘D 复制 · Ctrl/⌘Z 撤销</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject, onMounted, onBeforeUnmount, provide, watch, type Ref } from 'vue'
import { usePageStore } from '@/stores/page'
import { ComponentType } from '@/types/page'
import ComponentItem from './ComponentItem.vue'
import WarmTabPreview from './renderers/warm/WarmTabPreview.vue'
import {
  useWarmHomePreview,
  WARM_PREVIEW_VIEW_KEY,
  WARM_PREVIEW_ENABLED_KEY,
  WARM_PREVIEW_ON_SEG_KEY,
  type WarmPreviewDataMode,
} from '@/composables/useWarmHomePreview'
import { useCanvasHydratedPreview, type CanvasPreviewDataMode } from '@/composables/useCanvasHydratedPreview'
import { isCanvasShortcutBlocked } from '@/utils/editorKeyboardGuard'
import { useEditorDeleteUndo } from '@/composables/useEditorDeleteUndo'
import { onEditorScrollToComponent, requestEditorScrollToComponent } from '@/utils/editorScrollBus'
import { usePinnedBrandHeader, estimateBrandHeaderHeight } from './composables/usePinnedBrandHeader'
import { useMeasuredElementHeight } from './composables/useMeasuredElementHeight'
import { get } from '@/api/request'

const pageStore = usePageStore()
const { deleteWithUndo } = useEditorDeleteUndo()
const canvasDataMode = ref<CanvasPreviewDataMode>('demo')
const dataModeOptions = [
  { label: '演示数据', value: 'demo' },
  { label: '真实数据', value: 'live' },
]

const warmPreview = useWarmHomePreview(
  computed(() => pageStore.components),
  computed(() => pageStore.pageConfig.path),
  canvasDataMode as Ref<WarmPreviewDataMode>,
)
provide(WARM_PREVIEW_VIEW_KEY, warmPreview.warmView)
provide(WARM_PREVIEW_ENABLED_KEY, warmPreview.enabled)
provide(WARM_PREVIEW_ON_SEG_KEY, warmPreview.onSeg)

const { displayComponents, hydrating } = useCanvasHydratedPreview(
  computed(() => pageStore.dsl),
  computed(() => pageStore.components),
  canvasDataMode,
)

const miniContentEl = ref<HTMLElement | null>(null)
let preservedScrollTop = 0

watch(
  () => pageStore.dsl,
  () => {
    preservedScrollTop = miniContentEl.value?.scrollTop ?? 0
  },
  { flush: 'pre', deep: true },
)

watch(displayComponents, () => {
  requestAnimationFrame(() => {
    if (miniContentEl.value != null) miniContentEl.value.scrollTop = preservedScrollTop
  })
})

const canvasComponents = computed(() => displayComponents.value)

const WARM_TAB_SHELL_TYPES = new Set([
  ComponentType.WarmDiscover,
  ComponentType.WarmPlanet,
  ComponentType.WarmShop,
  ComponentType.WarmMine,
])

const warmTabShellPath = computed(() => {
  const path = String(pageStore.pageConfig.path || '')
  const flow = pageStore.components.filter((c) => c.type !== ComponentType.FloatButton)
  if (flow.length !== 1) return ''
  if (!WARM_TAB_SHELL_TYPES.has(flow[0].type as ComponentType)) return ''
  return path
})

const warmTabShellProps = computed(() => {
  const flow = pageStore.components.filter((c) => c.type !== ComponentType.FloatButton)
  if (flow.length !== 1) return {}
  return flow[0].props || {}
})

const aiHighlightIds = inject<Ref<string[]>>('aiHighlightIds', ref([]))
function isAiHighlighted(id: string) {
  return aiHighlightIds.value.includes(id)
}

const {
  pinnedBrandHeader,
  pinnedBrandHeaderIndex,
  hasBrandHeader,
  isPinnedBrandHeader,
} = usePinnedBrandHeader(computed(() => pageStore.components))

const pinnedHeaderEl = ref<HTMLElement | null>(null)
const measuredPinnedHeight = useMeasuredElementHeight(
  pinnedHeaderEl,
  computed(() => !!pinnedBrandHeader.value),
)
const pinnedBrandHeaderHeight = computed(() => {
  if (!pinnedBrandHeader.value) return 0
  return measuredPinnedHeight.value || estimateBrandHeaderHeight(pinnedBrandHeader.value.props)
})

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

/** U3：组件热力叠加 */
const heatMode = ref(false)
const heatMap = ref<Record<string, { clicks: number; impressions: number }>>({})
const heatLoaded = ref(false)
const heatHasData = computed(() => Object.keys(heatMap.value).length > 0)
const heatMaxClicks = computed(() => {
  let max = 0
  Object.values(heatMap.value).forEach((r) => {
    if (r.clicks > max) max = r.clicks
  })
  return max || 1
})

function heatStyle(componentId: string) {
  if (!heatMode.value) return undefined
  const row = heatMap.value[componentId]
  if (!row) return { outline: '1px dashed rgba(120,120,120,0.25)' }
  const ratio = Math.min(1, row.clicks / heatMaxClicks.value)
  const alpha = 0.12 + ratio * 0.55
  return {
    background: `rgba(220, 38, 38, ${alpha})`,
    outline: `2px solid rgba(185, 28, 28, ${0.3 + ratio * 0.5})`,
    borderRadius: '8px',
  }
}

async function toggleHeatMode() {
  heatMode.value = !heatMode.value
  if (heatMode.value && !Object.keys(heatMap.value).length) {
    heatLoaded.value = false
    try {
      const res = await get<Array<{ componentId: string; clicks: number; impressions: number }>>(
        '/api/v1/admin/growth/component-heat',
        { days: 7 },
      )
      const list = (res as any)?.data || []
      const map: Record<string, { clicks: number; impressions: number }> = {}
      ;(Array.isArray(list) ? list : []).forEach((row: any) => {
        if (row?.componentId) {
          map[String(row.componentId)] = {
            clicks: Number(row.clicks) || 0,
            impressions: Number(row.impressions) || 0,
          }
        }
      })
      heatMap.value = map
    } catch {
      heatMap.value = {}
    } finally {
      heatLoaded.value = true
    }
  }
}

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
    const created = pageStore.addComponent(type, insertAt)
    if (created?.id) requestEditorScrollToComponent(created.id)
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

function handleDeleteComponent(comp: { id: string; type: ComponentType }) {
  deleteWithUndo(comp as any)
}

/** B5：Delete 删除选中组件、Ctrl+D 复制选中组件 */
function handleKeydown(event: KeyboardEvent) {
  if (isCanvasShortcutBlocked(event)) return
  const selectedId = pageStore.selectedComponentId
  if (!selectedId) return

  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault()
    const target = pageStore.components.find((c) => c.id === selectedId)
    if (target) void handleDeleteComponent(target)
    return
  }

  const isMod = event.ctrlKey || event.metaKey
  if (isMod && event.key.toLowerCase() === 'd') {
    event.preventDefault()
    pageStore.duplicateComponent(selectedId)
  }
}

let offScrollBus: (() => void) | undefined

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  offScrollBus = onEditorScrollToComponent((componentId) => {
    const root = miniContentEl.value
    if (!root) return
    const target = root.querySelector(`[data-component-id="${componentId}"]`) as HTMLElement | null
    if (!target) return
    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  offScrollBus?.()
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
  gap: 12px;
  flex-wrap: wrap;
  width: min(100%, 520px);
  margin-bottom: 16px;
  color: #7b8798;
  font-size: 12px;
}

.canvas-meta__right {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.heat-empty-tip {
  width: min(100%, 520px);
  margin: -8px 0 12px;
  padding: 8px 12px;
  font-size: 12px;
  color: #92400e;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 8px;
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
  width: 320px;
  overflow: hidden;
  background: #fffbf6;
  border: 9px solid #1e1611;
  border-radius: 34px;
  box-shadow: none;
  transition: zoom 0.15s ease;
}

.phone--brand-header {
  overflow: hidden;
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
  bottom: 56px;
  align-self: flex-start;
  margin: -48px 0 0 18px;
  color: #94a3b8;
  font-size: 11px;
  z-index: 1;
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
    color: var(--brand, var(--color-primary));
    background: var(--brand-soft, #eaf1ff);
  }

  &.active {
    color: #fff;
    font-weight: 600;
    background: var(--brand, var(--color-primary));
  }
}

.phone-notch {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 26px;
  background: #1e1611;
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
  height: 612px;
  overflow: hidden;
  background: #fffbf6;
}

.phone-screen--brand-header .mini-content {
  height: 636px;
}

.canvas-pinned-brand-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 35;
}

.brand-header-flow-spacer {
  flex-shrink: 0;
  width: 100%;
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

  &.canvas-fab-layer--brand-header {
    top: 0;
  }
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
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.canvas-item-wrap {
  cursor: grab;
  transition: opacity 0.12s ease, background 0.2s ease;
  position: relative;

  &.dragging {
    opacity: 0.35;
  }

  &.heat-on {
    cursor: default;
  }

  &.ai-highlight {
    outline: 2px dashed #b4430f;
    outline-offset: 2px;
    border-radius: 4px;
  }

  &:active {
    cursor: grabbing;
  }
}

.ai-new-badge {
  position: absolute;
  top: 4px;
  left: 6px;
  z-index: 6;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  background: #b4430f;
  padding: 1px 7px;
  border-radius: 999px;
  pointer-events: none;
}

.heat-badge {
  position: absolute;
  top: 4px;
  right: 6px;
  z-index: 5;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(127, 29, 29, 0.85);
  color: #fff;
  font-size: 10px;
  line-height: 1.4;
  pointer-events: none;
}

/* B2：拖拽落点指示线 */
.drop-indicator {
  height: 0;
  margin: 0 10px;
  background: var(--brand, var(--color-primary));
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
    border-color: var(--brand, var(--color-primary));
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
