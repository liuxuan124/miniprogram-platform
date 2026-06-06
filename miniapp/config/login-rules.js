// config/login-rules.js — 登录规则配置
// 统一管理各业务动作的登录要求，支持后端动态下发覆盖
//
// 规则分级:
//   'none'    - 无需登录
//   'optional'- 建议登录（不拦截，但提示登录可获得更好体验）
//   'required' - 必须登录（未登录时跳转登录页）

const LOGIN_RULES = {
  // ========== 页面访问规则 ==========
  pages: {
    index:        { level: 'none' },      // 首页
    category:     { level: 'none' },      // 分类页
    content:      { level: 'none' },      // 内容列表
    product_list: { level: 'none' },      // 商品列表
    product_detail:{ level: 'none' },     // 商品详情
    activity_list:{ level: 'none' },      // 活动列表
    activity_detail:{ level: 'none' },    // 活动详情（报名动作才查登录）
    appointment_list:{ level: 'none' },   // 预约列表
    appointment_book:{ level: 'none' },   // 预约预订页（提交时才查登录）
    coupon_list:  { level: 'none' },      // 优惠券列表（领取动作才查登录）
    mine:         { level: 'none' },      // 我的页面（登录入口所在地）
    ai_chat:      { level: 'none' },      // AI助手
    webview:      { level: 'none' },      // WebView
  },

  // ========== 业务动作规则 ==========
  actions: {
    // 交易与活动
    buy_product:      { level: 'required', desc: '购买商品' },
    add_to_cart:      { level: 'required', desc: '加入购物车' },
    create_order:     { level: 'required', desc: '提交订单' },
    signup_activity:  { level: 'required', desc: '报名活动' },
    book_appointment: { level: 'required', desc: '预约服务' },
    claim_coupon:     { level: 'required', desc: '领取优惠券' },

    // 我的数据（查看个人数据页已在 pages 中，此处定义动作级兜底）
    view_orders:      { level: 'required', desc: '查看订单' },
    view_signups:     { level: 'required', desc: '查看报名' },
    view_appointments:{ level: 'required', desc: '查看预约' },
    view_points:      { level: 'required', desc: '查看积分' },
    view_coupons:     { level: 'required', desc: '查看优惠券' },
    view_member:      { level: 'required', desc: '查看会员' },

    // 会员服务
    member_signin:    { level: 'required', desc: '签到' },
    customer_service: { level: 'none',     desc: '联系客服' },

    // 设置
    settings:         { level: 'none',     desc: '设置' },
  },

  // ========== 「我的页面」菜单项按需登录配置 ==========
  // 匹配 mine 页面 menuItems 的 id，定义每个菜单是否需要登录
  mineMenuRequireLogin: {
    registration:    true,   // 我的报名 — 必须登录
    reservation:     true,   // 我的预约 — 必须登录
    coupons:         true,   // 优惠券 — 必须登录
    cart:            true,   // 购物车 — 必须登录
    member_center:   true,   // 会员中心 — 必须登录
    points:          true,   // 我的积分 — 必须登录
    contact:         false,  // 联系客服 — 不需要登录
    settings:        false,  // 设置 — 不需要登录
  },
}

/**
 * 检查动作是否需要登录
 * @param {string} actionKey - 动作 key
 * @returns {boolean}
 */
function isActionLoginRequired(actionKey) {
  const rule = LOGIN_RULES.actions[actionKey]
  return rule ? rule.level === 'required' : false
}

/**
 * 检查页面是否需要登录
 * @param {string} pageKey - 页面 key
 * @returns {boolean}
 */
function isPageLoginRequired(pageKey) {
  const rule = LOGIN_RULES.pages[pageKey]
  return rule ? rule.level === 'required' : false
}

module.exports = {
  LOGIN_RULES,
  isActionLoginRequired,
  isPageLoginRequired,
}
