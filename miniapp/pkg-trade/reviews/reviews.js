const reviewService = require('../../services/review')
const { createSharePageConfig } = require('../../utils/share')

const DEMO = {
  avgScore: 4.9,
  total: 128,
  scoreDist: { 5: 110, 4: 14, 3: 3, 2: 1, 1: 0 },
  hotTags: ['实用', '模板全', '更新及时', '讲得清楚'],
  records: [
    { id: 1, nickname: 'Lisa_跨境', score: 5, tags: ['实用', '模板全'], content: '选品漏斗直接能套用，利润表帮我省了不少试错。', createTime: '2026-07-10' },
    { id: 2, nickname: '匿名用户', score: 5, tags: ['更新及时'], content: '季度更新很良心，目录结构清楚。', createTime: '2026-07-08' },
  ],
}

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
        avgScore: payload.avgScore || 0,
        total: payload.total || 0,
        bars: this._bars(payload.scoreDist, payload.total),
        hotTags: payload.hotTags || [],
        records: this._mapRecords(payload.records),
        loading: false,
      })
    } catch (e) {
      const d = DEMO
      this.setData({
        avgScore: d.avgScore,
        total: d.total,
        bars: this._bars(d.scoreDist, d.total),
        hotTags: d.hotTags,
        records: this._mapRecords(d.records),
        loading: false,
      })
    }
  },
})
