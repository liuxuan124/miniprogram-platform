/**
 * 商品评价服务
 */
const { get, post } = require('../utils/request')

function getProductReviews(productId, params = {}) {
  return get(`/api/v1/mp/products/${productId}/reviews`, params, { auth: false })
}

function createReview(data) {
  return post('/api/v1/mp/reviews', data)
}

module.exports = {
  getProductReviews,
  createReview,
}
