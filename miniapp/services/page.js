// services/page.js — 页面数据服务
// 获取页面 DSL、分类数据等
// 契约接口: GET /api/v1/mp/pages/{path}

const { get } = require('../utils/request')
const { StorageUtil } = require('../utils/storage')

const DSL_CACHE_PREFIX = 'dsl_'
const DSL_CACHE_EXPIRE = 30 * 60 * 1000 // DSL 缓存 30 分钟

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
    const resolvedPath = this.resolvePagePath(pagePath)

    return get('/api/v1/mp/config/public', {}, { auth: false, showError: false })
      .then((publicConfig) => {
        const versionTag = (publicConfig && publicConfig.wx_version) || '0'
        const cacheKey = `${DSL_CACHE_PREFIX}${pagePath}_${versionTag}`

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

        return get('/api/v1/mp/pages', { path: resolvedPath }, { auth: false }).then((dsl) => {
          StorageUtil.set(cacheKey, dsl, DSL_CACHE_EXPIRE)
          const app = getApp()
          if (app) {
            app.globalData.pageDSLCache[pagePath] = dsl
          }
          return dsl
        })
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
      StorageUtil.remove(DSL_CACHE_PREFIX + pagePath)
      const app = getApp()
      if (app) {
        delete app.globalData.pageDSLCache[pagePath]
      }
    } else {
      const info = StorageUtil.getInfo()
      info.keys.forEach((key) => {
        if (key.startsWith(DSL_CACHE_PREFIX)) {
          StorageUtil.remove(key)
        }
      })
      const app = getApp()
      if (app) {
        app.globalData.pageDSLCache = {}
      }
    }
  },
}

module.exports = { PageService }
