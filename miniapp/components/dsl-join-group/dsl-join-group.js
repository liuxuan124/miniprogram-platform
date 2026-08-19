// components/dsl-join-group/dsl-join-group.js
Component({
  properties: {
    config: { type: Object, value: {} },
    runtimeData: { type: null, value: null },
    actions: { type: Array, value: [] },
    styleString: { type: String, value: '' },
  },

  data: {
    titleText: '跨境电商交流群',
    buttonText: '加入群聊',
    sheetTitle: '加入群聊',
    tipText: '长按二维码可识别加群',
    avatarUrl: '',
    cardStyle: '',
    tagList: [],
    groupList: [],
    sheetVisible: false,
    qrVisible: false,
    activeName: '',
    activeQrcode: '',
  },

  observers: {
    config(config) {
      this._apply(config)
    },
  },

  lifetimes: {
    attached() {
      this._apply(this.data.config)
    },
  },

  methods: {
    _apply(config) {
      const cfg = config || {}
      const tags = Array.isArray(cfg.tags)
        ? cfg.tags.map((t) => String(t || '').trim()).filter(Boolean).slice(0, 6)
        : []
      const groups = (Array.isArray(cfg.groups) ? cfg.groups : []).map((g, i) => ({
        id: String((g && g.id) || `g_${i + 1}`),
        name: String((g && g.name) || `群 ${i + 1}`).trim() || `群 ${i + 1}`,
        icon: String((g && g.icon) || ''),
        qrcode: String((g && g.qrcode) || ''),
      }))
      let cardStyle = String(cfg._cardStyle || '').trim()
      if (!cardStyle) {
        const radiusRaw = Number(cfg.card_radius)
        const radius = Number.isFinite(radiusRaw) ? Math.max(0, Math.min(radiusRaw, 40)) : 12
        cardStyle = 'border-radius:' + (radius * 2) + 'rpx;'
      }
      this.setData({
        titleText: String(cfg.title || '跨境电商交流群').trim() || '跨境电商交流群',
        buttonText: String(cfg.button_text || '加入群聊').trim() || '加入群聊',
        sheetTitle: String(cfg.sheet_title || '加入群聊').trim() || '加入群聊',
        tipText: String(cfg.tip_text || '长按二维码可识别加群').trim() || '长按二维码可识别加群',
        avatarUrl: String(cfg.avatar || ''),
        cardStyle,
        tagList: tags,
        groupList: groups,
      })
    },

    noop() {},

    onOpenSheet() {
      this.setData({ sheetVisible: true, qrVisible: false, activeName: '', activeQrcode: '' })
    },

    onCloseAll() {
      this.setData({ sheetVisible: false, qrVisible: false, activeName: '', activeQrcode: '' })
    },

    onCloseQr() {
      this.setData({ qrVisible: false, activeName: '', activeQrcode: '' })
    },

    onOpenQr(e) {
      const index = Number(e.currentTarget.dataset.index)
      const group = (this.data.groupList || [])[index]
      if (!group) return
      this.setData({
        qrVisible: true,
        activeName: group.name,
        activeQrcode: group.qrcode || '',
      })
    },

    onSaveImage() {
      let url = this.data.activeQrcode
      if (!url) return
      if (url.indexOf('//') === 0) url = 'https:' + url
      wx.showLoading({ title: '保存中', mask: true })
      const finish = (ok, msg) => {
        wx.hideLoading()
        wx.showToast({ title: msg || (ok ? '已保存' : '保存失败'), icon: ok ? 'success' : 'none' })
      }
      const saveTemp = (filePath) => {
        const doSave = () => {
          wx.saveImageToPhotosAlbum({
            filePath,
            success: () => finish(true, '已保存到相册'),
            fail: (err) => {
              const msg = String((err && err.errMsg) || '')
              if (msg.indexOf('auth deny') >= 0 || msg.indexOf('authorize') >= 0 || msg.indexOf('privacy') >= 0) {
                wx.showModal({
                  title: '需要相册权限',
                  content: '请在设置中允许保存到相册后重试',
                  confirmText: '去设置',
                  success: (res) => {
                    if (res.confirm) wx.openSetting({})
                  },
                })
                wx.hideLoading()
                return
              }
              finish(false, '保存失败')
            },
          })
        }
        wx.getSetting({
          success: (setting) => {
            if (setting.authSetting && setting.authSetting['scope.writePhotosAlbum'] === false) {
              wx.authorize({
                scope: 'scope.writePhotosAlbum',
                success: doSave,
                fail: () => {
                  wx.showModal({
                    title: '需要相册权限',
                    content: '请在设置中允许保存到相册后重试',
                    confirmText: '去设置',
                    success: (res) => {
                      if (res.confirm) wx.openSetting({})
                    },
                  })
                  wx.hideLoading()
                },
              })
              return
            }
            doSave()
          },
          fail: doSave,
        })
      }
      if (/^wxfile:\/\//i.test(url) || /^http:\/\/tmp\//i.test(url)) {
        saveTemp(url)
        return
      }
      wx.downloadFile({
        url,
        success: (res) => {
          if (res.statusCode === 200 && res.tempFilePath) saveTemp(res.tempFilePath)
          else finish(false, '下载失败')
        },
        fail: () => finish(false, '下载失败，请检查下载域名白名单'),
      })
    },
  },
})
