/* components/author-card/author-card — 作者档案卡片（内容详情页/作者列表复用） */
Component({
  options: {
    multipleSlots: false,
    addGlobalClass: true,
  },
  properties: {
    /** 作者档案 ID（点击事件回传用） */
    authorId: { type: null, value: '' },
    /** 昵称 */
    name: { type: String, value: '' },
    /** 头像 URL */
    avatar: { type: String, value: '' },
    /** 身份标签：主理人/编辑/投稿人/用户 等 */
    role: { type: String, value: '' },
    /** 头衔（来自档案，可空） */
    title: { type: String, value: '' },
    /** 简介（来自档案，可空） */
    intro: { type: String, value: '' },
    /** 整卡可点击跳转作者作品页 */
    clickable: { type: Boolean, value: true },
    /** 是否显示关注按钮（与 clickable 互斥，按钮优先） */
    showFollow: { type: Boolean, value: false },
    /** 是否已关注 */
    followed: { type: Boolean, value: false },
    /** 展示形态：full / compact */
    variant: { type: String, value: 'full' },
  },
  data: {
    initial: '',
  },
  observers: {
    'name, avatar'(name, avatar) {
      const n = String(name || '').trim()
      const initial = n ? n.slice(0, 1) : '作'
      if (initial !== this.data.initial) {
        this.setData({ initial })
      }
    },
  },
  lifetimes: {
    attached() {
      const n = String(this.data.name || '').trim()
      this.setData({ initial: n ? n.slice(0, 1) : '作' })
    },
  },
  methods: {
    onCardTap() {
      if (!this.data.clickable) return
      this.triggerEvent('tap', {
        authorId: this.data.authorId,
        name: this.data.name,
      })
    },
    onFollowTap() {
      this.triggerEvent('follow', {
        authorId: this.data.authorId,
        name: this.data.name,
        followed: this.data.followed,
      })
    },
  },
})
