<template>
  <div class="prototype-component-panel">
    <div class="left-seg" role="tablist">
      <button type="button" :class="{ on: mode === 'components' }" @click="mode = 'components'">
        组件
      </button>
      <button type="button" :class="{ on: mode === 'blocks' }" @click="mode = 'blocks'">
        区块模板
      </button>
      <button type="button" :class="{ on: mode === 'structure' }" @click="openStructureMode">结构</button>
    </div>

    <!-- 区块模板：一次插入一组常用组件，省掉逐个拖的步骤 -->
    <section v-if="mode === 'blocks'" class="panel-section blocks-section">
      <div class="section-title">
        <span>区块模板</span>
        <span class="section-count">{{ availableBlocks.length }}</span>
      </div>
      <div class="blocks-list">
        <button
          v-for="block in availableBlocks"
          :key="block.key"
          type="button"
          class="block-card"
          @click="insertBlock(block)"
        >
          <b>{{ block.label }}</b>
          <span class="block-desc">{{ block.desc }}</span>
          <span class="block-parts">{{ blockPartLabels(block).join(' · ') }}</span>
        </button>
        <div v-if="!availableBlocks.length" class="empty-tip">当前行业方案下没有可用区块</div>
      </div>
      <div class="my-blocks">
        <div class="section-title">
          <span>我的区块</span>
          <span class="section-count">{{ myBlocks.length }}</span>
        </div>
        <div class="my-blocks__actions">
          <el-button size="small" type="primary" plain :disabled="!pageStore.selectedComponentId" @click="saveMyBlockFromSelection">
            保存当前选中起的一段
          </el-button>
        </div>
        <div class="blocks-list my-blocks__list">
          <button
            v-for="block in myBlocks"
            :key="block.id"
            type="button"
            class="block-card"
            @click="insertMyBlock(block)"
          >
            <b>{{ block.label }}</b>
            <span class="block-desc">{{ block.components.length }} 个组件 · {{ formatSavedAt(block.savedAt) }}</span>
            <el-button link type="danger" size="small" @click.stop="removeMyBlockEntry(block.id)">删除</el-button>
          </button>
          <div v-if="!myBlocks.length" class="empty-tip">选中组件后可将后续组件存为模板</div>
        </div>
      </div>
    </section>

    <section v-show="mode === 'components'" class="panel-section panel-section--components" :style="sectionStyle('components')">
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
      v-show="mode === 'components' && !collapsed.components"
      class="resize-handle"
      title="拖动调整组件库高度"
      @mousedown="startResize('components', $event)"
    >
      <span></span>
    </div>

    <section
      v-show="mode === 'components' || mode === 'structure'"
      class="panel-section structure-section"
      :class="{ collapsed: collapsed.structure && mode === 'components', 'structure-section--solo': mode === 'structure' }"
    >
      <div class="section-title">
        <span>{{ mode === 'structure' ? '页面结构' : '当前页面结构' }}</span>
        <button class="section-count" @click="toggleCollapse('structure')">{{ pageStore.components.length }}</button>
        <button v-if="mode === 'components'" class="section-toggle" @click="toggleCollapse('structure')">
          {{ collapsed.structure ? '展开' : '收起' }}
        </button>
      </div>
      <p v-if="mode === 'structure' && hasFixedTabShell" class="structure-hint">
        底栏「星球 / 商城 / 我的」为固定业务页，请在对应 Tab 绑定页的装修器里改；此处只展示当前页已插入的区块。
      </p>
      <div v-show="mode === 'structure' || !collapsed.structure" class="structure-list">
        <draggable
          :model-value="pageStore.components"
          item-key="id"
          handle=".drag-handle"
          ghost-class="structure-row--ghost"
          @update:model-value="onStructureReorder"
        >
          <template #item="{ element: comp, index }">
            <div
              class="structure-row"
              :class="{ active: comp.id === pageStore.selectedComponentId }"
              @click="selectFromStructure(comp.id)"
            >
              <span class="drag-handle" aria-label="拖动排序"><MiniIcon name="drag" :size="14" /></span>
              <span>{{ index + 1 }}. {{ structureLabel(comp, index) }}</span>
              <button
                class="remove-btn"
                aria-label="删除该组件"
                @click.stop="handleRemoveComponent(comp)"
              >
                <MiniIcon name="x" :size="14" />
              </button>
            </div>
          </template>
        </draggable>
        <div v-if="!pageStore.components.length" class="empty-tip">当前页面暂无组件</div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Search } from '@element-plus/icons-vue'
