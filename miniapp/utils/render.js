// utils/render.js — DSL 渲染引擎
// 将 JSON 格式的页面 DSL 解析为小程序可渲染的数据结构
// 支持数据源绑定、事件处理、样式解析

const { DatasourceService } = require('../services/datasource')
const { filterProductsByPrice, resolvePriceFilterConfig } = require('./product-price-filter')

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

// ========== 支持的 27 种组件类型 ==========
// C1/C2 修复：此前 IMAGE、FORM_ENTRY 未登记在此白名单，
// 其中 image 已有渲染分支但会被 validateDSL 误判为"未知组件类型"，
// form_entry 此前连渲染分支都没有（发布后小程序端白屏）。
// 此列表须与 admin/src/types/page.ts 的 ComponentType 枚举保持同步，
// 它同时也是 C2 后台发布前"渲染端能力校验"的比对基准。
const COMPONENT_TYPES = {
  SEARCH: 'search',
  NOTICE_BAR: 'notice_bar',
  CATEGORY_NAV: 'category_nav',
  BANNER: 'banner',
  IMAGE: 'image',
  NAV: 'nav',
  PRODUCT_LIST: 'product_list',
  FLASH_SALE: 'flash_sale',
  ARTICLE_LIST: 'article_list',
  ARTICLE_FEED: 'article_feed',
  HOT_NEWS: 'hot_news',
  JOIN_GROUP: 'join_group',
  BRAND_HEADER: 'brand_header',
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
  FORM_ENTRY: 'form_entry',
}

// 需要数据源的组件类型
const DATASOURCE_COMPONENTS = [
  COMPONENT_TYPES.NOTICE_BAR,
  COMPONENT_TYPES.CATEGORY_NAV,
  COMPONENT_TYPES.PRODUCT_LIST,
  COMPONENT_TYPES.ARTICLE_LIST,
  COMPONENT_TYPES.ARTICLE_FEED,
  COMPONENT_TYPES.HOT_NEWS,
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
        console.warn(`[RenderEngine] 跳过未知组件类型: ${comp.type}`)
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

  const parts = []
  // 外壳不再吃白底/内边距/圆角，避免「整块外框」；外边距与文字色仍生效
  const SKIP_SHELL_KEYS = new Set([
    'background_color',
    'backgroundColor',
    'padding_top',
    'padding_bottom',
    'padding_left',
    'padding_right',
    'paddingTop',
    'paddingBottom',
    'paddingLeft',
    'paddingRight',
    'border_radius',
    'borderRadius',
  ])

  if (style.text_color) {
    parts.push(`color: ${style.text_color}`)
  }
  if (style.font_size !== undefined && style.font_size !== null && Number(style.font_size) > 0) {
    parts.push(`font-size: ${Number(style.font_size) * 2}rpx`)
  }

  let hasHorizontalMargin = false
  Object.entries(style).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    if (key === 'text_color' || key === 'font_size' || key === 'visible') return
    if (SKIP_SHELL_KEYS.has(key)) return
    if (typeof value === 'boolean') return

    // snake_case / camelCase → kebab-case（border_radius → border-radius）
    const cssKey = key
      .replace(/_/g, '-')
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
    if (cssKey === 'margin-left' || cssKey === 'margin-right') {
      const n = typeof value === 'number' ? value : Number(value)
      if (Number.isFinite(n) ? n !== 0 : String(value).trim() !== '0') {
        hasHorizontalMargin = true
      }
    }
    const cssValue = typeof value === 'number'
      ? (value === 0 ? '0' : (value * 2) + 'rpx')
      : value
    parts.push(`${cssKey}: ${cssValue}`)
  })

  // width:100% + 左右 margin 会撑出视口，导致整页可左右拖歪、右边贴边
  if (hasHorizontalMargin) {
    parts.push('width: auto')
    parts.push('max-width: 100%')
    parts.push('box-sizing: border-box')
  }

  return parts.join('; ')
}

