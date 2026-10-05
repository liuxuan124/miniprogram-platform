/**
 * components/page-builder/richText/richTextSanitizer.ts
 * 富文本「粘贴清洗 + 移动端防爆」规则。
 *
 * 🔴 为什么必须清洗（真实故障，不是洁癖）：
 *   从微信公众号 / 飞书 / Word 复制过来的富文本，会带着
 *   `width: 677px`（按桌面编辑器宽度写死的绝对宽度）、`-apple-system` 之类的
 *   字体家族、以及 `<o:p>` / `mso-*` 等 Word 垃圾标签。
 *   这些进了小程序端会**把页面横向撑破、产生横向滚动条**，
 *   而 rich-text 组件内部无法用 WXSS 覆盖内联 style —— **入库前洗掉是唯一可靠时机**。
 *
 * 设计要点：
 *  1. 纯函数 + 不依赖 DOM，Node 侧可单测（面板与 CI 都能跑）；
 *  2. img 强制注入 `max-width:100%!important;height:auto!important`；
 *  3. 只做「安全 + 防爆」两件事，**不重排内容**（避免运营粘贴后发现版式被改了）。
 */

/** 直接丢弃的标签：脚本类 + Word/公众号垃圾标签 */
const DROP_TAGS = [
  'script', 'style', 'iframe', 'object', 'embed', 'link', 'meta',
  'o:p', 'st1:st', 'w:sdt', 'w:sdtcontent', 'mso-list', 'v:shape', 'v:imagedata',
]

/** 丢弃的标签属性：事件 + 框架残留 */
const DROP_ATTRS = [
  'class', 'id', 'onclick', 'onerror', 'onload', 'onmouseover', 'onmouseout',
  'lang', 'xmlns', 'data-tools', 'data-id', 'data-mpa-powered-by',
  'data-_hs', 'data-sharer', 'data-mce', 'data-cke', 'contenteditable',
]

/** 允许保留的内联样式属性（白名单，比黑名单安全） */
const STYLE_ALLOW = new Set([
  'color', 'background', 'background-color',
  'font-size', 'font-weight', 'font-style', 'text-decoration', 'text-align',
  'line-height', 'margin', 'padding', 'border-left', 'border-radius',
])

/** 列表额外允许 */
const STYLE_ALLOW_LIST = new Set([
  'list-style', 'list-style-type', 'list-style-position', 'display',
])

/** img 额外允许 */
const STYLE_ALLOW_IMG = new Set(['width', 'object-fit'])

/** 宽度上限（px）：超过一律改 100%，防横向滚动 */
const ABSOLUTE_WIDTH_MAX = 520

