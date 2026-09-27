// utils/html-blocks.js — 富文本 HTML 的「块级拆解」
//
// 为什么需要：
//   微信小程序 rich-text 组件只做静态渲染，内部 <a href> 不产生任何点击能力
//   （tap 事件的 e.detail 只有 {x, y} 坐标，没有 href）。运营用「富文本」搭出来的
//   页面里，所有看起来像按钮/列表项的链接都是死的。
//
// 做法：
//   把「块级结构」拆出来交给原生 view 渲染（<a> → 可点 view + data-link）；
//   内联内容（文本 / span / b / s / br / img）仍原样交给 rich-text 渲染，
//   所以视觉与原先一致，只是链接变成真的能点。
//
// 两条硬约束（都会导致排版塌掉，必须遵守）：
//   1. display:flex / grid 容器的直接子元素必须是「独立节点」——否则父级的 flex/grid
//      只作用到唯一一个 rich-text 上，内部子块会竖向堆叠。
//   2. 不在布局容器里的内联序列要保持原样（整段交给 rich-text），
//      拆开会丢掉 inline 自然流动的换行。

/** 自闭合 / 空标签 */
const VOID_TAGS = {
  br: 1, hr: 1, img: 1, input: 1, meta: 1, link: 1, col: 1, area: 1,
  base: 1, source: 1, wbr: 1, embed: 1, track: 1, param: 1,
}

/** 需要拆成独立节点的块级标签 */
const BLOCK_TAGS = {
  div: 1, p: 1, section: 1, article: 1, header: 1, footer: 1, main: 1, aside: 1, nav: 1,
  h1: 1, h2: 1, h3: 1, h4: 1, h5: 1, h6: 1,
  ul: 1, ol: 1, li: 1, dl: 1, dt: 1, dd: 1,
  table: 1, thead: 1, tbody: 1, tfoot: 1, tr: 1, td: 1, th: 1,
  figure: 1, figcaption: 1, blockquote: 1, pre: 1, hr: 1,
  // 链接一律当块级处理：装修页里的 <a> 都带 display:block / flex，
  // 若保持 inline 就无法挂点击事件（已核实 39 处链接全部是块级用法）。
  a: 1,
}

/**
 * 浏览器默认样式 —— 必须显式补齐。
 * 富文本里大量标签只写局部样式（如 `<p style="font-size:13px">` 不写 margin、
 * `<b style="font-size:26px">` 不写 font-weight），这些默认值决定排版，不能丢。
 * 单位统一用 em，与浏览器默认一致（em 相对元素自身 font-size）。
 */
const DEFAULT_STYLE = {
  h1: 'font-size:2em;font-weight:bold;margin:0.67em 0;',
  h2: 'font-size:1.5em;font-weight:bold;margin:0.83em 0;',
  h3: 'font-size:1.17em;font-weight:bold;margin:1em 0;',
  h4: 'font-size:1em;font-weight:bold;margin:1.33em 0;',
  h5: 'font-size:0.83em;font-weight:bold;margin:1.67em 0;',
  h6: 'font-size:0.67em;font-weight:bold;margin:2.33em 0;',
  p: 'margin:1em 0;',
  ul: 'margin:1em 0;padding-left:40px;list-style:disc;',
  ol: 'margin:1em 0;padding-left:40px;list-style:decimal;',
  li: 'display:list-item;',
  dl: 'margin:1em 0;',
  dd: 'margin-left:40px;',
  blockquote: 'margin:1em 40px;',
  hr: 'border:0;border-top:1px solid #d9d9d9;margin:0.5em auto;',
  pre: 'font-family:monospace;white-space:pre;margin:1em 0;',
  table: 'border-collapse:collapse;border-spacing:0;',
  th: 'border:1px solid #dddddd;padding:4px;font-weight:bold;text-align:center;',
  td: 'border:1px solid #dddddd;padding:4px;',
}

/** 内联语义标签的默认样式（拆成独立节点后需要显式补上） */
const INLINE_DEFAULT_STYLE = {
  b: 'font-weight:bold;',
  strong: 'font-weight:bold;',
  i: 'font-style:italic;',
  em: 'font-style:italic;',
  s: 'text-decoration:line-through;',
  del: 'text-decoration:line-through;',
  u: 'text-decoration:underline;',
  ins: 'text-decoration:underline;',
  code: 'font-family:monospace;',
  small: 'font-size:85%;',
  big: 'font-size:125%;',
}

