const { get, BASE_URL } = require('../../utils/request')
const { AuthUtil } = require('../../utils/auth')
const { createSharePageConfig } = require('../../utils/share')
const { picsum } = require('../../data/warm-demo')
const { USE_LOCAL_SOURCE, FORCE_LOCAL_DEMO, WARM_PAGE_STYLE } = require('../../data/warm-source')

/** 仅 FORCE_LOCAL_DEMO 可用的本地纸张 mock */
const WARM_PAPERS = [
  {
    pageLabel: '1 / 12',
    title: '《认知盈余》9 月共读 · 领读提纲',
    sub: '暖阁星球 · 演示 · 本地预览',
    sections: [
      {
        h2: '一、为什么今年要读这本书',
        li: '1. 自由时间正在被重新定价\n2. 「业余者」如何形成生产力\n3. 对内容创作者的三个直接启发',
        lines: [100, 96, 88, 99, 72],
      },
      {
        h2: '二、四周阅读计划',
        lines: [100, 93, 80],
      },
    ],
  },
  {
    pageLabel: '2 / 12',
    title: '',
    sub: '',
    sections: [
      {
        first: true,
        h2: '三、每周讨论题',
        li: 'W1｜你每天有多少「认知盈余」被平台吃掉了？',
        lines: [100, 90, 97, 64, 100, 86],
      },
    ],
  },
]

const STUB_PREVIEW_RE = /无法内嵌|暂无法生成文本预览/

function buildDownloadHeader() {
  const header = {}
  try {
    const token = AuthUtil.getToken && AuthUtil.getToken()
    if (token) header.Authorization = 'Bearer ' + token
  } catch (e) { /* ignore */ }
  return header
}

function canOpenDocument(fileType, name) {
  const blob = `${fileType || ''} ${name || ''}`.toLowerCase()
  return /\.(pdf|doc|docx|xls|xlsx|ppt|pptx)(\?|$)/.test(blob)
    || /(pdf|doc|docx|xls|xlsx|ppt|pptx)/.test(blob)
}

function isStubPreview(text) {
  const t = String(text || '').trim()
  return !t || STUB_PREVIEW_RE.test(t)
}

function formatSize(bytes) {
  const n = Number(bytes)
  if (!n || n <= 0) return ''
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  if (n >= 1024) return `${Math.round(n / 1024)} KB`
  return `${n} B`
}

function resolvePageCount(data) {
  const n = Number(data && (data.pageCount != null ? data.pageCount : data.pages))
  return n > 0 ? n : 0
}

function buildSummary(data) {
  const parts = []
  const size = formatSize(data && data.size)
  if (size) parts.push(size)
  const pages = resolvePageCount(data)
  if (pages) parts.push(`${pages} 页`)
  if (!parts.length && data && data.summary) return String(data.summary)
  return parts.join(' · ')
}

function applyDemo(page, locked) {
  page.setData({
    themePageStyle: WARM_PAGE_STYLE,
    loading: false,
    loadError: false,
    loadProgress: 100,
    name: '9月共读·领读提纲.pdf',
    summary: '2.4 MB · 12 页 · 本地演示',
    fileType: 'PDF',
    locked: !!locked,
    lockedReason: locked
      ? '加入会员后可解锁该资料（本地演示）'
      : '',
    canDownload: !locked,
    canPreview: true,
    canRead: !locked,
    previewText: '',
    papers: locked ? [] : WARM_PAPERS,
    paperTitle: '《认知盈余》9 月共读 · 领读提纲',
    paperSub: '暖阁星球 · 演示 · 本地预览',
    pageLabel: '1 / 12',
    endText: locked ? '未解锁状态' : '共 12 页 · 上滑继续',
    sourceAvatar: picsum('u3', 40, 40),
    sourceText: '来自演示动态《9 月共读》',
    primaryCta: locked ? '解锁后查看' : '返回',
    statusText: locked ? '已锁定' : '你已解锁',
  })
}

