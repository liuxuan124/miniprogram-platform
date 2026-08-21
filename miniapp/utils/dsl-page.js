const { PageService } = require('../services/page')
const { parseDSL, loadAllComponentData } = require('./render')

const DEFAULT_DATA = {
  loading: true,
  error: '',
  flowComponents: [],
  floatComponents: [],
}

async function loadInto(pageCtx, pagePath, forceRefresh = false) {
  const path = String(pagePath || '').trim().replace(/^\/+/, '')
  if (!path) {
    pageCtx.setData({
      loading: false,
      error: '缺少页面路径',
      flowComponents: [],
      floatComponents: [],
    })
    return false
  }

  pageCtx.setData({ loading: true, error: '' })

  try {
    const dsl = await PageService.getPageDSL(path, forceRefresh)
    const parsed = parseDSL(dsl)
    const components = await loadAllComponentData(parsed.components || [])
    const flowComponents = []
    const floatComponents = []
    components.forEach((item) => {
      if (item && item.type === 'float_button') floatComponents.push(item)
      else flowComponents.push(item)
    })
    const title = (parsed.page && parsed.page.name) || '页面'
    wx.setNavigationBarTitle({ title })
    pageCtx.setData({
      loading: false,
      error: '',
      flowComponents,
      floatComponents,
    })
    pageCtx._dslPagePath = path
    return true
  } catch (e) {
    pageCtx.setData({
      loading: false,
      error: '页面不存在或未发布',
      flowComponents: [],
      floatComponents: [],
    })
    return false
  }
}

function handleReachBottom(pageCtx) {
  const renderers = pageCtx.selectAllComponents('dsl-renderer') || []
  renderers.forEach((renderer) => {
    const lists = (renderer.selectAllComponents && renderer.selectAllComponents('dsl-article-list')) || []
    lists.forEach((list) => {
      if (list && typeof list.loadMore === 'function') list.loadMore()
    })
  })
}

async function bootstrapLegacyTabPage(pageCtx, selfPath, forceRefresh = false) {
  const SystemService = require('../services/system')
  const TabRoute = require('./tab-route')
  const config = await SystemService.fetchSystemConfig(true)
  const tabs = config.tabbarItems || []
  const logical = TabRoute.resolveConfiguredTabPath(selfPath, tabs)
  await loadInto(pageCtx, logical.replace(/^\//, ''), forceRefresh)
  pageCtx._boundLogicalPath = logical.replace(/^\//, '')
  return { redirected: false, logicalPath: logical.replace(/^\//, '') }
}

module.exports = {
  DEFAULT_DATA,
  loadInto,
  handleReachBottom,
  bootstrapLegacyTabPage,
}
