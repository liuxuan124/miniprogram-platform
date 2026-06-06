// pages/index/index.js — 首页（动态渲染引擎）
// 从后端获取页面 DSL，解析后动态渲染组件
// 支持下拉刷新、触底加载、页面缓存

const { PageService } = require('../../services/page')
const { AuthService } = require('../../services/auth')
const { parseDSL, loadAllComponentData, executeAction } = require('../../utils/render')
const { DatasourceService } = require('../../services/datasource')

// 精简组件数据，减少 setData 体积
function trimComponentsForSetData(components) {
  if (!Array.isArray(components)) return []
  // 每种组件只保留渲染必需的字段
  const KEEP_FIELDS = {
    product_list: ['id', '_key', 'name', 'title', 'price', 'originalPrice', 'image', 'coverUrl', 'cover_url', 'mainImage', 'main_image', 'sales'],
    article_list: ['id', 'title', 'name', 'coverUrl', 'cover_url', 'image', 'summary', 'createdAt'],
    activity_list: ['id', 'name', 'title', 'date', 'location', 'link_url'],
    activity_entry: ['id', 'name', 'title', 'image', 'cover_url'],
    member_card: [],
    coupon: ['id', 'name', 'title', 'type', 'value'],
  }
  const MAX_ITEMS = 6
  return components.map((comp) => {
    const trimmed = { ...comp }
    if (Array.isArray(trimmed.runtimeData) && trimmed.runtimeData.length > MAX_ITEMS) {
      trimmed.runtimeData = trimmed.runtimeData.slice(0, MAX_ITEMS)
    }
    if (Array.isArray(trimmed.runtimeData) && KEEP_FIELDS[trimmed.type]) {
      const fields = KEEP_FIELDS[trimmed.type]
      if (fields.length > 0) {
        trimmed.runtimeData = trimmed.runtimeData.map((item, index) => {
          const slim = {}
          fields.forEach((f) => { if (item[f] !== undefined) slim[f] = item[f] })
          slim._key = item._key || `${trimmed.type}_${item.id || index}_${index}`
          return slim
        })
      }
    }
    // 删除不需要传输的大字段
    delete trimmed.rawDsl
    delete trimmed._meta
    return trimmed
  })
}

