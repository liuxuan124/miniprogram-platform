const DEFAULT_METHOD_LABELS = {
  vip: '开通会员',
  single: '购买本篇',
  planet: '加入星球',
  invite: '邀请解锁',
  points: '积分兑换',
}

function normalizeUnlockMethods(raw) {
  const list = Array.isArray(raw) ? raw : ['vip', 'single', 'planet']
  const out = []
  for (let i = 0; i < list.length; i += 1) {
    const key = String(list[i] || '').trim()
    if (key && DEFAULT_METHOD_LABELS[key] && out.indexOf(key) < 0) out.push(key)
  }
  return out.length ? out : ['vip', 'single']
}

function buildUnlockRows(methods, overrides, paywall) {
  const o = overrides || {}
  const pw = paywall || {}
  return methods.map((method) => ({
    method,
    label: o[`${method}_label`] || DEFAULT_METHOD_LABELS[method],
    button_text: o[`${method}_button`] || DEFAULT_METHOD_LABELS[method],
    link: o[`${method}_link`] || '',
    price: method === 'single' ? pw.price : method === 'vip' ? pw.memberPrice : undefined,
  }))
}

function interpolatePaywallCopy(template, vars) {
  let text = String(template || '')
  const v = vars || {}
  text = text.replace(/\{剩余比例\}/g, String(v.remainPercent != null ? v.remainPercent : '30%'))
  text = text.replace(/\{价格\}/g, String(v.price != null ? v.price : '¥9.9'))
  text = text.replace(/\{会员价\}/g, String(v.memberPrice != null ? v.memberPrice : '会员免费'))
  return text
}

function mapApiUnlockOptions(apiOptions, methods, overrides) {
  const rows = buildUnlockRows(methods, overrides, {})
  if (!Array.isArray(apiOptions) || !apiOptions.length) return rows
  return rows.map((row) => {
    const hit = apiOptions.find((o) => String(o.type || o.method || '').toLowerCase() === row.method)
    if (!hit) return row
    return {
      ...row,
      label: hit.label || hit.title || row.label,
      button_text: hit.buttonText || hit.button_text || row.button_text,
      link: hit.link || hit.linkUrl || hit.link_url || row.link,
      price: hit.price != null ? String(hit.price) : row.price,
    }
  })
}

module.exports = {
  normalizeUnlockMethods,
  buildUnlockRows,
  interpolatePaywallCopy,
  mapApiUnlockOptions,
}
