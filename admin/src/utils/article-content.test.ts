import { describe, expect, it } from 'vitest'
import {
  cleanupWechatEditorMarkup,
  estimateReadMinutes,
  formatReadTimeLabel,
  isDisplayableCategory,
  normalizeImgDataSrc,
  prepareArticleContentHtml,
  stripLeadingBannerImages,
  stripWechatEditorPreamble,
} from '@/utils/article-content'

const WECHAT_HERO = `<section><section style="background-color:#2A1F14;padding:48px"><h1>从Rufus到Alexa：跨境电商的流量入口正在被重新分配</h1><p>导语段落</p></section><section style="padding:36px"><h2>01 · 正文开始</h2><p>2026年5月13日，亚马逊正式关停。</p></section></section>`

const NORMAL_LEDE = `<p>这是导语段落，介绍本文背景。</p><p><img src="/uploads/hero.jpg" /></p><h2>第一章</h2><p>正文内容在这里。</p>`

describe('article-content', () => {
  it('hides empty category labels', () => {
    expect(isDisplayableCategory('未分类')).toBe(false)
    expect(isDisplayableCategory('选品洞察')).toBe(true)
  })

  it('converts data-src to src before stripping data attributes', () => {
    const html = '<img data-src="https://mmbiz.qpic.cn/a.jpg" class="rich_pages">'
    const out = cleanupWechatEditorMarkup(html)
    expect(out).toContain('src="https://mmbiz.qpic.cn/a.jpg"')
    expect(out).not.toContain('data-src')
  })

  it('does not strip normal lede before first h2 by default', () => {
    const out = stripWechatEditorPreamble(NORMAL_LEDE, '测试标题')
    expect(out).toContain('导语段落')
    expect(out).toContain('hero.jpg')
    expect(out).toContain('第一章')
  })

  it('strips wechat editor dark hero when stripMasthead enabled', () => {
    const out = stripWechatEditorPreamble(WECHAT_HERO, '从Rufus到Alexa：跨境电商的流量入口正在被重新分配', {
      stripMasthead: true,
    })
    expect(out).toContain('01 · 正文开始')
    expect(out).not.toContain('导语段落')
    expect(out).not.toContain('<h1')
  })

  it('strips leading banner image only when maxStrip > 0', () => {
    const html = '<p><img src="/uploads/banner.jpg" /></p><p>正文开始</p>'
    expect(stripLeadingBannerImages(html, 0)).toBe(html)
    expect(stripLeadingBannerImages(html, 1)).toBe('<p>正文开始</p>')
  })

  it('estimates read minutes from plain text', () => {
    const html = '<p>' + '字'.repeat(800) + '</p>'
    expect(estimateReadMinutes(html)).toBe(2)
    expect(formatReadTimeLabel(2)).toBe('约 2 分钟')
  })

  it('prepares wechat article with masthead option', () => {
    const out = prepareArticleContentHtml(WECHAT_HERO, '/cover.jpg', '从Rufus到Alexa：跨境电商的流量入口正在被重新分配', {
      stripMasthead: true,
    })
    expect(out).toContain('01 · 正文开始')
    expect(out).not.toContain('2A1F14')
  })

  it('normalizeImgDataSrc converts lazy-load attrs', () => {
    expect(normalizeImgDataSrc('<img data-src="/a.jpg">')).toContain('src="/a.jpg"')
  })
})
