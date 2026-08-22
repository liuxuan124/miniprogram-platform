const request = require('../../utils/request')
const { resolveMediaUrl } = require('../../utils/media-url')
const { createSharePageConfig } = require('../../utils/share')
const { AuthUtil } = require('../../utils/auth')
const { BASE_URL } = require('../../utils/request')

function stripHtml(html) {
  return String(html || '').replace(/<[^>]+>/g, '\n').replace(/\n+/g, '\n').trim()
}

function formatFileSize(size) {
  const n = Number(size) || 0
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function fileTypeIcon(fileType) {
  const map = { pdf: '📄', doc: '📝', xls: '📊', ppt: '📽️', zip: '🗂️', txt: '📃' }
  return map[fileType] || '📎'
}

function canOpenDocument(fileType, name) {
  const ext = String(name || '').split('.').pop()?.toLowerCase() || ''
  const openTypes = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt']
  return openTypes.indexOf(ext) >= 0 || ['pdf', 'doc', 'xls', 'ppt', 'txt'].indexOf(fileType) >= 0
}

function buildDownloadHeader() {
  const header = {}
  const token = AuthUtil.getToken()
  if (token) header.Authorization = 'Bearer ' + token
  return header
}

Page({
  ...createSharePageConfig(),
  data: {
    loading: true,
    moment: null,
    paragraphs: [],
    images: [],
    attachments: [],
    shareDesc: '',
  },

  onLoad(options) {
    this._momentId = options.id
    if (!this._momentId) {
      wx.showToast({ title: '参数错误', icon: 'none' })
      return
    }
    this._loadDetail(this._momentId)
  },

  onShareAppMessage() {
    const moment = this.data.moment || {}
    return {
      title: moment.title || '动态详情',
      path: `/pages/moment-detail/moment-detail?id=${this._momentId}`,
      imageUrl: this.data.images[0] || moment.cover_url || '',
    }
  },

  onShareTimeline() {
    const moment = this.data.moment || {}
    return {
      title: moment.title || '动态详情',
      query: `id=${this._momentId}`,
      imageUrl: this.data.images[0] || moment.cover_url || '',
    }
  },

  onPreviewImage(e) {
    const url = e.currentTarget.dataset.url
    if (!url) return
    wx.previewImage({ current: url, urls: this.data.images })
  },

  onOpenAttachment(e) {
    const index = Number(e.currentTarget.dataset.index)
    const item = this.data.attachments[index]
    if (!item) return

    if (item.fileId) {
      if (item.canPreview && item.previewText) {
        wx.showModal({
          title: item.name,
          content: item.previewText,
          showCancel: false,
          confirmText: item.canDownload ? '下载完整版' : '知道了',
          success: (res) => {
            if (res.confirm && item.canDownload) this._downloadFileItem(item)
          },
        })
        return
      }
      if (!item.canDownload) {
        this._showLocked(item)
        return
      }
      this._downloadFileItem(item)
      return
    }

    if (!item.url) {
      wx.showToast({ title: '文件不可用', icon: 'none' })
      return
    }
    this._downloadLegacy(item)
  },

  _showLocked(item) {
    const needLogin = !AuthUtil.isLoggedIn()
    wx.showModal({
      title: item.qualityTier === 'premium' ? '精品资料' : '资料已锁定',
      content: item.lockedReason || '升级会员后可下载',
      confirmText: needLogin ? '去登录' : '会员中心',
      success(res) {
        if (!res.confirm) return
        if (needLogin) {
          wx.navigateTo({ url: '/pages/login/login' })
        } else {
          wx.switchTab({ url: '/pages/mine/mine' })
        }
      },
    })
  },

  _downloadFileItem(item) {
    wx.showLoading({ title: '下载中...', mask: true })
    wx.downloadFile({
      url: `${BASE_URL}/api/v1/mp/files/${item.fileId}/download`,
      header: buildDownloadHeader(),
      success: (res) => this._openDownloadedFile(res, item),
      fail: () => wx.showToast({ title: '下载失败', icon: 'none' }),
      complete: () => wx.hideLoading(),
    })
  },

  _downloadLegacy(item) {
    wx.showLoading({ title: '下载中...', mask: true })
    wx.downloadFile({
      url: item.url,
      success: (res) => this._openDownloadedFile(res, item),
      fail: () => wx.showToast({ title: '下载失败', icon: 'none' }),
      complete: () => wx.hideLoading(),
    })
  },

  _openDownloadedFile(res, item) {
    if (res.statusCode === 403 || res.statusCode === 401) {
      this._showLocked(item)
      return
    }
    if (canOpenDocument(item.fileType, item.name)) {
      wx.openDocument({
        filePath: res.tempFilePath,
        showMenu: true,
        fail: () => wx.showToast({ title: '无法预览该文件', icon: 'none' }),
      })
    } else {
      wx.showToast({ title: '已下载到临时目录', icon: 'none' })
    }
  },

  _loadDetail(id) {
    this.setData({ loading: true })
    request.get(`/api/v1/mp/contents/${id}`, {}, { auth: false })
      .then((data) => {
        const cover = resolveMediaUrl(data.coverImage || data.cover_image || '')
        const images = (Array.isArray(data.images) ? data.images : [])
          .map((url) => resolveMediaUrl(url))
          .filter(Boolean)
        if (cover && images.indexOf(cover) < 0) images.unshift(cover)
        const attachments = (Array.isArray(data.attachments) ? data.attachments : []).map((raw, idx) => ({
          id: raw.id || String(idx),
          fileId: raw.fileId || raw.file_id || null,
          name: raw.name || '未命名文件',
          url: resolveMediaUrl(raw.url || ''),
          size: Number(raw.size || 0),
          sizeText: formatFileSize(raw.size),
          fileType: raw.fileType || 'other',
          icon: fileTypeIcon(raw.fileType || 'other'),
          canRead: raw.canRead !== false,
          canDownload: raw.canDownload !== false,
          canPreview: !!raw.canPreview,
          previewText: raw.previewText || '',
          lockedReason: raw.lockedReason || '',
          qualityTier: raw.qualityTier || '',
          locked: raw.fileId ? !raw.canDownload : false,
          actionText: raw.fileId && !raw.canDownload ? '锁定' : (raw.canPreview && !raw.canDownload ? '预览' : '下载'),
        }))
        const body = stripHtml(data.content || data.summary || '')
        const paragraphs = body.split('\n').map((line) => line.trim()).filter(Boolean)
        const imageCount = images.length
        const fileCount = attachments.length
        const shareDesc = [
          imageCount ? `${imageCount} 张图` : '',
          fileCount ? `${fileCount} 个文件` : '',
        ].filter(Boolean).join(' · ')
        this.setData({
          loading: false,
          moment: {
            id: data.id,
            title: data.title || '',
            author: data.author || '博主',
            author_avatar: resolveMediaUrl(data.authorAvatar || data.author_avatar || ''),
            author_initial: String(data.author || '博').slice(0, 1),
            time_text: String(data.publishedAt || data.updateTime || '').slice(0, 16).replace('T', ' '),
            cover_url: cover,
          },
          paragraphs,
          images,
          attachments,
          shareDesc,
        })
        if (data.title) {
          wx.setNavigationBarTitle({ title: data.title.slice(0, 12) })
        }
      })
      .catch(() => {
        this.setData({ loading: false })
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
  },
})
