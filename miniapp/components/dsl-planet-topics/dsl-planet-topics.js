const PlanetService = require('../../services/planet')
const warmPlanet = require('../../data/warm-planet')

const NOTE_DEFAULT = '基于近 30 天星球发帖、提问与互动数据推演。预计下周「AI 写作工具」将持续升温，建议提前储备相关选题。'

Component({
  properties: {
    config: { type: Object, value: {} },
    styleString: { type: String, value: '' },
  },
  data: {
    icon: '📈',
    title: '本周星球话题预测',
    badge: 'AI 推演',
    note: NOTE_DEFAULT,
    topics: warmPlanet.TOPICS,
  },
  lifetimes: { attached() { this._apply() } },
  observers: { config() { this._apply() } },
  methods: {
    _apply() {
      const c = this.data.config || {}
      const manual = String(c.source_mode || 'auto') === 'manual'
      const base = {
        icon: c.icon || '📈',
        title: c.title || '本周星球话题预测',
        badge: c.badge || 'AI 推演',
        note: c.note || NOTE_DEFAULT,
        topics: Array.isArray(c.items) && c.items.length ? c.items : warmPlanet.TOPICS,
      }
      this.setData(base)
      if (manual) return
      PlanetService.getPlanetHome().then((home) => {
        if (home && Array.isArray(home.topics) && home.topics.length) {
          this.setData({ topics: home.topics })
        }
      }).catch(() => {})
    },
  },
})
