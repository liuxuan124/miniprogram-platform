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

    <!-- 区块模板：可视化卡片，拖入画布自动解组为原子组件树 -->
    <section v-if="mode === 'blocks'" class="panel-section blocks-section">
      <div class="blocks-scroll">
        <!-- 第三层资产：整页模板（从组件库迁出，避免与原子组件混淆） -->
        <template v-if="pageTemplates.length">
          <div class="block-group">
            <div class="block-group__head">
              <span class="block-group__title">整页模板</span>
              <span class="block-group__hint">整页替换 · 非区块</span>
            </div>
            <div class="block-grid">
              <BlockCard
                v-for="blk in pageTemplates"
                :key="blk.key"
                :block="blk"
                :preview-nodes="blockPreviewCache(blk.key)"
                :node-count="blockNodeCount(blk.key)"
                @insert="insertBuiltinBlock(blk)"
              />
            </div>
          </div>
        </template>

        <!-- 第二层资产：按业务场景分区的复合区块 -->
        <div v-for="group in builtinGroups" :key="group.value" class="block-group">
          <div class="block-group__head">
            <span class="block-group__title">{{ group.label }}</span>
            <span class="block-group__hint">{{ group.hint }}</span>
          </div>
          <div v-if="group.blocks.length" class="block-grid">
            <BlockCard
              v-for="blk in group.blocks"
              :key="blk.key"
              :block="blk"
              :preview-nodes="blockPreviewCache(blk.key)"
              :node-count="blockNodeCount(blk.key)"
              @insert="insertBuiltinBlock(blk)"
            />
          </div>
          <div v-else class="empty-tip">当前方案下该分类暂无可用区块</div>
        </div>

        <!-- 我的区块：画布里「另存为区块」沉淀而来 -->
        <div class="block-group">
          <div class="block-group__head">
            <span class="block-group__title">我的区块</span>
            <span class="block-group__count">{{ myBlocks.length }}</span>
          </div>
          <p v-if="!myBlocks.length" class="my-blocks__hint">
            在画布中选中「容器/分栏」或「通栏背景」，点工具条上的
            <b>另存为区块</b>，即可把排好的组合沉淀到这里复用。
          </p>
          <div v-else class="block-grid">
            <BlockCard
              v-for="blk in myBlocks"
              :key="blk.id"
              :block="{
                key: `my:${blk.id}`,
                name: blk.name,
                description: blk.description,
                thumbnail: blk.thumbnail,
                isCustom: true,
              }"
              :preview-nodes="blk.nodes"
              :node-count="countInstanceNodes(blk.nodes)"
              @insert="insertSavedBlock(blk)"
              @remove="removeMyBlockEntry(blk.id)"
            />
          </div>
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
import { loadMyBlocks, removeMyBlock, type SavedBlock } from '@/utils/myBlocksStorage'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useEditorDeleteUndo } from '@/composables/useEditorDeleteUndo'
import { useFeatureModulesStore } from '@/stores/feature-modules'
import { useIndustryProfileStore } from '@/stores/industry-profile'
import { ComponentType, type ComponentInstance } from '@/types/page'
import { getComponentsByCategory, getAllCategories, getComponentDef, type ComponentDefinition } from './componentRegistry'
import BlockCard from './BlockCard.vue'
import MiniIcon from '@/components/mini/MiniIcon.vue'
import * as ElementPlusIcons from '@element-plus/icons-vue'
import {
  BLOCK_CATEGORIES,
  BUILTIN_BLOCKS,
  builtinBlockByKey,
  builtinBlocksByCategory,
  countInstanceNodes,
  countSchemaNodes,
  filterAvailableBlocks,
  pageTemplateBlocks,
  unpackBlock,
  type BlockCategory,
  type BlockTemplate,
} from './blockTemplates'

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
const myBlocks = ref<SavedBlock[]>(loadMyBlocks())
const { deleteWithUndo } = useEditorDeleteUndo()
const componentSectionHeight = ref(520)

/* ------------------------------------------------------------------ *
 * 区块模板（第二层资产）
 * ------------------------------------------------------------------ */

/** 内置区块的预览实例缓存：key → 已解包的组件树。
 *  缩略图/悬浮预览直接复用这份实例，避免每张卡片各解包一次。 */
const previewCache = new Map<string, ComponentInstance[]>()
function blockPreviewCache(key: string): ComponentInstance[] {
  let nodes = previewCache.get(key)
  if (!nodes) {
    const block = builtinBlockByKey(key)
    nodes = block ? unpackBlock(block) : []
    previewCache.set(key, nodes)
  }
  return nodes
}

function blockNodeCount(key: string): number {
  const block = builtinBlockByKey(key)
  if (!block) return 0
  return countSchemaNodes(block.schema)
}

