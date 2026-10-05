<template>
  <div ref="canvasRootEl" class="prototype-canvas" :class="`prototype-canvas--shell-${shellMode}`">
    <!-- 画布控制条：设备切换 / 缩放 / 外壳样式 / 热力，统一收归到画布正上方居中 -->
    <div class="canvas-controls">
      <div ref="devicePickerEl" class="device-picker">
        <button
          type="button"
          class="device-picker__btn"
          :class="{ 'is-open': deviceMenuOpen }"
          :aria-expanded="deviceMenuOpen"
          aria-haspopup="listbox"
          @click="deviceMenuOpen = !deviceMenuOpen"
        >
          <el-icon class="device-picker__icon"><Iphone /></el-icon>
          <span class="device-picker__name">{{ device.label }}</span>
          <span class="device-picker__size">{{ device.width }}×{{ device.height }}</span>
          <span class="device-picker__caret" aria-hidden="true">▾</span>
        </button>
        <div v-if="deviceMenuOpen" class="device-picker__menu" role="listbox" aria-label="选择预览设备">
          <div v-for="group in PREVIEW_GROUPS" :key="group.key" class="device-picker__group">
            <div class="device-picker__group-title">{{ group.label }}</div>
            <button
              v-for="item in getPreviewGroupDevices(group.key)"
              :key="item.key"
              type="button"
              role="option"
              :aria-selected="item.key === deviceKey"
              class="device-picker__item"
              :class="{ 'is-on': item.key === deviceKey }"
              @click="selectDevice(item.key)"
            >
              <span class="device-picker__item-head">
                <b>{{ item.label }}</b>
                <em>{{ item.width }}×{{ item.height }}</em>
              </span>
              <span v-if="item.aliases" class="device-picker__item-alias">{{ item.aliases }}</span>
            </button>
          </div>
          <p class="device-picker__foot">
            尺寸为逻辑像素（rpx 按此换算）；括号内机型与其逻辑宽相同，布局表现一致。
          </p>
        </div>
      </div>

      <div class="canvas-controls__divider" aria-hidden="true"></div>

      <div class="zoom-controls" role="group" aria-label="缩放">
        <button
          v-for="level in ZOOM_LEVELS"
          :key="level"
          class="zoom-btn"
          :class="{ active: zoom === level }"
          :aria-pressed="zoom === level"
          @click="zoom = level"
        >{{ Math.round(level * 100) }}%</button>
      </div>

      <div class="canvas-controls__divider" aria-hidden="true"></div>

      <!-- 外壳样式：无框纯净 / 极简线条 -->
      <div class="shell-switch" role="group" aria-label="手机外壳样式">
        <button
          v-for="opt in SHELL_MODES"
          :key="opt.value"
          type="button"
          class="shell-switch__btn"
          :class="{ 'is-on': shellMode === opt.value }"
          :aria-pressed="shellMode === opt.value"
          :title="opt.hint"
          @click="setShellMode(opt.value)"
        >
          <span class="shell-switch__glyph" :class="`shell-switch__glyph--${opt.value}`" aria-hidden="true"></span>
          <span>{{ opt.label }}</span>
        </button>
      </div>

      <button
        class="zoom-btn zoom-btn--wide"
        :class="{ active: heatMode }"
        :aria-pressed="heatMode"
        title="组件点击热力"
        @click="toggleHeatMode"
      >热力</button>
    </div>

    <!-- 数据来源提示：降为一行极轻文字，不再抢控制条的位置 -->
    <div class="canvas-meta">
      <span class="canvas-meta__title">
        {{ warmPreview.enabled ? '暖阁首页预览' : `画布预览 · ${device.width}×${device.height}` }}
      </span>
      <span v-if="hydrating" class="canvas-meta__device">同步预览数据…</span>
      <span v-else class="canvas-meta__device canvas-meta__device--plain">与小程序同源数据预览</span>
    </div>

    <div v-if="heatMode && heatLoaded && !heatHasData" class="heat-empty-tip">
      暂无热力数据，请上线后在「增长」模块采集后再查看。
    </div>
    <!-- 缩放不改变文档流占位尺寸，用等比容器包裹避免 scale>1 时视觉溢出压住下方缩放条 -->
    <div class="phone-scale-wrap">
      <div
        class="phone"
        :class="{ 'phone--brand-header': hasBrandHeader }"
        :style="phoneStyle"
      >
      <div
        v-if="!hasBrandHeader && showNotch"
        class="phone-notch"
        :class="`phone-notch--${device.notch}`"
        :style="{ height: `${device.notchHeight}px` }"
      >
        <div v-if="device.notch === 'island'" class="phone-island"></div>
        <div v-else-if="device.notch === 'punch'" class="phone-punch"></div>
        <div v-else class="phone-status-bar">
          <span class="phone-status-bar__time">9:41</span>
          <span class="phone-status-bar__right">
            <span class="phone-status-bar__signal" aria-hidden="true"></span>
            <span class="phone-status-bar__battery" aria-hidden="true"></span>
          </span>
        </div>
      </div>
      <div
        class="phone-screen"
        :class="{ 'phone-screen--brand-header': hasBrandHeader }"
        :style="{ height: `${screenHeight}px` }"
      >
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
          :style="{
            height: `${contentHeight}px`,
            background: canvasBackgroundCss,
          }"
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
                    @save-as-block="openSaveBlockDialog"
                    @focus-seg="handleFocusSeg(comp.id, $event)"
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
        <!-- 底部渐隐融合遮罩：悬浮于内容流上方、悬浮按钮层（z-40）之下；pointer-events:none 不阻断画布交互 -->
        <div
          v-if="canvasOverlay.enabled"
          class="canvas-bottom-overlay"
          :style="{
            height: `${canvasOverlay.height}px`,
            background: `linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, ${canvasOverlay.resolvedColor} 100%)`,
          }"
        ></div>
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

    <div class="canvas-shortcuts">Delete 删除 · Ctrl/⌘D 复制 · Ctrl/⌘Z 撤销</div>

    <!-- 另存为区块：把画布里排好的容器沉淀成可复用区块 -->
    <SaveBlockDialog
      v-model="saveBlockDialogOpen"
      :nodes="saveBlockNodes"
      :default-name="saveBlockDefaultName"
      @save="onSaveBlock"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject, onMounted, onBeforeUnmount, provide, watch, nextTick, type Ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Iphone } from '@element-plus/icons-vue'
