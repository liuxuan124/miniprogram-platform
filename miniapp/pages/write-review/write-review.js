const reviewService = require('../../services/review')
const { AuthUtil } = require('../../utils/auth')

Page({
  data: {
    productId: '',
    orderId: '',
    productName: '',
    productImage: '',
    score: 5,
    starList: [1, 2, 3, 4, 5],
    tagOptions: ['实用', '模板全', '讲得清楚', '更新及时', '性价比高', '值得推荐'],
    selectedTags: [],
    content: '',
    anonymous: false,
    images: [],
    submitting: false,
  },

  onLoad(q) {
    this.setData({
      productId: q.productId || '',
      orderId: q.orderId || '',
      productName: q.name ? decodeURIComponent(q.name) : '知识商品',
      productImage: q.image ? decodeURIComponent(q.image) : '',
    })
  },

  onStar(e) {
    this.setData({ score: Number(e.currentTarget.dataset.s) || 5 })
  },

  onToggleTag(e) {
    const tag = e.currentTarget.dataset.tag
    const selectedTags = this.data.selectedTags.slice()
    const i = selectedTags.indexOf(tag)
    if (i >= 0) selectedTags.splice(i, 1)
    else selectedTags.push(tag)
    this.setData({ selectedTags })
  },

  onContent(e) {
    this.setData({ content: e.detail.value })
  },

  onAnon() {
    this.setData({ anonymous: !this.data.anonymous })
  },

  onAddImg() {
    const remain = 4 - this.data.images.length
    if (remain <= 0) return
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      success: (res) => {
        const files = (res.tempFiles || []).map((f) => f.tempFilePath)
        this.setData({ images: this.data.images.concat(files).slice(0, 4) })
      },
    })
  },

  onPreviewImg(e) {
    const i = e.currentTarget.dataset.i
    wx.previewImage({ current: this.data.images[i], urls: this.data.images })
  },

  onRemoveImg(e) {
    const i = e.currentTarget.dataset.i
    const images = this.data.images.slice()
    images.splice(i, 1)
    this.setData({ images })
  },

  async onSubmit() {
    if (!AuthUtil.requireLoginForAction('发表评价')) return
    if (this.data.submitting) return
    if (!this.data.content.trim()) {
      wx.showToast({ title: '请填写评价内容', icon: 'none' })
      return
    }
    if (!this.data.productId) {
      wx.showToast({ title: '缺少商品信息', icon: 'none' })
      return
    }
    this.setData({ submitting: true })
    try {
      await reviewService.createReview({
        productId: Number(this.data.productId),
        orderId: this.data.orderId ? Number(this.data.orderId) : null,
        score: this.data.score,
        tags: this.data.selectedTags,
        content: this.data.content.trim(),
        images: this.data.images,
        anonymous: this.data.anonymous,
      })
      wx.showToast({ title: '评价成功 +10 积分', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1200)
    } catch (e) {
      const msg = (e && (e.message || e.errMsg)) || '提交失败，请稍后重试'
      wx.showToast({ title: String(msg).slice(0, 40), icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  },
})
