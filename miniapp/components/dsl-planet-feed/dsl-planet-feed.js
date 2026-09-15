const PlanetService = require('../../services/planet')
const warmPlanet = require('../../data/warm-planet')
const { resolveMediaUrl } = require('../../utils/media-url')
const { StorageUtil } = require('../../utils/storage')
const { openWarmShareSheet } = require('../../utils/share')
const { isUnusableImageUrl } = require('../../utils/image-fallback')
const { picsum } = require('../../data/warm-media')

const MOMENT_LIKES_KEY = 'moment_likes'
const MOMENT_FAVS_KEY = 'moment_favorites'

function readMomentIds(key) {
  const raw = StorageUtil.get(key)
  if (!raw) return []
  if (Array.isArray(raw)) return raw.map(String)
  if (typeof raw === 'object') return Object.keys(raw).filter((k) => !!raw[k])
  return []
}

function writeMomentIds(key, ids) {
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
  if (!file && attachments.length) {
    const a = attachments[0] || {}
    file = {
      name: a.name || '附件.pdf',
      meta: [formatFileSize(a.size), item.viewCount ? `${item.viewCount} 人看过` : '', '星球会员可看'].filter(Boolean).join(' · '),
      fileId: a.fileId || '',
    }
  }
  const id = item.id || item.uid || ''
  const isDemo = !!item.isDemo || !item.id
  return {
    uid: String(item.uid || id || Math.random()),
    id,
    isDemo,
    top: isPinned,
    hot: item.hot != null ? !!item.hot : (/热议|热/.test(tagStr) || Number(item.likeCount) > 200),
    author,
    authorInitial: item.authorInitial || String(author).slice(0, 1),
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
    type: item.type || '',
  }
}

const DEMO_FEED_LIST = warmPlanet.FEED.map(mapFeedItem)

Component({
  properties: {
    config: { type: Object, value: {} },
  },
  data: {
    segs: warmPlanet.SEGS,
    activeSeg: 'all',
    allList: DEMO_FEED_LIST,
    list: DEMO_FEED_LIST,
    footerText: '—— 演示数据 ——',
    usingDemo: true,
    resourcesUrl: '/pages/resources/resources',
  },
  lifetimes: { attached() { this._load() } },
  observers: { config() { this._load() } },
  methods: {
    _load() {
      const c = this.data.config || {}
      const segs = Array.isArray(c.segs) && c.segs.length ? c.segs : warmPlanet.SEGS
      const pageSize = Number(c.page_size) || 20
      const resourcesUrl = c.resources_url || '/pages/resources/resources'
      const manual = String(c.source_mode || 'auto') === 'manual'
      // 保留 DEMO 列表，不先清空；只更新 tabs
      this.setData({ segs, resourcesUrl })
      if (manual && Array.isArray(c.items) && c.items.length) {
        this._applySeg(c.items.map(mapFeedItem), true)
        return
      }
      PlanetService.getPlanetFeed({ current: 1, size: pageSize }).then((feed) => {
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
      this.setData({ activeSeg: key })
      this._applySeg(this.data.allList, this.data.usingDemo)
    },
    _momentNavUrl(id, demo) {
      const mid = String(id || '').trim()
      const asDemo = isTruthyDemo(demo) || !mid || mid.indexOf('demo') === 0 || !!this.data.usingDemo
      if (asDemo) {
        return '/pages/moment-detail/moment-detail?demo=1&from=planet' + (mid ? `&id=${encodeURIComponent(mid)}` : '')
      }
      return `/pages/moment-detail/moment-detail?id=${encodeURIComponent(mid)}&from=planet`
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
      wx.navigateTo({ url: this._momentNavUrl(ds.id || ds.uid, demo) })
    },
    onLikeTap(e) {
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
    onMoreTap() {
      wx.showActionSheet({
        itemList: ['举报', '不感兴趣'],
        success: (res) => {
          if (res.tapIndex === 0) wx.showToast({ title: '已收到举报', icon: 'none' })
          else if (res.tapIndex === 1) wx.showToast({ title: '将减少此类内容', icon: 'none' })
        },
      })
    },
    onOpenFile(e) {
      const file = (e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.file) || {}
      if (file.fileId) {
        wx.navigateTo({ url: `/pages/file-preview/file-preview?id=${file.fileId}` })
        return
      }
      wx.navigateTo({
        url: `/pages/file-preview/file-preview?demo=1&name=${encodeURIComponent(file.name || '附件.pdf')}`,
      })
    },
  },
})