Page({
  data: {
    pageConfig: {},          // 页面级配置
    components: [],          // 渲染组件列表
    globalConfig: {},        // 全局配置（下拉刷新、触底加载等）
    loading: true,           // 加载状态
    error: null,             // 错误信息
    schemaVersion: '',       // DSL schema 版本号
    backgroundColor: '#f5f5f5', // 页面背景色

    // 触底加载相关
    hasMore: true,           // 是否有更多数据
    loadingMore: false,      // 正在加载更多
    currentPage: 1,          // 当前页码
    pageSize: 10,            // 每页数量
    pagedComponentId: '',    // 需要分页加载的组件 ID
  },

  /** 页面加载 */
  onLoad() {
    this._initPage()
  },

  /** 页面显示 */
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 })
    }
    // 每次回到首页都强制刷新 DSL + 数据源，确保与后台上/下架实时同步
    this._loadPageDSL(true).catch(() => {})
    // 检查登录态，未登录则静默登录
    const app = getApp()
    if (!app.globalData.isLoggedIn) {
      AuthService.silentLogin().catch(() => {
        // 静默登录失败不阻塞页面
      })
    }
  },

  /** 下拉刷新 */
  onPullDownRefresh() {
    this._loadPageDSL(true).finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  /** 触底加载 */
  onReachBottom() {
    if (!this.data.globalConfig.reach_bottom_load) return
    if (!this.data.hasMore || this.data.loadingMore) return

    this._loadMoreData()
  },

  /** 分享 */
  onShareAppMessage() {
    const pageConfig = this.data.pageConfig
    return {
      title: pageConfig.share_title || '小程序运营平台',
      path: pageConfig.path || '/pages/index/index',
      imageUrl: pageConfig.share_image || '',
    }
  },

  /** 初始化页面 */
  async _initPage() {
    this.setData({ loading: true, error: null })
    try {
      await this._loadPageDSL()
    } catch (err) {
      console.error('[IndexPage] 初始化失败:', err)
      this.setData({
        error: '页面加载失败，请下拉刷新重试',
        loading: false,
      })
    }
  },

  /** 加载页面 DSL */
  async _loadPageDSL(forceRefresh = false) {
    try {
      const dsl = await PageService.getPageDSL('home', forceRefresh)
      const parsed = parseDSL(dsl)

      // 加载所有组件的数据源数据
      const componentsWithData = await loadAllComponentData(parsed.components, forceRefresh)

      // 查找需要分页加载的组件（通常是 product_list 或 article_list）
      let pagedComponentId = ''
      for (const comp of componentsWithData) {
        if (comp.dataSource && (comp.type === 'product_list' || comp.type === 'article_list')) {
          pagedComponentId = comp.id
          break
        }
      }

      // 设置页面背景色
      const bgColor = parsed.page.background_color || '#f5f5f5'

      // 分步 setData，避免单次传输过大
      this.setData({
        pageConfig: parsed.page,
        globalConfig: parsed.globalConfig,
        schemaVersion: dsl.schema_version || '',
        backgroundColor: bgColor,
        loading: false,
        error: null,
        currentPage: 1,
        hasMore: true,
        pagedComponentId,
      })

      // 组件数据单独设置（精简后）
      const slimComponents = trimComponentsForSetData(componentsWithData)
      this.setData({ components: slimComponents })

      // 动态设置页面标题
      if (parsed.page.name) {
        wx.setNavigationBarTitle({ title: parsed.page.name })
      }
    } catch (err) {
      console.error('[IndexPage] 加载 DSL 失败:', err)
      // 如果有缓存数据则使用缓存
      if (this.data.components.length > 0) {
        this.setData({ loading: false })
        wx.showToast({ title: '刷新失败', icon: 'none' })
      } else {
        this.setData({
          loading: false,
          error: '页面加载失败',
        })
      }
    }
  },

  /** 触底加载更多数据 */
  async _loadMoreData() {
    const { pagedComponentId, currentPage, pageSize, components } = this.data
    if (!pagedComponentId) return

    const targetComp = components.find((c) => c.id === pagedComponentId)
    if (!targetComp || !targetComp.dataSource) return

    this.setData({ loadingMore: true })

    try {
      const nextPage = currentPage + 1
      const result = await DatasourceService.fetchPagedData(
        targetComp.dataSource,
        nextPage,
        pageSize
      )

      if (result.list.length > 0) {
        // 追加数据到对应组件
        const updatedComponents = components.map((comp) => {
          if (comp.id === pagedComponentId) {
            return {
              ...comp,
              runtimeData: [...comp.runtimeData, ...result.list],
            }
          }
          return comp
        })

        this.setData({
          components: updatedComponents,
          currentPage: nextPage,
          hasMore: result.hasMore,
        })
      } else {
        this.setData({ hasMore: false })
      }
    } catch (err) {
      console.error('[IndexPage] 加载更多失败:', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      this.setData({ loadingMore: false })
    }
  },

  /** DSL 组件事件处理 */
  handleComponentEvent(e) {
    const detail = e.detail
    if (detail && detail.action) {
      executeAction(detail)
    }
  },

  /** 自定义事件处理（供 DSL 引擎调用） */
  handleCustomEvent(params) {
    console.log('[IndexPage] 自定义事件:', params)
  },

  /** 重试加载 */
  onRetry() {
    this._initPage()
  },

  /** 跳转 AI 对话页 */
  onGoAiChat() {
    wx.navigateTo({
      url: '/pages/ai-chat/ai-chat',
    })
  },
})
