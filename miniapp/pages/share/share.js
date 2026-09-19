const request = require('../../utils/request')
const { createSharePageConfig, buildSharePath } = require('../../utils/share')
const { AuthUtil } = require('../../utils/auth')
const { StorageUtil } = require('../../utils/storage')
const { getNavLayout } = require('../../utils/nav-layout')
const qrcode = require('../../utils/qrcode')
const { hasFavoriteId, readFavoriteIds, writeFavoriteIds } = require('../../utils/favorite-ids')
const QR_CANVAS_SIZE = 174

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  const chars = String(text || '').split('')
  let line = ''
  let row = 0
  for (let i = 0; i < chars.length; i++) {
    const test = line + chars[i]
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y + row * lineHeight)
      line = chars[i]
      row += 1
      if (maxLines && row >= maxLines) {
        if (i < chars.length - 1) {
          const clipped = line.slice(0, Math.max(0, line.length - 1)) + '…'
          ctx.fillText(clipped, x, y + row * lineHeight)
        }
        return row + 1
      }
    } else {
      line = test
    }
  }
  if (line) ctx.fillText(line, x, y + row * lineHeight)
  return row + 1
}

function loadImage(canvas, src) {
  return new Promise((resolve, reject) => {
    if (!src) {
      reject(new Error('无封面图'))
      return
    }
    const img = canvas.createImage()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('封面加载失败'))
    img.src = src
  })
}

