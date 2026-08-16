const automator = require('miniprogram-automator')
const fs = require('fs')
const path = require('path')

const EVID = path.resolve(__dirname, '../evidence/BATCH-QA-008')
const WS = process.env.MINIAPP_WS_ENDPOINT || 'ws://127.0.0.1:9420'

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function slimData(data) {
  const slim = {}
  Object.keys(data || {}).slice(0, 22).forEach((k) => {
    const v = data[k]
    slim[k] = Array.isArray(v) ? `Array(${v.length})` : v && typeof v === 'object' ? 'object' : v
  })
  return slim
}

async function dump(mp) {
  const page = await mp.currentPage()
  let data = {}
  try {
    data = await page.data()
  } catch (e) {
    data = { _error: e.message }
  }
  return { path: page.path, query: page.query || {}, slim: slimData(data), rawHint: {
    loading: data.loading,
    isEmpty: data.isEmpty,
    isLoggedIn: data.isLoggedIn,
    templateTitle: data.templateTitle,
    fieldCount: Array.isArray(data.fields) ? data.fields.length : undefined,
    submitted: data.submitted,
    articleCount: Array.isArray(data.articles) ? data.articles.length : undefined,
    firstArticleId: data.articles && data.articles[0] && data.articles[0].id,
    activityCount: Array.isArray(data.activities) ? data.activities.length : undefined,
    firstActivityId: data.activities && data.activities[0] && data.activities[0].id,
    cartLen: Array.isArray(data.cartList) ? data.cartList.length : undefined,
  } }
}

async function shot(mp, name) {
  const dest = path.join(EVID, name)
  try {
    await mp.screenshot({ path: dest })
    return name
  } catch (e) {
    return 'shot-fail:' + e.message
  }
}

async function go(mp, how, url, waitMs) {
  if (how === 'tab') await mp.switchTab(url)
  else if (how === 'nav') await mp.navigateTo(url)
  else await mp.reLaunch(url)
  await sleep(waitMs || 1800)
}

async function tapFirst(mp, selector) {
  const page = await mp.currentPage()
  const el = await page.$(selector)
  if (!el) return { found: false }
  await el.tap()
  await sleep(1500)
  return { found: true }
}

async function main() {
  const report = { startedAt: new Date().toISOString(), steps: [], errors: [], proto: [] }
  let mp
  try {
    mp = await automator.connect({ wsEndpoint: WS })
    report.steps.push('connected')
    report.proto = Object.getOwnPropertyNames(Object.getPrototypeOf(mp) || {})
    report.mpKeys = Object.keys(mp || {})

    const pages = [
      ['01-cart.png', 'reLaunch', '/pages/cart/cart', 'cart'],
      ['02-search.png', 'reLaunch', '/pages/search/search', 'search'],
      ['03-login.png', 'reLaunch', '/pages/login/login', 'login'],
      ['04-member.png', 'reLaunch', '/pkg-user/member-center/member-center', 'member'],
      ['05-coupon.png', 'reLaunch', '/pkg-user/coupon-list/coupon-list', 'coupon'],
      ['06-appoint.png', 'reLaunch', '/pkg-user/my-appointments/my-appointments', 'appoint'],
      ['07-settings.png', 'reLaunch', '/pkg-user/settings/settings', 'settings'],
    ]
    for (const [shotName, how, url, key] of pages) {
      try {
        await go(mp, how, url)
        report[key] = await dump(mp)
        report[key + 'Shot'] = await shot(mp, shotName)
        report.steps.push(key + ':' + report[key].path)
      } catch (e) {
        report.errors.push(key + ':' + e.message)
      }
    }

    try {
      await go(mp, 'tab', '/pages/content-list/content-list', 2000)
      report.content = await dump(mp)
      report.contentShot = await shot(mp, '08-content.png')
      const tap = await tapFirst(mp, '.content-card')
      report.contentTap = tap
      await sleep(800)
      report.contentDetail = await dump(mp)
      report.contentDetailShot = await shot(mp, '09-content-detail.png')
      report.steps.push('contentDetail:' + report.contentDetail.path)
    } catch (e) {
      report.errors.push('content:' + e.message)
    }

    try {
      await go(mp, 'reLaunch', '/pkg-extra/activity-list/activity-list', 2000)
      report.activity = await dump(mp)
      const tap = await tapFirst(mp, '.activity-card')
      report.activityTap = tap
      await sleep(800)
      report.activityDetail = await dump(mp)
      report.activityDetailShot = await shot(mp, '10-activity-detail.png')
      report.steps.push('activityDetail:' + report.activityDetail.path)
      const signup = await tapFirst(mp, '.signup-btn, .activity-action, button')
      report.signupTap = signup
      await sleep(800)
      report.afterSignup = await dump(mp)
      report.afterSignupShot = await shot(mp, '11-after-signup.png')
    } catch (e) {
      report.errors.push('activity:' + e.message)
    }

    try {
      await go(mp, 'reLaunch', '/pkg-extra/form/form?id=1', 2500)
      report.form = await dump(mp)
      report.formShot = await shot(mp, '12-form.png')
      const tap = await tapFirst(mp, '.submit-btn')
      report.formSubmitTap = tap
      await sleep(1200)
      report.formAfterSubmit = await dump(mp)
      report.formAfterShot = await shot(mp, '13-form-after-submit.png')
      report.steps.push('formSubmit:' + report.formAfterSubmit.path + ':submitted=' + report.formAfterSubmit.rawHint.submitted)
    } catch (e) {
      report.errors.push('form:' + e.message)
    }

    try {
      await go(mp, 'reLaunch', '/pkg-trade/order-list/order-list', 2000)
      report.orders = await dump(mp)
      report.ordersShot = await shot(mp, '14-orders.png')
      const closeTap = await tapFirst(mp, '.close-button')
      report.loginClose = closeTap
      await sleep(600)
      report.ordersAfterClose = await dump(mp)
      report.ordersAfterCloseShot = await shot(mp, '15-orders-after-close.png')
      report.steps.push('ordersClose:' + JSON.stringify(closeTap))
    } catch (e) {
      report.errors.push('orders:' + e.message)
    }
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
      proto: report.proto,
      mpKeys: report.mpKeys,
      cart: report.cart,
      search: report.search,
      login: report.login,
      member: report.member,
      coupon: report.coupon,
      appoint: report.appoint,
      settings: report.settings,
      content: report.content && report.content.rawHint,
      contentDetail: report.contentDetail,
      activityDetail: report.activityDetail,
      afterSignup: report.afterSignup,
      form: report.form && report.form.rawHint,
      formAfterSubmit: report.formAfterSubmit && report.formAfterSubmit.rawHint,
      loginClose: report.loginClose,
      ordersAfterClose: report.ordersAfterClose && report.ordersAfterClose.path,
    }, null, 2))
  }
}

main()
