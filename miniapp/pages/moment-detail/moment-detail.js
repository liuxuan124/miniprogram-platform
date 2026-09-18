const request = require('../../utils/request')
const { resolveMediaUrl } = require('../../utils/media-url')
const { createSharePageConfig, openWarmShareSheet } = require('../../utils/share')
const { AuthUtil } = require('../../utils/auth')
const { BASE_URL } = require('../../utils/request')
const { DEMO_PLANET_POST } = require('../../data/warm-demo')
const { USE_LOCAL_SOURCE, FORCE_LOCAL_DEMO } = require('../../data/warm-source')
const { StorageUtil } = require('../../utils/storage')

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

function stripHtml(html) {
  return String(html || '').replace(/<[^>]+>/g, '\n').replace(/\n+/g, '\n').trim()
}

/** 从正文拆出提问 / 星主回答，对齐 planet-post.html */
function splitHostAnswer(html) {
  const raw = String(html || '')
  if (!raw) return { question: '', answerParas: [] }
  const markers = [
    /---ANSWER---/i,
    /<b>\s*星主回答[：:]?\s*<\/b>/i,
    /⭐️?\s*星主回答[·・]?\s*已设为精华/i,
    /星主回答[：:]/,
  ]
  let idx = -1
  let markerLen = 0
  for (const re of markers) {
    const m = raw.match(re)
    if (m && m.index != null && (idx < 0 || m.index < idx)) {
      idx = m.index
      markerLen = m[0].length
    }
  }
  if (idx < 0) return { question: raw, answerParas: [] }
  const question = raw.slice(0, idx)
  const answerHtml = raw.slice(idx + markerLen)
  const answerParas = stripHtml(answerHtml)
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
  return { question, answerParas }
}