/** 导航栏负边距重叠时保持在最上层（z-index 勿放入 parseStyle，会被当成 rpx） */
function appendNavStackStyle(styleString) {
  const stack = 'position: relative; z-index: 20'
  return styleString ? `${styleString}; ${stack}` : stack
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
  const validTypes = Object.values(COMPONENT_TYPES)
  if (component.type && !validTypes.includes(component.type)) {
    console.warn('[RenderEngine] 跳过未知组件类型:', component.type)
    return {
      id: component.id,
      type: component.type,
      skipped: true,
      visible: false,
      props: component.props || {},
    }
  }
  let styleString = parseStyle(component.style || {})
  const rawStyle = component.style || {}
  const stackTypes = ['nav', 'product_list', 'hot_news', 'brand_header']
  const belowTypes = ['image', 'banner']
  const isStack = stackTypes.includes(component.type)
  const isBelow = belowTypes.includes(component.type)

  // 负边距 + z-index 打在页面原生外层，避免自定义组件叠层失效
  const hostParts = ['position:relative']
  if (isStack) hostParts.push('z-index:20')
  else if (isBelow) hostParts.push('z-index:1')
  ;['margin_top', 'margin_bottom', 'margin_left', 'margin_right'].forEach((key) => {
    const val = rawStyle[key]
    if (val === undefined || val === null || val === '') return
    const n = Number(val)
    if (!Number.isFinite(n)) return
    hostParts.push(`${key.replace(/_/g, '-')}:${n * 2}rpx`)
  })
  const hostStyle = hostParts.join(';')

  // 内层不再重复外边距，避免双倍间距
  if (isStack || isBelow || rawStyle.margin_top || rawStyle.margin_bottom || rawStyle.margin_left || rawStyle.margin_right) {
    const innerStyle = { ...rawStyle }
    delete innerStyle.margin_top
    delete innerStyle.margin_bottom
    delete innerStyle.margin_left
    delete innerStyle.margin_right
    styleString = parseStyle(innerStyle)
  }
  if (isStack && component.type !== 'brand_header') {
    // brand_header 自带 fixed 顶栏，不能注入 position:relative，否则会顶掉 fixed 并叠出空白
    styleString = appendNavStackStyle(styleString)
  }
  // image：圆角跟样式面板，显式 0 生效；未设置默认 0（勿写死 CSS 圆角）
  if (component.type === 'image') {
    const raw = component.style || {}
    const radius = raw.border_radius
    const r = radius === undefined || radius === null || radius === ''
      ? 0
      : Number(radius)
    const radiusCss = `border-radius:${(Number.isFinite(r) ? r : 0) * 2}rpx;overflow:hidden`
    styleString = styleString ? `${styleString};${radiusCss}` : radiusCss
  }
  const props = component.props || {}
  const resolvedDataSource = component.data_source || props.data_source || null
  const dataSourceTypeByComponent = {
    product_list: 'product',
    article_list: 'content',
    article_feed: 'content',
    hot_news: 'content',
    activity_list: 'activity',
    activity_entry: 'activity',
    appointment_service: 'appointment_service',
    coupon: 'coupon',
  }
  let normalizedDataSource = resolvedDataSource && resolvedDataSource.type === 'api' && !resolvedDataSource.api && !(resolvedDataSource.config && resolvedDataSource.config.api)
    ? {
        ...resolvedDataSource,
        type: dataSourceTypeByComponent[component.type] || resolvedDataSource.type,
      }
    : resolvedDataSource

  // 历史页面可能未配置 data_source：按组件类型自动挂默认数据源
  if (!normalizedDataSource && dataSourceTypeByComponent[component.type]) {
    normalizedDataSource = {
      type: dataSourceTypeByComponent[component.type],
      params: {},
    }
  }

  const processed = {
    id: component.id || `comp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: component.type,
    props,
    dataSource: normalizedDataSource,
    actions: parseActions(component.actions),
    style: component.style || {},
    styleString,
    hostStyle,
    _stackClass: isStack ? 'dsl-flow--stack' : (isBelow ? 'dsl-flow--below' : ''),
    visible: component.visible !== false && (component.style || {}).visible !== false,
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
  const components = (dsl.components || [])
    .map((comp) => processComponent(comp))
    .filter((comp) => !comp.skipped)

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
    // 商品列表手动选品：把 props.product_ids 写入 dataSource，便于接口侧/客户端过滤
    let dataSource = component.dataSource
    const props = component.props || {}
    const isProductStream = component.type === 'product_list' && props.display_mode === 'stream'
    if (component.type === 'product_list') {
      const ids = Array.isArray(props.product_ids) ? props.product_ids : []
      const extraParams = isProductStream ? { display_mode: 'stream' } : {}
      if (ids.length) {
        const idStr = ids.map((id) => String(id)).join(',')
        dataSource = {
          ...dataSource,
          params: { ...(dataSource.params || {}), status: 'on_sale', ids: idStr, ...extraParams },
          query: { ...(dataSource.query || {}), status: 'on_sale', ids: idStr, ...extraParams },
        }
      } else if (isProductStream) {
        dataSource = {
          ...dataSource,
          params: { ...(dataSource.params || {}), ...extraParams },
          query: { ...(dataSource.query || {}), ...extraParams },
        }
      }
    }

    const data = await DatasourceService.fetchData(dataSource, forceRefresh)
    // 限制数据量，避免 setData 过大；热门资讯需多取一点做前端排序/日期筛选
    const limit = Math.max(Number(props.limit || 10), 1)
    const feedPageSize = Math.max(Number(props.page_size || 10), 5)
    const priceFilter = component.type === 'product_list'
      ? resolvePriceFilterConfig(props)
      : { mode: 'all' }
    const MAX_ITEMS = component.type === 'hot_news'
      ? Math.max(limit, 50)
      : (component.type === 'article_feed'
        ? feedPageSize
        : (component.type === 'product_list' && isProductStream
          ? feedPageSize
          : (component.type === 'product_list' && priceFilter.mode !== 'all'
            ? Math.min(Math.max(limit * 5, 50), 100)
            : 10)))
    let trimmed = Array.isArray(data) ? data.slice(0, MAX_ITEMS) : data

    if (component.type === 'hot_news' && Array.isArray(trimmed)) {
      const ds = dataSource || {}
      const q = { ...(ds.query || {}), ...(ds.params || {}) }
      const publishDate = String(q.publish_date || '').trim()
      if (publishDate) {
        trimmed = trimmed.filter((item) => {
          const raw = String(item.publishedAt || item.publishTime || item.publish_time || item.createTime || item.createdAt || '')
          return raw.indexOf(publishDate) === 0
        })
      }
      const sortBy = String(q.sort_by || 'popular')
      if (sortBy === 'popular') {
        trimmed = trimmed.slice().sort((a, b) => (Number(b.viewCount || b.view_count || 0) || 0) - (Number(a.viewCount || a.view_count || 0) || 0))
      } else if (sortBy === 'newest') {
        trimmed = trimmed.slice().sort((a, b) => {
          const ta = new Date(String(a.publishedAt || a.publishTime || a.createTime || 0).replace(/-/g, '/')).getTime() || 0
          const tb = new Date(String(b.publishedAt || b.publishTime || b.createTime || 0).replace(/-/g, '/')).getTime() || 0
          return tb - ta
        })
      }
      trimmed = trimmed.slice(0, limit)
    }

    // 商品列表：按售价筛选后再截断
    if (component.type === 'product_list' && Array.isArray(trimmed)) {
      if (priceFilter.mode !== 'all') {
        trimmed = filterProductsByPrice(trimmed, priceFilter)
      }
      if (!isProductStream) {
        trimmed = trimmed.slice(0, limit)
      } else {
        trimmed = trimmed.slice(0, feedPageSize)
      }
    }

    // 接口失败/空列表时，手动选品回退到 DSL 内保存的 items
    if (component.type === 'product_list') {
      const ids = Array.isArray(props.product_ids) ? props.product_ids.map((id) => String(id)) : []
      const sliceCap = isProductStream && ids.length
        ? Math.max(ids.length, Array.isArray(props.items) ? props.items.length : 0, feedPageSize)
        : Math.max(Number(props.limit || MAX_ITEMS), 1)
      if ((!trimmed || !trimmed.length) && Array.isArray(props.items) && props.items.length) {
        trimmed = props.items.slice(0, sliceCap)
      } else if (ids.length && Array.isArray(trimmed) && trimmed.length) {
        const map = {}
        trimmed.forEach((item) => {
          if (item && item.id != null) map[String(item.id)] = item
        })
        const ordered = ids.map((id) => map[String(id)]).filter(Boolean)
        if (ordered.length) trimmed = ordered.slice(0, sliceCap)
      }
    }

    return {
      ...component,
      runtimeData: trimmed,
      runtimeDataLoaded: true,
    }
  } catch (err) {
    console.error('[RenderEngine] 组件数据源加载失败:', component.id, err)
    const props = (component && component.props) || {}
    const fallback = (component.type === 'product_list' && Array.isArray(props.items))
      ? props.items.slice(0, Math.max(Number(props.limit || 10), 1))
      : []
    return {
      ...component,
      runtimeData: fallback,
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
  '/pages/content-list/content-list',
  '/pages/knowledge-mall/knowledge-mall',
  '/pages/product-list/product-list',
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

function parseQuery(path) {
  const raw = normalizeRoutePath(path)
  const idx = raw.indexOf('?')
  if (idx < 0) return {}
  const query = {}
  raw.slice(idx + 1).split('&').forEach((pair) => {
    if (!pair) return
    const [k, v = ''] = pair.split('=')
    if (k) query[decodeURIComponent(k)] = decodeURIComponent(v)
  })
  return query
}

function isTabPage(path) {
  return TAB_PAGE_PATHS.includes(stripQuery(path))
}

function rewriteUnregisteredPage(path) {
  const url = normalizeRoutePath(path)
  const base = stripQuery(url)
  if (!base || base === '/pages/custom/custom') return url
  if (base.startsWith('/pages/custom/') || base.startsWith('/pages/activity/')) {
    const logical = base.replace(/^\//, '')
    return '/pages/custom/custom?path=' + encodeURIComponent(logical)
  }
  return url
}

function navigatePage(path) {
  let url = rewriteUnregisteredPage(path)
  if (!url) return

  // 旧商城页统一切到知识商城 Tab
  if (stripQuery(url) === '/pages/product-list/product-list') {
    const q = parseQuery(url)
    const qs = Object.keys(q).map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(q[k])}`).join('&')
    url = '/pages/knowledge-mall/knowledge-mall' + (qs ? '?' + qs : '')
  }

  if (isTabPage(url)) {
    const query = parseQuery(url)
    const base = stripQuery(url)
    // switchTab 不支持 query，暂存给目标 Tab 页 onShow 读取
    if (Object.keys(query).length) {
      try {
        wx.setStorageSync('__tab_query__' + base, query)
      } catch (e) { /* ignore */ }
    }
    wx.switchTab({
      url: base,
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
          url: '/pkg-user/webview/webview?url=' + encodeURIComponent(action.url),
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
        styleString: comp.type === 'nav' || comp.type === 'product_list'
          ? appendNavStackStyle(parseStyle(updatedStyle))
          : parseStyle(updatedStyle),
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
  appendNavStackStyle,
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
