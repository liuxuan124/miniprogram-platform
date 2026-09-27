const { getWindowInfo } = require('./system-info')

const CUSTOM_NAVIGATION_ROUTES = new Set([
  'pages/index/index',
  'pages/discover/discover',
  'pages/planet/planet',
  'pages/shop/shop',
  'pages/mine/mine',
  'pages/tab-hub/tab-hub',
  'pages/content-list/content-list',
  'pages/custom-nav/custom-nav',
  'pages/content-detail/content-detail',
  'pages/product-detail/product-detail',
  'pages/contribute/contribute',
  'pages/login/login',
  'pages/share/share',
  'pkg-content/tab-hub/tab-hub',
  'pkg-content/content-list/content-list',
  'pkg-content/content-detail/content-detail',
  'pkg-content/product-detail/product-detail',
  'pkg-content/contribute/contribute',
  'pkg-content/share/share',
])

function isCustomNavigationRoute(route) {
  return CUSTOM_NAVIGATION_ROUTES.has(String(route || '').replace(/^\/+/, ''))
}

/** 自定义顶栏布局：状态栏 + 导航区 + 胶囊避让 */
function getNavLayout() {
  try {
    const win = getWindowInfo()
    const menu = wx.getMenuButtonBoundingClientRect()
    const statusBarHeight = Number(win.statusBarHeight) || 20
    const gap = Math.max((menu.top || statusBarHeight) - statusBarHeight, 0)
    const navBarHeight = Math.max((menu.height || 32) + gap * 2, 44)
    const capsuleRight = Math.max((win.screenWidth || 375) - (menu.left || 280) + 8, 88)
    return {
      statusBarHeight,
      navBarHeight,
      capsuleRight,
      totalHeight: statusBarHeight + navBarHeight,
    }
  } catch (e) {
    return {
      statusBarHeight: 20,
      navBarHeight: 44,
      capsuleRight: 96,
      totalHeight: 64,
    }
  }
}

module.exports = {
  getNavLayout,
  isCustomNavigationRoute,
}
