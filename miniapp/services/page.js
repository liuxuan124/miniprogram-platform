// services/page.js — 页面数据服务
// 获取页面 DSL、分类数据等
// 契约接口: GET /api/v1/mp/pages/{path}

const { get } = require('../utils/request')
const contentView = require('../utils/content-view')
const { StorageUtil } = require('../utils/storage')

const DSL_CACHE_PREFIX = 'dsl_'
const DSL_CACHE_EXPIRE = 30 * 60 * 1000 // DSL 缓存 30 分钟
/** 同页并发请求去重（App 预热与页面 onLoad 会同时发起） */
const DSL_INFLIGHT = {}

function buildDslCacheKey(pagePath, view, versionTag) {
  const v = view === 'draft' ? 'draft' : 'online'
  return `${DSL_CACHE_PREFIX}${pagePath}_${v}_${versionTag}`
}

/** 预览模式切换时调用，避免 draft/online DSL 混读 */
function clearAllDslStorageCaches() {
  try {
    const info = wx.getStorageInfoSync()
    ;(info.keys || []).forEach((fullKey) => {
      const k = String(fullKey || '')
      if (k.includes('dsl_')) {
        try { wx.removeStorageSync(k) } catch (e) { /* ignore */ }
      }
    })
  } catch (e) { /* ignore */ }
  const app = getApp()
  if (app && app.globalData) {
    app.globalData.pageDSLCache = {}
  }
}

function findStaleDslCache(pagePath, view) {
  const v = view === 'draft' ? 'draft' : 'online'
  const prefix = `${DSL_CACHE_PREFIX}${pagePath}_${v}_`
  try {
    const info = wx.getStorageInfoSync()
    for (const fullKey of info.keys || []) {
      const k = String(fullKey || '').replace(/^mp_/, '')
      if (k.startsWith(prefix)) {
        const hit = StorageUtil.get(k)
        if (hit) return hit
      }
    }
  } catch (e) { /* ignore */ }
  return null
}

/**
 * 页面数据服务
 */
const PageService = {
  /**
   * 获取页面 DSL
   * 优先从缓存读取，缓存不存在则请求后端
   *
   * @param {string} pagePath 页面路径标识，如 'home', 'category'
   * @param {boolean} [forceRefresh] 是否强制刷新
   * @returns {Promise<Object>} 页面 DSL 数据
   */
  getPageDSL(pagePath, forceRefresh = false) {
    // 同一页面在并发场景（App 预热 + 页面 onLoad）只发一次请求，避免首屏重复拉 DSL
    const inflightKey = `${pagePath}__${contentView.contentViewParam()}`
    if (!forceRefresh && DSL_INFLIGHT[inflightKey]) return DSL_INFLIGHT[inflightKey]
    const task = this._fetchPageDSL(pagePath, forceRefresh)
    if (!forceRefresh) {
      DSL_INFLIGHT[inflightKey] = task
      const release = () => {
        if (DSL_INFLIGHT[inflightKey] === task) delete DSL_INFLIGHT[inflightKey]
      }
      task.then(release, release)
    }
    return task
  },

  _fetchPageDSL(pagePath, forceRefresh) {
    const resolvedPath = this.resolvePagePath(pagePath)

    const view = contentView.contentViewParam()
    return get('/api/v1/mp/config/public', { view }, { auth: false, showError: false })
      .then((publicConfig) => {
        const wxVer = (publicConfig && publicConfig.wx_version) || '0'
        const releaseNo = (publicConfig && publicConfig.live_release_no) || '0'
        const versionTag = `${wxVer}_r${releaseNo}`
        const cacheKey = buildDslCacheKey(pagePath, view, versionTag)

        if (!forceRefresh) {
          const cached = StorageUtil.get(cacheKey)
          if (cached) {
            const app = getApp()
            if (app) {
              app.globalData.pageDSLCache[pagePath] = cached
            }
            return cached
          }
        }

        return get('/api/v1/mp/pages', { path: resolvedPath, view }, { auth: false }).then((dsl) => {
          StorageUtil.set(cacheKey, dsl, DSL_CACHE_EXPIRE)
          const app = getApp()
          if (app) {
            app.globalData.pageDSLCache[pagePath] = dsl
          }
          return dsl
        }).catch((err) => {
          const stale = findStaleDslCache(pagePath, view)
          if (stale) {
            console.warn('[PageService] 使用最近一次有效 DSL 缓存:', pagePath, err)
            return stale
          }
          throw err
        })
      })
      .catch((err) => {
        const stale = findStaleDslCache(pagePath, contentView.contentViewParam())
        if (stale) return stale
        throw err
      })
  },

  /**
   * 将小程序内部页面标识映射为后台页面管理中的访问路径
   * @param {string} pagePath 页面标识或页面路径
   * @returns {string}
   */
  resolvePagePath(pagePath) {
    const path = String(pagePath || '').trim()
    const aliasMap = {
      home: 'pages/index/index',
      index: 'pages/index/index',
    }
    if (aliasMap[path]) return aliasMap[path]
    return path.replace(/^\/+/, '')
  },

  /**
   * 获取分类列表
   * @param {Object} [params] 查询参数
   * @returns {Promise<Array>} 分类列表
   */
  getCategoryList(params = {}) {
    return get('/api/v1/mp/categories', params, { auth: false })
  },

  /**
   * 获取用户个人页面数据
   * @returns {Promise<Object>}
   */
  getMinePageData() {
    return get('/api/v1/mp/mine', {}, { auth: true })
  },

  /**
   * 清除页面 DSL 缓存
   * @param {string} [pagePath] 页面路径标识，不传则清除全部
   */
  clearDSLCache(pagePath) {
    if (pagePath) {
      try {
        const info = wx.getStorageInfoSync()
        const needle = `${DSL_CACHE_PREFIX}${pagePath}_`
        ;(info.keys || []).forEach((fullKey) => {
          const k = String(fullKey || '').replace(/^mp_/, '')
          if (k.startsWith(needle)) StorageUtil.remove(k)
        })
      } catch (e) {
        StorageUtil.remove(DSL_CACHE_PREFIX + pagePath)
      }
      const app = getApp()
      if (app && app.globalData) {
        delete app.globalData.pageDSLCache[pagePath]
      }
    } else {
      clearAllDslStorageCaches()
    }
  },
}

module.exports = { PageService, clearAllDslStorageCaches, buildDslCacheKey }
