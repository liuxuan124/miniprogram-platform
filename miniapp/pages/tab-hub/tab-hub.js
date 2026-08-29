// pages/tab-hub/tab-hub.js — 第 5 个 Tab 壳页：绑定装修 DSL
const { createSharePageConfig } = require('../../utils/share')
const { loadTabBoundDslPage, handleDslReachBottom, TAB_DSL_INITIAL } = require('../../utils/dsl-tab-page')
const { showTabBarForRoute } = require('../../utils/tab-bar-route')

const TAB_ROUTE = '/pages/tab-hub/tab-hub'

Page({
  ...createSharePageConfig(),
  data: { ...TAB_DSL_INITIAL },

  onLoad() {
    loadTabBoundDslPage(this, TAB_ROUTE)
  },

  onShow() {
    showTabBarForRoute(this, TAB_ROUTE)
  },

  onPullDownRefresh() {
    loadTabBoundDslPage(this, TAB_ROUTE, true).finally(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    handleDslReachBottom(this)
  },
})
