/** 自定义顶栏布局：状态栏 + 导航区 + 胶囊避让 */
function getNavLayout() {
  try {
    const win = (wx.getWindowInfo && wx.getWindowInfo()) || wx.getSystemInfoSync()
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
}
