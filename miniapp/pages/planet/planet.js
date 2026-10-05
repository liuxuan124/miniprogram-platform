// pages/planet/planet.js — DSL 宿主薄壳
// 页面结构与数据完全由后台「页面装修」下发；此文件只负责生命周期与刷新。
const { createSharePageConfig } = require('../../utils/share')
const { showTabBarForRoute } = require('../../utils/tab-bar-route')
const { getNavLayout } = require('../../utils/nav-layout')
const { loadTabBoundDslPage, handleDslReachBottom, TAB_DSL_INITIAL } = require('../../utils/dsl-tab-page')
const { PlanetOnboarding } = require('../../utils/planet-onboarding')
const PlanetService = require('../../services/planet')

const ROUTE = '/pages/planet/planet'

Page({
  ...createSharePageConfig({ title: '星球' }),

  data: {
    ...TAB_DSL_INITIAL,
    themePageStyle: '',
    statusBarHeight: 0,
    /** 点过「先逛逛」后的一次性非阻断提示条（不弹窗、不阻断浏览） */
    pickTipVisible: false,
  },

  onLoad() {
    try {
      this.setData({ statusBarHeight: getNavLayout().statusBarHeight })
    } catch (e) { /* ignore */ }
    // ⚠️ 引导判定必须赶在 DSL 加载之前：先加载再 redirect 会「闪一下默认星球」再跳走。
    //    maybeGuide 是异步的，所以这里用 then 串起来；判定不命中才加载本页 DSL。
    this._boot()
  },

  onShow() {
    wx.hideTabBar({ animation: false, fail() {} })
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      showTabBarForRoute(this, ROUTE)
    }
    // ⚠️ _boot() 的引导判定是异步的，onLoad 之后微信同帧就会触发 onShow。
    //    若不加 _booting 闸门，onShow 会在判定完成前并行 loadTabBoundDslPage，
    //    与 _boot 的 miss 分支重复请求，且一旦引导命中就出现「闪一下默认星球」——
    //    正是上面 onLoad 注释想避免的。
    if (this._guided) return
    if (this._booting) return
    const { onTabPageShow } = require('../../utils/content-release-sync')
    onTabPageShow(this, ROUTE, () => loadTabBoundDslPage(this, ROUTE, true))
  },

  onPullDownRefresh() {
    if (this._guided) {
      wx.stopPullDownRefresh()
      return
    }
    const { onTabPagePullDownRefresh } = require('../../utils/content-release-sync')
    onTabPagePullDownRefresh(this, ROUTE, () => loadTabBoundDslPage(this, ROUTE, true))
      .finally(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    if (this.data.dslMode) handleDslReachBottom(this)
  },

  /** 首次进入引导判定 → 命中 redirect，否则正常加载本页 */
  _boot() {
    // _booting 闸门：阻断 onShow 在判定完成前的并行加载（见 onShow 注释）
    this._booting = true
    let guided = false
    try {
      guided = PlanetOnboarding.maybeGuide()
    } catch (e) {
      guided = false
    }
    Promise.resolve(guided)
      .then((hit) => {
        if (hit) {
          this._guided = true
          return null
        }
        this._checkPickTip()
        return loadTabBoundDslPage(this, ROUTE)
      })
      .catch(() => {
        // 判定或加载任一失败都要把 DSL 兜回来，绝不能白屏
        if (!this._guided) return loadTabBoundDslPage(this, ROUTE)
        return null
      })
      .finally(() => {
        // 无论成败都放开闸门，否则一次异常会让本页后续 onShow 全部空转
        this._booting = false
        this._guided = false
      })
  },

  /**
   * 主星球被运营停用后回落 → toast 提示一次；
   * 用户点过「先逛逛」→ 给一条非阻断提示条，不反复打扰。
   */
  _checkPickTip() {
    try {
      if (PlanetService.isPickSkipped()) {
        this.setData({ pickTipVisible: true })
        return
      }
      PlanetOnboarding.checkFallback().then((fb) => {
        if (fb && fb.title) {
          wx.showToast({
            title: '原主星球已停用，已切到' + fb.title,
            icon: 'none',
            duration: 2600,
          })
        }
      }).catch(() => {})
    } catch (e) { /* ignore */ }
  },

  onPickTipClose() {
    this.setData({ pickTipVisible: false })
  },

  /** 提示条「去选一个」：进选择页（这里用管理态，用户已是老用户不需要引导头） */
  onPickTipGo() {
    this.setData({ pickTipVisible: false })
    wx.navigateTo({ url: '/pkg-content/planet-list/planet-list', fail: () => {} })
  },
})
