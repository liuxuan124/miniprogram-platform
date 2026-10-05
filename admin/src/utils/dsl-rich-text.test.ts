import { describe, it, expect } from 'vitest'
import {
  sanitizeRichHtml,
  stripRichHtml,
} from '@/components/page-builder/richText/richTextSanitizer'
import {
  normalizeRichTextProps,
  richContainerStyle,
  richContainerBg,
  isRichTextEmpty,
  richTextPlain,
  clampRichNumber,
  BASE_FONT_SIZE,
  PARAGRAPH_GAP,
} from '@/components/page-builder/richText/richTextSchema'

/**
 * 粘贴清洗是「入库前唯一一道防线」——小程序 rich-text 内部无法用 WXSS
 * 覆盖粘贴进来的内联 style，所以这里必须真的把脏样式洗掉。
 */
describe('richTextSanitizer · 粘贴清洗（防小程序横向撑破）', () => {
  it('剥掉脚本与 Word/公众号垃圾标签（含内容）', () => {
    const dirty = '<p>正文</p><script>alert(1)</script><o:p>&nbsp;</o:p><style>.x{}</style>'
    const clean = sanitizeRichHtml(dirty)
    expect(clean).not.toContain('script')
    expect(clean).not.toContain('alert(1)')
    expect(clean).not.toContain('<o:p>')
    expect(clean).not.toContain('<style>')
    expect(clean).toContain('正文')
  })

  it('🔴 图片强制注入移动端防爆规则（max-width:100%!important;height:auto!important）', () => {
    const clean = sanitizeRichHtml('<img src="a.jpg" style="width:677px;height:480px">')
    expect(clean).toContain('max-width:100%!important')
    expect(clean).toContain('height:auto!important')
    // 原样保留下来的写死宽高必须被清掉
    expect(clean).not.toContain('width:677px')
    expect(clean).not.toContain('height:480px')
  })

  it('超过阈值的绝对宽度改为 100%', () => {
    const clean = sanitizeRichHtml('<img src="a.jpg" style="width:900px;">')
    expect(clean).toContain('width:100%')
  })

  it('丢弃 width/height HTML 属性（老代码用属性写死尺寸）', () => {
    const clean = sanitizeRichHtml('<img src="a.jpg" width="677" height="480">')
    expect(clean).not.toMatch(/\swidth=/)
    expect(clean).not.toMatch(/\sheight=/)
  })

  it('移除字体家族（小程序端不存在这些字体，保留只会乱版式）', () => {
    const clean = sanitizeRichHtml('<p style="font-family: -apple-system, \'PingFang SC\';color:#333">文本</p>')
    expect(clean).not.toContain('font-family')
    expect(clean).toContain('color:#333')
  })

  it('清除 on* 事件属性与 class/id', () => {
    const dirty = '<p class="x" id="y" onclick="evil()" style="color:red">点我</p>'
    const clean = sanitizeRichHtml(dirty)
    expect(clean).not.toContain('onclick')
    expect(clean).not.toContain('class=')
    expect(clean).not.toContain('id=')
    expect(clean).toContain('color:red')
  })

  it('白名单外的样式属性被丢弃', () => {
    const clean = sanitizeRichHtml('<p style="position:fixed;top:0;color:#333;font-size:15px">x</p>')
    expect(clean).not.toContain('position')
    expect(clean).not.toContain('top:0')
    expect(clean).toContain('font-size:15px')
  })

  it('超大 margin/padding 收敛，避免版面撑散', () => {
    const clean = sanitizeRichHtml('<p style="margin:999px;padding:888px">x</p>')
    expect(clean).not.toContain('999px')
    expect(clean).not.toContain('888px')
  })

  it('链接 href 保留（否则正文里的引用全失效）', () => {
    const clean = sanitizeRichHtml('<a href="https://a.com" class="x">链接</a>')
    expect(clean).toContain('href="https://a.com"')
    expect(clean).toContain('链接')
    expect(clean).not.toContain('class=')
  })

  it('清除格式保留结构与图片、链接', () => {
    const html = '<p style="color:red;font-size:20px">标题</p><img src="a.jpg" style="width:677px"><a href="https://a.com">链接</a>'
    const stripped = stripRichHtml(html)
    expect(stripped).not.toContain('color:red')
    expect(stripped).not.toContain('font-size:20px')
    // 图片与链接不能被一起抹掉
    expect(stripped).toContain('<img')
    expect(stripped).toContain('a.jpg')
    expect(stripped).toContain('https://a.com')
    // 结构标签保留
    expect(stripped).toContain('<p>')
  })

  it('空输入返回空串，不抛错', () => {
    expect(sanitizeRichHtml('')).toBe('')
    expect(stripRichHtml('')).toBe('')
  })
})

describe('richTextSchema · 归一化与容器样式', () => {
  it('老配置只有 content 时其余走默认值，不改变观感', () => {
    const cfg = normalizeRichTextProps({ content: '<p>hi</p>' })
    expect(cfg.content).toBe('<p>hi</p>')
    expect(cfg.base_font_size).toBe(BASE_FONT_SIZE.fallback)
    expect(cfg.line_height).toBe(1.75)
    expect(cfg.container_bg).toBe('none')
  })

  it('清空输入框回落默认而不是夹到区间最小值（Number 空串等于 0 的坑）', () => {
    expect(normalizeRichTextProps({ base_font_size: '' }).base_font_size).toBe(BASE_FONT_SIZE.fallback)
    expect(normalizeRichTextProps({ paragraph_gap: null }).paragraph_gap).toBe(PARAGRAPH_GAP.fallback)
    expect(clampRichNumber('', 12, 18, 1, 14)).toBe(14)
    expect(clampRichNumber([], 4, 16, 1, 8)).toBe(8)
  })

  it('行高非法值回落 1.75', () => {
    expect(normalizeRichTextProps({ line_height: 9 }).line_height).toBe(1.75)
    expect(normalizeRichTextProps({ line_height: 2 }).line_height).toBe(2)
  })

  it('容器样式：字号/行高挂容器靠继承，不逐个改内联 style', () => {
    const s = richContainerStyle(normalizeRichTextProps({ base_font_size: 16, line_height: 2 }))
    expect(s.fontSize).toBe('16px')
    expect(s.lineHeight).toBe('2')
  })

  it('容器背景：none 透明 / card 白 / paper 纸质感', () => {
    expect(richContainerBg('none')).toBe('transparent')
    expect(richContainerBg('card')).toBe('#ffffff')
    expect(richContainerBg('paper')).toBe('#faf7f0')
  })

  it('容器背景非 none 且开圆角时才加 border-radius', () => {
    expect(richContainerStyle(normalizeRichTextProps({ container_bg: 'card' })).borderRadius).toBe('10px')
    expect(richContainerStyle(normalizeRichTextProps({ container_bg: 'none' })).borderRadius).toBeUndefined()
  })

  it('空态判定：有标签但无文字也算空，纯图片不算空', () => {
    expect(isRichTextEmpty('')).toBe(true)
    expect(isRichTextEmpty('<p><br></p>')).toBe(true)
    expect(isRichTextEmpty('<p>&nbsp;</p>')).toBe(true)
    expect(isRichTextEmpty('<p>有字</p>')).toBe(false)
    expect(isRichTextEmpty('<img src="a.jpg">')).toBe(false)
  })

  it('纯文本提取正确解码实体', () => {
    expect(richTextPlain('<p>a&amp;b</p>')).toBe('a&b')
    expect(richTextPlain('<p>中文</p>')).toBe('中文')
  })
})
