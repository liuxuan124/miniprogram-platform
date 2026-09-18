// pages/content-detail/content-detail.js
const request = require('../../utils/request')
const productService = require('../../services/product')
const { StorageUtil } = require('../../utils/storage')
const { createSharePageConfig, openWarmShareSheet } = require('../../utils/share')
const { AuthUtil } = require('../../utils/auth')
const { hasFavoriteId, readFavoriteIds, writeFavoriteIds } = require('../../utils/favorite-ids')
const { resolveMediaUrl } = require('../../utils/media-url')
const {
  isUnusableImageUrl,
  resolveDisplayAvatarUrl,
  resolveDisplayProductUrl,
} = require('../../utils/image-fallback')
const {
  buildNoteGalleryUrls,
  extractImagesFromHtml,
  extractNoteParagraphs,
  hashTags: buildHashTags,
  inferWechatNewspic,
} = require('../../utils/note-content')
const {
  estimateReadMinutes,
  extractArticleSummary,
  extractLeadParagraph,
  stripLeadParagraph,
  formatReadTimeLabel,
  isDisplayableCategory,
  prepareArticleContentHtml,
  buildMpHtmlBodyStyles,
} = require('../../utils/article-content')
const { ITEMS, TOPIC_NAME, artStyle } = require('../../data/prototype-home')
const { USE_LOCAL_SOURCE } = require('../../data/warm-source')
const { DEMO_ARTICLE } = require('../../data/warm-demo')

function currentUserId() {
  const info = AuthUtil.getUserInfo() || {}
  return String(info.id || info.userId || '').trim()
}

function isMyCommentRow(c) {
  const uid = currentUserId()
  if (!uid) return false
  return String((c && (c.userId || c.user_id)) || '') === uid
}

function getStatusBarHeight() {
  try {
    const sys = wx.getSystemInfoSync()
    return Number(sys.statusBarHeight) || 20
  } catch (e) {
    return 20
  }
}

function formatViewLabel(count) {
  const n = Number(count) || 0
  if (n >= 10000) {
    const v = (n / 10000).toFixed(1).replace(/\.0$/, '')
    return `${v} 万阅读`
  }
  if (n >= 1000) {
    const v = (n / 1000).toFixed(1).replace(/\.0$/, '')
    return `${v}k 阅读`
  }
  return n > 0 ? `${n} 阅读` : ''
}

