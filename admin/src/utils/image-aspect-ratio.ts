/** 图片组件常用展示比例 */
export type ImageAspectRatioValue =
  | 'auto'
  | '21:9'
  | '16:9'
  | '2:1'
  | '4:3'
  | '3:2'
  | '1:1'
  | '3:4'
  | '9:16'

export const IMAGE_ASPECT_RATIO_OPTIONS: Array<{ label: string; value: ImageAspectRatioValue }> = [
  { label: '自适应（原图比例）', value: 'auto' },
  { label: '21:9 超宽屏', value: '21:9' },
  { label: '16:9 宽屏', value: '16:9' },
  { label: '2:1 横幅', value: '2:1' },
  { label: '4:3 标准', value: '4:3' },
  { label: '3:2 相机', value: '3:2' },
  { label: '1:1 方形', value: '1:1' },
  { label: '3:4 竖版', value: '3:4' },
  { label: '9:16 竖屏', value: '9:16' },
]

export function parseAspectRatio(value: unknown): number | null {
  if (value == null || value === '' || value === 'auto') return null
  const str = String(value).trim()
  const m = str.match(/^(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)$/)
  if (!m) return null
  const w = Number(m[1])
  const h = Number(m[2])
  if (!Number.isFinite(w) || !Number.isFinite(h) || h === 0) return null
  return w / h
}

/** CSS aspect-ratio 值，如 `16 / 9` */
export function aspectRatioCss(value: unknown): string | undefined {
  if (value == null || value === '' || value === 'auto') return undefined
  const str = String(value).trim()
  const m = str.match(/^(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)$/)
  if (!m) return undefined
  return `${m[1]} / ${m[2]}`
}

export function normalizeAspectRatio(value: unknown): ImageAspectRatioValue {
  const raw = String(value ?? '16:9').trim() as ImageAspectRatioValue
  return IMAGE_ASPECT_RATIO_OPTIONS.some((o) => o.value === raw) ? raw : '16:9'
}
