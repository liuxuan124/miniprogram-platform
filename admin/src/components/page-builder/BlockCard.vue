<template>
  <div
    class="block-card"
    :class="{ dragging: isDragging }"
    draggable="true"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
    @click="$emit('insert')"
  >
    <div class="block-card__thumb">
      <!-- 已有封面（我的区块）直接用图；内置区块用真实 renderer 现渲染 -->
      <img v-if="block.thumbnail" :src="block.thumbnail" :alt="block.name" />
      <BlockThumbnail
        v-else
        :nodes="previewNodes"
        :width="THUMB_WIDTH"
        :height="THUMB_HEIGHT"
      />
      <span v-if="block.isPageTemplate" class="block-card__tag">整页</span>
      <span v-else-if="block.isCustom" class="block-card__tag block-card__tag--custom">我的</span>
    </div>

    <div class="block-card__meta">
      <b :title="block.name">{{ block.name }}</b>
      <span class="block-card__count">含 {{ nodeCount }} 个组件</span>
      <span v-if="block.description" class="block-card__desc" :title="block.description">
        {{ block.description }}
      </span>
    </div>

    <button
      v-if="block.isCustom"
      class="block-card__del"
      type="button"
      aria-label="删除该区块"
      @click.stop="$emit('remove')"
    >
      <MiniIcon name="x" :size="13" />
    </button>

    <!-- 悬浮 300ms 后弹出 1:1 手机画幅预览 -->
    <Teleport to="body">
      <div
        v-if="previewOpen"
        class="block-preview-drawer"
        :style="drawerStyle"
        @mouseenter="keepOpen"
        @mouseleave="onLeave"
      >
        <div class="block-preview-drawer__head">
          <b>{{ block.name }}</b>
          <span>{{ nodeCount }} 个组件 · 375px 画幅</span>
        </div>
        <div class="block-preview-drawer__phone">
          <BlockThumbnail :nodes="previewNodes" :width="375" :height="600" />
        </div>
        <div class="block-preview-drawer__foot">点击卡片即可解组插入画布</div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import type { ComponentInstance } from '@/types/page'
import BlockThumbnail from './BlockThumbnail.vue'
import MiniIcon from '@/components/mini/MiniIcon.vue'
import { DRAG_SOURCE_BLOCK, type BlockDragPayload } from './blockDrag'

const THUMB_WIDTH = 148
const THUMB_HEIGHT = 186
const HOVER_DELAY = 300

const props = defineProps<{
  block: {
    key: string
    name: string
    description?: string
    thumbnail?: string
    isCustom?: boolean
    isPageTemplate?: boolean
  }
  /** 已实例化的组件树（缩略图与预览共用，保证所见即所得） */
  previewNodes: ComponentInstance[]
  nodeCount: number
}>()

const emit = defineEmits<{ insert: []; remove: [] }>()

const previewOpen = ref(false)
const isDragging = ref(false)
const anchor = ref({ x: 0, y: 0, w: 0, h: 0 })
let hoverTimer: ReturnType<typeof setTimeout> | null = null

/** 预览浮层贴在卡片右侧；空间不足时自动翻到左侧 */
const drawerStyle = computed(() => {
  const gap = 12
  const drawerW = 375 + 32
  const flip = anchor.value.x + anchor.value.w + gap + drawerW > window.innerWidth
  const left = flip
    ? Math.max(8, anchor.value.x - drawerW - gap)
    : anchor.value.x + anchor.value.w + gap
  const top = Math.max(8, Math.min(anchor.value.y, window.innerHeight - 660))
  return { left: `${left}px`, top: `${top}px` }
})

function onEnter(event: MouseEvent) {
  const el = event.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  anchor.value = { x: rect.left, y: rect.top, w: rect.width, h: rect.height }
  if (hoverTimer) clearTimeout(hoverTimer)
  hoverTimer = setTimeout(() => {
    previewOpen.value = true
  }, HOVER_DELAY)
}

function keepOpen() {
  if (hoverTimer) clearTimeout(hoverTimer)
}

function onLeave() {
  if (hoverTimer) clearTimeout(hoverTimer)
  previewOpen.value = false
}

function onDragStart(event: DragEvent) {
  isDragging.value = true
  const payload: BlockDragPayload = { key: props.block.key }
  event.dataTransfer?.setData(DRAG_SOURCE_BLOCK, JSON.stringify(payload))
  event.dataTransfer?.setData('text/plain', props.block.name)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy'
}

function onDragEnd() {
  isDragging.value = false
}

onBeforeUnmount(() => {
  if (hoverTimer) clearTimeout(hoverTimer)
})
</script>

<style scoped>
.block-card {
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #fff;
  border: 1px solid var(--pc-line, #e8e0d6);
  border-radius: 10px;
  cursor: grab;
  transition: 0.15s;
}

.block-card:hover {
  border-color: var(--pc-acc, #c08e6e);
  box-shadow: 0 4px 14px rgba(120, 90, 60, 0.12);
}

.block-card:active {
  cursor: grabbing;
}

.block-card.dragging {
  opacity: 0.5;
}

.block-card__thumb {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 186px;
  overflow: hidden;
  background: #f4f1ec;
  border-bottom: 1px solid var(--pc-line, #e8e0d6);
}

.block-card__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.block-card__tag {
  position: absolute;
  top: 6px;
  left: 6px;
  padding: 1px 6px;
  color: #8a3208;
  font-size: 10px;
  font-weight: 700;
  background: rgba(255, 244, 230, 0.94);
  border-radius: 4px;
}

.block-card__tag--custom {
  color: #2f6b4f;
  background: rgba(232, 247, 238, 0.94);
}

.block-card__meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 9px 9px;

  b {
    overflow: hidden;
    color: var(--pc-ink, #2a1f17);
    font-size: 13px;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.block-card__count {
  color: var(--pc-acc, #c08e6e);
  font-size: 11px;
  font-weight: 600;
}

.block-card__desc {
  overflow: hidden;
  color: var(--pc-faint, #a99c8e);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.block-card__del {
  position: absolute;
  top: 6px;
  right: 6px;
  display: inline-flex;
  padding: 3px;
  color: #fff;
  background: rgba(60, 45, 35, 0.55);
  border: 0;
  border-radius: 5px;
  cursor: pointer;
  opacity: 0;
  transition: 0.15s;
}

.block-card:hover .block-card__del {
  opacity: 1;
}

.block-card__del:hover {
  background: #a52a1e;
}
</style>

<style>
/* 预览浮层 Teleport 到 body，不带 scoped —— 需作用在 body 下 */
.block-preview-drawer {
  position: fixed;
  z-index: 3200;
  width: 407px;
  padding: 12px;
  background: #fff;
  border: 1px solid #e0d6c9;
  border-radius: 12px;
  box-shadow: 0 12px 40px rgba(60, 40, 20, 0.18);
}

.block-preview-drawer__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;

  b {
    color: #2a1f17;
    font-size: 14px;
  }

  span {
    color: #9b8b7c;
    font-size: 11px;
  }
}

.block-preview-drawer__phone {
  overflow: hidden;
  border: 1px solid #e8e0d6;
  border-radius: 10px;
}

.block-preview-drawer__foot {
  margin-top: 10px;
  color: #9b8b7c;
  font-size: 11px;
  text-align: center;
}
</style>
