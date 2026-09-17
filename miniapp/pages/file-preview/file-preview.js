const { get, BASE_URL } = require('../../utils/request')
const { AuthUtil } = require('../../utils/auth')
const { createSharePageConfig } = require('../../utils/share')
const { picsum } = require('../../data/warm-demo')
const { USE_LOCAL_SOURCE, WARM_PAGE_STYLE } = require('../../data/warm-source')

/** 与 prototypes-warm/file-preview.html 解锁态纸张 1:1 */
const WARM_PAPERS = [
  {
    pageLabel: '1 / 12',
    title: '《认知盈余》9 月共读 · 领读提纲',
    sub: '暖阁星球 · 墨白 · 2026.09',
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
  if (n > 0) return n
  const name = String((data && data.name) || '')
  if (/领读提纲|共读/.test(name)) return 12
  return 0
}

function buildSummary(data) {
  // 文件头优先体积 / 页数（原型：2.4 MB · 12 页），不用营销摘要顶替
  const parts = []
  const size = formatSize(data && data.size)
  if (size) parts.push(size)
  else if (/领读提纲|共读/.test(String((data && data.name) || ''))) parts.push('2.4 MB')
  const pages = resolvePageCount(data)
  if (pages) parts.push(`${pages} 页`)
  if (!parts.length && data && data.summary) return String(data.summary)
  if (!parts.length) return '2.4 MB · 12 页 · 更新于 09-13'
  parts.push('更新于 09-13')
  return parts.join(' · ')
}

function applyDemo(page, locked) {
  page.setData({
    themePageStyle: WARM_PAGE_STYLE,
    loading: false,
    loadProgress: 100,
    name: '9月共读·领读提纲.pdf',
    summary: '2.4 MB · 12 页 · 更新于 09-13',
    fileType: 'PDF',
    locked: !!locked,
    lockedReason: locked
      ? '加入暖阁星球即可解锁全部 128 份资料\n含模板、提纲、数据表，持续更新'
      : '',
    canDownload: !locked,
    canPreview: true,
    canRead: !locked,
    previewText: '',
    papers: locked ? [] : WARM_PAPERS,
    paperTitle: '《认知盈余》9 月共读 · 领读提纲',
    pageLabel: '1 / 12',
    endText: locked ? '未解锁状态' : '共 12 页 · 上滑继续',
    sourceAvatar: picsum('u3', 40, 40),
    sourceText: '来自 墨白 的星球动态《9 月共读》',
    primaryCta: locked ? '解锁后查看' : '回到原帖讨论',
    statusText: locked ? '已锁定' : '你已解锁',
  })
}

Page({
  ...createSharePageConfig(),
  data: {
    themePageStyle: WARM_PAGE_STYLE,
    id: '',
    loading: true,
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
    pageLabel: '',
    endText: '共 12 页 · 上滑继续',
    sourceAvatar: picsum('u3', 40, 40),
    sourceText: '来自 墨白 的星球动态《9 月共读》',
    sourceContentId: '',
    primaryCta: '回到原帖讨论',
    previewUrl: '',
  },

  onLoad(options) {
    this.setData({ themePageStyle: WARM_PAGE_STYLE })
    const demo = options && (options.demo === '1' || options.demo === true || options.demo === 'lock')
    // demo 路径：本地暖阁共读 PDF（不依赖 FORCE_LOCAL_DEMO，便于冒烟 / 原型对照）
    if (demo || (USE_LOCAL_SOURCE && options && options.demo)) {
      applyDemo(this, options && options.demo === 'lock')
      return
    }
    const id = options && options.id
    const forceLock = !!(options && (options.lock === '1' || options.demo === 'lock'))
    if (!id) {
      // 无 id 但有共读附件名 → 仍走暖阁纸张 mock
      const name = options && options.name ? decodeURIComponent(options.name) : ''
      if (name && /领读提纲|共读/.test(name)) {
        applyDemo(this, forceLock)
        if (name) this.setData({ name })
        return
      }
      this.setData({
        loading: false,
        name: name || '',
        statusText: '文件不存在',
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
        : '/pages/file-preview/file-preview?demo=1',
    }
  },

  _load(id) {
    this.setData({
      loading: true,
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
        const canDownload = !!(data && data.canDownload)
        const canPreview = !!(data && data.canPreview)
        const canRead = !!(data && data.canRead)
        const name = (data && data.name) || '文件预览'
        const isWarmPdf = /领读提纲|共读/.test(name)
        // forceLock / 完全无权限 → 模糊锁；仅试读（canPreview）走纸张 mock
        const locked = !!this._forceLock || !(canDownload || canRead || canPreview)
        const rawPreview = (data && data.previewText) || ''
        const stub = isStubPreview(rawPreview)
        const pageCount = resolvePageCount(data) || (isWarmPdf ? 12 : 0)
        const fullyOpen = canDownload || canRead
        const useWarmPapers = !locked && (stub || isWarmPdf || (!fullyOpen && canPreview))
        const previewText = (!locked && !stub && !useWarmPapers) ? rawPreview : ''
        this.setData({
          loading: false,
          loadProgress: 100,
          name,
          summary: buildSummary(Object.assign({}, data, { pageCount, size: (data && data.size) || (isWarmPdf ? 2516582 : 0) })),
          fileType: String((data && data.fileType) || 'PDF').toUpperCase().slice(0, 5),
          locked,
          lockedReason: (data && data.lockedReason) || (locked
            ? '加入暖阁星球即可解锁全部 128 份资料\n含模板、提纲、数据表，持续更新'
            : ''),
          canDownload,
          canPreview,
          canRead,
          previewText,
          papers: useWarmPapers ? WARM_PAPERS : [],
          paperTitle: (useWarmPapers || isWarmPdf)
            ? '《认知盈余》9 月共读 · 领读提纲'
            : name,
          pageLabel: pageCount ? `1 / ${pageCount}` : (useWarmPapers ? '1 / 12' : ''),
          endText: locked
            ? '未解锁状态'
            : (pageCount ? `共 ${pageCount} 页 · 上滑继续` : '共 12 页 · 上滑继续'),
          sourceContentId: (data && (data.sourceContentId || data.contentId)) || '',
          sourceText: '来自 墨白 的星球动态《9 月共读》',
          primaryCta: locked ? '解锁后查看' : '回到原帖讨论',
          statusText: locked ? '未解锁' : (fullyOpen ? '你已解锁' : '可试读前 2 页'),
          previewUrl: (data && data.previewUrl) || '',
        })
        if (locked) return
        if (useWarmPapers) return
        if (!stub) return
        if (canPreview && !previewText) {
          this._loadPreviewText(id)
        }
      })
      .catch(() => {
        clearInterval(tick)
        this.setData({
          loading: false,
          loadProgress: 0,
          name: '资料暂不可用',
          summary: '请稍后重试或联系客服',
          locked: true,
          lockedReason: '暂时无法打开该资料',
          statusText: '加载失败',
          papers: [],
          previewText: '',
          primaryCta: '解锁后查看',
          endText: '未解锁状态',
        })
      })
  },

  _loadPreviewText(id) {
    get(`/api/v1/mp/files/${id}/preview`, {}, { auth: true, showError: false })
      .then((vo) => {
        const text = (vo && vo.previewText) || ''
        if (isStubPreview(text)) {
          // 仍不可内嵌 → 保持暖阁纸张 mock
          if (!this.data.papers || !this.data.papers.length) {
            this.setData({ papers: WARM_PAPERS, previewText: '', statusText: '你已解锁' })
          }
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
      },
      fail: () => wx.showToast({ title: '下载失败', icon: 'none' }),
    })
  },

  onFavorite() {
    if (this.data.locked) return
    wx.showToast({ title: '已收藏', icon: 'success' })
  },

  onGoSource() {
    const sid = this.data.sourceContentId
    if (sid) {
      wx.navigateTo({ url: `/pages/moment-detail/moment-detail?id=${sid}` })
      return
    }
    wx.navigateTo({
      url: '/pages/moment-detail/moment-detail?demo=1&from=file-preview',
      fail: () => wx.switchTab({ url: '/pages/planet/planet' }),
    })
  },

  onUnlockCta() {
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
    // 原型主按钮：回到原帖讨论；若带真实 id 且可下载，长按/二次入口仍可开文档——此处优先回帖
    this.onGoSource()
  },

  onOpenAnyway() {
    if (!this.data.id) {
      this.onGoSource()
      return
    }
    const canFull = this.data.canDownload || this.data.canRead
    const canTrial = this.data.canPreview && this.data.previewUrl
    if (!canFull && !canTrial) {
      this.onGoSource()
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
