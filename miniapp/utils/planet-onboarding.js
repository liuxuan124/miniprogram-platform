// utils/planet-onboarding.js — 首次进入「选一个主星球」的判定
// 目标：只在「星球 Tab 的第一次进入」引导一次，其余情况一律走原有路径。
// ⚠️ 判定放宽一次，用户就被拦在门口；判定收紧过头，引导页永远不出现。改这里前先看下方用例表。
const PlanetService = require('../services/planet')
const { AuthUtil } = require('./auth')

const PICK_URL = '/pkg-content/planet-list/planet-list?mode=pick'

/**
 * 是否需要弹出选星球引导页
 *
 * 唯一的「首次」判据：**接口正常返回 + userSet=false + 本地无缓存**。
 * 判定顺序刻意如此 —— 先把「拿不到事实」的两种情况（接口失败 / 有缓存）排除掉，
 * 再用接口事实做判断，避免出现「接口失败 → 误判首次 → 白屏用户被拦」。
 *
 * @param {Object} ctx
 * @param {Object|null} ctx.main  GET /api/v1/mp/planet/main 的响应；null = 接口失败
 * @param {Array} ctx.list        GET /api/v1/mp/planet/communities 的结果（已归一化）
 * @param {boolean} ctx.loggedIn  是否已登录
 * @param {boolean} ctx.skipped   本地是否点过「先逛逛」
 * @param {string} ctx.cachedId   本地缓存的 main_planet_id
 * @returns {boolean}
 */
function shouldGuidePlanetPick(ctx) {
  const c = ctx || {}
  // ① 游客不引导：浏览全程不拦登录，开屏/进 Tab 拦会被审核驳回
  if (!c.loggedIn) return false
  // ② 点过「先逛逛」不引导，改用顶部非阻断提示条
  if (c.skipped) return false
  // ③ 拿不到主星球事实（接口失败）→ 静默放行。判定依赖它，缺了就当不需要
  if (!c.main || typeof c.main !== 'object') return false
  // ④ 本地有缓存 = 之前设过（getMainPlanet 与 setMainPlanet 都会写）→ 不再打扰
  if (c.cachedId) return false
  // ⑤ 接口已明确 userSet=true → 用户自己选过
  if (c.main.userSet === true) return false
  // ⑥ 只剩 1 个启用社区：没得选就不该让用户「选」
  const list = Array.isArray(c.list) ? c.list : []
  if (list.length <= 1) return false
  // ⑦ 到这里 = 已登录 + 没选过 + 没跳过 + 接口正常 + 有得选 → 首次进入
  return true
}

/**
 * 主星球是否因被停用而发生了回落（用于 toast 提示）
 * @returns {{fallback:boolean, from:string, to:string}}
 */
function detectPlanetFallback(ctx) {
  const c = ctx || {}
  const list = Array.isArray(c.list) ? c.list : []
  const cachedId = c.cachedId || ''
  const resolvedId = (c.main && c.main.planetId) || cachedId || ''
  if (!cachedId || !resolvedId) return { fallback: false, from: '', to: '' }
  if (String(cachedId) === String(resolvedId)) return { fallback: false, from: '', to: '' }
  // 缓存那颗没出现在启用列表里 = 被运营停用了
  const stillOn = list.some((x) => String(x.id) === String(cachedId))
  if (stillOn) return { fallback: false, from: '', to: '' }
  return { fallback: true, from: cachedId, to: resolvedId }
}

const PlanetOnboarding = {
  PICK_URL,

  /**
   * 在星球 Tab onShow 里调用。命中则 redirect 到选择页。
   * ⚠️ 任何一步异常都必须静默放行——引导是增强项，绝不能因为它白屏或卡死。
   */
  maybeGuide() {
    try {
      if (!AuthUtil.isLoggedIn()) return false
      if (PlanetService.isPickSkipped()) return false
      // ⚠️ 必须在请求【之前】快照缓存。
      // getMainPlanet() 成功后会写缓存（services/planet.js:42），若在 .then 里再读，
      // 读到的就是本次刚写的值 → 判据 ④ 恒命中 → 引导永不触发（2026-10-05 审计发现）。
      const cachedId = PlanetService.getCachedMainPlanetId()
      return Promise.all([
        PlanetService.getMainPlanet().catch(() => null),
        PlanetService.getPlanetCommunities().catch(() => null),
      ]).then(([main, rows]) => {
        const list = PlanetService.normalizeCommunities(rows)
        const need = shouldGuidePlanetPick({
          main,
          list,
          loggedIn: true,
          skipped: false,
          cachedId,
        })
        if (!need) return false
        wx.redirectTo({ url: PICK_URL, fail: () => {} })
        return true
      }).catch(() => false)
    } catch (e) {
      return false
    }
  },

  /** 主星球停用回落提示，供星球 Tab 展示；无回落返回 null */
  checkFallback() {
    try {
      // 同 maybeGuide：必须在请求前快照，否则 getMainPlanet() 会把缓存覆盖成新值，
      // detectPlanetFallback 里 `cachedId === resolvedId` 恒成立 → 回落 toast 永不触发。
      const cachedId = PlanetService.getCachedMainPlanetId()
      return Promise.all([
        PlanetService.getMainPlanet().catch(() => null),
        PlanetService.getPlanetCommunities().catch(() => null),
      ]).then(([main, rows]) => {
        const list = PlanetService.normalizeCommunities(rows)
        const r = detectPlanetFallback({
          main,
          list,
          cachedId,
        })
        if (!r.fallback) return null
        const hit = list.find((x) => String(x.id) === String(r.to))
        return {
          from: r.from,
          to: r.to,
          title: (hit && hit.title) || r.to,
        }
      }).catch(() => null)
    } catch (e) {
      return null
    }
  },
}

module.exports = { PlanetOnboarding, shouldGuidePlanetPick, detectPlanetFallback, PICK_URL }
