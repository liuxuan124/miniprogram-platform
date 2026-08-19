// services/datasource.js — 数据源服务
// 根据 DSL 中的 data_source 配置，从后端拉取商品/内容/活动/优惠券数据

const { get } = require('../utils/request')
const { StorageUtil } = require('../utils/storage')

const DS_CACHE_PREFIX = 'ds_'
const DS_CACHE_EXPIRE = 5 * 60 * 1000 // 数据源缓存 5 分钟

/**
 * 数据源类型与对应 API 映射
 */
const DS_API_MAP = {
  product: '/api/v1/mp/products',
  content: '/api/v1/mp/contents',
  activity: '/api/v1/mp/activities',
  coupon: '/api/v1/mp/coupons',
  appointment_service: '/api/v1/mp/appointment-services',
}

// 每种数据源只保留前端需要的字段，减少 setData 体积
const DS_SLIM_FIELDS = {
  product: ['id', 'name', 'title', 'price', 'originalPrice', 'image', 'coverUrl', 'cover_url', 'mainImage', 'main_image', 'sales', 'status', 'tag', 'categoryId'],
  content: ['id', 'title', 'name', 'coverUrl', 'cover_url', 'image', 'summary', 'createdAt', 'created_at', 'publishedAt', 'publish_time', 'publishTime', 'createTime', 'categoryId', 'categoryName', 'source', 'viewCount', 'view_count'],
  activity: ['id', 'name', 'title', 'image', 'cover_url', 'coverUrl', 'startTime', 'start_time', 'endTime', 'end_time', 'location', 'venue', 'status'],
  coupon: ['id', 'name', 'title', 'type', 'value', 'amount', 'discount', 'minOrderAmount', 'minAmount', 'min_amount', 'startTime', 'start_time', 'endTime', 'end_time', 'status', 'condition'],
  appointment_service: ['id', 'name', 'title', 'description', 'desc', 'image', 'cover_url'],
}

/**
 * 精简数据，只保留必要字段
 */
function slimData(list, typeKey) {
  if (!Array.isArray(list) || !typeKey || !DS_SLIM_FIELDS[typeKey]) return list
  const fields = DS_SLIM_FIELDS[typeKey]
  return list.map((item, index) => {
    const slim = {}
    fields.forEach((f) => {
      if (item[f] !== undefined) slim[f] = item[f]
    })
    slim._key = `${typeKey}_${item.id || index}_${index}`
    return slim
  })
}

/**
 * 兼容 page-dsl 中不同数据源格式：
 * 1) { type: 'content', params: {...} }
 * 2) { type: 'api', config: { api: '/api/v1/articles', params: {...} } }
 * 3) { type: 'api', config: { api: '/api/v1/mp/contents', params: {...} } }
 */
function resolveDataSourceRequest(dataSource) {
  if (!dataSource) return { apiPath: '', params: {}, typeKey: '' }

  const directType = dataSource.type
  const config = dataSource.config || {}
  const params = { ...(dataSource.query || {}), ...(dataSource.params || {}), ...(config.params || {}) }
  Object.keys(params).forEach((key) => {
    if (params[key] === '' || params[key] === null || params[key] === undefined || params[key] === 'all') {
      delete params[key]
    }
  })
  // 兼容前端字段：category_id → categoryId；剔除仅前端使用的筛选字段
  if (params.category_id != null && params.categoryId == null) {
    params.categoryId = params.category_id
  }
  delete params.category_id
  delete params.publish_date
  delete params.sort_by
  delete params.is_recommended
  delete params.display_mode
  // 文章 type 筛选后端暂不支持，避免未知参数
  if (directType === 'content' || String(config.api || '').includes('/contents')) {
    delete params.type
  }

  // 标准 type 直接映射
  if (directType && DS_API_MAP[directType]) {
    return {
      apiPath: DS_API_MAP[directType],
      params,
      typeKey: directType,
    }
  }

  // 兼容 type=api + config.api
  if (directType === 'api') {
    const api = String(config.api || dataSource.api || '').trim()
    if (!api) return { apiPath: '', params, typeKey: 'api' }

    // 如果 DSL 已经写成 mp 接口，直接使用
    if (api.startsWith('/api/v1/mp/')) {
      return { apiPath: api, params, typeKey: 'api' }
    }

    // 兼容后台端/旧接口写法，统一映射到小程序公开接口
    if (api.includes('/articles') || api.includes('/contents')) {
      return { apiPath: DS_API_MAP.content, params, typeKey: 'content' }
    }
    if (api.includes('/products')) {
      return { apiPath: DS_API_MAP.product, params, typeKey: 'product' }
    }
    if (api.includes('/activities')) {
      return { apiPath: DS_API_MAP.activity, params, typeKey: 'activity' }
    }
    if (api.includes('/coupons')) {
      return { apiPath: DS_API_MAP.coupon, params, typeKey: 'coupon' }
    }
    if (api.includes('/appointment-services')) {
      return { apiPath: DS_API_MAP.appointment_service, params, typeKey: 'appointment_service' }
    }

    return { apiPath: api, params, typeKey: 'api' }
  }

  return { apiPath: '', params, typeKey: directType || '' }
}