import { usePageStore } from '@/stores/page'
import { ComponentType, type ComponentInstance } from '@/types/page'
import { loadMyBlocks } from '@/utils/myBlocksStorage'
import {
  normalizePageBackground,
  backgroundToCss,
  normalizeBottomOverlay,
} from '@/utils/page-background'
import ComponentItem from './ComponentItem.vue'
import SaveBlockDialog from './SaveBlockDialog.vue'
import { DRAG_SOURCE_BLOCK, MY_BLOCK_PREFIX, parseBlockDragPayload } from './blockDrag'
import { builtinBlockByKey, countInstanceNodes, pruneUnavailableNodes, unpackBlock, type BlockCategory } from './blockTemplates'
import { isBlockTypeUsable } from './blockAvailability'
import { getComponentDef } from './componentRegistry'
import { saveMyBlock } from '@/utils/myBlocksStorage'
import WarmTabPreview from './renderers/warm/WarmTabPreview.vue'
import {
  useWarmHomePreview,
  WARM_PREVIEW_VIEW_KEY,
  WARM_PREVIEW_ENABLED_KEY,
  WARM_PREVIEW_ON_SEG_KEY,
} from '@/composables/useWarmHomePreview'
import { useCanvasHydratedPreview } from '@/composables/useCanvasHydratedPreview'
import { isCanvasShortcutBlocked } from '@/utils/editorKeyboardGuard'
import { useEditorDeleteUndo } from '@/composables/useEditorDeleteUndo'
import { onEditorScrollToComponent, requestEditorScrollToComponent } from '@/utils/editorScrollBus'
import { usePinnedBrandHeader, estimateBrandHeaderHeight } from './composables/usePinnedBrandHeader'
import { useMeasuredElementHeight } from './composables/useMeasuredElementHeight'
import {
  PREVIEW_GROUPS,
  DEFAULT_PREVIEW_DEVICE_KEY,
  resolvePreviewDevice,
  getPreviewGroupDevices,
} from '@/constants/previewDevices'
import { get } from '@/api/request'

