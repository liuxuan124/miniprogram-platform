/**
 * 订单服务 — API 接口封装
 */
const request = require('../utils/request')

/**
 * 创建订单
 * @param {Object} data - { address_id, items: [{ cart_id / sku_id, quantity }], remark }
 */
function createOrder(data) {
  return request.post('/api/v1/mp/orders', data)
}

/**
 * 获取我的订单列表
 * @param {Object} params - { status, page, page_size }
 */
function getOrderList(params = {}) {
  return request.get('/api/v1/mp/orders', params)
}

/**
 * 获取订单详情
 * @param {string|number} id - 订单ID
 */
function getOrderDetail(id) {
  return request.get(`/api/v1/mp/orders/${id}`)
}

/**
 * 支付订单（微信支付）
 * @param {string|number} id - 订单ID
 */
function payOrder(id) {
  return request.post(`/api/v1/mp/orders/${id}/pay`)
}

/**
 * 取消订单
 * @param {string|number} id - 订单ID
 */
function cancelOrder(id) {
  return request.post(`/api/v1/mp/orders/${id}/cancel`)
}

/**
 * 确认收货
 * @param {string|number} id - 订单ID
 */
function confirmOrder(id) {
  return request.post(`/api/v1/mp/orders/${id}/confirm`)
}

/**
 * 申请退款
 * @param {string|number} id - 订单ID
 * @param {Object} data - { reason }
 */
function refundOrder(id, data = {}) {
  return request.post(`/api/v1/mp/orders/${id}/refund`, data)
}

module.exports = {
  createOrder,
  getOrderList,
  getOrderDetail,
  payOrder,
  cancelOrder,
  confirmOrder,
  refundOrder
}
