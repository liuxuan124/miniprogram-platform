// pages/content-detail/content-detail.js
const request = require('../../utils/request')
const productService = require('../../services/product')
const { StorageUtil } = require('../../utils/storage')
const { createSharePageConfig } = require('../../utils/share')
const { AuthUtil } = require('../../utils/auth')
const { resolveMediaUrl } = require('../../utils/media-url')
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
  formatReadTimeLabel,
  isDisplayableCategory,
  prepareArticleContentHtml,
  buildMpHtmlBodyStyles,
} = require('../../utils/article-content')
const { ITEMS, TOPIC_NAME, artStyle } = require('../../data/prototype-home')

const FAVORITES_KEY = 'content_favorites'
const LIKES_KEY = 'content_likes'
const FOLLOWS_KEY = 'author_follows'
const COMMENTS_KEY = 'content_comments'
const AUTHOR_ID = 'aze'
const AUTHOR_NAME = '出海笔记 · 阿哲'

const CAT_TO_TOPIC = {
  选品洞察: 'select',
  供应链: 'supply',
  平台运营: 'platform',
  独立站: 'dtc',
  物流履约: 'logistics',
  合规税务: 'compliance',
}

const { getProductEnabledSync, blockTradeNavigation } = require('../../utils/product-module-gate')

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
      nickName: '跨境新手小白',
      avatarText: '白',
      content: '太真实了，独立站域名和支付这块我刚好卡了很久。',
      timeText: '2小时前',
      likes: Math.max(3, Math.floor((likeHint || 20) / 80)),
    },
    {
      id: `s2-${contentId}`,
      nickName: '选品阿木',
      avatarText: '木',
      content: '第3个坑说得对，选品别一上来就铺全品类。',
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
    liked: false,
    favorited: false,
    followed: false,
    isNote: false,
    isWechatNewspic: false,
    formatKey: 'article',
    formatLabel: '长文',
    topicName: '',
    layoutTheme: 'standard',
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
    commentCount: 0,
    commentCountDisplay: '0',
    showCommentSheet: false,
    comments: [],
    commentDraft: '',
    commentSubmitting: false,
    authorName: AUTHOR_NAME,
    authorAvatar: '',
    authorInitial: '哲',
  },

  onLoad(options) {
    const id = options.id
    if (!id) {
      wx.showToast({ title: '参数错误', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }
    this._contentId = id
    this._loadArticleDetail(id)
    this._loadRelated()
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
    this.setData({ loading: true })
    request.get(`/api/v1/mp/contents/${id}`, {}, { auth: false })
      .then((article) => {
        const proto = PROTO_BY_TITLE[article.title] || null
        const topic =
          (proto && proto.topic) ||
          CAT_TO_TOPIC[article.categoryName] ||
          'select'
        const fmt = resolveFormat(article)
        const isNote = fmt.isNote
        const isWechatNewspic = isNote && inferWechatNewspic(article)
        const cover = resolveMediaUrl(article.coverUrl || article.coverImage || article.cover_url || '')
        const rawContent = String(article.content || article.body || '')
        const withProducts = embedProductCards(rawContent)
        const preparedContent = !isNote
          ? prepareArticleContentHtml(withProducts, cover, article.title || '')
          : withProducts
        const videoUrl = resolveMediaUrl(article.videoUrl || article.video_url || '')
        const layoutTheme = String(article.layoutTheme || article.layout_theme || 'standard')
        const bodyStyles = buildMpHtmlBodyStyles(layoutTheme)
        const extras = (Array.isArray(article.images) ? article.images : (Array.isArray(article.gallery) ? article.gallery : []))
          .map((url) => resolveMediaUrl(url))
          .filter(Boolean)

        let gallerySlides = []
        let galleryHeight = isWechatNewspic ? 1000 : 750
        if (isNote) {
          const htmlImages = extras.length
            ? []
            : extractImagesFromHtml(article.content).map((url) => resolveMediaUrl(url)).filter(Boolean)
          const uniq = buildNoteGalleryUrls(cover, extras.length ? extras : htmlImages)
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
        const noteParagraphs = isNote ? extractNoteParagraphs(article.content) : []
        const displayTags = buildHashTags(tags)
        const hashTagList = displayTags.length
          ? displayTags
          : (TOPIC_NAME[topic] || article.categoryName ? [`#${TOPIC_NAME[topic] || article.categoryName}`] : [])
        const dateStr = proto && proto.date
          ? proto.date
          : fmtDate(article.publishedAt || article.createTime)
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
        const contentIdKey = String(contentId)
        const liked = !!article.liked
        const favorited = !!article.favorited
        const followIds = StorageUtil.get(FOLLOWS_KEY) || []
        const followed = Array.isArray(followIds)
          ? followIds.map(String).includes(AUTHOR_ID)
          : !!(followIds && followIds[AUTHOR_ID])
        const likeCount = Math.max(
          Number(article.likeCount) || 0,
          parseStatCount(proto && proto.stat)
        )
        const serverComments = Array.isArray(article.comments) ? article.comments : null
        const comments = serverComments
          ? serverComments.map((c) => ({
              id: c.id,
              nickName: c.nickname || '用户',
              avatarText: String(c.nickname || '用').slice(0, 1),
              content: c.content,
              timeText: String(c.createTime || '').replace('T', ' ').slice(0, 16) || '',
              likes: 0,
              mine: false,
            }))
          : []

        const authorName = String(article.author || AUTHOR_NAME).trim() || AUTHOR_NAME
        const authorAvatar = resolveMediaUrl(article.authorAvatar || article.author_avatar || '')
        const favoriteBase = Number(article.favoriteCount || article.favorite_count || 0)
        let articleMetaLine = ''
        let articleLede = ''
        if (!isNote) {
          const readLabel = formatReadTimeLabel(estimateReadMinutes(preparedContent))
          articleMetaLine = [authorName, dateStr, readLabel || metaLine].filter(Boolean).join(' · ')
          articleLede = extractArticleSummary(preparedContent, 88)
        }

        this.setData({
          article: {
            ...article,
            id: contentId,
            content: preparedContent,
            body: preparedContent,
            cover_url: cover,
            image: cover,
            publish_time: dateStr,
            created_at: fmtDate(article.createTime),
            view_count: Number(article.viewCount || article.view_count || 0),
            like_count: likeCount,
            favorite_count: favoriteBase,
            seoTitle: article.seoTitle || article.seo_title || '',
            summary: article.summary || article.seoDescription || '',
            author_avatar: authorAvatar,
            videoUrl,
            layoutTheme,
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
          videoUrl,
          gallerySlides,
          galleryIndex: 0,
          galleryCount: gallerySlides.length,
          galleryHeight,
          noteParagraphs,
          hashTags: hashTagList,
          artStyle: artStyle(topic),
          glyph: (proto && proto.glyph) || (isNote ? '📷' : '📄'),
          metaLine,
          articleMetaLine,
          articleLede,
          liked,
          favorited,
          followed,
          likeDisplay: formatCount(likeCount),
          comments,
          commentCount: Number(article.commentCount) || comments.length,
          commentCountDisplay: formatCount(Number(article.commentCount) || comments.length),
          readProgress: 0,
          authorName,
          authorAvatar,
          authorInitial: authorName.slice(0, 1),
        })

        // 拉取评论列表（公开）
        request.get(`/api/v1/mp/contents/${contentId}/comments`, {}, { auth: false })
          .then((list) => {
            const rows = Array.isArray(list) ? list : []
            const mapped = rows.map((c) => ({
              id: c.id,
              nickName: c.nickname || '用户',
              avatarText: String(c.nickname || '用').slice(0, 1),
              content: c.content,
              timeText: String(c.createTime || '').replace('T', ' ').slice(0, 16) || '',
              likes: 0,
              mine: false,
            }))
            this.setData({
              comments: mapped,
              commentCount: mapped.length,
              commentCountDisplay: formatCount(mapped.length),
            })
          })
          .catch(() => {})

        wx.setNavigationBarTitle({ title: isNote ? '笔记' : '文章' })
        wx.setNavigationBarColor({
          frontColor: '#ffffff',
          backgroundColor: isNote ? '#0f1219' : '#2f5bff',
          animation: { duration: 0 },
        })
        if (!isNote) {
          setTimeout(() => this._measureArticleHeight(), 120)
        }
      })
      .catch((err) => {
        this.setData({ loading: false })
        const msg = (err && err.message) || ''
        const code = err && err.code
        let title = '内容不存在'
        if (msg.includes('未发布') || msg.includes('草稿') || code === 400402) {
          title = '内容未发布'
        } else if (code === 404 || msg.includes('不存在')) {
          title = '内容不存在'
        } else if (msg.includes('网络') || code === -1) {
          title = '网络异常，请稍后重试'
        }
        wx.showToast({ title, icon: 'none' })
      })
  },

  async _loadRelated() {
    if (!getProductEnabledSync()) {
      this.setData({ relatedProducts: [] })
      return
    }
    try {
      const id = this._contentId || (this.data.article && this.data.article.id)
      let list = []
      if (id) {
        const bound = await request.get(`/api/v1/mp/contents/${id}/products`, {}, { auth: false, showError: false }).catch(() => null)
        list = Array.isArray(bound) ? bound : (bound && bound.records) || []
      }
      if (!list.length) {
        const res = await productService.getProductList({ current: 1, size: 4, showError: false })
        list = res.records || res.list || []
      }
      this.setData({
        relatedProducts: list.slice(0, 4).map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          cover: p.mainImage || p.main_image || '/images/default-product.svg',
        })),
      })
    } catch (e) { /* ignore */ }
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
    if (blockTradeNavigation('/pages/knowledge-mall/knowledge-mall')) return
    wx.switchTab({ url: '/pages/knowledge-mall/knowledge-mall' })
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

  onLikeTap() {
    const id = this.data.article && this.data.article.id
    if (id === undefined || id === null || id === '') return
    if (!AuthUtil.requireLoginForAction('点赞', { onSuccess: () => this.onLikeTap() })) return
    request.post(`/api/v1/mp/contents/${id}/like`, {})
      .then((state) => {
        const article = { ...this.data.article }
        article.like_count = state.likeCount || 0
        this.setData({
          liked: !!state.liked,
          article,
          likeDisplay: formatCount(article.like_count),
        })
      })
      .catch(() => wx.showToast({ title: '点赞失败', icon: 'none' }))
  },

  onFavoriteTap() {
    const article = this.data.article || {}
    const id = article.id
    if (id === undefined || id === null || id === '') {
      wx.showToast({ title: '内容异常，暂无法收藏', icon: 'none' })
      return
    }
    if (!AuthUtil.requireLoginForAction('收藏', { onSuccess: () => this.onFavoriteTap() })) return
    request.post(`/api/v1/mp/contents/${id}/favorite`, {})
      .then((state) => {
        this.setData({ favorited: !!state.favorited })
        wx.showToast({ title: state.favorited ? '已收藏' : '已取消收藏', icon: 'none' })
      })
      .catch(() => wx.showToast({ title: '收藏失败', icon: 'none' }))
  },

  onCommentTap() {
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
        // 评论默认待审隐藏，不立即插入公开列表
        this.setData({
          commentDraft: '',
          commentSubmitting: false,
        })
        wx.showToast({ title: '已提交，审核后可见', icon: 'none' })
      })
      .catch(() => {
        this.setData({ commentSubmitting: false })
        wx.showToast({ title: '评论失败', icon: 'none' })
      })
  },
})
