/** 付费墙文案变量与解锁方式排序 */

export type PaywallUnlockMethod = 'vip' | 'single' | 'planet' | 'invite' | 'points'

export type PaywallUnlockRow = {
  method: PaywallUnlockMethod
  label: string
  button_text: string
  link?: string
  price?: string
}

export type PaywallPreviewIdentity = 'guest' | 'logged_unpaid' | 'unlocked'

const DEFAULT_METHOD_LABELS: Record<PaywallUnlockMethod, string> = {
  vip: '开通会员',
  single: '购买本篇',
  planet: '加入星球',
  invite: '邀请解锁',
  points: '积分兑换',
}

export function normalizeUnlockMethods(raw: unknown): PaywallUnlockMethod[] {
  const list = Array.isArray(raw) ? raw : ['vip', 'single', 'planet']
  const out: PaywallUnlockMethod[] = []
  for (const m of list) {
    const key = String(m || '').trim() as PaywallUnlockMethod
    if (key && DEFAULT_METHOD_LABELS[key] && !out.includes(key)) out.push(key)
  }
  return out.length ? out : ['vip', 'single']
}

export function buildUnlockRows(
  methods: PaywallUnlockMethod[],
  overrides: Record<string, string> = {},
  paywall?: { price?: string; memberPrice?: string },
): PaywallUnlockRow[] {
  return methods.map((method) => ({
    method,
    label: overrides[`${method}_label`] || DEFAULT_METHOD_LABELS[method],
    button_text: overrides[`${method}_button`] || DEFAULT_METHOD_LABELS[method],
    link: overrides[`${method}_link`] || '',
    price: method === 'single' ? paywall?.price : method === 'vip' ? paywall?.memberPrice : undefined,
  }))
}

export function interpolatePaywallCopy(
  template: string,
  vars: { remainPercent?: number | string; price?: string; memberPrice?: string },
): string {
  let text = String(template || '')
  text = text.replace(/\{剩余比例\}/g, String(vars.remainPercent ?? '30%'))
  text = text.replace(/\{价格\}/g, String(vars.price ?? '¥9.9'))
  text = text.replace(/\{会员价\}/g, String(vars.memberPrice ?? '会员免费'))
  return text
}

export function demoPaywallPayload(): {
  remainPercent: number
  price: string
  memberPrice: string
  unlockOptions: PaywallUnlockRow[]
} {
  return {
    remainPercent: 32,
    price: '9.9',
    memberPrice: '0',
    unlockOptions: buildUnlockRows(['vip', 'single', 'planet'], {}, { price: '9.9', memberPrice: '0' }),
  }
}

export function shouldHidePaywall(identity: PaywallPreviewIdentity, unlockedBehavior: string): boolean {
  if (identity !== 'unlocked') return false
  return unlockedBehavior !== 'banner'
}
