// utils/request.js — 请求封装
// 统一 Token 注入、错误处理、401 自动跳转登录、请求/响应拦截

const { AuthUtil } = require('./auth')

// ========== 配置 ==========
const PROD_BASE_URL = 'https://api.zfculture.site'

function resolveDevelopBaseUrl() {
  try {
    return require('./dev-config').resolveDevelopBaseUrl()
  } catch (e) {
    return 'http://127.0.0.1:8080'
  }
}

function resolveBaseUrl() {
  try {
    const custom = wx.getStorageSync('api_base_url')
    if (custom && typeof custom === 'string') {
      return custom.replace(/\/$/, '')
    }
  } catch (e) {
    // ignore
  }
  try {
    const envVersion = wx.getAccountInfoSync().miniProgram.envVersion
    if (envVersion === 'develop') {
      return resolveDevelopBaseUrl()
    }
  } catch (e) {
    // ignore
  }
  return PROD_BASE_URL
}

const BASE_URL = resolveBaseUrl()
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
    showError = true,
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
            _handleUnauthorized(showError)
            reject({ code: 401, message: '登录已过期，请重新登录' })
          } else {
            const errMsg = responseData.message || '请求失败'
            if (showError) _showError(errMsg)
            reject({ code: responseData.code, message: errMsg })
          }
        } else if (statusCode === 401 || statusCode === 403) {
          if (statusCode === 403) {
            if (showError) _showError('无权限访问')
            reject({ code: 403, message: '无权限访问' })
            return
          }
          if (auth) {
            _handleUnauthorized(showError)
          } else if (showError) {
            _showError('登录已过期，请重新登录')
          }
          reject({ code: statusCode, message: '登录已过期' })
        } else if (statusCode === 404) {
          const errMsg = (responseData && responseData.message) || '请求资源不存在'
          if (showError) _showError(errMsg)
          reject({ code: (responseData && responseData.code) || 404, message: errMsg })
        } else if (statusCode >= 500) {
          if (showError) _showError('服务器异常，请稍后重试')
          reject({ code: statusCode, message: '服务器异常' })
        } else {
          // 400/422 等参数错误
          const errMsg = (responseData && responseData.message) || `请求失败(${statusCode})`
          if (showError) _showError(errMsg)
          reject({ code: statusCode, message: errMsg })
        }
      },
      fail(err) {
        if (loading) wx.hideLoading()

        // 网络错误（尊重 showError，避免上传 Base64 回退双 toast）
        if (showError) {
          if (err.errMsg && err.errMsg.indexOf('timeout') !== -1) {
            _showError('请求超时，请检查网络')
          } else {
            _showError('网络异常，请检查网络连接')
          }
        }
        reject({ code: -1, message: '网络异常', statusCode: 'NETWORK', error: err })
      },
    })
  })
}

/**
 * 处理 401 未授权
 * - 清除本地登录态
 * - 跳转登录页
 */
