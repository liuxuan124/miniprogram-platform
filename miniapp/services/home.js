/**
 * 暖阁首页聚合
 */
const { get } = require('../utils/request')

function getWarmHome() {
  return get('/api/v1/mp/home/warm', {}, { auth: false, showError: false })
}

module.exports = {
  getWarmHome,
}
