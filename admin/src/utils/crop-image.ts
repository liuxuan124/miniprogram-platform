/** 裁剪时拉取图片：优先走同源 /uploads 代理，避免 canvas 跨域污染 */
export function toCropFetchUrl(url: string): string {
  if (!url) return url
  const uploadsMatch = url.match(/(\/uploads\/[^\?#]+)/)
  if (uploadsMatch) return uploadsMatch[1]
  if (url.startsWith('/uploads/')) return url
  return url
}

export async function fetchImageBlob(url: string): Promise<Blob> {
  const primary = toCropFetchUrl(url)
  const candidates = primary === url ? [url] : [primary, url]
  let lastError: Error | null = null
  for (const candidate of candidates) {
    try {
      const res = await fetch(candidate)
      if (!res.ok) {
        lastError = new Error(`图片加载失败 (${res.status})`)
        continue
      }
      const blob = await res.blob()
      if (!blob.type.startsWith('image/')) {
        lastError = new Error('不是有效的图片文件')
        continue
      }
      return blob
    } catch (e: any) {
      lastError = e instanceof Error ? e : new Error(String(e))
    }
  }
  throw lastError || new Error('图片加载失败，无法裁剪')
}

export function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('图片解码失败'))
    img.src = url
  })
}