function _handleUnauthorized(showError = true) {
  const app = getApp()
  if (app) {
    app.clearAuthState()
  } else {
    AuthUtil.clearAuth()
  }

  // 防止多个 401/403 弹出多个提示
  if (!showError || isRefreshing) {
    return
  }

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

function resolveUploadToken() {
  try {
    const app = getApp()
    const fromApp = app && app.globalData && app.globalData.token
    if (fromApp) return fromApp
  } catch (e) { /* ignore */ }
  return AuthUtil.getToken()
}

function classifyUploadError(err) {
  const status = err && (err.statusCode !== undefined ? err.statusCode : err.code)
  const raw = String((err && (err.message || err.errMsg || err.msg)) || '')
  if (status === 401 || status === 403 || status === 110101 || /未登录|登录已过期|无权限/i.test(raw)) {
    return 'auth'
  }
  if (/domain list|合法域名|url not in domain|not in domain list/i.test(raw)) {
    return 'domain'
  }
  if (
    status === 'FILE'
    || /本地文件不可读|file not exist|no such file|fail path|ENOENT|不存在|已失效|路径为空/i.test(raw)
  ) {
    return 'file'
  }
  if (status === 'NETWORK' || /timeout|NETWORK_ERROR|网络异常/i.test(raw)) {
    return 'network'
  }
  if (/uploadFile:fail/i.test(raw)) {
    if (/domain/i.test(raw)) return 'domain'
    if (/file|path|exist|read|denied/i.test(raw)) return 'file'
    return 'client'
  }
  return 'business'
}

function uploadErrorMessage(kind, err) {
  if (kind === 'auth') return '登录已失效，请重新登录'
  if (kind === 'domain') return '上传域名未配置，请联系管理员'
  if (kind === 'file') return '头像文件已失效，请重新选择'
  if (kind === 'network') return '网络异常，头像上传失败'
  if (kind === 'client') return '头像上传未发出，请重试'
  const raw = String((err && (err.message || err.msg)) || '').trim()
  if (raw && !/uploadFile:fail|网络异常/i.test(raw)) return raw.slice(0, 40)
  return '头像上传失败，请重试'
}

function readFileAsBase64(filePath) {
  return new Promise((resolve, reject) => {
    try {
      const fs = wx.getFileSystemManager()
      fs.readFile({
        filePath,
        encoding: 'base64',
        success(res) {
          resolve(res && res.data)
        },
        fail(err) {
          reject({
            code: -1,
            message: '本地文件不可读',
            statusCode: 'FILE',
            errMsg: (err && err.errMsg) || '',
            error: err,
          })
        },
      })
    } catch (e) {
      reject({ code: -1, message: '本地文件不可读', statusCode: 'FILE', error: e })
    }
  })
}

/** 走 wx.request 的 Base64 上传（request 合法域名；规避 uploadFile 域名未配） */
function uploadViaBase64(filePath, options = {}) {
  const {
    formData = {},
    showError = true,
    auth = true,
  } = options
  const extMatch = String(filePath || '').match(/\.([a-zA-Z0-9]{1,8})(?:\?|#|$)/)
  const ext = (extMatch && extMatch[1].toLowerCase()) || 'jpg'
  const fileName = `upload.${ext}`
  const subDir = (formData && formData.subDir) || 'mp'

  return readFileAsBase64(filePath).then((contentBase64) => {
    if (!contentBase64) {
      const err = { code: -1, message: '本地文件不可读', statusCode: 'FILE' }
      if (showError) _showError(uploadErrorMessage('file', err))
      return Promise.reject(err)
    }
    return post(
      '/api/v1/mp/upload-base64',
      { contentBase64, fileName, subDir },
      { auth, showError }
    )
  })
}

/** 文件上传（multipart；失败时自动 Base64 回退） */
function upload(filePath, options = {}) {
  const {
    name = 'file',
    url = '/api/upload',
    formData = {},
    showError = true,
    auth = true,
  } = options

  return new Promise((resolve, reject) => {
    if (!filePath) {
      const err = { code: -1, message: '上传文件路径为空', statusCode: 'FILE' }
      if (showError) _showError(uploadErrorMessage('file', err))
      reject(err)
      return
    }

    const header = {}
    if (auth) {
      const token = resolveUploadToken()
      if (!token) {
        const err = { code: 401, message: '未登录', statusCode: 401 }
        if (showError) _showError(uploadErrorMessage('auth', err))
        reject(err)
        return
      }
      header.Authorization = 'Bearer ' + token
    }

    const finishFail = (err) => {
      const kind = classifyUploadError(err)
      const message = uploadErrorMessage(kind, err)
      if (showError) _showError(message)
      reject({
        ...(err || {}),
        message,
        kind,
        statusCode: (err && err.statusCode) || (kind === 'network' ? 'NETWORK' : err && err.code),
      })
    }

    wx.uploadFile({
      url: url.startsWith('http') ? url : BASE_URL + url,
      filePath,
      name,
      formData,
      header,
      success(res) {
        const statusCode = res.statusCode
        if (statusCode === 401 || statusCode === 403) {
          finishFail({
            code: statusCode,
            message: statusCode === 403 ? '无权限访问' : '未登录',
            statusCode,
          })
          return
        }
        try {
          const data = JSON.parse(res.data)
          if (data.code === 0 || data.code === 200) {
            resolve(data.data)
          } else {
            finishFail({ ...data, statusCode })
          }
        } catch (e) {
          finishFail({ message: '上传失败', statusCode, error: e })
        }
      },
      fail(err) {
        // multipart 未发出（常见：uploadFile 合法域名未配 / 本地路径失效）→ Base64 走 request 域名
        uploadViaBase64(filePath, { formData, showError: false, auth })
          .then(resolve)
          .catch((fallbackErr) => {
            const primary = {
              ...(err || {}),
              message: (err && (err.errMsg || err.message)) || '网络异常，上传失败',
              statusCode: 'NETWORK',
            }
            if (fallbackErr && fallbackErr.statusCode === 'FILE') {
              finishFail(fallbackErr)
            } else if (fallbackErr && fallbackErr.code && fallbackErr.code !== -1) {
              finishFail(fallbackErr)
            } else {
              finishFail(primary)
            }
          })
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
  classifyUploadError,
  uploadErrorMessage,
  BASE_URL,
}