Page({
  ...createSharePageConfig(),
  data: {
    themePageStyle: WARM_PAGE_STYLE,
    id: '',
    loading: true,
    loadError: false,
    loadProgress: 0,
    name: '',
    summary: '',
    fileType: 'PDF',
    locked: false,
    lockedReason: '',
    canDownload: false,
    canPreview: false,
    canRead: false,
    previewText: '',
    papers: [],
    statusText: '',
    paperTitle: '',
    paperSub: '',
    pageLabel: '',
    endText: '',
    sourceAvatar: '',
    sourceText: '',
    sourceContentId: '',
    primaryCta: '返回',
    previewUrl: '',
  },

  onLoad(options) {
    this.setData({ themePageStyle: WARM_PAGE_STYLE })
    const wantDemo = !!(options && (options.demo === '1' || options.demo === true || options.demo === 'lock'))
    if ((USE_LOCAL_SOURCE || FORCE_LOCAL_DEMO) && wantDemo) {
      applyDemo(this, options && options.demo === 'lock')
      return
    }
    if (wantDemo && !(USE_LOCAL_SOURCE || FORCE_LOCAL_DEMO)) {
      // 生产禁止 demo 伪文件
      this.setData({
        loading: false,
        loadError: true,
        name: '文件不存在',
        statusText: '文件不存在',
        locked: true,
        lockedReason: '请从资料库打开真实文件',
        primaryCta: '返回',
      })
      wx.showToast({ title: '文件不存在', icon: 'none' })
      return
    }
    const id = options && options.id
    const forceLock = !!(options && (options.lock === '1'))
    if (!id) {
      this.setData({
        loading: false,
        loadError: true,
        name: (options && options.name) ? decodeURIComponent(options.name) : '',
        statusText: '文件不存在',
        locked: true,
        lockedReason: '缺少文件编号',
      })
      wx.showToast({ title: '文件不存在', icon: 'none' })
      return
    }
    this.setData({ id: String(id) })
    this._forceLock = forceLock
    this._load(String(id))
  },

  onShareAppMessage() {
    return {
      title: this.data.name || '文件预览',
      path: this.data.id
        ? `/pages/file-preview/file-preview?id=${this.data.id}`
        : '/pages/resources/resources',
    }
  },

  onRetry() {
    if (this.data.id) this._load(this.data.id)
  },

  _load(id) {
    this.setData({
      loading: true,
      loadError: false,
      loadProgress: 12,
      statusText: '读取文件信息…',
      previewText: '',
      papers: [],
    })
    const tick = setInterval(() => {
      const p = Math.min(90, Number(this.data.loadProgress || 0) + 8)
      if (this.data.loading) this.setData({ loadProgress: p })
      else clearInterval(tick)
    }, 180)
    get(`/api/v1/mp/files/${id}`, {}, { auth: true, showError: false })
      .then((data) => {
        clearInterval(tick)
        if (!data) {
          this.setData({
            loading: false,
            loadError: true,
            loadProgress: 0,
            name: '资料暂不可用',
            summary: '',
            locked: true,
            lockedReason: '暂时无法打开该资料',
            statusText: '加载失败',
            papers: [],
            previewText: '',
            primaryCta: '重试',
            endText: '',
          })
          return
        }
        const canDownload = !!(data && data.canDownload)
        const canPreview = !!(data && data.canPreview)
        const canRead = !!(data && data.canRead)
        const name = (data && data.name) || '文件预览'
        const locked = !!this._forceLock || !(canDownload || canRead || canPreview)
        const rawPreview = (data && data.previewText) || ''
        const stub = isStubPreview(rawPreview)
        const pageCount = resolvePageCount(data)
        const fullyOpen = canDownload || canRead
        const previewText = (!locked && !stub) ? rawPreview : ''
        this.setData({
          loading: false,
          loadError: false,
          loadProgress: 100,
          name,
          summary: buildSummary(data),
          fileType: String((data && data.fileType) || 'PDF').toUpperCase().slice(0, 5),
          locked,
          lockedReason: (data && data.lockedReason) || (locked ? '当前账号暂无阅读权限' : ''),
          canDownload,
          canPreview,
          canRead,
          previewText,
          papers: [],
          paperTitle: name,
          paperSub: '',
          pageLabel: pageCount ? `1 / ${pageCount}` : '',
          endText: locked
            ? '未解锁状态'
            : (pageCount ? `共 ${pageCount} 页` : (previewText ? '' : '暂无页数信息')),
          sourceContentId: (data && (data.sourceContentId || data.contentId)) || '',
          sourceText: (data && data.sourceText) || '',
          sourceAvatar: (data && data.sourceAvatar) || '',
          primaryCta: locked ? '解锁后查看' : (fullyOpen || canPreview ? '打开文件' : '返回'),
          statusText: locked ? '未解锁' : (fullyOpen ? '你已解锁' : (canPreview ? '可试读' : '')),
          previewUrl: (data && data.previewUrl) || '',
        })
        if (locked) return
        if (!stub) return
        if (canPreview && !previewText) {
          this._loadPreviewText(id)
        }
      })
      .catch(() => {
        clearInterval(tick)
        this.setData({
          loading: false,
          loadError: true,
          loadProgress: 0,
          name: '资料暂不可用',
          summary: '请稍后重试',
          locked: true,
          lockedReason: '暂时无法打开该资料',
          statusText: '加载失败',
          papers: [],
          previewText: '',
          primaryCta: '重试',
          endText: '',
        })
      })
  },

  _loadPreviewText(id) {
    get(`/api/v1/mp/files/${id}/preview`, {}, { auth: true, showError: false })
      .then((vo) => {
        const text = (vo && vo.previewText) || ''
        if (isStubPreview(text)) {
          this.setData({ previewText: '', papers: [], statusText: this.data.statusText || '暂无预览' })
          return
        }
        this.setData({
          previewText: text,
          papers: [],
          canPreview: true,
          statusText: '试读预览',
        })
      })
      .catch(() => { /* ignore */ })
  },

  _openDocument(id, meta) {
    this.setData({ statusText: '正在下载预览…' })
    const previewOnly = meta && meta.previewOnly
    const previewPath = meta && meta.previewUrl
    const url = previewOnly && previewPath
      ? `${BASE_URL}${previewPath.startsWith('/') ? '' : '/'}${previewPath}`
      : `${BASE_URL}/api/v1/mp/files/${id}/download`
    wx.downloadFile({
      url,
      header: buildDownloadHeader(),
      success: (res) => {
        if (res.statusCode === 401 || res.statusCode === 403) {
          this.setData({
            locked: true,
            lockedReason: '开通会员后可下载该资料',
            statusText: '已锁定',
            primaryCta: '解锁后查看',
          })
          return
        }
        if (res.statusCode !== 200 || !res.tempFilePath) {
          wx.showToast({ title: '下载失败', icon: 'none' })
          this.setData({ statusText: this.data.locked ? '未解锁' : '下载失败' })
          return
        }
        if (canOpenDocument(meta && meta.fileType, meta && meta.name)) {
          wx.openDocument({
            filePath: res.tempFilePath,
            showMenu: true,
            fail: () => wx.showToast({ title: '无法预览该文件', icon: 'none' }),
          })
        } else {
          wx.showToast({ title: '已下载', icon: 'none' })
        }
        this.setData({ statusText: this.data.locked ? '未解锁' : (this.data.canDownload || this.data.canRead ? '你已解锁' : '可试读') })
      },
      fail: () => {
        wx.showToast({ title: '下载失败', icon: 'none' })
        this.setData({ statusText: '下载失败' })
      },
    })
  },

  onFavorite() {
    if (this.data.locked) {
      wx.showToast({ title: '解锁后可收藏', icon: 'none' })
      return
    }
    if (!this.data.id) {
      wx.showToast({ title: '无法收藏', icon: 'none' })
      return
    }
    if (!AuthUtil.requireLoginForAction('收藏资料')) return
    wx.showToast({ title: '收藏功能即将开放', icon: 'none' })
  },

  onGoSource() {
    const sid = this.data.sourceContentId
    if (sid) {
      wx.navigateTo({ url: `/pages/moment-detail/moment-detail?id=${sid}` })
      return
    }
    wx.navigateBack({
      fail: () => wx.switchTab({ url: '/pages/planet/planet' }),
    })
  },

  onUnlockCta() {
    if (!AuthUtil.isLoggedIn()) {
      AuthUtil.requireLoginForAction('开通会员', { silent: true })
      return
    }
    wx.navigateTo({
      url: '/pkg-user/member-center/member-center',
      fail: () => {
        wx.navigateTo({
          url: '/pages/member-center/member-center',
          fail: () => wx.showToast({ title: '暂时打不开会员中心', icon: 'none' }),
        })
      },
    })
  },

  onPrimaryCta() {
    if (this.data.loadError && this.data.id) {
      this.onRetry()
      return
    }
    if (this.data.locked) {
      this.onUnlockCta()
      return
    }
    this.onOpenAnyway()
  },

  onOpenAnyway() {
    if (!this.data.id) {
      this.onGoSource()
      return
    }
    const canFull = this.data.canDownload || this.data.canRead
    const canTrial = this.data.canPreview && this.data.previewUrl
    if (!canFull && !canTrial) {
      if (this.data.canPreview && this.data.previewText) {
        wx.showToast({ title: '当前为试读文本', icon: 'none' })
        return
      }
      wx.showToast({ title: '暂无可用文件', icon: 'none' })
      return
    }
    this._openDocument(this.data.id, {
      name: this.data.name,
      fileType: this.data.fileType,
      previewOnly: !canFull && canTrial,
      previewUrl: this.data.previewUrl,
    })
  },
})
