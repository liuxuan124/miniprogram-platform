<template>
  <div class="prototype-component-panel">
    <el-tabs v-model="panelMode" class="studio-component-tabs" stretch>
      <el-tab-pane label="添加组件" name="components">
    <section class="panel-section" >
      <div class="section-title">
        <span>组件库</span>
        <span class="section-count">{{ totalComponentCount }}</span>

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


      </el-tab-pane>
      <el-tab-pane label="页面结构" name="structure">
    <section class="panel-section structure-section" :class="{ collapsed: collapsed.structure }">
      <div class="section-title">
        <span>当前页面结构</span>
        <span class="section-count">{{ pageStore.components.length }}</span>

      </div>
      <div v-show="!collapsed.structure" class="structure-list">
        <div
          v-for="(comp, index) in pageStore.components"
          :key="comp.id"
          class="structure-row"
          :class="{ active: comp.id === pageStore.selectedComponentId }"
          draggable="true"
          @dragstart="structureDragIndex = index"
          @dragover.prevent
          @drop.prevent="moveStructure(index)"
          @dragend="structureDragIndex = null"
        >
          <span class="drag-handle" aria-hidden="true">⠿</span>
          <button type="button" class="structure-select" :aria-pressed="comp.id === pageStore.selectedComponentId" @click="pageStore.selectComponent(comp.id)"><span class="structure-index">{{ index + 1 }}</span>{{ getComponentDef(comp.type)?.label ?? comp.type }}</button>
          <button
            class="remove-btn"
            aria-label="删除该组件"
            @click.stop="handleRemoveComponent(comp)"
          >×</button>
        </div>
        <div v-if="!pageStore.components.length" class="empty-tip">页面还是空白的，切换到「添加组件」开始设计。</div>
      </div>
    </section>

        <div class="structure-help">拖拽调整顺序；点击组件，在画布和右侧编辑。</div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { usePageStore } from '@/stores/page'
import { useFeatureModulesStore } from '@/stores/feature-modules'
import { useIndustryProfileStore } from '@/stores/industry-profile'
import { ComponentType } from '@/types/page'
import { getComponentsByCategory, getAllCategories, getComponentDef, type ComponentDefinition } from './componentRegistry'
import { confirmRemoveComponent } from './confirmRemoveComponent'
import * as ElementPlusIcons from '@element-plus/icons-vue'

const pageStore = usePageStore()
const panelMode = ref('components')
const structureDragIndex = ref<number | null>(null)
function moveStructure(index: number) {
  if (structureDragIndex.value == null) return
  pageStore.moveComponent(structureDragIndex.value, index)
  structureDragIndex.value = null
}
const featureModulesStore = useFeatureModulesStore()
const industryProfileStore = useIndustryProfileStore()
if (!industryProfileStore.loaded) {
  industryProfileStore.load()
}
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
  const commerceTypes = new Set(
    getComponentsByCategory('commerce').map((item) => item.type),
  )
  return recentTypes.value
    .map((type) => getComponentDef(type))
    .filter((def): def is ComponentDefinition => {
      if (!def) return false
      if (!featureModulesStore.productEnabled && commerceTypes.has(def.type)) return false
      if (!featureModulesStore.isEnabled('planet') && String(def.type).startsWith('planet_')) return false
      if (!industryProfileStore.isComponentAllowed(def.type)) return false
      return true
    })
})
const resizing = ref<{
  target: 'components'
  startY: number
  startHeight: number
} | null>(null)

const categories = computed(() => {
  const all = getAllCategories()
  return all.filter((cat) => {
    if (cat.value === 'commerce' && !featureModulesStore.productEnabled) return false
    if (cat.value === 'planet' && !featureModulesStore.isEnabled('planet')) return false
    return true
  })
})

const visibleCategories = computed(() => {
  if (!focusedCategory.value) return categories.value
  return categories.value.filter((cat) => cat.value === focusedCategory.value)
})

const totalComponentCount = computed(() => {
  let count = 0
  for (const cat of categories.value) {
    count += getComponentsByCategory(cat.value).length
  }
  return count
})

