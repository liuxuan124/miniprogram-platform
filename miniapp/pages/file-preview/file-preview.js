const { get, BASE_URL } = require('../../utils/request')
const { AuthUtil } = require('../../utils/auth')
const { createSharePageConfig } = require('../../utils/share')
const { picsum } = require('../../data/warm-demo')
const { USE_LOCAL_SOURCE, FORCE_LOCAL_DEMO } = require('../../data/warm-source')

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

/**
 * 判断 downloadFile 的响应是否是「后端返回的 JSON 错误体」而非文件。
 * 依据：Content-Type 为 application/json，或文件极小（错误体通常几十字节）。
 */
function looksLikeJsonError(res) {
  if (!res) return false
  if (res.statusCode !== 200) return false
  const ct = String((res.header && (res.header['Content-Type'] || res.header['content-type'])) || '').toLowerCase()
  if (ct.indexOf('application/json') !== -1) return true
  // 没有 Content-Type 时用体积兜底：正常 PDF 至少几 KB，错误体一般 < 1KB
  if (typeof res.totalBytesExpectedToWrite === 'number' && res.totalBytesExpectedToWrite > 0) {
    return res.totalBytesExpectedToWrite < 1024
  }
  return false
}

/**
 * 尝试从 downloadFile 响应里读出后端给的错误文案。
 * 微信把响应体写进了 tempFilePath，需用 FileSystemManager 异步读；
 * 这里只做尽力而为的同步判断，读不到就返回空，由调用方兜底文案。
 */
