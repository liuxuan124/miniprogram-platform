const { get } = require('./request')

function requestOrderSubscribe() {
  return get('/api/v1/mp/subscribe/templates', {}, { auth: false, showError: false })
    .then((list) => {
      const preferred = ['order_status', 'order_shipped', 'coupon_expire']
      const rows = Array.isArray(list) ? list : []
      const ranked = preferred
        .map((scene) => rows.find((r) => r && r.scene === scene && r.templateId))
        .filter(Boolean)
        .concat(rows.filter((r) => r && r.templateId && !preferred.includes(r.scene)))
      const tmplIds = ranked.map((r) => r.templateId).filter(Boolean).slice(0, 3)
      if (!tmplIds.length || typeof wx.requestSubscribeMessage !== 'function') {
        return Promise.resolve()
      }
      return new Promise((resolve) => {
        wx.requestSubscribeMessage({
          tmplIds,
          complete: () => resolve(),
        })
      })
    })
    .catch(() => {})
}

module.exports = { requestOrderSubscribe }
