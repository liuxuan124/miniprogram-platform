#!/usr/bin/env node
/** 测试「我的」页点击登录 → 半屏面板（不跳转登录页） */
const automator = require('miniprogram-automator')
const fs = require('fs')
const path = require('path')

const CLI_PATH = process.env.WECHAT_DEVTOOLS_CLI || '/Applications/wechatwebdevtools.app/Contents/MacOS/cli'
const PROJECT_PATH = process.env.MINIAPP_PROJECT_PATH || path.resolve(__dirname, '../miniapp')
const EVID_DIR = path.resolve(__dirname, '../agent-team/testing/evidence/mine-login-sheet')
const TIMEOUT_MS = 45000

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function withTimeout(promise, label) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timeout`)), TIMEOUT_MS)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

async function readSheetState(mp) {
  return mp.evaluate(() => {
    const pages = getCurrentPages()
    const cur = pages[pages.length - 1]
    const sheet = cur && cur.selectComponent && cur.selectComponent('#global-login-sheet')
    if (!sheet || !sheet.data) {
      return { hasSheet: false, route: cur ? cur.route : '' }
    }
    return {
      hasSheet: true,
      route: cur.route,
      mounted: !!sheet.data.mounted,
      visible: !!sheet.data.visible,
    }
  })
}

async function main() {
  fs.mkdirSync(EVID_DIR, { recursive: true })
  const report = { ok: true, checks: [], steps: [] }
  let mp

  try {
    mp = await withTimeout(automator.launch({
      cliPath: CLI_PATH,
      projectPath: PROJECT_PATH,
      trustProject: true,
    }), 'launch')
    report.steps.push('connected')

    await mp.evaluate(() => {
      try { wx.clearStorageSync() } catch (e) {}
      const app = getApp()
      if (app && app.clearAuthState) app.clearAuthState()
      return true
    })
    report.steps.push('cleared-auth')

    await mp.reLaunch('/pages/mine/mine')
    await sleep(2200)
    let page = await mp.currentPage()
    report.initialPath = page.path
    report.checks.push({ name: 'on-mine-page', pass: page.path.includes('mine/mine') })

    const mineData = await page.data()
    report.mineLoggedIn = !!mineData.isLoggedIn

    // 点击会员卡片「登录」按钮
    const cta = await page.$('.member-card__cta')
    report.ctaFound = !!cta
    if (!cta) throw new Error('未找到 .member-card__cta 登录按钮')
    await cta.tap()
    await sleep(1500)

    page = await mp.currentPage()
    report.afterTapPath = page.path
    report.checks.push({
      name: 'no-navigate-to-login-page',
      pass: !page.path.includes('login/login'),
    })

    let sheet = await readSheetState(mp)
    report.sheetAfterCta = sheet
    report.checks.push({
      name: 'login-sheet-mounted',
      pass: sheet.hasSheet && sheet.mounted,
    })
    report.checks.push({
      name: 'login-sheet-visible',
      pass: sheet.hasSheet && sheet.visible,
    })

    await mp.screenshot({ path: path.join(EVID_DIR, '01-sheet-open.png') })

    const brand = await page.$$('.brand-name')
    const primaryBtn = await page.$$('.login-primary')
    const skipLink = await page.$$('.skip-link')
    report.ui = {
      brandCount: brand.length,
      primaryBtnCount: primaryBtn.length,
      skipCount: skipLink.length,
    }
    report.checks.push({ name: 'brand-ui', pass: brand.length > 0 })
    report.checks.push({ name: 'primary-btn-ui', pass: primaryBtn.length > 0 })
    report.checks.push({ name: 'skip-link-ui', pass: skipLink.length > 0 })

    // 点击「先随便逛逛」关闭
    if (skipLink[0]) {
      await skipLink[0].tap()
      await sleep(800)
    }
    sheet = await readSheetState(mp)
    report.sheetAfterSkip = sheet
    report.checks.push({
      name: 'sheet-closes-on-skip',
      pass: sheet.hasSheet && sheet.mounted && !sheet.visible,
    })
    await mp.screenshot({ path: path.join(EVID_DIR, '02-sheet-closed.png') })

    // 点击头像区再次打开
    const profile = await page.$('.profile-row')
    if (profile) {
      await profile.tap()
      await sleep(1200)
    }
    sheet = await readSheetState(mp)
    report.sheetAfterProfile = sheet
    report.checks.push({
      name: 'sheet-reopens-from-profile',
      pass: sheet.hasSheet && sheet.visible,
    })
    await mp.screenshot({ path: path.join(EVID_DIR, '03-sheet-reopen.png') })

    report.ok = report.checks.every((c) => c.pass)
    report.evidenceDir = EVID_DIR
    console.log(JSON.stringify(report, null, 2))
    process.exit(report.ok ? 0 : 1)
  } catch (err) {
    report.ok = false
    report.error = err.message || String(err)
    console.log(JSON.stringify(report, null, 2))
    process.exit(1)
  } finally {
    if (mp) {
      try { await withTimeout(mp.disconnect(), 'disconnect') } catch (e) {}
    }
  }
}

main()
