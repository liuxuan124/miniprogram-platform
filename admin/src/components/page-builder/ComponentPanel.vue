<template>
  <div class="prototype-component-panel">
    <!-- 左侧顶栏两个大 Tab：组件库 / 页面图层，互斥独享整栏高度 -->
    <div class="left-seg" role="tablist">
      <button
        type="button"
        role="tab"
        :aria-selected="mode === 'components' || mode === 'blocks'"
        :class="{ on: mode === 'components' || mode === 'blocks' }"
        @click="mode = 'components'"
      >
        <el-icon :size="13"><Grid /></el-icon>
        组件库
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="mode === 'structure'"
        :class="{ on: mode === 'structure' }"
        @click="openStructureMode"
      >
        <el-icon :size="13"><Files /></el-icon>
        页面图层
        <span class="left-seg__count">{{ pageStore.components.length }}</span>
      </button>
    </div>

    <!-- 组件库内的次级切换：组件 / 区块模板（只在这一栏内出现） -->
    <div v-if="mode !== 'structure'" class="sub-seg" role="tablist">
      <button type="button" role="tab" :aria-selected="mode === 'components'" :class="{ on: mode === 'components' }" @click="mode = 'components'">
        单个组件
      </button>
      <button type="button" role="tab" :aria-selected="mode === 'blocks'" :class="{ on: mode === 'blocks' }" @click="mode = 'blocks'">
        区块模板
      </button>
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

    <section v-show="mode === 'components'" class="panel-section panel-section--components">
      <div class="section-title">
        <span>组件库</span>
        <span class="section-count">{{ totalComponentCount }}</span>
      </div>
      <div class="component-search">
        <el-input
          v-model="searchKeyword"
          size="small"
          placeholder="搜索组件"
          clearable
          :prefix-icon="Search"
        />
      </div>

      <!-- 顶部分类切换器 + 3 列网格 -->
      <div class="components-body">
        <div class="cat-tabs" role="tablist" aria-label="组件分类">
          <button
            class="cat-tabs__item"
            :class="{ on: !focusedCategory && !searchKeyword }"
            title="最近使用"
            @click="jumpToCategory(null)"
          >
            <el-icon :size="12"><Clock /></el-icon>
            <span>最近</span>
          </button>
          <button
            v-for="cat in railCategories"
            :key="cat.value"
            class="cat-tabs__item"
            :class="{
              on: focusedCategory === cat.value,
              /* 画布当前选中的组件属于该分类时打个小圆点，扫一眼就知道滚去哪 */
              'has-selected': selectedCategory === cat.value && !focusedCategory,
            }"
            :style="{ '--cat-icon': visualOf(cat.value).iconColor, '--cat-bg': visualOf(cat.value).activeBg }"
            :title="`${visualOf(cat.value).label} · ${visualOf(cat.value).hint}`"
            @click="jumpToCategory(cat.value)"
          >
            <el-icon :size="12"><component :is="iconMap[visualOf(cat.value).icon]" /></el-icon>
            <span>{{ visualOf(cat.value).label }}</span>
            <i>{{ cat.count }}</i>
          </button>
        </div>

        <div ref="gridEl" class="component-grid">
          <!-- 最近使用：单行横滑胶囊，高度压到 44px 内，把首屏让给核心分类 -->
          <section
            v-if="!searchKeyword && !focusedCategory && recentComponents.length"
            ref="recentSec"
            class="recent-strip"
          >
            <span class="recent-strip__label">最近</span>
            <div class="recent-strip__grid">
              <ComponentHelpTip
                v-for="item in recentComponents"
                :key="`recent-${item.type}`"
                :type="item.type"
                :label="item.label"
                :icon="item.icon"
                :category-label="item.categoryLabel"
                :category="catKeyOf(item.type)"
              >
                <button
                  class="recent-chip"
                  :class="{ 'is-selected': pageStore.selectedComponent?.type === item.type }"
                  :style="chipStyleOf(item.type)"
                  draggable="true"
                  :title="item.label"
                  @dragstart="handleDragStart($event, item.type)"
                  @click="handleAdd(item.type)"
                >
                  <el-icon :size="12"><component :is="iconMap[item.icon]" /></el-icon>
                  <span>{{ item.label }}</span>
                </button>
              </ComponentHelpTip>
            </div>
          </section>

          <template v-for="cat in visibleCategories" :key="cat.value">
            <div
              :id="`cat-${cat.value}`"
              class="category-label category-label--row"
              :style="{
                '--cat-icon': visualOf(cat.value).iconColor,
                '--cat-bg': visualOf(cat.value).activeBg,
              }"
            >
              <span class="category-label__name">
                <el-icon :size="12"><component :is="iconMap[visualOf(cat.value).icon]" /></el-icon>
                {{ cat.label }}
                <i>{{ filteredComponentsByCategory(cat.value).length }}</i>
              </span>
              <button
                type="button"
                class="category-all"
                :class="{ active: focusedCategory === cat.value }"
                @click.stop="toggleCategoryFocus(cat.value)"
              >
                {{ focusedCategory === cat.value ? '返回' : '全部' }}
              </button>
            </div>

            <!--
              分组渲染：rows 是一个扁平的 [{kind:'sub'|'item', ...}] 序列，
              交给 v-for 一条条输出。**不要用 v-show 过滤 + v-else 分支**——
              那样模板会重复三遍卡片结构，改样式必漏，且 v-show 仍占 grid 格子
              （隐藏项照样撑出一列空白）。
            -->
            <template v-for="(row, ri) in categoryRows(cat.value)" :key="`${cat.value}-${ri}`">
              <div v-if="row.kind === 'sub'" class="subgroup-label">{{ row.label }}</div>
              <ComponentHelpTip
                v-else
                :type="row.item.type"
                :label="row.item.label"
                :icon="row.item.icon"
                :category-label="row.item.categoryLabel"
                :category="cat.value"
              >
                <button
                  class="component-card"
                  :class="[`is-${cat.value}`, { active: pageStore.selectedComponent?.type === row.item.type }]"
                  draggable="true"
                  @dragstart="handleDragStart($event, row.item.type)"
                  @click="handleAdd(row.item.type)"
                >
                  <span class="component-icon">
                    <el-icon :size="15"><component :is="iconMap[row.item.icon]" /></el-icon>
                  </span>
                  <span
                    class="component-name"
                    :class="{ 'component-name--long': isLongLabel(row.item.label) }"
                  >
                    {{ row.item.label }}
                  </span>
                </button>
              </ComponentHelpTip>
            </template>
          </template>

          <div v-if="searchKeyword && !hasSearchResults" class="empty-tip">未找到匹配"{{ searchKeyword }}"的组件</div>
        </div>
      </div>
    </section>

    <!-- 页面图层：切到该 Tab 时独享整栏高度，不再挤在左下角 -->
    <section
      v-show="mode === 'structure'"
      class="panel-section structure-section structure-section--solo"
    >
      <div class="section-title">
        <span>页面图层</span>
        <span class="section-count">{{ pageStore.components.length }}</span>
      </div>
      <p v-if="hasFixedTabShell" class="structure-hint">
        底栏「星球 / 商城 / 我的」为固定业务页，请在对应 Tab 绑定页的装修器里改；此处只展示当前页已插入的区块。
      </p>
      <div class="structure-list">
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
              <span class="structure-row__label">{{ index + 1 }}. {{ structureLabel(comp, index) }}</span>
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
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Search, Grid, Files, Clock } from '@element-plus/icons-vue'
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
import ComponentHelpTip from './ComponentHelpTip.vue'
import {
  CATEGORY_VISUALS,
  PANEL_CATEGORY_ORDER,
  SUB_GROUPS,
  SUBGROUP_MIN_COUNT,
  type CategoryVisual,
  type PanelCategory,
} from './panelDesign'
import { isBlockTypeUsable } from './blockAvailability'
import MiniIcon from '@/components/mini/MiniIcon.vue'
import * as ElementPlusIcons from '@element-plus/icons-vue'
import {
  BLOCK_CATEGORIES,
  BUILTIN_BLOCKS,
  countInstanceNodes,
  countSchemaNodes,
  pruneUnavailableNodes,
  unpackBlock,
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

/*
 * 剪枝后的内置区块：key → BlockTemplate。
 *
 * ⚠️ 必须是 computed 而不是 module 级 Map 缓存 —— 剪枝结果依赖
 * featureModulesStore / industryProfileStore，而这两个 store 是**异步加载**的。
 * 若在模块初始化时就把结果缓存下来，首次渲染（模块尚未 loaded）会把所有
 * 区块误判为不可用并永久锁死，表现为「头部营销/社群转化/信任背书全是空的」
 * （2026-10-05 由 E2E 截图发现）。computed 会随 store 变化自动重算。
 */
const prunedBlocks = computed<Map<string, BlockTemplate>>(() => {
  const map = new Map<string, BlockTemplate>()
  for (const block of BUILTIN_BLOCKS) {
    const { nodes } = pruneUnavailableNodes(block.schema, isTypeAvailable)
    if (nodes.length) map.set(block.key, { ...block, schema: nodes })
  }
  return map
})

/** 已解包的预览实例（缩略图/悬浮预览共用，避免每张卡片各解包一次）。
 *  存的是剪枝后的实例，保证卡片里看到的就是拖入后真正会有的组件。 */
const previewInstances = computed<Map<string, ComponentInstance[]>>(() => {
  const map = new Map<string, ComponentInstance[]>()
  for (const [key, block] of prunedBlocks.value) {
    map.set(key, unpackBlock(block))
  }
  return map
})

function getPrunedBlock(key: string): BlockTemplate | null {
  return prunedBlocks.value.get(key) ?? null
}

function blockPreviewCache(key: string): ComponentInstance[] {
  return previewInstances.value.get(key) ?? []
}

/** 卡片上标注的组件数 = 剪枝后实际会插入的数量 */
function blockNodeCount(key: string): number {
  const block = getPrunedBlock(key)
  return block ? countSchemaNodes(block.schema) : 0
}

/** 与画布 drop 管道共用同一份判定（blockAvailability.ts），避免两处漂移 */
const isTypeAvailable = isBlockTypeUsable

/**
 * 可用内置区块：**只按剪枝后是否还剩节点**判定。
 * 不用 filterAvailableBlocks 的严格口径（含任一不可用组件就整块剔除）——
 * 那会让「关掉优惠券」连带整个「会员转化区」消失，运营既看不到也用不上。
 */
const availableBuiltins = computed(() =>
  BUILTIN_BLOCKS.filter((b) => !!getPrunedBlock(b.key)),
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
  const pruned = getPrunedBlock(block.key) ?? block
  insertBlockNodes(unpackBlock(pruned), pruned.name)
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

/* ------------------------------------------------------------------ *
 * 面板视觉与导航（2026-10-05 密度重构）
 * ------------------------------------------------------------------ */

const gridEl = ref<HTMLElement | null>(null)

/**
 * 选中画布组件 → 组件库自动滚动到该卡片（2026-10-05 新增）。
 *
 * 实测基线：`.active` 高亮本来就生效，但卡片在 `top=1919` 而网格可视区只有 `244~1000`
 * —— 运营点了画布上的「品牌专栏」，左侧列表停在「营销」区，**根本不知道它在哪**。
 *
 * 两个必须处理的坑：
 * ① 搜索/分类聚焦态下，目标组件**不在渲染结果里**（被过滤掉了），
 *    直接查 DOM 找不到。必须先退出这两种状态，等 DOM 更新后再滚。
 * ② 卡片被 `ComponentHelpTip` 的 wrapper 包着，`.component-card.active` 的 offsetTop
 *    是相对 wrapper 的；用 `getBoundingClientRect` 差值算，与 DOM 层级无关。
 */
function scrollSelectedIntoView() {
  const box = gridEl.value
  const type = pageStore.selectedComponent?.type
  if (!box || !type) return

  /**
   * 目标可能是两处：主网格卡片（.component-card.active）或「最近使用」胶囊（.recent-chip.is-selected），
   * 两者的选中态 class 不同。两个都查，否则选中一个「最近用过」的组件时不会定位。
   */
  const target =
    box.querySelector<HTMLElement>('.component-card.active') ||
    box.querySelector<HTMLElement>('.recent-chip.is-selected')
  if (!target) return

  // 目标已可见则不动 —— 否则每次点画布列表都会跳一下，是噪音
  const br = box.getBoundingClientRect()
  const cr = target.getBoundingClientRect()
  const VISIBLE_PAD = 12
  if (cr.top >= br.top + VISIBLE_PAD && cr.bottom <= br.bottom - VISIBLE_PAD) return

  // 与容器顶部的距离 → 目标滚动位置；留 24px 余量，避免紧贴顶部显得被"顶住"
  const delta = cr.top - br.top - 24
  box.scrollTo({
    top: Math.max(0, box.scrollTop + delta),
    behavior: 'smooth',
  })
}

/**
 * 监听选中变化：先复位过滤态，等卡片进入 DOM 再滚动。
 *
 * `nextTick` 不足以覆盖「退出聚焦态后要等一帧重渲染」，
 * 所以用 `requestAnimationFrame` 再等一帧，实测能稳定命中。
 */
watch(
  () => pageStore.selectedComponent?.type,
  async (type, prev) => {
    if (!type || type === prev) return
    // 目标不在当前渲染结果里 → 复位过滤态，等它出现
    const hasVisible =
      gridEl.value?.querySelector('.component-card.active, .recent-chip.is-selected')
    if (!hasVisible) {
      focusedCategory.value = null
      if (searchKeyword.value) searchKeyword.value = ''
      await nextTick()
      requestAnimationFrame(() => requestAnimationFrame(scrollSelectedIntoView))
    } else {
      scrollSelectedIntoView()
    }
  },
  { flush: 'post' },
)

/** 取分类视觉配置；未登记的分类回落到内容类配色，不出现无样式卡片 */
function visualOf(category: string): CategoryVisual {
  return CATEGORY_VISUALS[category as PanelCategory] ?? CATEGORY_VISUALS.content
}

/** 组件 type → 所属分类（用于「最近使用」胶囊的语义色） */
function catKeyOf(type: string): PanelCategory {
  const def = getComponentDef(type as ComponentType)
  return (def?.category as PanelCategory) ?? 'content'
}

/** 画布当前选中组件所属分类；用于在分类胶囊上打「包含选中项」的小圆点 */
const selectedCategory = computed<PanelCategory | null>(() => {
  const type = pageStore.selectedComponent?.type
  if (!type) return null
  const def = getComponentDef(type as ComponentType)
  return (def?.category as PanelCategory) ?? 'content'
})

/** 最近使用胶囊的分类语义色（选中态要用 --cat-icon / --cat-bg） */
function chipStyleOf(type: string): Record<string, string> {
  const v = visualOf(catKeyOf(type))
  return { '--cat-icon': v.iconColor, '--cat-bg': v.activeBg }
}

/** Rail 上的分类项：只列**当前真有组件**的分类，避免点进去是空的 */
const railCategories = computed(() =>
  categories.value
    .map((cat) => ({ value: cat.value as PanelCategory, count: filteredComponentsByCategory(cat.value).length }))
    .filter((c) => c.count > 0),
)

/**
 * 超长名判定阈值。
 *
 * 11px 字号下中文约 11px/字，75px 卡片扣 6px×2 内边距 + 2px 边框 = 67px 可用，
 * 留 2px 余量 → 6 字（66px）是单行上限，7 字及以上走两行。
 * 新增组件名很长时会被这条规则接住，不会静默变成「向主理人…」。
 */
const LONG_LABEL_CHARS = 7
function isLongLabel(label: string): boolean {
  return label.length >= LONG_LABEL_CHARS
}

/**
 * 某分类的渲染行序列：[微标题, 卡片, 微标题, 卡片 …]。
 *
 * 之所以在脚本里摊平而不是模板里 v-show 过滤：
 *  - v-show 隐藏的项**仍占 grid 格子**，会撑出整列空白；
 *  - 模板里分组要写三遍卡片结构，改一次样式漏两处。
 * 摊平成一个数组后模板只有一处卡片渲染，密度与分组逻辑解耦。
 */
type CategoryRow =
  | { kind: 'sub'; label: string; key: string }
  | { kind: 'item'; item: ComponentDefinition; key: string }

function categoryRows(category: string): CategoryRow[] {
  const items = filteredComponentsByCategory(category)
  if (!items.length) return []
  const groups = SUB_GROUPS[category as PanelCategory]
  // 未配分组、或数量不足阈值 → 不拆，直接平铺
  if (!groups || items.length < SUBGROUP_MIN_COUNT) {
    return items.map((item) => ({ kind: 'item', item, key: item.type }))
  }
  const rows: CategoryRow[] = []
  for (const g of groups) {
    const bucket = items.filter((it) => g.types.includes(String(it.type)))
    if (!bucket.length) continue
    rows.push({ kind: 'sub', label: g.label, key: `sub-${g.key}` })
    for (const item of bucket) rows.push({ kind: 'item', item, key: `${g.key}-${item.type}` })
  }
  // 未被任何分组收录的兜底进「其它」，**不能静默丢组件** —— 丢了运营就找不到它
  const rest = items.filter(
    (it) => !groups.some((g) => g.types.includes(String(it.type))),
  )
  if (rest.length) {
    rows.push({ kind: 'sub', label: '其它', key: 'sub-rest' })
    for (const item of rest) rows.push({ kind: 'item', item, key: `rest-${item.type}` })
  }
  return rows
}

/**
 * Rail 点击：滚到该分类锚点。
 *
 * 用 scrollTo 而非 scrollIntoView：后者会把整个页面（含属性面板、画布）
 * 一起滚，运营会「找不到北」；而且它对 sticky 顶栏的处理不可控。
 * 手动算 scrollTop 还能顺带处理「目标已在可视区」的情况 —— 此时直接
 * 跳过去反而会从顶部重看一遍，是噪音。
 */
function jumpToCategory(category: string | null) {
  focusedCategory.value = null
  if (category && searchKeyword.value) searchKeyword.value = ''
  const box = gridEl.value
  if (!box) return
  // 分类标题上方留一点余量，紧贴顶部会显得被"顶住"
  const PAD = 8

  if (!category) {
    box.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  const target = box.querySelector<HTMLElement>(`#cat-${category}`)
  if (!target) return

  /*
   * ⚠️ 用 getBoundingClientRect 的差值算，别用 `target.offsetTop - box.offsetTop`。
   * 原因：offsetTop 走的是 offsetParent 链，而面板内有 sticky 次级微标题、
   * 嵌套 flex 布局，实测 offsetTop 链算出来的位置与真实渲染位置差 ~140px
   * → 滚过去时分类标题正好落在容器**上方外**，运营看到的是「跳过去了但不知道跳到哪」。
   * rect 差值直接是「目标距容器上沿还差多少像素」，与布局实现解耦。
   */
  const delta = target.getBoundingClientRect().top - box.getBoundingClientRect().top - PAD
  const cur = box.scrollTop
  const absTop = cur + delta
  // 已在可视区就别动 —— 点了没反应会让人以为按钮坏了
  if (absTop >= cur && absTop <= cur + box.clientHeight - 60) return
  box.scrollTo({ top: Math.max(0, cur + delta), behavior: 'smooth' })
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

onMounted(() => {
  // 画布里「另存为区块」成功后热刷新「我的区块」列表
  window.addEventListener('pagebuilder:my-blocks-changed', reloadMyBlocks)
  loadRecentTypes()
  if (!featureModulesStore.loaded) {
    featureModulesStore.load()
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('pagebuilder:my-blocks-changed', reloadMyBlocks)
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
  gap: 10px;
  padding: 0;
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

/* 左侧顶栏两个大 Tab：更大点击区 + 图标，明确区分「加东西」和「排东西」 */
.left-seg {
  display: flex;
  gap: 3px;
  flex-shrink: 0;
  padding: 8px 8px 0;
  background: #fff;
  border-bottom: 1px solid var(--pc-line, #e8dfd3);
}

.left-seg button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  flex: 1;
  min-width: 0;
  height: 34px;
  padding: 0 8px;
  color: var(--pc-mute, #6b5b4e);
  font-family: inherit;
  font-size: 12.5px;
  white-space: nowrap;
  background: transparent;
  border: 0;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease;

  &:hover {
    color: var(--pc-acc, #c08e6e);
  }

  &.on {
    color: var(--pc-acc, #c08e6e);
    font-weight: 600;
    border-bottom-color: var(--pc-acc, #c08e6e);
  }
}

.left-seg__count {
  min-width: 17px;
  padding: 0 4px;
  color: var(--pc-faint, #7a6a5c);
  font-size: 10.5px;
  font-weight: 500;
  line-height: 15px;
  text-align: center;
  background: var(--pc-soft, #f4efe8);
  border-radius: 999px;
}

/* 组件库内的次级切换：更轻的胶囊，视觉层级低于顶栏大 Tab */
.sub-seg {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
  margin: 0 8px;
  padding: 2px;
  background: var(--pc-soft, #f4efe8);
  border-radius: 7px;

  button {
    flex: 1;
    height: 24px;
    padding: 0 8px;
    color: var(--pc-mute, #6b5b4e);
    font-family: inherit;
    font-size: 11.5px;
    background: transparent;
    border: 0;
    border-radius: 5px;
    cursor: pointer;

    &.on {
      color: #2a1f17;
      font-weight: 600;
      background: #fff;
      box-shadow: 0 1px 2px rgb(42 31 23 / 8%);
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

.panel-section--components {
  flex: 1;
}

/* 页面图层：独享整栏高度 */
.structure-section--solo {
  flex: 1;
  min-height: 0;
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

/* Rail + 网格两栏：Rail 常驻左，网格独立滚动 */
.components-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

/* ---------------------------------------------------------------- *
 * 顶部分类切换器
 *
 * ⚠️ 原本按需求做的是左侧 44px 垂直 Rail，实测**不可行**：
 * 面板总宽只有 249px（外层装修器布局定的，不可拖），扣掉 44px Rail
 * 后网格剩 205px，3 列每卡 60px、扣内边距标题只剩 43px ≈ 3 个汉字 ——
 * 「政策里程碑轴」「折叠问答面板」全被截成「政策里程…」，运营反而认不出
 * 是哪个组件，比截断前更糟。
 * 算过 5 种方案（3列+44 / 3列+36 / 3列+32 / 2列+44）标题都放不下 6 字，
 * **Rail 与 3 列在这个宽度下互斥**。
 * 故改为顶部分类胶囊条：跳转能力等价（一次点击直达锚点），
 * 但把整幅宽度让给网格，标题可用宽度从 43px 回到 58px。
 * ---------------------------------------------------------------- */
.cat-tabs {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 3px;
  padding: 6px 7px 5px;
  background: #fff;
  border-bottom: 1px solid var(--pc-line, #e8dfd3);
}

/*
 * 换行铺开而非横向滚动。
 *
 * ⚠️ 试过 `overflow-x: auto` 单行横滑，实测是**硬伤**：面板 249px、7 个分类
 * 胶囊内容宽 485px，后 4 个（商品/营销/布局/品牌）完全落在可视区外 ——
 * 运营不知道还要横着滑，需求里的「无跳屏」直接不成立。必须全部可点。
 *
 * 为此把胶囊压到 22px 高、去掉计数徽标（数量在分类标题里已有），
 * 7 个才挤得进两行内且不显得拥挤。
 */
.cat-tabs__item {
  display: inline-flex;
  gap: 3px;
  align-items: center;
  flex-shrink: 0;
  height: 22px;
  padding: 0 7px;
  font-family: inherit;
  font-size: 11px;
  color: var(--pc-mute, #6b5b4e);
  white-space: nowrap;
  cursor: pointer;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 999px;
  transition: 0.15s;

  i {
    font-size: 9.5px;
    font-style: normal;
    color: #c0b2a3;
  }

  &:hover {
    color: var(--cat-icon, var(--pc-acc, #c08e6e));
    background: var(--cat-bg, #f7efe7);
  }

  &.on {
    font-weight: 600;
    color: var(--cat-icon, var(--pc-acc, #c08e6e));
    background: var(--cat-bg, #f7efe7);
    border-color: var(--cat-icon, var(--pc-acc, #c08e6e));
  }

  /*
   * 「该分类里有当前选中的组件」—— 用右上角小圆点表示，不占用胶囊的横向空间
   * （249px 面板下 7 个胶囊已经贴边，加文字必然换行）。
   * 与 .on 区分：.on 是「用户点了这个分类」，圆点是「画布选中项在这里」。
   */
  &.has-selected {
    position: relative;

    &::after {
      position: absolute;
      top: 1px;
      right: 2px;
      width: 5px;
      height: 5px;
      content: '';
      background: var(--cat-icon, var(--pc-acc, #c08e6e));
      border-radius: 50%;
    }
  }
}

/* ---------------------------------------------------------------- *
 * 最近使用：三列紧凑网格
 *
 * ⚠️ 原来是单行横滑（overflow-x: auto），实测**有 4/6 个胶囊完全看不到**：
 * 面板 249px − 标签 23px = 容器 206px，而 6 个胶囊内容总宽 459px
 * （"笔记瀑布流"单颗就 86px）。横滑在窄容器里既看不出「还能滑」、
 * 又让「星球顶栏」被硬裁成「星球顶…」，看起来像坏了而不是像可滑。
 * 改成 3 列换行铺开：6 个 = 2 行，全部可见，且不依赖横向滚动。
 * ---------------------------------------------------------------- */
.recent-strip {
  display: flex;
  grid-column: 1 / -1;
  gap: 5px;
  align-items: flex-start;
  padding: 3px 0 5px;
}

.recent-strip__label {
  flex-shrink: 0;
  padding: 3px 0 0 1px;
  color: var(--pc-faint, #a99c8e);
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.3px;
}

.recent-strip__grid {
  display: grid;
  flex: 1;
  /* 2 列而非 3 列：实测 3 列时每格 66px，装不下「图标 12 + 间隙 3 + 4 字 44 + 内边距 12 = 71px」，
     「加入群聊 / 星球顶栏 / 商品列表 / 笔记瀑布流」全被裁成省略号（实测 4/6 个）。
     2 列每格 ~103px，6 个胶囊 = 3 行，全部文字完整。 */
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px;
  min-width: 0;
}

.recent-chip {
  display: flex;
  gap: 3px;
  align-items: center;
  min-width: 0;
  height: 24px;
  padding: 0 6px;
  overflow: hidden;
  font-family: inherit;
  font-size: 11px;
  color: var(--pc-mute, #6b5b4e);
  cursor: grab;
  background: #f7f2ec;
  border: 1px solid var(--pc-line, #e8dfd3);
  border-radius: 999px;
  transition: 0.15s;

  span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &:hover {
    color: var(--pc-acc, #c08e6e);
    background: var(--pc-acc-soft, #f7efe7);
    border-color: var(--pc-acc, #c08e6e);
  }

  /* 画布当前选中项就在这里 —— 与主网格卡片用同一套内描边，保证视觉一致 */
  &.is-selected {
    font-weight: 700;
    color: var(--cat-icon, var(--pc-acc, #c08e6e));
    background: var(--cat-bg, var(--pc-acc-soft, #f7efe7));
    border-color: var(--cat-icon, var(--pc-acc, #c08e6e));
    box-shadow: inset 0 0 0 1px var(--cat-icon, var(--pc-acc, #c08e6e));
  }
}

/* ---------------------------------------------------------------- *
 * 组件网格：3 列紧凑
 * ---------------------------------------------------------------- */
.component-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-content: start;
  flex: 1;
  min-width: 0;
  min-height: 0;
  gap: 5px;
  overflow-y: auto;
  padding: 7px 7px 14px;
  scroll-behavior: smooth;
}
.category-label {
  display: flex;
  grid-column: 1 / -1;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 2px 3px;
  color: var(--pc-faint, #a99c8e);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.category-label__name {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  color: var(--cat-icon, var(--pc-mute, #6b5b4e));

  i {
    padding: 0 5px;
    font-size: 10px;
    font-style: normal;
    font-weight: 500;
    color: var(--pc-faint, #a99c8e);
    background: var(--cat-bg, #f4efe8);
    border-radius: 999px;
  }
}

/* 次级微标题：极细，吸顶时留出模糊底避免文字与卡片叠在一起 */
.subgroup-label {
  position: sticky;
  top: 0;
  z-index: 2;
  grid-column: 1 / -1;
  padding: 4px 2px 2px;
  font-size: 10px;
  font-weight: 600;
  color: #b9ab9c;
  letter-spacing: 0.4px;
  background: linear-gradient(#fff 62%, rgb(255 255 255 / 0));
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
  gap: 3px;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: 52px;
  padding: 6px 3px;
  overflow: hidden;
  font-family: inherit;
  font-size: 11px;
  line-height: 1.25;
  color: #6f6154;
  text-align: center;
  cursor: pointer;
  /* 分类底色/边框由 is-* 类覆盖（见 panelDesign.ts） */
  background: #f7f2ec;
  border: 1px solid #e9e1d5;
  border-radius: 8px;
  transition: 0.15s;

  &:hover,
  &.active {
    font-weight: 700;
    color: var(--cat-icon, var(--pc-acc, #c08e6e));
    background: var(--cat-bg, var(--pc-acc-soft, #f7efe7));
    border-color: var(--cat-icon, var(--pc-acc, #c08e6e));
  }

  /*
   * 当前选中 = 画布上正在编辑的那个组件。
   * 必须与 hover 明显区分：hover 是「鼠标在这」，active 是「你正在改这个」。
   * 之前两者同一样式，导致选中后看不出到底命中了哪张卡。
   */
  &.active {
    box-shadow: inset 0 0 0 2px var(--cat-icon, var(--pc-acc, #c08e6e));
  }

  /* 选中态是语义状态，别被 hover 的边框色盖掉 */
  &:hover:not(.active) {
    border-style: dashed;
  }

  &:active {
    transform: scale(0.96);
  }
}

.component-icon {
  font-size: 15px;
  line-height: 1;
}

/* 3 列后卡片更窄，标题必须单行省略，否则「折叠问答面板」这类会撑成两行破坏等高 */
.component-name {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
}

/*
 * 超长组件名（实测只有「向主理人提问条」7 字 = 74px > 67px 可用）走两行。
 *
 * ⚠️ 不能直接放开 white-space: normal —— 那样**每行高度由最高的那张卡决定**，
 * 整行被单张长名卡撑到两行，等高就破了（这正是上一轮回归的形态）。
 * 这里用固定两行高度 + 溢出隐藏：无论 1 行还是 2 行，卡片高度都是定值，
 * 同行等高由 grid 的 align-items 保证，不受文字行数影响。
 */
.component-name--long {
  display: -webkit-box;
  height: 26px; /* 2 × 12.5px 行高 */
  overflow: hidden;
  font-size: 10.5px;
  line-height: 1.25;
  text-align: center;
  white-space: normal;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* ---------------------------------------------------------------- *
 * 分类语义色
 *
 * 色值与 panelDesign.ts 的 CATEGORY_VISUALS 一一对应。之所以 CSS 里再写一遍
 * 而不是全部走内联 style：卡片 hover 态要同时换 4 个变量，内联 style 只能在
 * 常态给值，hover 得靠类切换 —— 保持「常态色 = 类、hover 色 = 同一个类里的
 * hover 规则」最省心。
 * ⚠️ 改色时两边都要改；验证方式见 scripts/measure-component-grid.mjs 的分类色检查。
 * ---------------------------------------------------------------- */
.component-card.is-content {
  --cat-icon: #7a6650;
  --cat-bg: #f3ece1;
  background: #faf7f2;
  border-color: #e9e1d5;
}

.component-card.is-planet {
  --cat-icon: #a9762c;
  --cat-bg: #f8eed9;
  background: #fbf6ec;
  border-color: #ebdfc6;
}

.component-card.is-commerce {
  --cat-icon: #b06a3c;
  --cat-bg: #f6e8db;
  background: #faf4ef;
  border-color: #ebdbcd;
}

.component-card.is-marketing {
  --cat-icon: #c25f2c;
  --cat-bg: #f8e6d3;
  background: #fbf3ec;
  border-color: #ecd8c3;
}

.component-card.is-layout {
  --cat-icon: #5b6b7c;
  --cat-bg: #e9eef3;
  background: #f4f6f8;
  border-color: #dfe5ea;
}

.component-card.is-warm {
  --cat-icon: #a06a4a;
  --cat-bg: #f2e5d8;
  background: #f8f2ec;
  border-color: #e6d6c6;
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

.structure-row__label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.drag-handle {
  display: inline-flex;
  flex-shrink: 0;
  color: #d9cfc3;
  cursor: grab;
}

.structure-row--ghost {
  opacity: 0.5;
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
