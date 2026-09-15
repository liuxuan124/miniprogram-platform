const { createSharePageConfig } = require('../../utils/share')
const { DEMO_CONTRIBUTE } = require('../../data/warm-demo')
const { USE_LOCAL_SOURCE } = require('../../data/warm-source')
const { post, upload } = require('../../utils/request')
const { AuthUtil } = require('../../utils/auth')

const TOPIC_OPTIONS = ['书桌改造', '工位美学', '内容创业', '写作方法', '读书']

function getNavMetrics() {
  const sys = wx.getSystemInfoSync() || {}
  const statusBarHeight = Number(sys.statusBarHeight) || 20
  const winW = Number(sys.windowWidth) || 375
  let navBarHeight = 44
  let navPadRight = 24
  try {
    const mb = wx.getMenuButtonBoundingClientRect()
    if (mb && mb.height) {
      navBarHeight = (mb.top - statusBarHeight) * 2 + mb.height
      navPadRight = Math.max(12, winW - mb.left + 8)
    }
  } catch (e) {}
  return { statusBarHeight, navBarHeight, navPadRight }
}

Page({
  ...createSharePageConfig(),
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    navPadRight: 24,
    stage: 1,
    editorUnlocked: false,
    name: '',
    contact: '',
    intro: '',
    portfolio: '',
    portfolioImages: [],
    submitting: false,
    heroTitle: '',
    heroDesc: '',
    stats: [],
    why: [],
    topics: [],
    forms: [],
    selectedTopicMap: {},
    selectedFormMap: {},
    publishTypes: [],
    publishType: 'note',
    editorTitle: '写笔记',
    draftTitle: '',
    draftBody: '',
    draftImages: [],
    draftTopics: '',
    syncPlanet: true,
    memberOnly: false,
  },

  onLoad(options) {
    const metrics = getNavMetrics()
    const unlocked = !!(options && (options.unlocked === '1' || options.stage2 === '1'))
    const stage = options && Number(options.stage) === 2 ? 2 : 1
    this.setData({
      ...metrics,
      editorUnlocked: unlocked,
      stage,
      editorTitle: stage === 2 ? (unlocked ? '写笔记' : '发布器预览') : '写笔记',
    })
    if (USE_LOCAL_SOURCE) {
      this.setData({
        heroTitle: DEMO_CONTRIBUTE.heroTitle,
        heroDesc: DEMO_CONTRIBUTE.heroDesc,
        stats: DEMO_CONTRIBUTE.stats,
        why: DEMO_CONTRIBUTE.why,
        topics: DEMO_CONTRIBUTE.topics,
        forms: DEMO_CONTRIBUTE.forms,
        publishTypes: DEMO_CONTRIBUTE.publishTypes,
      })
      return
    }
    const SystemService = require('../../services/system')
    SystemService.fetchSystemConfig(true).then((config) => {
      const cfg = (config && (config.contributeConfig || config.contribute_config)) || {}
      this.setData({
        heroTitle: cfg.heroTitle || DEMO_CONTRIBUTE.heroTitle,
        heroDesc: cfg.heroDesc || DEMO_CONTRIBUTE.heroDesc,
        stats: Array.isArray(cfg.stats) && cfg.stats.length ? cfg.stats : DEMO_CONTRIBUTE.stats,
        why: Array.isArray(cfg.why) && cfg.why.length ? cfg.why : DEMO_CONTRIBUTE.why,
        topics: Array.isArray(cfg.topics) && cfg.topics.length ? cfg.topics : DEMO_CONTRIBUTE.topics,
        forms: Array.isArray(cfg.forms) && cfg.forms.length ? cfg.forms : DEMO_CONTRIBUTE.forms,
        publishTypes: Array.isArray(cfg.publishTypes) && cfg.publishTypes.length ? cfg.publishTypes : DEMO_CONTRIBUTE.publishTypes,
      })
      this._checkCreatorStatus()
    }).catch(() => {
      this.setData({
        heroTitle: DEMO_CONTRIBUTE.heroTitle,
        heroDesc: DEMO_CONTRIBUTE.heroDesc,
        stats: DEMO_CONTRIBUTE.stats,
        why: DEMO_CONTRIBUTE.why,
        topics: DEMO_CONTRIBUTE.topics,
        forms: DEMO_CONTRIBUTE.forms,
        publishTypes: DEMO_CONTRIBUTE.publishTypes,
      })
    })
  },

  _checkCreatorStatus() {
    if (this.data.editorUnlocked) return
    const { get } = require('../../utils/request')
    get('/api/v1/mp/creator/me', {}, { auth: true, showError: false })
      .then((res) => {
        const status = String((res && (res.status || res.applyStatus || res.state)) || '').toLowerCase()
        const ok = !!(res && (res.approved || res.canPublish || status === 'approved' || status === 'passed'))
        if (ok) this.setData({ editorUnlocked: true })
      })
      .catch(() => {})
  },

  onNavBack() {
    if (this.data.stage === 2) {
      this.onBackToApply()
      return
    }
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/mine/mine' }) })
  },

  onBackToApply() {
    this.setData({ stage: 1, editorTitle: '写笔记' })
  },

  onNameInput(e) { this.setData({ name: e.detail.value }) },
  onIntroInput(e) { this.setData({ intro: e.detail.value }) },
  onPortfolioInput(e) { this.setData({ portfolio: e.detail.value }) },

  onTopicTap(e) {
    const topic = e.currentTarget.dataset.topic
    const map = { ...(this.data.selectedTopicMap || {}) }
    const on = !map[topic]
    const selected = Object.keys(map).filter((k) => map[k])
    if (on && selected.length >= 2) {
      wx.showToast({ title: '最多选 2 个方向', icon: 'none' })
      return
    }
    map[topic] = on
    this.setData({ selectedTopicMap: map })
  },

  onFormTap(e) {
    const form = e.currentTarget.dataset.form
    const key = `selectedFormMap.${form}`
    this.setData({ [key]: !this.data.selectedFormMap[form] })
  },

  onAddPortfolioImages() {
    const remain = 3 - (this.data.portfolioImages || []).length
    if (remain <= 0) return
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const files = (res.tempFiles || []).map((f) => f.tempFilePath).filter(Boolean)
        this.setData({
          portfolioImages: (this.data.portfolioImages || []).concat(files).slice(0, 3),
        })
      },
    })
  },

  onRemovePortfolioImage(e) {
    const index = Number(e.currentTarget.dataset.index)
    const list = (this.data.portfolioImages || []).slice()
    list.splice(index, 1)
    this.setData({ portfolioImages: list })
  },

  _resolveContact() {
    const user = AuthUtil.getUserInfo && AuthUtil.getUserInfo()
    const phone = user && (user.phone || user.mobile || user.phoneNumber)
    if (phone) return String(phone)
    if (this.data.contact) return String(this.data.contact).trim()
    return '微信用户'
  },

  _uploadPortfolioImages() {
    const locals = (this.data.portfolioImages || []).filter(Boolean)
    if (!locals.length) return Promise.resolve([])
    return Promise.all(locals.map((filePath) => {
      if (/^https?:\/\//.test(filePath) || filePath.indexOf('/uploads/') === 0) {
        return Promise.resolve(filePath)
      }
      return upload(filePath, { name: 'file', url: '/api/v1/mp/upload' })
        .then((uploaded) => (uploaded && (uploaded.url || uploaded.fileUrl)) || '')
        .catch(() => '')
    })).then((urls) => urls.filter(Boolean))
  },

  onSubmit() {
    if (this.data.submitting) return
    if (!AuthUtil.requireLoginForAction('创作者申请')) return
    if (!this.data.name) {
      wx.showToast({ title: '请填写笔名 / 昵称', icon: 'none' })
      return
    }
    if (!this.data.intro) {
      wx.showToast({ title: '请填写自我介绍', icon: 'none' })
      return
    }
    const topics = Object.keys(this.data.selectedTopicMap || {}).filter((k) => this.data.selectedTopicMap[k])
    const forms = Object.keys(this.data.selectedFormMap || {}).filter((k) => this.data.selectedFormMap[k])
    if (!topics.length) {
      wx.showToast({ title: '请选择写作方向', icon: 'none' })
      return
    }
    if (!forms.length) {
      wx.showToast({ title: '请选择内容形态', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    this._uploadPortfolioImages()
      .then((images) => {
        let intro = this.data.intro || ''
        intro += `\n方向：${topics.join('、')}`
        intro += `\n形态：${forms.join('、')}`
        if (this.data.portfolio) intro += `\n代表作：${this.data.portfolio}`
        if (images.length) intro += `\n代表作截图：${images.join(' ')}`
        return post('/api/v1/mp/creator/apply', {
          name: this.data.name,
          contact: this._resolveContact(),
          intro,
        }, { auth: true, showError: true })
      })
      .then(() => {
        wx.showToast({ title: '已提交，等待审核', icon: 'success' })
        this.setData({
          name: '',
          contact: '',
          intro: '',
          portfolio: '',
          portfolioImages: [],
          selectedTopicMap: {},
          selectedFormMap: {},
        })
      })
      .catch(() => {})
      .finally(() => {
        this.setData({ submitting: false })
      })
  },

  onPublishTypeTap(e) {
    if (!this.data.editorUnlocked) {
      wx.showToast({ title: '审核通过后可发布', icon: 'none' })
      return
    }
    const key = e.currentTarget.dataset.key
    const map = { article: '写长文', note: '写笔记', moment: '发动态' }
    this.setData({
      publishType: key,
      editorTitle: map[key] || '写内容',
    })
  },

  onDraftTitleInput(e) { this.setData({ draftTitle: e.detail.value }) },
  onDraftBodyInput(e) { this.setData({ draftBody: e.detail.value }) },

  onAddImages() {
    if (!this.data.editorUnlocked) return
    const remain = 9 - (this.data.draftImages || []).length
    if (remain <= 0) return
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const files = (res.tempFiles || []).map((f) => f.tempFilePath).filter(Boolean)
        this.setData({
          draftImages: (this.data.draftImages || []).concat(files).slice(0, 9),
        })
      },
    })
  },

  onRemoveImage(e) {
    if (!this.data.editorUnlocked) return
    const index = Number(e.currentTarget.dataset.index)
    const list = (this.data.draftImages || []).slice()
    list.splice(index, 1)
    this.setData({ draftImages: list })
  },

  onPickTopic() {
    if (!this.data.editorUnlocked) {
      wx.showToast({ title: '审核通过后可编辑', icon: 'none' })
      return
    }
    wx.showActionSheet({
      itemList: TOPIC_OPTIONS.map((t) => `#${t}`),
      success: (res) => {
        const picked = TOPIC_OPTIONS[res.tapIndex]
        if (!picked) return
        const cur = this.data.draftTopics || ''
        const tag = `#${picked}`
        if (cur.indexOf(tag) >= 0) return
        this.setData({
          draftTopics: cur ? `${cur} ${tag}` : tag,
        })
      },
    })
  },

  onToggleSyncPlanet() {
    if (!this.data.editorUnlocked) return
    this.setData({ syncPlanet: !this.data.syncPlanet })
  },

  onToggleMemberOnly() {
    if (!this.data.editorUnlocked) return
    this.setData({ memberOnly: !this.data.memberOnly })
  },

  onEditorCancel() {
    this.onBackToApply()
  },

  _uploadDraftImages() {
    const locals = (this.data.draftImages || []).filter(Boolean)
    if (!locals.length) return Promise.resolve([])
    return Promise.all(locals.map((filePath) => {
      if (/^https?:\/\//.test(filePath) || filePath.indexOf('/uploads/') === 0) {
        return Promise.resolve(filePath)
      }
      return upload(filePath, { name: 'file', url: '/api/v1/mp/upload' })
        .then((uploaded) => (uploaded && (uploaded.url || uploaded.fileUrl)) || '')
        .catch(() => '')
    })).then((urls) => urls.filter(Boolean))
  },

  onPublishDemo() {
    if (!this.data.editorUnlocked) {
      wx.showToast({ title: '审核通过后开放发布', icon: 'none' })
      return
    }
    if (this.data.submitting) return
    if (!this.data.draftTitle && !this.data.draftBody && !(this.data.draftImages || []).length) {
      wx.showToast({ title: '先写点内容再发布', icon: 'none' })
      return
    }
    if (!AuthUtil.requireLoginForAction('投稿发布')) return

    const tags = String(this.data.draftTopics || '')
      .split(/\s+/)
      .map((t) => t.replace(/^#/, '').trim())
      .filter(Boolean)

    this.setData({ submitting: true })
    this._uploadDraftImages()
      .then((images) => post('/api/v1/mp/creator/contents', {
        title: this.data.draftTitle || '',
        content: this.data.draftBody || '',
        contentType: this.data.publishType || 'note',
        images,
        tags,
        syncPlanet: !!this.data.syncPlanet,
        memberOnly: !!this.data.memberOnly,
      }, { auth: true, showError: true }))
      .then(() => {
        wx.showToast({ title: '已提交，等待审核', icon: 'success' })
        this.setData({
          draftTitle: '',
          draftBody: '',
          draftImages: [],
          draftTopics: '',
          stage: 1,
          editorTitle: '写笔记',
        })
      })
      .catch(() => {})
      .finally(() => {
        this.setData({ submitting: false })
      })
  },
})
