/** 从 axios / 业务错误取用户可读文案；拦截器已 toast 时返回空串 */
export function apiErrorMessage(err: unknown, fallback = '操作失败，请稍后重试'): string {
  if (!err || typeof err !== 'object') return fallback
  const e = err as { toastHandled?: boolean; response?: { data?: { message?: string } }; message?: string }
  if (e.toastHandled) return ''
  const biz = e.response?.data?.message
  if (biz && String(biz).trim()) return String(biz).trim()
  const msg = String(e.message || '')
  if (!msg || /^Request failed with status code \d+$/i.test(msg)) return fallback
  if (/^Network Error$/i.test(msg)) return '网络异常，请检查网络连接'
  return msg
}

export function shouldShowLocalError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return true
  return !(err as { toastHandled?: boolean }).toastHandled
}
