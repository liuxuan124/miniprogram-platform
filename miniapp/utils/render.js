// utils/render.js — DSL 渲染引擎
// 将 JSON 格式的页面 DSL 解析为小程序可渲染的数据结构
// 支持数据源绑定、事件处理、样式解析

const { DatasourceService } = require('../services/datasource')

// ========== 工具函数 ==========

/**
 * 判断字符串是否为图片 URL（必须有图片扩展名）
 * 避免将页面路径（如 /pages/xxx）误当成图片
 */
function isImageUrl(str) {
  if (!str || typeof str !== 'string') return false
  return str.indexOf('http') === 0 || str.indexOf('//') === 0 ||
    (str.indexOf('/') === 0 && (str.indexOf('.jpg') > -1 || str.indexOf('.png') > -1 || str.indexOf('.jpeg') > -1 || str.indexOf('.gif') > -1 || str.indexOf('.webp') > -1 || str.indexOf('.svg') > -1 || str.indexOf('.bmp') > -1))
}

// ========== 支持的 25 种组件类型 ==========
const COMPONENT_TYPES = {
  SEARCH: 'search',
  NOTICE_BAR: 'notice_bar',
  CATEGORY_NAV: 'category_nav',
  BANNER: 'banner',
  NAV: 'nav',
  PRODUCT_LIST: 'product_list',
  FLASH_SALE: 'flash_sale',
  ARTICLE_LIST: 'article_list',
  ACTIVITY_ENTRY: 'activity_entry',
  ACTIVITY_LIST: 'activity_list',
  APPOINTMENT_SERVICE: 'appointment_service',
  MEMBER_CARD: 'member_card',
  COUPON: 'coupon',
  AI_ENTRY: 'ai_entry',
  VIDEO: 'video',
  BRAND_INTRO: 'brand_intro',
  IMAGE_TEXT: 'image_text',
  CONTACT_INFO: 'contact_info',
  CERTIFICATE: 'certificate',
  COUNTDOWN: 'countdown',
  FLOAT_BUTTON: 'float_button',
  RICH_TEXT: 'rich_text',
  SECTION_TITLE: 'section_title',
  DIVIDER: 'divider',
  SPACER: 'spacer',
}

// 需要数据源的组件类型
const DATASOURCE_COMPONENTS = [
  COMPONENT_TYPES.NOTICE_BAR,
  COMPONENT_TYPES.CATEGORY_NAV,
  COMPONENT_TYPES.PRODUCT_LIST,
  COMPONENT_TYPES.ARTICLE_LIST,
  COMPONENT_TYPES.ACTIVITY_ENTRY,
  COMPONENT_TYPES.ACTIVITY_LIST,
  COMPONENT_TYPES.APPOINTMENT_SERVICE,
  COMPONENT_TYPES.COUPON,
]

/**
 * 验证 DSL 结构合法性
 * @param {Object} dsl 页面 DSL 对象
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateDSL(dsl) {
  const errors = []

  if (!dsl || typeof dsl !== 'object') {
    errors.push('DSL 必须是非空对象')
    return { valid: false, errors }
  }

  if (!dsl.components || !Array.isArray(dsl.components)) {
    errors.push('DSL 必须包含 components 数组')
  } else {
    dsl.components.forEach((comp, index) => {
      if (!comp.type) {
        errors.push(`components[${index}] 缺少 type`)
      }
      if (!comp.id) {
        errors.push(`components[${index}] 缺少 id`)
      }
      // 校验组件类型
      const validTypes = Object.values(COMPONENT_TYPES)
      if (comp.type && !validTypes.includes(comp.type)) {
        errors.push(`components[${index}] 未知组件类型: ${comp.type}`)
      }
    })
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * 解析样式对象为小程序内联样式字符串
 * @param {Object} style 样式对象
 * @returns {string} 内联样式字符串
 */
function parseStyle(style) {
  if (!style || typeof style !== 'object') return ''

  return Object.entries(style)
    .map(([key, value]) => {
      const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase()
      // 后台预览使用 375px 设计稿，小程序使用 750rpx；数值样式按 1px = 2rpx 对齐。
      const cssValue = typeof value === 'number'
        ? (value === 0 ? '0' : (value * 2) + 'rpx')
        : value
      return `${cssKey}: ${cssValue}`
    })
    .join('; ')
}

/**
 * 解析组件的 actions 配置
 * @param {Array} actions 动作列表
 * @returns {Array} 标准化后的动作列表
 */
function parseActions(actions) {
  if (!actions || !Array.isArray(actions)) return []

  return actions.map((action) => ({
    type: action.type || 'none',
    ...action,
  }))
}