/** 解析标签属性（只关心 style / href 等少量值） */
function parseAttrs(raw) {
  const out = {}
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g
  let m = re.exec(raw || '')
  while (m) {
    const value = m[3] != null ? m[3] : (m[4] != null ? m[4] : (m[5] || ''))
    out[m[1].toLowerCase()] = value
    m = re.exec(raw || '')
  }
  return out
}

/** 是否是布局容器（flex / grid）：其直接子元素必须是独立节点 */
function isLayoutContainer(style) {
  const s = String(style || '')
  if (/(^|;)\s*display\s*:\s*(inline-)?(flex|grid)\b/.test(s)) return true
  if (/(^|;)\s*grid-template[-a-z]*\s*:/.test(s)) return true
  return false
}

/** 把 HTML 切成 文本 / 开标签 / 闭标签 三类 token */
function tokenize(html) {
  const tokens = []
  const re = /<!--[\s\S]*?-->|<\/?([a-zA-Z][a-zA-Z0-9-]*)([^>]*?)(\/?)>/g
  let last = 0
  let m = re.exec(html)
  while (m) {
    if (m.index > last) {
      tokens.push({ type: 'text', value: html.slice(last, m.index) })
    }
    const raw = m[0]
    if (raw.indexOf('<!--') !== 0) {
      const name = String(m[1] || '').toLowerCase()
      const isClose = raw.charAt(1) === '/'
      tokens.push({
        type: isClose ? 'close' : 'open',
        name,
        attrs: m[2] || '',
        selfClose: m[3] === '/' || VOID_TAGS[name] === 1,
        raw,
      })
    }
    last = re.lastIndex
    m = re.exec(html)
  }
  if (last < html.length) {
    tokens.push({ type: 'text', value: html.slice(last) })
  }
  return tokens
}

function buildBlockStyle(tag, attrs) {
  const raw = String(attrs.style || '').trim()
  const base = DEFAULT_STYLE[tag] || ''
  if (tag === 'a') {
    // <a> 变成 view 后不再有链接语义，display 缺省时补 block，避免塌成 inline
    const head = /(^|;)\s*display\s*:/.test(raw) ? '' : 'display:block;'
    return head + raw
  }
  if (!raw) return base
  // 默认样式在前、原样式在后：原样式里的同名属性优先
  return base + (/;\s*$/.test(raw) ? '' : ';') + raw
}

/** 内联元素拆成独立节点时，同样要补回标签默认样式（如 <b> 的加粗） */
function buildInlineStyle(tag, attrs) {
  const raw = String(attrs.style || '').trim()
  const base = INLINE_DEFAULT_STYLE[tag] || ''
  if (!raw) return base
  return base + raw
}

/**
 * 这段内联 HTML 里是否有「元素级」内联标签（br 不算）
 * 只有存在元素级内联标签时，才需要把它拆成独立 flex item；
 * 纯「文本 + br」整段要交给 rich-text（拆开会让 <br> 失效、强制变成一行）。
 */
function hasInlineElement(html) {
  const tokens = tokenize(html)
  for (let i = 0; i < tokens.length; i += 1) {
    const tk = tokens[i]
    if (tk.type === 'open' && tk.name !== 'br') return true
  }
  return false
}

/** 把内联子树重新序列化成 HTML（保留原始开标签文本，交给 rich-text 渲染） */
function serializeInline(children) {
  let out = ''
  for (let i = 0; i < children.length; i += 1) {
    const c = children[i]
    if (c.text != null) {
      out += c.text
    } else if (c.selfClose) {
      out += c.openRaw
    } else {
      out += c.openRaw + serializeInline(c.children) + '</' + c.tag + '>'
    }
  }
  return out
}

/**
 * 把一段「内联 HTML」拆成独立节点（用于 flex / grid 容器的子项）
 * 每个内联元素 → 一个节点；连续文本 → 一个节点
 */
