/**
 * Axios 请求封装
 * - 统一请求/响应拦截
 * - Token 自动注入
 * - 错误统一处理
 * - 401 自动跳转登录
 */
import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getToken, removeToken } from '@/utils/auth'
import router from '@/router'
import type { ApiResponse } from '@/types/global'

declare module 'axios' {
  interface AxiosRequestConfig {
    showError?: boolean
  }
  interface InternalAxiosRequestConfig {
    showError?: boolean
  }
}

/** 创建 Axios 实例 */
const service: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

/** 请求拦截器 */
service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 上传场景：FormData 必须交给浏览器自动设置 Content-Type(boundary)
    // 否则会被默认 application/json 覆盖，后端拿不到 multipart file
    if (typeof FormData !== 'undefined' && config.data instanceof FormData && config.headers) {
      delete (config.headers as any)['Content-Type']
      delete (config.headers as any)['content-type']
    }

    const token = getToken()
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    console.error('请求错误:', error)
    return Promise.reject(error)
  }
)

/** 是否正在刷新登录提示 */
let isRefreshing = false
/** 错误消息防抖：避免同一错误重复弹出 */
const recentErrors = new Map<string, number>()
const ERROR_DEBOUNCE_MS = 3000

function showErrorDebounced(message: string) {
  const now = Date.now()
  const lastShown = recentErrors.get(message)
  if (lastShown && now - lastShown < ERROR_DEBOUNCE_MS) {
    return
  }
  recentErrors.set(message, now)
  ElMessage.error(message)
  setTimeout(() => recentErrors.delete(message), ERROR_DEBOUNCE_MS)
}

/** 响应拦截器 */
service.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const res = response.data

    // 后端当前约定 code=200 表示成功，兼容早期 code=0。
    if (res.code !== 0 && res.code !== 200) {
      // 检查是否为静默模式（不显示错误提示）
      const showError = response.config.showError !== false
      if (showError) {
        showErrorDebounced(res.message || '请求失败')
      }

      // Token 过期 / 未授权（始终处理，即使静默模式）
      if (res.code === 401) {
        if (!isRefreshing) {
          isRefreshing = true
          ElMessageBox.confirm('登录已过期，请重新登录', '提示', {
            confirmButtonText: '重新登录',
            cancelButtonText: '取消',
            type: 'warning',
          })
          .then(() => {
            removeToken()
            router.push('/login')
          })
          .finally(() => {
            isRefreshing = false
          })
        }
        return Promise.reject(new Error(res.message || '未授权'))
      }

      return Promise.reject(new Error(res.message || '请求失败'))
    }

    return res as any
  },
  (error) => {
    const { response } = error
    // 检查是否为静默模式
    const showError = error.config?.showError !== false

    if (response) {
      const statusMessages: Record<number, string> = {
        400: '请求参数错误',
        401: '未授权，请重新登录',
        403: '拒绝访问',
        404: '请求资源不存在',
        408: '请求超时',
        500: '服务器内部错误',
        502: '网关错误',
        503: '服务不可用',
        504: '网关超时',
      }
      if (showError) {
        const message = statusMessages[response.status] || `请求失败 (${response.status})`
        showErrorDebounced(message)
      }

      if (response.status === 401) {
        removeToken()
        router.push('/login')
      }
    } else if (error.code === 'ECONNABORTED') {
      if (showError) showErrorDebounced('请求超时，请稍后重试')
    } else {
      if (showError) showErrorDebounced('网络异常，请检查网络连接')
    }
    return Promise.reject(error)
  }
)

/** 通用请求方法封装 */
export function request<T = any>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
  return service(config) as unknown as Promise<ApiResponse<T>>
}

/** GET 请求 */
export function get<T = any>(url: string, params?: Record<string, any>, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
  return request<T>({ method: 'GET', url, params, ...config })
}

/** POST 请求 */
export function post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
  return request<T>({ method: 'POST', url, data, ...config })
}

/** PUT 请求 */
export function put<T = any>(url: string, data?: Record<string, any>, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
  return request<T>({ method: 'PUT', url, data, ...config })
}

/** DELETE 请求 */
export function del<T = any>(url: string, params?: Record<string, any>, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
  return request<T>({ method: 'DELETE', url, params, ...config })
}

export default service
