// components/dsl-renderer/dsl-renderer.js — DSL 渲染引擎
// 接收组件 DSL 数据，根据 type 分发到对应的子组件进行渲染
const { executeAction, isImageUrl, navigatePage, parseStyle, appendNavStackStyle } = require('../../utils/render')

/** 预处理 items，标记 icon 是否为真实图片 URL */
function processIconItems(items) {
  if (!Array.isArray(items)) return []
  return items.map(function (item) {
    return Object.assign({}, item, {
      _iconIsImage: !!(item.icon && isImageUrl(item.icon)),
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
    },
  },

  methods: {
    _normalizeByType(component) {
      const type = component.type
      const props = { ...(component.props || {}) }
      const runtimeData = Array.isArray(component.runtimeData) ? component.runtimeData : []

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
        const themeRaw = String(props.theme || 'blue')
        props._theme = ['blue', 'green', 'purple', 'dark', 'gold'].includes(themeRaw) ? themeRaw : 'blue'
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
      if (type === 'product_list' || type === 'article_list' || type === 'article_feed' || type === 'hot_news' || type === 'flash_sale') {
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
        if (type === 'article_list' || type === 'article_feed' || type === 'hot_news') {
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

      return {
        ...component,
        props,
      }
    },

    /** 处理组件数据 */
    _processComponent(component) {
      const normalized = this._normalizeByType(component)
      let styleString = normalized.styleString || parseStyle(normalized.style || component.style || {})
      if (normalized.type === 'nav' || normalized.type === 'product_list') {
        styleString = appendNavStackStyle(styleString)
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

    onQuickNavigate(e) {
      const link = (e.currentTarget.dataset.link || '').trim()
      if (!link) return
      navigatePage(link)
    },

    onPhoneTap(e) {
      const phone = (e.currentTarget.dataset.phone || '').trim()
      if (!phone) return
      wx.makePhoneCall({ phoneNumber: phone })
    },

    onSearchTap() {
      const scope = ((this.data.comp && this.data.comp.props && this.data.comp.props.scope) || 'all').toString()
      let link = '/pages/search/search'
      if (scope === 'product') link = '/pages/search/search'
      if (scope === 'article') link = '/pages/content-list/content-list'
      if (scope === 'activity') link = '/pkg-extra/activity-list/activity-list'
      navigatePage(link)
    },

    onAiEntryTap() {
      wx.navigateTo({
        url: '/pkg-user/service-chat/service-chat',
        fail: () => {},
      })
    },
  },
})
