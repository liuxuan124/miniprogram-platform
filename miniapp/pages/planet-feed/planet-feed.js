const PlanetService = require('../../services/planet')
const { resolveMediaUrl } = require('../../utils/media-url')

function relativeTime(raw) {
  if (!raw) return ''
  const t = new Date(String(raw).replace(/-/g, '/')).getTime()
  if (!Number.isFinite(t)) return String(raw).slice(0, 16)
  const diff = Date.now() - t
  if (diff < 60 * 1000) return '刚刚'
  if (diff < 60 * 60 * 1000) return Math.floor(diff / 60000) + ' 分钟前'
  if (diff < 24 * 60 * 60 * 1000) return Math.floor(diff / 3600000) + ' 小时前'
  if (diff < 7 * 24 * 60 * 60 * 1000) return Math.floor(diff / 86400000) + ' 天前'
  return String(raw).replace('T', ' ').slice(0, 16)
}

function mapFeedItem(item) {
  const tags = Array.isArray(item.tags) ? item.tags : []
  const tagStr = tags.map((t) => String(t)).join(' ')
  const author = item.author || '球友'
  let content = String(item.summary || item.title || '').replace(/<[^>]+>/g, '').trim()
  if (!content && item.content) {
    content = String(item.content).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120)
  }
  return {
    id: item.id || '',
    author,
    tag: /提问/.test(tagStr) ? '提问' : (/精华/.test(tagStr) ? '精华' : (tags[0] || '')),
    time: relativeTime(item.publishedAt || item.createTime),
    content: content || '（无文案）',
    likes: item.likeCount != null ? item.likeCount : 0,
    comments: item.commentCount != null ? item.commentCount : 0,
    cover: resolveMediaUrl(item.coverUrl || item.coverImage || ''),
  }
}

Page({
  data: {
    planetId: 'warm-main',
    mainPlanetId: '',
    isWandering: false,
    modeLabel: '',
    community: {},
    list: [],
    loading: true,
    loadError: false,
    page: 1,
    hasMore: false,
  },

  onLoad(query) {
    const planetId = (query && query.planetId) ? String(query.planetId) : 'warm-main'
    this.setData({ planetId })
    this._load(true)
  },

  onPullDownRefresh() {
    this._load(true).finally(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    if (!this.data.hasMore || this.data.loading) return
    this._load(false)
  },

  onRetry() {
    this._load(true)
  },

  _load(reset) {
    const page = reset ? 1 : (this.data.page + 1)
    this.setData({ loading: true, loadError: false })
    const planetId = this.data.planetId
    const tasks = [
      PlanetService.getPlanetCommunity(planetId).catch(() => null),
      PlanetService.getPlanetFeed({ current: page, size: 20, planetId }).catch(() => null),
      PlanetService.getMainPlanet().catch(() => null),
    ]
    return Promise.all(tasks).then(([community, feed, main]) => {
      const records = (feed && (feed.records || feed.list || feed.rows)) || []
      const mapped = records.map(mapFeedItem).filter((i) => i.id)
      const total = feed && (feed.total != null ? Number(feed.total) : mapped.length)
      const list = reset ? mapped : (this.data.list || []).concat(mapped)
      const mainPlanetId = (main && main.planetId)
        || PlanetService.getCachedMainPlanetId()
        || ''
      const isWandering = !!(mainPlanetId && String(mainPlanetId) !== String(planetId))
      const patch = {
        loading: false,
        loadError: !feed,
        list,
        page,
        hasMore: list.length < total,
        mainPlanetId,
        isWandering,
        modeLabel: isWandering ? '流浪中 · 非常驻星球' : '我的常驻星球',
      }
      if (community) {
        patch.community = community
        if (community.title) {
          wx.setNavigationBarTitle({
            title: isWandering ? `流浪 · ${community.title}` : community.title,
          })
        }
      }
      this.setData(patch)
    }).catch(() => {
      this.setData({ loading: false, loadError: true })
    })
  },

  onOpen(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({ url: `/pages/moment-detail/moment-detail?id=${id}` })
  },

  onGoPlanetHome() {
    wx.switchTab({ url: '/pages/planet/planet' })
  },

  onSwitchPlanet() {
    wx.navigateTo({ url: '/pages/planet-list/planet-list' })
  },
})
