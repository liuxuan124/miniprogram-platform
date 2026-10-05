/**
 * 知识星球服务
 */
const request = require('../utils/request')
const { StorageUtil } = require('../utils/storage')

const MAIN_PLANET_KEY = 'main_planet_id'
/** 首次进入「选主星球」引导页被跳过的标记：只提示一次，不再拦 */
const PICK_SKIPPED_KEY = 'planet_pick_skipped'

function getPlanetHome(planetId) {
  const params = {}
  if (planetId) params.planetId = planetId
  return request.get('/api/v1/mp/planet/home', params, { showError: false })
}

function getPlanetCommunities() {
  return request.get('/api/v1/mp/planet/communities', {}, { showError: false })
}

function getPlanetCommunity(id) {
  return request.get(`/api/v1/mp/planet/communities/${encodeURIComponent(id || 'warm-main')}`, {}, {
    showError: false,
  })
}

function getPlanetFeed(params = {}) {
  return request.get('/api/v1/mp/planet/feed', {
    current: params.current || params.page || 1,
    size: params.size || params.page_size || 10,
    planetId: params.planetId || '',
    // 排序：new(最新发布) / hot(热门) / reply(最后回复)。
    // 只在显式传入时透传，留空让后端用默认 new，避免给老调用方塞一个多余 query。
    sortBy: params.sortBy || params.sort_by || '',
  }, { showError: false })
}

function getPlanetContent(id) {
  return request.get(`/api/v1/mp/planet/contents/${id}`, {}, { showError: false })
}

function getMainPlanet() {
  return request.get('/api/v1/mp/planet/main', {}, { showError: false }).then((data) => {
    if (data && data.planetId) {
      StorageUtil.set(MAIN_PLANET_KEY, data.planetId)
    }
    return data
  })
}

function setMainPlanet(planetId) {
  return request.put('/api/v1/mp/planet/main', { planetId }, { showError: true }).then((data) => {
    if (data && data.planetId) {
      StorageUtil.set(MAIN_PLANET_KEY, data.planetId)
    } else if (planetId) {
      StorageUtil.set(MAIN_PLANET_KEY, planetId)
    }
    // 已主动选过主星球，「跳过引导」标记不再有意义
    StorageUtil.remove(PICK_SKIPPED_KEY)
    return data
  })
}

function getCachedMainPlanetId() {
  return StorageUtil.get(MAIN_PLANET_KEY) || ''
}

/** 用户是否点过「先逛逛」跳过选星球引导（选过主星球后此标记失效） */
function isPickSkipped() {
  return !!StorageUtil.get(PICK_SKIPPED_KEY)
}

function setPickSkipped() {
  StorageUtil.set(PICK_SKIPPED_KEY, true)
}

function clearPickSkipped() {
  StorageUtil.remove(PICK_SKIPPED_KEY)
}

/**
 * 归一化社区列表，剔除后端未升级时可能出现的空壳项。
 * ⚠️ 缺 planetId 的卡会让「设为常驻」拿到空 id 而静默失败，
 *    这里兜一层默认主社区 id（与 dsl-warm-block.mapPlanet 同口径）。
 */
function normalizeCommunities(rows) {
  const list = Array.isArray(rows) ? rows : []
  return list
    .filter((c) => c && (c.id || c.planetId))
    .map((c) => Object.assign({}, c, {
      id: String(c.id || c.planetId || '').trim() || 'warm-main',
    }))
}

module.exports = {
  getPlanetHome,
  getPlanetCommunities,
  getPlanetCommunity,
  getPlanetFeed,
  getPlanetContent,
  getMainPlanet,
  setMainPlanet,
  getCachedMainPlanetId,
  normalizeCommunities,
  isPickSkipped,
  setPickSkipped,
  clearPickSkipped,
}