function shouldBypassCache(typeKey, apiPath) {
  if (typeKey === 'product') return true
  if (typeof apiPath === 'string' && apiPath.includes('/mp/products')) return true
  return false
}

function pickListFromResponse(res) {
  if (Array.isArray(res)) return res
  if (!res || typeof res !== 'object') return []
  if (Array.isArray(res.list)) return res.list
  if (Array.isArray(res.items)) return res.items
  if (Array.isArray(res.records)) return res.records
  if (Array.isArray(res.data)) return res.data
  return []
}

function parseIdsParam(raw) {
  if (Array.isArray(raw)) return raw.map((id) => String(id)).filter(Boolean)
  if (typeof raw === 'string' && raw.trim()) {
    return raw.split(',').map((s) => s.trim()).filter(Boolean)
  }
  return []
}

function orderByIds(list, ids) {
  if (!ids.length || !Array.isArray(list)) return list
  const map = {}
  list.forEach((item) => {
    if (item && item.id != null) map[String(item.id)] = item
  })
  return ids.map((id) => map[String(id)]).filter(Boolean)
}

/**
 * 数据源服务
 * - 根据 data_source 配置自动请求对应后端接口
 * - 支持缓存，避免重复请求
 * - 支持分页加载
 */
const DatasourceService = {
  /**
   * 根据数据源配置获取数据
   * @param {Object} dataSource 数据源配置 { type, params }
   * @param {boolean} [forceRefresh] 是否强制刷新
   * @returns {Promise<Array>} 数据列表
   */
  fetchData(dataSource, forceRefresh = false) {
    if (!dataSource || !dataSource.type) {
      return Promise.resolve([])
    }

    const { apiPath, params, typeKey } = resolveDataSourceRequest(dataSource)
    if (!apiPath) {
      console.warn('[DatasourceService] 未知数据源类型:', dataSource.type, dataSource)
      return Promise.resolve([])
    }

    // 构建缓存 key
    const cacheKey = this._buildCacheKey(typeKey || dataSource.type, params)
    const bypassCache = shouldBypassCache(typeKey, apiPath)

    // 尝试从缓存读取
    if (!forceRefresh && !bypassCache) {
      const cached = StorageUtil.get(DS_CACHE_PREFIX + cacheKey)
      if (cached) {
        return Promise.resolve(cached)
      }
    }

    // 手动选品：按 ids 过滤并排序（后端列表接口未必支持 ids）
    const idList = parseIdsParam(params.ids)
    const isStreamMode = params.display_mode === 'stream'
    const requestParams = { ...params }
    delete requestParams.display_mode
    if (idList.length) {
      const need = Math.max(idList.length, Number(params.size || params.page_size || 20), 20)
      requestParams.current = 1
      requestParams.page = 1
      requestParams.size = Math.min(need, 100)
      requestParams.page_size = requestParams.size
    }

    // 请求后端
    return get(apiPath, requestParams, { auth: false }).then((res) => {
      let list = pickListFromResponse(res)

      // 精简数据，减少 setData 体积
      list = slimData(list, typeKey)

      if (idList.length) {
        list = orderByIds(list, idList)
      } else if (!isStreamMode) {
        // 限制数量，首页最多 6 条（商品流模式由组件自行分页）
        const MAX_HOME_ITEMS = 6
        if (list.length > MAX_HOME_ITEMS) {
          list = list.slice(0, MAX_HOME_ITEMS)
        }
      }

      // 写入缓存（商品列表走实时，不缓存）
      if (!bypassCache) {
        StorageUtil.set(DS_CACHE_PREFIX + cacheKey, list, DS_CACHE_EXPIRE)
      }

      return list
    }).catch((err) => {
      console.error('[DatasourceService] 获取数据失败:', typeKey || dataSource.type, err)
      // 降级：尝试使用过期缓存
      const cacheKey = this._buildCacheKey(typeKey || dataSource.type, params)
      const cached = StorageUtil.get(DS_CACHE_PREFIX + cacheKey)
      if (cached) {
        return cached
      }
      return []
    })
  },

  /**
   * 分页获取数据（用于触底加载）
   * @param {Object} dataSource 数据源配置
   * @param {number} page 页码
   * @param {number} [pageSize] 每页数量
   * @returns {Promise<{ list: Array, hasMore: boolean, total: number }>}
   */
  fetchPagedData(dataSource, page = 1, pageSize = 10) {
    if (!dataSource || !dataSource.type) {
      return Promise.resolve({ list: [], hasMore: false, total: 0 })
    }

    const { apiPath, params, typeKey } = resolveDataSourceRequest(dataSource)
    if (!apiPath) {
      return Promise.resolve({ list: [], hasMore: false, total: 0 })
    }

    const queryParams = {
      ...params,
      page,
      page_size: pageSize,
      current: page,
      size: pageSize,
    }

    return get(apiPath, queryParams, { auth: false }).then((res) => {
      const list = slimData(pickListFromResponse(res), typeKey)
        .map((item, index) => ({
          ...item,
          _key: `${typeKey || dataSource.type}_${item.id || index}_${page}_${index}`,
        }))
      const total = Number(res && (res.total || res.count || 0)) || 0
      const hasMore = total > 0 ? (page * pageSize < total) : (list.length >= pageSize && page < 5)

      return { list, hasMore, total }
    }).catch((err) => {
      console.error('[DatasourceService] 分页获取数据失败:', dataSource.type, err)
      return { list: [], hasMore: false, total: 0 }
    })
  },

  /**
   * 批量获取多个数据源
   * @param {Array<Object>} dataSources 数据源配置数组
   * @returns {Promise<Array<Array>>} 按顺序返回各数据源的数据
   */
  fetchMultiple(dataSources = []) {
    if (!dataSources.length) return Promise.resolve([])

    const tasks = dataSources.map((ds) => this.fetchData(ds))
    return Promise.all(tasks)
  },

  /**
   * 清除数据源缓存
   * @param {string} [type] 数据源类型，不传则清除全部
   */
  clearCache(type) {
    if (!type) {
      const info = StorageUtil.getInfo()
      info.keys.forEach((key) => {
        if (key.startsWith(DS_CACHE_PREFIX)) {
          StorageUtil.remove(key)
        }
      })
    } else {
      // 按类型清除（前缀匹配）
      const info = StorageUtil.getInfo()
      info.keys.forEach((key) => {
        if (key.startsWith(DS_CACHE_PREFIX + type + '_')) {
          StorageUtil.remove(key)
        }
      })
    }
  },

  /**
   * 构建缓存 key
   * @param {string} type 数据源类型
   * @param {Object} params 查询参数
   * @returns {string}
   */
  _buildCacheKey(type, params) {
    const sortedParams = Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join('&')
    return `${type}_${sortedParams || 'default'}`
  },
}

module.exports = { DatasourceService }