import draggable from 'vuedraggable'
import { usePageStore } from '@/stores/page'
import { requestEditorScrollToComponent } from '@/utils/editorScrollBus'
import { loadMyBlocks, saveMyBlock, removeMyBlock, type SavedMyBlock } from '@/utils/myBlocksStorage'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useEditorDeleteUndo } from '@/composables/useEditorDeleteUndo'
import { useFeatureModulesStore } from '@/stores/feature-modules'
import { useIndustryProfileStore } from '@/stores/industry-profile'
import { ComponentType, type ComponentInstance } from '@/types/page'
import { getComponentsByCategory, getAllCategories, getComponentDef, type ComponentDefinition } from './componentRegistry'
import MiniIcon from '@/components/mini/MiniIcon.vue'
import * as ElementPlusIcons from '@element-plus/icons-vue'

const pageStore = usePageStore()
const featureModulesStore = useFeatureModulesStore()
const industryProfileStore = useIndustryProfileStore()
if (!industryProfileStore.loaded) {
  industryProfileStore.load()
}
const mode = ref<'components' | 'blocks' | 'structure'>('components')

/** 固定 Tab 壳不在通用组件库展示，避免误插到首页 */
const FIXED_TAB_SHELL_TYPES = new Set<ComponentType>([
  ComponentType.WarmPlanet,
  ComponentType.WarmShop,
  ComponentType.WarmMine,
])

const hasFixedTabShell = computed(() =>
  pageStore.components.some((c) => FIXED_TAB_SHELL_TYPES.has(c.type as ComponentType)),
)
const myBlocks = ref<SavedMyBlock[]>(loadMyBlocks())
const { deleteWithUndo } = useEditorDeleteUndo()
const componentSectionHeight = ref(520)

/** 区块模板：常见页面段落的组件组合，点一次按顺序插入 */
const BLOCKS: Array<{ key: string; label: string; desc: string; types: ComponentType[] }> = [
  {
    key: 'activity-hero',
    label: '活动头图组',
    desc: '头图 + 倒计时 + 报名入口',
    types: [ComponentType.Banner, ComponentType.Countdown, ComponentType.FormEntry],
  },
  {
    key: 'booklist',
    label: '书单推荐组',
    desc: '小标题 + 文章列表 + 分割线',
    types: [ComponentType.SectionTitle, ComponentType.ArticleList, ComponentType.Divider],
  },
  {
    key: 'member',
    label: '会员转化组',
    desc: '会员卡 + 优惠券 + 悬浮按钮',
    types: [ComponentType.MemberCard, ComponentType.Coupon, ComponentType.FloatButton],
  },
  {
    key: 'community',
    label: '社群引流组',
    desc: '入群引导 + 图文说明 + 联系方式',
    types: [ComponentType.JoinGroup, ComponentType.ImageText, ComponentType.ContactInfo],
  },
  {
    key: 'brand',
    label: '品牌介绍组',
    desc: '品牌头部 + 品牌简介 + 资质',
    types: [ComponentType.BrandHeader, ComponentType.BrandIntro, ComponentType.Certificate],
  },
]

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

function handleRemoveComponent(comp: { id: string; type: ComponentType }) {
  deleteWithUndo(comp as any)
}

function structureLabel(comp: { type: ComponentType }, index: number) {
  const def = getComponentDef(comp.type)?.label ?? comp.type
  const total = pageStore.components.filter((c) => c.type === comp.type).length
  if (total <= 1) return def
  const nth = pageStore.components.slice(0, index + 1).filter((c) => c.type === comp.type).length
  return `${def}（第 ${nth} 个）`
}

function onStructureReorder(ordered: ComponentInstance[]) {
  pageStore.setComponentsOrder([...ordered])
}