const pageStore = usePageStore()
const { deleteWithUndo } = useEditorDeleteUndo()
const warmPreview = useWarmHomePreview(
  computed(() => pageStore.components),
  computed(() => pageStore.pageConfig.path),
)
provide(WARM_PREVIEW_VIEW_KEY, warmPreview.warmView)
provide(WARM_PREVIEW_ENABLED_KEY, warmPreview.enabled)
provide(WARM_PREVIEW_ON_SEG_KEY, warmPreview.onSeg)

const { displayComponents, hydrating } = useCanvasHydratedPreview(
  computed(() => pageStore.dsl),
  computed(() => pageStore.components),
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

/** 画布背景：solid → 纯色；gradient → linear-gradient（属性面板改动毫秒级响应） */
const canvasBackgroundCss = computed(() => backgroundToCss(normalizePageBackground(pageStore.pageConfig)))

/** 底部渐隐遮罩（auto 颜色已解析为背景终点色） */
const canvasOverlay = computed(() => normalizeBottomOverlay(pageStore.pageConfig))

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
const ZOOM_LEVELS = [0.75, 1, 1.25]
const zoom = ref(1)

/** 设备档位：小程序 rpx 基准是屏幕宽，装修器必须按机型宽高渲染才能暴露换行/留白问题 */
const DEVICE_KEY_STORAGE = 'wb.builder.canvas.device'
const deviceKey = ref<string>(DEFAULT_PREVIEW_DEVICE_KEY)
const device = computed(() => resolvePreviewDevice(deviceKey.value))

/* ============ 手机外壳样式：无框纯净 / 极简线条 ============ */
type ShellMode = 'none' | 'line'
const SHELL_MODES: Array<{ value: ShellMode; label: string; hint: string }> = [
  { value: 'none', label: '无框', hint: '纯净模式：去掉机身黑边与刘海，只看内容本身' },
  { value: 'line', label: '线条', hint: '极简线条：1px 细线勾边 + 状态条，保留机身轮廓提示' },
]
const SHELL_MODE_STORAGE = 'wb.builder.canvas.shell'
const shellMode = ref<ShellMode>('line')

function setShellMode(mode: ShellMode) {
  shellMode.value = mode
  try {
    localStorage.setItem(SHELL_MODE_STORAGE, mode)
  } catch {
    // 隐私模式下不可写时静默降级，仅本次会话生效
  }
}

/** 内容区顶部固定占位：无品牌头时含 mini-top 标题条（44px），有品牌头时为 0 */
const TOP_BAR_HEIGHT = 44
/** 无框模式隐藏刘海区（机身只剩内容）；线条模式用状态条代替粗黑刘海 */
const showNotch = computed(() => shellMode.value !== 'none' && device.value.notch !== 'none')
const screenHeight = computed(() => {
  // 品牌头场景下刘海不占位，屏幕整体上移，屏高补上刘海高度保持总机身高度稳定
  return hasBrandHeader.value ? device.value.height + device.value.notchHeight * (showNotch.value ? 1 : 0) : device.value.height
})
const contentHeight = computed(() =>
  Math.max(200, screenHeight.value - (hasBrandHeader.value ? 0 : TOP_BAR_HEIGHT)),
)

/**
 * 机身外框：宽高直接用设备逻辑像素（1:1 还原真机的 CSS 视口），
 * 仅在 iPad 这类超宽机型超出中栏可用宽度时按比例收窄，保证不横向溢出。
 */
const CANVAS_HORIZONTAL_PADDING = 48
const canvasAvailableWidth = ref(0)
const fitScale = computed(() => {
  if (canvasAvailableWidth.value <= 0) return 1
  const avail = canvasAvailableWidth.value - CANVAS_HORIZONTAL_PADDING
  if (avail <= 0) return 1
  return Math.min(1, avail / device.value.width)
})
const phoneStyle = computed(() => {
  const d = device.value
  const mode = shellMode.value
  /**
   * 机身框必须用 outline 而不是 border。
   * 全局 `* { box-sizing: border-box }`，border 会从 width 里扣：
   * `width: 393px` + `border: 9px` → 屏幕只剩 375px，rpx 换算全错。
   * outline 在 border box 之外绘制、不参与布局，屏幕拿到的是完整的 d.width。
   * outline-offset 保持 0（默认）—— 负值会把描边拉回框内盖住屏幕顶部。
   */
  const radius = mode === 'none' ? 0 : d.radius
  return {
    width: `${d.width}px`,
    borderRadius: `${radius}px`,
    // 无框模式完全去掉描边；线条模式 1px 细线；平板档位稍粗一点以保留机身感
    ...(mode === 'none' || radius <= 0
      ? {}
      : {
          outline: `${mode === 'line' ? 1 : d.width >= 700 ? 12 : 9}px solid ${mode === 'line' ? 'rgba(42,31,23,0.16)' : '#1e1611'}`,
        }),
    zoom: zoom.value * fitScale.value,
  }
})

const canvasRootEl = ref<HTMLElement | null>(null)
const devicePickerEl = ref<HTMLElement | null>(null)
const deviceMenuOpen = ref(false)

function selectDevice(key: string) {
  deviceKey.value = key
  deviceMenuOpen.value = false
  try {
    localStorage.setItem(DEVICE_KEY_STORAGE, key)
  } catch {
    // 隐私模式下 localStorage 不可写时静默降级，仅本次会话生效
  }
}

function onDocumentPointerDown(event: MouseEvent) {
  if (!deviceMenuOpen.value) return
  const target = event.target as Node | null
  if (devicePickerEl.value && target && !devicePickerEl.value.contains(target)) {
    deviceMenuOpen.value = false
  }
}

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

  // 区块拖拽：解包成整棵组件树后批量插入（单条历史快照 → Ctrl/⌘Z 一步撤回整个区块）
  const blockPayload = parseBlockDragPayload(event.dataTransfer?.getData(DRAG_SOURCE_BLOCK))
  if (blockPayload) {
    insertDroppedBlock(blockPayload.key, insertAt)
    return
  }

  const type = event.dataTransfer?.getData('componentType') as ComponentType
  if (type) {
    const created = pageStore.addComponent(type, insertAt)
    if (created?.id) requestEditorScrollToComponent(created.id)
  }
}

