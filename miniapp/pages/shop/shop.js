// pages/shop/shop.js — DSL 宿主薄壳
// 页面结构与数据完全由后台「页面装修」下发；此文件只负责生命周期与刷新。
const { createSharePageConfig } = require('../../utils/share')
const { showTabBarForRoute } = require('../../utils/tab-bar-route')
const { getNavLayout } = require('../../utils/nav-layout')
const { loadTabBoundDslPage, handleDslReachBottom, TAB_DSL_INITIAL } = require('../../utils/dsl-tab-page')

const ROUTE = '/pages/shop/shop'

Page({
  ...createSharePageConfig({ title: '商城' }),

  data: {
    ...TAB_DSL_INITIAL,
    themePageStyle: '',
    statusBarHeight: 0,
  },

  onLoad() {
    try {
      this.setData({ statusBarHeight: getNavLayout().statusBarHeight })
    } catch (e) { /* ignore */ }
    loadTabBoundDslPage(this, ROUTE)
  },

  onShow() {
    wx.hideTabBar({ animation: false, fail() {} })
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      showTabBarForRoute(this, ROUTE)
    }
    const { onTabPageShow } = require('../../utils/content-release-sync')
    onTabPageShow(this, ROUTE, () => loadTabBoundDslPage(this, ROUTE, true))
  },

  onPullDownRefresh() {
    const { onTabPagePullDownRefresh } = require('../../utils/content-release-sync')
    onTabPagePullDownRefresh(this, ROUTE, () => loadTabBoundDslPage(this, ROUTE, true))
      .finally(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    if (this.data.dslMode) handleDslReachBottom(this)
  },
})