/**
 * 处理单个组件节点
 * @param {Object} component 原始 DSL 组件
 * @returns {Object} 处理后的渲染数据
 */
function processComponent(component) {
  const styleString = parseStyle(component.style || {})
  const props = component.props || {}
  const resolvedDataSource = component.data_source || props.data_source || null
  const dataSourceTypeByComponent = {
    product_list: 'product',
    article_list: 'content',
    activity_list: 'activity',
    activity_entry: 'activity',
    appointment_service: 'appointment_service',
    coupon: 'coupon',
  }
  const normalizedDataSource = resolvedDataSource && resolvedDataSource.type === 'api' && !resolvedDataSource.api && !(resolvedDataSource.config && resolvedDataSource.config.api)
    ? {
        ...resolvedDataSource,
        type: dataSourceTypeByComponent[component.type] || resolvedDataSource.type,
      }
    : resolvedDataSource

  const processed = {
    id: component.id || `comp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: component.type,
    props,
    dataSource: normalizedDataSource,
    actions: parseActions(component.actions),
    style: component.style || {},
    styleString,
    visible: component.visible !== false,
    // 运行时数据（由数据源填充）
    runtimeData: [],
    runtimeDataLoaded: false,
  }

  return processed
}

/**
 * 解析完整页面 DSL
 * @param {Object} dsl 页面 DSL 对象
 * @returns {Object} 解析后的页面渲染数据
 */
function parseDSL(dsl) {
  const validation = validateDSL(dsl)
  if (!validation.valid) {
    console.warn('[RenderEngine] DSL 验证警告（不影响渲染）:', validation.errors)
  }

  // 解析页面级配置
  const page = {
    id: (dsl.page && dsl.page.id) || '',
    name: (dsl.page && dsl.page.name) || '',
    type: (dsl.page && dsl.page.type) || '',
    path: (dsl.page && dsl.page.path) || '',
    share_title: (dsl.page && dsl.page.share_title) || '',
    share_image: (dsl.page && dsl.page.share_image) || '',
    background_color: (dsl.page && dsl.page.background_color) || '#f5f5f5',
  }

  // 解析全局配置
  const globalConfig = {
    pull_refresh: dsl.global_config ? dsl.global_config.pull_refresh !== false : true,
    reach_bottom_load: dsl.global_config ? dsl.global_config.reach_bottom_load === true : false,
  }

  // 解析组件列表
  const components = (dsl.components || []).map((comp) => processComponent(comp))

  return {
    page,
    components,
    globalConfig,
    errors: [],
  }
}

/**
 * 为组件加载数据源数据
 * @param {Object} component 处理后的组件数据
 * @param {boolean} [forceRefresh] 是否强制刷新
 * @returns {Promise<Object>} 更新后的组件数据
 */
async function loadComponentData(component, forceRefresh = false) {
  if (!component.dataSource || !component.dataSource.type) {
    return { ...component, runtimeDataLoaded: true }
  }

  // 仅特定组件类型需要数据源
  if (!DATASOURCE_COMPONENTS.includes(component.type)) {
    return { ...component, runtimeDataLoaded: true }
  }

  try {
    const data = await DatasourceService.fetchData(component.dataSource, forceRefresh)
    // 限制数据量，避免 setData 过大
    const MAX_ITEMS = 10
    const trimmed = Array.isArray(data) ? data.slice(0, MAX_ITEMS) : data
    return {
      ...component,
      runtimeData: trimmed,
      runtimeDataLoaded: true,
    }
  } catch (err) {
    console.error('[RenderEngine] 组件数据源加载失败:', component.id, err)
    return {
      ...component,
      runtimeData: [],
      runtimeDataLoaded: true,
    }
  }
}

/**
 * 批量加载所有组件的数据源
 * @param {Array} components 组件列表
 * @param {boolean} [forceRefresh] 是否强制刷新
 * @returns {Promise<Array>} 更新后的组件列表
 */
async function loadAllComponentData(components, forceRefresh = false) {
  const tasks = components.map((comp) => loadComponentData(comp, forceRefresh))
  return Promise.all(tasks)
}

// ========== 事件处理 ==========

const TAB_PAGE_PATHS = [
  '/pages/index/index',
  '/pages/mine/mine',
]

function normalizeRoutePath(path) {
  if (!path || typeof path !== 'string') return ''
  const trimmed = path.trim()
  if (!trimmed) return ''
  return trimmed.startsWith('/') ? trimmed : '/' + trimmed
}

function stripQuery(path) {
  return normalizeRoutePath(path).split('?')[0]
}

function isTabPage(path) {
  return TAB_PAGE_PATHS.includes(stripQuery(path))
}

function navigatePage(path) {
  const url = normalizeRoutePath(path)
  if (!url) return

  if (isTabPage(url)) {
    wx.switchTab({
      url: stripQuery(url),
      fail: () => {
        console.warn('[RenderEngine] Tab 页面跳转失败:', url)
      },
    })
    return
  }

  wx.navigateTo({
    url,
    fail: () => {
      console.warn('[RenderEngine] 页面跳转失败:', url)
    },
  })
}

/**
 * 执行动作
 * @param {Object} action 动作配置 { type, ... }
 */
function executeAction(action) {
  if (!action || !action.type) return

  switch (action.type) {
    case 'page':
      // 页面跳转
      if (action.path) {
        navigatePage(action.path)
      }
      break

    case 'webview':
      // WebView 跳转
      if (action.url) {
        wx.navigateTo({
          url: '/pages/webview/webview?url=' + encodeURIComponent(action.url),
        })
      }
      break

    case 'miniapp':
      // 跳转其他小程序
      if (action.appid) {
        wx.navigateToMiniProgram({
          appId: action.appid,
          path: action.path || '',
          fail: (err) => {
            console.warn('[RenderEngine] 跳转小程序失败:', err)
          },
        })
      }
      break

    case 'phone':
      // 拨打电话
      if (action.number) {
        wx.makePhoneCall({
          phoneNumber: action.number,
          fail: (err) => {
            console.warn('[RenderEngine] 拨打电话失败:', err)
          },
        })
      }
      break

    case 'copy':
      // 复制文本
      if (action.text) {
        wx.setClipboardData({
          data: action.text,
          success() {
            wx.showToast({ title: '已复制', icon: 'success' })
          },
        })
      }
      break

    case 'share':
      // 触发分享（需要页面配合 onShareAppMessage）
      // 通过 triggerEvent 通知页面
      break

    default:
      console.warn('[RenderEngine] 未知动作类型:', action.type)
  }
}

/**
 * 执行组件的第一个动作
 * @param {Array} actions 动作列表
 */
function executeFirstAction(actions) {
  if (!actions || !actions.length) return
  executeAction(actions[0])
}

/**
 * 根据动作类型和参数执行
 * @param {string} type 动作类型
 * @param {Object} params 动作参数
 */
function executeActionByType(type, params) {
  executeAction({ type, ...params })
}

/**
 * 兼容旧版 executeEvent
 * @param {Object} eventConfig 事件配置 { action, params }
 * @param {Object} context 页面上下文
 */
function executeEvent(eventConfig, context) {
  if (!eventConfig) return

  // 新格式：{ action, params } 映射到 executeAction
  if (eventConfig.action) {
    const action = {
      type: eventConfig.action,
      ...eventConfig.params,
    }
    // 兼容旧版 action 名称映射
    const actionMap = {
      navigate: 'page',
      redirect: 'page',
      call: 'phone',
    }
    if (actionMap[action.type]) {
      if (action.type === 'navigate' || action.type === 'redirect') {
        action.path = action.path || action.url
      }
      action.type = actionMap[action.type]
    }
    executeAction(action)
    return
  }

  // 旧格式兼容
  if (eventConfig.type) {
    executeAction(eventConfig)
  }
}

/**
 * 根据组件 ID 查找组件
 * @param {Array} components 组件列表
 * @param {string} id 组件 ID
 * @returns {Object|null}
 */
function findComponentById(components, id) {
  for (const comp of components) {
    if (comp.id === id) return comp
  }
  return null
}

/**
 * 更新组件属性
 * @param {Array}  components 组件列表
 * @param {string} id         组件 ID
 * @param {Object} newProps   新属性
 * @returns {Array} 更新后的组件列表
 */
function updateComponent(components, id, newProps) {
  return components.map((comp) => {
    if (comp.id === id) {
      const updatedStyle = { ...comp.style, ...(newProps.style || {}) }
      return {
        ...comp,
        props: { ...comp.props, ...newProps },
        style: updatedStyle,
        styleString: parseStyle(updatedStyle),
      }
    }
    return comp
  })
}

module.exports = {
  COMPONENT_TYPES,
  DATASOURCE_COMPONENTS,
  isImageUrl,
  validateDSL,
  parseStyle,
  parseActions,
  processComponent,
  parseDSL,
  loadComponentData,
  loadAllComponentData,
  executeAction,
  navigatePage,
  executeFirstAction,
  executeActionByType,
  executeEvent,
  findComponentById,
  updateComponent,
}
