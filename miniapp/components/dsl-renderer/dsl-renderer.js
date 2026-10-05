// components/dsl-renderer/dsl-renderer.js — DSL 渲染引擎
// 接收组件 DSL 数据，根据 type 分发到对应的子组件进行渲染
const { executeAction, isImageUrl, navigatePage, parseStyle, appendNavStackStyle } = require('../../utils/render')
const { resolveNavIconUrl } = require('../../utils/nav-icon-url')
const { normalizeWarm, isWarmType, fmtTime } = require('../../utils/warm-kit')
const { resolveMediaUrl } = require('../../utils/media-url')
const { normalizeSearchProps, buildSearchStyle } = require('../../utils/search-props')
const { normalizeCategoryNavProps } = require('../../utils/category-nav-props')

/** 预处理 items，标记 icon 是否为真实图片 URL */
function processIconItems(items) {
  if (!Array.isArray(items)) return []
  return items.map(function (item) {
    const icon = resolveNavIconUrl(item.icon) || item.icon || ''
    return Object.assign({}, item, {
      icon,
      _iconIsImage: !!(icon && isImageUrl(icon)),
    })
  })
}

function buildTextStyle(fontSize, color) {
  const parts = []
  const size = Number(fontSize)
  if (size > 0) parts.push('font-size:' + (size * 2) + 'rpx')
  if (color) parts.push('color:' + color)
  return parts.join(';')
}

/** px → rpx 数值（吸顶内边距补齐用） */
function rpxOf(px) {
  const n = Number(px)
  return Number.isFinite(n) ? n * 2 : 0
}

