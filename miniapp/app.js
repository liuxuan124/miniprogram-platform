// app.js — 小程序入口，全局状态管理
const { AuthUtil } = require('./utils/auth')
const { StorageUtil } = require('./utils/storage')
const SystemService = require('./services/system')
const { resolveSourceChannel } = require('./utils/source-channel')

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
    sourceChannel: null,  // 首次归因来源
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
      return
    }
    const channel = resolveSourceChannel(options || {})
    this.globalData.sourceChannel = channel
    StorageUtil.set('sourceChannel', channel)
  },

  /** 加载系统配置并应用主题 */
  async _loadSystemConfig() {
    try {
      const config = await SystemService.fetchSystemConfig()
      if (config.miniappBrandConfig) {
        this.globalData.miniappBrandConfig = config.miniappBrandConfig
      }
      if (config.miniappThemeConfig) {
        this.globalData.miniappThemeConfig = config.miniappThemeConfig
        const navBarColor = config.miniappThemeConfig.navBarColor
        // 极简默认：白底黑字；后台显式配置时仍可覆盖
        wx.setNavigationBarColor({
          frontColor: (navBarColor && navBarColor.frontColor) || '#000000',
          backgroundColor: (navBarColor && navBarColor.backgroundColor) || '#ffffff',
          animation: { duration: 200, timingFunc: 'easeIn' },
        })
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

    StorageUtil.remove('token')
    StorageUtil.remove('userInfo')
  },

  /** 更新用户信息 */
  updateUserInfo(userInfo) {
    this.globalData.userInfo = userInfo
    this.globalData.isLoggedIn = !!(userInfo && userInfo.phoneBound && this.globalData.token)
    StorageUtil.set('userInfo', userInfo)
  },
})