/** 与组件库 isTypeAvailable 同口径：行业方案 + 功能模块双重开关 */
function isTypeAvailable(type: ComponentType) {
  if (!industryProfileStore.isComponentAllowed(type)) return false
  if (!featureModulesStore.isEnabled('planet') && String(type).startsWith('planet_')) return false
  if (!featureModulesStore.productEnabled) {
    const commerceTypes = new Set(getComponentsByCategory('commerce').map((item) => item.type))
    if (commerceTypes.has(type)) return false
  }
  return true
}

const availableBuiltins = computed(() =>
  filterAvailableBlocks(BUILTIN_BLOCKS, isTypeAvailable),
)

const pageTemplates = computed<BlockTemplate[]>(() =>
  availableBuiltins.value.filter((b) => b.isPageTemplate),
)

/** 4 个预置分类分区（custom 分区由「我的区块」单独渲染） */
const builtinGroups = computed(() =>
  BLOCK_CATEGORIES.filter((c) => c.value !== 'custom').map((c) => ({
    ...c,
    blocks: availableBuiltins.value.filter(
      (b) => !b.isPageTemplate && b.category === c.value,
    ),
  })),
)

/** 解包 → 批量插入（单条历史快照，Ctrl/⌘Z 一步撤回整个区块） */
function insertBlockNodes(nodes: ComponentInstance[], label: string) {
  if (!nodes.length) return
  const inserted = pageStore.insertComponentBatch(nodes)
  if (!inserted.length) return
  collapsed.value.structure = false
  mode.value = 'components'
  ElMessage.success(`已插入「${label}」，可在画布中逐个调整`)
  requestEditorScrollToComponent(inserted[0].id)
}

function insertBuiltinBlock(block: BlockTemplate) {
  insertBlockNodes(unpackBlock(block), block.name)
}

function insertSavedBlock(block: SavedBlock) {
  insertBlockNodes(unpackBlock(block), block.name)
}

function removeMyBlockEntry(id: string) {
  const target = myBlocks.value.find((b) => b.id === id)
  if (!target) return
  ElMessageBox.confirm(`确定删除区块「${target.name}」？此操作不可恢复。`, '删除我的区块', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消',
  })
    .then(() => {
      removeMyBlock(id)
      reloadMyBlocks()
      ElMessage.success('已删除')
    })
    .catch(() => {
      // 用户取消
    })
}

function reloadMyBlocks() {
  myBlocks.value = loadMyBlocks()
}

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
  // 画布里「另存为区块」成功后热刷新「我的区块」列表
  window.addEventListener('pagebuilder:my-blocks-changed', reloadMyBlocks)
  loadRecentTypes()
  if (!featureModulesStore.loaded) {
    featureModulesStore.load()
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseup', handleMouseUp)
  window.removeEventListener('pagebuilder:my-blocks-changed', reloadMyBlocks)
  document.body.classList.remove('is-panel-resizing')
})
</script>

<style lang="scss" scoped>
.prototype-component-panel {
  /* 装修器已整体切到暖阁配色，面板内部不再沿用旧蓝色 */
  --pc-acc: var(--el-color-primary);
  --pc-acc-soft: var(--wb-accsoft);
  --pc-line: var(--wb-line);
  --pc-line2: var(--wb-line2);
  --pc-ink: var(--wb-ink);
  --pc-mute: var(--wb-mute);
  --pc-faint: var(--wb-faint);
  --pc-soft: var(--wb-soft);

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

.blocks-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 10px 10px 20px;
}

.block-group {
  margin-bottom: 18px;

  &:last-child {
    margin-bottom: 0;
  }
}

.block-group__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
  padding: 0 2px;
}

.block-group__title {
  color: var(--pc-ink, #2a1f17);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.3px;
}

.block-group__hint,
.block-group__count {
  color: var(--pc-faint, #a99c8e);
  font-size: 11px;
}

.block-group__count {
  min-width: 18px;
  padding: 0 6px;
  color: var(--pc-acc, #c08e6e);
  text-align: center;
  background: var(--pc-acc-soft, #f7efe7);
  border-radius: 999px;
}

/* 双列卡片：缩略图 148px + 间距刚好填满面板 */
.block-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.my-blocks__hint {
  margin: 0;
  padding: 10px;
  color: var(--pc-mute, #6b5b4e);
  font-size: 12px;
  line-height: 1.6;
  background: var(--pc-soft, #faf6f1);
  border: 1px dashed var(--pc-line, #e8e0d6);
  border-radius: 8px;

  b {
    color: var(--pc-acc, #c08e6e);
  }
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
  border: 1px solid var(--wb-line);
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
