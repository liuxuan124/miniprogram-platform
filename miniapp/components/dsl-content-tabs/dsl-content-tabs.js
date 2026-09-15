Component({
  properties: {
    config: { type: Object, value: {} },
    styleString: { type: String, value: '' },
  },
  data: {
    active: 0,
    panes: [],
    items: [],
  },
  observers: {
    config(cfg) {
      const panes = Array.isArray((cfg || {}).panes) ? cfg.panes : []
      const active = Math.min(this.data.active || 0, Math.max(panes.length - 1, 0))
      this.setData({
        panes,
        active,
        items: (panes[active] && panes[active].items) || [],
      })
    },
  },
  methods: {
    onSwitch(e) {
      const idx = Number(e.currentTarget.dataset.index || 0)
      const panes = this.data.panes || []
      this.setData({
        active: idx,
        items: (panes[idx] && panes[idx].items) || [],
      })
    },
    onTap(e) {
      this.triggerEvent('tapitem', { url: (e.currentTarget.dataset.url || '').trim() })
    },
  },
})
