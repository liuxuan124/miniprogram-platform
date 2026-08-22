import { describe, expect, it } from 'vitest'
import {
  estimateReadMinutes,
  formatReadTimeLabel,
  isDisplayableCategory,
  prepareArticleContentHtml,
  stripLeadingBannerImages,
  stripWechatEditorPreamble,
} from '@/utils/article-content'

const WECHAT_HERO = `<section><section style="background-color:#2A1F14;padding:48px"><h1>从Rufus到Alexa：跨境电商的流量入口正在被重新分配</h1><p>导语段落</p></section><section style="padding:36px"><h2>01 · 正文开始</h2><p>2026年5月13日，亚马逊正式关停。</p></section></section>`

describe('article-content', () => {
  it('hides empty category labels', () => {
    expect(isDisplayableCategory('未分类')).toBe(false)
    expect(isDisplayableCategory('选品洞察')).toBe(true)
  })

  it('strips wechat editor dark hero before first h2', () => {
    const out = stripWechatEditorPreamble(WECHAT_HERO, '从Rufus到Alexa：跨境电商的流量入口正在被重新分配')
    expect(out).toContain('01 · 正文开始')
    expect(out).not.toContain('导语段落')
    expect(out).not.toContain('<h1')
  })

  it('strips leading banner image', () => {
    const html = '<p><img src="/uploads/banner.jpg" /></p><p>正文开始</p>'
    const out = stripLeadingBannerImages(html)
    expect(out).toBe('<p>正文开始</p>')
  })

  it('estimates read minutes from plain text', () => {
    const html = '<p>' + '字'.repeat(800) + '</p>'
    expect(estimateReadMinutes(html)).toBe(2)
    expect(formatReadTimeLabel(2)).toBe('约 2 分钟')
  })

  it('prepares wechat article html without hero duplicate', () => {
    const out = prepareArticleContentHtml(WECHAT_HERO, '/cover.jpg', '从Rufus到Alexa：跨境电商的流量入口正在被重新分配')
    expect(out).toContain('01 · 正文开始')
    expect(out).not.toContain('2A1F14')
  })
})
