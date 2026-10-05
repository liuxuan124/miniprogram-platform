const PlanetService = require('../../services/planet')
const warmPlanet = require('../../data/warm-planet')
const { resolveMediaUrl } = require('../../utils/media-url')
const { StorageUtil } = require('../../utils/storage')
const { openWarmShareSheet } = require('../../utils/share')
const { AuthUtil } = require('../../utils/auth')
const { isUnusableImageUrl } = require('../../utils/image-fallback')
const { picsum } = require('../../data/warm-media')
const { putDemoMoment } = require('../../utils/planet-demo-cache')

const MOMENT_LIKES_KEY = 'moment_likes'
const MOMENT_FAVS_KEY = 'moment_favorites'

function readMomentIds(key) {
  // 未登录不返回任何互动态，避免游客态脏数据被当成已点赞/已收藏展示
  if (!AuthUtil.isLoggedIn()) return []
  const raw = StorageUtil.get(key)
  if (!raw) return []
  if (Array.isArray(raw)) return raw.map(String)
  if (typeof raw === 'object') return Object.keys(raw).filter((k) => !!raw[k])
  return []
}

function writeMomentIds(key, ids) {
  if (!AuthUtil.isLoggedIn()) return
  const map = {}
  ;(ids || []).forEach((id) => {
    const k = String(id)
    if (k) map[k] = true
  })
  StorageUtil.set(key, map)
}

function hasMomentId(key, id) {
  return readMomentIds(key).includes(String(id))
}

/**
 * 归一化后台配置的分段：丢空 key / 空显示名，去重 key（防 wx:key 重复告警 + 防两段显示同样内容）。
 * 与 admin/src/utils/preview-planet.ts 的 normalizePlanetSegs 同口径。
 */
function normalizeSegs(raw) {
  if (!Array.isArray(raw)) return []
  const seen = {}
  const out = []
  raw.forEach((it) => {
    const key = String((it && it.key != null ? it.key : '')).trim()
    const label = String((it && it.label != null ? it.label : '')).trim()
    if (!key || !label) return
    if (seen[key]) return
    seen[key] = true
    out.push({ key, label })
  })
  return out
}

/* ========== 样式/显隐归一化（与 admin/src/utils/preview-planet.ts 同规则） ==========
 * 判定规则必须两端一致，否则会出现「预览是胶囊、真机是滑块」「预览截 3 行、真机不截」。
 * 这里不引后台的 TS 文件，按同样的口径重写一遍（小程序端无编译期共享能力）。 */

function obj(raw) {
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
}

function clampNum(v, fallback, min, max) {
  const n = Number(v)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.round(n)))
}

const TAB_VARIANTS = ['pill', 'line', 'text']
const SHADOWS = {
  none: 'none',
  light: '0 4rpx 12rpx rgba(120, 64, 24, 0.08)',
  medium: '0 12rpx 40rpx rgba(120, 64, 24, 0.14)',
}
const RADII = [0, 8, 16]

function normalizeTabStyle(raw) {
  const o = obj(raw)
  return {
    variant: TAB_VARIANTS.indexOf(o.variant) >= 0 ? o.variant : 'pill',
    // 默认继承品牌色 + 默认吸顶：与线上现状一致
    inheritBrand: o.inherit_brand !== false,
    activeBg: String(o.active_bg || ''),
    activeText: String(o.active_text || ''),
    text: String(o.text || ''),
    sticky: o.sticky !== false,
    // 默认自动避让；老页面没这两个字段，auto + 上方无顶栏 = 偏移 0，与旧行为一致
    stickyOffsetMode: o.sticky_offset_mode === 'manual' ? 'manual' : 'auto',
    stickyOffset: clampNum(o.sticky_offset, 0, 0, 200),
  }
}

/**
 * 🔴 吸顶层级穿透修正（2026-10-06）。
 *
 * 原来标签栏吸顶写死 `top: 0`。页面顶部若已有星球顶栏 / 通知公告，
 * 两者会层叠穿透（标签栏压在公告上，滚动时表现为「忽然插到公告上面」）。
 *
 * 自动模式下实测上方顶栏的实际渲染高度（`top` + `height` 求和），
 * 比按配置推算更准 —— 顶栏高度会随文案长度、是否带图变化。
 * 上方没有顶栏时返回 0，行为与改动前完全一致。
 *
 * @param {number} segsTop  标签栏自身的 getBoundingClientRect().top（相对视口）
 * @param {Array}  rects    上方候选元素的 rect 列表
 */
