const { get } = require('../../utils/request')
const { navigatePage } = require('../../utils/render')

function mapRow(item, index) {
  const q = String(item.title || item.body || '提问').trim()
  const a = String(item.answerBody || item.answer_body || '').trim()
  return {
    id: item.id || index + 1,
    question: q.length > 80 ? q.slice(0, 80) + '…' : q,
    answerPreview: a ? (a.length > 120 ? a.slice(0, 120) + '…' : a) : '等待星主回答…',
    tags: item.visibility === 'private' ? ['私密'] : ['公开'],
    spectatorCount: Number(item.spectatorCount ?? item.spectator_count ?? 0) || 0,
    payStatusLabel: item.status === 'answered' ? '已解答' : '待回答',
    visibility: item.visibility || 'public',
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
    rows: [],
    summaryLines: 2,
    showMore: false,
    showAsk: false,
    moreText: '',
    moreLink: '',
    askLink: '',
  },

  observers: {
    'config, runtimeData': function () {
      this.sync()
    },
  },

  lifetimes: {
    attached() {
      this.sync()
    },
  },

  methods: {
    sync() {
      const cfg = this.properties.config || {}
      const limit = Math.max(Number(cfg.limit) || 5, 1)
      this.setData({
        summaryLines: Math.min(Math.max(Number(cfg.summary_lines) || 2, 1), 3),
        showMore: cfg.show_more === true,
        showAsk: cfg.show_ask_entry === true,
        moreText: cfg.more_text || '查看更多问答 ›',
        moreLink: cfg.more_link || '/pages/qa-list/qa-list',
        askLink: cfg.ask_link || '/pages/ask/ask',
      })
      let rows = Array.isArray(this.properties.runtimeData) && this.properties.runtimeData.length
        ? this.properties.runtimeData.map(mapRow)
        : (Array.isArray(cfg.items) ? cfg.items : [])
      if (cfg.filter_private !== false) {
        rows = rows.filter((r) => r.visibility !== 'private')
      }
      if (rows.length) {
        this.setData({ state: 'data', rows: rows.slice(0, limit) })
        return
      }
      this.reload(limit)
    },

    reload(limit) {
      this.setData({ state: 'loading' })
      get('/api/v1/mp/paid-qa', { limit: limit || 5 })
        .then((res) => {
          const list = (res && res.data) || []
          if (!list.length) {
            this.setData({ state: 'empty', rows: [] })
            return
          }
          this.setData({ state: 'data', rows: list.map(mapRow).slice(0, limit) })
        })
        .catch(() => this.setData({ state: 'error', rows: [] }))
    },

    onRowTap(e) {
      const id = e.currentTarget.dataset.id
      if (id) navigatePage(`/pages/question-detail/question-detail?id=${id}`)
    },

    onMoreTap() {
      if (this.data.moreLink) navigatePage(this.data.moreLink)
    },

    onAskTap() {
      if (this.data.askLink) navigatePage(this.data.askLink)
    },
  },
})
