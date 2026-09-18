/**
 * 知识星球服务
 */
const request = require('../utils/request')
const { StorageUtil } = require('../utils/storage')

const MAIN_PLANET_KEY = 'main_planet_id'

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
    return data
  })
}

function getCachedMainPlanetId() {
  return StorageUtil.get(MAIN_PLANET_KEY) || ''
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
}