function selectFromStructure(id: string) {
  pageStore.selectComponent(id)
  requestEditorScrollToComponent(id)
}

function openStructureMode() {
  mode.value = 'structure'
  collapsed.value.structure = false
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
    if (FIXED_TAB_SHELL_TYPES.has(item.type)) return false
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
  const created = pageStore.addComponent(type)
  recordRecentUsage(type)
  collapsed.value.structure = false
  const id = created?.id
  if (id) requestEditorScrollToComponent(id)
}

function toggleCollapse(target: 'components' | 'structure') {
  collapsed.value[target] = !collapsed.value[target]
}

/** 组件是否在当前行业方案 / 功能模块下可用 */
function isTypeAvailable(type: ComponentType) {
  if (!industryProfileStore.isComponentAllowed(type)) return false
  if (!featureModulesStore.isEnabled('planet') && String(type).startsWith('planet_')) return false
  if (!featureModulesStore.productEnabled) {
    const commerceTypes = new Set(getComponentsByCategory('commerce').map((item) => item.type))
    if (commerceTypes.has(type)) return false
  }
  return true
}

function blockTypes(block: { types: ComponentType[] }) {
  return block.types.filter(isTypeAvailable)
}

function blockPartLabels(block: { types: ComponentType[] }) {
  return blockTypes(block).map((type) => getComponentDef(type)?.label ?? type)
}

const availableBlocks = computed(() => BLOCKS.filter((block) => blockTypes(block).length > 0))

function insertBlock(block: { types: ComponentType[] }) {
  const types = blockTypes(block)
  let lastId: string | undefined
  types.forEach((type) => {
    const created = pageStore.addComponent(type)
    recordRecentUsage(type)
    lastId = created?.id
  })
  collapsed.value.structure = false
  if (lastId) requestEditorScrollToComponent(lastId)
}

