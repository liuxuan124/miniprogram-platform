const { get, post } = require('../utils/request')

function listNotices() {
  return get('/api/v1/mp/notices')
}

function unreadCount() {
  return get('/api/v1/mp/notices/unread-count', {}, { showError: false })
}

function markRead(id) {
  return post(`/api/v1/mp/notices/${id}/read`, {}, { showError: false })
}

function markAllRead() {
  return post('/api/v1/mp/notices/read-all', {}, { showError: false })
}

module.exports = {
  listNotices,
  unreadCount,
  markRead,
  markAllRead,
}
