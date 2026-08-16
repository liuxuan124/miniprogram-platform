const automator = require('miniprogram-automator')
const fs = require('fs')
const path = require('path')

const EVID = path.resolve(__dirname, '../evidence/BATCH-QA-009')
const WS = process.env.MINIAPP_WS_ENDPOINT || 'ws://127.0.0.1:9420'

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function slim(data) {
  const out = {}
  Object.keys(data || {}).slice(0, 24).forEach((k) => {
    const v = data[k]
    out[k] = Array.isArray(v) ? `Array(${v.length})` : v && typeof v === 'object' ? 'object' : v
  })
  return out
}

async function dump(mp) {
  const page = await mp.currentPage()
  let data = {}
  try { data = await page.data() } catch (e) { data = { _error: e.message } }
  return { path: page.path, query: page.query || {}, slim: slim(data), extra: {
    showCommentSheet: data.showCommentSheet,
    commentCount: data.commentCount,
    commentsLen: Array.isArray(data.comments) ? data.comments.length : undefined,
    liked: data.liked,
    favorited: data.favorited,
    searched: data.searched,
    keyword: data.keyword,
    resultCount: Array.isArray(data.results) ? data.results.length : undefined,
    loading: data.loading,
    title: data.title,
    type: data.type,
  } }
}

async function shot(mp, name) {
  try {
    await mp.screenshot({ path: path.join(EVID, name) })
    return name
  } catch (e) {
    return 'shot-fail:' + e.message
  }
}

async function tapSel(mp, selector) {
  const page = await mp.currentPage()
  const el = await page.$(selector)
  if (!el) return { found: false, selector }
  await el.tap()
  await sleep(1200)
  return { found: true, selector }
}

