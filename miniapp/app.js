// app.js — 小程序入口，全局状态管理
const { AuthUtil } = require('./utils/auth')
const { StorageUtil } = require('./utils/storage')
const SystemService = require('./services/system')
const { resolveSourceChannel } = require('./utils/source-channel')
const { applyThemeCssVars, installPageThemeHook } = require('./utils/theme')
const { installPageShareHook } = require('./utils/share')
const { installPageProductGuardHook, refreshProductModuleState } = require('./utils/product-module-gate')
const { installPageQaGuardHook, refreshQaModuleState } = require('./utils/qa-module-gate')
const { installPageFormGuardHook, refreshFormModuleState } = require('./utils/form-module-gate')

installPageThemeHook()
installPageShareHook()
installPageProductGuardHook()
installPageQaGuardHook()
installPageFormGuardHook()

App({
  /** 全局共享状态 */
  globalData: {
    userInfo: null,       // 用户信息
    token: null,          // JWT Token
    isLoggedIn: false,    // 登录状态
    systemInfo: null,     // 系统信息
    pageDSLCache: {},     // 页面 DSL 缓存
    miniappThemeConfig: null, // 小程序主题配置
    miniappBrandConfig: null, // 品牌基础信息（名称/Logo/登录文案）
    shareConfig: null,        // 全局分享标题/图（来自系统配置）
    sourceChannel: null,  // 首次归因来源
    commentModuleEnabled: true,
  },

  /** 小程序启动 */
  onLaunch(options) {
    this._captureSourceChannel(options)

    // 获取系统信息
    this.globalData.systemInfo = {
      ...(wx.getDeviceInfo ? wx.getDeviceInfo() : {}),
      ...(wx.getWindowInfo ? wx.getWindowInfo() : {}),
      ...(wx.getAppBaseInfo ? wx.getAppBaseInfo() : {}),
    }

    // 尝试恢复登录态
    this._restoreAuthState()

    // 检查更新
    this._checkUpdate()

    // 加载系统配置并应用主题
    this._loadSystemConfig()
  },

  onShow(options) {
    // 冷启动已记录则不覆盖；仅在尚未归因时补充
    if (!this.globalData.sourceChannel && !StorageUtil.get('sourceChannel')) {
      this._captureSourceChannel(options)
    }
  },

  /** 首次归因：只写一次 */
  _captureSourceChannel(options) {
    const cached = StorageUtil.get('sourceChannel')
    if (cached) {
      this.globalData.sourceChannel = cached
    } else {
      const channel = resolveSourceChannel(options || {})
      this.globalData.sourceChannel = channel
      StorageUtil.set('sourceChannel', channel)
    }
    // F6 邀请归因
    try {
      const q = (options && options.query) || {}
      const inviterId = q.inviterId || (options && options.inviterId)
      if (inviterId) {
        this.globalData.inviterId = Number(inviterId) || inviterId
        StorageUtil.set('inviterId', this.globalData.inviterId)
      } else {
        this.globalData.inviterId = StorageUtil.get('inviterId') || null
      }
    } catch (e) {}
  },

  /** 加载系统配置并应用主题 */
  async _loadSystemConfig() {
    try {
      const config = await SystemService.fetchSystemConfig(true)
      await refreshProductModuleState(false)
      await refreshQaModuleState(false)
      await refreshFormModuleState(false)
      this.globalData.commentModuleEnabled = SystemService.isCommentModuleEnabled(config.plugins)
      if (config.miniappBrandConfig) {
        this.globalData.miniappBrandConfig = config.miniappBrandConfig
      }
      this.globalData.shareConfig = {
        title: String(config.miniappShareTitle || (config.miniappBrandConfig && config.miniappBrandConfig.appName) || '').trim(),
        imageUrl: String(config.miniappShareImage || '').trim(),
      }
      try {
        StorageUtil.set('system_config', {
          ...(StorageUtil.get('system_config') || {}),
          miniappShareTitle: this.globalData.shareConfig.title,
          miniappShareImage: this.globalData.shareConfig.imageUrl,
          miniappBrandConfig: config.miniappBrandConfig || null,
        })
      } catch (e) { /* ignore */ }
      const { USE_LOCAL_SOURCE, WARM_THEME_CONFIG, WARM_PAGE_BG } = require('./data/warm-source')
      if (USE_LOCAL_SOURCE) {
        this.globalData.miniappThemeConfig = WARM_THEME_CONFIG
        applyThemeCssVars(WARM_THEME_CONFIG)
        wx.setNavigationBarColor({
          frontColor: '#000000',
          backgroundColor: WARM_PAGE_BG,
          animation: { duration: 200, timingFunc: 'easeIn' },
        })
      } else if (config.miniappThemeConfig) {
        this.globalData.miniappThemeConfig = config.miniappThemeConfig
        applyThemeCssVars(config.miniappThemeConfig)
        const navBarColor = config.miniappThemeConfig.navBarColor
        wx.setNavigationBarColor({
          frontColor: (navBarColor && navBarColor.frontColor) || '#000000',
          backgroundColor: (navBarColor && (navBarColor.backgroundColor || navBarColor)) || '#ffffff',
          animation: { duration: 200, timingFunc: 'easeIn' },
        })
      } else {
        applyThemeCssVars({ primaryColor: '#C2410C' })
      }
    } catch (e) {
      console.warn('[App] 加载系统配置失败:', e)
    }
  },

  /** 恢复本地存储的登录态 */
  _restoreAuthState() {
    const token = StorageUtil.get('token')
    const userInfo = StorageUtil.get('userInfo')

    // 必须绑定手机号后才算正式登录；半登录态直接清掉
    if (token && userInfo && userInfo.phoneBound) {
      this.globalData.token = token
      this.globalData.userInfo = userInfo
      this.globalData.isLoggedIn = true
    } else if (token || userInfo) {
      StorageUtil.remove('token')
      StorageUtil.remove('userInfo')
      this.globalData.token = null
      this.globalData.userInfo = null
      this.globalData.isLoggedIn = false
    }
  },

  /** 检查小程序版本更新 */
  _checkUpdate() {
    if (wx.canIUse('getUpdateManager')) {
      const updateManager = wx.getUpdateManager()
      updateManager.onCheckForUpdate((res) => {
        if (res.hasUpdate) {
          updateManager.onUpdateReady(() => {
            wx.showModal({
              title: '更新提示',
              content: '新版本已经准备好，是否重启应用？',
              success: (modalRes) => {
                if (modalRes.confirm) {
                  updateManager.applyUpdate()
                }
              }
            })
          })
          updateManager.onUpdateFailed(() => {
            wx.showModal({
              title: '更新提示',
              content: '新版本下载失败，请检查网络后重试',
            })
          })
        }
      })
    }
  },

  /** 设置登录态（供 login 页面调用） */
  setAuthState({ token, userInfo }) {
    const prev = this.globalData.userInfo || AuthUtil.getUserInfo() || {}
    const prevId = prev.id || prev.userId
    const nextId = userInfo && (userInfo.id || userInfo.userId)
    if (prevId && nextId && String(prevId) !== String(nextId)) {
      try { StorageUtil.remove('content_favorites_' + prevId) } catch (e) { /* ignore */ }
      StorageUtil.remove('moment_likes')
      StorageUtil.remove('moment_favorites')
    }
    const phoneBound = !!(userInfo && userInfo.phoneBound)
    this.globalData.token = token
    this.globalData.userInfo = userInfo
    // 未绑手机号时保留 token 供绑定接口使用，但不算已登录
    this.globalData.isLoggedIn = phoneBound

    StorageUtil.set('token', token)
    StorageUtil.set('userInfo', userInfo)
    if (phoneBound) {
      AuthUtil.clearManualLogout()
    }
  },

  /** 清除登录态（退出登录） */
  clearAuthState() {
    this.globalData.token = null
    this.globalData.userInfo = null
    this.globalData.isLoggedIn = false
    AuthUtil.clearAuth()
  },

  /** 更新用户信息 */
  updateUserInfo(userInfo) {
    this.globalData.userInfo = userInfo
    this.globalData.isLoggedIn = !!(userInfo && userInfo.phoneBound && this.globalData.token)
    StorageUtil.set('userInfo', userInfo)
  },
})
