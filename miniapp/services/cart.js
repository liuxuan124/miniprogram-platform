/**
 * 购物车服务 — API 接口封装
 */
const request = require('../utils/request')

/**
 * 获取购物车列表
 */
function getCartList() {
  return request.get('/api/v1/mp/cart')
}

/**
 * 添加商品到购物车
 * @param {Object} data - { product_id, sku_id, quantity }
 */
function addToCart(data) {
  return request.post('/api/v1/mp/cart', data)
}

/**
 * 更新购物车项
 * @param {string|number} id - 购物车项ID
 * @param {Object} data - { quantity, selected }
 */
function updateCartItem(id, data) {
  return request.put(`/api/v1/mp/cart/${id}`, data)
}

/**
 * 删除购物车项
 * @param {string|number} id - 购物车项ID
 */
function deleteCartItem(id) {
  return request.delete(`/api/v1/mp/cart/${id}`)
}

module.exports = {
  getCartList,
  addToCart,
  updateCartItem,
  deleteCartItem
}