function computeStickyOffset(segTop, rects) {
  // segsTop 为负说明页面已下滚；此时标签栏已吸住，取它当前的实际 top 即为偏移量。
  // 没下滚（segsTop >= 0）说明还没吸顶，偏移量就是上方元素底部到视口顶的距离。
  if (typeof segsTop === 'number' && segsTop < 0) return Math.min(200, Math.round(-segsTop))
  let bottom = 0
  ;(rects || []).forEach((r) => {
    if (r && typeof r.bottom === 'number' && r.bottom > bottom) bottom = r.bottom
  })
  return Math.min(200, Math.max(0, Math.round(bottom)))
}

function normalizeCardStyle(raw) {
  const o = obj(raw)
  const r = Number(o.radius)
  return {
    marginBottom: clampNum(o.margin_bottom, 12, 0, 40),
    padding: clampNum(o.padding, 14, 0, 28),
    radius: RADII.indexOf(r) >= 0 ? r : 16,
    shadow: SHADOWS[o.shadow] || SHADOWS.light,
    imageRatio: o.image_ratio === 'auto' ? 'auto' : 'square',
  }
}

function normalizeVisibility(raw) {
  const o = obj(raw)
  return {
    showTopBadge: o.show_top_badge !== false,
    showInteractions: o.show_interactions !== false,
    // clamp_lines 缺省为 0 = 不截断（不能默认 3，否则线上长文被凭空截断）
    clampLines: clampNum(o.clamp_lines, 0, 0, 8),
  }
}

/**
 * 解析默认高亮分段：配置命中则用它，否则回落第一段，一段都没有才用 all。
 * 关键在第 2 级：运营配了 default_seg 又把该段删掉，不校验就会「哪段都不亮」。
 */
function resolveDefaultSeg(segs, defaultSeg) {
  const want = String(defaultSeg == null ? '' : defaultSeg).trim()
  if (want && segs.some((s) => s.key === want)) return want
  return (segs[0] && segs[0].key) || 'all'
}

/**
 * 给每个分段挂上 `style`（行内样式串）。
 * 必须在 activeSeg 变化时重算 —— 选中态的配色依赖它，
 * 只在 _load 里算一次的话，点了另一个分段后高亮色不会跟着换。
 */
function decorateSegs(segs, tabStyle, activeSeg) {
  return segs.map((s) => ({
    key: s.key,
    label: s.label,
    style: segInlineStyle(tabStyle, s.key === activeSeg),
  }))
}

/**
 * 卡片行内样式。
 * ⚠️ 单位是 rpx（小程序端用 rpx，后台预览用 px）：
 * 后台面板里配的是「px 语义值」（圆角 8/16、间距 12），
 * 这里统一 ×2 转 rpx（750rpx = 375pt，1px ≈ 2rpx），两端视觉一致。
 * 不能直接把后台的 px 串原样塞进来，否则真机上圆角会小一半。
 */
function cardStyleInline(cs) {
  const padBottom = Math.max(6, cs.padding - 4)
  return [
    `margin-bottom:${cs.marginBottom * 2}rpx`,
    `padding:${cs.padding * 2}rpx ${(cs.padding + 1) * 2}rpx ${padBottom * 2}rpx`,
    `border-radius:${cs.radius * 2}rpx`,
    `box-shadow:${cs.shadow}`,
  ].join(';') + ';'
}

/**
 * 分段行内样式。
 * 「继承品牌色」时不产出任何行内样式，交给 WXSS 的 var(--brand) 兜底 ——
 * 这样后台勾了继承，真机就真的跟随主题色，而不是被一个写死色盖住。
 */
