// utils/request.js — 请求封装
// 统一 Token 注入、错误处理、401 自动跳转登录、请求/响应拦截

const { AuthUtil } = require('./auth')

// ========== 配置 ==========
// 生产 / 真机调试接口地址
// 本地开发可临时改为：http://127.0.0.1:8080
const BASE_URL = 'http://127.0.0.1:8080'
const TIMEOUT = 15000 // 请求超时时间（ms）

// ========== 请求队列（Token 刷新时排队） ==========
let isRefreshing = false
let pendingRequests = []

function addPendingRequest(resolve) {
  pendingRequests.push(resolve)
}

function resolvePendingRequests(token) {
  pendingRequests.forEach((resolve) => resolve(token))
  pendingRequests = []
}

function rejectPendingRequests(err) {
  pendingRequests.forEach((resolve) => resolve(null))
  pendingRequests = []
}

/**
 * 核心请求方法
 * @param {Object} options
 * @param {string} options.url      接口路径（相对路径，会拼接 BASE_URL）
 * @param {string} [options.method] 请求方法，默认 GET
 * @param {Object} [options.data]   请求数据
 * @param {Object} [options.header] 自定义请求头
 * @param {boolean} [options.auth]  是否需要 Token，默认 true
 * @param {boolean} [options.loading] 是否显示 Loading，默认 false
 * @param {string} [options.loadingText] Loading 文案
 * @returns {Promise}
 */
function request(options) {
  const {
    url,
    method = 'GET',
    data = {},
    header = {},
    auth = true,
    loading = false,
    loadingText = '加载中...',
  } = options

  // 显示 Loading
  if (loading) {
    wx.showLoading({ title: loadingText, mask: true })
  }

  return new Promise((resolve, reject) => {
    // 构建请求头
    const requestHeader = {
      'Content-Type': 'application/json',
      ...header,
    }

    // 注入 Token
    if (auth) {
      const token = AuthUtil.getToken()
      if (token) {
        requestHeader['Authorization'] = 'Bearer ' + token
      }
    }

    wx.request({
      url: url.startsWith('http') ? url : BASE_URL + url,
      method,
      data,
      header: requestHeader,
      timeout: TIMEOUT,
      success(res) {
        if (loading) wx.hideLoading()

        const statusCode = res.statusCode
        const responseData = res.data

        // HTTP 状态码处理
        if (statusCode === 200) {
          // 业务状态码处理（约定后端返回 { code, data, message } 格式）
          if (responseData.code === 0 || responseData.code === 200) {
            resolve(responseData.data)
          } else if (responseData.code === 401) {
            _handleUnauthorized()
            reject({ code: 401, message: '登录已过期，请重新登录' })
          } else {
            const errMsg = responseData.message || '请求失败'
            _showError(errMsg)
            reject({ code: responseData.code, message: errMsg })
          }
        } else if (statusCode === 401) {
          _handleUnauthorized()
          reject({ code: 401, message: '登录已过期，请重新登录' })
        } else if (statusCode === 403) {
          _showError('无权限访问')
          reject({ code: 403, message: '无权限访问' })
        } else if (statusCode === 404) {
          _showError('请求资源不存在')
          reject({ code: 404, message: '请求资源不存在' })
        } else if (statusCode >= 500) {
          _showError('服务器异常，请稍后重试')
          reject({ code: statusCode, message: '服务器异常' })
        } else {
          // 422/400 等客户端参数错误：开发环境静默处理（如微信登录 code 无效）
          console.warn(`[Request] ${url} 返回 ${statusCode}`, responseData?.message || '')
          reject({ code: statusCode, message: responseData?.message || `请求失败(${statusCode})` })
        }
      },
      fail(err) {
        if (loading) wx.hideLoading()

        // 网络错误
        if (err.errMsg && err.errMsg.indexOf('timeout') !== -1) {
          _showError('请求超时，请检查网络')
        } else {
          _showError('网络异常，请检查网络连接')
        }
        reject({ code: -1, message: '网络异常', error: err })
      },
    })
  })
}

/**
 * 处理 401 未授权
 * - 清除本地登录态
 * - 跳转登录页
 */
function _handleUnauthorized() {
  const app = getApp()
  if (app) {
    app.clearAuthState()
  } else {
    AuthUtil.clearAuth()
  }

  // 防止多个 401 弹出多个提示
  if (!isRefreshing) {
    isRefreshing = true
    wx.showToast({
      title: '登录已过期',
      icon: 'none',
      duration: 1500,
      complete() {
        isRefreshing = false
        AuthUtil.navigateToLogin()
      },
    })
  }
}

/**
 * 显示错误提示
 * @param {string} message
 */
function _showError(message) {
  wx.showToast({
    title: message,
    icon: 'none',
    duration: 2000,
  })
}

// ========== 便捷方法 ==========

/** GET 请求 */
function get(url, data, options = {}) {
  return request({ url, method: 'GET', data, ...options })
}

/** POST 请求 */
function post(url, data, options = {}) {
  return request({ url, method: 'POST', data, ...options })
}

/** PUT 请求 */
function put(url, data, options = {}) {
  return request({ url, method: 'PUT', data, ...options })
}

/** DELETE 请求 */
function del(url, data, options = {}) {
  return request({ url, method: 'DELETE', data, ...options })
}

/** 文件上传 */
function upload(filePath, options = {}) {
  const { name = 'file', url = '/api/upload', formData = {} } = options

  return new Promise((resolve, reject) => {
    const token = AuthUtil.getToken()
    const header = {}
    if (token) {
      header['Authorization'] = 'Bearer ' + token
    }

    wx.uploadFile({
      url: url.startsWith('http') ? url : BASE_URL + url,
      filePath,
      name,
      formData,
      header,
      success(res) {
        try {
          const data = JSON.parse(res.data)
          if (data.code === 0 || data.code === 200) {
            resolve(data.data)
          } else {
            _showError(data.message || '上传失败')
            reject(data)
          }
        } catch (e) {
          _showError('上传失败')
          reject(e)
        }
      },
      fail(err) {
        _showError('网络异常，上传失败')
        reject(err)
      },
    })
  })
}

module.exports = {
  request,
  get,
  post,
  put,
  del,
  upload,
  BASE_URL,
}
