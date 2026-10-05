// components/dsl-join-group/dsl-join-group.js
const { get } = require('../../utils/request')

// 取码结果复用窗口：窗口内重复开弹层不再重复请求
const QR_SYNC_TTL = 5 * 60 * 1000

Component({
  properties: {
    config: { type: Object, value: {} },
    runtimeData: { type: null, value: null },
    actions: { type: Array, value: [] },
    styleString: { type: String, value: '' },
  },

  data: {
    titleText: '读者交流群',
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
        join_type: String((g && g.join_type) || 'qrcode') === 'wecom' ? 'wecom' : 'qrcode',
        wecom_url: String((g && g.wecom_url) || '').trim(),
        // 与后台「运营中心 › 私域引流」的活码 groupKey 对应；为空则该群始终用内联二维码
        group_key: String((g && g.group_key) || '').trim(),
      }))
      let cardStyle = String(cfg._cardStyle || '').trim()
      if (!cardStyle) {
        const radiusRaw = Number(cfg.card_radius)
        const radius = Number.isFinite(radiusRaw) ? Math.max(0, Math.min(radiusRaw, 40)) : 12
        cardStyle = 'border-radius:' + (radius * 2) + 'rpx;'
      }
      this.setData({
        titleText: String(cfg.title || '读者交流群').trim() || '读者交流群',
        buttonText: String(cfg.button_text || '加入群聊').trim() || '加入群聊',
        sheetTitle: String(cfg.sheet_title || '加入群聊').trim() || '加入群聊',
        tipText: String(cfg.tip_text || '长按二维码可识别加群').trim() || '长按二维码可识别加群',
        avatarUrl: String(cfg.avatar || ''),
        cardStyle,
        tagList: tags,
        groupList: groups,
      })
      this._syncQrcodes(false, groups)
    },

    /**
     * 用后台活码覆盖内联二维码。
     * - 只有填了 group_key 的群才参与，全都为空时一个请求都不发（老页面零行为变化）；
     * - 该群在后台没有有效码 / 接口异常 / 未登录 → 一律静默回落内联 qrcode，不 toast、不打断浏览；
     * - auth:false 是因为该接口已 permitAll；即便线上后端未升级返回 401，也不会触发清登录态跳登录。
     */
    _syncQrcodes(force, listOverride) {
      const list = listOverride || this.data.groupList || []
      const keys = []
      list.forEach((g) => {
        const k = String((g && g.group_key) || '').trim()
        if (k && keys.indexOf(k) < 0) keys.push(k)
      })
      if (!keys.length) return
      if (this._syncing) return
      if (!force && this._lastSyncAt && Date.now() - this._lastSyncAt < QR_SYNC_TTL) return

      this._syncing = true
      const done = () => {
        this._syncing = false
      }
      get(
        '/api/v1/mp/group-qrcode/batch',
        { groupKeys: keys.join(',') },
        { showError: false, auth: false }
      ).then(
        (res) => {
          this._lastSyncAt = Date.now()
          done()
          const map = res && typeof res === 'object' ? res : {}
          const next = (this.data.groupList || []).map((g) => {
            const k = String((g && g.group_key) || '').trim()
            const hit = k ? map[k] : null
            if (hit && hit.qrcodeUrl) {
              return Object.assign({}, g, { qrcode: String(hit.qrcodeUrl) })
            }
            return g
          })
          this.setData({ groupList: next })
        },
        () => {
          done()
        }
      )
    },

    noop() {},

    onOpenSheet() {
      this.setData({ sheetVisible: true, qrVisible: false, activeName: '', activeQrcode: '' })
      // 开弹层时刷新一次取码结果（TTL 内会跳过），保证点开二维码拿到的是当前有效码
      this._syncQrcodes(false)
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
      if (group.join_type === 'wecom') {
        const url = String(group.wecom_url || '').trim()
        if (!url) {
          wx.showToast({ title: '未配置企微入群链接', icon: 'none' })
          return
        }
        wx.navigateTo({
          url: '/pkg-user/wecom-join/wecom-join?url=' + encodeURIComponent(url) + '&name=' + encodeURIComponent(group.name || ''),
          fail: () => wx.showToast({ title: '无法打开入群页', icon: 'none' }),
        })
        return
      }
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
