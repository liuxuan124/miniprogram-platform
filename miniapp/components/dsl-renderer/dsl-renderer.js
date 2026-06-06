// components/dsl-renderer/dsl-renderer.js — DSL 渲染引擎
// 接收组件 DSL 数据，根据 type 分发到对应的子组件进行渲染
const { executeAction, isImageUrl, navigatePage } = require('../../utils/render')

/** 预处理 items，标记 icon 是否为真实图片 URL */
function processIconItems(items) {
  if (!Array.isArray(items)) return []
  return items.map(function (item) {
    return Object.assign({}, item, {
      _iconIsImage: !!(item.icon && isImageUrl(item.icon)),
    })
  })
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
          link_url: item.id ? `/pages/activity-detail/activity-detail?id=${item.id}` : '/pages/activity-list/activity-list',
        }))
      }

      if (type === 'appointment_service' && runtimeData.length) {
        props.services = runtimeData.map((item) => ({
          name: item.name || '预约服务',
          desc: item.description || item.desc || '在线预约服务',
          link_url: item.id ? `/pages/appointment-calendar/appointment-calendar?serviceId=${item.id}` : '/pages/appointment-list/appointment-list',
        }))
      }

      if (type === 'notice_bar' && runtimeData.length) {
        props.items = runtimeData.map((item) => item.name || item.title || '').filter(Boolean).slice(0, 5)
      }

      if (type === 'category_nav' && runtimeData.length) {
        props.items = processIconItems(runtimeData.slice(0, 10).map((item, index) => ({
          icon: item.icon || '📌',
          title: item.name || item.title || `分类${index + 1}`,
          link_url: item.linkUrl || item.link_url || '/pages/category/category',
          link_type: 'page',
        })))
      }

      // 也预处理 DSL 中自带的 items
      if (type === 'category_nav' && Array.isArray(props.items) && !runtimeData.length) {
        props.items = processIconItems(props.items)
      }

      return {
        ...component,
        props,
      }
    },

    /** 处理组件数据 */
    _processComponent(component) {
      const normalized = this._normalizeByType(component)
      this.setData({
        comp: {
          ...normalized,
          props: normalized.props || {},
          actions: normalized.actions || [],
          styleString: normalized.styleString || '',
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
      let link = '/pages/product-list/product-list'
      if (scope === 'article') link = '/pages/content-list/content-list'
      if (scope === 'activity') link = '/pages/activity-list/activity-list'
      navigatePage(link)
    },

    onAiEntryTap() {
      wx.navigateTo({
        url: '/pages/ai-chat/ai-chat',
        fail: () => {},
      })
    },
  },
})
