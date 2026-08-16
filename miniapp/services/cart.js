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
 * @param {Object} data - { productId|product_id, skuId|sku_id, quantity }
 */
function addToCart(data = {}) {
  const payload = {
    productId: Number(data.productId != null ? data.productId : data.product_id),
    quantity: Math.max(1, parseInt(data.quantity, 10) || 1),
  }
  const skuRaw = data.skuId != null ? data.skuId : data.sku_id
  if (skuRaw !== undefined && skuRaw !== null && skuRaw !== '') {
    payload.skuId = Number(skuRaw)
  }
  if (!payload.productId || Number.isNaN(payload.productId)) {
    return Promise.reject({ code: 400, message: '商品ID无效' })
  }
  return request.post('/api/v1/mp/cart', payload, { showError: false })
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
