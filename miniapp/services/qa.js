const request = require('../utils/request')

function listQuestions(params = {}) {
  return request.get('/api/v1/mp/questions', params, { auth: false })
}

function getQuestionDetail(id) {
  return request.get(`/api/v1/mp/questions/${id}`, {}, { auth: false })
}

function createQuestion(data) {
  return request.post('/api/v1/mp/questions', data, { showError: true })
}

function listMyQuestions(params = {}) {
  return request.get('/api/v1/mp/questions/my', params)
}

module.exports = {
  listQuestions,
  getQuestionDetail,
  createQuestion,
  listMyQuestions,
}
