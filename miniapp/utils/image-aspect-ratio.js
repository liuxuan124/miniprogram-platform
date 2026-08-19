function parseAspectRatio(value) {
  if (value == null || value === '' || value === 'auto') return null
  const str = String(value).trim()
  const m = str.match(/^(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)$/)
  if (!m) return null
  const w = Number(m[1])
  const h = Number(m[2])
  if (!Number.isFinite(w) || !Number.isFinite(h) || h === 0) return null
  return w / h
}

/** 固定比例容器样式（padding-bottom 兼容） */
function aspectRatioBoxStyle(value) {
  const ratio = parseAspectRatio(value)
  if (ratio == null) return ''
  const pct = (100 / ratio).toFixed(4)
  return 'position:relative;width:100%;height:0;padding-bottom:' + pct + '%;overflow:hidden;'
}

function aspectRatioFillStyle() {
  return 'position:absolute;left:0;top:0;width:100%;height:100%;'
}

module.exports = {
  parseAspectRatio,
  aspectRatioBoxStyle,
  aspectRatioFillStyle,
}