Page({
  ...createSharePageConfig({ title: '暖阁｜分享邀请' }),
  data: {
    title: '',
    cover: '',
    quote: '',
    author: '',
    avatar: '/images/default-avatar.png',
    inviteCount: 0,
    inviteDays: 0,
    inviteLoggedIn: false,
    shareFrom: '来自暖阁读者的分享',
    tip: '邀请好友进入暖阁。奖励以实际到账为准。',
    rewardTip: '',
    path: '/pages/index/index',
    shortCode: '',
    showPoster: false,
    posterStyle: 'cover',
    canvasW: 375,
    canvasH: 560,
    saving: false,
    favorited: false,
    contentId: '',
    fontSizeLabel: '标准',
    qrImageUrl: '',
    statusBarHeight: 20,
    navBarHeight: 44,
    navTotalHeight: 64,
    capsuleRight: 96,
  },

  onLoad(options) {
    const layout = getNavLayout()
    const title = options && options.title ? decodeURIComponent(options.title) : ''
    const path = options && options.path ? decodeURIComponent(options.path) : '/pages/index/index'
    const code = options && options.code ? String(options.code).trim().toUpperCase() : ''
    const cover = options && options.cover ? decodeURIComponent(options.cover) : ''
    const incomingQuote = options && options.quote ? decodeURIComponent(options.quote) : ''
    const contentId = options && options.contentId ? String(options.contentId) : ''
    const quote = incomingQuote
    let favorited = false
    if (contentId) {
      try {
        favorited = hasFavoriteId(contentId)
      } catch (e) { /* ignore */ }
    }
    this.setData({
      title: title || '暖阁',
      path,
      shortCode: code,
      cover: cover || '',
      quote: quote || '',
      author: '',
      avatar: '/images/default-avatar.png',
      inviteCount: 0,
      inviteDays: 0,
      inviteLoggedIn: AuthUtil.isLoggedIn(),
      rewardTip: '',
      contentId,
      favorited,
      statusBarHeight: layout.statusBarHeight,
      navBarHeight: layout.navBarHeight,
      navTotalHeight: layout.totalHeight,
      capsuleRight: layout.capsuleRight,
    })
    try {
      if (AuthUtil.isLoggedIn()) {
        const u = AuthUtil.getUserInfo && AuthUtil.getUserInfo()
        if (u && (u.nickName || u.nickname)) {
          this.setData({ shareFrom: '来自 ' + (u.nickName || u.nickname) + ' 的分享' })
        }
        request.get('/api/v1/mp/mine/overview', {}, { auth: true, showError: false }).then((data) => {
          const count = Number(data && data.inviteCount)
          this.setData({
            inviteCount: Number.isFinite(count) ? count : 0,
            inviteDays: 0,
            inviteLoggedIn: true,
            rewardTip: '奖励以实际到账为准，不以本页展示为准。',
          })
        }).catch(() => {
          this.setData({ inviteLoggedIn: true, rewardTip: '邀请战绩暂时无法获取' })
        })
      } else {
        this.setData({ inviteLoggedIn: false, tip: '登录后可生成带邀请码的分享，并查看真实邀请人数。' })
      }
    } catch (e) { /* ignore */ }
    if (code) {
      this._resolveCode(code)
    } else if (AuthUtil.isLoggedIn()) {
      this._createScene(path)
    } else {
      this._refreshQr()
    }
  },

  _buildQrText() {
    const code = String(this.data.shortCode || '').trim()
    if (code) return 'https://nuange.example/i/' + encodeURIComponent(code)
    const path = String(this.data.path || '/pages/index/index').replace(/^\//, '')
    return 'https://nuange.example/' + path
  },

  _qrFallbackUrl(text) {
    return 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data='
      + encodeURIComponent(text) + '&margin=0'
  },

  _refreshQr() {
    const text = this._buildQrText()
    const fallback = this._qrFallbackUrl(text)
    const apply = (url) => {
      if (url) this.setData({ qrImageUrl: url })
    }
    try {
      const ctx = wx.createCanvasContext('shareQrCanvas', this)
      qrcode.drawQrcode(ctx, text, { size: QR_CANVAS_SIZE })
      setTimeout(() => {
        wx.canvasToTempFilePath({
          canvasId: 'shareQrCanvas',
          width: QR_CANVAS_SIZE,
          height: QR_CANVAS_SIZE,
          destWidth: QR_CANVAS_SIZE * 2,
          destHeight: QR_CANVAS_SIZE * 2,
          success: (res) => apply(res.tempFilePath || fallback),
          fail: () => apply(fallback),
        }, this)
      }, 60)
    } catch (e) {
      apply(fallback)
    }
  },

  _createScene(path) {
    return request.post('/api/v1/mp/invite/scene', {
      targetType: 'page',
      targetId: path || '/pages/index/index',
    }, { auth: true, showError: false })
      .then((res) => {
        if (!res || !res.shortCode) {
          this._refreshQr()
          return
        }
        const sharePath = buildSharePath('/pages/share/share', { code: res.shortCode })
        this.setData({ shortCode: res.shortCode, path: sharePath }, () => this._refreshQr())
      })
      .catch(() => { this._refreshQr() })
  },

  _resolveCode(code) {
    return request.get('/api/v1/mp/invite/scene/' + encodeURIComponent(code), {}, { auth: false, showError: false })
      .then((res) => {
        if (!res) return
        const inviterId = res.inviterId
        if (inviterId != null && inviterId !== '') {
          try {
            const app = getApp()
            const value = Number(inviterId) || inviterId
            if (app && app.globalData) app.globalData.inviterId = value
            const { StorageUtil } = require('../../utils/storage')
            StorageUtil.set('inviterId', value)
          } catch (e) { /* ignore */ }
        }
        const targetId = String(res.targetId || '').trim()
        const nextPath = targetId
          ? (targetId.indexOf('/') === 0 ? targetId : '/' + targetId)
          : this.data.path
        this.setData({
          shortCode: res.shortCode || code,
          path: nextPath,
          tip: inviterId
            ? '已记录邀请人，登录后自动绑定；也可继续转发'
            : this.data.tip,
        }, () => this._refreshQr())
      })
      .catch(() => { this._refreshQr() })
  },

  onShareAppMessage() {
    return {
      title: this.data.title || '暖阁｜分享给好友',
      path: this.data.path || '/pages/index/index',
      imageUrl: this.data.cover,
    }
  },

  onMakePoster() {
    this.setData({ showPoster: true, posterStyle: 'cover' }, () => this._refreshQr())
  },

  onClosePoster() {
    this.setData({ showPoster: false })
  },

  onSwitchStyle(e) {
    const style = e.currentTarget.dataset.style
    if (!style) return
    this.setData({ posterStyle: style })
  },

  onTimelineHint() {
    this.setData({ showPoster: true }, () => this._refreshQr())
    wx.showToast({ title: '生成海报后保存，发到朋友圈', icon: 'none' })
  },

  onSendToGroup() {
    // redirectTo 替换分享页，一次到位；避免 navigateTo 叠栈后再二次跳转的观感
    const url = '/pages/join/join'
    wx.redirectTo({
      url,
      fail: () => wx.navigateTo({ url }),
    })
  },

  onCopyTitle() {
    wx.setClipboardData({
      data: this.data.title || '',
      success: () => wx.showToast({ title: '已复制标题', icon: 'success' }),
    })
  },

  onCopyPath() {
    const text = this.data.shortCode
      ? `邀请码 ${this.data.shortCode}｜${this.data.path}`
      : (this.data.path || '/pages/index/index')
    wx.setClipboardData({
      data: text,
      success: () => wx.showToast({ title: '已复制', icon: 'success' }),
    })
  },

  onFav() {
    const id = String(this.data.contentId || '').trim()
    const favorited = !this.data.favorited
    if (id) {
      try {
        const ids = readFavoriteIds()
        if (favorited && !ids.includes(id)) ids.push(id)
        else if (!favorited) {
          const idx = ids.indexOf(id)
          if (idx >= 0) ids.splice(idx, 1)
        }
        writeFavoriteIds(ids)
      } catch (e) { /* ignore */ }
      if (AuthUtil.isLoggedIn() && id.indexOf('warm-demo') !== 0 && id !== 'demo') {
        request.post(`/api/v1/mp/contents/${id}/favorite`, {}, { showError: false }).catch(() => {})
      }
    }
    this.setData({ favorited })
    wx.showToast({ title: favorited ? '已收藏' : '已取消收藏', icon: 'success' })
  },

  onFontSize() {
    wx.showActionSheet({
      itemList: ['小', '标准', '大', '特大'],
      success: (res) => {
        const labels = ['小', '标准', '大', '特大']
        const label = labels[res.tapIndex] || '标准'
        try { StorageUtil.set('reader_font_size', label) } catch (e) { /* ignore */ }
        this.setData({ fontSizeLabel: label })
        wx.showToast({ title: '字号：' + label, icon: 'none' })
      },
    })
  },

  onReport() { wx.showToast({ title: '已收到反馈', icon: 'none' }) },
  onCancel() {
    if (this.data.showPoster) {
      this.setData({ showPoster: false })
      return
    }
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) })
  },

  onSavePoster() {
    if (this.data.saving) return
    this.setData({ saving: true })
    wx.showLoading({ title: '生成中', mask: true })
    this._drawPoster()
      .then((filePath) => this._saveToAlbum(filePath))
      .then(() => {
        wx.hideLoading()
        this.setData({ saving: false })
        wx.showToast({ title: '已保存到相册', icon: 'success' })
      })
      .catch((err) => {
        wx.hideLoading()
        this.setData({ saving: false })
        const msg = (err && err.message) || (err && err.errMsg) || '保存失败'
        wx.showToast({ title: String(msg).slice(0, 36), icon: 'none' })
      })
  },

  _saveToAlbum(filePath) {
    return new Promise((resolve, reject) => {
      const doSave = () => {
        wx.saveImageToPhotosAlbum({
          filePath,
          success: resolve,
          fail: (err) => {
            const raw = String((err && err.errMsg) || '')
            if (raw.indexOf('auth deny') >= 0 || raw.indexOf('authorize') >= 0 || raw.indexOf('privacy') >= 0) {
              wx.showModal({
                title: '需要相册权限',
                content: '请在设置中允许保存到相册后重试',
                confirmText: '去设置',
                success: (res) => { if (res.confirm) wx.openSetting({}) },
              })
              reject(new Error('未授权相册权限'))
              return
            }
            reject(new Error(raw || '保存到相册失败'))
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
                  success: (res) => { if (res.confirm) wx.openSetting({}) },
                })
                reject(new Error('未授权相册权限'))
              },
            })
            return
          }
          doSave()
        },
        fail: () => doSave(),
      })
    })
  },

  _drawPoster() {
    const W = 375
    const H = this.data.posterStyle === 'cover' ? 560 : 480
    this.setData({ canvasW: W, canvasH: H })
    return new Promise((resolve, reject) => {
      const query = wx.createSelectorQuery()
      query.select('#posterCanvas').fields({ node: true, size: true }).exec(async (res) => {
        try {
          const canvas = res && res[0] && res[0].node
          if (!canvas) {
            // fallback: download cover image and save
            const path = await this._downloadFallback()
            resolve(path)
            return
          }
          const ctx = canvas.getContext('2d')
          const dpr = (wx.getWindowInfo && wx.getWindowInfo().pixelRatio) || 2
          canvas.width = W * dpr
          canvas.height = H * dpr
          ctx.scale(dpr, dpr)

          ctx.fillStyle = '#fffaf3'
          ctx.fillRect(0, 0, W, H)

          const style = this.data.posterStyle
          const title = this.data.title
          const quote = this.data.quote || this.data.title || '欢迎来到暖阁'
          const author = this.data.author || ''
          const code = this.data.shortCode || '暖阁'
          const qrUrl = this.data.qrImageUrl
          const avatarUrl = this.data.avatar
          const authorLine = author ? (author + ' · 暖阁') : '暖阁'

          const drawQrBox = async (x, y, size) => {
            ctx.fillStyle = '#fff'
            ctx.fillRect(x, y, size, size)
            if (qrUrl) {
              try {
                const qrImg = await loadImage(canvas, qrUrl)
                ctx.drawImage(qrImg, x, y, size, size)
                return
              } catch (e) { /* fallback below */ }
            }
            ctx.strokeStyle = '#ecd6ba'
            ctx.strokeRect(x, y, size, size)
            ctx.fillStyle = '#a79383'
            ctx.font = '10px sans-serif'
            ctx.fillText(String(code).slice(0, 8), x + 8, y + size / 2)
          }

          if (style === 'cover') {
            try {
              const img = await loadImage(canvas, this.data.cover)
              ctx.drawImage(img, 0, 0, W, 220)
            } catch (e) {
              ctx.fillStyle = '#5c3418'
              ctx.fillRect(0, 0, W, 220)
            }
            const grd = ctx.createLinearGradient(0, 80, 0, 220)
            grd.addColorStop(0, 'rgba(50,22,6,0.15)')
            grd.addColorStop(1, 'rgba(50,22,6,0.75)')
            ctx.fillStyle = grd
            ctx.fillRect(0, 0, W, 220)

            ctx.fillStyle = 'rgba(255,255,255,0.85)'
            ctx.font = '11px sans-serif'
            ctx.fillText('暖阁', 18, 168)
            ctx.fillStyle = '#fff'
            ctx.font = 'bold 18px sans-serif'
            wrapText(ctx, title, 18, 192, W - 36, 24, 2)

            ctx.fillStyle = '#4a3526'
            ctx.font = '14px serif'
            wrapText(ctx, '「' + quote + '」', 18, 250, W - 36, 22, 4)

            ctx.strokeStyle = '#e8d5bd'
            ctx.setLineDash([4, 4])
            ctx.beginPath()
            ctx.moveTo(18, H - 110)
            ctx.lineTo(W - 18, H - 110)
            ctx.stroke()
            ctx.setLineDash([])

            if (avatarUrl) {
              try {
                const av = await loadImage(canvas, avatarUrl)
                ctx.save()
                ctx.beginPath()
                ctx.arc(34, H - 62, 16, 0, Math.PI * 2)
                ctx.closePath()
                ctx.clip()
                ctx.drawImage(av, 18, H - 78, 32, 32)
                ctx.restore()
              } catch (e) { /* ignore avatar */ }
            }

            ctx.fillStyle = '#3a2a1c'
            ctx.font = 'bold 13px sans-serif'
            ctx.fillText(authorLine, 58, H - 70)
            ctx.fillStyle = '#a79383'
            ctx.font = '11px sans-serif'
            ctx.fillText(this.data.shareFrom, 58, H - 50)

            await drawQrBox(W - 86, H - 96, 68)

            ctx.fillStyle = '#a79383'
            ctx.font = '9px sans-serif'
            ctx.fillText('长按识别小程序码 · 阅读全文', W - 170, H - 18)
          } else if (style === 'quote') {
            ctx.fillStyle = '#b45309'
            ctx.font = 'bold 12px sans-serif'
            ctx.fillText('暖阁 · 金句', 24, 48)
            ctx.fillStyle = '#3a2a1c'
            ctx.font = 'bold 20px serif'
            wrapText(ctx, '「' + quote + '」', 24, 100, W - 48, 30, 5)
            ctx.fillStyle = '#a79383'
            ctx.font = '12px sans-serif'
            wrapText(ctx, '—— ' + title, 24, H - 140, W - 48, 18, 2)
            ctx.fillStyle = '#3a2a1c'
            ctx.font = 'bold 13px sans-serif'
            ctx.fillText(authorLine, 24, H - 60)
            ctx.fillStyle = '#a79383'
            ctx.font = '11px sans-serif'
            ctx.fillText(this.data.shareFrom, 24, H - 40)
            await drawQrBox(W - 86, H - 96, 68)
          } else {
            ctx.fillStyle = '#b45309'
            ctx.font = 'bold 12px sans-serif'
            ctx.fillText('暖阁 · 深度阅读', 24, 48)
            ctx.fillStyle = '#3a2a1c'
            ctx.font = 'bold 20px serif'
            wrapText(ctx, title, 24, 90, W - 48, 28, 3)
            ctx.fillStyle = '#4a3526'
            ctx.font = '14px serif'
            wrapText(ctx, quote, 24, 200, W - 48, 22, 4)
            ctx.fillStyle = '#3a2a1c'
            ctx.font = 'bold 13px sans-serif'
            ctx.fillText(authorLine, 24, H - 60)
            ctx.fillStyle = '#a79383'
            ctx.font = '11px sans-serif'
            ctx.fillText('邀请码 ' + code, 24, H - 40)
            await drawQrBox(W - 86, H - 96, 68)
          }

          wx.canvasToTempFilePath({
            canvas,
            success: (r) => resolve(r.tempFilePath),
            fail: (err) => reject(new Error((err && err.errMsg) || '导出海报失败')),
          })
        } catch (err) {
          reject(err instanceof Error ? err : new Error(String(err)))
        }
      })
    })
  },

  _downloadFallback() {
    return new Promise((resolve, reject) => {
      const url = this.data.cover
      if (!url) {
        reject(new Error('无可用海报图'))
        return
      }
      wx.downloadFile({
        url,
        success: (res) => {
          if (res.statusCode === 200 && res.tempFilePath) resolve(res.tempFilePath)
          else reject(new Error('下载海报图失败'))
        },
        fail: () => reject(new Error('下载海报图失败')),
      })
    })
  },
})