function formatSavedAt(iso: string) {
  try {
    return new Date(iso).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

async function saveMyBlockFromSelection() {
  const id = pageStore.selectedComponentId
  if (!id) return
  const idx = pageStore.components.findIndex((c) => c.id === id)
  if (idx < 0) return
  const slice = pageStore.components.slice(idx)
  if (!slice.length) return
  try {
    const { value } = await ElMessageBox.prompt('给区块起个名字', '保存为我的区块', {
      inputValue: `区块 ${myBlocks.value.length + 1}`,
      confirmButtonText: '保存',
    })
    const label = String(value || '').trim()
    if (!label) return
    const row = saveMyBlock({ label, components: slice })
    myBlocks.value = loadMyBlocks()
    ElMessage.success(`已保存「${row.label}」`)
  } catch {
    // cancel
  }
}

function insertMyBlock(block: SavedMyBlock) {
  let lastId: string | undefined
  block.components.forEach((comp) => {
    const copy = JSON.parse(JSON.stringify(comp)) as typeof comp
    copy.id = `${comp.type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    pageStore.insertComponentAt(copy, pageStore.components.length)
    lastId = copy.id
  })
  if (lastId) requestEditorScrollToComponent(lastId)
}

function removeMyBlockEntry(id: string) {
  removeMyBlock(id)
  myBlocks.value = loadMyBlocks()
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
  /* 装修器已整体切到暖阁配色，面板内部不再沿用旧蓝色 */
  --pc-acc: #b4430f;
  --pc-acc-soft: #fbeadf;
  --pc-line: #e8dfd3;
  --pc-line2: #f1ebe3;
  --pc-ink: #2a1f17;
  --pc-mute: #6b5b4e;
  --pc-faint: #a1968b;
  --pc-soft: #fbf8f4;

  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: #fff;
  border-right: 0;
  gap: 12px;
}

.blocks-section {
  flex: 1;
  min-height: 0;
}

.blocks-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
}

.block-card {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px 12px;
  text-align: left;
  background: var(--pc-soft);
  border: 1px solid var(--pc-line);
  border-radius: 10px;
  cursor: pointer;
  font-family: inherit;
  color: var(--pc-ink);

  b { font-size: 13px; font-weight: 600; }

  &:hover {
    border-color: var(--pc-acc);
    background: var(--pc-acc-soft);
  }
}

.block-desc {
  font-size: 12px;
  color: var(--pc-mute);
}

.block-parts {
  font-size: 11px;
  color: var(--pc-faint);
}

.my-blocks {
  border-top: 1px solid var(--pc-line);
  padding-top: 4px;
}

.my-blocks__actions {
  padding: 0 8px 8px;
}

.my-blocks__list {
  max-height: 220px;
}

.left-seg {
  display: flex;
  gap: 3px;
  background: #efeae3;
  border-radius: 8px;
  padding: 3px;
  flex-shrink: 0;
  button {
    flex: 1;
    border: 0;
    background: transparent;
    padding: 6px 8px;
    border-radius: 6px;
    font-size: 12px;
    color: #6b5b4e;
    cursor: pointer;
    font-family: inherit;
    &:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
    &.on {
      background: #fff;
      color: #2a1f17;
      font-weight: 500;
    }
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
  color: var(--pc-mute);
  font-size: 12px;
  font-weight: 700;
  background: #fff;
  border-bottom: 1px solid var(--pc-line);

  span {
    flex: 1;
  }

  .section-count {
    min-width: 20px;
    padding: 1px 6px;
    color: var(--pc-acc);
    font-family: inherit;
    font-size: 11px;
    text-align: center;
    background: var(--pc-acc-soft);
    border: 0;
    border-radius: 999px;
    cursor: pointer;
  }

  .section-toggle {
    padding: 0;
    color: var(--pc-faint);
    font-family: inherit;
    font-size: 11px;
    background: transparent;
    border: 0;
    cursor: pointer;

    &:hover {
      color: var(--pc-acc);
    }
  }
}

.resize-handle {
  position: relative;
  flex-shrink: 0;
  height: 10px;
  background: var(--pc-soft);
  border-top: 1px solid var(--pc-line);
  border-bottom: 1px solid var(--pc-line);
  cursor: row-resize;

  span {
    position: absolute;
    top: 4px;
    left: 50%;
    width: 46px;
    height: 2px;
    background: #d9cfc3;
    border-radius: 999px;
    transform: translateX(-50%);
  }

  &:hover {
    background: var(--pc-acc-soft);

    span {
      background: var(--pc-acc);
    }
  }
}

.empty-tip {
  padding: 10px;
  color: var(--pc-faint);
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
  color: var(--pc-faint);
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
  color: var(--pc-acc);
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  background: transparent;
  border: 0;
  cursor: pointer;

  &:hover,
  &.active {
    color: #8c3208;
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
  color: var(--pc-mute);
  font-size: 12px;
  line-height: 1.2;
  text-align: center;
  background: var(--pc-soft);
  border: 1px solid var(--pc-line);
  border-radius: 9px;
  cursor: pointer;
  transition: 0.15s;

  &:hover,
  &.active {
    color: var(--pc-acc);
    font-weight: 700;
    background: var(--pc-acc-soft);
    border-color: var(--pc-acc);
  }

  &:active {
    transform: scale(0.97);
  }
}

.component-icon {
  font-size: 18px;
  line-height: 1.1;
}

.structure-hint {
  margin: 0 0 10px;
  padding: 8px 10px;
  font-size: 12px;
  line-height: 1.45;
  color: #8a7568;
  background: #faf6f1;
  border-radius: 8px;
  border: 1px solid #e8dfd3;
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
  color: var(--pc-mute);
  font-size: 13px;
  background: #fff;
  border: 1px solid var(--pc-line);
  border-radius: 8px;
  cursor: pointer;
  transition: 0.14s;

  &:hover,
  &.active {
    color: var(--pc-acc);
    background: var(--pc-acc-soft);
    border-color: var(--pc-acc);
  }
}

.drag-handle {
  display: inline-flex;
  color: #d9cfc3;
}

.remove-btn {
  display: inline-flex;
  margin-left: auto;
  padding: 0;
  color: var(--pc-faint);
  background: transparent;
  border: 0;
  cursor: pointer;

  &:hover { color: #a52a1e; }
}
</style>
