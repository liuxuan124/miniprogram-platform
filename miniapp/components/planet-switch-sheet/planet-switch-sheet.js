// components/planet-switch-sheet — 切换主星球半屏
// 替代原先 hero/动态流/首页「切换」跳 planet-list 的做法：就地切换，不跳页、保留滚动位置。
// 已加入的排在上、未加入的排在下；点已加入的即时 PUT /planet/main 并 triggerEvent('change')，
// 由宿主刷新自己的数据源（⚠️ 三处宿主都要实现刷新，否则会出现「Tab 已切、首页没切」）。
const PlanetService = require('../../services/planet')
const { AuthUtil } = require('../../utils/auth')

Component({
  properties: {
    /** 受控显示；宿主也可直接调 this.selectComponent('#x').show() */
    show: { type: Boolean, value: false },
    /** 宿主已有的主星球 id；不传则组件自己读缓存/接口 */
    currentId: { type: String, value: '' },
  },

  data: {
    loading: false,
    loadError: false,
    /** 已加入的（当前主星球排最前） */
    joinedList: [],
    /** 还可以加入的 */
    otherList: [],
    currentPlanetId: '',
    settingId: '',
  },

  lifetimes: {
    attached() {},
  },

  observers: {
    show(v) {
      if (v) this._load()
    },
  },

  methods: {
    noop() {},

    /** 供宿主直接调起（宿主内部维护 show 状态时用） */
    open() {
      this.setData({ show: true })
      this._load()
    },

    close() {
      this.setData({ show: false, settingId: '' })
      this.triggerEvent('close')
    },

    _load() {
      this.setData({ loading: true, loadError: false })
      const tasks = [
        PlanetService.getPlanetCommunities().catch(() => null),
        PlanetService.getMainPlanet().catch(() => null),
      ]
      return Promise.all(tasks).then(([rows, main]) => {
        const list = PlanetService.normalizeCommunities(rows)
        const currentPlanetId = (this.data.currentId && String(this.data.currentId))
          || (main && main.planetId)
          || PlanetService.getCachedMainPlanetId()
          || (list.find((c) => c.primary) || list[0] || {}).id
          || ''
        // ⚠️ joined 字段在后端未升级时可能是 undefined，一律按「已加入」处理不了——
        //    没给明确 false 就当已加入，避免把用户已买的星球显示成「可加入」而引导重复购买
        const joinedList = []
        const otherList = []
        list.forEach((c) => {
          const item = Object.assign({}, c, { isCurrent: String(c.id) === String(currentPlanetId) })
          if (c.joined === false || c.joined === 'false') otherList.push(item)
          else joinedList.push(item)
        })
        joinedList.sort((a, b) => (a.isCurrent ? -1 : (b.isCurrent ? 1 : 0)))
        this.setData({
          joinedList,
          otherList,
          currentPlanetId,
          loading: false,
          loadError: !rows,
        })
      }).catch(() => {
        this.setData({ loading: false, loadError: true, joinedList: [], otherList: [] })
      })
    },

    onRetry() {
      this._load()
    },

    onPick(e) {
      const { id, joined } = e.currentTarget.dataset || {}
      if (!id || this.data.settingId) return
      if (String(id) === String(this.data.currentPlanetId)) {
        wx.showToast({ title: '当前已是这颗', icon: 'none' })
        return
      }
      // 未加入的不在这里切，进介绍页走购买流程
      if (joined === false || joined === 'false') {
        this.triggerEvent('intro', { planetId: id })
        return
      }
      if (!AuthUtil.requireLoginThen('切换主星球', () => this._applyPick(id), { silent: true })) {
        return
      }
      this._applyPick(id)
    },

    _applyPick(id) {
      this.setData({ settingId: id })
      wx.showLoading({ title: '切换中', mask: true })
      PlanetService.setMainPlanet(id).then((res) => {
        const planetId = (res && res.planetId) || id
        this.setData({ currentPlanetId: planetId, show: false, settingId: '' })
        wx.showToast({ title: '已切换', icon: 'success' })
        // 通知宿主刷新自己的数据源
        this.triggerEvent('change', { planetId })
      }).catch(() => {
        // request 已 toast
        this.setData({ settingId: '' })
      }).finally(() => {
        wx.hideLoading()
      })
    },
  },
})
