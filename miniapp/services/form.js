/**
 * 表单服务 — API 接口封装
 */
const request = require('../utils/request')

/**
 * 获取表单模板（公开）
 * @param {string|number} id - 表单模板ID
 */
function getFormTemplate(id) {
  return request.get(`/api/v1/mp/form-templates/${id}`, {}, { auth: false })
}

/**
 * 提交表单
 * @param {string|number} id - 表单模板ID
 * @param {Object} data - 表单数据 { fields: { key: value, ... } }
 */
function submitForm(id, data) {
  return request.post(`/api/v1/mp/form-templates/${id}/submit`, data, { loading: true, loadingText: '提交中...' })
}

module.exports = {
  getFormTemplate,
  submitForm
}
