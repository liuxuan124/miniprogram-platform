/**
 * 保存草稿前的死链校验。
 * 扫描组件 props 中的站内链接（link/link_url/href/*_link 字段 + rich_text 内的 href），
 * 对照页面清单校验目标页存在性与发布状态，防止「页 31 死链」类事故再漏到线上。
 */

export type PageLinkRef = {
  compType: string
  field: string
  url: string
}

export type LinkIssue = {
  level: 'error' | 'warn'
  message: string
}

/** 主包/分包原生路由前缀：这些路径不经过页面表，直接放行 */
const NATIVE_PREFIXES = [
  '/pages/index/',
  '/pages/discover/',
  '/pages/shop/',
  '/pages/planet/',
  '/pages/mine/',
  '/pages/login/',
  '/pages/search/',
  '/pages/custom-nav/',
  '/pkg-content/',
  '/pkg-trade/',
  '/pkg-user/',
  '/pkg-extra/',
  '/pkg-templates/',
]

/** 链接字段名：精确命中或 _link/_link_url 结尾 */
const LINK_KEY_RE = /^(link|href|target|link_url|linkUrl|jump_url|jumpUrl)$/i
const LINK_KEY_SUFFIX_RE = /(_link|_link_url|Link|LinkUrl)$/i

/** 资源类字段：值也以 / 开头但不是页面跳转，必须排除 */
const ASSET_KEY_RE = /(image|img|avatar|icon|cover|poster|qrcode|qr_code|file|src|audio|video)/i

function isInternalPageUrl(raw: unknown): raw is string {
  if (typeof raw !== 'string') return false
  const v = raw.trim()
  if (!v.startsWith('/')) return false
  // /uploads、/static 等资源路径排除
  if (/^\/(uploads|static|assets|images)\//.test(v)) return false
  return true
}

function stripQuery(url: string): string {
  return url.split('#')[0].split('?')[0].replace(/\/+$/, '')
}

function walkProps(value: any, visit: (key: string, val: string) => void) {
  if (!value || typeof value !== 'object') return
  if (Array.isArray(value)) {
    value.forEach((item) => walkProps(item, visit))
    return
  }
  for (const [key, val] of Object.entries(value)) {
    if (typeof val === 'string') {
      const isLinkKey = (LINK_KEY_RE.test(key) || LINK_KEY_SUFFIX_RE.test(key)) && !ASSET_KEY_RE.test(key)
      if (isLinkKey && isInternalPageUrl(val)) visit(key, val.trim())
    } else if (val && typeof val === 'object') {
      walkProps(val, visit)
    }
  }
}

/** 收集富文本 HTML 里的站内 href */
function collectRichTextHrefs(html: string, visit: (key: string, val: string) => void) {
  if (!html) return
  const re = /href=["'](#\/|\/)[^"']*["']/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    const raw = m[1] === '#/' ? m[0].slice(6, -1) : m[0].slice(6, -1)
    const url = raw.startsWith('/') ? raw : `/${raw}`
    if (isInternalPageUrl(url)) visit('href', url)
  }
}

/** 收集整页全部站内链接 */
export function collectPageLinks(components: any[]): PageLinkRef[] {
  const refs: PageLinkRef[] = []
  for (const comp of components || []) {
    const props = comp?.props || {}
    const visit = (field: string, url: string) => {
      refs.push({ compType: String(comp?.type || ''), field, url })
    }
    walkProps(props, visit)
    // rich_text 组件正文里的 <a href>
    const contents = [props.content, props.html, props.text]
    contents.forEach((c: any) => {
      if (typeof c === 'string' && c.includes('<')) collectRichTextHrefs(c, visit)
    })
  }
  // 去重：同组件同字段同链接只报一次
  const seen = new Set<string>()
  return refs.filter((r) => {
    const key = `${r.compType}|${r.field}|${r.url}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const COMP_LABEL: Record<string, string> = {
  rich_text: '富文本',
  banner: '轮播图',
  nav: '导航',
  category_nav: '分类导航',
  qa_list: '问答列表',
  image: '图片',
  image_text: '图文',
  flash_sale: '限时秒杀',
  coupon: '领券',
  activity_entry: '活动入口',
  float_button: '悬浮按钮',
  hot_news: '快讯',
  article_list: '文章列表',
  article_feed: '文章流',
  product_list: '商品列表',
  member_plan: '会员套餐',
  planet_hero: '星球头图',
}

/**
 * 校验链接目标。pageRows 为页面清单（需含 path/status）。
 * status：1=已发布 0=草稿 2=已下线（与后端口径一致）。
 */
export function validatePageLinks(
  refs: PageLinkRef[],
  pageRows: Array<{ path?: string; status?: number | string; name?: string }>,
): LinkIssue[] {
  const byPath = new Map<string, { status?: number | string; name?: string }>()
  for (const row of pageRows || []) {
    if (row?.path) byPath.set(stripQuery(String(row.path)), row)
  }
  const issues: LinkIssue[] = []
  for (const ref of refs) {
    const path = stripQuery(ref.url)
    if (NATIVE_PREFIXES.some((p) => path.startsWith(p.replace(/\/+$/, '/') ))) continue
    if (NATIVE_PREFIXES.some((p) => (path + '/').startsWith(p))) continue
    const label = COMP_LABEL[ref.compType] || ref.compType || '组件'
    const row = byPath.get(path)
    if (!row) {
      issues.push({ level: 'error', message: `【${label}】链接的目标页不存在：${path}` })
      continue
    }
    if (String(row.status) !== '1') {
      const statusText = String(row.status) === '2' ? '已下线' : '草稿未发布'
      issues.push({ level: 'warn', message: `【${label}】链接的目标页「${row.name || path}」当前为${statusText}：${path}` })
    }
  }
  return issues
}
