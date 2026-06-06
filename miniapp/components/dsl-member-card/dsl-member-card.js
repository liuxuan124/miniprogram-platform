// components/dsl-member-card/dsl-member-card.js — 会员卡组件
const { executeAction } = require('../../utils/render')

Component({
  properties: {
    /** 组件配置 */
    config: {
      type: Object,
      value: {},
    },
    /** 组件动作列表 */
    actions: {
      type: Array,
      value: [],
    },
    /** 自定义样式 */
    styleString: {
      type: String,
      value: '',
    },
  },

  data: {
    memberInfo: {
      nickname: '金卡会员',
      avatar_url: '',
      level: '点击查看权益',
      points: 1280,
      growth: 5600,
      coupons: 3,
      balance: '0.00',
    },
  },

  lifetimes: {
    attached() {
      this._loadMemberInfo()
    },
  },

  methods: {
    /** 加载会员信息 */
    _loadMemberInfo() {
      const app = getApp()
      if (app && app.globalData && app.globalData.userInfo) {
        const userInfo = app.globalData.userInfo
        this.setData({
          memberInfo: {
            nickname: userInfo.nickname || userInfo.nickName || '用户',
            avatar_url: userInfo.avatar_url || userInfo.avatarUrl || '',
            level: userInfo.level || '点击查看权益',
            points: userInfo.points || 0,
            growth: userInfo.growth || 5600,
            coupons: userInfo.coupons || 3,
            balance: userInfo.balance || '0.00',
          },
        })
      }
    },

    /** 点击会员卡 */
    onTapCard() {
      if (this.data.actions && this.data.actions.length > 0) {
        executeAction(this.data.actions[0])
      }
    },
  },
})
