/**
 * 优惠券服务 — API 接口封装
 */
const request = require('../utils/request')

/**
 * 获取可领取优惠券列表
 * @param {Object} params - { page, page_size }
 * @returns {Promise<Object>} { list, total }
 */
function getAvailableCoupons(params = {}) {
  return request.get('/api/v1/mp/coupons', params)
}

/**
 * 领取优惠券
 * @param {string|number} id - 优惠券ID
 * @returns {Promise<Object>} 领取结果
 */
function claimCoupon(id) {
  return request.post(`/api/v1/mp/coupons/${id}/claim`)
}

/**
 * 获取我的优惠券列表
 * @param {Object} params - { status, page, page_size }
 *   status: 'available' | 'used' | 'expired'
 * @returns {Promise<Object>} { list, total }
 */
function getMyCoupons(params = {}) {
  return request.get('/api/v1/mp/coupons/my', params)
}

module.exports = {
  getAvailableCoupons,
  claimCoupon,
  getMyCoupons,
}