async function main() {
  const report = { startedAt: new Date().toISOString(), steps: [], errors: [] }
  let mp
  try {
    mp = await automator.connect({ wsEndpoint: WS })
    report.steps.push('connected')

    await mp.reLaunch('/pages/login/login')
    await sleep(1500)
    report.login = await dump(mp)
    const termsTap = await tapSel(mp, '.agreement__link')
    report.termsTap = termsTap
    await sleep(800)
    report.agreement = await dump(mp)
    report.agreementShot = await shot(mp, '01-agreement.png')
    report.steps.push('agreement:' + report.agreement.path)

    await mp.reLaunch('/pkg-trade/order-list/order-list')
    await sleep(1800)
    report.orders = await dump(mp)
    const page = await mp.currentPage()
    let closeTried = []
    for (const sel of ['.close-button', 'login-sheet', '.login-mask', '.sheet-heading__actions']) {
      try {
        const r = await tapSel(mp, sel)
        closeTried.push(r)
        if (r.found) break
      } catch (e) {
        closeTried.push({ selector: sel, err: e.message })
      }
    }
    try {
      const sheet = await page.$('login-sheet')
      report.sheetFound = !!sheet
      if (sheet && sheet.callMethod) {
        await sheet.callMethod('hide')
        closeTried.push({ callMethod: 'hide' })
      }
    } catch (e) {
      closeTried.push({ callMethodErr: e.message })
    }
    await sleep(800)
    report.closeTried = closeTried
    report.ordersAfterClose = await dump(mp)
    report.ordersAfterCloseShot = await shot(mp, '02-orders-after-close.png')
    report.steps.push('ordersClose')

    await mp.reLaunch('/pages/content-detail/content-detail?id=3')
    await sleep(2000)
    report.article = await dump(mp)
    const likeTap = await tapSel(mp, '.action-item')
    report.likeTap = likeTap
    await sleep(400)
    report.afterLike = await dump(mp)
    const cmtItems = await (await mp.currentPage()).$$('.action-item')
    report.actionItemCount = cmtItems ? cmtItems.length : 0
    if (cmtItems && cmtItems[1]) {
      await cmtItems[1].tap()
      await sleep(1000)
    }
    report.afterCommentTap = await dump(mp)
    report.commentShot = await shot(mp, '03-comment-sheet.png')
    const sendTap = await tapSel(mp, '.cmt-send')
    report.emptySendTap = sendTap
    await sleep(600)
    report.afterEmptySend = await dump(mp)
    const favItems = await (await mp.currentPage()).$$('.action-item')
    if (favItems && favItems[2]) {
      await favItems[2].tap()
      await sleep(600)
    }
    report.afterFav = await dump(mp)
    report.steps.push('article:like=' + report.afterLike.extra.liked + ':cmt=' + report.afterCommentTap.extra.showCommentSheet)

    await mp.reLaunch('/pages/search/search')
    await sleep(1200)
    const emptySearch = await tapSel(mp, '.action')
    report.emptySearchTap = emptySearch
    await sleep(400)
    const hotTap = await tapSel(mp, '.hot-item')
    report.hotTap = hotTap
    await sleep(1800)
    report.searchHot = await dump(mp)
    report.searchHotShot = await shot(mp, '04-search-hot.png')
    report.steps.push('searchHot:' + JSON.stringify(report.searchHot.extra))

    await mp.reLaunch('/pages/search/search')
    await sleep(800)
    try {
      const sp = await mp.currentPage()
      await sp.setData({ keyword: '选品' })
      await sp.callMethod('onSearch')
      await sleep(2000)
      report.searchKw = await dump(mp)
      report.searchKwShot = await shot(mp, '05-search-keyword.png')
    } catch (e) {
      report.errors.push('searchKw:' + e.message)
    }

    await mp.switchTab('/pages/content-list/content-list')
    await sleep(1500)
    try {
      const cp = await mp.currentPage()
      await cp.callMethod('onPullDownRefresh')
      await sleep(2000)
      report.pullRefresh = await dump(mp)
      report.pullRefreshShot = await shot(mp, '06-pull-refresh.png')
      report.steps.push('pullRefresh:' + report.pullRefresh.extra.loading)
    } catch (e) {
      report.errors.push('pullRefresh:' + e.message)
    }

    await mp.reLaunch('/pkg-user/settings/settings')
    await sleep(1200)
    try {
      const sp = await mp.currentPage()
      await sp.callMethod('goTerms')
      await sleep(1800)
      report.settingsTerms = await dump(mp)
      report.settingsTermsShot = await shot(mp, '07-settings-terms.png')
      report.steps.push('settingsTerms:' + report.settingsTerms.path)
    } catch (e) {
      report.errors.push('goTerms:' + e.message)
    }

    await mp.reLaunch('/pkg-extra/activity-detail/activity-detail?id=2')
    await sleep(1800)
    const signTap = await tapSel(mp, '.submit-btn')
    report.signTap = signTap
    await sleep(800)
    report.afterSign = await dump(mp)
    report.afterSignShot = await shot(mp, '08-activity-signup.png')
    report.steps.push('signup:' + report.afterSign.path)
  } catch (e) {
    report.errors.push(e.stack || e.message)
  } finally {
    if (mp) {
      try { await mp.disconnect() } catch (e) { report.errors.push('disconnect:' + e.message) }
    }
    report.finishedAt = new Date().toISOString()
    fs.writeFileSync(path.join(EVID, 'automator-report.json'), JSON.stringify(report, null, 2))
    console.log(JSON.stringify({
      steps: report.steps,
      errors: report.errors,
      agreement: report.agreement,
      closeTried: report.closeTried,
      ordersAfterClose: report.ordersAfterClose && report.ordersAfterClose.path,
      afterLike: report.afterLike && report.afterLike.extra,
      afterCommentTap: report.afterCommentTap && report.afterCommentTap.extra,
      afterFav: report.afterFav && report.afterFav.extra,
      searchHot: report.searchHot && report.searchHot.extra,
      searchKw: report.searchKw && report.searchKw.extra,
      pullRefresh: report.pullRefresh && report.pullRefresh.extra,
      settingsTerms: report.settingsTerms,
      afterSign: report.afterSign && report.afterSign.path,
      signTap: report.signTap,
    }, null, 2))
  }
}

main()
