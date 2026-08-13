/** 组件标题/副文字号内联样式 */
export function titleFontStyle(size: unknown, fallback: number): Record<string, string> {
  const n = Number(size)
  return { fontSize: `${Number.isFinite(n) && n > 0 ? n : fallback}px` }
}
