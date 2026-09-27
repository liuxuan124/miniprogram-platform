/**
 * 内容发布版本同步：后台「发布第 N 次」后，小程序在不发新包的前提下拉齐配置与 DSL。
 * 草稿预览（pt）不参与线上版本比对，避免污染正式用户缓存。
 */
const { get } = require('./request')
const contentView = require('./content-view')
const SystemService = require('../services/system')
const { StorageUtil } = require('./storage')
const { loadTabBoundDslPage } = require('./dsl-tab-page')

const CHECK_TS_KEY = 'content_release_check_ts'
const CHECK_INTERVAL_MS = 45000
const RELEASE_STORAGE_KEY = 'content_release_no'

let syncPromise = null

function getLocalReleaseNo() {
  return String(StorageUtil.get(RELEASE_STORAGE_KEY) || '0')
}

async function peekRemoteReleaseNo() {
  const view = contentView.contentViewParam()
  const res = await get('/api/v1/mp/config/public', { view }, { auth: false, showError: false })
  const data = (res && res.data) ? res.data : res
  if (!data || typeof data !== 'object') return null
  return String(data.live_release_no != null ? data.live_release_no : '0')
}

function refreshCustomTabBar() {
  try {
    const pages = getCurrentPages()
    if (!pages.length) return
    const page = pages[pages.length - 1]
    const tabBar = page && typeof page.getTabBar === 'function' && page.getTabBar()
    if (tabBar && typeof tabBar.refresh === 'function') {
      tabBar.refresh()
    }
  } catch (e) { /* ignore */ }
}

/**
 * @returns {Promise<{ changed: boolean, releaseNo: string, reason?: string }>}
 */
async function syncContentReleaseIfNeeded(options) {
  const force = !!(options && options.force)
  if (contentView.isDraftPreviewActive()) {
    return { changed: false, releaseNo: getLocalReleaseNo(), reason: 'draft-preview' }
  }

  const now = Date.now()
  const lastCheck = Number(StorageUtil.get(CHECK_TS_KEY) || 0)
  if (!force && now - lastCheck < CHECK_INTERVAL_MS) {
    return { changed: false, releaseNo: getLocalReleaseNo(), reason: 'throttled' }
  }
  StorageUtil.set(CHECK_TS_KEY, now)

  if (syncPromise) return syncPromise

  syncPromise = (async () => {
    const localBefore = getLocalReleaseNo()
    let remote = null
    try {
      remote = await peekRemoteReleaseNo()
    } catch (e) {
      remote = null
    }
    if (remote == null) {
      return { changed: false, releaseNo: localBefore, reason: 'network' }
    }
    if (!force && remote === localBefore) {
      return { changed: false, releaseNo: localBefore }
    }

    await SystemService.fetchSystemConfig(true)
    const localAfter = getLocalReleaseNo()
    const changed = localBefore !== localAfter

    if (changed) {
      try {
        const app = getApp()
        if (app && app.globalData) {
          app.globalData.pageDSLCache = {}
          app.globalData.contentReleaseNo = localAfter
        }
      } catch (e) { /* ignore */ }
      refreshCustomTabBar()
    }

    return { changed, releaseNo: localAfter }
  })().finally(() => {
    syncPromise = null
  })

  return syncPromise
}

/**
 * Tab 页 onShow 调用：检测发布版本变化后刷新绑定 DSL / 原生数据。
 * @param {WechatMiniprogram.Page.Instance} pageCtx
 * @param {string} tabRoute 如 /pages/index/index
 * @param {() => void|Promise<void>} [extraReload] 非 DSL 模式下的刷新（如 _load）
 */
/**
 * Tab 页下拉刷新：强制比对发布号并刷新 DSL（正式用户不走 draft）
 */
function onTabPagePullDownRefresh(pageCtx, tabRoute, extraReload) {
  if isRenderParityLocked(pageCtx)) {
    return Promise.resolve()
  }
  if (contentView.isDraftPreviewActive()) {
    return loadTabBoundDslPage(pageCtx, tabRoute, true).then((dslOk) => {
      if (!dslOk && typeof extraReload === 'function') {
        return Promise.resolve(extraReload())
      }
      return undefined
    })
  }
  return syncContentReleaseIfNeeded({ force: true })
    .then(() => loadTabBoundDslPage(pageCtx, tabRoute, true))
    .then((dslOk) => {
      if (!dslOk && typeof extraReload === 'function') {
        return Promise.resolve(extraReload())
      }
      return undefined
    })
}

function isRenderParityLocked(pageCtx) {
  const batch = pageCtx && pageCtx.data && pageCtx.data.parityBatch
  return batch != null && String(batch) !== ''
}

function onTabPageShow(pageCtx, tabRoute, extraReload) {
  if (!pageCtx || contentView.isDraftPreviewActive()) return Promise.resolve()

  return syncContentReleaseIfNeeded().then((result) => {
    if isRenderParityLocked(pageCtx)) return
    const releaseNo = result.releaseNo || getLocalReleaseNo()
    const prev = pageCtx.data && pageCtx.data.__contentReleaseNo
    const bump = result.changed || prev !== releaseNo
    if (!bump) return

    pageCtx.setData({ __contentReleaseNo: releaseNo })

    const reloadDsl = () => {
      if isRenderParityLocked(pageCtx)) return Promise.resolve()
      return loadTabBoundDslPage(pageCtx, tabRoute, true).then((dslOk) => {
        if (!dslOk && typeof extraReload === 'function') {
          return Promise.resolve(extraReload())
        }
        return undefined
      })
    }

    if (pageCtx.data && (pageCtx.data.dslMode || pageCtx.data.dslPending || pageCtx.data.adminWarmBound)) {
      return reloadDsl()
    }
    if (typeof extraReload === 'function') {
      return Promise.resolve(extraReload())
    }
    return reloadDsl()
  }).catch(() => {})
}

module.exports = {
  syncContentReleaseIfNeeded,
  onTabPageShow,
  onTabPagePullDownRefresh,
  getLocalReleaseNo,
  CHECK_INTERVAL_MS,
}
