import { describe, it, expect } from 'vitest'
import {
  normalizeBannerProps,
  visibleBannerImages,
  clampNumber,
  looksLikeImageUrl,
  resolveBannerRadius,
  BANNER_INTERVAL,
  BANNER_DEFAULT_PROPS,
} from '@/components/page-builder/banner/bannerSchema'

/**
 * 这些用例覆盖任务里点名的边界缺陷：
 *  ① 空列表不得让渲染层 .length 抛错
 *  ② 间隔时间非法值（0/''/NaN/超大）必须夹紧
 *  ③ 旧字段 items / indicator_dots 仍要生效（已发布小程序兼容）
 *  ④ 旧数据缺 visible 时默认展示
 */
describe('bannerSchema · 归一化与边界保护', () => {
  it('空/缺失 props 归一化后 images 永远是数组（不抛 undefined.length）', () => {
    expect(normalizeBannerProps(undefined).images).toEqual([])
    expect(normalizeBannerProps(null).images).toEqual([])
    expect(normalizeBannerProps({}).images).toEqual([])
    expect(normalizeBannerProps({ images: null }).images).toEqual([])
    expect(Array.isArray(normalizeBannerProps({}).images)).toBe(true)
  })

  it('间隔时间的非法值全部夹回合法区间', () => {
    const { min, max, fallback } = BANNER_INTERVAL
    expect(normalizeBannerProps({ interval: 0 }).interval).toBe(min)
    expect(normalizeBannerProps({ interval: -500 }).interval).toBe(min)
    expect(normalizeBannerProps({ interval: '' }).interval).toBe(fallback)
    expect(normalizeBannerProps({ interval: NaN }).interval).toBe(fallback)
    expect(normalizeBannerProps({ interval: 999999 }).interval).toBe(max)
    // 正常值按步长吸附
    expect(normalizeBannerProps({ interval: 2300 }).interval).toBe(2500)
  })

  it('兼容旧字段 items（历史别名）', () => {
    const cfg = normalizeBannerProps({ items: [{ image: 'https://a.com/1.jpg' }] })
    expect(cfg.images).toHaveLength(1)
    expect(cfg.images[0].image).toBe('https://a.com/1.jpg')
  })

  it('兼容旧字段 indicator_dots=false → 指示器 none', () => {
    expect(normalizeBannerProps({ indicator_dots: false }).indicator_type).toBe('none')
    expect(normalizeBannerProps({ indicator_dots: true }).indicator_type).toBe('dots')
    // 新字段优先级高于旧字段
    expect(normalizeBannerProps({ indicator_dots: false, indicator_type: 'pill' }).indicator_type).toBe('pill')
  })

  it('旧图片项没有 visible 时默认可见（不能因为升级就全被隐藏）', () => {
    const cfg = normalizeBannerProps({ images: [{ image: 'https://a.com/1.jpg' }, { image: 'https://a.com/2.jpg', visible: false }] })
    expect(visibleBannerImages(cfg.images)).toHaveLength(1)
    expect(visibleBannerImages(cfg.images)[0].image).toBe('https://a.com/1.jpg')
  })

  it('图片项兼容 string / url / src 三种历史写法', () => {
    const cfg = normalizeBannerProps({
      images: ['https://a.com/1.jpg', { url: 'https://a.com/2.jpg' }, { src: 'https://a.com/3.jpg' }],
    })
    expect(cfg.images.map((i) => i.image)).toEqual([
      'https://a.com/1.jpg',
      'https://a.com/2.jpg',
      'https://a.com/3.jpg',
    ])
  })

  it('link_url 有值但缺 link_type 时默认 page（与 LinkPickerField 一致）', () => {
    const cfg = normalizeBannerProps({ images: [{ image: 'https://a.com/1.jpg', link_url: '/pages/x/index' }] })
    expect(cfg.images[0].link_type).toBe('page')
  })

  it('归一化不修改传入对象（避免 Vue 无限更新）', () => {
    const raw = { interval: 0, images: [{ image: 'https://a.com/1.jpg' }] }
    const snapshot = JSON.stringify(raw)
    normalizeBannerProps(raw)
    expect(JSON.stringify(raw)).toBe(snapshot)
  })

  it('默认配置本身能通过归一化且 interval 合法', () => {
    const cfg = normalizeBannerProps(BANNER_DEFAULT_PROPS as Record<string, unknown>)
    expect(cfg.interval).toBeGreaterThanOrEqual(BANNER_INTERVAL.min)
    expect(cfg.interval).toBeLessThanOrEqual(BANNER_INTERVAL.max)
  })

  it('clampNumber 对非法输入回落到 fallback', () => {
    expect(clampNumber(undefined, 1000, 8000, 500, 3000)).toBe(3000)
    expect(clampNumber('abc', 1000, 8000, 500, 3000)).toBe(3000)
    expect(clampNumber(3000, 1000, 8000, 500, 3000)).toBe(3000)
    // 空串/null 必须落 fallback 而不是被当成 0 夹到 min
    expect(clampNumber('', 1000, 8000, 500, 3000)).toBe(3000)
    expect(clampNumber(null, 1000, 8000, 500, 3000)).toBe(3000)
    expect(clampNumber([], 1000, 8000, 500, 3000)).toBe(3000)
  })

  it('looksLikeImageUrl 放行合法地址、拒绝非图片路径', () => {
    expect(looksLikeImageUrl('https://a.com/1.jpg')).toBe(true)
    expect(looksLikeImageUrl('/uploads/2.png')).toBe(true)
    expect(looksLikeImageUrl('data:image/png;base64,AAA')).toBe(true)
    expect(looksLikeImageUrl('/pages/index/index')).toBe(false)
    expect(looksLikeImageUrl('')).toBe(false)
  })

  it('圆角：preset=0 时用自定义值，否则用预设值', () => {
    const base = normalizeBannerProps({ images: [] })
    expect(resolveBannerRadius({ ...base, radius_preset: 16, radius_custom: 4 })).toBe(16)
    expect(resolveBannerRadius({ ...base, radius_preset: 0, radius_custom: 20 })).toBe(20)
  })
})
