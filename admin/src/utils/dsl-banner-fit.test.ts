import { describe, it, expect } from 'vitest'
import {
  normalizeBannerProps,
  BANNER_INTERVAL,
  BANNER_CUSTOM_HEIGHT,
  BANNER_ASPECT_RATIO,
  BANNER_DEFAULT_PROPS,
} from '@/components/page-builder/banner/bannerSchema'

/**
 * 本轮（2026-10-06）复核 Banner 全量需求时补的用例。
 * 背景：需求点名的 5 个缺陷实测**大部分早已修复**，但补了两项真实缺口：
 *   - `image_error_placeholder` 后台可配但端上完全没消费（配了没效果）
 *   - `object_fit`（cover/contain）此前**根本不存在**，本轮新增
 * 这里锁住「新增字段不破坏老页面」这条底线。
 */
describe('bannerSchema · 间隔与尺寸边界（需求点名 Bug）', () => {
  it('🔴 间隔区间是 1000~8000 / 步长 500 / 默认 3000 —— 不存在 300ms 极值', () => {
    expect(BANNER_INTERVAL.min).toBe(1000)
    expect(BANNER_INTERVAL.max).toBe(8000)
    expect(BANNER_INTERVAL.step).toBe(500)
    expect(BANNER_INTERVAL.fallback).toBe(3000)
  })

  it('间隔非法值（300 / 0 / 空串）一律夹回 1000 以上，杜绝鬼畜轮播', () => {
    expect(normalizeBannerProps({ interval: 300 }).interval).toBe(1000)
    expect(normalizeBannerProps({ interval: 0 }).interval).toBe(1000)
    expect(normalizeBannerProps({ interval: '' }).interval).toBe(3000)
    expect(normalizeBannerProps({ interval: 99999 }).interval).toBe(8000)
    expect(normalizeBannerProps({}).interval).toBe(3000)
  })

  it('自定义高度被夹在 80~420', () => {
    expect(BANNER_CUSTOM_HEIGHT.min).toBe(80)
    expect(BANNER_CUSTOM_HEIGHT.max).toBe(420)
    expect(normalizeBannerProps({ aspect: 'custom', custom_height: 5 }).custom_height)
      .toBe(BANNER_CUSTOM_HEIGHT.min)
    expect(normalizeBannerProps({ aspect: 'custom', custom_height: 9999 }).custom_height)
      .toBe(BANNER_CUSTOM_HEIGHT.max)
  })

  it('预设比例齐全（16:9 / 4:3 / 2.35:1 / 1:1），供 aspect-ratio 防 CLS', () => {
    expect(Object.keys(BANNER_ASPECT_RATIO).sort()).toEqual(['16:9', '1:1', '2.35:1', '4:3'])
    // 全部为正数，避免 aspect-ratio: 0 导致高度塌陷
    for (const v of Object.values(BANNER_ASPECT_RATIO)) {
      expect(v).toBeGreaterThan(0)
    }
  })
})

describe('bannerSchema · 图片填充模式 object_fit（本轮新增）', () => {
  it('🔴 默认 cover —— 与端上历史行为（mode="aspectFill"）一致，老页面不会突然出现黑边', () => {
    expect(normalizeBannerProps({}).object_fit).toBe('cover')
    expect(BANNER_DEFAULT_PROPS.object_fit).toBe('cover')
    // 旧配置没有该字段时也必须是 cover
    expect(normalizeBannerProps({ images: [{ image: 'a.jpg' }] }).object_fit).toBe('cover')
  })

  it('显式配置 contain 生效，非法值回落 cover', () => {
    expect(normalizeBannerProps({ object_fit: 'contain' }).object_fit).toBe('contain')
    expect(normalizeBannerProps({ object_fit: 'fill' }).object_fit).toBe('cover')
    expect(normalizeBannerProps({ object_fit: '' }).object_fit).toBe('cover')
  })
})

describe('bannerSchema · 占位图兜底字段（本轮补齐端上消费）', () => {
  it('image_error_placeholder 缺省为空串（不配置即不启用）', () => {
    expect(normalizeBannerProps({}).image_error_placeholder).toBe('')
  })

  it('显式配置被保留并去除首尾空格', () => {
    expect(normalizeBannerProps({ image_error_placeholder: '  /uploads/ph.jpg ' }).image_error_placeholder)
      .toBe('/uploads/ph.jpg')
  })
})