function segInlineStyle(tabStyle, isActive) {
  if (tabStyle.inheritBrand) return ''
  if (isActive) {
    const parts = []
    if (tabStyle.activeText) parts.push(`color:${tabStyle.activeText}`)
    // 滑块/纯文本风格不做底色，只有胶囊才铺背景，否则滑块会被整块色盖掉指示线
    if (tabStyle.variant === 'pill' && tabStyle.activeBg) parts.push(`background:${tabStyle.activeBg}`)
    return parts.join(';') + (parts.length ? ';' : '')
  }
  return tabStyle.text ? `color:${tabStyle.text};` : ''
}

function isTruthyDemo(v) {
  return v === true || v === 'true' || v === 1 || v === '1'
}

function parseCount(v) {
  const s = String(v == null ? '0' : v).trim().toLowerCase()
  const k = s.match(/^([\d.]+)\s*k$/)
  if (k) return Math.round(parseFloat(k[1]) * 1000)
  const n = parseInt(s.replace(/[^\d]/g, ''), 10)
  return Number.isFinite(n) ? n : 0
}

function formatFileSize(bytes) {
  const n = Number(bytes)
  if (!Number.isFinite(n) || n <= 0) return ''
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  if (n >= 1024) return `${Math.round(n / 1024)} KB`
  return `${n} B`
}

function mapFeedItem(item) {
  const tags = Array.isArray(item.tags) ? item.tags : []
  const tagStr = tags.map((t) => String(t)).join(' ')
  const isPinned = !!(item.isPinned || item.pinned || item.top)
  const author = item.author || '球友'
  const images = Array.isArray(item.images) ? item.images.map((u) => resolveMediaUrl(u)).filter(Boolean) : []
  let answer = item.answer || ''
  let contentText = String(item.content || item.summary || item.title || '').replace(/<[^>]+>/g, '')
  const ansSplit = contentText.split(/\n---ANSWER---\n/)
  if (ansSplit.length > 1) {
    contentText = ansSplit[0].trim()
    if (!answer) answer = ansSplit[1].trim()
  }
  const attachments = Array.isArray(item.attachments) ? item.attachments : []
  let file = item.file || null
  // 附件卡片：一条动态可挂多份资料（如「五年展望 + 5-8 月月报」），
  // 统一映射成 files 数组渲染；item.file 保留兼容旧数据/后台自定义卡片。
  // 权限提示按后端 enrichAttachments 回填的字段走：
  //   canDownload=true  → 「可直接下载」（free 资料）
  //   否则              → lockedReason || 「星球会员可看」（member 资料）
  const files = attachments.map((a) => {
    const open = a.canRead === true || a.canDownload === true
    const tip = open
      ? (a.canDownload === true ? '可直接下载' : '可在线阅读')
      : (a.lockedReason || a.previewText || '星球会员可看')
    return {
      name: a.name || '附件.pdf',
      meta: [formatFileSize(a.size), item.viewCount ? `${item.viewCount} 人看过` : '', tip]
        .filter(Boolean)
        .join(' · '),
      fileId: a.fileId || '',
      open,
    }
  })
  if (!file && files.length) file = files[0]
  const id = item.id || item.uid || ''
  const isDemo = !!item.isDemo || !item.id
  // roleText 需带上 item.tag —— 星主/打卡常只打在 tag 单值上（如演示数据、线上接口
  // 返回的 tag 字段），只看 tags 数组会漏判，「只看星主」会筛出空列表。
  const roleText = tagStr + ' ' + String(item.tag || '')
  return {
    uid: String(item.uid || id || Math.random()),
    id,
    isDemo,
    top: isPinned,
    hot: item.hot != null ? !!item.hot : (/热议|热/.test(tagStr) || Number(item.likeCount) > 200),
    author,
    authorInitial: item.authorInitial || String(author).slice(0, 1),
    // 「只看星主」页签依据：显式角色字段优先，其次按 tag/作者名兜底判定
    isHost: item.isHost != null
      ? !!item.isHost
      : (String(item.authorRole || item.author_role || '').indexOf('星主') >= 0
        || /星主|官方/.test(roleText)
        || /星主|主理|owner/i.test(String(author))),
    isHomework: item.isHomework != null
      ? !!item.isHomework
      : (/作业|打卡|交作业/.test(roleText)),
    tagGold: item.tagGold || (isPinned ? '置顶' : (/精华/.test(tagStr) ? '精华' : '')),
    tag: item.tag || tags.find((t) => /星主|提问|打卡|官方|特约/.test(String(t))) || '',
    avatar: (() => {
      const raw = resolveMediaUrl(item.authorAvatar || item.avatar || '')
      if (raw && !isUnusableImageUrl(raw)) return raw
      return picsum('u' + ((String(author).charCodeAt(0) % 8) + 1), 80, 80)
    })(),
    time: item.time || String(item.publishedAt || item.createTime || '').replace('T', ' ').slice(0, 16),
    content: contentText,
    answer,
    topics: item.topics || tags.filter((t) => !/置顶|星主|精华|提问|官方|打卡|特约/.test(String(t))).map((t) => (String(t).indexOf('#') === 0 ? t : `#${t}`)).join(' '),
    images,
    likes: item.likeCount != null ? String(item.likeCount) : (item.likes || '0'),
    comments: item.commentCount != null ? String(item.commentCount) : (item.comments || '0'),
    liked: hasMomentId(MOMENT_LIKES_KEY, id),
    favorited: hasMomentId(MOMENT_FAVS_KEY, id),
    file,
    files: files.length ? files : (file ? [file] : []),
    type: item.type || '',
  }
}