function looksLikeFeatureTag(text) {
  const s = String(text || '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!s || s.length > 24) return false
  return /今日精选|年度精选|创作者手记|精选/.test(s) && !/[。！？]/.test(s)
}

function isWarmFeatureArticle(article) {
  if (!article) return false
  const title = String(article.title || '').trim()
  if (title === DEMO_ARTICLE.title) return true
  const ext = String(article.externalId || article.external_id || '').trim()
  if (ext === 'warm-home-feature') return true
  const summary = String(article.summary || article.seoDescription || '').trim()
  const tags = Array.isArray(article.tags) ? article.tags : []
  const titleHint = /内容不再免费|创作者的第\s*1000/.test(title)
  if (titleHint && (looksLikeFeatureTag(summary) || tags.some(looksLikeFeatureTag))) return true
  return false
}

function isWarmDeskNote(article) {
  if (!article) return false
  const title = String(article.title || '').trim()
  const ext = String(article.externalId || article.external_id || '').trim()
  if (ext === 'warm-note-desk' || ext === 'warm-note-d1' || ext === 'warm-home-f2') return true
  if (/书桌改造/.test(title)) return true
  return false
}

function isWarmMealNote(article) {
  if (!article) return false
  const title = String(article.title || '').trim()
  const ext = String(article.externalId || article.external_id || '').trim()
  if (ext === 'warm-note-d2' || ext === 'warm-home-f3') return true
  if (/一周三餐|在家做饭/.test(title)) return true
  return false
}

function isWarmProtoNote(article) {
  return isWarmDeskNote(article) || isWarmMealNote(article)
}

function pickWarmNoteDemo(article) {
  const { DEMO_NOTE, DEMO_MEAL_NOTE } = require('../../data/warm-demo')
  return isWarmMealNote(article) ? DEMO_MEAL_NOTE : DEMO_NOTE
}

/** 暖阁种子笔记：生产也允许原型字段兜底（作者角色 / 专栏卡 / 评论） */
function allowWarmNoteOverlay(article) {
  if (USE_LOCAL_SOURCE) return true
  const id = String((article && article.id) || '')
  if (id.indexOf('warm-demo') === 0) return true
  const src = String((article && (article.externalSource || article.external_source)) || '')
  if (src === 'warm_seed') return true
  return isWarmProtoNote(article)
}

function mapWarmNoteComments(list) {
  return (list || []).map((c, i) => ({
    id: 'warm-c' + i,
    nickName: c.nick,
    avatar: resolveDisplayAvatarUrl(c.avatar),
    avatarText: String(c.nick || '用').slice(0, 1),
    content: c.text,
    timeText: i === 2 ? '09-13' : '09-12',
    likes: c.likes || 0,
    reply: c.reply || '',
    mine: false,
  }))
}

function pickWarmAvatar(apiUrl, demoUrl) {
  const resolved = resolveMediaUrl(apiUrl)
  if (resolved && !isUnusableImageUrl(resolved)) return resolved
  return resolveDisplayAvatarUrl(demoUrl)
}

function shouldPreferDemoBody(html) {
  const plain = String(html || '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!plain) return true
  if (looksLikeFeatureTag(plain)) return true
  // 种子误把首页 feature tag / pill / 标题当正文
  if (plain.length < 48 && /精选|深度|手记|会员专享|图文/.test(plain)) return true
  if (plain.length < 80) return true
  return false
}

const LIKES_KEY = 'content_likes'
const FOLLOWS_KEY = 'author_follows'
const COMMENTS_KEY = 'content_comments'
const AUTHOR_ID = 'aze'
const AUTHOR_NAME = '暖阁 · 阿哲'

const CAT_TO_TOPIC = {
  选品洞察: 'select',
  供应链: 'supply',
  平台运营: 'platform',
  独立站: 'dtc',
  物流履约: 'logistics',
  合规税务: 'compliance',
}

const SystemService = require('../../services/system')
const { getProductEnabledSync, blockTradeNavigation } = require('../../utils/product-module-gate')
const { isValidContentId, resolveContentIdFromOptions } = require('../../utils/content-id')

function getCommentEnabledSync() {
  try {
    const app = getApp()
    if (app && app.globalData && app.globalData.commentModuleEnabled !== undefined) {
      return app.globalData.commentModuleEnabled !== false
    }
    const cached = SystemService.getCachedConfig()
    if (cached && cached.plugins !== undefined) {
      return SystemService.isCommentModuleEnabled(cached.plugins)
    }
  } catch (e) {
    // ignore
  }
  return true
}

const PROTO_BY_TITLE = Object.fromEntries(ITEMS.map((i) => [i.title, i]))
function embedProductCards(html) {
  if (!html || typeof html !== 'string') return html || ''
  if (!getProductEnabledSync()) {
    return html.replace(/<product\s+id=["']?(\d+)["']?\s*\/?>/gi, '')
  }
  return html.replace(/<product\s+id=["']?(\d+)["']?\s*\/?>/gi, (_m, id) => {
    const url = `/pages/product-detail/product-detail?id=${id}`
    return `<a href="${url}" class="mp-product-card" style="display:block;margin:16px 0;padding:12px 14px;border:1px solid #e8edf5;border-radius:10px;background:#f8fafc;text-decoration:none;color:#172033;"><div style="font-size:12px;color:#64748b;margin-bottom:4px;">相关商品</div><div style="font-size:15px;font-weight:700;">查看商品 #${id}</div><div style="font-size:12px;color:#1769ff;margin-top:6px;">点击进入详情 →</div></a>`
  })
}

function resolveFormat(item) {
  const type = String(item.contentType || item.content_type || '').toLowerCase()
  if (type === 'note') {
    return { key: 'note', label: '笔记', isNote: true }
  }
  if (type === 'video') {
    return { key: 'video', label: '视频', isNote: false }
  }
  if (type === 'data') {
    return { key: 'data', label: '数据', isNote: false }
  }
  if (type === 'article' || type === 'longform') {
    if (inferWechatNewspic(item)) {
      return { key: 'note', label: '笔记', isNote: true }
    }
    return { key: 'article', label: '长文', isNote: false }
  }

  const wxTags = Array.isArray(item.tags) ? item.tags : []
  if (wxTags.some((t) => t === 'wx-type:newspic')) {
    return { key: 'note', label: '笔记', isNote: true }
  }
  if (inferWechatNewspic(item)) {
    return { key: 'note', label: '笔记', isNote: true }
  }
  if (wxTags.some((t) => t === 'wx-type:news')) {
    return { key: 'article', label: '长文', isNote: false }
  }

  const source = String(item.source || '').trim()
  if (source === '笔记' || /笔记|小红书|xhs/i.test(source)) {
    return { key: 'note', label: '笔记', isNote: true }
  }
  if (source === '视频' || /视频|video/i.test(source)) {
    return { key: 'video', label: '视频', isNote: false }
  }
  if (source === '数据' || /^数据/.test(source)) {
    return { key: 'data', label: '数据', isNote: false }
  }
  if (source === '长文' || /长文|公众号|专栏/i.test(source)) {
    return { key: 'article', label: '长文', isNote: false }
  }

  const tags = Array.isArray(item.tags) ? item.tags : []
  if (tags.some((t) => /笔记|小红书/.test(String(t)))) {
    return { key: 'note', label: '笔记', isNote: true }
  }
  if (tags.some((t) => /视频/.test(String(t)))) {
    return { key: 'video', label: '视频', isNote: false }
  }
  if (tags.some((t) => /^数据$/.test(String(t)))) {
    return { key: 'data', label: '数据', isNote: false }
  }
  return { key: 'article', label: '长文', isNote: false }
}

function fmtDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return String(iso).slice(5, 10) || iso
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${m}-${day}`
}

/** 解析原型文案里的 3.4k / 1.2w */
function parseStatCount(stat) {
  if (stat == null || stat === '') return 0
  if (typeof stat === 'number') return stat
  const s = String(stat).trim().toLowerCase().replace(/,/g, '')
  const m = s.match(/^([\d.]+)\s*([kw万])?/)
  if (!m) return parseInt(s, 10) || 0
  const n = parseFloat(m[1]) || 0
  const unit = m[2]
  if (unit === 'w' || unit === '万') return Math.round(n * 10000)
  if (unit === 'k') return Math.round(n * 1000)
  return Math.round(n)
}

function formatCount(n) {
  const num = Math.max(0, Number(n) || 0)
  if (num >= 10000) {
    const v = (num / 10000).toFixed(1).replace(/\.0$/, '')
    return `${v}w`
  }
  if (num >= 1000) {
    const v = (num / 1000).toFixed(1).replace(/\.0$/, '')
    return `${v}k`
  }
  return String(num)
}

function readIdList(key) {
  const raw = StorageUtil.get(key)
  if (!raw) return []
  // 兼容旧数组 与 新 map：{ "12": true }
  if (Array.isArray(raw)) {
    return raw.map((x) => String(x)).filter(Boolean)
  }
  if (typeof raw === 'object') {
    return Object.keys(raw).filter((k) => !!raw[k])
  }
  return []
}

function writeIdList(key, ids) {
  const map = {}
  ;(ids || []).forEach((id) => {
    const k = String(id)
    if (k && k !== 'NaN' && k !== 'undefined') map[k] = true
  })
  StorageUtil.set(key, map)
}

function hasStoredId(key, id) {
  return readIdList(key).includes(String(id))
}

function readComments(contentId) {
  const all = StorageUtil.get(COMMENTS_KEY) || {}
  const list = all[String(contentId)]
  return Array.isArray(list) ? list : []
}

function writeComments(contentId, list) {
  const all = StorageUtil.get(COMMENTS_KEY) || {}
  all[String(contentId)] = list
  StorageUtil.set(COMMENTS_KEY, all)
}

function seedComments(contentId, likeHint) {
  const existing = readComments(contentId)
  if (existing.length) return existing
  const seeded = [
    {
      id: `s1-${contentId}`,
      nickName: '读者小林',
      avatarText: '林',
      content: '太真实了，收费这件事我纠结了很久，这篇给了勇气。',
      timeText: '2小时前',
      likes: Math.max(3, Math.floor((likeHint || 20) / 80)),
    },
    {
      id: `s2-${contentId}`,
      nickName: '写作者阿木',
      avatarText: '木',
      content: '第三年那段说得对，日更真的不是唯一解。',
      timeText: '昨天',
      likes: Math.max(1, Math.floor((likeHint || 20) / 120)),
    },
  ]
  writeComments(contentId, seeded)
  return seeded
}

Page({
  ...createSharePageConfig(),
  data: {
    article: {},
    loading: true,
    loadFailed: false,
    loadErrorText: '',
    liked: false,
    favorited: false,
    hasCommented: false,
    followed: false,
    isNote: false,
    isWechatNewspic: false,
    formatKey: 'article',
    formatLabel: '长文',
    topicName: '',
    layoutTheme: 'warm',
    bodyContainerStyle: '',
    bodyTagStyle: {},
    videoUrl: '',
    articleMetaLine: '',
    articleLede: '',
    readProgress: 0,
    relatedProducts: [],
    gallerySlides: [],
    galleryIndex: 0,
    galleryCount: 0,
    galleryHeight: 750,
    noteParagraphs: [],
    hashTags: [],
    artStyle: '',
    glyph: '📌',
    metaLine: '',
    likeDisplay: '0',
    favoriteDisplay: '0',
    commentEnabled: true,
    commentCount: 0,
    commentCountDisplay: '0',
    showCommentSheet: false,
    comments: [],
    commentDraft: '',
    commentSubmitting: false,
    authorName: AUTHOR_NAME,
    authorAvatar: '',
    authorInitial: '哲',
    authorRole: '',
    contentLocked: false,
    lockedReason: '',
    memberWall: {
      remainPercent: '',
      desc: '',
      memberYearPrice: '',
      unlockProductId: '',
      unlockProductName: '',
    },
    relatedReads: [],
    articleCover: '',
    articleTag: '',
    noteGoods: null,
    isWarmArticle: false,
    isWarmNote: false,
    statusBarHeight: getStatusBarHeight(),
  },

  onLoad(options) {
    this.setData({ statusBarHeight: getStatusBarHeight() })
    const demo = options && options.demo
    if (demo === 'ebook-trial') {
      this._applyEbookTrialDemo()
      return
    }
    // demo=note / demo=meal：本地兜底链；生产 feed 应走真实 id
    if (demo === 'note' || demo === 'meal') {
      this._loadMemberWallConfig()
      this._applyWarmDemo(demo === 'meal' ? 'meal' : 'note')
      return
    }
    if (USE_LOCAL_SOURCE) {
      this._loadMemberWallConfig()
      this._applyWarmDemo('article')
      return
    }
    const id = resolveContentIdFromOptions(options)
    if (!isValidContentId(id)) {
      this.setData({ loading: false, loadFailed: true })
      wx.showToast({ title: '内容不存在', icon: 'none' })
      return
    }
    this._contentId = String(id).trim()
    this.setData({ commentEnabled: getCommentEnabledSync() })
    this._loadMemberWallConfig()
    this._loadArticleDetail(this._contentId)
  },

  _loadMemberWallConfig() {
    SystemService.fetchSystemConfig(false)
      .then((cfg) => {
        const wall = (cfg && cfg.contentMemberWall) || {}
        this.setData({
          memberWall: {
            remainPercent: wall.remainPercent || '',
            desc: wall.desc || '',
            memberYearPrice: wall.memberYearPrice || '',
            unlockProductId: wall.unlockProductId || '',
            unlockProductName: wall.unlockProductName || '',
          },
        })
      })
      .catch(() => {})
  },

  onBack() {
    const pages = getCurrentPages()
    if (pages && pages.length > 1) {
      wx.navigateBack({ delta: 1 })
      return
    }
    wx.switchTab({ url: '/pages/index/index' })
  },

  _applyEbookTrialDemo() {
    const { DEMO_GOODS } = require('../../data/warm-demo')
    const tr = (DEMO_GOODS && DEMO_GOODS.tryRead) || {}
    const demoId = 'warm-demo-ebook-trial'
    this._contentId = demoId
    const paras = Array.isArray(tr.paragraphs) ? tr.paragraphs : []
    const html = [
      `<p><b>试读 · ${DEMO_GOODS.title || '电子书'}</b></p>`,
      ...paras.map((p) => `<p>${p}</p>`),
      '<p style="color:#a1887a;font-size:13px">—— 试读到此结束，购买后继续阅读后续章节 ——</p>',
    ].join('')
    const bodyStyles = buildMpHtmlBodyStyles('warm')
    this.setData({
      loading: false,
      loadFailed: false,
      isNote: false,
      isWarmArticle: true,
      formatKey: 'article',
      formatLabel: '试读',
      layoutTheme: 'warm',
      article: {
        id: demoId,
        title: tr.title || '第 1 章　先想清楚你在卖什么',
        content: html,
        body: html,
        publish_time: '试读样章',
        view_count: 0,
        tags: ['电子书试读', '内容生意'],
        cover_url: DEMO_GOODS.cover || '',
        like_count: 0,
        favorite_count: 0,
      },
      articleCover: DEMO_GOODS.cover || '',
      articleTag: '电子书试读',
      articleLede: '免费试读章节，完整内容购买后开放。',
      articleMetaLine: `试读 ${tr.readChapters || 2}/${tr.totalChapters || 12} 章 · 《${DEMO_GOODS.title || '内容生意手册'}》`,
      authorName: '墨白',
      authorRole: '著',
      authorAvatar: '',
      authorInitial: '墨',
      relatedReads: [],
      relatedProducts: [],
      contentLocked: false,
      liked: false,
      favorited: false,
      hasCommented: false,
      likeDisplay: '0',
      favoriteDisplay: '0',
      commentCountDisplay: '0',
      commentEnabled: false,
      bodyContainerStyle: bodyStyles.container || '',
      bodyTagStyle: bodyStyles.tag || {},
    })
  },

  _applyWarmDemo(mode) {
    const { DEMO_NOTE, DEMO_MEAL_NOTE } = require('../../data/warm-demo')
    if (mode === 'note' || mode === 'meal') {
      const d = mode === 'meal' ? DEMO_MEAL_NOTE : DEMO_NOTE
      const demoId = mode === 'meal' ? 'warm-demo-meal' : 'warm-demo-note'
      this._contentId = demoId
      this.setData({
        loading: false,
        loadFailed: false,
        isNote: true,
        isWarmNote: true,
        isWechatNewspic: false,
        formatKey: 'note',
        formatLabel: '笔记',
        article: {
          id: demoId,
          title: d.title,
          publish_time: d.meta,
          view_count: mode === 'meal' ? 1900 : 4200,
          content: d.html,
          like_count: mode === 'meal' ? 1900 : 4200,
          favorite_count: mode === 'meal' ? 486 : 1100,
        },
        authorName: d.author,
        authorRole: d.authorRole || '',
        authorAvatar: resolveDisplayAvatarUrl(d.avatar),
        authorInitial: d.author.slice(0, 1),
        gallerySlides: d.gallery.map((url, i) => ({ key: 'g' + i, type: 'image', url })),
        galleryCount: d.gallery.length,
        galleryIndex: 0,
        noteParagraphs: (d.paras && d.paras.length)
          ? d.paras.map((text) => ({ text, isList: /^\d+\s/.test(text) || /[0-9]️⃣/.test(String(text).slice(0, 3)) }))
          : extractNoteParagraphs(d.html).map((text) => ({ text, isList: /^\d+\s/.test(text) })),
        hashTags: d.topics,
        comments: mapWarmNoteComments(d.comments),
        commentEnabled: true,
        commentCount: d.commentCount || (mode === 'meal' ? 128 : 286),
        commentCountDisplay: d.commentDisplay || (mode === 'meal' ? '128' : '286'),
        liked: hasStoredId(LIKES_KEY, demoId),
        favorited: hasFavoriteId(demoId),
        likeDisplay: d.likeDisplay || (mode === 'meal' ? '1.9k' : '4.2k'),
        favoriteDisplay: hasFavoriteId(demoId) ? '已收藏' : (d.favoriteDisplay || (mode === 'meal' ? '486' : '1.1k')),
        noteGoods: d.goods
          ? {
              ...d.goods,
              cover: resolveDisplayProductUrl(d.goods.cover),
            }
          : null,
        relatedReads: [],
      })
      wx.setNavigationBarTitle({ title: '笔记' })
      return
    }
    const a = DEMO_ARTICLE
    const demoId = 'warm-demo-article'
    this._contentId = demoId
    const bodyStyles = buildMpHtmlBodyStyles('warm')
    this.setData({
      loading: false,
      loadFailed: false,
      isNote: false,
      isWarmArticle: true,
      formatKey: 'article',
      formatLabel: '长文',
      layoutTheme: 'warm',
      article: {
        id: demoId,
        title: a.title,
        content: a.html,
        body: a.html,
        publish_time: '09-13',
        view_count: 23000,
        tags: a.tags,
        cover_url: a.cover,
        like_count: 1200,
        favorite_count: 860,
      },
      articleCover: a.cover,
      articleTag: a.tag,
      articleLede: a.lead,
      articleMetaLine: a.meta,
      authorName: a.author,
      authorRole: a.authorRole || '',
      authorAvatar: a.avatar,
      authorInitial: a.author.slice(0, 1),
      relatedReads: a.related,
      relatedProducts: [],
      contentLocked: true,
      lockedReason: (this.data.memberWall && this.data.memberWall.desc) || '',
      liked: hasStoredId(LIKES_KEY, demoId),
      favorited: hasFavoriteId(demoId),
      hasCommented: false,
      likeDisplay: '1.2k',
      favoriteDisplay: '860',
      commentCountDisplay: '0',
      commentEnabled: true,
      bodyContainerStyle: bodyStyles.container || '',
      bodyTagStyle: bodyStyles.tag || {},
    })
  },

  onRelatedTap(e) {
    const { id, moment } = e.currentTarget.dataset
    if (moment) {
      wx.navigateTo({ url: '/pages/moment-detail/moment-detail?demo=1&from=planet' })
      return
    }
    if (id) {
      wx.navigateTo({ url: `/pages/content-detail/content-detail?id=${id}` })
    }
  },

  onRetryLoad() {
    const id = this._contentId
    if (id) this._loadArticleDetail(id)
    else wx.showToast({ title: '无法重试', icon: 'none' })
  },

  onGoPurchased() {
    wx.navigateTo({
      url: '/pages/resources/resources',
      fail: () => wx.switchTab({ url: '/pages/mine/mine' }),
    })
  },

  onGoList() {
    wx.navigateTo({ url: '/pages/content-list/content-list' })
  },

  onNoteGoodsTap() {
    const goods = this.data.noteGoods || {}
    const url = goods.url || '/pages/product-detail/product-detail?demo=column'
    if (blockTradeNavigation(url)) return
    wx.navigateTo({
      url,
      fail: () => {
        wx.showToast({ title: '暂时打不开专栏', icon: 'none' })
      },
    })
  },

  onPageScroll(e) {
    if (this.data.isNote) return
    const scrollTop = e.scrollTop || 0
    const windowHeight = this._windowHeight || 667
    const scrollHeight = this._articleScrollHeight || scrollTop + windowHeight
    const maxScroll = Math.max(1, scrollHeight - windowHeight)
    const pct = Math.min(100, Math.round((scrollTop / maxScroll) * 100))
    if (pct !== this.data.readProgress) {
      this.setData({ readProgress: pct })
    }
  },

  onReady() {
    wx.getSystemInfo({
      success: (res) => {
        this._windowHeight = res.windowHeight
      },
    })
    this._measureArticleHeight()
  },

  _measureArticleHeight() {
    if (this.data.isNote) return
    wx.createSelectorQuery()
      .in(this)
      .select('.article-mode')
      .boundingClientRect((rect) => {
        if (rect && rect.height > 0) {
          this._articleScrollHeight = rect.height
        }
      })
      .exec()
  },

  onShareAppMessage() {
    const article = this.data.article
    return {
      title: article.seoTitle || article.seo_title || article.title || '内容详情',
      path: `/pages/content-detail/content-detail?id=${article.id || this._contentId}`,
      imageUrl: article.cover_url || '',
    }
  },

  onShareTimeline() {
    const article = this.data.article
    return {
      title: article.seoTitle || article.seo_title || article.title || '内容详情',
      query: `id=${article.id || this._contentId}`,
      imageUrl: article.cover_url || '',
    }
  },

  _loadArticleDetail(id) {
    this.setData({ loading: true, loadFailed: false, loadErrorText: '' })
    request.get(`/api/v1/mp/contents/${id}`, {}, { auth: false, showError: false })
      .then((article) => {
        if (!article || !isValidContentId(article.id || id)) {
          const err = new Error('内容不存在')
          err.code = 400401
          throw err
        }
        try {
          return this._applyArticleDetail(article)
        } catch (e) {
          console.error('[content-detail] render failed', e)
          const err = new Error('内容渲染失败')
          err.code = -2
          throw err
        }
      })
      .then(() => {})
      .catch((err) => {
        const msg = (err && err.message) || ''
        const code = err && err.code
        let loadErrorText = '可能已下架、被删除，或仅对特定人群可见'
        if (msg.includes('网络') || code === -1) loadErrorText = '网络异常，请检查后重试'
        else if (msg.includes('未发布') || msg.includes('草稿')) loadErrorText = '内容未发布或仅对特定人群可见'
        this.setData({
          loading: false,
          loadFailed: true,
          loadErrorText,
        })
        this._loadRelated({ contentId: id })
          .catch(() => {})
      })
  },

  _applyArticleDetail(article) {
        if (!article) return
        const overlayDemo = USE_LOCAL_SOURCE || String(article.id || '').indexOf('warm-demo') === 0
        const noteDemo = pickWarmNoteDemo(article)
        const warmMatch = overlayDemo && isWarmFeatureArticle(article)
        const warmNoteMatch = allowWarmNoteOverlay(article) && isWarmProtoNote(article)
        const proto = PROTO_BY_TITLE[article.title] || null
        const topic =
          (proto && proto.topic) ||
          CAT_TO_TOPIC[article.categoryName] ||
          'select'
        const fmt = resolveFormat(article)
        const isNote = fmt.isNote || warmNoteMatch
        // 暖阁原型笔记走 prototypes-warm/note.html，禁止落入公众号贴图布局
        const isWechatNewspic = isNote && !warmNoteMatch && inferWechatNewspic(article)
        const cover = resolveMediaUrl(article.coverUrl || article.coverImage || article.cover_url || '')
        let rawContent = String(article.content || article.body || '')
        if (warmMatch && shouldPreferDemoBody(rawContent)) {
          rawContent = DEMO_ARTICLE.html
        }
        if (isNote && warmNoteMatch) {
          rawContent = noteDemo.html || rawContent
        }
        const withProducts = embedProductCards(rawContent)
        let preparedContent = !isNote
          ? prepareArticleContentHtml(withProducts, cover, article.title || '')
          : withProducts
        if (warmMatch && shouldPreferDemoBody(preparedContent)) {
          preparedContent = DEMO_ARTICLE.html
        }
        if (isNote && warmNoteMatch) {
          preparedContent = noteDemo.html || preparedContent
        }
        const leadFromHtml = !isNote ? extractLeadParagraph(preparedContent || rawContent) : ''
        if (leadFromHtml) {
          preparedContent = stripLeadParagraph(preparedContent)
        }
        const videoUrl = resolveMediaUrl(article.videoUrl || article.video_url || '')
        const layoutTheme = String(
          warmMatch || (isNote && warmNoteMatch)
            ? 'warm'
            : (article.layoutTheme || article.layout_theme || (isNote ? 'standard' : 'warm'))
        )
        const bodyStyles = buildMpHtmlBodyStyles(layoutTheme)
        const extras = (Array.isArray(article.images) ? article.images : (Array.isArray(article.gallery) ? article.gallery : []))
          .map((url) => resolveMediaUrl(url))
          .filter(Boolean)

        let gallerySlides = []
        let galleryHeight = isWechatNewspic ? 1000 : 940
        if (isNote) {
          const htmlImages = extras.length
            ? []
            : extractImagesFromHtml(preparedContent || article.content).map((url) => resolveMediaUrl(url)).filter(Boolean)
          let uniq = buildNoteGalleryUrls(cover, extras.length ? extras : htmlImages)
          const usableUniq = uniq.filter((u) => u && !isUnusableImageUrl(u))
          if (warmNoteMatch && noteDemo.gallery && noteDemo.gallery.length) {
            // 库内仍可能是 picsum 占位，暖阁原型笔记统一用可展示图集
            uniq = (usableUniq.length >= 3) ? usableUniq : noteDemo.gallery.slice()
          } else {
            uniq = usableUniq.length ? usableUniq : uniq
          }
          if (uniq.length >= 1) {
            gallerySlides = uniq.map((url, i) => ({ type: 'image', url, key: `img-${i}` }))
          } else {
            const glyphs = [proto && proto.glyph, '📸', '✨', '💡', '🔥', '📌'].filter(Boolean)
            gallerySlides = glyphs.slice(0, 4).map((g, i) => ({
              type: 'art',
              artStyle: artStyle(topic),
              glyph: g,
              key: `art-${i}`,
            }))
          }
        }

        const tags = Array.isArray(article.tags) ? article.tags : []
        const displayTags = warmMatch
          ? (DEMO_ARTICLE.tags || tags)
          : (warmNoteMatch ? (noteDemo.topics || tags) : tags.filter((t) => !looksLikeFeatureTag(t)))
        let noteParagraphs = isNote ? extractNoteParagraphs(preparedContent || article.content) : []
        if (isNote && warmNoteMatch && noteDemo.paras && noteDemo.paras.length) {
          noteParagraphs = noteDemo.paras.slice()
        }
        // list lines → tighter style markers for wxml
        if (isNote && noteParagraphs.length) {
          noteParagraphs = noteParagraphs.map((row) => {
            if (row && typeof row === 'object' && row.text != null) return row
            const t = String(row || '')
            const isList = /^\d+\s/.test(t) || /^[①②③④⑤⑥⑦⑧⑨]/.test(t) || /[0-9]️⃣/.test(t.slice(0, 3))
            return { text: t, isList }
          })
        }
        const hashDisplayTags = buildHashTags(displayTags)
        const hashTagList = hashDisplayTags.length
          ? hashDisplayTags
          : (TOPIC_NAME[topic] || article.categoryName ? [`#${TOPIC_NAME[topic] || article.categoryName}`] : [])
        const dateStr = warmMatch
          ? '09-13'
          : (warmNoteMatch
            ? (noteDemo.meta || '编辑于 09-12 · 杭州')
            : (proto && proto.date
              ? proto.date
              : fmtDate(article.publishedAt || article.createTime)))
        let metaLine = ''
        if (!isNote) {
          if (fmt.key === 'video') {
            metaLine = [proto && proto.dur, proto && proto.stat].filter(Boolean).join(' · ')
            metaLine = metaLine ? `视频 · ${metaLine}` : '视频'
          } else if (fmt.key === 'data') {
            metaLine = (proto && proto.stat) || article.summary || '数据速报'
          } else {
            metaLine = [proto && proto.read, proto && proto.stat].filter(Boolean).join(' · ')
            const readLabel = formatReadTimeLabel(estimateReadMinutes(preparedContent))
            if (readLabel) {
              metaLine = readLabel
            } else if (!metaLine) {
              metaLine = article.summary || ''
            }
          }
        }

        const rawTopicName = TOPIC_NAME[topic] || article.categoryName || ''
        const topicName = isDisplayableCategory(rawTopicName) ? rawTopicName : ''
        const contentId = article.id
        const liked = !!article.liked || hasStoredId(LIKES_KEY, contentId)
        const favorited = !!article.favorited || hasFavoriteId(contentId)
        const followIds = StorageUtil.get(FOLLOWS_KEY) || []
        const followed = Array.isArray(followIds)
          ? followIds.map(String).includes(AUTHOR_ID)
          : !!(followIds && followIds[AUTHOR_ID])
        const likeCount = warmMatch
          ? Math.max(1200, Number(article.likeCount) || 0, parseStatCount(proto && proto.stat))
          : (warmNoteMatch
            ? Math.max(4200, Number(article.likeCount) || 0)
            : Math.max(
              Number(article.likeCount) || 0,
              parseStatCount(proto && proto.stat)
            ))
        const serverComments = Array.isArray(article.comments) ? article.comments : null
        let comments = serverComments
          ? serverComments.map((c) => ({
              id: c.id,
              nickName: c.nickname || '用户',
              avatar: resolveDisplayAvatarUrl(c.avatar || c.avatarUrl || c.avatar_url),
              avatarText: String(c.nickname || '用').slice(0, 1),
              content: c.content,
              timeText: String(c.createTime || '').replace('T', ' ').slice(0, 16) || '',
              likes: 0,
              mine: isMyCommentRow(c),
            }))
          : []
        if (warmNoteMatch && (!comments.length) && noteDemo.comments) {
          comments = mapWarmNoteComments(noteDemo.comments)
        }
        const commentEnabled = warmNoteMatch ? true : getCommentEnabledSync()
        const hasCommented = comments.some((c) => !!c.mine)

        const authorName = String(
          article.author
            || (warmMatch ? DEMO_ARTICLE.author : '')
            || (warmNoteMatch ? noteDemo.author : '')
            || AUTHOR_NAME
        ).trim() || AUTHOR_NAME
        const authorRoleRaw = String(
          article.authorRole || article.author_role || ''
        ).trim()
        const authorRoleMap = { owner: '主理人', editor: '官方', contributor: '特约作者', user: '' }
        const authorRole = authorRoleRaw
          ? (authorRoleMap[authorRoleRaw] || authorRoleRaw)
          : (warmMatch ? DEMO_ARTICLE.authorRole : (warmNoteMatch ? noteDemo.authorRole : ''))
        const authorAvatar = warmNoteMatch
          ? pickWarmAvatar(article.authorAvatar || article.author_avatar, noteDemo.avatar)
          : pickWarmAvatar(
            article.authorAvatar || article.author_avatar,
            warmMatch ? DEMO_ARTICLE.avatar : ''
          )
        const favoriteBase = warmMatch
          ? Math.max(860, Number(article.favoriteCount || article.favorite_count || 0))
          : (warmNoteMatch
            ? Math.max(1100, Number(article.favoriteCount || article.favorite_count || 0))
            : Number(article.favoriteCount || article.favorite_count || 0))
        const viewCount = Number(article.viewCount || article.view_count || (warmMatch ? 23000 : (warmNoteMatch ? 4200 : 0)))
        const resolvedTitle = warmNoteMatch
          ? noteDemo.title
          : (warmMatch ? DEMO_ARTICLE.title : (article.title || ''))
        let articleMetaLine = ''
        let articleLede = ''
        if (!isNote) {
          const readLabel = warmMatch
            ? '12 分钟阅读'
            : formatReadTimeLabel(estimateReadMinutes(preparedContent || rawContent))
          const viewLabel = formatViewLabel(viewCount)
          articleMetaLine = [dateStr, readLabel || metaLine, viewLabel].filter(Boolean).join(' · ')
          const summaryText = String(article.summary || article.seoDescription || '').trim()
          articleLede = leadFromHtml
            || (warmMatch ? DEMO_ARTICLE.lead : '')
            || (!looksLikeFeatureTag(summaryText) ? summaryText : '')
            || extractArticleSummary(preparedContent || rawContent, 88)
          if (warmMatch) articleLede = DEMO_ARTICLE.lead
        }

        let contentLocked = article.locked === true
          || article.accessGranted === false
          || article.access_granted === false
        let lockedReason = String(article.lockedReason || article.locked_reason || '').trim()
          || (contentLocked ? '' : '')
        // 本地演示源仍可强制出原型门禁；生产只信接口 locked
        if (USE_LOCAL_SOURCE && warmMatch && !isNote) {
          contentLocked = true
          lockedReason = String((this.data.memberWall && this.data.memberWall.desc) || '').trim()
        }
        if (contentLocked && !articleLede) {
          const summaryText = String(article.summary || '').trim()
          articleLede = !looksLikeFeatureTag(summaryText) ? summaryText : (warmMatch ? DEMO_ARTICLE.lead : '')
        }

        const articleTag = warmMatch
          ? DEMO_ARTICLE.tag
          : String(article.coverTag || article.cover_tag || topicName || fmt.label || '').trim()
        const articleCover = cover || (warmMatch ? DEMO_ARTICLE.cover : '')
        // 锁定时展示接口返回的试读正文；仅本地演示源可用 DEMO 正文
        const bodyHtml = (USE_LOCAL_SOURCE && warmMatch)
          ? DEMO_ARTICLE.html
          : (preparedContent || '')

        this.setData({
          loadFailed: false,
          loadErrorText: '',
          isWarmArticle: warmMatch && !isNote,
          isWarmNote: !!warmNoteMatch,
          article: {
            ...article,
            id: contentId,
            title: resolvedTitle || article.title,
            content: bodyHtml,
            body: bodyHtml,
            cover_url: articleCover,
            image: articleCover,
            publish_time: dateStr,
            created_at: fmtDate(article.createTime),
            view_count: viewCount,
            like_count: likeCount,
            favorite_count: favoriteBase,
            seoTitle: article.seoTitle || article.seo_title || '',
            summary: warmMatch ? DEMO_ARTICLE.lead : (article.summary || article.seoDescription || ''),
            author_avatar: authorAvatar,
            videoUrl: contentLocked && !warmMatch ? '' : videoUrl,
            layoutTheme,
            tags: displayTags,
          },
          loading: false,
          isNote,
          isWechatNewspic,
          formatKey: fmt.key,
          formatLabel: fmt.label,
          topicName,
          layoutTheme,
          bodyContainerStyle: bodyStyles.container,
          bodyTagStyle: bodyStyles.tag,
          videoUrl: contentLocked && !warmMatch ? '' : videoUrl,
          gallerySlides: contentLocked ? gallerySlides.slice(0, 1) : gallerySlides,
          galleryIndex: 0,
          galleryCount: contentLocked ? Math.min(1, gallerySlides.length) : gallerySlides.length,
          galleryHeight,
          noteParagraphs: contentLocked
            ? (noteParagraphs.slice(0, 2).length
              ? noteParagraphs.slice(0, 2)
              : (article.summary ? [{ text: article.summary, isList: false }] : []))
            : noteParagraphs,
          hashTags: (warmNoteMatch && noteDemo.topics && noteDemo.topics.length)
            ? noteDemo.topics
            : hashTagList,
          artStyle: artStyle(topic),
          glyph: (proto && proto.glyph) || (isNote ? '📷' : '📄'),
          metaLine,
          articleMetaLine,
          articleLede,
          articleCover,
          articleTag,
          contentLocked,
          lockedReason,
          liked,
          favorited,
          hasCommented,
          followed,
          likeDisplay: warmMatch ? '1.2k' : (warmNoteMatch ? (noteDemo.likeDisplay || '4.2k') : formatCount(likeCount)),
          favoriteDisplay: isNote
            ? (warmNoteMatch
              ? (favorited ? '已收藏' : (noteDemo.favoriteDisplay || '1.1k'))
              : (favorited ? '已收藏' : '收藏'))
            : (warmMatch ? formatCount(Math.max(860, favoriteBase)) : formatCount(favoriteBase)),
          comments: commentEnabled ? comments : [],
          commentEnabled,
          noteGoods: warmNoteMatch && noteDemo.goods
            ? {
                ...noteDemo.goods,
                cover: resolveDisplayProductUrl(noteDemo.goods.cover),
              }
            : null,
          commentCount: commentEnabled
            ? (warmNoteMatch
              ? Math.max(noteDemo.commentCount || 286, Number(article.commentCount) || comments.length)
              : (Number(article.commentCount) || comments.length))
            : 0,
          commentCountDisplay: commentEnabled
            ? (warmNoteMatch
              ? (noteDemo.commentDisplay || '286')
              : formatCount(Number(article.commentCount) || comments.length))
            : '0',
          readProgress: 0,
          authorName,
          authorRole,
          authorAvatar,
          authorInitial: authorName.slice(0, 1),
        })

        this._loadRelated({
          contentId,
          title: resolvedTitle || article.title,
          warmMatch,
          categoryName: article.categoryName,
        })

        if (isNote) {
          wx.setNavigationBarTitle({ title: '笔记' })
          if (isWechatNewspic) {
            wx.setNavigationBarColor({
              frontColor: '#ffffff',
              backgroundColor: '#0f1219',
              animation: { duration: 0 },
            })
          } else {
            wx.setNavigationBarColor({
              frontColor: '#000000',
              backgroundColor: '#FDF6EC',
              animation: { duration: 0 },
            })
          }
        }
        if (!isNote) {
          setTimeout(() => this._measureArticleHeight(), 120)
        }

        // 拉取评论列表（公开）；暖阁书桌笔记保留 DEMO 评论，避免空接口冲掉
        if (!commentEnabled) return
        if (warmNoteMatch) return
        request.get(`/api/v1/mp/contents/${contentId}/comments`, {}, { auth: false })
          .then((list) => {
            const rows = Array.isArray(list) ? list : []
            if (!rows.length) return
            const mapped = rows.map((c) => ({
              id: c.id,
              nickName: c.nickname || '用户',
              avatar: resolveDisplayAvatarUrl(c.avatar || c.avatarUrl || c.avatar_url),
              avatarText: String(c.nickname || '用').slice(0, 1),
              content: c.content,
              timeText: String(c.createTime || '').replace('T', ' ').slice(0, 16) || '',
              likes: 0,
              mine: isMyCommentRow(c),
            }))
            this.setData({
              comments: mapped,
              commentCount: mapped.length,
              commentCountDisplay: formatCount(mapped.length),
              hasCommented: mapped.some((c) => !!c.mine) || !!this.data.hasCommented,
            })
          })
          .catch(() => {})
  },

  async _loadRelated(opts = {}) {
    const contentId = opts.contentId || this._contentId || (this.data.article && this.data.article.id)
    const overlayDemo = USE_LOCAL_SOURCE || String(contentId || '').indexOf('warm-demo') === 0
    const warmMatch = overlayDemo && (!!opts.warmMatch
      || isWarmFeatureArticle({
        title: opts.title || (this.data.article && this.data.article.title),
        externalId: this.data.article && (this.data.article.externalId || this.data.article.external_id),
        summary: this.data.article && this.data.article.summary,
        tags: this.data.article && this.data.article.tags,
      }))

    let relatedReads = []
    if (warmMatch) {
      relatedReads = DEMO_ARTICLE.related || []
    } else {
      try {
        const res = await request.get('/api/v1/mp/contents', {
          current: 1,
          size: 8,
          categoryName: opts.categoryName || '',
        }, { auth: false, showError: false }).catch(() => null)
        const rows = (res && (res.records || res.list)) || []
        relatedReads = rows
          .filter((c) => String(c.id) !== String(contentId))
          .slice(0, 3)
          .map((c) => ({
            id: c.id,
            title: c.title,
            meta: [c.author, formatViewLabel(c.viewCount || c.view_count)].filter(Boolean).join(' · '),
            cover: resolveMediaUrl(c.coverUrl || c.coverImage || c.cover_url || ''),
          }))
          .filter((c) => c.title && c.cover)
      } catch (e) {
        relatedReads = []
      }
    }

    let relatedProducts = []
    if (getProductEnabledSync() && contentId && !relatedReads.length) {
      try {
        const bound = await request.get(`/api/v1/mp/contents/${contentId}/products`, {}, { auth: false, showError: false }).catch(() => null)
        const list = Array.isArray(bound) ? bound : (bound && bound.records) || []
        relatedProducts = list.slice(0, 4).map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          cover: p.mainImage || p.main_image || '/images/default-product.svg',
        }))
      } catch (e) {
        relatedProducts = []
      }
    }

    this.setData({ relatedReads, relatedProducts })
  },

  onGalleryChange(e) {
    const index = e.detail.current || 0
    this.setData({ galleryIndex: index })
  },

  onGalleryPrev() {
    const len = this.data.galleryCount
    if (len <= 1) return
    this.setData({ galleryIndex: (this.data.galleryIndex - 1 + len) % len })
  },

  onGalleryNext() {
    const len = this.data.galleryCount
    if (len <= 1) return
    this.setData({ galleryIndex: (this.data.galleryIndex + 1) % len })
  },

  onGalleryThumbTap(e) {
    const index = Number(e.currentTarget.dataset.index)
    if (!Number.isFinite(index)) return
    this.setData({ galleryIndex: index })
  },

  onGalleryImageLoad(e) {
    if (this.data.isWechatNewspic) return
    const { width, height } = e.detail || {}
    if (!width || !height) return
    const sys = wx.getSystemInfoSync()
    const screenW = sys.windowWidth || 375
    const nextHeight = Math.round((screenW / width) * height * (750 / screenW))
    const clamped = Math.min(Math.max(nextHeight, 520), 980)
    if (clamped !== this.data.galleryHeight) {
      this.setData({ galleryHeight: clamped })
    }
  },

  onProductTap(e) {
    const id = e.currentTarget.dataset.id
    if (id) {
      const url = `/pages/product-detail/product-detail?id=${id}`
      if (blockTradeNavigation(url)) return
      wx.navigateTo({ url })
      return
    }
    if (blockTradeNavigation('/pages/shop/shop')) return
    wx.switchTab({ url: '/pages/shop/shop' })
  },

  onGoUnlockMember() {
    this._navMemberCenter()
  },

  onGoUnlockPlanet() {
    wx.switchTab({ url: '/pages/planet/planet' })
  },

  /** 暖阁长文付费墙：开通年度会员 → 会员中心（¥168） */
  onGoMembership() {
    this._navMemberCenter()
  },

  /** 长文付费墙：已购专栏免费解锁 → 配置的商品详情 */
  onGoColumnUnlock() {
    const wall = this.data.memberWall || {}
    const pid = wall.unlockProductId
    if (!pid) {
      wx.showToast({ title: '未配置解锁商品', icon: 'none' })
      return
    }
    const url = `/pages/product-detail/product-detail?id=${encodeURIComponent(pid)}`
    if (blockTradeNavigation(url)) return
    wx.navigateTo({
      url,
      fail: () => wx.showToast({ title: '暂时打不开商品', icon: 'none' }),
    })
  },

  _navMemberCenter() {
    wx.navigateTo({
      url: '/pkg-user/member-center/member-center',
      fail: () => {
        wx.navigateTo({
          url: '/pages/member-center/member-center',
          fail: () => wx.showToast({ title: '暂时打不开会员中心', icon: 'none' }),
        })
      },
    })
  },

  /** 关注 / 取消关注（需确认后取消） */
  onFollowTap() {
    if (this.data.followed) {
      wx.showModal({
        title: '取消关注',
        content: `确定不再关注「${AUTHOR_NAME}」吗？`,
        confirmText: '取消关注',
        confirmColor: '#db4f3f',
        success: (res) => {
          if (res.confirm) this._setFollowed(false)
        },
      })
      return
    }
    this._setFollowed(true)
  },

  _setFollowed(followed) {
    const raw = StorageUtil.get(FOLLOWS_KEY) || []
    const list = Array.isArray(raw) ? raw.slice() : []
    const next = followed
      ? Array.from(new Set([...list, AUTHOR_ID]))
      : list.filter((x) => x !== AUTHOR_ID)
    StorageUtil.set(FOLLOWS_KEY, next)
    this.setData({ followed })
    wx.showToast({
      title: followed ? '关注成功' : '已取消关注',
      icon: 'none',
    })
  },

  onShareTap() {
    const article = this.data.article || {}
    const id = article.id || this._contentId || ''
    const path = id
      ? `/pages/content-detail/content-detail?id=${id}`
      : '/pages/content-detail/content-detail'
    openWarmShareSheet({
      title: article.seoTitle || article.seo_title || article.title || '暖阁分享',
      path,
      cover: article.cover_url || this.data.articleCover || '',
      quote: (this.data.articleLede || article.summary || '').slice(0, 80),
      contentId: id,
    })
  },

  onLikeTap() {
    const article = this.data.article || {}
    const id = String(article.id || this._contentId || '').trim()
    if (!id) {
      wx.showToast({ title: '内容异常，暂无法点赞', icon: 'none' })
      return
    }
    const liked = !this.data.liked
    const base = Number(article.like_count || article.likeCount || 0)
    const nextCount = Math.max(0, base + (liked ? 1 : -1))
    const patched = {
      ...article,
      like_count: this.data.isWarmArticle
        ? Math.max(1200, nextCount)
        : (this.data.isWarmNote ? Math.max(4200, nextCount) : nextCount),
    }
    const ids = readIdList(LIKES_KEY)
    if (liked) {
      if (!ids.includes(id)) ids.push(id)
    } else {
      const idx = ids.indexOf(id)
      if (idx >= 0) ids.splice(idx, 1)
    }
    writeIdList(LIKES_KEY, ids)
    this.setData({
      liked,
      article: patched,
      likeDisplay: this.data.isWarmArticle
        ? '1.2k'
        : (this.data.isWarmNote ? '4.2k' : formatCount(patched.like_count)),
    })
    wx.showToast({ title: liked ? '已点赞' : '已取消点赞', icon: 'none' })

    if (!AuthUtil.isLoggedIn()) return
    if (String(id).indexOf('warm-demo') === 0) return
    request.post(`/api/v1/mp/contents/${id}/like`, {}, { showError: false })
      .then((state) => {
        if (!state) return
        const serverLiked = !!state.liked
        const serverCount = Number(state.likeCount)
        const nextArticle = { ...this.data.article }
        if (!Number.isNaN(serverCount) && serverCount >= 0) {
          nextArticle.like_count = this.data.isWarmArticle
            ? Math.max(1200, serverCount)
            : (this.data.isWarmNote ? Math.max(4200, serverCount) : serverCount)
        }
        this.setData({
          liked: serverLiked,
          article: nextArticle,
          likeDisplay: this.data.isWarmArticle
            ? '1.2k'
            : (this.data.isWarmNote ? '4.2k' : formatCount(nextArticle.like_count)),
        })
      })
      .catch(() => {})
  },

  onFavoriteTap() {
    const article = this.data.article || {}
    const id = String(article.id || this._contentId || '').trim()
    if (!id) {
      wx.showToast({ title: '内容异常，暂无法收藏', icon: 'none' })
      return
    }
    const favorited = !this.data.favorited
    const nextCount = Math.max(
      0,
      Number(article.favorite_count || article.favoriteCount || 0) + (favorited ? 1 : -1)
    )
    const patched = {
      ...article,
      favorite_count: this.data.isWarmArticle
        ? Math.max(860, nextCount)
        : (this.data.isWarmNote ? Math.max(1100, nextCount) : nextCount),
    }
    const ids = readFavoriteIds()
    if (favorited) {
      if (!ids.includes(id)) ids.push(id)
    } else {
      const idx = ids.indexOf(id)
      if (idx >= 0) ids.splice(idx, 1)
    }
    writeFavoriteIds(ids)
    this.setData({
      favorited,
      article: patched,
      favoriteDisplay: this.data.isNote
        ? (this.data.isWarmNote
          ? (favorited ? '已收藏' : '1.1k')
          : (favorited ? '已收藏' : '收藏'))
        : formatCount(patched.favorite_count),
    })
    wx.showToast({ title: favorited ? '已收藏' : '已取消收藏', icon: 'none' })

    if (!AuthUtil.isLoggedIn()) return
    if (String(id).indexOf('warm-demo') === 0) return
    request.post(`/api/v1/mp/contents/${id}/favorite`, {}, { showError: false })
      .then((state) => {
        if (!state) return
        this.setData({
          favorited: !!state.favorited,
          favoriteDisplay: this.data.isNote
            ? (this.data.isWarmNote
              ? (state.favorited ? '已收藏' : '1.1k')
              : (state.favorited ? '已收藏' : '收藏'))
            : formatCount(this.data.article.favorite_count),
        })
      })
      .catch(() => {})
  },

  onCommentTap() {
    if (!this.data.commentEnabled) {
      wx.showToast({ title: '评论暂未开放', icon: 'none' })
      return
    }
    this.setData({ showCommentSheet: true })
  },

  onCloseCommentSheet() {
    this.setData({ showCommentSheet: false, commentDraft: '' })
  },

  noop() {},

  onCommentInput(e) {
    this.setData({ commentDraft: (e.detail && e.detail.value) || '' })
  },

  onSubmitComment() {
    if (!this.data.commentEnabled) return
    if (this.data.commentSubmitting) return
    const text = (this.data.commentDraft || '').trim()
    if (!text) {
      wx.showToast({ title: '请输入评论内容', icon: 'none' })
      return
    }
    if (!AuthUtil.requireLoginForAction('发表评论', {
      onSuccess: () => this.onSubmitComment(),
    })) return

    const id = Number(this.data.article && this.data.article.id)
    if (!id) return

    this.setData({ commentSubmitting: true })
    const user = AuthUtil.getUserInfo() || {}
    request.post(`/api/v1/mp/contents/${id}/comments`, {
      content: text.slice(0, 500),
      nickname: user.nickName || '微信用户',
      avatar: user.avatarUrl || '',
    })
      .then((row) => {
        // 评论默认待审隐藏，不立即插入公开列表；底栏仍标「已评论」
        this.setData({
          commentDraft: '',
          commentSubmitting: false,
          hasCommented: true,
        })
        wx.showToast({ title: '已提交，审核后可见', icon: 'none' })
      })
      .catch(() => {
        this.setData({ commentSubmitting: false })
        wx.showToast({ title: '评论失败', icon: 'none' })
      })
  },
})
