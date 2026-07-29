// pages/content-detail/content-detail.js
const request = require('../../utils/request')
const productService = require('../../services/product')
const { StorageUtil } = require('../../utils/storage')
const { createSharePageConfig } = require('../../utils/share')
const { ITEMS, TOPIC_NAME, artStyle } = require('../../data/prototype-home')

const FAVORITES_KEY = 'content_favorites'

const CAT_TO_TOPIC = {
  选品洞察: 'select',
  供应链: 'supply',
  平台运营: 'platform',
  独立站: 'dtc',
  物流履约: 'logistics',
  合规税务: 'compliance',
}

const PROTO_BY_TITLE = Object.fromEntries(ITEMS.map((i) => [i.title, i]))

/** 优先用 source 字段（种子数据写入的形态），避免标题含「清单」误判 */
function resolveFormat(item) {
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

function stripHtmlToParagraphs(html) {
  if (!html) return []
  return String(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .split(/<\/p>|<\/div>/i)
    .map((chunk) => chunk.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim())
    .filter(Boolean)
}

function hashTags(tags) {
  if (!Array.isArray(tags)) return []
  return tags
    .map((t) => String(t || '').trim())
    .filter(Boolean)
    .map((t) => (t.startsWith('#') ? t : `#${t}`))
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
    formatKey: 'article',
    formatLabel: '长文',
    topicName: '',
    readProgress: 0,
    relatedProducts: [],
    gallerySlides: [],
    galleryIndex: 0,
    galleryCount: 0,
    noteParagraphs: [],
    hashTags: [],
    artStyle: '',
    glyph: '📌',
    metaLine: '',
    likeStat: '',
  },

  onLoad(options) {
    const id = options.id
    if (!id) {
      wx.showToast({ title: '参数错误', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }
    this._loadArticleDetail(id)
    this._loadRelated()
  },

  onPageScroll(e) {
    if (this.data.isNote) return
    const top = e.scrollTop || 0
    const pct = Math.min(100, Math.max(0, Math.round(top / 6)))
    if (pct !== this.data.readProgress) {
      this.setData({ readProgress: pct })
    }
  },

  onShareAppMessage() {
    const article = this.data.article
    return {
      title: article.title || '内容详情',
      path: `/pages/content-detail/content-detail?id=${article.id}`,
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
        const cover = article.coverUrl || article.coverImage || ''
        const extras = Array.isArray(article.images)
          ? article.images
          : Array.isArray(article.gallery)
            ? article.gallery
            : []

        let gallerySlides = []
        if (isNote) {
          // 小红书式：优先多图；无图则用主题色画廊 + glyph
          const urls = [cover].concat(extras).filter(Boolean)
          const uniq = urls.filter((u, i, arr) => arr.indexOf(u) === i)
          if (uniq.length >= 2) {
            gallerySlides = uniq.map((url, i) => ({ type: 'image', url, key: `img-${i}` }))
          } else {
            const glyphs = [proto && proto.glyph, '📸', '✨', '💡', '🔥', '📌'].filter(Boolean)
            gallerySlides = glyphs.slice(0, 4).map((g, i) => ({
              type: 'art',
              artStyle: artStyle(topic),
              glyph: g,
              key: `art-${i}`,
            }))
            if (uniq[0]) {
              gallerySlides[0] = { type: 'image', url: uniq[0], key: 'img-0' }
            }
          }
        }

        const tags = Array.isArray(article.tags) ? article.tags : []
        const noteParagraphs = isNote ? stripHtmlToParagraphs(article.content) : []
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
            if (!metaLine) metaLine = article.summary || '长文'
          }
        }

        this.setData({
          article: {
            ...article,
            cover_url: cover,
            image: cover,
            publish_time: dateStr,
            created_at: fmtDate(article.createTime),
            like_count: article.likeCount || 0,
            summary: article.summary || '',
          },
          loading: false,
          isNote,
          formatKey: fmt.key,
          formatLabel: fmt.label,
          topicName: TOPIC_NAME[topic] || article.categoryName || '',
          gallerySlides,
          galleryIndex: 0,
          galleryCount: gallerySlides.length,
          noteParagraphs,
          hashTags: hashTags(tags.filter((t) => !['笔记', '长文', '视频', '数据'].includes(t))),
          artStyle: artStyle(topic),
          glyph: (proto && proto.glyph) || (isNote ? '📷' : '📄'),
          metaLine,
          likeStat: (proto && proto.stat) || `${article.likeCount || 0}`,
          readProgress: 0,
          favorited: (StorageUtil.get(FAVORITES_KEY) || []).map(Number).includes(Number(article.id)),
        })

        wx.setNavigationBarTitle({ title: isNote ? '笔记' : '文章' })
        wx.setNavigationBarColor({
          frontColor: '#ffffff',
          backgroundColor: isNote ? '#0f1219' : '#2f5bff',
          animation: { duration: 0 },
        })
      })
      .catch(() => {
        this.setData({ loading: false })
        wx.showToast({ title: '内容不存在', icon: 'none' })
      })
  },

  async _loadRelated() {
    try {
      const res = await productService.getProductList({ current: 1, size: 4 })
      const list = res.records || res.list || []
      this.setData({
        relatedProducts: list.slice(0, 2).map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          cover: p.mainImage || p.main_image || '/images/default-product.svg',
        })),
      })
    } catch (e) { /* ignore */ }
  },

  onGalleryChange(e) {
    this.setData({ galleryIndex: e.detail.current || 0 })
  },

  onProductTap(e) {
    wx.navigateTo({ url: `/pages/product-detail/product-detail?id=${e.currentTarget.dataset.id}` })
  },

  onFollowTap() {
    const followed = !this.data.followed
    this.setData({ followed })
    wx.showToast({ title: followed ? '已关注' : '取消关注', icon: 'none' })
  },

  onLikeTap() {
    const liked = !this.data.liked
    const article = { ...this.data.article }
    article.like_count = Math.max(0, (article.like_count || 0) + (liked ? 1 : -1))
    this.setData({ liked, article })
  },

  onFavoriteTap() {
    const id = Number(this.data.id || (this.data.article && this.data.article.id))
    const favorited = !this.data.favorited
    this.setData({ favorited })
    if (id) {
      const ids = StorageUtil.get(FAVORITES_KEY) || []
      const next = favorited
        ? Array.from(new Set([id, ...ids.map(Number)]))
        : ids.map(Number).filter((x) => x !== id)
      StorageUtil.set(FAVORITES_KEY, next)
    }
    wx.showToast({ title: favorited ? '已收藏' : '取消收藏', icon: 'none' })
  },

  onCommentTap() {
    wx.navigateTo({ url: '/pages/feedback/feedback' })
  },
})
