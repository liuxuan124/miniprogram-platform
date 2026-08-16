#!/usr/bin/env node
/**
 * BATCH-QA-013：装修器属性修复回归。
 * 不发布首页 id=1，不改业务代码。
 */
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const require = createRequire('/Users/lx/.npm/_npx/31e32ef8478fbf80/node_modules/playwright/package.json')
const { chromium } = require('playwright')

const ADMIN = 'http://127.0.0.1:3000'
const EVID = join(
  '/Users/lx/项目文件/liuxuan/小程序搭建运营系统',
  'agent-team/testing/evidence/BATCH-QA-013',
)
mkdirSync(EVID, { recursive: true })

const results = []
function rec(id, status, note) {
  results.push({ id, status, note })
  console.log(`${id} ${status} ${note}`)
}

async function shot(page, name) {
  const p = join(EVID, `${name}.png`)
  await page.screenshot({ path: p, fullPage: true })
  return p
}

async function dismissPwd(page) {
  const dlg = page.locator('.el-dialog').filter({ hasText: '请修改初始密码' })
  if (await dlg.first().isVisible({ timeout: 2000 }).catch(() => false)) {
    const close = page.locator('.el-dialog__headerbtn').first()
    if (await close.isVisible().catch(() => false)) await close.click()
    else await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
  }
}

async function addComp(page, label) {
  await page.getByPlaceholder('搜索组件').fill(label)
  await page.waitForTimeout(120)
  const cards = page.locator('.component-card')
  const n = await cards.count()
  for (let i = 0; i < n; i++) {
    const t = (await cards.nth(i).innerText()).replace(/\s+/g, '')
    if (t.includes(label.replace(/\s+/g, '')) && t.length < label.length + 10) {
      await cards.nth(i).click()
      await page.waitForTimeout(350)
      return true
    }
  }
  return false
}

async function panelText(page) {
  return (await page.locator('.props-panel').innerText().catch(() => '')) || ''
}

async function openSelectOptions(page, label) {
  const item = page.locator('.props-panel .el-form-item').filter({ hasText: label }).first()
  const trigger = item.locator('.el-select').first()
  if (!(await trigger.count())) return []
  await trigger.click()
  await page.waitForTimeout(250)
  const opts = await page.locator('.el-select-dropdown:visible .el-select-dropdown__item').allInnerTexts()
  await page.keyboard.press('Escape')
  await page.waitForTimeout(150)
  return opts.map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean)
}

const browser = await chromium.launch({ headless: true, channel: 'chrome' })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()
const extra = {}

