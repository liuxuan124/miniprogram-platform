const { get } = require('../../utils/request')
const { navigatePage } = require('../../utils/render')

function formatSize(size) {
  const n = Number(size)
  if (!Number.isFinite(n) || n <= 0) return '—'
  if (n < 1024) return n + ' B'
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB'
  return (n / (1024 * 1024)).toFixed(1) + ' MB'
}

function fileVisual(fileType) {
  const key = String(fileType || 'file').toLowerCase()
  const map = {
    pdf: { icon: 'PDF', color: '#E74C3C' },
    docx: { icon: 'W', color: '#2980B9' },
    xlsx: { icon: 'X', color: '#27AE60' },
    pptx: { icon: 'P', color: '#E67E22' },
    zip: { icon: 'Z', color: '#8E44AD' },
  }
  return map[key] || { icon: 'F', color: '#64748B' }
}

function accessTag(item) {
  if (item.canDownload || item.canRead) return { type: 'free', label: '免费' }
  if (item.boundProductId) return { type: 'price', label: '付费' }
  if (item.minDownloadLevelName) return { type: 'vip', label: item.minDownloadLevelName }
  return { type: 'price', label: '会员' }
}

function mapItem(item, index) {
  const visual = fileVisual(item.fileType || item.file_type)
  const pages = item.pageCount || item.page_count
  const metaLine = [pages ? pages + ' 页' : '', formatSize(item.size)].filter(Boolean).join(' · ')
  return {
    id: item.id || index + 1,
    title: item.name || item.title || '资料',
    fileIcon: visual.icon,
    fileColor: visual.color,
    metaLine: metaLine || formatSize(item.size),
    downloadCount: Number(item.downloadCount || item.download_count || 0) || 0,
    access: accessTag(item),
  }
}

Component({
  properties: {
    config: { type: Object, value: {} },
    runtimeData: { type: Array, value: [] },
    styleString: { type: String, value: '' },
  },

  data: {
    state: 'loading',
    displayItems: [],
    layout: 'list',
    showMeta: true,
    showDownloads: true,
    showAccess: true,
    showMore: false,
    moreText: '',
    moreLink: '',
    showFilter: false,
    filterTabs: [{ id: '', name: '全部' }],
    activeGroup: '',
    errorText: '加载失败',
  },

  observers: {
    'config, runtimeData': function () {
      this.applyData()
    },
  },

  lifetimes: {
    attached() {
      this.applyData()
    },
  },

  methods: {
    applyData() {
      const cfg = this.properties.config || {}
      this.setData({
        layout: cfg.layout === 'card' ? 'card' : 'list',
        showMeta: cfg.show_meta !== false,
        showDownloads: cfg.show_downloads !== false,
        showAccess: cfg.show_access !== false,
        showMore: cfg.show_more === true,
        moreText: cfg.more_text || '查看更多资料 ›',
        moreLink: cfg.more_link || '/pages/resources/resources',
        showFilter: cfg.show_filter_bar === true,
      })
      const rows = Array.isArray(this.properties.runtimeData) && this.properties.runtimeData.length
        ? this.properties.runtimeData
        : (Array.isArray(cfg.items) ? cfg.items : [])
      if (rows.length) {
        const limit = Math.max(Number(cfg.limit) || 5, 1)
        this.setData({
          state: 'data',
          displayItems: rows.map(mapItem).slice(0, limit),
        })
        return
      }
      this.reload()
    },

    reload() {
      const cfg = this.properties.config || {}
      const limit = Math.max(Number(cfg.limit) || 5, 1)
      this.setData({ state: 'loading' })
      get('/api/v1/mp/files', { current: 1, size: limit })
        .then((res) => {
          const data = res && res.data
          const records = (data && data.records) || (Array.isArray(data) ? data : [])
          if (!records.length) {
            this.setData({ state: 'empty', displayItems: [] })
            return
          }
          this.setData({ state: 'data', displayItems: records.map(mapItem).slice(0, limit) })
        })
        .catch(() => {
          this.setData({ state: 'error', displayItems: [], errorText: '资料加载失败' })
        })
    },

    onItemTap(e) {
      const id = e.currentTarget.dataset.id
      if (!id) return
      navigatePage(`/pages/resource-detail/resource-detail?id=${id}`)
    },

    onMoreTap(e) {
      const link = e.currentTarget.dataset.link
      if (link) navigatePage(link)
    },

    onFilterTap(e) {
      this.setData({ activeGroup: e.currentTarget.dataset.id || '' })
      this.applyData()
    },
  },
})
