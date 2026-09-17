/**
 * 知识星球服务
 */
const request = require('../utils/request')

function getPlanetHome() {
  return request.get('/api/v1/mp/planet/home', {}, { showError: false })
}

function getPlanetFeed(params = {}) {
  return request.get('/api/v1/mp/planet/feed', {
    current: params.current || params.page || 1,
    size: params.size || params.page_size || 10,
  }, { showError: false })
}

function getPlanetContent(id) {
  return request.get(`/api/v1/mp/planet/contents/${id}`, {}, { showError: false })
}

module.exports = {
  getPlanetHome,
  getPlanetFeed,
  getPlanetContent,
}
