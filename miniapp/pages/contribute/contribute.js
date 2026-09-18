const { createSharePageConfig } = require('../../utils/share')
const { DEMO_CONTRIBUTE } = require('../../data/warm-demo')
const { USE_LOCAL_SOURCE, FORCE_LOCAL_DEMO } = require('../../data/warm-source')
const { post, upload, get } = require('../../utils/request')
const { AuthUtil } = require('../../utils/auth')
const { StorageUtil } = require('../../utils/storage')

const TOPIC_OPTIONS = ['书桌改造', '工位美学', '内容创业', '写作方法', '读书']
const DRAFT_KEY = 'contribute_draft_v1'
const APPLY_DRAFT_KEY = 'contribute_apply_draft_v1'

const FALLBACK_TOPICS = ['内容创业', '写作方法', '工位美学', '读书', '副业']
const FALLBACK_FORMS = ['深度长文', '图文笔记']
const FALLBACK_PUBLISH_TYPES = [
  { key: 'note', label: '图文笔记' },
  { key: 'article', label: '长文' },
  { key: 'moment', label: '星球动态' },
]

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
    applyStatus: '',
    applyStatusText: '',
    name: '',
    contact: '',
    intro: '',
    portfolio: '',
    portfolioImages: [],
    submitting: false,
    heroTitle: '成为创作者',
    heroDesc: '提交申请后由编辑部审核。通过后可在本页发布内容。',
    stats: [],
    why: [],
    topics: FALLBACK_TOPICS,
    forms: FALLBACK_FORMS,
    selectedTopicMap: {},
    selectedFormMap: {},
    publishTypes: FALLBACK_PUBLISH_TYPES,
    publishType: 'note',
    editorTitle: '写笔记',
    draftTitle: '',
    draftBody: '',
    draftImages: [],
    draftTopics: '',
    syncPlanet: true,
    memberOnly: false,
    draftSavedAt: '',
  },

  onLoad(options) {
    const metrics = getNavMetrics()
    const stage = options && Number(options.stage) === 2 ? 2 : 1
    // 生产禁止 URL 强开发布器；仅本地演示可 unlocked=1
    const unlocked = (USE_LOCAL_SOURCE || FORCE_LOCAL_DEMO)
      && !!(options && (options.unlocked === '1' || options.stage2 === '1'))
    this.setData({
      ...metrics,
      editorUnlocked: unlocked,
      stage,
      editorTitle: stage === 2 ? (unlocked ? '写笔记' : '发布器预览') : '写笔记',
    })
    this._restoreApplyDraft()
    this._restorePublishDraft()
    if (USE_LOCAL_SOURCE || FORCE_LOCAL_DEMO) {
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
        heroTitle: cfg.heroTitle || '成为创作者',
        heroDesc: cfg.heroDesc || '提交申请后由编辑部审核。通过后可在本页发布内容。',
        stats: Array.isArray(cfg.stats) ? cfg.stats : [],
        why: Array.isArray(cfg.why) ? cfg.why : [],
        topics: Array.isArray(cfg.topics) && cfg.topics.length ? cfg.topics : FALLBACK_TOPICS,
        forms: Array.isArray(cfg.forms) && cfg.forms.length ? cfg.forms : FALLBACK_FORMS,
        publishTypes: Array.isArray(cfg.publishTypes) && cfg.publishTypes.length
          ? cfg.publishTypes
          : FALLBACK_PUBLISH_TYPES,
      })
      this._checkCreatorStatus()
    }).catch(() => {
      this.setData({
        heroTitle: '成为创作者',
        heroDesc: '提交申请后由编辑部审核。通过后可在本页发布内容。',
        stats: [],
        why: [],
        topics: FALLBACK_TOPICS,
        forms: FALLBACK_FORMS,
        publishTypes: FALLBACK_PUBLISH_TYPES,
      })
      this._checkCreatorStatus()
    })
  },

  _restoreApplyDraft() {
    try {
      const d = StorageUtil.get(APPLY_DRAFT_KEY)
      if (!d || typeof d !== 'object') return
      this.setData({
        name: d.name || '',
        intro: d.intro || '',
        portfolio: d.portfolio || '',
        portfolioImages: Array.isArray(d.portfolioImages) ? d.portfolioImages : [],
        selectedTopicMap: d.selectedTopicMap || {},
        selectedFormMap: d.selectedFormMap || {},
      })
    } catch (e) { /* ignore */ }
  },

  _saveApplyDraft() {
    try {
      StorageUtil.set(APPLY_DRAFT_KEY, {
        name: this.data.name,
        intro: this.data.intro,
        portfolio: this.data.portfolio,
        portfolioImages: this.data.portfolioImages,
        selectedTopicMap: this.data.selectedTopicMap,
        selectedFormMap: this.data.selectedFormMap,
        savedAt: Date.now(),
      })
    } catch (e) { /* ignore */ }
  },

  _restorePublishDraft() {
    try {
      const d = StorageUtil.get(DRAFT_KEY)
      if (!d || typeof d !== 'object') return
      this.setData({
        draftTitle: d.draftTitle || '',
        draftBody: d.draftBody || '',
        draftImages: Array.isArray(d.draftImages) ? d.draftImages : [],
        draftTopics: d.draftTopics || '',
        publishType: d.publishType || 'note',
        syncPlanet: d.syncPlanet !== false,
        memberOnly: !!d.memberOnly,
        draftSavedAt: d.savedAt ? String(d.savedAt) : '',
      })
    } catch (e) { /* ignore */ }
  },

  _savePublishDraft() {
    try {
      const savedAt = Date.now()
      StorageUtil.set(DRAFT_KEY, {
        draftTitle: this.data.draftTitle,
        draftBody: this.data.draftBody,
        draftImages: this.data.draftImages,
        draftTopics: this.data.draftTopics,
        publishType: this.data.publishType,
        syncPlanet: this.data.syncPlanet,
        memberOnly: this.data.memberOnly,
        savedAt,
      })
      this.setData({ draftSavedAt: String(savedAt) })
    } catch (e) { /* ignore */ }
  },

  _checkCreatorStatus() {
    if (this.data.editorUnlocked) return
    if (!AuthUtil.isLoggedIn()) return
    get('/api/v1/mp/creator/me', {}, { auth: true, showError: false })
      .then((res) => {
        const status = String((res && (res.status || res.applyStatus || res.state)) || '').toLowerCase()
        const ok = !!(res && (res.approved || res.canPublish || status === 'approved' || status === 'passed'))
        let applyStatusText = ''
        if (ok) applyStatusText = '已通过审核，可发布内容'
        else if (status === 'pending' || status === 'reviewing' || status === 'submitted') {
          applyStatusText = '申请审核中，请耐心等待通知'
        } else if (status === 'rejected' || status === 'denied') {
          applyStatusText = '上次申请未通过，可修改后重新提交'
        }
        this.setData({
          editorUnlocked: ok,
          applyStatus: status,
          applyStatusText,
        })
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

  onNameInput(e) {
    this.setData({ name: e.detail.value })
    this._saveApplyDraft()
  },
  onIntroInput(e) {
    this.setData({ intro: e.detail.value })
    this._saveApplyDraft()
  },
  onPortfolioInput(e) {
    this.setData({ portfolio: e.detail.value })
    this._saveApplyDraft()
  },

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
    this._saveApplyDraft()
  },

  onFormTap(e) {
    const form = e.currentTarget.dataset.form
    const key = `selectedFormMap.${form}`
    this.setData({ [key]: !this.data.selectedFormMap[form] })
    this._saveApplyDraft()
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
        this._saveApplyDraft()
      },
    })
  },

  onRemovePortfolioImage(e) {
    const index = Number(e.currentTarget.dataset.index)
    const list = (this.data.portfolioImages || []).slice()
    list.splice(index, 1)
    this.setData({ portfolioImages: list })
    this._saveApplyDraft()
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

  /** 键盘收起后再 toast，避免校验/成功提示被键盘动画吞掉；不用 success 图标（文案易超 7 字不显示） */
  _toast(title) {
    const msg = String(title || '').trim() || '操作失败'
    try { wx.hideKeyboard({ complete() {} }) } catch (e) { /* ignore */ }
    setTimeout(() => {
      wx.showToast({ title: msg.slice(0, 20), icon: 'none', duration: 2500 })
    }, 80)
  },

  onSubmit() {
    if (this.data.submitting) return
    if (!AuthUtil.requireLoginForAction('创作者申请')) return

    const name = String(this.data.name || '').trim()
    const intro = String(this.data.intro || '').trim()
    const topics = Object.keys(this.data.selectedTopicMap || {}).filter((k) => this.data.selectedTopicMap[k])
    const forms = Object.keys(this.data.selectedFormMap || {}).filter((k) => this.data.selectedFormMap[k])

    if (!name) {
      this._toast('请填写笔名或昵称')
      try { wx.pageScrollTo({ scrollTop: 0, duration: 200 }) } catch (e) { /* ignore */ }
      return
    }
    if (!topics.length) {
      this._toast('请选择写作方向')
      return
    }
    if (!forms.length) {
      this._toast('请选择内容形态')
      return
    }
    if (!intro) {
      this._toast('请填写自我介绍')
      return
    }

    this.setData({ submitting: true, name, intro })
    this._uploadPortfolioImages()
      .then((images) => {
        let bodyIntro = intro
        bodyIntro += `\n方向：${topics.join('、')}`
        bodyIntro += `\n形态：${forms.join('、')}`
        if (this.data.portfolio) bodyIntro += `\n代表作：${this.data.portfolio}`
        if (images.length) bodyIntro += `\n代表作截图：${images.join(' ')}`
        return post('/api/v1/mp/creator/apply', {
          name,
          contact: this._resolveContact(),
          intro: bodyIntro,
        }, { auth: true, showError: false })
      })
      .then(() => {
        try { StorageUtil.remove(APPLY_DRAFT_KEY) } catch (e) { /* ignore */ }
        const isResubmit = this.data.applyStatus === 'pending'
          || this.data.applyStatus === 'rejected'
          || this.data.applyStatus === 'denied'
        this.setData({
          applyStatus: 'pending',
          applyStatusText: isResubmit
            ? '已重新提交，编辑部审核中，请耐心等待通知'
            : '已提交，编辑部审核中，请耐心等待通知',
          submitting: false,
        })
        this._toast(isResubmit ? '已重新提交' : '已提交，等待审核')
        try { wx.pageScrollTo({ scrollTop: 0, duration: 240 }) } catch (e) { /* ignore */ }
      })
      .catch((err) => {
        this.setData({ submitting: false })
        this._toast((err && err.message) || '提交失败，请重试')
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
    this._savePublishDraft()
  },

  onDraftTitleInput(e) {
    this.setData({ draftTitle: e.detail.value })
    this._savePublishDraft()
  },
  onDraftBodyInput(e) {
    this.setData({ draftBody: e.detail.value })
    this._savePublishDraft()
  },

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
        this._savePublishDraft()
      },
    })
  },

  onRemoveImage(e) {
    if (!this.data.editorUnlocked) return
    const index = Number(e.currentTarget.dataset.index)
    const list = (this.data.draftImages || []).slice()
    list.splice(index, 1)
    this.setData({ draftImages: list })
    this._savePublishDraft()
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
        this._savePublishDraft()
      },
    })
  },

  onToggleSyncPlanet() {
    if (!this.data.editorUnlocked) return
    this.setData({ syncPlanet: !this.data.syncPlanet })
    this._savePublishDraft()
  },

  onToggleMemberOnly() {
    if (!this.data.editorUnlocked) return
    this.setData({ memberOnly: !this.data.memberOnly })
    this._savePublishDraft()
  },

  onEditorCancel() {
    this._savePublishDraft()
    this.onBackToApply()
  },

  onGoEditor() {
    this.setData({ stage: 2, editorTitle: this.data.editorUnlocked ? '写笔记' : '发布器预览' })
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
        try { StorageUtil.remove(DRAFT_KEY) } catch (e) { /* ignore */ }
        this.setData({
          draftTitle: '',
          draftBody: '',
          draftImages: [],
          draftTopics: '',
          draftSavedAt: '',
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
