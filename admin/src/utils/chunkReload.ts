const RELOAD_KEY = 'admin_chunk_reload_once'

const CHUNK_FAIL =
  /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk .* failed/i

export function isChunkLoadError(message: string): boolean {
  return CHUNK_FAIL.test(message)
}

/** 部署后旧 HTML 引用缺失 chunk 时，整页刷新一次（避免无限循环） */
export function reloadOnceForChunkError(reason: string): boolean {
  if (!CHUNK_FAIL.test(reason)) return false
  try {
    if (sessionStorage.getItem(RELOAD_KEY) === '1') return false
    sessionStorage.setItem(RELOAD_KEY, '1')
  } catch {
    /* ignore */
  }
  window.location.reload()
  return true
}

export function clearChunkReloadFlag(): void {
  try {
    sessionStorage.removeItem(RELOAD_KEY)
  } catch {
    /* ignore */
  }
}

export function setupChunkReloadHandlers(router: { onError: (handler: (err: Error) => void) => void }): void {
  router.onError((err) => {
    const msg = String(err?.message || err || '')
    reloadOnceForChunkError(msg)
  })

  window.addEventListener('vite:preloadError', (event) => {
    const ev = event as unknown as { payload?: { message?: string }; message?: string; preventDefault?: () => void }
    const msg = String(ev.payload?.message || ev.message || 'chunk preload')
    if (reloadOnceForChunkError(msg)) {
      ev.preventDefault?.()
    }
  })
}