const DEMO_FEED_LIST = warmPlanet.FEED.map(mapFeedItem)

Component({
  properties: {
    config: { type: Object, value: {} },
    /**
     * 外层算好的行内样式串（render.js 的 parseStyle 产物）。
     * 只用它判断「有没有配通栏底色」，不直接渲染 ——
     * 底色本身由外层 wrapper 承担，这里只负责让内部卡片让位。
     */
    styleString: { type: String, value: '' },
  },
  data: {
    segs: warmPlanet.SEGS,
    /** 已归一 + 已回落默认的原始分段（不带行内样式），切段重算样式的基准 */
    segsBase: warmPlanet.SEGS,
    activeSeg: 'all',
    allList: DEMO_FEED_LIST,
    list: DEMO_FEED_LIST,
    footerText: '—— 演示数据 ——',
    usingDemo: true,
    resourcesUrl: '/pkg-content/resources/resources',
    tabStyle: normalizeTabStyle(null),
    cardStyle: normalizeCardStyle(null),
    /** 预拼好的行内样式串：WXML 里拼三元+字符串拼接太脆，放 JS 算一次 */
    cardStyleInline: '',
    vis: normalizeVisibility(null),
    /** 吸顶时距离页面顶部的偏移（px）；自动模式实测上方顶栏高度得出 */
    stickyTop: 0,
    /** 外层是否配了通栏底色（卡片据此让位成半透明） */
    hasSectionBg: false,
  },
  lifetimes: {
    attached() {
      this._load()
      this._applySectionBg()
      // DOM 落地后再量高度，attached 时 getBoundingClientRect 还拿不到
      setTimeout(() => this._measureStickyTop(), 60)
    },
  },
  observers: {
    config() { this._load(); setTimeout(() => this._measureStickyTop(), 60) },
    // 后台改「背景色」→ styleString 变化 → 要重算卡片让位与吸顶条配色
    styleString() { this._applySectionBg() },
  },
  methods: {
    /**
     * 通栏底色是否被配了。
     *
     * 背景色由外层 wrapper 渲染（parseStyle 已把 background_color 转成 background），
     * 但卡片是不透明米白/渐变，会把底色整块遮死。这里据此把卡片让成半透明。
     * 与后台 `PlanetFeedRenderer` 的 `has-bg` 判定同规则。
     */
    _applySectionBg() {
      const s = String(this.data.styleString || '')
      // 只认 background(-color) 声明；渐变也算（运营可能配 background-image）
      const has = /(^|;)\s*background(-color)?\s*:/.test(s)
      if (has !== this.data.hasSectionBg) this.setData({ hasSectionBg: has })
    },
    /**
     * 实测吸顶偏移。手动模式直接用配置值；自动模式量上方顶栏的实际高度。
     * 类名与 dsl-renderer 的渲染分支保持一致 —— 找不到就回落 0（= 旧行为）。
     */
    _measureStickyTop() {
      const ts = this.data.tabStyle || normalizeTabStyle(null)
      if (!ts.sticky) {
        if (this.data.stickyTop !== 0) this.setData({ stickyTop: 0 })
        return
      }
      if (ts.stickyOffsetMode === 'manual') {
        if (this.data.stickyTop !== ts.stickyOffset) this.setData({ stickyTop: ts.stickyOffset })
        return
      }
      const self = this
      // ⚠️ 选择器必须与 dsl-renderer.wxml 里的真实标签对齐（核实过）：
      // notice_bar / planet_hero 是自定义组件（tag 选择器），
      // planet_topics 才是 view.class 形态。写错一个就量不到，会回落 0 = 旧行为。
      // 🔴 这里**不能**用 `.in(this)`：`.in` 把查询域锁在本组件内，
      // 上方的兄弟节点（顶栏/公告）根本不在域内，永远返回 null。
      // 但 `.pl-segs`（自身节点）用 `.in(this)` 才量得到 —— 拆成两条查询。
      wx.createSelectorQuery()
        .in(this)
        .select('.pl-segs')
        .boundingClientRect()
        .exec(function (selfRes) {
          const segsRect = selfRes && selfRes[0]
          wx.createSelectorQuery()
            .select('dsl-notice-bar')
            .boundingClientRect()
            .select('dsl-planet-hero')
            .boundingClientRect()
            .select('.dsl-planet-topics')
            .boundingClientRect()
            .exec(function (res) {
              if (!res || !res.length) return
              const next = computeStickyOffset(segsRect && segsRect.top, res.filter(Boolean))
              if (next !== self.data.stickyTop) self.setData({ stickyTop: next })
            })
        })
    },
    _load() {
      const c = this.data.config || {}
      const configured = normalizeSegs(c.segs)
      const segs = configured.length ? configured : warmPlanet.SEGS
      const pageSize = clampNum(c.page_size, 20, 5, 50)
      const resourcesUrl = c.resources_url || '/pkg-content/resources/resources'
      const manual = String(c.source_mode || 'auto') === 'manual'
      // 运营可能把默认段删掉：选中项必须落在实际存在的分段里，
      // 否则首屏没有任何高亮、且落到「不过滤」分支，看起来像白屏/点了没反应。
      // default_seg 配的段不存在时也回落第一段（与后台 resolvePlanetDefaultSeg 同规则）。
      const configuredActive = resolveDefaultSeg(segs, c.default_seg)
      const activeSeg = segs.some((s) => s.key === this.data.activeSeg)
        ? (segs.some((s) => s.key === configuredActive) ? configuredActive : this.data.activeSeg)
        : configuredActive
      const tabStyle = normalizeTabStyle(c.tabStyle)
      const cardStyle = normalizeCardStyle(c.cardStyle)
      const vis = normalizeVisibility(c.visibility)
      // 保留 DEMO 列表，不先清空；只更新 tabs
      this.setData({
        segs: decorateSegs(segs, tabStyle, activeSeg),
        segsBase: segs,
        resourcesUrl,
        activeSeg,
        tabStyle,
        cardStyle,
        cardStyleInline: cardStyleInline(cardStyle),
        vis,
      })
      if (manual && Array.isArray(c.items) && c.items.length) {
        this._applySeg(c.items.map(mapFeedItem), true)
        return
      }
      // 排序与星球 ID 透传给接口；非法 sortBy 由后端回落 new，这里只做存在性判断
      const sortBy = ['new', 'hot', 'reply'].indexOf(String(c.sort_by || 'new')) >= 0 ? String(c.sort_by) : 'new'
      PlanetService.getMainPlanet().catch(() => null).then((main) => {
        // 运营显式指定圈子/星球 ID 时优先用它，不跟随用户当前主星球设置
        const explicit = String(c.planet_id || '').trim()
        const planetId = explicit || (main && main.planetId) || PlanetService.getCachedMainPlanetId() || ''
        return PlanetService.getPlanetFeed({ current: 1, size: pageSize, planetId, sortBy })
      }).then((feed) => {
        const records = (feed && (feed.records || feed.list || feed.items)) || []
        if (!records.length) return // 空结果保留 DEMO，避免列表塌陷再跳回
        this._applySeg(records.map(mapFeedItem), false)
      }).catch(() => {})
    },
    _applySeg(allList, usingDemo) {
      const key = this.data.activeSeg
      let list = allList || []
      if (key === 'official') list = allList.filter((i) => i.type === 'official' || /官方|星主/.test(i.tag || ''))
      else if (key === 'essence') list = allList.filter((i) => i.type === 'essence' || i.tagGold === '精华')
      else if (key === 'ask') list = allList.filter((i) => i.type === 'ask' || /提问/.test(i.tag || ''))
      else if (key === 'checkin') list = allList.filter((i) => i.type === 'checkin' || /打卡/.test(i.tag || ''))
      // 「只看星主」：按 isHost 判定，未打标的内容不误入
      else if (key === 'host') list = allList.filter((i) => i.isHost)
      // 「作业」：按 isHomework 判定（作业/打卡类）
      else if (key === 'homework') list = allList.filter((i) => i.isHomework)
      // 白名单外的 key（如运营手填的 seg / 自造 key）：不报错但也不筛选，
      // 只会静默返回全量 —— 打一条 warn，避免排查时误判成「控件坏了」。
      else if (!['all', 'resources'].includes(key)) {
        console.warn('[dsl-planet-feed] 未定义的分区 key，该分段点了不会筛选：', key)
      }
      this.setData({
        allList,
        list,
        usingDemo: !!usingDemo,
        footerText: list.length
          ? (usingDemo ? '—— 演示数据 ——' : `—— 已加载 ${list.length} 条 ——`)
          : '暂无动态',
      })
    },
    onSegTap(e) {
      const key = e.currentTarget.dataset.key
      if (!key || key === this.data.activeSeg) return
      if (key === 'resources') {
        const url = this.data.resourcesUrl
        wx.navigateTo({ url, fail() { wx.switchTab({ url }) } })
        return
      }
      // 切段后要重算每段的行内样式，否则自定义配色下高亮色不会跟着换。
      // ⚠️ 必须用 segsBase（_load 已归一 + 回落过的结果）重算，
    // 不能拿 config.segs 再 normalize 一次 —— config.segs 为空时
    // 线上是回落到 warmPlanet.SEGS 的，这里会 normalize 成空数组把标签栏清空。
      this.setData({
        activeSeg: key,
        segs: decorateSegs(this.data.segsBase || [], this.data.tabStyle, key),
      })
      this._applySeg(this.data.allList, this.data.usingDemo)
    },
    _momentNavUrl(id, demo) {
      const mid = String(id || '').trim()
      const asDemo = isTruthyDemo(demo) || !mid || mid.indexOf('demo') === 0 || !!this.data.usingDemo
      if (asDemo) {
        return '/pkg-content/moment-detail/moment-detail?demo=1&from=planet' + (mid ? `&id=${encodeURIComponent(mid)}` : '')
      }
      return `/pkg-content/moment-detail/moment-detail?id=${encodeURIComponent(mid)}&from=planet`
    },
    _resolveMomentKey(ds, item) {
      const mid = String((ds && (ds.id || ds.uid)) || (item && (item.id || item.uid)) || '')
      if (mid) return mid
      if (isTruthyDemo(ds && ds.demo) || (item && item.isDemo) || this.data.usingDemo) return 'demo'
      return ''
    },
    onOpen(e) {
      const ds = e.currentTarget.dataset || {}
      const demo = isTruthyDemo(ds.demo) || !!this.data.usingDemo
      // 演示数据没有服务端详情，把这条落缓存，详情页据此渲染同一条内容
      if (demo) {
        const item = (this.data.list || [])[Number(ds.index)]
            || (this.data.list || []).find((i) => String(i.id || i.uid) === String(ds.id || ds.uid))
        if (item) putDemoMoment(item)
      }
      wx.navigateTo({ url: this._momentNavUrl(ds.id || ds.uid, demo) })
    },
    onLikeTap(e) {
      if (!AuthUtil.requireLoginQuiet('点赞')) return
      const ds = e.currentTarget.dataset || {}
      const list = (this.data.list || []).slice()
      const i = Number(ds.index)
      const item = list[i]
      if (!item) return
      const mid = this._resolveMomentKey(ds, item)
      if (!mid) return
      const liked = !item.liked
      const likes = String(Math.max(0, parseCount(item.likes) + (liked ? 1 : -1)))
      const ids = readMomentIds(MOMENT_LIKES_KEY)
      if (liked) {
        if (!ids.includes(mid)) ids.push(mid)
      } else {
        const idx = ids.indexOf(mid)
        if (idx >= 0) ids.splice(idx, 1)
      }
      writeMomentIds(MOMENT_LIKES_KEY, ids)
      list[i] = Object.assign({}, item, { liked, likes })
      const allList = (this.data.allList || []).map((row) =>
        String(row.id || row.uid) === mid ? Object.assign({}, row, { liked, likes }) : row
      )
      this.setData({ list, allList })
      wx.showToast({ title: liked ? '已点赞' : '已取消点赞', icon: 'none' })
    },
    onCommentTap(e) {
      const ds = e.currentTarget.dataset || {}
      wx.navigateTo({ url: this._momentNavUrl(ds.id || ds.uid, isTruthyDemo(ds.demo) || this.data.usingDemo) })
    },
    onFavoriteTap(e) {
      if (!AuthUtil.requireLoginQuiet('收藏')) return
      const ds = e.currentTarget.dataset || {}
      const list = (this.data.list || []).slice()
      const i = Number(ds.index)
      const item = list[i]
      if (!item) return
      const mid = this._resolveMomentKey(ds, item)
      if (!mid) return
      const favorited = !item.favorited
      const ids = readMomentIds(MOMENT_FAVS_KEY)
      if (favorited) {
        if (!ids.includes(mid)) ids.push(mid)
      } else {
        const idx = ids.indexOf(mid)
        if (idx >= 0) ids.splice(idx, 1)
      }
      writeMomentIds(MOMENT_FAVS_KEY, ids)
      list[i] = Object.assign({}, item, { favorited })
      const allList = (this.data.allList || []).map((row) =>
        String(row.id || row.uid) === mid ? Object.assign({}, row, { favorited }) : row
      )
      this.setData({ list, allList })
      wx.showToast({ title: favorited ? '已收藏' : '已取消收藏', icon: 'none' })
    },
    onShareTap(e) {
      if (!AuthUtil.requireLoginQuiet('分享')) return
      const ds = e.currentTarget.dataset || {}
      const item = (this.data.list || [])[Number(ds.index)] || {}
      const demo = isTruthyDemo(ds.demo) || !!item.isDemo || !!this.data.usingDemo
      const mid = this._resolveMomentKey(ds, item) || 'demo'
      openWarmShareSheet({
        title: (item.content || '').slice(0, 40) || '星球动态',
        path: this._momentNavUrl(ds.id || ds.uid || item.id || item.uid, demo),
        cover: (item.images && item.images[0]) || '',
        quote: (item.content || '').slice(0, 80),
        contentId: mid,
      })
    },
    onMoreTap(e) {
      wx.showActionSheet({
        itemList: ['举报', '不感兴趣'],
        success: (res) => {
          if (res.tapIndex === 0) {
            // 2026-10-05：原来只弹 toast 不发请求，举报永远进不了后台。
            // 现在真发到 /api/v1/mp/report，落 mp_copyright_complaint。
            const ds = (e && e.currentTarget && e.currentTarget.dataset) || {}
            const targetId = ds.id || ds.uid
            if (!targetId) {
              wx.showToast({ title: '暂无可举报的内容', icon: 'none' })
              return
            }
            const { reportWithReason, TARGET } = require('../../utils/report')
            reportWithReason({ targetType: TARGET.PLANET_POST, targetId, presetTitle: '这条动态' })
          } else if (res.tapIndex === 1) {
            wx.showToast({ title: '将减少此类内容', icon: 'none' })
          }
        },
      })
    },
    onOpenFile(e) {
      const file = (e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.file) || {}
      if (file.fileId) {
        wx.navigateTo({ url: `/pkg-content/file-preview/file-preview?id=${file.fileId}` })
        return
      }
      wx.navigateTo({
        url: `/pkg-content/file-preview/file-preview?demo=1&name=${encodeURIComponent(file.name || '附件.pdf')}`,
      })
    },
  },
})
