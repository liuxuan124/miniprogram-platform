/** Tab 栏与页面路径解析：后台导航配置 → 小程序实际打开路径 */

const SWITCH_TAB_PATHS = new Set([
  '/pages/index/index',
  '/pages/content-list/content-list',
  '/pages/product-list/product-list',
  '/pages/mine/mine',
])

const LEGACY_SHELL_BY_HINT = {
  home: '/pages/index/index',
  content: '/pages/content-list/content-list',
  shop: '/pages/product-list/product-list',
  mine: '/pages/mine/mine',
}

const LEGACY_TAB_HINTS = {
  '/pages/index/index': 'home',
  '/pages/content-list/content-list': 'content',
  '/pages/product-list/product-list': 'shop',
  '/pages/mine/mine': 'mine',
}

function normalizePath(path) {
  return '/' + String(path || '').replace(/^\/+/, '')
}

function stripQuery(path) {
  return normalizePath(path).split('?')[0]
}

function parseQuery(path) {
  const raw = normalizePath(path)
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

function resolveOpenPath(logicalPath) {
  const base = normalizePath(logicalPath)
  if (base.startsWith('/pages/custom/') || base.startsWith('/pages/activity/')) {
    const logical = base.replace(/^\//, '')
    return `/pages/custom/custom?path=${encodeURIComponent(logical)}`
  }
  return base
}

function isSwitchTabPath(openPath) {
  return SWITCH_TAB_PATHS.has(stripQuery(openPath))
}

function findTabItem(tabs, options = {}) {
  const list = Array.isArray(tabs) ? tabs.filter((item) => item.enabled !== false) : []
  const legacyPath = options.legacyPath ? normalizePath(options.legacyPath) : ''
  if (legacyPath) {
    const direct = list.find((item) => normalizePath(item.pagePath) === legacyPath)
    if (direct) return direct
  }
  const slotHint = options.slotHint
  if (slotHint === 'content') {
    return list.find((item) => /内容|资讯|干货/.test(String(item.text || item.name || ''))) || list[1] || null
  }
  if (slotHint === 'shop') {
    return list.find((item) => /商品|商城|店铺/.test(String(item.text || item.name || ''))) || null
  }
  if (slotHint === 'home') return list[0] || null
  if (slotHint === 'mine') {
    return list.find((item) => /我的|mine/i.test(String(item.text || item.name || ''))) || list[list.length - 1] || null
  }
  return null
}

function resolveConfiguredTabPath(legacyPath, tabs) {
  const base = normalizePath(legacyPath)
  const hint = LEGACY_TAB_HINTS[base]
  const item = findTabItem(tabs, { legacyPath: base, slotHint: hint })
  return item ? normalizePath(item.pagePath) : base
}

function inferShellHintFromTabItem(item, index, listLength) {
  const text = String(item.text || item.name || '')
  if (/首页|home/i.test(text)) return 'home'
  if (/商品|商城|店铺/.test(text)) return 'shop'
  if (/内容|资讯|干货/.test(text)) return 'content'
  if (/我的|mine/i.test(text)) return 'mine'
  if (index === 0) return 'home'
  if (index === listLength - 1) return 'mine'
  if (listLength === 4 && index === 2) return 'shop'
  return 'content'
}

/** Tab 绑定页 → 已注册 tabBar 壳页（custom DSL 在内联壳页加载） */
function resolveLegacyShellPath(logicalPath, tabs) {
  const normalized = normalizePath(logicalPath)
  if (SWITCH_TAB_PATHS.has(normalized)) return normalized

  const list = Array.isArray(tabs) ? tabs.filter((item) => item.enabled !== false) : []
  const idx = list.findIndex((item) => normalizePath(item.pagePath) === normalized)
  if (idx >= 0) {
    const hint = inferShellHintFromTabItem(list[idx], idx, list.length)
    return LEGACY_SHELL_BY_HINT[hint] || normalized
  }

  const shellEntry = Object.entries(LEGACY_TAB_HINTS).find(([, hint]) => {
    const item = findTabItem(list, { slotHint: hint })
    return item && normalizePath(item.pagePath) === normalized
  })
  if (shellEntry) return shellEntry[0]

  return normalized
}

/** Tab 点击 / Tab 跳转应使用的 switchTab 路径 */
function resolveTabSwitchPath(pagePath, tabs) {
  const normalized = normalizePath(pagePath)
  if (SWITCH_TAB_PATHS.has(normalized)) return normalized

  const list = Array.isArray(tabs) ? tabs.filter((item) => item.enabled !== false) : []
  if (isTabBoundLogicalPath(normalized.replace(/^\//, ''), list)
    || list.some((item) => normalizePath(item.pagePath) === normalized)) {
    const shell = resolveLegacyShellPath(normalized, list)
    if (SWITCH_TAB_PATHS.has(shell)) return shell
  }

  return resolveOpenPath(pagePath)
}

function rewriteUnregisteredPage(path) {
  const url = normalizePath(path)
  const base = stripQuery(url)
  if (!base || base === '/pages/custom/custom') return url
  if (base.startsWith('/pages/custom/') || base.startsWith('/pages/activity/')) {
    const logical = base.replace(/^\//, '')
    return `/pages/custom/custom?path=${encodeURIComponent(logical)}`
  }
  return url
}

function rewriteLegacyTabTarget(path, tabs) {
  const raw = normalizePath(path)
  const base = stripQuery(raw)
  if (!LEGACY_TAB_HINTS[base]) return raw
  const configured = resolveConfiguredTabPath(base, tabs)
  if (configured === base) return raw
  const query = raw.includes('?') ? raw.slice(raw.indexOf('?')) : ''
  return resolveTabSwitchPath(configured, tabs) + query
}

function resolveNavigationPath(path, tabs) {
  let url = rewriteLegacyTabTarget(path, tabs)
  url = rewriteUnregisteredPage(url)
  return url
}

function parseCustomLogicalPath(openPath) {
  const base = stripQuery(openPath)
  if (base !== '/pages/custom/custom') return ''
  const query = parseQuery(openPath)
  return decodeURIComponent(query.path || query.p || '')
}

function isTabBoundLogicalPath(logicalPath, tabs) {
  const normalized = normalizePath(logicalPath)
  return (tabs || []).some((item) => normalizePath(item.pagePath) === normalized)
}

function openPage(path, tabs) {
  const url = resolveNavigationPath(path, tabs)
  if (!url) return

  const query = parseQuery(url)
  const base = stripQuery(url)

  if (isSwitchTabPath(base)) {
    if (Object.keys(query).length) {
      try {
        wx.setStorageSync('__tab_query__' + base, query)
      } catch (e) { /* ignore */ }
    }
    wx.switchTab({
      url: base,
      fail: (err) => {
        console.warn('[TabRoute] switchTab 失败:', base, err)
      },
    })
    return
  }

  const logical = parseCustomLogicalPath(url)
  if (logical && isTabBoundLogicalPath(logical, tabs)) {
    const shell = resolveLegacyShellPath('/' + logical.replace(/^\/+/, ''), tabs)
    if (SWITCH_TAB_PATHS.has(shell)) {
      wx.switchTab({ url: shell })
      return
    }
    wx.reLaunch({ url })
    return
  }

  const tabList = Array.isArray(tabs) ? tabs : []
  const normalizedTarget = stripQuery(normalizePath(path))
  if (tabList.some((item) => normalizePath(item.pagePath) === normalizedTarget)) {
    const shell = resolveLegacyShellPath(normalizedTarget, tabList)
    if (SWITCH_TAB_PATHS.has(shell)) {
      wx.switchTab({ url: shell })
      return
    }
  }

  wx.navigateTo({
    url,
    fail: () => {
      wx.reLaunch({
        url,
        fail: (err) => console.warn('[TabRoute] 打开页面失败:', url, err),
      })
    },
  })
}

function getTabIndexForRoute(route, optionsPath, tabs) {
  const list = Array.isArray(tabs) ? tabs : []
  const currentRoute = normalizePath(route)

  if (currentRoute === '/pages/custom/custom' && optionsPath) {
    const normalized = normalizePath(decodeURIComponent(optionsPath))
    const idx = list.findIndex((item) => normalizePath(item.pagePath) === normalized)
    if (idx >= 0) return idx
  }

  const shellIdx = list.findIndex((item) => {
    const shell = resolveLegacyShellPath(normalizePath(item.pagePath), list)
    return shell === currentRoute
  })
  if (shellIdx >= 0) return shellIdx

  const idx = list.findIndex((item) => {
    const logicalBase = normalizePath(item.pagePath)
    return logicalBase === currentRoute
  })
  if (idx >= 0) return idx

  const hint = LEGACY_TAB_HINTS[currentRoute]
  if (hint) {
    const item = findTabItem(list, { slotHint: hint })
    if (item) {
      const hintIdx = list.findIndex((tab) => normalizePath(tab.pagePath) === normalizePath(item.pagePath))
      if (hintIdx >= 0) return hintIdx
    }
  }

  return -1
}

module.exports = {
  SWITCH_TAB_PATHS,
  LEGACY_TAB_HINTS,
  LEGACY_SHELL_BY_HINT,
  normalizePath,
  stripQuery,
  parseQuery,
  resolveOpenPath,
  isSwitchTabPath,
  findTabItem,
  resolveConfiguredTabPath,
  resolveLegacyShellPath,
  resolveTabSwitchPath,
  rewriteUnregisteredPage,
  rewriteLegacyTabTarget,
  resolveNavigationPath,
  isTabBoundLogicalPath,
  openPage,
  getTabIndexForRoute,
}
