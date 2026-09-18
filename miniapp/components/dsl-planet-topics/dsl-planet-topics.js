const PlanetService = require('../../services/planet')

Component({
  properties: {
    config: { type: Object, value: {} },
    styleString: { type: String, value: '' },
  },
  data: {
    icon: '📈',
    title: '本周热门话题',
    badge: '',
    note: '',
    topics: [],
    visible: false,
  },
  lifetimes: { attached() { this._apply() } },
  observers: { config() { this._apply() } },
  methods: {
    _apply() {
      const c = this.data.config || {}
      const manual = String(c.source_mode || 'auto') === 'manual'
      const items = Array.isArray(c.items) ? c.items.filter(Boolean) : []
      if (manual) {
        this.setData({
          icon: c.icon || '📈',
          title: c.title || '本周热门话题',
          badge: c.badge || '',
          note: c.note || '',
          topics: items,
          visible: items.length > 0,
        })
        return
      }
      PlanetService.getMainPlanet().catch(() => null).then((main) => {
        const planetId = (main && main.planetId) || PlanetService.getCachedMainPlanetId() || ''
        return PlanetService.getPlanetHome(planetId)
      }).then((home) => {
        const topics = (home && Array.isArray(home.topics))
          ? home.topics.filter((t) => t && t.name)
          : []
        this.setData({
          icon: c.icon || '📈',
          title: c.title || '本周热门话题',
          badge: c.badge || '',
          note: c.note || '',
          topics,
          visible: topics.length > 0,
        })
      }).catch(() => {
        this.setData({ topics: [], visible: false, badge: '', note: '' })
      })
    },
  },
})