function formatFileSize(size) {
  const n = Number(size) || 0
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function fileTypeIcon(fileType) {
  const map = { pdf: '📄', doc: '📝', xls: '📊', ppt: '📽️', zip: '🗂️', txt: '📃' }
  return map[fileType] || '📎'
}

function canOpenDocument(fileType, name) {
  const ext = String(name || '').split('.').pop()?.toLowerCase() || ''
  const openTypes = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt']
  return openTypes.indexOf(ext) >= 0 || ['pdf', 'doc', 'xls', 'ppt', 'txt'].indexOf(fileType) >= 0
}

function buildDownloadHeader() {
  const header = {}
  const token = AuthUtil.getToken()
  if (token) header.Authorization = 'Bearer ' + token
  return header
}

function normalizeComments(list) {
  return (Array.isArray(list) ? list : []).map((c, i) => {
    const badge = c.badge || c.authorRole || c.author_role || ''
    const isHost = !!(c.isHost || c.is_host || badge === '星主' || /星主/.test(String(badge)))
    return {
      id: c.id || ('c' + i + '_' + (c.nick || c.author || 'u')),
      nick: c.nick || c.author || c.nickname || '球友',
      badge,
      isHost,
      avatar: resolveMediaUrl(c.avatar || c.authorAvatar || ''),
      text: c.text || c.content || '',
      likes: Number(c.likes || c.likeCount || 0),
      reply: c.reply || '',
    }
  })
}

function applyDemoFallback(page) {
  const d = DEMO_PLANET_POST
  const discussions = normalizeComments(d.comments)
  const mid = String((page && page._momentId) || 'demo')
  page.setData({
    loading: false,
    usingDemo: true,
    loadFailed: false,
    moment: {
      id: mid,
      title: d.title,
      author: d.author,
      authorTag: d.authorTag,
      author_avatar: d.avatar,
      author_initial: d.author.slice(0, 1),
      time_text: d.time,
      cover_url: d.images[0],
    },
    bodyText: d.content,
    images: d.images,
    topics: d.topics,
    statsLine: d.stats,
    answer: d.answer,
    likeWall: d.likeWall,
    discussions,
    displayDiscussions: page._sortedDiscussions
      ? page._sortedDiscussions(discussions, 'hot')
      : discussions.slice().sort((a, b) => Number(b.likes || 0) - Number(a.likes || 0)),
    commentCount: discussions.length,
    likeCount: d.answer.likes,
    liked: hasMomentId(MOMENT_LIKES_KEY, mid),
    favorited: hasMomentId(MOMENT_FAVS_KEY, mid),
    attachments: [],
    hostOnly: false,
  })
  wx.setNavigationBarTitle({ title: '星球动态' })
}

function applyLoadFailed(page, reason) {
  page.setData({
    loading: false,
    usingDemo: false,
    loadFailed: true,
    loadErrorText: reason || '动态加载失败或不存在',
    moment: null,
    bodyText: '',
    images: [],
    topics: '',
    statsLine: '',
    answer: null,
    likeWall: null,
    discussions: [],
    displayDiscussions: [],
    commentCount: 0,
    likeCount: 0,
    attachments: [],
  })
  wx.setNavigationBarTitle({ title: '星球动态' })
}

Page({
  ...createSharePageConfig(),
  data: {
    loading: true,
    usingDemo: false,
    loadFailed: false,
    loadErrorText: '',
    moment: null,
    bodyText: '',
    images: [],
    attachments: [],
    topics: '',
    statsLine: '',
    answer: null,
    likeWall: null,
    discussions: [],
    displayDiscussions: [],
    commentCount: 0,
    likeCount: 0,
    liked: false,
    favorited: false,
    hostOnly: false,
    sortBy: 'hot',
    sortLabel: '按热度',
    showInput: false,
    draft: '',
  },

  onLoad(options) {
    this._momentId = options && options.id
    this._fromPlanet = options && options.from === 'planet'
    const wantDemo = !!(options && (options.demo === '1' || options.demo === true))
    const idStr = String(this._momentId || '')
    const allowDemo = USE_LOCAL_SOURCE || FORCE_LOCAL_DEMO
    if (allowDemo && (wantDemo || !this._momentId || idStr.indexOf('demo') === 0)) {
      applyDemoFallback(this)
      return
    }
    if (wantDemo || idStr.indexOf('demo') === 0) {
      applyLoadFailed(this, '动态不存在')
      return
    }
    if (!this._momentId) {
      applyLoadFailed(this, '动态不存在')
      return
    }
    this._loadDetail(this._momentId)
  },

  onShareAppMessage() {
    const moment = this.data.moment || {}
    return {
      title: moment.title || '星球动态',
      path: this._momentId
        ? `/pages/moment-detail/moment-detail?id=${this._momentId}`
        : '/pages/planet/planet',
      imageUrl: this.data.images[0] || moment.cover_url || '',
    }
  },

  onRetryLoad() {
    if (!this._momentId) return
    this.setData({ loading: true, loadFailed: false })
    this._loadDetail(this._momentId)
  },

  onShareTap() {
    const moment = this.data.moment || {}
    const id = this._momentId
    if (!id || this.data.usingDemo) {
      wx.showToast({ title: '暂不可分享', icon: 'none' })
      return
    }
    openWarmShareSheet({
      title: moment.title || '星球动态',
      path: `/pages/moment-detail/moment-detail?id=${id}`,
      cover: this.data.images[0] || moment.cover_url || '',
      quote: (this.data.bodyText || '').slice(0, 80),
      contentId: id,
    })
  },

  onLikeTap() {
    const id = String(this._momentId || (this.data.moment && this.data.moment.id) || 'demo')
    const liked = !this.data.liked
    const base = Number(this.data.likeCount) || 0
    const likeCount = Math.max(0, base + (liked ? 1 : -1))
    const ids = readMomentIds(MOMENT_LIKES_KEY)
    if (liked) {
      if (!ids.includes(id)) ids.push(id)
    } else {
      const idx = ids.indexOf(id)
      if (idx >= 0) ids.splice(idx, 1)
    }
    writeMomentIds(MOMENT_LIKES_KEY, ids)
    this.setData({ liked, likeCount })
    wx.showToast({ title: liked ? '已点赞' : '已取消点赞', icon: 'none' })
  },

  onFavoriteTap() {
    const id = String(this._momentId || (this.data.moment && this.data.moment.id) || 'demo')
    const favorited = !this.data.favorited
    const ids = readMomentIds(MOMENT_FAVS_KEY)
    if (favorited) {
      if (!ids.includes(id)) ids.push(id)
    } else {
      const idx = ids.indexOf(id)
      if (idx >= 0) ids.splice(idx, 1)
    }
    writeMomentIds(MOMENT_FAVS_KEY, ids)
    this.setData({ favorited })
    wx.showToast({ title: favorited ? '已收藏' : '已取消收藏', icon: 'none' })
  },

  onFollowTap() {
    wx.showToast({ title: '已关注', icon: 'success' })
  },

  onCommentTap() {
    this.setData({ showInput: true })
  },

  onDraftInput(e) {
    this.setData({ draft: (e.detail && e.detail.value) || '' })
  },

  onInputBlur() {
    if (!(this.data.draft || '').trim()) {
      setTimeout(() => this.setData({ showInput: false }), 120)
    }
  },

  onToggleHostOnly() {
    const hostOnly = !this.data.hostOnly
    this.setData({
      hostOnly,
      displayDiscussions: this._sortedDiscussions(
        this._filterDiscussions(this.data.discussions, hostOnly),
        this.data.sortBy
      ),
    })
  },

  onSortTap() {
    const next = this.data.sortBy === 'hot' ? 'time' : 'hot'
    this.setData({
      sortBy: next,
      sortLabel: next === 'hot' ? '按热度' : '按时间',
      displayDiscussions: this._sortedDiscussions(
        this._filterDiscussions(this.data.discussions, this.data.hostOnly),
        next
      ),
    })
  },

  _filterDiscussions(list, hostOnly) {
    const all = Array.isArray(list) ? list : []
    if (!hostOnly) return all
    return all.filter((c) => c.isHost || c.badge === '星主')
  },

  _sortedDiscussions(list, sortBy) {
    const all = (Array.isArray(list) ? list : []).slice()
    if (sortBy === 'time') return all
    return all.sort((a, b) => Number(b.likes || 0) - Number(a.likes || 0))
  },

  async onSendComment() {
    const text = (this.data.draft || '').trim()
    if (!text) {
      wx.showToast({ title: '请输入内容', icon: 'none' })
      return
    }
    let nick = '我'
    let avatar = ''
    try {
      const u = AuthUtil.getUserInfo && AuthUtil.getUserInfo()
      if (u) {
        nick = u.nickName || u.nickname || nick
        if (u.avatarUrl || u.avatar) avatar = resolveMediaUrl(u.avatarUrl || u.avatar)
      }
    } catch (e) { /* ignore */ }

    const local = {
      id: 'local_' + Date.now(),
      nick,
      badge: '',
      isHost: false,
      avatar,
      text,
      likes: 0,
      reply: '',
    }

    let posted = false
    if (this._momentId && AuthUtil.isLoggedIn()) {
      try {
        await request.post(
          `/api/v1/mp/contents/${this._momentId}/comments`,
          { content: text },
          { auth: true, showError: false }
        )
        posted = true
      } catch (e) {
        try {
          await request.post(
            `/api/v1/mp/planet/contents/${this._momentId}/comments`,
            { content: text },
            { auth: true, showError: false }
          )
          posted = true
        } catch (e2) { /* fall back to local */ }
      }
    }

    const discussions = [local].concat(this.data.discussions)
    this.setData({
      discussions,
      displayDiscussions: this._sortedDiscussions(
        this._filterDiscussions(discussions, this.data.hostOnly),
        this.data.sortBy
      ),
      commentCount: discussions.length,
      draft: '',
      showInput: false,
    })
    wx.showToast({ title: posted ? '已发布' : '已发送', icon: 'success' })
  },

  onPreviewImage(e) {
    const url = e.currentTarget.dataset.url
    if (!url) return
    wx.previewImage({ current: url, urls: this.data.images })
  },

  onOpenAttachment(e) {
    const index = Number(e.currentTarget.dataset.index)
    const item = this.data.attachments[index]
    if (!item) return
    if (item.fileId) {
      if (item.canPreview && item.previewText) {
        wx.showModal({
          title: item.name,
          content: item.previewText,
          showCancel: false,
          confirmText: item.canDownload ? '下载完整版' : '知道了',
          success: (res) => {
            if (res.confirm && item.canDownload) this._downloadFileItem(item)
          },
        })
        return
      }
      if (!item.canDownload) {
        this._showLocked(item)
        return
      }
      this._downloadFileItem(item)
      return
    }
    if (!item.url) {
      wx.showToast({ title: '文件不可用', icon: 'none' })
      return
    }
    this._downloadLegacy(item)
  },

  _showLocked(item) {
    const needLogin = !AuthUtil.isLoggedIn()
    wx.showModal({
      title: item.qualityTier === 'premium' ? '精品资料' : '资料已锁定',
      content: item.lockedReason || '开通星球会员后可下载',
      confirmText: needLogin ? '去登录' : '去开通',
      success(res) {
        if (!res.confirm) return
        if (needLogin) {
          wx.navigateTo({ url: '/pages/login/login' })
        } else {
          wx.navigateTo({
            url: '/pkg-user/member-center/member-center',
            fail: () => {
              wx.navigateTo({
                url: '/pages/member-center/member-center',
                fail: () => wx.showToast({ title: '暂时打不开会员中心', icon: 'none' }),
              })
            },
          })
        }
      },
    })
  },

  _downloadFileItem(item) {
    wx.showLoading({ title: '下载中...', mask: true })
    wx.downloadFile({
      url: `${BASE_URL}/api/v1/mp/files/${item.fileId}/download`,
      header: buildDownloadHeader(),
      success: (res) => this._openDownloadedFile(res, item),
      fail: () => wx.showToast({ title: '下载失败', icon: 'none' }),
      complete: () => wx.hideLoading(),
    })
  },

  _downloadLegacy(item) {
    wx.showLoading({ title: '下载中...', mask: true })
    wx.downloadFile({
      url: item.url,
      success: (res) => this._openDownloadedFile(res, item),
      fail: () => wx.showToast({ title: '下载失败', icon: 'none' }),
      complete: () => wx.hideLoading(),
    })
  },

  _openDownloadedFile(res, item) {
    if (res.statusCode === 403 || res.statusCode === 401) {
      this._showLocked(item)
      return
    }
    if (canOpenDocument(item.fileType, item.name)) {
      wx.openDocument({
        filePath: res.tempFilePath,
        showMenu: true,
        fail: () => wx.showToast({ title: '无法预览该文件', icon: 'none' }),
      })
    } else {
      wx.showToast({ title: '已下载到临时目录', icon: 'none' })
    }
  },

  _loadDetail(id) {
    this.setData({ loading: true })
    const url = this._fromPlanet
      ? `/api/v1/mp/planet/contents/${id}`
      : `/api/v1/mp/contents/${id}`
    request.get(url, {}, { auth: false })
      .then((data) => {
        if (!data || (!data.title && !data.content && !data.summary)) {
          applyLoadFailed(this, '动态不存在或已下架')
          return
        }
        if (data && data.locked && this._fromPlanet) {
          this.setData({
            loading: false,
            usingDemo: false,
            loadFailed: false,
            moment: {
              id: data.id,
              title: data.title || '',
              author: data.author || '星主',
              authorTag: data.authorRole || data.author_role || '会员可见',
              author_avatar: resolveMediaUrl(data.authorAvatar || data.author_avatar || ''),
              author_initial: String(data.author || '星').slice(0, 1),
              time_text: String(data.publishedAt || data.updateTime || '').slice(0, 16).replace('T', ' ') || '',
              cover_url: resolveMediaUrl(data.coverImage || ''),
            },
            bodyText: String(data.summary || data.lockedReason || '开通会员后可查看全文'),
            images: [],
            attachments: [],
            answer: data.essenceAnswer || null,
            likeWall: data.likeWall || null,
            discussions: [],
            displayDiscussions: [],
            commentCount: Number(data.commentCount || data.comment_count || 0),
            likeCount: Number(data.likeCount || data.like_count || 0),
            liked: hasMomentId(MOMENT_LIKES_KEY, id),
            favorited: hasMomentId(MOMENT_FAVS_KEY, id),
            topics: '',
            statsLine: data.lockedReason || '会员可见',
            hostOnly: false,
          })
          return
        }
        const cover = resolveMediaUrl(data.coverImage || data.cover_image || '')
        const images = (Array.isArray(data.images) ? data.images : [])
          .map((u) => resolveMediaUrl(u))
          .filter(Boolean)
        if (cover && images.indexOf(cover) < 0) images.unshift(cover)
        const attachments = (Array.isArray(data.attachments) ? data.attachments : []).map((raw, idx) => ({
          id: raw.id || String(idx),
          fileId: raw.fileId || raw.file_id || null,
          name: raw.name || '未命名文件',
          url: resolveMediaUrl(raw.url || ''),
          size: Number(raw.size || 0),
          sizeText: formatFileSize(raw.size),
          fileType: raw.fileType || 'other',
          icon: fileTypeIcon(raw.fileType || 'other'),
          canRead: raw.canRead !== false,
          canDownload: raw.canDownload !== false,
          canPreview: !!raw.canPreview,
          previewText: raw.previewText || '',
          lockedReason: raw.lockedReason || '',
          qualityTier: raw.qualityTier || '',
          locked: raw.fileId ? !raw.canDownload : false,
          actionText: raw.fileId && !raw.canDownload ? '锁定' : (raw.canPreview && !raw.canDownload ? '预览' : '下载'),
        }))
        const rawHtml = String(data.content || data.summary || '')
        const split = splitHostAnswer(rawHtml)
        const body = stripHtml(split.question || rawHtml)
        const parsedAnswer = split.answerParas && split.answerParas.length
          ? {
              bar: '⭐️ 星主回答 · 已设为精华',
              paras: split.answerParas,
              likes: Number(data.likeCount || data.like_count || 0),
              asks: '',
            }
          : null
        const viewCount = Number(data.viewCount || data.view_count || 0)
        const hasApiComments = Array.isArray(data.comments) && data.comments.length > 0
        const discussions = hasApiComments ? normalizeComments(data.comments) : []
        const commentCount = Number(data.commentCount || data.comment_count || discussions.length) || 0
        const likeCount = Number(data.likeCount || data.like_count || 0) || 0
        const tagList = Array.isArray(data.tags) ? data.tags.map((t) => String(t || '')).filter(Boolean) : []
        const askTag = tagList.find((t) => /读者提问|提问|精华|星主/.test(t))
        const topicTags = tagList.filter((t) => !/读者提问|提问|精华|星主|置顶|会员可见/.test(t))
        const topicsText = topicTags.length
          ? topicTags.map((t) => (String(t).indexOf('#') === 0 ? t : `#${t}`)).join(' ')
          : (tagList.length ? tagList.map((t) => (String(t).indexOf('#') === 0 ? t : `#${t}`)).join(' ') : '')
        const statsParts = []
        if (viewCount > 0) statsParts.push(`${viewCount} 浏览`)
        if (commentCount > 0) statsParts.push(`${commentCount} 条讨论`)
        this.setData({
          loading: false,
          usingDemo: false,
          loadFailed: false,
          moment: {
            id: data.id,
            title: data.title || '',
            author: data.author || '球友',
            authorTag: askTag || data.authorRole || data.author_role || '星球动态',
            author_avatar: resolveMediaUrl(data.authorAvatar || data.author_avatar || ''),
            author_initial: String(data.author || '球').slice(0, 1),
            time_text: String(data.publishedAt || data.updateTime || data.createTime || '').slice(0, 16).replace('T', ' ') || '',
            cover_url: cover,
          },
          bodyText: body || '',
          images,
          attachments,
          topics: topicsText,
          statsLine: statsParts.join(' · '),
          answer: data.essenceAnswer || data.essence_answer || parsedAnswer || null,
          likeWall: data.likeWall || null,
          discussions,
          displayDiscussions: this._sortedDiscussions(
            this._filterDiscussions(discussions, this.data.hostOnly),
            this.data.sortBy
          ),
          commentCount,
          likeCount,
          liked: hasMomentId(MOMENT_LIKES_KEY, id),
          favorited: hasMomentId(MOMENT_FAVS_KEY, id),
          hostOnly: false,
        })
        wx.setNavigationBarTitle({ title: '星球动态' })
      })
      .catch(() => {
        applyLoadFailed(this, '网络异常，请稍后重试')
      })
  },
})