Component({
  properties: {
    /** 组件 DSL 数据 */
    component: {
      type: Object,
      value: {},
    },
  },

  data: {
    /** 处理后的组件数据 */
    comp: null,
    /** FAQ 手风琴展开项下标，-1 = 全闭合（需求指定的状态字段） */
    faqOpenIndex: -1,
    /** 多开模式下的展开项全集；accordionMode 时长度 ≤ 1 */
    faqOpenList: [],
    /** 筛选芯片当前选中下标，-1 = 「全部」 */
    chipActiveIndex: -1,
    /** 半露横滑当前页 */
    peekActiveIndex: 0,
    /** 半露横滑 scroll-into-view 目标 id（点圆点滚动用） */
    peekScrollInto: '',
    /** 挑战营「今日是否已打卡」交互态 */
    chalCheckedToday: false,
    /** 吸顶容器是否已切 fixed */
    stickyOn: false,
    /** 吸顶占位块高度（px），吸顶前实测 */
    stickyPlaceholderH: 0,
    /** 音频条播放态 */
    audioPlaying: false,
    audioCurrent: 0,
    audioDuration: 0,
    audioSpeed: 1,
    audioPercent: 0,
    /** 已格式化的时间文本（mm:ss），wxml 直接渲染 */
    audioCurText: '0:00',
    audioDurText: '0:00',
    /** 搜索组件：占位词轮播下标 */
    searchPhIndex: 0,
    /** 搜索组件：弹窗搜索可见态与输入词 */
    popupSearchOpen: false,
    popupKeyword: '',
    /** 分类导航（双行分页）：当前页下标，用于底部指示条 */
    categoryPagerIndex: 0,
  },

  observers: {
    'component': function (component) {
      if (!component) return
      this._processComponent(component)
    },
  },

  lifetimes: {
    attached() {
      if (this.data.component) {
        this._processComponent(this.data.component)
      }
      this._startSearchPlaceholderTimer()
    },
    detached() {
      this._destroyWarmAudio()
      this._stickyObserver = null
      this._stopSearchPlaceholderTimer()
    },
  },

  pageLifetimes: {
    show() {
      this._ensureStickyObserver()
    },
  },

  methods: {
    _normalizeByType(component) {
      const type = component.type
      const props = { ...(component.props || {}) }
      const runtimeData = Array.isArray(component.runtimeData) ? component.runtimeData : []

      if (type === 'search') {
        const cfg = normalizeSearchProps(props)
        props._placeholders = cfg.placeholders
        props._placeholderInterval = cfg.placeholderInterval
        props._phText = cfg.placeholderText
        props._scopes = cfg.scopes
        props._scopeText = cfg.scopeText
        props._activityOnly = cfg.activityOnly
        props._rightAction = cfg.rightAction
        props._rightActionText = cfg.rightActionText
        props._tapTarget = cfg.tapTarget
        props._linkUrl = cfg.linkUrl
        props._shape = cfg.shape
        props._align = cfg.align
        props._textColor = cfg.textColor
        props._bgColor = cfg.bgColor
        props._borderWidth = cfg.borderWidth
        props._borderColor = cfg.borderColor
        props._sticky = cfg.sticky
        props._stickyBg = cfg.stickyBg || cfg.bgColor
        props._boxStyle = buildSearchStyle(cfg)
        // 右侧按钮底色：跟随框体底色的深色版，保证白字可读
        props._btnColor = '#ffffff'
      }

      if (type === 'category_nav') {
        // 归一化只做一次；wxml 读 `_` 前缀字段，避免散落 fallback
        const cfg = normalizeCategoryNavProps(props)
        props._title = cfg.title
        props._showTitle = cfg.showTitle
        props._layout = cfg.layout
        props._columns = cfg.columns
        props._pageSize = cfg.pageSize
        props._pageColumns = cfg.pageColumns
        props._pages = cfg.pages
        props._items = cfg.items
        props._iconShape = cfg.iconShape
        props._iconRadius = cfg.iconShape === 'none' ? 0 : cfg.iconRadius
        props._titleColor = cfg.titleColor
        props._subtitleColor = cfg.subtitleColor
        props._subtitleSize = cfg.subtitleSize
        props._surface = cfg.surface

        // 分页切片在 JS 里算好：WXML 嵌套 wx:for 会让内层 index 覆盖外层，
        // 且 item0 不是合法变量 —— 那种写法会静默不渲染。
        const groups = []
        for (let i = 0; i < cfg.pages; i += 1) {
          const slice = cfg.items.slice(i * cfg.pageSize, (i + 1) * cfg.pageSize)
          // pageKey 给稳定 key：wxml wx:key 用它做 diff
          groups.push({ pageKey: 'cnav_page_' + i, items: slice })
        }
        props._pageGroups = groups
      }

      if (type === 'activity_list' && runtimeData.length) {
        props.items = runtimeData.map((item) => ({
          title: item.name || item.title || '活动名称',
          date: item.activityDate || item.date || item.startTime || '',
          location: item.location || item.venue || '活动会场',
          cover: item.cover || item.image || item.cover_url || '',
          link_url: item.id ? `/pkg-extra/activity-detail/activity-detail?id=${item.id}` : '/pkg-extra/activity-list/activity-list',
        }))
      }

      if (type === 'activity_list') {
        const limit = Math.max(Number(props.limit) || 4, 1)
        const source = Array.isArray(props.items) && props.items.length
          ? props.items
          : [
              { title: '品牌开放日沙龙', date: '2026-05-20 10:00', location: '品牌中心', cover: '', link_url: '' },
              { title: '药食同源研学活动', date: '2026-05-24 14:00', location: '展会中心', cover: '', link_url: '' },
            ]
        props.items = source.slice(0, limit)
        props._sectionTitleStyle = buildTextStyle(props.section_title_font_size || 15)
        props._showButton = props.show_button !== false
        props._buttonText = props.button_text || '报名'

        // 背景层直角；圆角只作用在内层大卡片
        const rawStyle = component.style || {}
        const shellStyle = { ...rawStyle }
        delete shellStyle.border_radius
        const radius = rawStyle.border_radius
        props._shellStyle = parseStyle(shellStyle)
        props._cardStyle = parseStyle({
          border_radius: radius === undefined || radius === null ? 10 : Number(radius),
        })
      }

      if (type === 'appointment_service' && runtimeData.length) {
        props.services = runtimeData.map((item) => ({
          name: item.name || '预约服务',
          desc: item.description || item.desc || '在线预约服务',
          button_text: item.button_text || item.buttonText || '立即预约',
          link_url: item.id
            ? `/pkg-trade/appointment-calendar/appointment-calendar?serviceId=${item.id}`
            : (item.link_url || item.linkUrl || '/pkg-user/appointment-list/appointment-list'),
        }))
      }

      if (type === 'appointment_service') {
        const source = Array.isArray(props.services) && props.services.length
          ? props.services
          : [
              { name: '专家咨询', desc: '一对一咨询服务', button_text: '立即预约', link_url: '' },
              { name: '到店体验', desc: '门店体验预约', button_text: '立即预约', link_url: '' },
            ]
        props.services = source.map((item) => ({
          name: item.name || '服务名称',
          desc: item.desc || item.description || '服务说明',
          button_text: item.button_text || '立即预约',
          link_url: item.link_url || '/pkg-user/appointment-list/appointment-list',
        }))
        props._sectionTitleStyle = buildTextStyle(props.section_title_font_size || 15)

        const rawStyle = component.style || {}
        const shellStyle = { ...rawStyle }
        delete shellStyle.border_radius
        const radius = rawStyle.border_radius
        props._shellStyle = parseStyle(shellStyle)
        props._cardStyle = parseStyle({
          border_radius: radius === undefined || radius === null ? 10 : Number(radius),
        })
      }

      if (type === 'contact_info') {
        const layoutRaw = String(props.layout || 'list')
        props._layout = ['list', 'row', 'grid'].includes(layoutRaw) ? layoutRaw : 'list'
        const styleRaw = String(props.style || 'card')
        props._styleType = ['card', 'list', 'minimal'].includes(styleRaw) ? styleRaw : 'card'
        props._align = props.align === 'center' ? 'center' : 'left'
        props._showIcons = props.show_icons !== false
        props._titleStyle = buildTextStyle(props.title_font_size || 14)
        props._subtitleStyle = buildTextStyle(props.subtitle_font_size || 12)

        const phone = String(props.phone || '').trim()
        const address = String(props.address || '').trim()
        const serviceTime = String(props.service_time || '').trim()
        const items = []
        if (props.show_phone !== false) {
          items.push({ key: 'phone', icon: '☎', text: phone || '未设置电话', raw: phone })
        }
        if (props.show_address !== false) {
          items.push({ key: 'address', icon: '📍', text: address || '未设置地址', raw: '' })
        }
        if (props.show_service_time !== false) {
          items.push({ key: 'time', icon: '🕘', text: serviceTime || '未设置营业时间', raw: '' })
        }
        props._items = items

        const rawStyle = component.style || {}
        const shellStyle = { ...rawStyle }
        delete shellStyle.border_radius
        const radius = rawStyle.border_radius
        props._shellStyle = parseStyle(shellStyle)
        props._cardStyle = props._styleType === 'card'
          ? parseStyle({
              border_radius: radius === undefined || radius === null ? 10 : Number(radius),
            })
          : ''
      }

      if (type === 'ai_entry') {
        const themeRaw = String(props.theme || 'gold')
        props._theme = ['blue', 'green', 'purple', 'dark', 'gold'].includes(themeRaw) ? themeRaw : 'gold'
        props._titleStyle = buildTextStyle(props.title_font_size || 15)
        props._descStyle = buildTextStyle(props.desc_font_size || 12)

        const rawStyle = component.style || {}
        const shellStyle = { ...rawStyle }
        delete shellStyle.border_radius
        const radius = rawStyle.border_radius
        props._shellStyle = parseStyle(shellStyle)
        props._cardStyle = parseStyle({
          border_radius: radius === undefined || radius === null ? 10 : Number(radius),
        })
      }

      if (type === 'form_entry') {
        const formId = String(props.formId || props.formTemplateId || '').trim()
        props._formLink = formId ? `/pkg-extra/form/form?id=${formId}` : ''
        props._buttonText = props.button_text || props.buttonText || '立即填写'
        const styleRaw = String(props.style || 'card')
        props._styleType = ['card', 'list', 'minimal'].includes(styleRaw) ? styleRaw : 'card'
        const sub = String(props.subtitle || '').trim()
        const name = String(props.form_name || '').trim()
        props._subtitleText = sub || name || ''
        props._titleStyle = buildTextStyle(props.title_font_size || 14)
        props._subtitleStyle = buildTextStyle(props.subtitle_font_size || 11)

        const rawStyle = component.style || {}
        const shellStyle = { ...rawStyle }
        delete shellStyle.border_radius
        const radius = rawStyle.border_radius
        props._shellStyle = parseStyle(shellStyle)
        props._cardStyle = props._styleType === 'card'
          ? parseStyle({
              border_radius: radius === undefined || radius === null ? 10 : Number(radius),
            })
          : ''
      }

      // 列表类：外层不要白底大框/圆角，条目各自成卡
      if (type === 'product_list' || type === 'article_list' || type === 'article_feed' || type === 'note_feed' || type === 'hot_news' || type === 'flash_sale') {
        const rawStyle = component.style || {}
        const shellStyle = { ...rawStyle }
        delete shellStyle.border_radius
        delete shellStyle.background_color
        if (type === 'product_list') {
          const radius = rawStyle.border_radius
          if (props.item_border_radius === undefined || props.item_border_radius === null || props.item_border_radius === '') {
            props.item_border_radius = radius === undefined || radius === null ? 12 : Number(radius)
          }
        }
        if (type === 'article_list' || type === 'article_feed' || type === 'note_feed' || type === 'hot_news') {
          const radius = rawStyle.border_radius
          if (props.item_border_radius === undefined || props.item_border_radius === null || props.item_border_radius === '') {
            props.item_border_radius = radius === undefined || radius === null ? 12 : Number(radius)
          }
        }
        component.style = shellStyle
        component.styleString = parseStyle(shellStyle)
      }

      if (type === 'brand_header') {
        const rawStyle = component.style || {}
        const shellStyle = { ...rawStyle }
        delete shellStyle.margin_top
        delete shellStyle.margin_left
        delete shellStyle.margin_right
        delete shellStyle.margin_bottom
        delete shellStyle.border_radius
        delete shellStyle.background_color
        component.style = shellStyle
        component.styleString = parseStyle(shellStyle)
      }

      if (type === 'join_group') {
        const rawStyle = component.style || {}
        const shellStyle = { ...rawStyle }
        delete shellStyle.border_radius
        const radius = rawStyle.border_radius ?? props.card_radius
        props._cardStyle = parseStyle({
          border_radius: radius === undefined || radius === null ? 12 : Number(radius),
        })
        component.style = shellStyle
        component.styleString = parseStyle(shellStyle)
      }

      if (type === 'member_card') {
        const rawStyle = component.style || {}
        const shellStyle = { ...rawStyle }
        // 背景色/文字色/圆角作用在卡面，外壳只保留边距等，避免垫色露边
        delete shellStyle.border_radius
        delete shellStyle.background_color
        delete shellStyle.text_color
        delete shellStyle.color
        props._shellStyle = parseStyle(shellStyle)
        props._styleTextColor = rawStyle.text_color || rawStyle.color || ''
        props._styleBgColor = rawStyle.background_color || ''
        if (rawStyle.border_radius !== undefined && rawStyle.border_radius !== null) {
          props.border_radius = rawStyle.border_radius
        }
      }

      if (type === 'notice_bar' && runtimeData.length) {
        props.items = runtimeData.map((item) => item.name || item.title || '').filter(Boolean).slice(0, 5)
      }

      if (type === 'category_nav' && runtimeData.length) {
        props.items = processIconItems(runtimeData.slice(0, 10).map((item, index) => ({
          icon: item.icon || '📌',
          title: item.name || item.title || `分类${index + 1}`,
          link_url: item.linkUrl || item.link_url || '/pkg-trade/category/category',
          link_type: 'page',
        })))
      }

      // 也预处理 DSL 中自带的 items
      if (type === 'category_nav' && Array.isArray(props.items) && !runtimeData.length) {
        props.items = processIconItems(props.items)
      }

      if (type === 'section_title') {
        const clampPad = (v, fallback) => {
          const n = Number(v)
          return Number.isFinite(n) ? Math.max(0, Math.min(n, 48)) : fallback
        }
        const padTop = clampPad(props.padding_top, 4)
        const padBottom = clampPad(props.padding_bottom, 8)
        props._titleStyle = [
          buildTextStyle(props.title_font_size || 16, props.title_color || '#172033'),
          props.title_bold === false ? 'font-weight:400' : 'font-weight:800',
        ].filter(Boolean).join(';')
        props._subtitleStyle = buildTextStyle(props.subtitle_font_size || 11, props.subtitle_color || '#7b8798')
        props.show_more = props.show_more === true
        props.more_text = String(props.more_text || '查看更多>').trim() || '查看更多>'
        props._moreStyle = buildTextStyle(12, props.more_color || '#7b8798')
        props._innerPaddingStyle = 'padding-top:' + (padTop * 2) + 'rpx;padding-bottom:' + (padBottom * 2) + 'rpx'
      }

      if (type === 'activity_list' || type === 'appointment_service' || type === 'contact_info' || type === 'image_text' || type === 'brand_intro' || type === 'flash_sale' || type === 'certificate') {
        const titleDefault = (type === 'activity_list' || type === 'appointment_service') ? 12 : 13
        const subtitleDefault = (type === 'activity_list' || type === 'appointment_service') ? (type === 'activity_list' ? 10 : 11) : 11
        props._titleStyle = buildTextStyle(props.title_font_size || titleDefault)
        props._subtitleStyle = buildTextStyle(props.subtitle_font_size || subtitleDefault)
        if (type === 'brand_intro') {
          props._descStyle = buildTextStyle(props.desc_font_size || 12)
          const logoPos = props.logo_position === 'left' || props.logo_position === 'right' ? props.logo_position : 'top'
          const align = props.content_align === 'center' || props.content_align === 'right' ? props.content_align : 'left'
          const logoSize = Math.max(Number(props.logo_size) || 48, 24)
          const logoX = Number(props.logo_offset_x) || 0
          const logoY = Number(props.logo_offset_y) || 0
          const textX = Number(props.text_offset_x) || 0
          const textY = Number(props.text_offset_y) || 0
          props._layoutClass = 'dsl-brand--logo-' + logoPos + ' dsl-brand--align-' + align
          props._logoStyle = 'width:' + (logoSize * 2) + 'rpx;height:' + (logoSize * 2) + 'rpx;transform:translate(' + (logoX * 2) + 'rpx,' + (logoY * 2) + 'rpx);'
          props._textWrapStyle = 'transform:translate(' + (textX * 2) + 'rpx,' + (textY * 2) + 'rpx);'
        }
        if (type === 'certificate') {
          props._columns = Number(props.columns) === 3 ? 3 : 2
        }
      }

      // 暖调装修器 22 个新组件：字段兜底 + 派生字段全部交给 utils/warm-kit
      // 非暖调 type 原样穿透，不干扰既有 40+ 组件
      if (isWarmType(type)) {
        Object.assign(props, normalizeWarm(type, props))
        // 暖调组件的根卡片不吃外层 style 的背景/圆角（背景由 _bg 统一给）
        // 只保留外边距，避免运营设的底色把纸感卡片压掉
        const warmShell = { ...(component.style || {}) }
        delete warmShell.background_color
        delete warmShell.border_radius
        component.style = warmShell
        component.styleString = parseStyle(warmShell)

        if (type === 'layout_sticky_wrapper') {
          // position:fixed 会脱离文档流、左右撑满视口，把外壳左右外边距补成内边距，
          // 否则吸顶后卡片比吸顶前宽出一截
          const ml = Number(warmShell.margin_left) || 0
          const mr = Number(warmShell.margin_right) || 0
          props._fixPadStyle = 'padding-left:' + rpxOf(ml) + 'rpx;padding-right:' + rpxOf(mr) + 'rpx'
          props._fixTop = props._top
          props._fixZ = props._z
        }
        if (type === 'layout_flexible_grid') {
          // 比例栅格：把 children 按位置塞进对应格子，多出来的并入最后一格
          const cells = Array.isArray(props._cells) ? props._cells : []
          const kids = Array.isArray(component.children) ? component.children : []
          cells.forEach((c, i) => {
            c.children = i < kids.length ? [kids[i]] : []
          })
          if (kids.length > cells.length && cells.length) {
            cells[cells.length - 1].children = kids.slice(cells.length - 1)
          }
          props._cells = cells
        }
      }

      return {
        ...component,
        props,
      }
    },

    /** 处理组件数据 */
    _processComponent(component) {
      const normalized = this._normalizeByType(component)
      let styleString = normalized.styleString || parseStyle(normalized.style || component.style || {})
      if (normalized.type === 'nav' || normalized.type === 'product_list' || normalized.type === 'hot_news') {
        styleString = appendNavStackStyle(styleString)
      }
      if (normalized.type === 'image') {
        const raw = normalized.style || component.style || {}
        const radius = raw.border_radius
        const r = radius === undefined || radius === null || radius === ''
          ? 0
          : Number(radius)
        const radiusCss = `border-radius:${(Number.isFinite(r) ? r : 0) * 2}rpx;overflow:hidden`
        styleString = styleString ? `${styleString};${radiusCss}` : radiusCss
      }
      // 搜索组件：框体样式由 props 决定（圆角/底色/边框/对齐/吸顶），
      // 通用 styleString 只剩外边距 —— 两者拼起来，props 的视觉优先级更高。
      if (normalized.type === 'search') {
        styleString = [styleString, normalized.props && normalized.props._boxStyle]
          .filter(Boolean)
          .join(';')
      }
      this.setData({
        comp: {
          ...normalized,
          props: normalized.props || {},
          actions: normalized.actions || [],
          styleString,
          runtimeData: normalized.runtimeData || [],
        },
      })
      this._syncWarmState(normalized)
      if (normalized.type === 'search') {
        this._syncSearchPlaceholder()
        this._startSearchPlaceholderTimer()
        // 组件被替换/隐藏时收起弹窗，避免残留遮罩挡住整页
        if (this.data.popupSearchOpen && !(normalized.props && normalized.props._visible !== false)) {
          this.setData({ popupSearchOpen: false, popupKeyword: '' })
        }
      }
      if (normalized.type === 'layout_sticky_wrapper') {
        // 等 DOM 落地后再挂观察者
        this._stickyObserver = null
        setTimeout(() => this._ensureStickyObserver(), 0)
      }
    },

    /* ---------------- 搜索组件：占位词轮播 ---------------- */

    /**
     * 把归一化后的搜索配置摊进 props（wxml 直接读 `comp.props._xxx`）。
     * 🔴 归一化只在 _normalizeByType 里做一次，这里只做「摊平 + 起轮播」，
     *    避免 wxml 里写一堆 fallback 判断。
     */
    _syncSearchPlaceholder() {
      const props = (this.data.comp && this.data.comp.props) || {}
      const list = Array.isArray(props._placeholders) ? props._placeholders : []
      if (!list.length) return
      let idx = Number(this.data.searchPhIndex) || 0
      if (idx >= list.length) idx = 0
      if (idx !== this.data.searchPhIndex) this.setData({ searchPhIndex: idx })
      this.setData({ 'comp.props._phText': list[idx] })
    },

    _startSearchPlaceholderTimer() {
      this._stopSearchPlaceholderTimer()
      const props = (this.data.comp && this.data.comp.props) || {}
      const list = Array.isArray(props._placeholders) ? props._placeholders : []
      if (list.length <= 1) return
      // 间隔兜底 ≥1s：运营若把值清空成 0，setInterval(0) 会疯狂切换
      const seconds = Math.max(1, Number(props._placeholderInterval) || 3)
      const self = this
      this._searchPhTimer = setInterval(function () {
        if (!self.data.comp || (self.data.comp.props || {})._shape === undefined) {
          self._stopSearchPlaceholderTimer()
          return
        }
        const total = ((self.data.comp.props || {})._placeholders || []).length
        if (total <= 1) {
          self._stopSearchPlaceholderTimer()
          return
        }
        self.setData({ searchPhIndex: (Number(self.data.searchPhIndex) + 1) % total })
        self._syncSearchPlaceholder()
      }, seconds * 1000)
    },

    _stopSearchPlaceholderTimer() {
      if (this._searchPhTimer) {
        clearInterval(this._searchPhTimer)
        this._searchPhTimer = null
      }
    },

    /**
     * 暖调组件的交互态按 type 初始化。
     * 组件复用（同一 dsl-renderer 实例渲染不同 type）时必须重置，
     * 否则 FAQ 展开态会串到别的组件上。
     */
    _syncWarmState(normalized) {
      if (!isWarmType(normalized.type)) return
      const p = normalized.props || {}
      const patch = {}
      if (normalized.type === 'content_faq_accordion') {
        const d = p._defaultOpen
        patch.faqOpenIndex = d
        patch.faqOpenList = d >= 0 ? [d] : []
      }
      if (normalized.type === 'h_filter_chips') {
        const n = Number(p.activeIndex)
        patch.chipActiveIndex = Number.isFinite(n) && n >= -1 ? Math.trunc(n) : 0
      }
      if (normalized.type === 'h_peek_carousel') {
        patch.peekActiveIndex = 0
        patch.peekScrollInto = ''
      }
      if (normalized.type === 'planet_challenge_card') {
        patch.chalCheckedToday = false
      }
      if (normalized.type === 'layout_sticky_wrapper') {
        patch.stickyOn = false
        patch.stickyPlaceholderH = 0
      }
      if (normalized.type === 'content_mini_audio') {
        patch.audioPlaying = false
        patch.audioCurrent = 0
        patch.audioDuration = p._duration || 0
        patch.audioSpeed = p._speed || 1
        patch.audioPercent = 0
        patch.audioCurText = '0:00'
        patch.audioDurText = fmtTime(p._duration || 0)
        this._destroyWarmAudio()
      }
      if (Object.keys(patch).length) this.setData(patch)
    },

    /** 组件事件冒泡 */
    onComponentEvent(e) {
      this.triggerEvent('componentevent', e.detail || {})
    },

    /** 通用动作执行 */
    onExecuteAction(e) {
      const action = e.currentTarget.dataset.action
      if (action) {
        executeAction(action)
      }
    },

    /* ================================================================
     * 暖调 22 组件的交互方法
     * 所有可点区域在 wxml 里用 catchtap，避免冒泡到导航拦截
     * ================================================================ */

    /* ---------- content_faq_accordion 手风琴 ----------
     * 动效：wxss 里直接切 height/opacity（小程序对 grid-template-rows 0fr 支持不稳）
     * 状态：faqOpenIndex 为「当前展开项」，-1 = 全闭合（需求指定字段）；
     *      多开模式（accordionMode=false）用 faqOpenList 承载全集，
     *      faqOpenIndex 始终指向其中最后一项，wxml 以 faqOpenList 判定展开。 */
    onWarmFaqToggle(e) {
      const i = Number(e.currentTarget.dataset.i)
      if (!Number.isFinite(i)) return
      const p = (this.data.comp && this.data.comp.props) || {}
      const list = Array.isArray(this.data.faqOpenList) ? this.data.faqOpenList.slice() : []
      const at = list.indexOf(i)
      if (p.accordionMode) {
        // 手风琴模式：只留一项
        this.setData({ faqOpenList: at >= 0 ? [] : [i], faqOpenIndex: at >= 0 ? -1 : i })
        return
      }
      if (at >= 0) list.splice(at, 1)
      else list.push(i)
      list.sort((a, b) => a - b)
      this.setData({ faqOpenList: list, faqOpenIndex: list.length ? list[list.length - 1] : -1 })
    },

    onWarmFaqToggleAll() {
      const p = (this.data.comp && this.data.comp.props) || {}
      const items = Array.isArray(p._items) ? p._items : []
      if (!items.length) return
      const all = Array.isArray(this.data.faqOpenList) ? this.data.faqOpenList : []
      if (all.length >= items.length) {
        this.setData({ faqOpenList: [], faqOpenIndex: -1 })
        return
      }
      const next = items.map((it, i) => i)
      this.setData({ faqOpenList: next, faqOpenIndex: next[next.length - 1] })
    },

    /* ---------- h_filter_chips 筛选芯片 ---------- */
    onWarmChipSelect(e) {
      const i = Number(e.currentTarget.dataset.i)
      if (!Number.isFinite(i)) return
      this.setData({ chipActiveIndex: i })
    },

    /* ---------- h_peek_carousel 半露横滑 ---------- */
    onWarmPeekScroll(e) {
      const p = (this.data.comp && this.data.comp.props) || {}
      const cards = Array.isArray(p._items) ? p._items : []
      if (!cards.length) return
      // scrollLeft 单位是 px，步长 = 卡宽(px) + 间距(px)，由归一化层算好
      const step = Number(p._cardStep) || 0
      if (step <= 0) return
      const idx = Math.round((Number(e.detail && e.detail.scrollLeft) || 0) / step)
      const next = Math.min(cards.length - 1, Math.max(0, idx))
      if (next !== this.data.peekActiveIndex) {
        this.setData({ peekActiveIndex: next, peekScrollInto: '' })
      }
    },

    /** 点击圆点：靠 scroll-into-view 滚到对应卡片（小程序 scroll-view 不支持 scrollTo） */
    onWarmPeekDot(e) {
      const i = Number(e.currentTarget.dataset.i)
      const id = e.currentTarget.dataset.id
      if (!Number.isFinite(i)) return
      // 先清空再赋值，保证连续点同一个圆点也能重新触发滚动
      this.setData({ peekActiveIndex: i, peekScrollInto: '' }, () => {
        if (id) this.setData({ peekScrollInto: id })
      })
    },

    /* ---------- planet_challenge_card 打卡 ---------- */
    onWarmChallengeToggle() {
      const next = !this.data.chalCheckedToday
      this.setData({ chalCheckedToday: next })
      wx.showToast({ title: next ? '打卡成功' : '已取消打卡', icon: 'none' })
    },

    /* ---------- op_smart_group_card 复制客服微信 ---------- */
    onWarmCopyWechat() {
      const p = (this.data.comp && this.data.comp.props) || {}
      const wxid = p.fallbackWechat || ''
      if (!wxid) {
        wx.showToast({ title: '暂未配置客服微信', icon: 'none' })
        return
      }
      wx.setClipboardData({
        data: wxid,
        success: () => wx.showToast({ title: '微信号已复制', icon: 'none' }),
        fail: () => wx.showToast({ title: '复制失败', icon: 'none' }),
      })
    },

    /* ---------- op_gated_download_card 门控下载 ---------- */
    onWarmGateInput(e) {
      const field = e.currentTarget.dataset.field || ''
      if (!field) return
      this._gateLead = this._gateLead || {}
      this._gateLead[field] = e.detail.value
    },

    onWarmGateSubmit() {
      const p = (this.data.comp && this.data.comp.props) || {}
      const lead = this._gateLead || {}
      if (p._isLead) {
        if (p._showName && !String(lead.name || '').trim()) {
          wx.showToast({ title: '请填写姓名', icon: 'none' })
          return
        }
        if (!/^1\d{10}$/.test(String(lead.phone || '').trim())) {
          wx.showToast({ title: '请填写正确手机号', icon: 'none' })
          return
        }
      }
      wx.showToast({ title: '已解锁，正在跳转', icon: 'none' })
    },

    /* ---------- content_mini_audio 音频条 ----------
     * 用 wx.createInnerAudioContext（参考 components/dsl-audio），
     * 比 <audio> 组件好控：倍速走 playbackRate，进度走 onTimeUpdate */
    _ensureWarmAudio() {
      if (this._warmAudio) return this._warmAudio
      const p = (this.data.comp && this.data.comp.props) || {}
      const src = resolveMediaUrl(p.audioUrl || '')
      const audio = wx.createInnerAudioContext()
      this._warmAudio = audio
      this._warmAudioTotal = p._duration || 0

      audio.onTimeUpdate(() => {
        const cur = audio.currentTime || 0
        // 真实 duration 优先；拿不到时回落到运营配置的 duration
        const dur = audio.duration || this._warmAudioTotal || 0
        const percent = dur > 0 ? Math.min(100, Math.max(0, (cur / dur) * 100)) : 0
        this.setData({
          audioPlaying: true,
          audioCurrent: cur,
          audioDuration: dur,
          audioPercent: percent,
          audioCurText: fmtTime(cur),
          audioDurText: fmtTime(dur),
        })
      })
      audio.onPlay(() => this.setData({ audioPlaying: true }))
      audio.onPause(() => this.setData({ audioPlaying: false }))
      audio.onStop(() => this.setData({ audioPlaying: false }))
      audio.onEnded(() => {
        this.setData({ audioPlaying: false, audioCurrent: 0, audioPercent: 0, audioCurText: '0:00' })
      })
      audio.onError(() => {
        this.setData({ audioPlaying: false })
        wx.showToast({ title: '音频加载失败', icon: 'none' })
      })
      if (src) audio.src = src
      return audio
    },

    _destroyWarmAudio() {
      if (this._warmAudio) {
        try { this._warmAudio.destroy() } catch (e) { /* ignore */ }
        this._warmAudio = null
      }
    },

    onWarmAudioToggle() {
      const p = (this.data.comp && this.data.comp.props) || {}
      if (!p.audioUrl) {
        wx.showToast({ title: '暂未配置音频地址', icon: 'none' })
        return
      }
      const audio = this._ensureWarmAudio()
      if (this.data.audioPlaying) {
        audio.pause()
      } else {
        const dur = this.data.audioDuration || p._duration || 0
        if (dur > 0 && this.data.audioCurrent >= dur) audio.seek(0)
        audio.playbackRate = Number(this.data.audioSpeed) || 1
        audio.play()
      }
    },

    /** 倍速循环：0.75 → 1 → 1.25 → 1.5 → 2 → 0.75 */
    onWarmAudioSpeed() {
      const p = (this.data.comp && this.data.comp.props) || {}
      const list = Array.isArray(p._speeds) && p._speeds.length ? p._speeds : [1]
      const cur = Number(this.data.audioSpeed) || 1
      const i = list.indexOf(cur)
      const next = list[(i + 1) % list.length]
      this.setData({ audioSpeed: next })
      if (this._warmAudio) {
        try { this._warmAudio.playbackRate = next } catch (e) { /* ignore */ }
      }
    },

    /** 进度条点击 seek：用 catchtap 的 clientX 换算比例 */
    onWarmAudioSeek(e) {
      const p = (this.data.comp && this.data.comp.props) || {}
      if (!p.audioUrl) {
        wx.showToast({ title: '暂未配置音频地址', icon: 'none' })
        return
      }
      const audio = this._ensureWarmAudio()
      const dur = this.data.audioDuration || p._duration || 0
      if (dur <= 0) return
      const touch = (e.detail && e.detail.x !== undefined)
        ? { x: e.detail.x }
        : (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0]) || null
      if (!touch) return
      // 组件内相对坐标 → 视口坐标：借 _trackRect 缓存的轨道位置换算
      const rect = this._trackRect
      const trackW = rect && rect.width ? rect.width : 0
      const localX = touch.clientX !== undefined && rect ? touch.clientX - rect.left : touch.x
      if (!trackW || localX === undefined) return
      const ratio = Math.min(1, Math.max(0, localX / trackW))
      const target = Math.round(ratio * dur)
      try { audio.seek(target) } catch (err) { /* ignore */ }
      this.setData({
        audioCurrent: target,
        audioPercent: ratio * 100,
        audioCurText: fmtTime(target),
      })
    },

    /** 记录进度条位置，供 seek 换算（bindtouchstart 时调用） */
    onWarmAudioTrackStart() {
      const q = wx.createSelectorQuery().in(this)
      q.select('.wk-audio__track')
        .boundingClientRect((rect) => {
          this._trackRect = rect || null
        })
        .exec()
    },

    /* ---------- layout_sticky_wrapper 吸顶 ----------
     * ⚠️ 小程序不支持 CSS position:sticky（基础库 2.10 以下完全不支持）。
     * 方案：用 IntersectionObserver 观测组件内一个 1rpx 哨兵，
     * 哨兵随页面滚出视口上边界时（本组件即到达阈值）切 position:fixed，
     * 同时保留等高占位块，避免下方内容跳位。
     * 限制：占位块高度取「吸顶前实测高度」，若容器内子组件在吸顶后
     * 改变高度（如音频条加载后换行），占位不会跟着变，需要重新进入非吸顶态才刷新。 */
    _ensureStickyObserver() {
      if (this._stickyObserver) return
      const comp = this.data.comp
      if (!comp || comp.type !== 'layout_sticky_wrapper' || !comp.props.enabled) return
      try {
        const observer = this.createIntersectionObserver({ thresholds: [0, 0.01, 0.5, 1] })
        observer.relativeToViewport({ top: -(comp.props.stickyTop || 0) }).observe('.wk-stick__sentinel', (res) => {
          const on = !(res.intersectionRatio > 0)
          if (on !== this.data.stickyOn) {
            if (on) this._measureStickyHeight()
            this.setData({ stickyOn: on })
          }
        })
        this._stickyObserver = observer
      } catch (err) {
        // 基础库不支持 IntersectionObserver 时降级为静态容器，不做吸顶
        console.warn('[WarmKit] sticky IntersectionObserver 不可用，降级为静态:', err)
        this._stickyObserver = null
      }
    },

    /** 吸顶前实测容器高度，吸顶后作为占位块高度 */
    _measureStickyHeight() {
      wx.createSelectorQuery().in(this)
        .select('.wk-stick__inner')
        .boundingClientRect((rect) => {
          const h = rect && rect.height ? rect.height : 0
          if (h > 0) this.setData({ stickyPlaceholderH: h })
        })
        .exec()
    },

    /** 页面滚动时刷新吸顶态（宿主页面 onPageScroll 可 dispatch 进来，也可由 observer 自动驱动） */
    onWarmStickyScroll() {
      this._ensureStickyObserver()
    },

    onQuickNavigate(e) {
      const link = (e.currentTarget.dataset.link || '').trim()
      const compId = (e.currentTarget.dataset.id || (this.data.comp && this.data.comp.id) || '').toString()
      try {
        const { track } = require('../../utils/track')
        track('component_click', { componentId: compId, itemId: link, props: { link } })
      } catch (err) {}
      if (!link) return
      navigatePage(link)
    },

    onPhoneTap(e) {
      const phone = (e.currentTarget.dataset.phone || '').trim()
      if (!phone) return
      wx.makePhoneCall({ phoneNumber: phone })
    },

    noop() {},

    /**
     * 分类导航（双行分页）：横向滚动 → 底部指示条跟随。
     *
     * 页宽用 `query` 实测 scroll-view 宽度最准，拿不到时回落 windowWidth
     * （每页恰好占满一屏，windowWidth 就是正确的页宽）。
     */
    onCategoryPagerScroll(e) {
      const props = (this.data.comp && this.data.comp.props) || {}
      const pages = Number(props._pages) || 1
      if (pages <= 1) return

      const detail = (e && e.detail) || {}
      const scrollLeft = Number(detail.scrollLeft) || 0
      let pageWidth = 0
      if (this._pagerRect && this._pagerRect.width) {
        pageWidth = this._pagerRect.width
      } else {
        const sys = wx.getSystemInfoSync()
        pageWidth = Number(sys && sys.windowWidth) || 375
      }

      const index = Math.min(pages - 1, Math.max(0, Math.round(scrollLeft / pageWidth)))
      if (index === this.data.categoryPagerIndex) return
      this.setData({ categoryPagerIndex: index })
    },

    /**
     * 点击搜索框主体：按 tap_target 分流。
     *
     * 🔴 向后兼容：默认 search 模式必须保持老行为——
     *   只勾「活动」→ 活动列表页；其余 → /pages/search/search。
     *   老DSL（scope 单值）已被 normalizeSearchProps 映射成同样结果。
     */
    onSearchTap() {
      const props = (this.data.comp && this.data.comp.props) || {}
      const tapTarget = props._tapTarget || 'search'

      // 🔴 向后兼容：老 DSL 可能只有 link_url、没有 tap_target。
      //    历史上 link_url 优先级最高，这里保留该优先级，避免升级后台后老页面跳转变了。
      const legacyLink = String(props.link_url || props.linkUrl || '').trim()
      if (legacyLink && tapTarget === 'search') {
        navigatePage(legacyLink)
        return
      }

      if (tapTarget === 'popup') {
        this.setData({ popupSearchOpen: true, popupKeyword: '' })
        return
      }
      if (tapTarget === 'link') {
        const url = legacyLink || String(props._linkUrl || '').trim()
        if (url) {
          navigatePage(url)
          return
        }
        // 没配落地页不该白屏，回落到默认搜索页
        this._gotoDefaultSearch()
        return
      }
      this._gotoDefaultSearch()
    },

    /** 默认落地：只勾活动进活动列表，其余进搜索页 */
    _gotoDefaultSearch() {
      const props = (this.data.comp && this.data.comp.props) || {}
      if (props._activityOnly) {
        navigatePage('/pkg-extra/activity-list/activity-list')
        return
      }
      navigatePage('/pages/search/search')
    },

    /** 右侧动作位：搜索按钮 / 扫一扫 / 分类 */
    onSearchActionTap() {
      const props = (this.data.comp && this.data.comp.props) || {}
      const action = props._rightAction || 'none'

      if (action === 'scan') {
        try {
          wx.scanCode({
            scanType: ['qrCode', 'barCode'],
            success(res) {
              const val = (res && res.result) || ''
              if (!val) return
              wx.showToast({ title: '已识别', icon: 'none' })
              navigatePage(val)
            },
            fail() {},
          })
        } catch (e) {
          wx.showToast({ title: '当前环境不支持扫码', icon: 'none' })
        }
        return
      }

      if (action === 'category') {
        navigatePage('/pkg-content/product-list/product-list')
        return
      }

      // 默认 = 搜索按钮：与点框体一致，走落地目标
      this.onSearchTap()
    },

    closePopupSearch() {
      this.setData({ popupSearchOpen: false })
    },

    onPopupKeywordInput(e) {
      this.setData({ popupKeyword: (e && e.detail && e.detail.value) || '' })
    },

    doPopupSearch() {
      const kw = String(this.data.popupKeyword || '').trim()
      if (!kw) {
        wx.showToast({ title: '请输入关键词', icon: 'none' })
        return
      }
      this.setData({ popupSearchOpen: false })
      navigatePage(`/pages/search/search?q=${encodeURIComponent(kw)}`)
    },

    onAiEntryTap() {
      wx.navigateTo({
        url: '/pkg-user/service-chat/service-chat',
        fail: () => {},
      })
    },

    onHotspotTap(e) {
      const link = (e.currentTarget.dataset.url || '').trim()
      this._goLink(link, 'hotspot')
    },

    onCubeTap(e) {
      const link = String((e.detail && e.detail.url) || '').trim()
      this._goLink(link, 'cube')
    },

    _goLink(link, type) {
      try {
        const { track } = require('../../utils/track')
        track('component_click', {
          componentId: (this.data.comp && this.data.comp.id) || type,
          itemId: link,
          props: { type },
        })
      } catch (err) {}
      if (!link) return
      navigatePage(link)
    },

    /** RENDER-PARITY：组件内 SelectorQuery，穿透自定义组件边界 */
    paritySnapshot() {
      return new Promise((resolve) => {
        const q = wx.createSelectorQuery().in(this)
        q.select('.dsl-renderer').boundingClientRect()
        q.selectAll('.dsl-renderer text').fields({ text: true })
        q.selectAll('.dsl-renderer view').fields({ text: true })
        q.selectAll('.dsl-renderer image').boundingClientRect()
        q.selectAll('.dsl-renderer button').boundingClientRect()
        q.exec((res) => {
          const rect = (res && res[0]) || {}
          const textNodes = []
          ;[(res && res[1]) || [], (res && res[2]) || []].forEach((arr) => {
            if (!Array.isArray(arr)) return
            arr.forEach((n) => {
              if (n && n.text) textNodes.push(String(n.text))
            })
          })
          const rawText = textNodes.join(' ')
          const text = rawText.replace(/\s+/g, ' ').trim()
          const imgs = Array.isArray(res[3]) ? res[3].length : 0
          const buttons = Array.isArray(res[4]) ? res[4].length : 0
          const height = rect.height != null ? rect.height : 0
          resolve({
            textLen: text.length,
            imgs,
            buttons,
            visible: height > 2,
            sample: text.slice(0, 48),
          })
        })
      })
    },
  },
})