/** B4：按搜索关键字过滤分类下的组件（匹配组件名称） */
function filteredComponentsByCategory(category: string): ComponentDefinition[] {
  if (!featureModulesStore.productEnabled && category === 'commerce') return []
  if (!featureModulesStore.isEnabled('planet') && category === 'planet') return []
  const list = getComponentsByCategory(category).filter((item) =>
    industryProfileStore.isComponentAllowed(item.type),
  ).filter((item) => {
    if (!featureModulesStore.isEnabled('planet') && String(item.type).startsWith('planet_')) return false
    return true
  })
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
  if (!featureModulesStore.loaded) {
    featureModulesStore.load()
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseup', handleMouseUp)
  document.body.classList.remove('is-panel-resizing')
})
</script>

<style scoped>
.prototype-component-panel { height: 100%; min-height: 0; background: #fff; border-right: 1px solid #e2e6ed; }
.studio-component-tabs { display: flex; flex-direction: column; height: 100%; }
.studio-component-tabs :deep(.el-tabs__header) { flex: none; margin: 0; padding: 0 12px; }
.studio-component-tabs :deep(.el-tabs__item) { height: 52px; font-size: .875rem; font-weight: 500; }
.studio-component-tabs :deep(.el-tabs__nav-wrap::after) { height: 1px; background: #e2e6ed; }
.studio-component-tabs :deep(.el-tabs__content) { flex: 1; min-height: 0; overflow: hidden; }
.studio-component-tabs :deep(.el-tab-pane) { height: 100%; display: flex; flex-direction: column; }
.panel-section { display: flex; flex-direction: column; flex: 1; min-height: 0; overflow: hidden; }
.section-title { display: flex; align-items: center; gap: 8px; padding: 18px 16px 12px; font-size: .8125rem; font-weight: 500; color: #626e82; }
.section-title > span:first-child { flex: 1; }
.section-count { font-size: .75rem; border-radius: 5px; padding: 2px 7px; background: #f0f3f8; color: #56647b; }
.component-search { padding: 0 16px 14px; }
.component-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; align-content: start; overflow-y: auto; padding: 0 16px 20px; flex: 1; min-height: 0; }
.category-label { grid-column: 1 / -1; font-size: .75rem; color: #626e82; padding: 16px 0 4px; }
.category-label--row { display: flex; justify-content: space-between; align-items: center; }
.category-all { border: 0; background: none; color: #002fa7; font-size: .75rem; cursor: pointer; }
.component-card { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; min-height: 78px; padding: 12px 6px; border: 1px solid #e5e9f0; border-radius: 8px; background: #fff; font: inherit; font-size: .8125rem; color: #41516b; cursor: grab; transition: background .15s, border-color .15s; }
.component-card:hover { background: #f5f7ff; border-color: #a4b4d9; }
.component-card.active { border-color: #002fa7; background: #edf2ff; color: #002fa7; }
.component-icon { color: #657797; height: 22px; display: grid; place-items: center; }
.component-card.active .component-icon { color: #002fa7; }
.structure-list { flex: 1; min-height: 0; overflow-y: auto; padding: 0 8px 16px; }
.structure-row { display: flex; align-items: center; gap: 4px; border: 1px solid transparent; border-radius: 6px; margin: 4px 0; background: #fff; }
.structure-row:hover { background: #f6f8fb; }
.structure-row.active { background: #edf2ff; border-color: #d0daf1; }
.structure-select { display: flex; align-items: center; gap: 8px; text-align: left; flex: 1; min-width: 0; padding: 14px 4px; font: inherit; font-size: .8125rem; background: none; color: #41516b; border: 0; cursor: pointer; }
.structure-row.active .structure-select { color: #002fa7; }
.structure-index { color: #8793a6; font-size: .75rem; }
.drag-handle { padding: 8px 4px; color: #8a96a8; cursor: grab; }
.remove-btn { border: 0; background: none; color: #8491a6; font-size: 18px; width: 28px; height: 28px; cursor: pointer; border-radius: 4px; }
.remove-btn:hover { color: #b33140; background: #fff0f2; }
.empty-tip { grid-column: 1 / -1; color: #626e82; font-size: .8125rem; line-height: 1.7; padding: 24px 12px; text-align: center; }
.structure-help { padding: 12px 16px; border-top: 1px solid #e2e6ed; font-size: .75rem; color: #626e82; line-height: 1.6; }
</style>
