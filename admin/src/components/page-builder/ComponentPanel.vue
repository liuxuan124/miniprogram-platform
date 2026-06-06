<template>
  <div class="prototype-component-panel">
    <section class="panel-section" :style="sectionStyle('components')">
      <div class="section-title">
        <span>组件库</span>
        <button class="section-count" @click="toggleCollapse('components')">{{ totalComponentCount }}</button>
        <button class="section-toggle" @click="toggleCollapse('components')">
          {{ collapsed.components ? '展开' : '收起' }}
        </button>
      </div>
      <div v-show="!collapsed.components" class="component-grid">
        <template v-for="cat in categories" :key="cat.value">
          <div class="category-label">{{ cat.label }}</div>
          <button
            v-for="item in getComponentsByCategory(cat.value)"
            :key="item.type"
            class="component-card"
            :class="{ active: pageStore.selectedComponent?.type === item.type }"
            draggable="true"
            @dragstart="handleDragStart($event, item.type)"
            @click="handleAdd(item.type)"
          >
            <span class="component-icon"><el-icon :size="18"><component :is="iconMap[item.icon]" /></el-icon></span>
            <span>{{ item.label }}</span>
          </button>
        </template>
      </div>
    </section>

    <div
      v-show="!collapsed.components"
      class="resize-handle"
      title="拖动调整组件库高度"
      @mousedown="startResize('components', $event)"
    >
      <span></span>
    </div>

    <section class="panel-section structure-section" :class="{ collapsed: collapsed.structure }">
      <div class="section-title">
        <span>当前页面结构</span>
        <button class="section-count" @click="toggleCollapse('structure')">{{ pageStore.components.length }}</button>
        <button class="section-toggle" @click="toggleCollapse('structure')">
          {{ collapsed.structure ? '展开' : '收起' }}
        </button>
      </div>
      <div v-show="!collapsed.structure" class="structure-list">
        <div
          v-for="(comp, index) in pageStore.components"
          :key="comp.id"
          class="structure-row"
          :class="{ active: comp.id === pageStore.selectedComponentId }"
          @click="pageStore.selectComponent(comp.id)"
        >
          <span class="drag-handle">⠿</span>
          <span>{{ index + 1 }}. {{ getComponentDef(comp.type)?.label ?? comp.type }}</span>
          <button class="remove-btn" @click.stop="pageStore.removeComponent(comp.id)">×</button>
        </div>
        <div v-if="!pageStore.components.length" class="empty-tip">当前页面暂无组件</div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { usePageStore } from '@/stores/page'
import { ComponentType } from '@/types/page'
import { getComponentsByCategory, getAllCategories, getComponentDef } from './componentRegistry'
import * as ElementPlusIcons from '@element-plus/icons-vue'

const pageStore = usePageStore()
const componentSectionHeight = ref(520)
const collapsed = ref({
  components: false,
  structure: false,
})
const resizing = ref<{
  target: 'components'
  startY: number
  startHeight: number
} | null>(null)

const categories = getAllCategories()

const totalComponentCount = computed(() => {
  let count = 0
  for (const cat of categories) {
    count += getComponentsByCategory(cat.value).length
  }
  return count
})

/** Element Plus icon name → component map */
const iconMap: Record<string, any> = ElementPlusIcons

function handleDragStart(event: DragEvent, type: ComponentType) {
  event.dataTransfer?.setData('componentType', type)
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'copy'
  }
}

function handleAdd(type: ComponentType) {
  pageStore.addComponent(type)
  collapsed.value.structure = false
}

function toggleCollapse(target: 'components' | 'structure') {
  collapsed.value[target] = !collapsed.value[target]
}

function sectionStyle(target: 'components') {
  if (collapsed.value[target]) {
    return { height: '42px' }
  }
  return {
    height: `${componentSectionHeight.value}px`,
  }
}

