import { describe, it, expect } from 'vitest'
import {
  normalizeBrandHeaderProps,
  resolveLogoMode,
  resolveBgMode,
  brandBgStyle,
  resolveTitleColor,
  resolveSubtitleColor,
  resolveDividerColor,
  safeTextWidth,
  estimateTextWidth,
  showsLogoImage,
  showsLogoText,
  isDarkBrandBg,
  clampBrandNumber,
  CAPSULE_SAFE_WIDTH,
  LOGO_HEIGHT,
  TITLE_FONT_SIZE,
  BRAND_HEADER_DEFAULT_PROPS,
} from '@/components/page-builder/brandHeader/brandHeaderSchema'

/**
 * 覆盖本轮要点名的缺陷与兼容性：
 *  ① 旧配置没有 logo_mode / bg_mode，必须由 logo/logo_text/style_type 反推且**表现不变**
 *  ② fixed_top 是 sticky 的历史别名，两者必须同步
 *  ③ Number('') === 0 的坑：清空输入框不得被夹成区间最小值
 *  ④ 标题过长碰撞胶囊的安全区宽度计算
 */
describe('brandHeaderSchema · 归一化与兼容', () => {
  it('logo_mode 缺失时按 logo/logo_text 并存关系反推（历史草稿零改动可用）', () => {
    expect(resolveLogoMode({ logo: 'a.png', logo_text: '品牌' })).toBe('both')
    expect(resolveLogoMode({ logo: 'a.png', logo_text: '' })).toBe('image')
    expect(resolveLogoMode({ logo: '', logo_text: '品牌' })).toBe('text')
    expect(resolveLogoMode({ logo: '', logo_text: '' })).toBe('none')
  })

  it('显式 logo_mode 优先于反推', () => {
    expect(resolveLogoMode({ logo_mode: 'none', logo: 'a.png', logo_text: 'x' })).toBe('none')
    expect(resolveLogoMode({ logo_mode: 'image', logo: '', logo_text: 'x' })).toBe('image')
  })

  it('style_type 迁移到 bg_mode，新增 immersive 不影响老配置', () => {
    expect(resolveBgMode({ style_type: 'gradient' })).toBe('gradient')
    expect(resolveBgMode({ style_type: 'plain' })).toBe('plain')
    expect(resolveBgMode({})).toBe('plain')
    expect(resolveBgMode({ bg_mode: 'immersive' })).toBe('immersive')
  })

  it('fixed_top 是 sticky 的历史别名，两者同步', () => {
    expect(normalizeBrandHeaderProps({ fixed_top: false }).sticky).toBe(false)
    expect(normalizeBrandHeaderProps({ fixed_top: true }).sticky).toBe(true)
    expect(normalizeBrandHeaderProps({}).sticky).toBe(true)
    // 显式 sticky 优先
    expect(normalizeBrandHeaderProps({ sticky: false, fixed_top: true }).sticky).toBe(false)
  })

  it('数值：清空输入框回落默认而不是夹到区间最小值', () => {
    expect(normalizeBrandHeaderProps({ logo_height: '' }).logo_height).toBe(LOGO_HEIGHT.fallback)
    expect(normalizeBrandHeaderProps({ title_font_size: '' }).title_font_size).toBe(TITLE_FONT_SIZE.fallback)
    expect(clampBrandNumber('', 16, 48, 1, 28)).toBe(28)
    expect(clampBrandNumber([], 14, 20, 1, 15)).toBe(15)
    // 越界仍夹紧
    expect(normalizeBrandHeaderProps({ logo_height: 999 }).logo_height).toBe(LOGO_HEIGHT.max)
    expect(normalizeBrandHeaderProps({ title_font_size: 2 }).title_font_size).toBe(TITLE_FONT_SIZE.min)
  })

  it('logo_keep_ratio 与 logo_fit 默认值能防拉伸', () => {
    const cfg = normalizeBrandHeaderProps({ logo: 'a.png' })
    expect(cfg.logo_keep_ratio).toBe(true)
    expect(cfg.logo_fit).toBe('contain')
  })

  it('logo_text_bold 缺省为 true（对齐旧渲染器写死的 font-weight:800）', () => {
    expect(normalizeBrandHeaderProps({ logo_text: 'x' }).logo_text_bold).toBe(true)
    expect(normalizeBrandHeaderProps({ logo_text_bold: false }).logo_text_bold).toBe(false)
  })

  it('Logo 模式的图文互斥判定', () => {
    expect(showsLogoImage('image')).toBe(true)
    expect(showsLogoImage('text')).toBe(false)
    expect(showsLogoImage('both')).toBe(true)
    expect(showsLogoText('text')).toBe(true)
    expect(showsLogoText('image')).toBe(false)
    expect(showsLogoText('none')).toBe(false)
  })

  it('深色背景走 *_light 字段，浅色走常规字段', () => {
    const plain = normalizeBrandHeaderProps({ bg_mode: 'plain' })
    const grad = normalizeBrandHeaderProps({ bg_mode: 'gradient' })
    expect(isDarkBrandBg('plain')).toBe(false)
    expect(isDarkBrandBg('gradient')).toBe(true)
    expect(isDarkBrandBg('immersive')).toBe(true)
    expect(resolveTitleColor(plain)).toBe('#172033')
    expect(resolveTitleColor(grad)).toBe('#ffffff')
    // 无副标题时返回空串，不产出无意义的颜色
    expect(resolveSubtitleColor(normalizeBrandHeaderProps({}))).toBe('')
    expect(resolveDividerColor(grad)).toContain('rgba')
  })

  it('背景 CSS：plain 用纯色、gradient 用渐变、immersive 半透明', () => {
    expect(brandBgStyle(normalizeBrandHeaderProps({ bg_mode: 'plain', background_color: '#123456' })).background)
      .toBe('#123456')
    expect(brandBgStyle(normalizeBrandHeaderProps({ bg_mode: 'gradient' })).background).toContain('linear-gradient')
    expect(brandBgStyle(normalizeBrandHeaderProps({ bg_mode: 'immersive' })).background).toContain('rgba')
  })

  it('安全区可用宽必须为胶囊预留位置（标题过长会被真机遮挡的根因）', () => {
    const cfg = normalizeBrandHeaderProps({ bar_padding_left: 12, bar_padding_right: 12, item_gap: 10 })
    // 右内边距小于胶囊宽度时，按胶囊宽度算
    const w = safeTextWidth(340, cfg)
    expect(w).toBe(340 - 12 - CAPSULE_SAFE_WIDTH - 10)
    expect(w).toBeGreaterThan(0)
  })

  it('文本宽度估算：中文按 1em、英文按 0.55em', () => {
    expect(estimateTextWidth('中文', 10)).toBe(20)
    expect(estimateTextWidth('ab', 10)).toBeCloseTo(11, 5)
    expect(estimateTextWidth('', 10)).toBe(0)
  })

  it('归一化不修改传入对象', () => {
    const raw = { logo_height: '', fixed_top: false }
    const snap = JSON.stringify(raw)
    normalizeBrandHeaderProps(raw)
    expect(JSON.stringify(raw)).toBe(snap)
  })

  it('默认配置自身通过归一化', () => {
    const cfg = normalizeBrandHeaderProps(BRAND_HEADER_DEFAULT_PROPS as Record<string, unknown>)
    expect(cfg.logo_height).toBeGreaterThanOrEqual(LOGO_HEIGHT.min)
    expect(cfg.title_font_size).toBeGreaterThanOrEqual(TITLE_FONT_SIZE.min)
  })
})
