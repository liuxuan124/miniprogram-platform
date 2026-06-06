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

export const usePageStore = defineStore('page', () => {
  /** 当前编辑的页面记录 */
  const currentPage = ref<PageRecord | null>(null)
  /** 当前页面 DSL */
  const dsl = ref<PageDSL>(createDefaultDSL())
  /** 当前选中的组件 ID */
  const selectedComponentId = ref<string | null>(null)
  /** 是否有未保存的修改 */
  const isDirty = ref(false)
  /** 保存中 */
  const saving = ref(false)

  /** 当前选中的组件实例 */
  const selectedComponent = computed<ComponentInstance | null>(() => {
    if (!selectedComponentId.value) return null
    return dsl.value.components.find((c) => c.id === selectedComponentId.value) ?? null
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
    if (page.dsl) {
      dsl.value = JSON.parse(JSON.stringify(page.dsl))
    } else if (page.draftDslContent) {
      try {
        dsl.value = JSON.parse(page.draftDslContent)
      } catch {
        dsl.value = createEmptyDSL(page)
      }
    } else {
      dsl.value = createEmptyDSL(page)
    }
    selectedComponentId.value = null
    isDirty.value = false
  }

  /** 重置编辑器 */
  function resetEditor() {
    currentPage.value = null
    dsl.value = createEmptyDSL()
    selectedComponentId.value = null
    isDirty.value = false
  }

  /** 添加组件 */
  function addComponent(type: ComponentType, index?: number) {
    const comp: ComponentInstance = {
      id: generateId(),
      type,
      props: getDefaultProps(type),
      style: getDefaultStyle(type),
    }
    if (index !== undefined && index >= 0) {
      dsl.value.components.splice(index, 0, comp)
    } else {
      dsl.value.components.push(comp)
    }
    selectedComponentId.value = comp.id
    isDirty.value = true
    return comp
  }

  /** 从模板添加组件（带预设 props） */
  function addComponentWithProps(type: ComponentType, props: Record<string, any>, index?: number) {
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
    isDirty.value = true
    return comp
  }

  /** 删除组件 */
  function removeComponent(id: string) {
    const idx = dsl.value.components.findIndex((c) => c.id === id)
    if (idx !== -1) {
      dsl.value.components.splice(idx, 1)
      if (selectedComponentId.value === id) {
        selectedComponentId.value = null
      }
      isDirty.value = true
    }
  }

  /** 选中组件 */
  function selectComponent(id: string | null) {
    selectedComponentId.value = id
  }

  /** 更新组件 props */
  function updateComponentProps(id: string, props: Record<string, any>) {
    const comp = dsl.value.components.find((c) => c.id === id)
    if (comp) {
      comp.props = { ...comp.props, ...props }
      isDirty.value = true
    }
  }

  /** 更新组件样式 */
  function updateComponentStyle(id: string, style: Record<string, any>) {
    const comp = dsl.value.components.find((c) => c.id === id)
    if (comp) {
      comp.style = { ...comp.style, ...style }
      isDirty.value = true
    }
  }

  /** 移动组件 */
  function moveComponent(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return
    const list = dsl.value.components
    const [item] = list.splice(fromIndex, 1)
    list.splice(toIndex, 0, item)
    isDirty.value = true
  }

  /** 复制组件 */
  function duplicateComponent(id: string) {
    const comp = dsl.value.components.find((c) => c.id === id)
    if (!comp) return
    const idx = dsl.value.components.indexOf(comp)
    const newComp: ComponentInstance = {
      ...JSON.parse(JSON.stringify(comp)),
      id: generateId(),
    }
    dsl.value.components.splice(idx + 1, 0, newComp)
    selectedComponentId.value = newComp.id
    isDirty.value = true
  }

  /** 更新页面配置 */
  function updatePageConfig(config: Partial<PageConfig>) {
    dsl.value.page = { ...dsl.value.page, ...config }
    isDirty.value = true
  }

  /** 更新全局配置 */
  function updateGlobalConfig(config: Partial<GlobalConfig>) {
    dsl.value.global_config = { ...dsl.value.global_config, ...config }
    isDirty.value = true
  }

  /** 应用模板 DSL */
  function applyTemplate(templateDsl: PageDSL) {
    dsl.value = JSON.parse(JSON.stringify(templateDsl))
    // 重新生成组件 ID 避免冲突
    dsl.value.components.forEach((comp) => {
      comp.id = generateId()
    })
    selectedComponentId.value = null
    isDirty.value = true
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
    saving,
    setCurrentPage,
    resetEditor,
    addComponent,
    addComponentWithProps,
    removeComponent,
    selectComponent,
    updateComponentProps,
    updateComponentStyle,
    moveComponent,
    duplicateComponent,
    updatePageConfig,
    updateGlobalConfig,
    applyTemplate,
    serializeDSL,
  }
})
