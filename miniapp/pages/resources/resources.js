const request = require('../../utils/request')
const { AuthUtil } = require('../../utils/auth')
const { createSharePageConfig } = require('../../utils/share')
const { DEMO_RESOURCES, DEMO_RESOURCES_MEMBER } = require('../../data/warm-demo')
const { USE_LOCAL_SOURCE, FORCE_LOCAL_DEMO, WARM_PAGE_STYLE } = require('../../data/warm-source')

function formatSize(bytes) {
  const n = Number(bytes) || 0
  if (n <= 0) return ''
  if (n < 1024) return n + ' B'
  if (n < 1024 * 1024) return (n / 1024).toFixed(n < 10240 ? 0 : 1).replace(/\.0$/, '') + ' KB'
  return (n / (1024 * 1024)).toFixed(1) + ' MB'
}

function extLabel(name, fileType) {
  const fromType = String(fileType || '').replace(/^\./, '').toUpperCase()
  if (fromType) return fromType.slice(0, 5)
  const m = String(name || '').match(/\.([a-z0-9]+)$/i)
  return m ? m[1].toUpperCase().slice(0, 5) : 'FILE'
}

function pageCountOf(item) {
  const n = Number(item && (item.pageCount != null ? item.pageCount : item.pages))
  return n > 0 ? n : 0
}

function normalizeFile(item) {
  const id = item.id != null ? item.id : item.fileId
  const rawName = item.name || item.title || '未命名资料'
  const name = String(rawName).replace(/\.pdf$/i, '')
  const canRead = item.canRead === true
  const canDownload = item.canDownload === true
  const canPreview = item.canPreview === true
  const fullyOpen = canRead || canDownload
  const locked = !(canRead || canDownload || canPreview) || !!item.locked
  const ext = extLabel(rawName, item.fileType || item.mimeType)
  const size = formatSize(item.size)
  const pages = pageCountOf(item)
  const views = item.viewCount || item.views
  const metaParts = []
  if (size) metaParts.push(size)
  if (pages) metaParts.push(pages + ' 页')
  if (fullyOpen) metaParts.push('已解锁')
  else if (views) metaParts.push(Number(views).toLocaleString('zh-CN') + ' 人看过')
  else if (item.minReadLevelName) metaParts.push(item.minReadLevelName)
  else if (!fullyOpen) metaParts.push(canPreview ? '可试读' : '会员专享')

  const previewPct = Number(item.previewPercent || item.previewValue || 20)
  const previewHint = item.previewMode === 'pages' || item.previewMode === 'page'
    ? `可看前 ${item.previewValue || 2} 页`
    : `可看前 2 页 / ${previewPct || 20}%`

  return {
    id,
    name,
    ext,
    meta: metaParts.join(' · ') || '',
    locked,
    canRead,
    canDownload,
    canPreview,
    actionText: locked ? '🔒 解锁' : (fullyOpen ? '预览 ›' : '试读 ›'),
    tryHint: locked ? '会员专享' : (fullyOpen ? '可转发保存' : previewHint),
  }
}

function cloneGroups(src) {
  return (src.groups || []).map((g) => ({
    title: g.title,
    items: (g.items || []).map((it) => Object.assign({}, it)),
  }))
}

function applyDemoResources(page, memberOk) {
  const loggedIn = AuthUtil.isLoggedIn()
  const ok = !!(memberOk && loggedIn)
  const pack = ok ? DEMO_RESOURCES_MEMBER : DEMO_RESOURCES
  page.setData({
    themePageStyle: WARM_PAGE_STYLE,
    cats: pack.cats,
    activeCat: pack.cats[0],
    groups: cloneGroups(pack),
    memberOk: ok,
    loading: false,
    loadError: false,
    isEmpty: false,
    footerText: pack.footerText || (ok ? '会员资料已解锁' : '登录后查看已解锁资料'),
    gateTitle: ok ? '年度会员已生效' : (loggedIn ? '你当前是普通用户' : '登录后查看解锁进度'),
    gateDesc: ok
      ? '会员资料已解锁 · 可转发保存'
      : '可免费查看部分资料，加入会员后全部解锁并可转发保存',
    gateCta: ok ? '去续费' : '去开通',
  })
}

