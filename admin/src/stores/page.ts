/**
 * 页面搭建状态管理
 * 管理编辑器状态：当前页面DSL、选中组件、操作历史等
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  PageDSL,
  PageRecord,
  ComponentInstance,
  ComponentType,
  GlobalConfig,
  PageConfig,
} from '@/types/page'
import { ComponentType as CT } from '@/types/page'
import { getDefaultProps, getDefaultStyle } from '@/components/page-builder/componentRegistry'
import { createWarmHomeTemplateComponents } from '@/components/page-builder/warmHomeTemplate'
import { isWarmHomeShellOnly } from '@/utils/warmHomeExpand'
import { defaultWarmDiscoverProps } from '@/constants/warmDiscoverDefaults'

/** 生成唯一 ID */
function generateId(): string {
  return `comp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
}

/** 创建默认 DSL */
function createDefaultDSL(name: string = '未命名页面'): PageDSL {
  return {
    schema_version: '1.0',
    page: {
      id: generateId(),
      name,
      type: 'home',
      path: 'pages/index/index',
      background_color: '#f6f8fb',
    },
    components: [
      {
        id: generateId(),
        type: CT.Banner,
        props: {
          images: [{ image: '', title: '五一活动限时优惠', link_type: 'page', link_url: '/pages/activity/list' }],
          autoplay: true,
          interval: 3000,
          indicator_dots: true,
          border_radius: 8,
        },
        style: { margin_top: 12, margin_bottom: 10, margin_left: 12, margin_right: 12, border_radius: 8 },
      },
      {
        id: generateId(),
        type: CT.Nav,
        props: {
          items: [
            { icon: '📝', title: '内容', link_type: 'page', link_url: '/pages/content/list' },
            { icon: '👑', title: '会员', link_type: 'page', link_url: '/pages/member/index' },
            { icon: '🎪', title: '活动', link_type: 'page', link_url: '/pages/activity/list' },
            { icon: '🛍️', title: '商城', link_type: 'page', link_url: '/pages/product/list' },
          ],
          columns: 4,
          style_type: 'icon_text',
        },
        style: { padding_top: 12, padding_bottom: 12, background_color: '#ffffff' },
      },
      {
        id: generateId(),
        type: CT.MemberCard,
        props: {
          title: '金卡会员',
          show_level: true,
          show_points: true,
          show_balance: true,
        },
        style: { margin_top: 0, margin_bottom: 10, margin_left: 12, margin_right: 12, border_radius: 8 },
      },
      {
        id: generateId(),
        type: CT.ArticleList,
        props: {
          title: '精选内容',
          layout: 'card',
          style_type: 'card',
          columns: 1,
          show_cover: true,
          show_date: true,
          limit: 4,
          items: [],
          data_source: { type: 'content', params: { status: 'published', sort_by: 'newest' } },
        },
        style: { padding_left: 12, padding_right: 12, margin_bottom: 10 },
      },
      {
        id: generateId(),
        type: CT.ProductList,
        props: {
          title: '推荐商品',
          columns: 2,
          show_price: true,
          show_sales: true,
          show_cart: true,
          limit: 2,
        },
        style: { padding_left: 8, padding_right: 8 },
      },
    ],
    global_config: {
      pull_refresh: false,
      reach_bottom_load: false,
    },
  }
}

function normalizePageType(type?: PageRecord['type']): string {
  const value = String(type || '').trim()
  const map: Record<string, string> = {
    '1': 'home',
    '2': 'topic',
    '3': 'custom',
    home: 'home',
    topic: 'topic',
    activity: 'activity',
    custom: 'custom',
  }
  return map[value] || 'custom'
}

function tryParseDsl(raw?: string | null): PageDSL | null {
  if (!raw || typeof raw !== 'string' || !raw.trim()) return null
  try {
    return JSON.parse(raw) as PageDSL
  } catch {
    return null
  }
}

/** 从详情接口字段解析初始 DSL（优先有组件的草稿/线上稿） */
function resolveInitialDsl(page: PageRecord): PageDSL {
  const record = page as PageRecord & { dslContent?: string }
  const candidates: PageDSL[] = []
  if (page.dsl) candidates.push(JSON.parse(JSON.stringify(page.dsl)))
  for (const raw of [record.draftDslContent, record.publishedDslContent, record.dslContent]) {
    const parsed = tryParseDsl(raw)
    if (parsed) candidates.push(parsed)
  }
  const withComponents = candidates.find((d) => Array.isArray(d.components) && d.components.length > 0)
  if (withComponents) return JSON.parse(JSON.stringify(withComponents))
  if (candidates[0]) return JSON.parse(JSON.stringify(candidates[0]))
  return createEmptyDSL(page)
}

/** 打开编辑器时在内存中补全暖阁页展示（不写脏、不入历史栈） */
function hydrateWarmPagesForEditor(target: PageDSL) {
  const path = String(target.page?.path || '')
  if (isWarmHomeShellOnly(target.components)) {
    const shell = target.components.find((c) => c.type === CT.WarmHome)
    const props = (shell?.props || {}) as Record<string, string>
    const blocks = createWarmHomeTemplateComponents({
      authorsTitle: props.authors_title || props.authorsTitle,
      columnsTitle: props.columns_title || props.columnsTitle,
      planetTitle: props.planet_title || props.planetTitle,
    })
    const floats = target.components.filter((c) => c.type === CT.FloatButton)
    target.components = [...blocks, ...floats]
    return
  }
  if (path.includes('warm-discover') || target.components.some((c) => c.type === CT.WarmDiscover)) {
    const comp = target.components.find((c) => c.type === CT.WarmDiscover)
    if (!comp) return
    const tabs = comp.props?.tabs
    if (Array.isArray(tabs) && tabs.length > 0) return
    comp.props = defaultWarmDiscoverProps({ ...(comp.props || {}), title: comp.props?.title || '发现' })
  }
}

/** 创建空白 DSL：用于新建页面首次装修 */
function createEmptyDSL(page?: Partial<PageRecord>): PageDSL {
  return {
    schema_version: '1.0',
    page: {
      id: page?.id ? String(page.id) : generateId(),
      name: page?.name || '未命名页面',
      type: normalizePageType(page?.type),
      path: page?.path || '',
      share_title: page?.shareTitle || page?.share_title || '',
      share_image: page?.shareImage || page?.share_image || '',
      background_color: page?.background_color || '#f6f8fb',
    },
    components: [],
    global_config: {
      pull_refresh: false,
      reach_bottom_load: false,
    },
  }
}

/** 深拷贝 DSL，用于历史快照，避免引用共享导致撤销失效 */
function cloneDSL(source: PageDSL): PageDSL {
  return JSON.parse(JSON.stringify(source))
}

/** 历史栈上限，超出后丢弃最旧记录，避免长时间编辑内存无限增长 */
const MAX_HISTORY = 50
/** props/style 连续输入（如拖动数字、连续打字）合并为一条历史记录的静默窗口 */
const HISTORY_MERGE_WINDOW = 500

export const usePageStore = defineStore('page', () => {
  /** 当前编辑的页面记录 */
  const currentPage = ref<PageRecord | null>(null)
  /** 当前页面 DSL */
  const dsl = ref<PageDSL>(createDefaultDSL())
  /** 当前选中的组件 ID */
  const selectedComponentId = ref<string | null>(null)
  /** 是否与上次成功落库的 DSL 不一致（用于离开拦截） */
  const isDirty = ref(false)
  /** 保存中 */
  const saving = ref(false)
  /** 上次成功保存后的 DSL 快照（JSON） */
  const lastSavedDslJson = ref('')
  /** 本次打开编辑器时的基准 DSL，撤销不可越过 */
  let sessionBaseline: PageDSL | null = null

  const hasUnpersistedChanges = computed(
    () => lastSavedDslJson.value !== JSON.stringify(dsl.value),
  )

  function recomputeDirty() {
    isDirty.value = hasUnpersistedChanges.value
  }

  function markSavedToServer() {
    lastSavedDslJson.value = JSON.stringify(dsl.value)
    isDirty.value = false
  }

  function dslSnapshotKey(value: PageDSL): string {
    return JSON.stringify(value)
  }

  function isSameDsl(a: PageDSL, b: PageDSL | null): boolean {
    if (!b) return false
    return dslSnapshotKey(a) === dslSnapshotKey(b)
  }

  /** B1：撤销/重做历史栈 */
  const historyPast = ref<PageDSL[]>([])
  const historyFuture = ref<PageDSL[]>([])
  let historyMergeTimer: ReturnType<typeof setTimeout> | null = null
  let historyMergePending = false

  const canUndo = computed(() => historyPast.value.length > 0)
  const canRedo = computed(() => historyFuture.value.length > 0)

  /** 清空历史（切换/重置页面时调用，避免跨页面误撤销） */
  function resetHistory() {
    historyPast.value = []
    historyFuture.value = []
    historyMergePending = false
    if (historyMergeTimer) {
      clearTimeout(historyMergeTimer)
      historyMergeTimer = null
    }
  }

  /** 去掉栈底早于本次打开页面的快照，避免跨会话式连撤 */
  function pruneHistoryPastBaseline() {
    while (historyPast.value.length > 0) {
      const tail = historyPast.value[historyPast.value.length - 1]
      if (sessionBaseline && isSameDsl(tail, sessionBaseline)) {
        historyPast.value.pop()
      } else {
        break
      }
    }
  }

  /** 立即打一条历史快照（结构性操作：增删移动复制等，每次都单独可撤销） */
  function commitHistory() {
    const snapshot = cloneDSL(dsl.value)
    if (sessionBaseline && isSameDsl(snapshot, sessionBaseline)) return
    if (historyPast.value.length) {
      const last = historyPast.value[historyPast.value.length - 1]
      if (dslSnapshotKey(last) === dslSnapshotKey(snapshot)) return
    }
    historyPast.value.push(snapshot)
    if (historyPast.value.length > MAX_HISTORY) {
      historyPast.value.shift()
    }
    historyFuture.value = []
  }

  /**
   * 合并式历史快照：用于 props/style 这类连续输入场景。
   * 一段连续操作（500ms 内）只在开始时打一条快照，避免"改一个字段=一条历史"。
   */
  function commitHistoryDebounced() {
    if (!historyMergePending) {
      const snapshot = cloneDSL(dsl.value)
      if (sessionBaseline && isSameDsl(snapshot, sessionBaseline)) {
        historyMergePending = true
      } else if (
        !historyPast.value.length
        || dslSnapshotKey(historyPast.value[historyPast.value.length - 1]) !== dslSnapshotKey(snapshot)
      ) {
        historyPast.value.push(snapshot)
      }
      if (historyPast.value.length > MAX_HISTORY) {
        historyPast.value.shift()
      }
      historyFuture.value = []
      historyMergePending = true
    }
    if (historyMergeTimer) clearTimeout(historyMergeTimer)
    historyMergeTimer = setTimeout(() => {
      historyMergePending = false
      historyMergeTimer = null
    }, HISTORY_MERGE_WINDOW)
  }

  /** 撤销后选中态若指向已不存在的组件，需要清空，避免属性面板挂空引用 */
  function reconcileSelection() {
    if (selectedComponentId.value && !dsl.value.components.some((c) => c.id === selectedComponentId.value)) {
      selectedComponentId.value = null
    }
  }

  function undo() {
    if (!historyPast.value.length) return
    historyFuture.value.push(cloneDSL(dsl.value))
    const prev = historyPast.value.pop() as PageDSL
    dsl.value = prev
    pruneHistoryPastBaseline()
    if (sessionBaseline && isSameDsl(dsl.value, sessionBaseline)) {
      historyPast.value = []
    }
    recomputeDirty()
    reconcileSelection()
  }

  function redo() {
    if (!historyFuture.value.length) return
    historyPast.value.push(cloneDSL(dsl.value))
    const next = historyFuture.value.pop() as PageDSL
    dsl.value = next
    recomputeDirty()
    reconcileSelection()
  }

  function findComponentDeep(list: ComponentInstance[], id: string): ComponentInstance | null {
    for (const c of list) {
      if (c.id === id) return c
      if (c.children?.length) {
        const found = findComponentDeep(c.children, id)
        if (found) return found
      }
    }
    return null
  }

  /** 当前选中的组件实例 */
  const selectedComponent = computed<ComponentInstance | null>(() => {
    if (!selectedComponentId.value) return null
    return findComponentDeep(dsl.value.components, selectedComponentId.value)
  })

  /** 组件列表 */
  const components = computed(() => dsl.value.components)

  /** 页面配置 */
  const pageConfig = computed(() => dsl.value.page)

  /** 全局配置 */
  const globalConfig = computed(() => dsl.value.global_config)

  /** 设置当前页面 */
  function setCurrentPage(page: PageRecord) {
    currentPage.value = page
    dsl.value = resolveInitialDsl(page)
    hydrateWarmPagesForEditor(dsl.value)
    selectedComponentId.value = dsl.value.components[0]?.id || null
    sessionBaseline = cloneDSL(dsl.value)
    resetHistory()
    markSavedToServer()
  }

  /** 重置编辑器 */
  function resetEditor() {
    currentPage.value = null
    dsl.value = createEmptyDSL()
    selectedComponentId.value = null
    sessionBaseline = null
    lastSavedDslJson.value = ''
    isDirty.value = false
    resetHistory()
  }

  /** 将 warm_home 壳展开为可编辑暖阁区块 */
  function expandWarmHomeFromShell(): boolean {
    if (!isWarmHomeShellOnly(dsl.value.components)) {
      return false
    }
    commitHistory()
    const shell = dsl.value.components.find((c) => c.type === CT.WarmHome)
    const props = (shell?.props || {}) as Record<string, string>
    const blocks = createWarmHomeTemplateComponents({
      authorsTitle: props.authors_title || props.authorsTitle,
      columnsTitle: props.columns_title || props.columnsTitle,
      planetTitle: props.planet_title || props.planetTitle,
    })
    const floats = dsl.value.components.filter((c) => c.type === CT.FloatButton)
    dsl.value.components = [...blocks, ...floats]
    selectedComponentId.value = blocks[0]?.id || null
    recomputeDirty()
    return true
  }

  function resolveInsertIndex(index?: number): number {
    if (index !== undefined && index >= 0) return Math.min(index, dsl.value.components.length)
    const id = selectedComponentId.value
    if (!id) return dsl.value.components.length
    const idx = dsl.value.components.findIndex((c) => c.id === id)
    return idx >= 0 ? idx + 1 : dsl.value.components.length
  }

  /** 在指定位置插入完整组件（用于删除撤销） */
  function insertComponentAt(comp: ComponentInstance, index: number) {
    commitHistory()
    const at = Math.max(0, Math.min(index, dsl.value.components.length))
    dsl.value.components.splice(at, 0, comp)
    selectedComponentId.value = comp.id
    recomputeDirty()
  }

  /** 添加组件 */
  function addComponent(type: ComponentType, index?: number) {
    const insertAt = resolveInsertIndex(index)
    if (type === CT.WarmHome) {
      commitHistory()
      const blocks = createWarmHomeTemplateComponents()
      if (insertAt >= 0) {
        dsl.value.components.splice(insertAt, 0, ...blocks)
      } else {
        dsl.value.components.push(...blocks)
      }
      selectedComponentId.value = blocks[0]?.id || null
      recomputeDirty()
      return blocks[0]
    }
    commitHistory()
    const comp: ComponentInstance = {
      id: generateId(),
      type,
      props: getDefaultProps(type),
      style: getDefaultStyle(type),
    }
    if (type === CT.BrandHeader) {
      dsl.value.components.unshift(comp)
    } else {
      dsl.value.components.splice(insertAt, 0, comp)
    }
    selectedComponentId.value = comp.id
    recomputeDirty()
    return comp
  }

  /** 从模板添加组件（带预设 props） */
  function addComponentWithProps(type: ComponentType, props: Record<string, any>, index?: number) {
    commitHistory()
    const comp: ComponentInstance = {
      id: generateId(),
      type,
      props: { ...getDefaultProps(type), ...props },
      style: getDefaultStyle(type),
    }
    if (index !== undefined && index >= 0) {
      dsl.value.components.splice(index, 0, comp)
    } else {
      dsl.value.components.push(comp)
    }
    selectedComponentId.value = comp.id
    recomputeDirty()
    return comp
  }

  /** 删除组件 */
  function removeComponent(id: string) {
    const idx = dsl.value.components.findIndex((c) => c.id === id)
    if (idx !== -1) {
      commitHistory()
      dsl.value.components.splice(idx, 1)
      if (selectedComponentId.value === id) {
        selectedComponentId.value = null
      }
      recomputeDirty()
    }
  }

  /** 选中组件 */
  function selectComponent(id: string | null) {
    selectedComponentId.value = id
  }

  /** 更新组件 props（连续输入合并为一条历史） */
  function updateComponentProps(id: string, props: Record<string, any>) {
    const comp = findComponentDeep(dsl.value.components, id)
    if (comp) {
      commitHistoryDebounced()
      comp.props = { ...comp.props, ...props }
      recomputeDirty()
    }
  }

  /** 更新组件样式（连续输入合并为一条历史） */
  function updateComponentStyle(id: string, style: Record<string, any>) {
    const comp = findComponentDeep(dsl.value.components, id)
    if (comp) {
      commitHistoryDebounced()
      const next = { ...comp.style, ...style }
      Object.keys(style).forEach((key) => {
        if (style[key] === undefined) delete next[key]
      })
      comp.style = next
      recomputeDirty()
    }
  }

  /** 向容器/通栏添加子组件 */
  function addChildComponent(parentId: string, type: ComponentType) {
    const parent = findComponentDeep(dsl.value.components, parentId)
    if (!parent) return null
    if (parent.type !== CT.Container && parent.type !== CT.SectionBg) return null
    commitHistory()
    const child: ComponentInstance = {
      id: generateId(),
      type,
      props: getDefaultProps(type),
      style: getDefaultStyle(type),
    }
    if (!parent.children) parent.children = []
    parent.children.push(child)
    recomputeDirty()
    return child
  }

  /** 删除容器内子组件 */
  function removeChildComponent(parentId: string, childIndex: number) {
    const parent = findComponentDeep(dsl.value.components, parentId)
    if (!parent?.children) return
    commitHistory()
    parent.children.splice(childIndex, 1)
    recomputeDirty()
  }

  /** 结构树拖拽排序后整表替换顺序 */
  function setComponentsOrder(ordered: ComponentInstance[]) {
    if (!ordered.length && !dsl.value.components.length) return
    commitHistory()
    dsl.value.components = ordered
    recomputeDirty()
  }

  /** 移动组件 */
  function moveComponent(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return
    commitHistory()
    const list = dsl.value.components
    const [item] = list.splice(fromIndex, 1)
    list.splice(toIndex, 0, item)
    recomputeDirty()
  }

  /** 复制组件 */
  function duplicateComponent(id: string) {
    const comp = dsl.value.components.find((c) => c.id === id)
    if (!comp) return
    commitHistory()
    const idx = dsl.value.components.indexOf(comp)
    const newComp: ComponentInstance = {
      ...JSON.parse(JSON.stringify(comp)),
      id: generateId(),
    }
    dsl.value.components.splice(idx + 1, 0, newComp)
    selectedComponentId.value = newComp.id
    recomputeDirty()
  }

  /** 更新页面配置 */
  function updatePageConfig(config: Partial<PageConfig>) {
    commitHistoryDebounced()
    dsl.value.page = { ...dsl.value.page, ...config }
    recomputeDirty()
  }

  /** 同步元数据到 DSL，不打历史、不单独标脏（随整体 DSL 保存） */
  function updatePageConfigSilent(config: Partial<PageConfig>) {
    dsl.value.page = { ...dsl.value.page, ...config }
    recomputeDirty()
  }

  /** 更新全局配置 */
  function updateGlobalConfig(config: Partial<GlobalConfig>) {
    commitHistory()
    dsl.value.global_config = { ...dsl.value.global_config, ...config }
    recomputeDirty()
  }

  /** 应用模板 DSL */
  function applyTemplate(templateDsl: PageDSL) {
    commitHistory()
    dsl.value = JSON.parse(JSON.stringify(templateDsl))
    // 重新生成组件 ID 避免冲突
    dsl.value.components.forEach((comp) => {
      comp.id = generateId()
    })
    selectedComponentId.value = null
    recomputeDirty()
  }

  /** 序列化 DSL 为 JSON */
  function serializeDSL(): string {
    return JSON.stringify(dsl.value, null, 2)
  }

  return {
    currentPage,
    dsl,
    selectedComponentId,
    selectedComponent,
    components,
    pageConfig,
    globalConfig,
    isDirty,
    hasUnpersistedChanges,
    saving,
    canUndo,
    canRedo,
    undo,
    redo,
    markSavedToServer,
    setCurrentPage,
    resetEditor,
    addComponent,
    insertComponentAt,
    resolveInsertIndex,
    addComponentWithProps,
    addChildComponent,
    removeChildComponent,
    removeComponent,
    selectComponent,
    updateComponentProps,
    updateComponentStyle,
    moveComponent,
    setComponentsOrder,
    duplicateComponent,
    updatePageConfig,
    updatePageConfigSilent,
    updateGlobalConfig,
    applyTemplate,
    serializeDSL,
    expandWarmHomeFromShell,
    isWarmHomeShellOnly: () => isWarmHomeShellOnly(dsl.value.components),
  }
})
