// pages/content-detail/content-detail.js — 内容详情页
// 富文本内容展示、点赞、收藏、分享

const request = require('../../utils/request')

Page({
  data: {
    article: {},
    loading: true,
    liked: false,
    favorited: false,
  },

  onLoad(options) {
    const id = options.id
    if (!id) {
      wx.showToast({ title: '参数错误', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }
    this._loadArticleDetail(id)
  },

  onShareAppMessage() {
    const article = this.data.article
    return {
      title: article.title || '内容详情',
      path: `/pages/content-detail/content-detail?id=${article.id}`,
      imageUrl: article.cover_url || '',
    }
  },

  /** 加载内容详情 */
  _loadArticleDetail(id) {
    this.setData({ loading: true })

    request.get(`/api/v1/mp/contents/${id}`, {}, { auth: false })
      .then((article) => {
        const normalized = {
          ...article,
          cover_url: article.coverUrl || article.coverImage || '',
          image: article.coverUrl || article.coverImage || '',
          publish_time: article.publishedAt || article.createTime,
          created_at: article.createTime,
          like_count: article.likeCount || 0,
        }
        this.setData({
          article: normalized,
          loading: false,
        })
        wx.setNavigationBarTitle({ title: normalized.title })
      })
      .catch(() => {
        this.setData({ loading: false })
        wx.showToast({ title: '内容不存在', icon: 'none' })
      })
  },

  /** 点赞 */
  onLikeTap() {
    const liked = !this.data.liked
    const article = { ...this.data.article }
    article.like_count = (article.like_count || 0) + (liked ? 1 : -1)
    this.setData({ liked, article })
    wx.showToast({
      title: liked ? '已点赞' : '取消点赞',
      icon: 'none',
    })
  },

  /** 收藏 */
  onFavoriteTap() {
    const favorited = !this.data.favorited
    this.setData({ favorited })
    wx.showToast({
      title: favorited ? '已收藏' : '取消收藏',
      icon: 'none',
    })
  },

  /** 分享 */
  onShareTap() {
    wx.showActionSheet({
      itemList: ['分享给好友', '分享到朋友圈', '复制链接'],
      success: (res) => {
        if (res.tapIndex === 2) {
          wx.setClipboardData({
            data: `https://example.com/article/${this.data.article.id}`,
            success: () => {
              wx.showToast({ title: '链接已复制', icon: 'none' })
            },
          })
        }
      },
    })
  },
})
