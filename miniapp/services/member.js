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

// 签到
function signIn() {
  return request.post('/api/v1/mp/member/sign-in')
}

// 获取签到状态（后端暂无该端点，404 时静默回退 null，由页面侧按未签到展示）
function getSignInStatus() {
  return request.get('/api/v1/mp/member/sign-in/status', {}, { showError: false }).catch(() => null)
}

module.exports = {
  getMemberInfo,
  getPointsLog,
  signIn,
  getSignInStatus,
}
