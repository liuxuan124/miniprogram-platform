const request = require('../../utils/request')
const { createSharePageConfig } = require('../../utils/share')
const { DEMO_RESOURCES, DEMO_RESOURCES_MEMBER } = require('../../data/warm-demo')
const { USE_LOCAL_SOURCE, WARM_PAGE_STYLE } = require('../../data/warm-source')

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
  if (n > 0) return n
  const name = String((item && (item.name || item.title)) || '')
  if (/领读提纲|共读/.test(name)) return 12
  return 0
}

function normalizeFile(item) {
  const id = item.id != null ? item.id : item.fileId
  const rawName = item.name || item.title || '未命名资料'
  const name = String(rawName).replace(/\.pdf$/i, '')
  const canRead = item.canRead === true
  const canDownload = item.canDownload === true
  const canPreview = item.canPreview === true
  const fullyOpen = canRead || canDownload
  // 仅试读不算「解锁」；锁标留给完全不可见
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
  const pack = memberOk ? DEMO_RESOURCES_MEMBER : DEMO_RESOURCES
  page.setData({
    themePageStyle: WARM_PAGE_STYLE,
    cats: pack.cats,
    activeCat: pack.cats[0],
    groups: cloneGroups(pack),
    memberOk: !!memberOk,
    loading: false,
    isEmpty: false,
    footerText: pack.footerText || (memberOk ? '共 128 份 · 全部已解锁' : '共 128 份 · 已解锁 2 份'),
    gateTitle: memberOk ? '年度会员已生效' : '你当前是普通用户',
    gateDesc: memberOk
      ? '128 份资料全部解锁 · 有效期至 2027-03-18 · 剩余 185 天'
      : '可免费查看每份资料的前 2 页 / 20%，加入会员后全部解锁并可转发保存',
    gateCta: memberOk ? '续费 8 折' : '¥168/年',
  })
}

function patchDemoWithApi(groups, apiFiles) {
  const hit = (apiFiles || []).find((f) => /领读提纲|共读/.test(String(f.name || '')))
  if (!hit || hit.id == null) return groups
  return (groups || []).map((g) => ({
    title: g.title,
    items: (g.items || []).map((it) => {
      if (!/领读提纲/.test(String(it.name || ''))) return it
      return Object.assign({}, it, {
        id: hit.id,
        name: String(hit.name || it.name).replace(/\.pdf$/i, ''),
        meta: hit.meta || it.meta,
        locked: hit.locked,
        actionText: hit.actionText || it.actionText,
        tryHint: hit.tryHint || it.tryHint,
      })
    }),
  }))
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
    isEmpty: false,
    footerText: '',
    gateTitle: '你当前是普通用户',
    gateDesc: '可免费查看每份资料的前 2 页 / 20%，加入会员后全部解锁并可转发保存',
    gateCta: '¥168/年',
  },

  onLoad(options) {
    this._forceMember = !!(options && (options.member === '1' || options.member === 'true'))
    if (USE_LOCAL_SOURCE || (options && options.demo === '1')) {
      applyDemoResources(this, this._forceMember)
      return
    }
    this._load(true)
  },

  onShow() {
    this.setData({ themePageStyle: WARM_PAGE_STYLE })
  },

  onPullDownRefresh() {
    if (USE_LOCAL_SOURCE) {
      applyDemoResources(this, this._forceMember)
      wx.stopPullDownRefresh()
      return
    }
    this._load(true).finally(() => wx.stopPullDownRefresh())
  },

  onCatTap(e) {
    this.setData({ activeCat: e.currentTarget.dataset.cat })
  },

  onGoMember() {
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

  _load() {
    if (USE_LOCAL_SOURCE) {
      applyDemoResources(this, this._forceMember)
      return Promise.resolve()
    }
    if (this.data.loading) return Promise.resolve()
    this.setData({ loading: true })
    return request.get('/api/v1/mp/files', {
      current: 1,
      size: 30,
      status: 'published',
    }, { auth: true, showError: false })
      .then((res) => {
        const records = (res && (res.records || res.list || res.items)) || (Array.isArray(res) ? res : [])
        const mapped = records.map(normalizeFile).filter((f) => f.id != null)
        if (!mapped.length) {
          applyDemoResources(this, this._forceMember)
          this.setData({ footerText: (this._forceMember ? DEMO_RESOURCES_MEMBER : DEMO_RESOURCES).footerText + ' · 演示' })
          return
        }
        const fullyOpen = mapped.filter((f) => f.canDownload || f.canRead).length
        const memberOk = this._forceMember || (mapped.length > 0 && fullyOpen === mapped.length)
        // 线上条目偏少时补齐暖阁双态列表，并把真实 PDF id 灌进「领读提纲」
        if (mapped.length < 3) {
          const pack = memberOk ? DEMO_RESOURCES_MEMBER : DEMO_RESOURCES
          this.setData({
            loading: false,
            cats: pack.cats,
            activeCat: pack.cats[0],
            groups: patchDemoWithApi(cloneGroups(pack), mapped),
            isEmpty: false,
            memberOk,
            footerText: pack.footerText,
            gateTitle: memberOk ? '年度会员已生效' : '你当前是普通用户',
            gateDesc: memberOk
              ? '128 份资料全部解锁 · 可转发保存'
              : '可免费查看每份资料的前 2 页 / 20%，加入会员后全部解锁并可转发保存',
            gateCta: memberOk ? '续费 8 折' : '¥168/年',
          })
          return
        }
        this.setData({
          loading: false,
          cats: DEMO_RESOURCES.cats,
          activeCat: DEMO_RESOURCES.cats[0],
          groups: [{ title: '全部资料', items: mapped }],
          isEmpty: false,
          memberOk,
          footerText: memberOk
            ? `共 ${mapped.length} 份 · 全部已解锁`
            : `共 ${mapped.length} 份 · 已解锁 ${fullyOpen} 份`,
          gateTitle: memberOk ? '年度会员已生效' : '你当前是普通用户',
          gateDesc: memberOk
            ? `${mapped.length} 份资料全部解锁 · 可转发保存`
            : '可免费查看每份资料的前 2 页 / 20%，加入会员后全部解锁并可转发保存',
          gateCta: memberOk ? '续费 8 折' : '¥168/年',
        })
      })
      .catch(() => {
        applyDemoResources(this, this._forceMember)
        this.setData({ footerText: '共 128 份 · 演示数据' })
      })
  },

  onOpenFile(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    let itemLocked = false
    ;(this.data.groups || []).forEach((g) => (g.items || []).forEach((it) => {
      if (String(it.id) === String(id)) itemLocked = !!it.locked
    }))
    // 演示 id（f1…）或本地源 → 暖阁纸张 mock
    if (USE_LOCAL_SOURCE || /^f\d/i.test(String(id))) {
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
