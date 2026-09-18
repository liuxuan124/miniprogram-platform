const reviewService = require('../../services/review')
const { createSharePageConfig } = require('../../utils/share')

Page({
  ...createSharePageConfig(),
  data: {
    productId: null,
    avgScore: 0,
    total: 0,
    bars: [],
    hotTags: [],
    records: [],
    activeTag: '',
    loading: false,
    loadError: false,
  },

  onLoad(q) {
    this.setData({ productId: q.productId || q.id || '' })
    this.load()
  },

  onTag(e) {
    this.setData({ activeTag: e.currentTarget.dataset.tag || '' })
    this.load()
  },

  _bars(dist, total) {
    const t = total || 1
    return [5, 4, 3, 2, 1].map((score) => {
      const count = Number((dist && dist[score]) || 0)
      return { score, count, pct: Math.round((count / t) * 100) }
    })
  },

  _mapRecords(list) {
    return (list || []).map((r) => ({
      ...r,
      stars: '★'.repeat(r.score || 5) + '☆'.repeat(5 - (r.score || 5)),
      createTime: String(r.createTime || '').slice(0, 10),
    }))
  },

  async load() {
    this.setData({ loading: true })
    const pid = this.data.productId
    try {
      if (!pid) throw new Error('no id')
      const data = await reviewService.getProductReviews(pid, {
        tag: this.data.activeTag || undefined,
        current: 1,
        size: 50,
      })
      const payload = data || {}
      this.setData({
        avgScore: Number(payload.avgScore) || 0,
        total: Number(payload.total) || 0,
        bars: this._bars(payload.scoreDist, payload.total),
        hotTags: payload.hotTags || [],
        records: this._mapRecords(payload.records),
        loading: false,
        loadError: false,
      })
    } catch (e) {
      this.setData({
        avgScore: 0,
        total: 0,
        bars: this._bars({}, 0),
        hotTags: [],
        records: [],
        loading: false,
        loadError: true,
      })
    }
  },
})