function startResize(target: 'components', event: MouseEvent) {
  if (collapsed.value[target]) return
  resizing.value = {
    target,
    startY: event.clientY,
    startHeight: componentSectionHeight.value,
  }
  document.body.classList.add('is-panel-resizing')
  event.preventDefault()
}

function handleMouseMove(event: MouseEvent) {
  if (!resizing.value) return
  const delta = event.clientY - resizing.value.startY
  const nextHeight = resizing.value.startHeight + delta
  componentSectionHeight.value = clamp(nextHeight, 180, 640)
}

function handleMouseUp() {
  resizing.value = null
  document.body.classList.remove('is-panel-resizing')
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

onMounted(() => {
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', handleMouseUp)
})

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseup', handleMouseUp)
  document.body.classList.remove('is-panel-resizing')
})
</script>

<style lang="scss" scoped>
.prototype-component-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: #fff;
  border-right: 1px solid #e3e8f0;
}

.panel-section {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  min-height: 0;
  overflow: hidden;
}

.structure-section {
  flex: 1;

  &.collapsed {
    flex: 0 0 42px;
  }
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  padding: 10px 12px 8px;
  color: #7b8798;
  font-size: 12px;
  font-weight: 700;
  background: #fff;
  border-bottom: 1px solid #e3e8f0;

  span {
    flex: 1;
  }

  .section-count {
    min-width: 20px;
    padding: 1px 6px;
    color: #1769ff;
    font-family: inherit;
    font-size: 11px;
    text-align: center;
    background: #eaf2ff;
    border: 0;
    border-radius: 999px;
    cursor: pointer;
  }

  .section-toggle {
    padding: 0;
    color: #9aa4b5;
    font-family: inherit;
    font-size: 11px;
    background: transparent;
    border: 0;
    cursor: pointer;

    &:hover {
      color: #1769ff;
    }
  }
}

.resize-handle {
  position: relative;
  flex-shrink: 0;
  height: 10px;
  background: #f4f7fb;
  border-top: 1px solid #e3e8f0;
  border-bottom: 1px solid #e3e8f0;
  cursor: row-resize;

  span {
    position: absolute;
    top: 4px;
    left: 50%;
    width: 46px;
    height: 2px;
    background: #cbd5e1;
    border-radius: 999px;
    transform: translateX(-50%);
  }

  &:hover {
    background: #eaf2ff;

    span {
      background: #1769ff;
    }
  }
}

.empty-tip {
  padding: 10px;
  color: #9aa4b5;
  font-size: 12px;
  text-align: center;
}

.component-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-content: start;
  flex: 1;
  min-height: 0;
  gap: 6px;
  overflow-y: auto;
  padding: 8px;
}

.category-label {
  grid-column: 1 / -1;
  padding: 6px 2px 2px;
  color: #9aa4b5;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.component-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 4px;
  min-height: 54px;
  color: #7b8798;
  font-size: 12px;
  line-height: 1.2;
  text-align: center;
  background: #f8faff;
  border: 1px solid #e3e8f0;
  border-radius: 9px;
  cursor: pointer;
  transition: 0.15s;

  &:hover,
  &.active {
    color: #1769ff;
    font-weight: 700;
    background: #eaf2ff;
    border-color: #1769ff;
  }

  &:active {
    transform: scale(0.97);
  }
}

.component-icon {
  font-size: 18px;
  line-height: 1.1;
}

.structure-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px;
}

.structure-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  padding: 8px 9px;
  color: #7b8798;
  font-size: 13px;
  background: #fff;
  border: 1px solid #e3e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: 0.14s;

  &:hover,
  &.active {
    color: #1769ff;
    background: #eaf2ff;
    border-color: #1769ff;
  }
}

.drag-handle {
  color: #d0d8e4;
  font-size: 13px;
}

.remove-btn {
  margin-left: auto;
  color: #c0c9d8;
  font-size: 13px;
  background: transparent;
  border: 0;
  cursor: pointer;
}
</style>
