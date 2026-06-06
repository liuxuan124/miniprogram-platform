// 表单预约相关API
const request = require('../utils/request')

// 获取表单模板
function getFormTemplate(templateId) {
  return request.get(`/api/v1/mp/form-templates/${templateId}`, {}, { auth: false })
}

// 提交表单
function submitForm(templateId, data) {
  return request.post(`/api/v1/mp/form-templates/${templateId}/submit`, data, { loading: true, loadingText: '提交中...' })
}

// 获取我的表单提交记录
function getMySubmissions(params) {
  return request.get('/api/v1/mp/form-submissions', params)
}

// 获取预约服务列表
function getAppointmentServices(params) {
  return request.get('/api/v1/mp/appointment-services', params, { auth: false })
}

// 获取预约时间段
function getAppointmentSlots(serviceId, params) {
  return request.get(`/api/v1/mp/appointment-services/${serviceId}/slots`, params, { auth: false })
}

// 创建预约
function createAppointment(data) {
  return request.post('/api/v1/mp/appointments', data, { loading: true, loadingText: '提交中...' })
}

// 获取我的预约列表
function getMyAppointments(params) {
  return request.get('/api/v1/mp/appointments', params)
}

// 取消预约
function cancelAppointment(id) {
  return request.put(`/api/v1/mp/appointments/${id}/cancel`, {})
}

module.exports = {
  getFormTemplate,
  submitForm,
  getMySubmissions,
  getAppointmentServices,
  getAppointmentSlots,
  createAppointment,
  getMyAppointments,
  cancelAppointment,
}