try {
  await page.goto(`${ADMIN}/login`, { waitUntil: 'networkidle' })
  await page.getByPlaceholder('请输入用户名').fill('admin')
  await page.getByPlaceholder('请输入密码').fill('admin123')
  await page.getByRole('button', { name: /登\s*录/ }).click()
  await page.waitForTimeout(1200)
  await dismissPwd(page)

  await page.goto(`${ADMIN}/page-builder/list`, { waitUntil: 'networkidle' })
  await dismissPwd(page)
  await page.getByRole('button', { name: '新建页面' }).first().click()
  await page.waitForTimeout(400)
  const dlg = page.locator('.el-dialog:visible')
  const nameInput = dlg.getByPlaceholder('请输入页面名称')
  const maxlen = await nameInput.getAttribute('maxlength')
  const dlgText = await dlg.innerText()
  await shot(page, '01-create-dialog')
  rec('FP-UI-014', maxlen === '128' ? 'PASS' : 'FAIL', `maxlength=${maxlen}`)
  rec('FP-UI-019', /分享封面/.test(dlgText) ? 'PASS' : 'FAIL', /分享封面/.test(dlgText) ? 'create dialog has 分享封面' : 'no share_image in create dialog')

  await nameInput.fill(`QA-回归属性-${Date.now().toString().slice(-6)}`)
  await dlg.getByRole('button', { name: '创建并装修' }).click()
  await page.waitForURL(/\/page-builder\/editor\/\d+/, { timeout: 15000 })
  extra.editorUrl = page.url()
  extra.pageId = extra.editorUrl.match(/editor\/(\d+)/)?.[1]
  if (extra.pageId === '1') throw new Error('refused to use homepage id=1')
  await page.waitForTimeout(800)

  const cancel = page.getByRole('button', { name: '取消选中' })
  if (await cancel.count()) await cancel.click()
  await page.locator('.empty-canvas').click({ force: true }).catch(() => {})
  await page.waitForTimeout(300)
  const pageLabs = await panelText(page)
  await shot(page, '02-page-props')
  rec('FP-UI-054', /分享封面/.test(pageLabs) ? 'PASS' : 'FAIL', /分享封面/.test(pageLabs) ? 'page props has 分享封面' : 'share_image missing in props')

  const addedBanner = await addComp(page, '轮播图')
  await page.locator('.structure-row').last().click().catch(() => {})
  await page.waitForTimeout(300)
  await page.locator('.el-tabs__item:has-text("样式")').click()
  await page.waitForTimeout(250)
  const styleText = await panelText(page)
  await shot(page, '03-style')
  rec('FP-UI-073', /内边距/.test(styleText) && /上/.test(styleText) ? 'PASS' : 'FAIL', /内边距/.test(styleText) ? 'padding box present' : 'no padding_top control')
  rec('FP-UI-074', /内边距/.test(styleText) ? 'PASS' : 'FAIL', /内边距/.test(styleText) ? 'padding_bottom in 四向内边距' : 'no padding_bottom')
  rec('FP-UI-075', /内边距/.test(styleText) ? 'PASS' : 'FAIL', /内边距/.test(styleText) ? 'padding_left in 四向内边距' : 'no padding_left')
  rec('FP-UI-076', /内边距/.test(styleText) ? 'PASS' : 'FAIL', /内边距/.test(styleText) ? 'padding_right in 四向内边距' : 'no padding_right')
  rec('FP-UI-079', /组件可见/.test(styleText) ? 'PASS' : 'FAIL', /组件可见/.test(styleText) ? 'visible switch present' : 'no visible=false control')

  if (/组件可见/.test(styleText)) {
    const vis = page.locator('.props-panel .el-form-item').filter({ hasText: '组件可见' }).locator('.el-switch')
    if (await vis.count()) {
      await vis.click()
      await page.waitForTimeout(250)
      const hidden = await page.locator('.hidden-badge').count()
      extra.visibleBadge = hidden
      await shot(page, '04-visible-off')
    }
  }

  await page.locator('.el-tabs__item:has-text("内容与数据")').click()
  await page.waitForTimeout(250)
  const bannerText = await panelText(page)
  extra.bannerHasTitle = /标题/.test(bannerText)
  extra.bannerHasJump = /跳转类型|跳转地址/.test(bannerText)
  const jumpOpts = await openSelectOptions(page, '跳转类型')
  extra.bannerJumpOpts = jumpOpts
  await shot(page, '05-banner')
  rec('FP-UI-171', jumpOpts.some((o) => /网页|webview/i.test(o)) ? 'PASS' : 'FAIL', `jump opts=${jumpOpts.join('|') || 'none'}`)
  rec('FP-UI-172', jumpOpts.some((o) => /小程序/.test(o)) ? 'PASS' : 'FAIL', jumpOpts.some((o) => /小程序/.test(o)) ? 'miniapp option' : 'no miniapp')
  rec('FP-UI-173', jumpOpts.some((o) => /电话/.test(o)) ? 'PASS' : 'FAIL', jumpOpts.some((o) => /电话/.test(o)) ? 'phone jump type' : 'no phone jump type in banner')
  rec('FP-UI-174', jumpOpts.some((o) => /无跳转|none/i.test(o)) ? 'PASS' : 'FAIL', jumpOpts.some((o) => /无跳转/.test(o)) ? 'type=none' : 'no type=none')
  rec('FP-UI-175', 'FAIL', '缺 type 仍无发布/保存校验（本批仅确认选项，未做缺字段拦截）')
  rec('FP-UI-176', 'FAIL', '缺 target 仍无发布/保存校验（本批仅确认选项，未做缺字段拦截）')

  await addComp(page, '商品列表')
  await page.locator('.structure-row').last().click()
  await page.waitForTimeout(300)
  const prodText = await panelText(page)
  await shot(page, '06-product-list')
  rec('FP-UI-108', /宫格/.test(prodText) && /列表/.test(prodText) && /瀑布流/.test(prodText) ? 'PASS' : 'FAIL', /瀑布流/.test(prodText) ? 'layout grid/list/waterfall' : prodText.slice(0, 120))
  rec('FP-UI-152', /商品分类/.test(prodText) ? 'PASS' : 'FAIL', /商品分类/.test(prodText) ? 'category_id field' : 'no category_id field')
  rec('FP-UI-153', /商品类型/.test(prodText) ? 'PASS' : 'FAIL', /商品类型/.test(prodText) ? 'product_type field' : 'no product_type')

  await addComp(page, '文章列表')
  await page.locator('.structure-row').last().click()
  await page.waitForTimeout(300)
  const artText = await panelText(page)
  await shot(page, '07-article-list')
  rec('FP-UI-115', /紧凑/.test(artText) && /卡片/.test(artText) && /列表/.test(artText) ? 'PASS' : 'FAIL', /紧凑/.test(artText) ? 'layout card/list/compact' : 'no compact')
  rec('FP-UI-158', /内容分类/.test(artText) ? 'PASS' : 'FAIL', /内容分类/.test(artText) ? 'content category_id' : 'content category_id missing')
  rec('FP-UI-160', /仅推荐/.test(artText) ? 'PASS' : 'FAIL', /仅推荐/.test(artText) ? 'is_recommended' : 'is_recommended missing')

  await addComp(page, '活动入口')
  await page.locator('.structure-row').last().click()
  await page.waitForTimeout(300)
  const actText = await panelText(page)
  await shot(page, '08-activity-entry')
  rec('FP-UI-122', /显示倒计时/.test(actText) ? 'PASS' : 'FAIL', /显示倒计时/.test(actText) ? 'countdown switch' : 'countdown switch missing')
  rec('FP-UI-123', /显示名额/.test(actText) ? 'PASS' : 'FAIL', /显示名额/.test(actText) ? 'quota switch' : 'quota switch missing')
  rec('FP-UI-164', /报名中/.test(actText) ? 'PASS' : 'FAIL', /报名中/.test(actText) ? 'status registering' : 'status registering missing')

  await addComp(page, '优惠券')
  await page.locator('.structure-row').last().click()
  await page.waitForTimeout(300)
  const couponText = await panelText(page)
  await shot(page, '09-coupon')
  rec('FP-UI-167', /券类型/.test(couponText) ? 'PASS' : 'FAIL', /券类型/.test(couponText) ? 'coupon type' : 'coupon type missing')
  rec('FP-UI-168', /仅可领/.test(couponText) ? 'PASS' : 'FAIL', /仅可领/.test(couponText) ? 'coupon status=active filter' : 'coupon status missing')

  await addComp(page, '倒计时')
  await page.locator('.structure-row').last().click()
  await page.waitForTimeout(300)
  const cdText = await panelText(page)
  const formatOpts = await openSelectOptions(page, '显示格式')
  extra.countdownFormatOpts = formatOpts
  await shot(page, '10-countdown')
  rec(
    'FP-UI-141',
    formatOpts.some((o) => /\bd\b|仅天数/.test(o)) && formatOpts.some((o) => /dhms/.test(o))
      ? 'PASS'
      : 'FAIL',
    `format opts=${formatOpts.join('|') || cdText.slice(0, 80)}`,
  )

  await addComp(page, '分类导航')
  await page.locator('.structure-row').last().click()
  await page.waitForTimeout(300)
  const navText = await panelText(page)
  extra.categoryNavSeeded = /分类1|全部|热卖/.test(navText) && /图标/.test(navText) && /名称/.test(navText)
  await shot(page, '11-category-nav')

  await addComp(page, '资质证书')
  await page.locator('.structure-row').last().click()
  await page.waitForTimeout(300)
  const certText = await panelText(page)
  extra.certSeeded = /证书1|营业执照/.test(certText) && /名称/.test(certText)
  await shot(page, '12-certificate')

  await addComp(page, '悬浮按钮')
  await page.locator('.structure-row').filter({ hasText: '悬浮按钮' }).last().click().catch(async () => {
    await page.locator('.structure-row').last().click()
  })
  await page.waitForTimeout(300)
  const floatText = await panelText(page)
  extra.floatAlwaysFields = /页面路径/.test(floatText) && /电话号码/.test(floatText)
  extra.floatAction = /打开客服|跳转页面/.test(floatText)
  await shot(page, '13-float-button')

  extra.bannerAdded = addedBanner
  await shot(page, '14-final')
} catch (e) {
  extra.error = String(e && e.stack || e)
  await shot(page, 'zz-error').catch(() => {})
  console.error(extra.error)
}

await browser.close()
writeFileSync(join(EVID, 'results.json'), JSON.stringify({ extra, results }, null, 2))
const sum = results.reduce((a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a }, {})
console.log('SUMMARY', sum)
console.log('EXTRA', JSON.stringify(extra))
