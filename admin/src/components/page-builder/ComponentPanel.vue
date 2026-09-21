<template>
  <div class="prototype-component-panel">
    <div class="left-tabs">
      <button
        type="button"
        class="left-tab"
        :class="{ active: leftTab === 'components' }"
        @click="leftTab = 'components'"
      >组件</button>
      <button
        type="button"
        class="left-tab"
        :class="{ active: leftTab === 'blocks' }"
        @click="leftTab = 'blocks'"
      >区块模板</button>
      <button
        type="button"
        class="left-tab"
        :class="{ active: leftTab === 'structure' }"
        @click="leftTab = 'structure'"
      >结构</button>
    </div>

    <section v-show="leftTab === 'components'" class="panel-section" :style="sectionStyle('components')">
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
      v-show="leftTab === 'components' && !collapsed.components"
      class="resize-handle"
      title="拖动调整组件库高度"
      @mousedown="startResize('components', $event)"
    >
      <span></span>
    </div>

    <section v-show="leftTab === 'blocks'" class="panel-section blocks-section">
      <div class="blocks-grid">
        <button
          v-for="block in blockTemplates"
          :key="block.key"
          type="button"
          class="block-card"
          @click="handleAddBlock(block)"
        >
          <span class="block-card__preview" :style="{ '--accent': block.accent }">
            <span class="block-card__bar" />
            <span class="block-card__line" />
            <span class="block-card__line short" />
          </span>
          <span class="block-card__name">{{ block.label }}</span>
          <span class="block-card__hint">{{ block.hint }}</span>
        </button>
      </div>
    </section>

    <section
      v-show="leftTab === 'structure' || leftTab === 'components'"
      class="panel-section structure-section"
      :class="{ collapsed: collapsed.structure }"
    >
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
import { ElMessage } from 'element-plus'
import { usePageStore } from '@/stores/page'
import { useFeatureModulesStore } from '@/stores/feature-modules'
import { useIndustryProfileStore } from '@/stores/industry-profile'
import { ComponentType } from '@/types/page'
import { getComponentsByCategory, getAllCategories, getComponentDef, type ComponentDefinition } from './componentRegistry'
import { confirmRemoveComponent } from './confirmRemoveComponent'
import * as ElementPlusIcons from '@element-plus/icons-vue'

const pageStore = usePageStore()
const featureModulesStore = useFeatureModulesStore()
const industryProfileStore = useIndustryProfileStore()
if (!industryProfileStore.loaded) {
  industryProfileStore.load()
}
const leftTab = ref<'components' | 'blocks' | 'structure'>('components')

/** 区块模板：至少 6 张常用卡，点击插入对应组件 */
const blockTemplates = [
  { key: 'festival', label: '节日横幅', hint: '轮播 + 活动入口', accent: '#b4430f', types: [ComponentType.Banner, ComponentType.ActivityEntry] },
  { key: 'booklist', label: '书单双列', hint: '标题 + 商品列表', accent: '#8f5400', types: [ComponentType.SectionTitle, ComponentType.ProductList] },
  { key: 'signup', label: '报名底栏', hint: '表单 + 悬浮按钮', accent: '#1d6bb8', types: [ComponentType.FormEntry, ComponentType.FloatButton] },
  { key: 'countdown', label: '倒计时', hint: '活动倒计时', accent: '#a33b5c', types: [ComponentType.Countdown] },
  { key: 'coupon', label: '优惠券条', hint: '领券组件', accent: '#1f7a4d', types: [ComponentType.Coupon] },
  { key: 'community', label: '社群入口', hint: '加入群聊', accent: '#6b4c9a', types: [ComponentType.JoinGroup] },
] as const

function handleAddBlock(block: (typeof blockTemplates)[number]) {
  const types = block.types.filter((t) => getComponentDef(t) && industryProfileStore.isComponentAllowed(t))
  if (!types.length) {
    ElMessage.info(`「${block.label}」对应组件暂不可用，请从「组件」库手动添加`)
    return
  }
  try {
    for (const type of types) {
      pageStore.addComponent(type)
      recordRecentUsage(type)
    }
    collapsed.value.structure = false
    leftTab.value = 'structure'
    ElMessage.success(`已插入「${block.label}」`)
  } catch {
    ElMessage.info(`「${block.label}」暂无法直接加入，请从组件库拖入`)
  }
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

<style lang="scss" scoped>
.prototype-component-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: #fffcf8;
  border-right: 1px solid #e8dfd3;
}

.left-tabs {
  display: flex;
  gap: 2px;
  padding: 8px 10px 0;
  border-bottom: 1px solid #e8dfd3;
  flex-shrink: 0;
}
.left-tab {
  flex: 1;
  border: none;
  background: transparent;
  padding: 8px 4px 10px;
  font-size: 13px;
  color: #7a6e64;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  &.active {
    color: #b4430f;
    font-weight: 700;
    border-bottom-color: #b4430f;
  }
}

.blocks-section {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
}
.blocks-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.block-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 10px 10px 12px;
  border: 1px solid #e8dfd3;
  border-radius: 10px;
  background: #fffcf8;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s ease, background 0.15s ease;

  &:hover {
    border-color: #b4430f;
    background: #fbeadf;
  }

  &__preview {
    --accent: #b4430f;
    width: 100%;
    height: 48px;
    border-radius: 6px;
    background: linear-gradient(160deg, #f3ebe2, #e8dfd3);
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    box-sizing: border-box;
    margin-bottom: 4px;
  }
  &__bar {
    height: 12px;
    border-radius: 3px;
    background: var(--accent);
  }
  &__line {
    height: 6px;
    border-radius: 2px;
    background: #fff;
    border: 1px solid #e5ddd2;
    &.short { width: 55%; }
  }

  &__name {
    font-size: 13px;
    font-weight: 700;
    color: #2c241c;
  }
  &__hint {
    font-size: 11px;
    color: #7a6e64;
  }
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
    color: var(--color-primary);
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
      color: var(--color-primary);
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
      background: var(--color-primary);
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
  color: var(--color-primary);
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
    color: var(--color-primary);
    font-weight: 700;
    background: #eaf2ff;
    border-color: var(--color-primary);
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
    color: var(--color-primary);
    background: #eaf2ff;
    border-color: var(--color-primary);
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
