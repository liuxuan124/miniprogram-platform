const { AuthUtil } = require('./auth')
const { StorageUtil } = require('./storage')

const BASE = 'content_favorites'

/**
 * 收藏存储 key。
 * 未登录时返回空串 —— 读写函数会直接短路返回，
 * 避免游客态的临时收藏脏数据被写进 Storage 后残留。
 */
function favoritesKey() {
  if (!AuthUtil.isLoggedIn()) return ''
  const info = AuthUtil.getUserInfo() || {}
  const id = info.id || info.userId
  return id ? `${BASE}_${id}` : ''
}

function readFavoriteIds() {
  const key = favoritesKey()
  if (!key) return []
  const raw = StorageUtil.get(key) || StorageUtil.get(BASE)
  if (!raw) return []
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean)
  if (typeof raw === 'object') return Object.keys(raw).filter((k) => !!raw[k])
  return []
}

function writeFavoriteIds(ids) {
  const key = favoritesKey()
  if (!key) return
  const map = {}
  ;(ids || []).forEach((id) => {
    const k = String(id)
    if (k && k !== 'NaN') map[k] = true
  })
  StorageUtil.set(key, map)
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