/** 占位标记：用 unlikely 字符串，避免与正文内容冲突 */
const PLACEHOLDER_PREFIX = '__RTX_'
const PLACEHOLDER_SUFFIX = '__'
const PLACEHOLDER_RE = /__RTX_(\d+)__/g
/** 清洗一段 HTML。纯字符串进出，便于单测。 */
export function sanitizeRichHtml(input: string): string {
  const html = String(input || '')
  if (!html) return ''

  // ① 先整体剥掉危险/垃圾标签（含其内容）
  let out = html
  for (const tag of DROP_TAGS) {
    // 成对标签连内容一起删
    out = out.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi'), '')
    // 自闭合/未闭合残留
    out = out.replace(new RegExp(`<${tag}\\b[^>]*\\/?>`, 'gi'), '')
  }

  // ② 逐标签清洗属性
  out = out.replace(/<([a-z][a-z0-9]*)((?:\s+[^>]*)?)(\/?)>/gi, (full, tagRaw: string, attrsRaw: string, selfClose: string) => {
    const tag = tagRaw.toLowerCase()

    // a 标签保留 href/target/rel；其余按白名单
    let attrs = attrsRaw || ''

    // 去掉所有 on* 事件（正则兜底，防止上面白名单漏掉）
    attrs = attrs.replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    // 去掉 class/id 等残留
    for (const attr of DROP_ATTRS) {
      const re = new RegExp(`\\s+${attr.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\s*=\\s*("[^"]*"|'[^']*'|[^\\s>]+)`, 'gi')
      attrs = attrs.replace(re, '')
    }

    // 3) 清洗 style
    attrs = cleanStyleAttr(attrs, tag)

    // 4) img 注入防爆规则 + 去掉 width/height 属性
    if (tag === 'img') {
      attrs = attrs.replace(/\s+(width|height|align)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    }

    const rebuilt = attrs.trim()
    return `<${tag}${rebuilt ? ' ' + rebuilt : ''}${selfClose || ''}>`
  })

  // 5) 闭合标签里也可能有脏属性（</p style="...">）
  out = out.replace(/<\/([a-z][a-z0-9]*)((?:\s+[^>]*)?)>/gi, (full, tag: string, attrs: string) => {
    if (!attrs || !attrs.trim()) return `</${tag.toLowerCase()}>`
    return `</${tag.toLowerCase()}>`
  })

  return out
}

/** 清洗 style 属性：白名单过滤 + 去字体家族 + 绝对宽度改百分比 */
function cleanStyleAttr(attrs: string, tag: string): string {
  if (!/\sstyle\s*=/i.test(attrs)) return attrs

  const m = attrs.match(/\sstyle\s*=\s*("([^"]*)"|'([^']*)')/i)
  if (!m) return attrs
  const rawStyle = m[2] ?? m[3] ?? ''

  const allow =
    tag === 'img'
      ? new Set([...STYLE_ALLOW, ...STYLE_ALLOW_IMG])
      : tag === 'ul' || tag === 'ol' || tag === 'li'
        ? new Set([...STYLE_ALLOW, ...STYLE_ALLOW_LIST])
        : STYLE_ALLOW

  const kept: string[] = []
  for (const decl of rawStyle.split(';')) {
    const piece = decl.trim()
    if (!piece) continue
    const idx = piece.indexOf(':')
    if (idx <= 0) continue
    const prop = piece.slice(0, idx).trim().toLowerCase()
    const val = piece.slice(idx + 1).trim()
    if (!val) continue

    // 🔴 字体家族一律丢弃：小程序端没有这些字体，保留只会让版式乱掉
    if (prop === 'font-family') continue
    if (!allow.has(prop)) continue

    // 🔴 绝对宽度处理：写死的 px 宽度是小程序横向撑破的主因
    if (prop === 'width' && tag === 'img') {
      const px = val.match(/^(\d+(?:\.\d+)?)px$/i)
      if (px && Number(px[1]) > ABSOLUTE_WIDTH_MAX) {
        kept.push('width:100%')
        continue
      }
    }

    // margin/padding 的 px 上限，防外边距把版面撑散
    if ((prop === 'margin' || prop === 'padding') && /\d{3,}px/.test(val)) {
      kept.push(`${prop}:4px`)
      continue
    }

    kept.push(`${prop}:${val}`)
  }

  // img 必须带上移动端防爆规则
  if (tag === 'img') {
    kept.push('max-width:100%!important')
    kept.push('height:auto!important')
  }

  const rebuilt = kept.join(';')
  const quote = m[1][0] // 保留原来的引号类型
  const newAttr = rebuilt ? ` style=${quote}${rebuilt}${quote}` : ''
  return attrs.replace(m[0], newAttr)
}

/** 一键清除格式：只留结构，丢掉所有样式（保留链接与图片） */
/** 一键清除格式：只留结构，丢掉所有样式（保留链接与图片） */
export function stripRichHtml(input: string): string {
  const html = sanitizeRichHtml(input)
  if (!html) return ''

  // 先把 a/img 换成占位标记，清完再还原，避免被一起抹掉
  const tokens: string[] = []
  let work = html
  work = work.replace(/<img\b[^>]*>/gi, (tag) => {
    const src = tag.match(/src\s*=\s*(?:"([^"]*)"|'([^']*)')/i)
    const url = src ? (src[1] ?? src[2] ?? '') : ''
    tokens.push('<img src=' + '"' + url + '"' + ' style="max-width:100%!important;height:auto!important;display:block;">')
    return PLACEHOLDER_PREFIX + (tokens.length - 1) + PLACEHOLDER_SUFFIX
  })
  // 捕获组：1=双引号 href 2=单引号 href 3=inner
  work = work.replace(/<a\b[^>]*href\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>([\s\S]*?)<\/a>/gi,
    (_all, dq: string, sq: string, inner: string) => {
      const href = dq ?? sq ?? ''
      tokens.push('<a href=' + '"' + href + '"' + '>' + inner + '</a>')
      return PLACEHOLDER_PREFIX + (tokens.length - 1) + PLACEHOLDER_SUFFIX
    })

  // 去所有标签与属性
  work = work
    .replace(/<(\/?)([a-z][a-z0-9]*)([^>]*)>/gi, (full, slash: string, tag: string) => {
      const t = tag.toLowerCase()
      // 保留结构性标签（换行/分段语义），其余整段移除
      if (['br', 'p', 'div', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote', 'hr', 'table', 'tr', 'td', 'th'].includes(t)) {
        return slash ? `</${t}>` : `<${t}>`
      }
      return ''
    })
    // 残留的 style 属性已随标签移除，这里再兜一次裸属性
    .replace(/\sstyle\s*=\s*("([^"]*)"|'([^']*)')/gi, '')

  work = work.replace(PLACEHOLDER_RE, (_all, i) => tokens[Number(i)] || '')
  return work.trim()
}

/** 供 CSS 使用的移动端重置片段（文档形式，便于 review） */
export const RICH_TEXT_MOBILE_RESET = `
.rich-text-content { word-break: break-word; overflow-wrap: anywhere; }
.rich-text-content img { max-width: 100% !important; height: auto !important; display: block; }
.rich-text-content table { max-width: 100% !important; display: block; overflow-x: auto; -webkit-overflow-scrolling: touch; }
.rich-text-content pre, .rich-text-content code { white-space: pre-wrap; word-break: break-all; }
.rich-text-content p { margin: 0; }
`
