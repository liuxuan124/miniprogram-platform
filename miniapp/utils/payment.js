function isFreePayResponse(res) {
  if (!res || typeof res !== 'object') return false
  return res.free === true || res.free === 'true' || res.freeOrder === true
}

function normalizePaymentParams(res) {
  const params = (res && (res.payment || res.pay_params)) || res || {}
  return {
    timeStamp: String(params.timeStamp || params.timestamp || ''),
    nonceStr: params.nonceStr || params.nonce_str || '',
    package: params.package || (params.prepayId ? `prepay_id=${params.prepayId}` : ''),
    signType: params.signType || params.sign_type || 'RSA',
    paySign: params.paySign || params.pay_sign || '',
  }
}

function requestPayment(res) {
  // 后端对实付 0 元直接完成，无需调起微信支付
  if (isFreePayResponse(res)) {
    return Promise.resolve({ free: true })
  }
  const params = normalizePaymentParams(res)
  if (!params.timeStamp || !params.nonceStr || !params.package || !params.paySign) {
    return Promise.reject({ code: 'INVALID_PAY_PARAMS', message: '支付参数不完整' })
  }
  return new Promise((resolve, reject) => {
    wx.requestPayment({
      ...params,
      success: resolve,
      fail: reject,
    })
  })
}

module.exports = { normalizePaymentParams, requestPayment, isFreePayResponse }
