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
      <div v-show="!collapsed.components" class="component-search">
        <el-input
          v-model="searchKeyword"
          size="small"
          placeholder="搜索组件"
          clearable
          :prefix-icon="Search"
        />
      </div>
      <div v-show="!collapsed.components" class="component-grid">
        <!-- B4：最近使用，仅在未搜索且未聚焦某分类时展示 -->
        <template v-if="!searchKeyword && !focusedCategory && recentComponents.length">
          <div class="category-label">最近使用</div>
          <button
            v-for="item in recentComponents"
            :key="`recent-${item.type}`"
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

        <template v-for="cat in visibleCategories" :key="cat.value">
          <div
            v-if="filteredComponentsByCategory(cat.value).length"
            class="category-label category-label--row"
          >
            <span>{{ cat.label }}</span>
            <button
              type="button"
              class="category-all"
              :class="{ active: focusedCategory === cat.value }"
              @click.stop="toggleCategoryFocus(cat.value)"
            >
              {{ focusedCategory === cat.value ? '返回' : '全部' }}
            </button>
          </div>
          <button
            v-for="item in filteredComponentsByCategory(cat.value)"
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

        <div v-if="searchKeyword && !hasSearchResults" class="empty-tip">未找到匹配"{{ searchKeyword }}"的组件</div>
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
          <span class="drag-handle" aria-hidden="true">⠿</span>
          <span>{{ index + 1 }}. {{ getComponentDef(comp.type)?.label ?? comp.type }}</span>
          <button
            class="remove-btn"
            aria-label="删除该组件"
            @click.stop="handleRemoveComponent(comp)"
          >×</button>
        </div>
        <div v-if="!pageStore.components.length" class="empty-tip">当前页面暂无组件</div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { usePageStore } from '@/stores/page'
import { ComponentType } from '@/types/page'
import { getComponentsByCategory, getAllCategories, getComponentDef, type ComponentDefinition } from './componentRegistry'
import { confirmRemoveComponent } from './confirmRemoveComponent'
import * as ElementPlusIcons from '@element-plus/icons-vue'

const pageStore = usePageStore()
const componentSectionHeight = ref(520)
const collapsed = ref({
  components: false,
  structure: false,
})
const searchKeyword = ref('')
/** 点击分类「全部」后，只展示该分类全部组件；再点「返回」退出 */
const focusedCategory = ref<string | null>(null)

/** B4：最近使用的组件类型，持久化到 localStorage，跨会话保留 */
const RECENT_KEY = 'pagebuilder_recent_components'
const RECENT_MAX = 6
const recentTypes = ref<ComponentType[]>([])

function loadRecentTypes() {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    if (!raw) return
    const arr = JSON.parse(raw)
    if (Array.isArray(arr)) recentTypes.value = arr
  } catch {
    recentTypes.value = []
  }
}

function recordRecentUsage(type: ComponentType) {
  const next = [type, ...recentTypes.value.filter((t) => t !== type)].slice(0, RECENT_MAX)
  recentTypes.value = next
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    // 存储失败（隐私模式等）不影响主流程
  }
}

async function handleRemoveComponent(comp: { id: string; type: ComponentType }) {
  const label = getComponentDef(comp.type)?.label ?? comp.type
  if (!(await confirmRemoveComponent(label))) return
  pageStore.removeComponent(comp.id)
}

const recentComponents = computed<ComponentDefinition[]>(() => {
  return recentTypes.value
    .map((type) => getComponentDef(type))
    .filter((def): def is ComponentDefinition => !!def)
})
const resizing = ref<{
  target: 'components'
  startY: number
  startHeight: number
} | null>(null)

const categories = getAllCategories()

const visibleCategories = computed(() => {
  if (!focusedCategory.value) return categories
  return categories.filter((cat) => cat.value === focusedCategory.value)
})

const totalComponentCount = computed(() => {
  let count = 0
  for (const cat of categories) {
    count += getComponentsByCategory(cat.value).length
  }
  return count
})

/** B4：按搜索关键字过滤分类下的组件（匹配组件名称） */
function filteredComponentsByCategory(category: string): ComponentDefinition[] {
  const list = getComponentsByCategory(category)
  const kw = searchKeyword.value.trim().toLowerCase()
  if (!kw) return list
  return list.filter((item) => item.label.toLowerCase().includes(kw))
}

const hasSearchResults = computed(() => {
  return visibleCategories.value.some((cat) => filteredComponentsByCategory(cat.value).length > 0)
})

function toggleCategoryFocus(category: string) {
  focusedCategory.value = focusedCategory.value === category ? null : category
  if (focusedCategory.value) searchKeyword.value = ''
}

/** Element Plus icon name → component map */
const iconMap: Record<string, any> = ElementPlusIcons

function handleDragStart(event: DragEvent, type: ComponentType) {
  event.dataTransfer?.setData('componentType', type)
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'copy'
  }
  recordRecentUsage(type)
}

function handleAdd(type: ComponentType) {
  pageStore.addComponent(type)
  recordRecentUsage(type)
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
  loadRecentTypes()
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

.component-search {
  flex-shrink: 0;
  padding: 8px 8px 0;
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

.category-label--row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.category-all {
  padding: 0;
  color: #1769ff;
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  background: transparent;
  border: 0;
  cursor: pointer;

  &:hover,
  &.active {
    color: #0b4fd6;
    text-decoration: underline;
  }
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
