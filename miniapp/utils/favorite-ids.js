const { AuthUtil } = require('./auth')
const { StorageUtil } = require('./storage')

const BASE = 'content_favorites'

function favoritesKey() {
  if (!AuthUtil.isLoggedIn()) return `${BASE}_guest`
  const info = AuthUtil.getUserInfo() || {}
  const id = info.id || info.userId
  return id ? `${BASE}_${id}` : `${BASE}_guest`
}

function readFavoriteIds() {
  const raw = StorageUtil.get(favoritesKey()) || StorageUtil.get(BASE)
  if (!raw) return []
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean)
  if (typeof raw === 'object') return Object.keys(raw).filter((k) => !!raw[k])
  return []
}

function writeFavoriteIds(ids) {
  const map = {}
  ;(ids || []).forEach((id) => {
    const k = String(id)
    if (k && k !== 'NaN') map[k] = true
  })
  StorageUtil.set(favoritesKey(), map)
}

function hasFavoriteId(id) {
  return readFavoriteIds().indexOf(String(id)) >= 0
}

module.exports = {
  favoritesKey,
  readFavoriteIds,
  writeFavoriteIds,
  hasFavoriteId,
}
