/**
 * 商品服务 — API 接口封装
 */
const request = require('../utils/request')

/**
 * 获取商品列表（公开）
 * @param {Object} params - { category_id, keyword, sort, page, page_size }
 */
function getProductList(params = {}) {
  return request.get('/api/v1/mp/products', params)
}

/**
 * 获取商品详情（公开）
 * @param {string|number} id - 商品ID
 */
function getProductDetail(id) {
  return request.get(`/api/v1/mp/products/${id}`)
}

/**
 * 获取商品分类树（公开）
 */
function getCategoryList() {
  return request.get('/api/v1/mp/product-categories', {}, { auth: false })
}

module.exports = {
  getProductList,
  getProductDetail,
  getCategoryList
}