/** 解析拖入的区块（内置 registry key 或 my:<id>）并插入画布 */
function insertDroppedBlock(key: string, insertAt: number) {
  let nodes: ComponentInstance[] = []
  let label = ''

  if (key.startsWith(MY_BLOCK_PREFIX)) {
    const id = key.slice(MY_BLOCK_PREFIX.length)
    const saved = loadMyBlocks().find((b) => b.id === id)
    if (!saved) {
      ElMessage.warning('该区块已被删除，请刷新面板后重试')
      return
    }
    nodes = unpackBlock(saved)
    label = saved.name
  } else {
    const block = builtinBlockByKey(key)
    if (!block) return
    // 与左侧面板同口径：摘掉功能开关关闭的组件节点，区块本身保留
    const { nodes: schema } = pruneUnavailableNodes(block.schema, (t) => isBlockTypeUsable(t))
    if (!schema.length) {
      ElMessage.warning('该区块的组件在当前方案下均不可用')
      return
    }
    nodes = unpackBlock({ ...block, schema })
    label = block.name
  }

  if (!nodes.length) return
  const inserted = pageStore.insertComponentBatch(nodes, insertAt)
  if (!inserted.length) return
  ElMessage.success(`已插入「${label}」的 ${countInstanceNodes(nodes)} 个组件`)
  requestEditorScrollToComponent(inserted[0].id)
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

/**
 * 画布内点了分段标签 → 选中该组件并通知属性面板滚到对应配置项。
 * 顺带切到「内容」页签：分段配置只存在于内容页签，停在样式页签会像「点了没反应」。
 */
function handleFocusSeg(componentId: string, segKey: string) {
  if (pageStore.selectedComponentId !== componentId) {
    pageStore.selectComponent(componentId)
  }
  pageStore.focusFromCanvas(segKey)
}

function handleDeleteComponent(comp: { id: string; type: ComponentType }) {
  deleteWithUndo(comp as any)
}

/* ------------------------------------------------------------------ *
 * 另存为区块
 * ------------------------------------------------------------------ */

const saveBlockDialogOpen = ref(false)
const saveBlockNodes = ref<ComponentInstance[]>([])
const saveBlockDefaultName = ref('')

/** 打开弹窗：取当前选中组件的完整子树（容器 + 所有子组件） */
function openSaveBlockDialog() {
  const selected = pageStore.selectedComponent
  if (!selected) {
    ElMessage.warning('请先选中要保存的容器组件')
    return
  }
  const label = getComponentDef(selected.type)?.label ?? selected.type
  saveBlockNodes.value = [JSON.parse(JSON.stringify(selected)) as ComponentInstance]
  saveBlockDefaultName.value = `${label}区`
  saveBlockDialogOpen.value = true
}

function onSaveBlock(payload: {
  name: string
  category: BlockCategory
  description?: string
  thumbnail: string
  nodes: ComponentInstance[]
}) {
  const row = saveMyBlock(payload)
  saveBlockDialogOpen.value = false
  ElMessage.success(`已保存「${row.name}」，可在「区块模板 › 我的区块」中复用`)
  // 通知左侧面板热更新列表
  window.dispatchEvent(new CustomEvent('pagebuilder:my-blocks-changed'))
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
let canvasResizeObserver: ResizeObserver | null = null

function measureCanvasWidth() {
  const el = canvasRootEl.value
  if (!el) return
  canvasAvailableWidth.value = el.clientWidth
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  document.addEventListener('mousedown', onDocumentPointerDown)

  // 恢复上次选择的设备档位
  try {
    const saved = localStorage.getItem(DEVICE_KEY_STORAGE)
    if (saved && saved === resolvePreviewDevice(saved).key) {
      deviceKey.value = saved
    }
    const savedShell = localStorage.getItem(SHELL_MODE_STORAGE)
    if (savedShell === 'none' || savedShell === 'line') {
      shellMode.value = savedShell
    }
  } catch {
    // 读取失败用默认档位即可
  }

  nextTick(measureCanvasWidth)
  if (typeof ResizeObserver !== 'undefined' && canvasRootEl.value) {
    canvasResizeObserver = new ResizeObserver(measureCanvasWidth)
    canvasResizeObserver.observe(canvasRootEl.value)
  }

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
  document.removeEventListener('mousedown', onDocumentPointerDown)
  canvasResizeObserver?.disconnect()
  canvasResizeObserver = null
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
  padding: 14px 0 52px;
}

/* ============ 画布控制条：设备 / 缩放 / 外壳 / 热力，吸附在画布顶部居中 ============ */
.canvas-controls {
  position: sticky;
  top: 8px;
  z-index: 30;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  margin-bottom: 10px;
  padding: 4px 6px;
  background: rgb(255 255 255 / 88%);
  border: 1px solid var(--wb-line, #e8dfd3);
  border-radius: 11px;
  box-shadow: 0 2px 10px rgb(42 31 23 / 7%);
  backdrop-filter: blur(10px) saturate(1.3);
}

.canvas-controls__divider {
  width: 1px;
  height: 18px;
  margin: 0 1px;
  background: var(--wb-line, #e8dfd3);
}

/* 设备档位选择器 */
.device-picker {
  position: relative;
}

.device-picker__icon {
  font-size: 13px;
  color: var(--wb-mute, #6b5b4e);
}

.device-picker__btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 26px;
  padding: 0 7px;
  color: #2a1f17;
  font-family: inherit;
  font-size: 12px;
  background: transparent;
  border: 0;
  border-radius: 7px;
  cursor: pointer;
  transition: background 0.14s ease;

  &:hover {
    background: var(--wb-soft, #f7f3ec);
  }

  &.is-open {
    background: color-mix(in srgb, var(--el-color-primary, #c08e6e) 10%, #fff);
  }
}

.device-picker__name {
  font-weight: 600;
}

.device-picker__size {
  color: var(--wb-faint, #7a6a5c);
  font-variant-numeric: tabular-nums;
}

.device-picker__caret {
  font-size: 10px;
  line-height: 1;
  color: var(--wb-faint, #7a6a5c);
}

.device-picker__menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 60;
  width: 268px;
  max-height: min(70vh, 560px);
  padding: 4px;
  overflow-y: auto;
  background: var(--bg-elevated, #fff);
  border: 1px solid var(--border, #e3e8f0);
  border-radius: var(--radius-lg, 12px);
  box-shadow: var(--shadow-md, 0 4px 12px rgba(15, 23, 42, 0.12));
}

.device-picker__group + .device-picker__group {
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px solid var(--border, #eef2f7);
}

.device-picker__group-title {
  padding: 5px 9px 3px;
  color: #94a3b8;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.device-picker__item {
  display: flex;
  flex-direction: column;
  gap: 1px;
  width: 100%;
  padding: 6px 9px;
  text-align: left;
  font-family: inherit;
  background: transparent;
  border: 0;
  border-radius: var(--radius-sm, 6px);
  cursor: pointer;

  &:hover {
    background: var(--brand-soft, #eaf1ff);
  }

  &.is-on {
    background: var(--brand-soft, #eaf1ff);

    .device-picker__item-head b {
      color: var(--brand, var(--color-primary));
    }
  }
}

.device-picker__item-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;

  b {
    color: #172033;
    font-size: 12px;
    font-weight: 600;
  }

  em {
    color: #8a94a6;
    font-size: 11px;
    font-style: normal;
    font-variant-numeric: tabular-nums;
  }
}

/* 同宽代表机型：说明为什么这一档能代表多款真机 */
.device-picker__item-alias {
  color: #94a3b8;
  font-size: 10.5px;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.device-picker__foot {
  margin: 4px 2px 0;
  padding: 6px 7px 2px;
  color: #a3adbd;
  font-size: 10px;
  line-height: 1.5;
  border-top: 1px solid var(--border, #eef2f7);
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

.canvas-meta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
  width: min(100%, 560px);
  margin-bottom: 12px;
  color: var(--wb-faint, #7a6a5c);
  font-size: 11.5px;
}

.canvas-meta__title {
  color: var(--wb-mute, #6b5b4e);
  font-weight: 600;
}

.canvas-meta__device {
  padding: 2px 7px;
  background: rgb(255 255 255 / 70%);
  border: 1px solid var(--wb-line, #e8dfd3);
  border-radius: 999px;
}

.canvas-meta__device--plain {
  color: var(--wb-faint, #7a6a5c);
  background: transparent;
  border-color: transparent;
  padding: 0;
}

.phone-scale-wrap {
  position: relative;
  flex-shrink: 0;
}

/**
 * 机身外框。宽高/圆角/描边全由 phoneStyle 内联控制（随设备档位变），
 * 这里只保留不随设备变的属性。
 * 描边用 outline 而非 border —— 见 phoneStyle 注释：border 会被 border-box 扣掉宽度。
 */
.phone {
  width: 320px;
  overflow: hidden;
  background: #fffbf6;
  box-shadow: none;
  transition: zoom 0.15s ease;
}

/* 无框模式：去掉描边后用一层极轻投影把内容「托」起来，避免和画布底色糊在一起 */
.prototype-canvas--shell-none .phone {
  border-radius: 10px !important;
  box-shadow: 0 2px 16px rgb(42 31 23 / 8%);
}

/* 线条模式：细线勾边 + 极轻投影，克制的机身感 */
.prototype-canvas--shell-line .phone {
  box-shadow: 0 1px 8px rgb(42 31 23 / 5%);
}

.phone--brand-header {
  overflow: hidden;
}

.canvas-shortcuts {
  align-self: flex-start;
  margin: 10px 0 0 18px;
  color: #a9b3c2;
  font-size: 11px;
}

/* 缩放档位：控制条内的一组小按钮，选中用「白底 + 主色字」而非实心大色块 */
.zoom-controls {
  display: flex;
  gap: 1px;
  padding: 2px;
  background: var(--wb-soft, #f4efe8);
  border-radius: 8px;
}

.zoom-btn {
  min-width: 44px;
  height: 22px;
  padding: 0 8px;
  color: var(--wb-mute, #6b5b4e);
  font-family: inherit;
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
  background: transparent;
  border: 0;
  border-radius: 6px;
  cursor: pointer;
  transition: color 0.14s, background 0.14s;

  &:hover {
    color: var(--el-color-primary, #c08e6e);
  }

  &.active {
    color: var(--el-color-primary, #c08e6e);
    font-weight: 600;
    background: #fff;
    box-shadow: 0 1px 2px rgb(42 31 23 / 10%);
  }
}

.zoom-btn--wide {
  min-width: 0;
  padding: 0 10px;
  background: var(--wb-soft, #f4efe8);
}

/* 外壳样式切换：小图标 + 文字，比下拉更直观 */
.shell-switch {
  display: flex;
  gap: 1px;
  padding: 2px;
  background: var(--wb-soft, #f4efe8);
  border-radius: 8px;
}

.shell-switch__btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 22px;
  padding: 0 8px;
  color: var(--wb-mute, #6b5b4e);
  font-family: inherit;
  font-size: 11.5px;
  background: transparent;
  border: 0;
  border-radius: 6px;
  cursor: pointer;
  transition: color 0.14s, background 0.14s;

  &:hover {
    color: var(--el-color-primary, #c08e6e);
  }

  &.is-on {
    color: var(--el-color-primary, #c08e6e);
    font-weight: 600;
    background: #fff;
    box-shadow: 0 1px 2px rgb(42 31 23 / 10%);
  }
}

/* 图示：线条=细边框；无框=虚线暗示「没有机身」 */
.shell-switch__glyph {
  width: 11px;
  height: 11px;
  border-radius: 3px;
}

.shell-switch__glyph--line {
  border: 1px solid currentColor;
}

.shell-switch__glyph--none {
  border: 1px dashed currentColor;
  opacity: 0.7;
}

/* 刘海区：线条模式用浅底 + 状态条，替代原来一整条粗黑 */
.phone-notch {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 26px;
  background: #f2ede6;
  border-bottom: 1px solid rgb(42 31 23 / 5%);
}

/* 无刘海机型（SE3 等）在线条模式下也画一条状态栏，保持视觉节奏一致 */
.phone-status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0 14px;
  color: #6b5b4e;
  font-size: 10px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.phone-status-bar__right {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.phone-status-bar__signal {
  width: 11px;
  height: 7px;
  background:
    linear-gradient(to top, currentColor 0 100%) 0 100% / 2px 4px no-repeat,
    linear-gradient(to top, currentColor 0 100%) 3px 100% / 2px 6px no-repeat,
    linear-gradient(to top, currentColor 0 100%) 6px 100% / 2px 7px no-repeat;
  opacity: 0.65;
}

.phone-status-bar__battery {
  width: 14px;
  height: 7px;
  border: 1px solid currentColor;
  border-radius: 2px;
  opacity: 0.65;
}

/* 灵动岛：宽扁药丸，iPhone 系 */
.phone-island {
  width: 84px;
  height: 22px;
  background: #2a1f17;
  border-radius: 999px;
  opacity: 0.9;
}

/* 居中挖孔：小圆孔，安卓系 */
.phone-punch {
  width: 13px;
  height: 13px;
  background: #000;
  border-radius: 50%;
  opacity: 0.9;
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

/* 底部渐隐遮罩：内容流上方（z-30 < fab 层 z-40），不阻断拖拽/点选 */
.canvas-bottom-overlay {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 30;
  pointer-events: none;
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
    outline: 2px dashed var(--el-color-primary);
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
  background: var(--el-color-primary);
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
