// 会员中心相关API
const request = require('../utils/request')

// 获取会员信息
function getMemberInfo() {
  return request.get('/api/v1/mp/member/info', {}, { showError: false })
}

// 获取积分记录
function getPointsLog(params) {
  return request.get('/api/v1/mp/member/points-log', params)
}

// 获取优惠券列表
function getCouponList(params) {
  return request.get('/api/v1/mp/member/coupons', params)
}

// 签到
function signIn() {
  return request.post('/api/v1/mp/member/sign-in')
}

// 获取签到状态
function getSignInStatus() {
  return request.get('/api/v1/mp/member/sign-in/status')
}

module.exports = {
  getMemberInfo,
  getPointsLog,
  getCouponList,
  signIn,
  getSignInStatus,
}
