import { describe, expect, it } from 'vitest'
import {
  buildUnlockRows,
  demoPaywallPayload,
  interpolatePaywallCopy,
  normalizeUnlockMethods,
  shouldHidePaywall,
} from './dsl-paywall'

describe('dsl-paywall', () => {
  it('interpolates copy vars', () => {
    expect(
      interpolatePaywallCopy('还剩{剩余比例}，单篇{价格}，会员{会员价}', {
        remainPercent: '40%',
        price: '¥6',
        memberPrice: '免费',
      }),
    ).toBe('还剩40%，单篇¥6，会员免费')
  })

  it('normalizes unlock methods', () => {
    expect(normalizeUnlockMethods(['planet', 'vip', 'vip', 'bad'])).toEqual(['planet', 'vip'])
  })

  it('demo payload snapshot', () => {
    const demo = demoPaywallPayload()
    expect(demo.unlockOptions.length).toBe(3)
    expect(buildUnlockRows(['single'], { single_button: '立即购买' })[0].button_text).toBe('立即购买')
  })

  it('hide when unlocked', () => {
    expect(shouldHidePaywall('unlocked', 'hide')).toBe(true)
    expect(shouldHidePaywall('unlocked', 'banner')).toBe(false)
  })
})
