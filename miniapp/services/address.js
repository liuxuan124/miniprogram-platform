/**
 * 收货地址服务 — 服务端持久化 + 本地缓存
 */
const request = require('../utils/request')
const { StorageUtil } = require('../utils/storage')

const CACHE_KEY = 'addressList'

function normalize(raw) {
  if (!raw || typeof raw !== 'object') return null
  return {
    id: raw.id,
    name: raw.name || '',
    phone: raw.phone || '',
    province: raw.province || '',
    city: raw.city || '',
    district: raw.district || '',
    detail: raw.detail || raw.address || '',
    is_default: !!(raw.isDefault ?? raw.is_default),
    isDefault: !!(raw.isDefault ?? raw.is_default),
  }
}

function cacheList(list) {
  const normalized = (list || []).map(normalize).filter(Boolean)
  StorageUtil.set(CACHE_KEY, normalized)
  return normalized
}

function readCache() {
  const list = StorageUtil.get(CACHE_KEY) || []
  return Array.isArray(list) ? list.map(normalize).filter(Boolean) : []
}

function listAddresses() {
  return request.get('/api/v1/mp/addresses', {}, { showError: false })
    .then((res) => {
      const items = Array.isArray(res) ? res : (res && (res.items || res.records)) || []
      return cacheList(items)
    })
    .catch(() => readCache())
}

function createAddress(data) {
  return request.post('/api/v1/mp/addresses', {
    name: data.name,
    phone: data.phone,
    province: data.province,
    city: data.city,
    district: data.district,
    detail: data.detail,
    isDefault: !!(data.is_default ?? data.isDefault),
  }).then((res) => {
    const item = normalize(res)
    const list = readCache().filter((a) => String(a.id) !== String(item.id))
    if (item.is_default) {
      list.forEach((a) => { a.is_default = false; a.isDefault = false })
    }
    list.unshift(item)
    cacheList(list)
    return item
  })
}

function updateAddress(id, data) {
  return request.put(`/api/v1/mp/addresses/${id}`, {
    name: data.name,
    phone: data.phone,
    province: data.province,
    city: data.city,
    district: data.district,
    detail: data.detail,
    isDefault: !!(data.is_default ?? data.isDefault),
  }).then((res) => {
    const item = normalize(res)
    let list = readCache()
    if (item.is_default) {
      list = list.map((a) => ({ ...a, is_default: false, isDefault: false }))
    }
    const idx = list.findIndex((a) => String(a.id) === String(id))
    if (idx >= 0) list[idx] = item
    else list.unshift(item)
    cacheList(list)
    return item
  })
}

function deleteAddress(id) {
  return request.del(`/api/v1/mp/addresses/${id}`).then(() => {
    const list = readCache().filter((a) => String(a.id) !== String(id))
    if (list.length && !list.some((a) => a.is_default)) {
      list[0].is_default = true
      list[0].isDefault = true
    }
    cacheList(list)
    return list
  })
}

function setDefaultAddress(id) {
  return request.put(`/api/v1/mp/addresses/${id}/default`).then(() => {
    const list = readCache().map((a) => ({
      ...a,
      is_default: String(a.id) === String(id),
      isDefault: String(a.id) === String(id),
    }))
    cacheList(list)
    return list
  })
}

/** 首次登录：把本地旧地址迁移到服务端（仅当服务端为空） */
function migrateLocalIfNeeded() {
  const local = readCache().filter((a) => String(a.id).startsWith('local_'))
  if (!local.length) return Promise.resolve([])
  return request.get('/api/v1/mp/addresses', {}, { showError: false })
    .then((res) => {
      const remote = Array.isArray(res) ? res : []
      if (remote.length) {
        return cacheList(remote)
      }
      let chain = Promise.resolve()
      const migrated = []
      local.forEach((item, index) => {
        chain = chain.then(() => createAddress({
          ...item,
          is_default: index === 0 || item.is_default,
        }).then((saved) => { migrated.push(saved) }))
      })
      return chain.then(() => migrated)
    })
    .catch(() => readCache())
}

module.exports = {
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  migrateLocalIfNeeded,
  readCache,
  normalize,
}
