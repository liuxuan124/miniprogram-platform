export type PreviewActionPayload = {
  tab: string
  message: string
  detailType?: string
  detailTitle?: string
  detailDesc?: string
  formId?: string
  productId?: string | number
  previewPath?: string
}

export type PreviewLinkAction =
  | { kind: 'open-url'; url: string }
  | { kind: 'emit'; payload: PreviewActionPayload }
  | { kind: 'message'; message: string }

export function resolveJump(item: Record<string, unknown>) {
  const legacyLink = String(item.link || '').trim()
  let type = String(item.link_type || item.type || item.jump_type || item.action || '').trim()
  let target = String(item.link_url || item.target || item.jump_url || item.url || item.phone || '').trim()
  if (!type && legacyLink) {
    type = legacyLink.startsWith('http') ? 'url' : 'page'
    target = target || legacyLink
  }
  if (!target && legacyLink) target = legacyLink
  return { type, target }
}

function parsePathQuery(path: string) {
  const normalized = path.startsWith('/') ? path : `/${path}`
  const [pathname, query = ''] = normalized.split('?')
  const params = new URLSearchParams(query)
  return { pathname, params }
}

export function resolvePreviewLinkAction(
  item: Record<string, unknown>,
  label?: string,
): PreviewLinkAction | null {
  const { type, target } = resolveJump(item)
  const name = String(label || item.title || item.text || item.name || '导航').trim()

  if (type === 'phone') {
    const phone = target || String(item.phone || '').trim()
    if (!phone) return null
    return { kind: 'message', message: `预览环境：将拨打 ${phone}` }
  }

  if (!target) return null

  if (type === 'url' || type === 'webview' || /^https?:\/\//i.test(target)) {
    const url = /^https?:\/\//i.test(target) ? target : `https://${target}`
    return { kind: 'open-url', url }
  }

  if (type === 'miniapp') {
    return { kind: 'message', message: `预览环境：将打开小程序 ${target}` }
  }

  const { pathname, params } = parsePathQuery(target)

  if (pathname.includes('content-detail')) {
    return {
      kind: 'emit',
      payload: {
        tab: 'content',
        message: `已打开「${name}」`,
        detailType: 'content',
        detailTitle: name,
        detailDesc: '',
      },
    }
  }

  if (pathname.includes('product-detail')) {
    const productId = params.get('id') || undefined
    return {
      kind: 'emit',
      payload: {
        tab: 'product',
        message: `已打开「${name}」`,
        detailType: 'product',
        detailTitle: name,
        detailDesc: '',
        productId,
      },
    }
  }

  if (pathname.includes('activity-detail')) {
    return {
      kind: 'emit',
      payload: {
        tab: 'activity',
        message: `已打开「${name}」`,
        detailType: 'activity',
        detailTitle: name,
        detailDesc: '',
      },
    }
  }

  if (pathname.includes('content')) {
    return { kind: 'emit', payload: { tab: 'content', message: `已跳转「${name}」` } }
  }

  if (pathname.includes('product') || pathname.includes('knowledge-mall') || pathname.includes('mall')) {
    return { kind: 'emit', payload: { tab: 'shop', message: `已跳转「${name}」` } }
  }

  if (pathname.includes('activity')) {
    return {
      kind: 'emit',
      payload: {
        tab: 'activity',
        message: `已跳转「${name}」`,
        detailType: 'activity',
        detailTitle: name,
      },
    }
  }

  if (pathname.includes('mine')) {
    return { kind: 'emit', payload: { tab: 'mine', message: `已跳转「${name}」` } }
  }

  if (pathname.includes('member')) {
    return { kind: 'emit', payload: { tab: 'member', message: `已跳转「${name}」` } }
  }

  if (pathname.includes('index') || pathname.includes('/home')) {
    return { kind: 'emit', payload: { tab: 'home', message: `已跳转「${name}」` } }
  }

  if (pathname.includes('custom')) {
    const queryPath = params.get('path') || params.get('p') || ''
    const previewPath = queryPath || target.replace(/^\/+/, '')
    return {
      kind: 'emit',
      payload: {
        tab: 'home',
        message: `已打开「${name}」`,
        previewPath,
      },
    }
  }

  return { kind: 'message', message: `预览环境：小程序内将跳转「${target}」` }
}

export function runPreviewLinkAction(
  action: PreviewLinkAction,
  emit: (payload: PreviewActionPayload) => void,
) {
  if (action.kind === 'open-url') {
    window.open(action.url, '_blank', 'noopener,noreferrer')
    return
  }
  if (action.kind === 'emit') {
    emit(action.payload)
    return
  }
  return action.message
}