function readJsonErrorMessage(res) {
  try {
    const buf = wx.getFileSystemManager().readFileSync(res.tempFilePath, 'utf8')
    const obj = JSON.parse(buf)
    return obj && obj.message ? String(obj.message) : ''
  } catch (e) {
    return ''
  }
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
    hasTrial: false,
    previewPages: 0,
    pageCount: 0,
    trialRatio: 0,
    previewPagesData: [],
    loadedPages: 0,
    loadingPapers: false,
    // 位图预览（PDF 原页 1:1 渲染，swiper 左右翻页）
    imgPages: [],
    imgIndex: 0,
    imgTotal: 0,
    imgLoading: false,
  },

  onLoad(options) {
    
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
        ? `/pkg-content/file-preview/file-preview?id=${this.data.id}`
        : '/pkg-content/resources/resources',
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
        // 有试读裁切流（PDF/DOCX）就不算「完全锁死」——允许先看前几页
        const previewUrl = (data && data.previewUrl) || ''
        const hasTrial = canPreview && !!previewUrl
        const locked = !!this._forceLock || !(canDownload || canRead || hasTrial)
        const rawPreview = (data && data.previewText) || ''
        const stub = isStubPreview(rawPreview)
        const pageCount = resolvePageCount(data)
        const keepPages = Number(data && data.previewPages) || 0
        const fullyOpen = canDownload || canRead
        const previewText = (!locked && !stub) ? rawPreview : ''
        // 试读页数文案：优先后端给的 previewPages，其次按百分比估算
        const trialLabel = keepPages > 0
          ? `试读前 ${keepPages} 页`
          : (pageCount && data && Number(data.previewPercent) > 0
            ? `试读前 ${Math.max(1, Math.ceil(pageCount * Number(data.previewPercent) / 100))} 页`
            : '试读')
        // 试读占比进度条（percent 模式才有意义，其余给 0）
        const trialRatio = (() => {
          const mode = String((data && data.previewMode) || '')
          if (mode === 'percent') {
            const pct = Number(data && (data.previewValue != null ? data.previewValue : data.previewPercent))
            if (pct > 0) return Math.min(100, Math.max(0, Math.round(pct)))
          }
          if (pageCount && keepPages > 0 && keepPages < pageCount) {
            return Math.min(100, Math.round((keepPages / pageCount) * 100))
          }
          return 0
        })()
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
            ? (hasTrial ? `可试读前 ${keepPages || ''} 页` : '未解锁状态')
            : (pageCount ? `共 ${pageCount} 页` : (previewText ? '' : '暂无页数信息')),
          sourceContentId: (data && (data.sourceContentId || data.contentId)) || '',
          sourceText: (data && data.sourceText) || '',
          sourceAvatar: (data && data.sourceAvatar) || '',
          // 未开通且只能试读时，按钮不能叫「打开文件」——那会让人以为是全文
          primaryCta: locked
            ? (hasTrial ? trialLabel : '解锁后查看')
            : (fullyOpen ? '打开文件' : (hasTrial ? trialLabel : '返回')),
          statusText: locked
            ? (hasTrial ? `可试读 ${keepPages || ''} 页` : '未解锁')
            : (fullyOpen ? '你已解锁' : (canPreview ? '可试读' : '')),
          previewUrl,
          hasTrial,
          trialRatio,
          previewPages: keepPages,
          pageCount,
        })
        if (locked) return
        // 位图预览优先：PDF 用原页 1:1 渲染，视觉 100% 保真（文字版只留文本层级，图表/配色全丢）
        if (this._loadPreviewImages(id, fullyOpen)) return
        if (!stub) return
        if (canPreview && !previewText) {
          this._loadPreviewText(id)
        }
        // 纸张内嵌渲染：始终拉结构化试读页（PDF 走这条）
        if (hasTrial) {
          this._loadPreviewPages(id)
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

  /**
   * 拉取位图页（PDF 原页 1:1 渲染），swiper 左右翻页。
   * 这是**保真方案**：配色、图表、表格、字体全部原样保留。
   * 文字版（preview-text）只保留 h1/h2/p 文本层级，作为非 PDF 或渲染失败时的兜底。
   *
   * @returns {boolean} 是否已接管渲染（true 表示已发起位图加载，调用方不要再走文字版）
   */
  _loadPreviewImages(id, fullyOpen) {
    if (!this.data.canPreview && !fullyOpen) return false
    this.setData({ imgLoading: true })
    get(`/api/v1/mp/files/${id}/preview-images`, {}, { auth: true, showError: false })
      .then((rows) => {
        const pages = (Array.isArray(rows) ? rows : []).map((r) => ({
          no: r.pageNo,
          label: r.pageLabel,
          // 后端返回 /uploads/... 相对路径，补全成绝对地址
          url: String(r.imageUrl || '').startsWith('http')
            ? r.imageUrl
            : `${BASE_URL}${r.imageUrl}`,
          w: r.width,
          h: r.height,
        }))
        if (!pages.length) {
          // 非 PDF 或后端未渲染 → 交回文字版
          this.setData({ imgLoading: false })
          if (this.data.canPreview) this._loadPreviewPages(id)
          return
        }
        const total = pages[0].no ? (pages[pages.length - 1].no < 999 ? pages[pages.length - 1].no : pages.length) : pages.length
        this.setData({
          imgLoading: false,
          imgPages: pages,
          imgIndex: 0,
          imgTotal: total,
          // 位图模式下用后端给的真实页数与试读页数
          pageCount: total,
          pageLabel: pages[0].label || `1 / ${total}`,
          previewPages: pages.length,
        })
      })
      .catch(() => {
        this.setData({ imgLoading: false })
        if (this.data.canPreview) this._loadPreviewPages(id)
      })
    return true
  },

  onImgSwiper(e) {
    const idx = Number(e && e.detail && e.detail.current) || 0
    const pages = this.data.imgPages || []
    const cur = pages[idx]
    this.setData({
      imgIndex: idx,
      pageLabel: (cur && cur.label) || `${idx + 1} / ${pages.length}`,
    })
  },

  /**
   * 拉取结构化试读页（每页 h1/h2/p 段落），在页面内渲染成「纸张」。
   * 小程序无法内嵌 PDF 阅读器，所以由后端按字号拆层级，前端负责视觉还原。
   */
  _loadPreviewPages(id) {
    get(`/api/v1/mp/files/${id}/preview-text`, {}, { auth: true, showError: false })
      .then((pages) => {
        const list = Array.isArray(pages) ? pages : []
        if (!list.length) return
        this.setData({
          previewPagesData: list,
          // 后端给的就是「这次能看到几页」，用它校正页数文案
          loadedPages: list.length,
          loadingPapers: false,
        })
      })
      .catch(() => { /* 拉不到就退回 openDocument 兜底 */ })
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
          // 试读流被拒 ≠ 全文被拒：区分开，别把「试读也失败」说成「要开通」
          if (previewOnly) {
            this._failWithMessage('试读暂时打不开，请稍后重试')
            return
          }
          this.setData({
            locked: true,
            hasTrial: false,
            lockedReason: '开通会员后可下载该资料',
            statusText: '已锁定',
            primaryCta: '解锁后查看',
          })
          return
        }
        // 后端出错时可能返回 JSON 错误体（Content-Type: application/json），
        // 例如文件实体缺失时 resolveFilePath 抛 404001。这类响应不是文件，
        // 必须拦在 openDocument 之前，否则用户只会看到无意义的「下载失败」。
        if (looksLikeJsonError(res)) {
          this._failWithMessage(readJsonErrorMessage(res) || '文件暂时无法打开，请稍后重试')
          return
        }
        if (res.statusCode !== 200 || !res.tempFilePath) {
          this._failWithMessage(this.data.locked ? '未解锁' : '下载失败，请稍后重试')
          return
        }
        if (canOpenDocument(meta && meta.fileType, meta && meta.name)) {
          wx.openDocument({
            filePath: res.tempFilePath,
            showMenu: true,
            fail: (e) => {
              const msg = (e && e.errMsg && /cancel/.test(e.errMsg)) ? '' : '无法预览该文件'
              if (msg) this._failWithMessage(msg)
            },
          })
          // 试读是裁切件，必须说清「只给了前几页」，否则用户以为这就是全文
          if (previewOnly) {
            const total = resolvePageCount(this.data)
            const keep = Number(this.data.previewPages) || 0
            wx.showToast({
              title: total && keep ? `试读 ${keep}/${total} 页` : '试读版（完整版需开通）',
              icon: 'none',
              duration: 2600,
            })
          }
        } else {
          wx.showToast({ title: '已下载', icon: 'none' })
        }
        this.setData({ statusText: this.data.locked ? '未解锁' : (this.data.canDownload || this.data.canRead ? '你已解锁' : '可试读') })
      },
      fail: () => {
        this._failWithMessage('下载失败，请检查网络后重试')
      },
    })
  },

  /** 统一的失败提示：toast + 状态行，避免各处文案不一致 */
  _failWithMessage(message) {
    wx.showToast({ title: message, icon: 'none', duration: 2200 })
    this.setData({ statusText: message })
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
      wx.navigateTo({ url: `/pkg-content/moment-detail/moment-detail?id=${sid}` })
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
    // 锁定态：有裁切试读流就先给看几页，别一上来就逼人开通
    if (this.data.locked) {
      if (this.data.hasTrial) {
        this.onOpenAnyway()
        return
      }
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
