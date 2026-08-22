const request = require('./request')

function track(eventName, payload = {}) {
  try {
    const pages = getCurrentPages()
    const page = pages.length ? pages[pages.length - 1].route : ''
    const app = getApp()
    const body = {
      eventName,
      page: payload.page || page,
      componentId: payload.componentId || payload.component_id || '',
      itemId: payload.itemId || payload.item_id || '',
      props: typeof payload.props === 'string' ? payload.props : JSON.stringify(payload.props || {}),
      sourceChannel: (app && app.globalData && app.globalData.sourceChannel) || '',
      inviterId: payload.inviterId || (app && app.globalData && app.globalData.inviterId) || null,
    }
    request.post('/api/v1/mp/events', body, { auth: false, showError: false }).catch(() => {})
  } catch (e) {}
}

function trackSearch(keyword, resultCount) {
  try {
    request.post('/api/v1/mp/search/log', {
      keyword: String(keyword || '').trim(),
      resultCount: Number(resultCount) || 0,
      page: 'search',
    }, { auth: false, showError: false }).catch(() => {})
  } catch (e) {}
}

module.exports = { track, trackSearch }
