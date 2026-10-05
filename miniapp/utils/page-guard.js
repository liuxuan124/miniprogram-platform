/**
 * 页面访问守卫（2026-10-06）。
 *
 * 覆盖后台「高级设置」里的四种访问权限：
 * - public   公开，直接放行
 * - login    未登录 → 跳登录页
 * - vip      命中允许的会员身份 → 放行，否则提示
 * - password 需输入 6 位访问密码
 *
 * 🔴 为什么放工具而不是页面里写：
 * `pages/custom` 与 `pages/custom-nav` 两个装修页都要用，
 * 各写一份必然出现「一个页拦了另一个没拦」的不一致 ——
 * 那是权限系统的致命缺口（用户换个入口就绕过去了）。
 *
 * ⚠️ 口径说明：这里是**前端体验层**的拦截，不是安全边界。
 * 真要防「抓包直接调接口」，必须在服务端接口层再校验一次。
 * 前端守卫的作用是「让正常用户走不到不该看的内容」，
 * 所以文案上不承诺「绝对安全」。
 */

/** 会员身份 → 中文名（与后台 PAGE_VIP_TIERS 对齐） */
const VIP_TIER_LABELS = {
  vip_annual: '年度会员',
  vip_column: '专栏合伙人',
  vip_planet: '星球合伙人',
}

/** 拿当前登录用户（拿不到就按未登录处理） */
function currentUser(app) {
  try {
    const a = app || getApp()
    return (a && a.globalData && (a.globalData.userInfo || a.globalData.user)) || null
  } catch (e) {
    return null
  }
}

/** 是否已登录：兼容多种已登录标记（老版本端上字段名不统一） */
function isLoggedIn(app) {
  const u = currentUser(app)
  if (!u) return false
  return Boolean(u.id || u.userId || u.openid || u.token)
}

/**
 * 取用户的会员身份列表。
 * ⚠️ 兼容三种可能的字段：数组 / 逗号串 / 单值。
 * 端上历史数据结构不统一，只认一种会漏判 → 反而把 VIP 用户拦在门外。
 */
function userVipTiers(app) {
  const u = currentUser(app)
  if (!u) return []
  const raw =
    u.vipTiers || u.vip_tiers || u.memberLevels || u.member_levels || u.vipLevel || u.vip_level
  if (Array.isArray(raw)) return raw.map(String)
  if (typeof raw === 'string') return raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : []
  return raw ? [String(raw)] : []
}

function isTierAllowed(userTiers, allowed) {
  if (!Array.isArray(allowed) || !allowed.length) return true
  return userTiers.some((t) => allowed.indexOf(t) >= 0)
}

/**
 * 校验访问权限。
 * @returns {{ok: true} | {ok: false, reason: string, action: 'login'|'vip'|'password'|'offline', payload?: any}}
 */
function checkPageAccess(page, app) {
  const cfg = page && typeof page === 'object' ? page : {}
  const app_ = app || (typeof getApp === 'function' ? getApp() : null)

  // 定时下线优先于权限：已下线的页不该再走「跳登录」这种无意义分支
  const sched = cfg.schedule
  if (sched && sched.enabled) {
    const now = Date.now()
    if (sched.offline_at && now > Number(sched.offline_at)) {
      return { ok: false, reason: 'offline', action: 'offline', payload: sched }
    }
    if (sched.online_at && now < Number(sched.online_at)) {
      return { ok: false, reason: 'not-online', action: 'offline', payload: sched }
    }
  }

  const mode = cfg.access_mode || 'public'
  if (mode === 'public') return { ok: true }

  if (mode === 'login') {
    return isLoggedIn(app_)
      ? { ok: true }
      : { ok: false, reason: '需要登录后查看', action: 'login' }
  }

  if (mode === 'vip') {
    if (!isLoggedIn(app_)) return { ok: false, reason: '需要登录后查看', action: 'login' }
    const allowed = Array.isArray(cfg.vip_tiers) ? cfg.vip_tiers : []
    return isTierAllowed(userVipTiers(app_), allowed)
      ? { ok: true }
      : {
          ok: false,
          reason: allowed.length
            ? '你的会员身份不在该页面的允许范围内'
            : '该页面暂未配置可访问的会员身份',
          action: 'vip',
          payload: allowed,
        }
  }

  if (mode === 'password') {
    const pwd = String(cfg.access_password || '').replace(/\D/g, '')
    // 🔴 没配密码 = 等于不生效。这里按「放行」而不是「永久拦死」——
    // 后台漏配密码若直接拦住，运营会以为页面坏了且找不到原因。
    if (!/^\d{6}$/.test(pwd)) return { ok: true }
    // 密码校验是异步的（要等用户输入），由调用方 await promptAccessPassword
    return { ok: false, reason: '需要访问密码', action: 'password', payload: { expect: pwd } }
  }

  return { ok: true }
}

/**
 * 弹密码框并校验（最多 3 次机会）。
 * ⚠️ 单独抽出来是因为 `checkPageAccess` 是**同步**的 ——
 * 在里面调 `wx.showModal` 拿不到返回值（异步 API），硬写会永远判定失败。
 *
 * @returns {Promise<boolean>} true=通过
 */
function promptAccessPassword(expect, maxTries) {
  const limit = maxTries || 3
  const attempt = (left) =>
    new Promise((resolve) => {
      wx.showModal({
        title: '访问验证',
        editable: true,
        placeholderText: '请输入 6 位数字密码',
        success: (res) => {
          if (!res.confirm) return resolve(false)
          const input = String((res.content || '')).replace(/\D/g, '')
          if (input === expect) return resolve(true)
          if (left <= 1) {
            wx.showToast({ title: '密码错误次数过多', icon: 'none' })
            return resolve(false)
          }
          wx.showToast({ title: '密码不正确', icon: 'none' })
          resolve(attempt(left - 1))
        },
        fail: () => resolve(false),
      })
    })
  return attempt(limit)
}

/** 下线兜底：把配置翻译成一个可执行动作 */
function resolveOfflineAction(sched) {
  const fallback = (sched && sched.fallback) || 'home'
  if (fallback === 'stay') return { type: 'stay' }
  if (fallback === 'notice') return { type: 'notice' }
  return { type: 'redirect', url: (sched && sched.redirect_path) || '/pages/index/index' }
}

module.exports = {
  VIP_TIER_LABELS,
  isLoggedIn,
  userVipTiers,
  isTierAllowed,
  checkPageAccess,
  promptAccessPassword,
  resolveOfflineAction,
}
