/**
 * 预约服务 — API 接口封装
 */
const request = require('../utils/request')

/**
 * 获取预约服务列表（公开）
 * @param {Object} params - { keyword, page, page_size }
 */
function getAppointmentServices(params = {}) {
  return request.get('/api/v1/mp/appointment-services', params, { auth: false })
}

/**
 * 获取可用时段
 * @param {string|number} serviceId - 预约服务ID
 * @param {Object} params - { date } 可选指定日期
 */
function getAvailableSlots(serviceId, params = {}) {
  return request.get(`/api/v1/mp/appointment-services/${serviceId}/slots`, params, { auth: false })
}

/**
 * 创建预约
 * @param {Object} data - { service_id, date, slot, contact_name, contact_phone, remark }
 */
function createAppointment(data) {
  return request.post('/api/v1/mp/appointments', data, { loading: true, loadingText: '提交中...' })
}

/**
 * 获取我的预约列表
 * @param {Object} params - { status, page, page_size }
 */
function getMyAppointments(params = {}) {
  return request.get('/api/v1/mp/appointments', params)
}

/**
 * 取消预约
 * @param {string|number} id - 预约ID
 */
function cancelAppointment(id) {
  return request.put(`/api/v1/mp/appointments/${id}/cancel`, {})
}

module.exports = {
  getAppointmentServices,
  getAvailableSlots,
  createAppointment,
  getMyAppointments,
  cancelAppointment
}