function splitInlineHtml(html, ctx) {
  const tokens = tokenize(html)
  const root = { children: [] }
  const stack = [root]
  let text = ''

  const flush = () => {
    if (!text) return
    const t = text
    text = ''
    // 纯空白在 flex 容器里不产生 flex item，直接丢弃
    if (!t.replace(/&nbsp;/g, ' ').trim()) return
    stack[stack.length - 1].children.push({ text: t })
  }

  for (let i = 0; i < tokens.length; i += 1) {
    const tk = tokens[i]
    if (tk.type === 'text') {
      text += tk.value
      continue
    }
    if (tk.type === 'close') {
      flush()
      for (let d = stack.length - 1; d > 0; d -= 1) {
        if (stack[d].tag === tk.name) {
          stack.length = d
          break
        }
      }
      continue
    }
    flush()
    const node = {
      tag: tk.name,
      attrs: parseAttrs(tk.attrs),
      openRaw: tk.raw,
      selfClose: tk.selfClose,
      children: [],
    }
    stack[stack.length - 1].children.push(node)
    if (!tk.selfClose) stack.push(node)
  }
  flush()

  const out = []
  for (let i = 0; i < root.children.length; i += 1) {
    const c = root.children[i]
    if (c.text != null) {
      out.push({ i: ctx.next(), s: '', r: c.text })
    } else if (c.selfClose) {
      out.push({ i: ctx.next(), s: '', r: c.openRaw })
    } else {
      out.push({
        i: ctx.next(),
        s: buildInlineStyle(c.tag, c.attrs),
        r: serializeInline(c.children),
      })
    }
  }
  return out
}

/** 内部结构 → 渲染结构：{ i, s(style), k(link), r(rawHtml), c(children) } */
function toRenderNodes(children, layoutParent, ctx) {
  const out = []
  for (let idx = 0; idx < children.length; idx += 1) {
    const item = children[idx]

    if (item.raw != null) {
      if (!item.raw) continue
      if (layoutParent && hasInlineElement(item.raw)) {
        const parts = splitInlineHtml(item.raw, ctx)
        for (let p = 0; p < parts.length; p += 1) out.push(parts[p])
      } else {
        out.push({ i: ctx.next(), s: '', r: item.raw })
      }
      continue
    }

    const node = { i: item.seq, s: item.style || '' }
    if (item.link) node.k = item.link
    const inner = toRenderNodes(item.children, isLayoutContainer(item.style), ctx)

    if (!inner.length) {
      // 空容器：保留（可能是纯背景 / 占位块）
      out.push(node)
    } else if (inner.length === 1 && inner[0].r != null && !inner[0].s && !inner[0].k) {
      // 内容全是内联 → 整段交给 rich-text，少一层包裹、更加保真
      node.r = inner[0].r
      out.push(node)
    } else {
      node.c = inner
      out.push(node)
    }
  }
  return out
}

/**
 * 把富文本 HTML 拆成块级渲染节点
 * @param {string} html 富文本内容
 * @returns {{ nodes: Array, hasLink: boolean, linkCount: number }}
 */
function parseHtmlBlocks(html) {
  const source = html == null ? '' : String(html)
  if (!source) return { nodes: [], hasLink: false, linkCount: 0 }

  const tokens = tokenize(source)
  let seq = 0
  const ctx = {
    next() {
      seq += 1
      return seq
    },
  }

  const root = { tag: '#root', children: [] }
  const stack = [root]
  let buffer = ''
  let hasLink = false
  let linkCount = 0

  const flush = () => {
    if (!buffer) return
    const text = buffer
    buffer = ''
    if (!text.replace(/&nbsp;/g, ' ').trim()) return
    stack[stack.length - 1].children.push({ seq: ctx.next(), raw: text })
  }

  for (let i = 0; i < tokens.length; i += 1) {
    const tk = tokens[i]

    if (tk.type === 'text') {
      buffer += tk.value
      continue
    }

    // 非块级标签（span/b/s/br/img…）：原样留在内联片段里，交给 rich-text
    if (!BLOCK_TAGS[tk.name]) {
      buffer += tk.raw
      continue
    }

    if (tk.type === 'close') {
      flush()
      for (let d = stack.length - 1; d > 0; d -= 1) {
        if (stack[d].tag === tk.name) {
          stack.length = d
          break
        }
      }
      continue
    }

    // 开标签
    flush()
    const attrs = parseAttrs(tk.attrs)
    const node = {
      seq: ctx.next(),
      tag: tk.name,
      style: buildBlockStyle(tk.name, attrs),
      link: '',
      children: [],
    }
    const href = String(attrs.href || '').trim()
    if (href) {
      node.link = href
      hasLink = true
      linkCount += 1
    }
    stack[stack.length - 1].children.push(node)
    if (!tk.selfClose) stack.push(node)
  }
  flush()

  return { nodes: toRenderNodes(root.children, false, ctx), hasLink, linkCount }
}

module.exports = {
  parseHtmlBlocks,
  isLayoutContainer,
  BLOCK_TAGS,
  VOID_TAGS,
}