Page({
  ...createSharePageConfig(),
  data: {
    themePageStyle: WARM_PAGE_STYLE,
    cats: [],
    activeCat: '',
    groups: [],
    memberOk: false,
    loading: false,
    loadError: false,
    isEmpty: false,
    footerText: '',
    gateTitle: '你当前是普通用户',
    gateDesc: '部分资料可试读，会员可解锁全部并转发保存',
    gateCta: '去开通',
  },

  onLoad(options) {
    this._forceMember = !!(options && (options.member === '1' || options.member === 'true'))
    if (USE_LOCAL_SOURCE || FORCE_LOCAL_DEMO) {
      applyDemoResources(this, this._forceMember)
      return
    }
    this._load()
  },

  onShow() {
    this.setData({ themePageStyle: WARM_PAGE_STYLE })
  },

  onPullDownRefresh() {
    if (USE_LOCAL_SOURCE || FORCE_LOCAL_DEMO) {
      applyDemoResources(this, this._forceMember)
      wx.stopPullDownRefresh()
      return
    }
    this._load().finally(() => wx.stopPullDownRefresh())
  },

  onCatTap(e) {
    this.setData({ activeCat: e.currentTarget.dataset.cat })
  },

  onGoMember() {
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

  onRetry() {
    this._load()
  },

  _load() {
    if (USE_LOCAL_SOURCE || FORCE_LOCAL_DEMO) {
      applyDemoResources(this, false)
      return Promise.resolve()
    }
    if (this.data.loading) return Promise.resolve()
    this.setData({ loading: true, loadError: false })
    const filesP = request.get('/api/v1/mp/files', {
      current: 1,
      size: 30,
      status: 'published',
    }, { auth: true, showError: false })
    const memberP = AuthUtil.isLoggedIn()
      ? request.get('/api/v1/mp/mine/overview', {}, { auth: true, showError: false }).catch(() => null)
      : Promise.resolve(null)
    return Promise.all([filesP, memberP])
      .then(([res, overview]) => {
        const loggedIn = AuthUtil.isLoggedIn()
        const memberOk = !!(loggedIn && overview && overview.memberActive)
        const records = (res && (res.records || res.list || res.items)) || (Array.isArray(res) ? res : [])
        const mapped = records.map(normalizeFile).filter((f) => f.id != null)
        const gateTitle = memberOk ? '年度会员已生效' : (loggedIn ? '你当前是普通用户' : '登录后查看解锁进度')
        const gateDesc = memberOk
          ? '会员资料已解锁 · 可转发保存'
          : '可免费查看部分资料，加入会员后全部解锁并可转发保存'
        const gateCta = memberOk ? '去续费' : '去开通'
        if (!mapped.length) {
          this.setData({
            loading: false,
            loadError: false,
            cats: [],
            groups: [],
            isEmpty: true,
            memberOk,
            footerText: loggedIn ? '暂无资料' : '登录后查看已解锁资料',
            gateTitle,
            gateDesc,
            gateCta,
          })
          return
        }
        const fullyOpen = mapped.filter((f) => f.canDownload || f.canRead).length
        this.setData({
          loading: false,
          loadError: false,
          cats: ['全部'],
          activeCat: '全部',
          groups: [{ title: '全部资料', items: mapped }],
          isEmpty: false,
          memberOk,
          footerText: memberOk
            ? `共 ${mapped.length} 份 · 已解锁 ${fullyOpen} 份`
            : `共 ${mapped.length} 份`,
          gateTitle,
          gateDesc,
          gateCta,
        })
      })
      .catch(() => {
        this.setData({
          loading: false,
          loadError: true,
          groups: [],
          isEmpty: true,
          memberOk: false,
          footerText: '资料暂时加载失败',
          gateTitle: AuthUtil.isLoggedIn() ? '你当前是普通用户' : '登录后查看解锁进度',
          gateDesc: '可免费查看部分资料，加入会员后全部解锁并可转发保存',
          gateCta: '去开通',
        })
      })
  },

  onOpenFile(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    let itemLocked = false
    ;(this.data.groups || []).forEach((g) => (g.items || []).forEach((it) => {
      if (String(it.id) === String(id)) itemLocked = !!it.locked
    }))
    if (USE_LOCAL_SOURCE || FORCE_LOCAL_DEMO) {
      wx.navigateTo({
        url: itemLocked
          ? '/pages/file-preview/file-preview?demo=lock'
          : '/pages/file-preview/file-preview?demo=1',
      })
      return
    }
    if (itemLocked) {
      wx.navigateTo({ url: `/pages/file-preview/file-preview?id=${id}&lock=1` })
      return
    }
    wx.navigateTo({ url: `/pages/file-preview/file-preview?id=${id}` })
  },
})
