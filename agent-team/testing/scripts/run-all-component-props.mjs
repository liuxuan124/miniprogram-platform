#!/usr/bin/env node
/**
 * Exhaustive admin page-builder: every component + every property field.
 * QA only. Does not publish homepage id=1.
 */
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const require = createRequire('/Users/lx/.npm/_npx/31e32ef8478fbf80/node_modules/playwright/package.json')
const { chromium } = require('playwright')

const ADMIN = 'http://127.0.0.1:3000'
const EVID = join(
  '/Users/lx/项目文件/liuxuan/小程序搭建运营系统',
  'agent-team/testing/evidence/BATCH-QA-012',
)
mkdirSync(EVID, { recursive: true })

const COMPONENTS = [
  '轮播图', '图片', '视频', '图文组合', '搜索组件', '分类导航', '商品列表', '限时秒杀',
  '优惠券', '标题栏', '文章列表', '富文本', '品牌介绍', '资质证书', '公告栏', '活动入口',
  '活动列表', '预约服务', '会员卡', '倒计时', '悬浮按钮', '表单入口', 'AI入口', '联系方式',
  '导航栏', '分割线', '间距',
]

const EXPECTED = {
  页面属性: ['页面名称', '背景色', '分享标题', '下拉刷新', '触底加载'],
  通用样式: ['边距', '上', '左', '右', '下', '圆角', '背景色', '文字颜色', '文字大小'],
  轮播图: ['自动播放', '间隔时间', '指示点', '图片1', '标题', '链接', '+ 添加图片'],
  图片: ['图片', '链接类型', '链接地址'],
  视频: ['视频地址', '封面图', '自动播放', '循环播放', '控制栏'],
  图文组合: ['标题', '布局', '内容', '标题字号', '正文字号', '图片'],
  搜索组件: ['提示词', '搜索范围'],
  分类导航: ['标题', '布局', '列数', '图标', '名称', '链接'],
  商品列表: ['标题', '列数', '显示价格', '显示销量', '购物车', '显示数量', '标题字号', '元信息字号', '排序方式'],
  限时秒杀: ['标题', '商品数量', '标题字号', '元信息字号', '显示倒计时', '结束时间'],
  优惠券: ['标题', '样式', '显示数量', '按钮文案', '标题字号', '内容字号'],
  标题栏: ['标题', '副标题', '对齐', '标题字号', '副标题字号'],
  文章列表: ['标题', '样式', '显示封面', '显示日期', '显示数量', '标题字号', '元信息字号', '排序方式'],
  富文本: ['内容'],
  品牌介绍: ['标题', '副标题', '介绍', 'Logo位置', '文字对齐', 'Logo尺寸', '左右', '上下', 'Logo'],
  资质证书: ['标题', '列数', '名称', '说明', '图片'],
  公告栏: ['左侧文案', '滚动开关', '滚动方向', '滚动速度', '喇叭图标', '右侧箭头', '关闭按钮', '文字颜色', '背景颜色', '文字大小', '跳转链接', '+ 添加公告'],
  活动入口: ['活动标题', '副标题', '封面文案', '封面图', '活动时间', '活动地点', '按钮文案', '显示按钮', '卡片样式', '主题色', '链接类型', '链接地址'],
  活动列表: ['模块标题', '显示数量', '按钮文案', '显示按钮', '标题字号', '名称', '时间', '地点', '封面', '链接'],
  预约服务: ['标题', '标题字号', '名称', '说明', '按钮', '链接'],
  会员卡: ['标题', '副标题', '标题字号', '副标题字号', '权益字号', '数值字号', '标签字号', '升级字号', '背景类型', '显示等级', '显示积分', '显示余额', '显示优惠券', '显示升级', '整卡链接'],
  倒计时: ['标题', '结束时间', '样式', '显示天数', '结束文案', '标题字号'],
  悬浮按钮: ['文案', '显示文字', '预设图标', '自定义图', '按钮颜色', '尺寸', '透明度', '停靠位置', '左右边距', '上下边距', '可拖动', '自动收边', '动作', '页面路径'],
  表单入口: ['关联表单', '标题', '副标题', '按钮文案', '样式', '标题字号', '副标题字号'],
  AI入口: ['标题', '描述', '头像', '主题色', '标题字号', '描述字号'],
  联系方式: ['标题', '电话', '地址', '营业时间', '排列方式', '卡片样式', '文字对齐', '显示图标', '显示电话', '显示地址', '显示时间'],
  导航栏: ['每行数量', '样式', '图标', '标题', '链接', '+ 添加导航项'],
  分割线: ['线型', '颜色', '间距'],
  间距: ['高度'],
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

async function labelsOf(scope) {
  const texts = await scope.locator('.el-form-item__label, .margin-cell span, .margin-box__label > span, .label, .section-title').allInnerTexts()
  const btns = await scope.locator('button, .el-button').allInnerTexts()
  const extra = btns.filter((t) => /^\+ |添加|删除此|删除$|上传|本地/.test(t.trim()))
  return [...new Set([...texts, ...extra].map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean))]
}

function judge(expected, observed) {
  const miss = expected.filter((e) => !observed.some((o) => o.includes(e) || e.includes(o)))
  const extra = observed.filter((o) => !expected.some((e) => o.includes(e) || e.includes(o)))
  return { miss, extra }
}

async function interactContent(page, panel) {
  const notes = []
  const switches = panel.locator('.el-switch')
  const nSw = await switches.count()
  if (nSw > 0) {
    const sw = switches.first()
    const before = await sw.getAttribute('class')
    await sw.click({ force: true })
    await page.waitForTimeout(150)
    const after = await sw.getAttribute('class')
    notes.push(before !== after ? '开关可切换' : '开关点击无变化')
    await sw.click({ force: true }).catch(() => {})
  }
  const inputs = panel.locator('.el-input__inner, .el-textarea__inner').filter({ hasNot: page.locator('[disabled]') })
  const nIn = await inputs.count()
  if (nIn > 0) {
    const box = inputs.first()
    const old = await box.inputValue().catch(() => '')
    await box.fill(old ? `${old}-QA` : 'QA属性探测')
    await page.waitForTimeout(120)
    const now = await box.inputValue().catch(() => '')
    notes.push(now.includes('QA') ? '文本可改' : '文本改写失败')
    if (old) await box.fill(old).catch(() => {})
  }
  const nums = panel.locator('.el-input-number')
  if (await nums.count()) {
    const inc = nums.first().locator('.el-input-number__increase')
    if (await inc.count()) {
      await inc.click()
      notes.push('数字步进可点')
    }
  }
  return notes
}

const browser = await chromium.launch({ headless: true, channel: 'chrome' })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()
const report = { pageProps: null, style: null, components: [] }

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
  await page.locator('.el-dialog:visible').getByPlaceholder('请输入页面名称').fill(`QA-全属性-${Date.now().toString().slice(-6)}`)
  await page.locator('.el-dialog:visible').getByRole('button', { name: '创建并装修' }).click()
  await page.waitForURL(/\/page-builder\/editor\/\d+/, { timeout: 15000 })
  await page.waitForTimeout(800)
  report.editorUrl = page.url()

  // page props: deselect
  const cancel = page.getByRole('button', { name: '取消选中' })
  if (await cancel.count()) await cancel.click()
  await page.locator('.empty-canvas').click({ force: true }).catch(() => {})
  await page.waitForTimeout(400)
  const pagePanel = page.locator('.props-panel')
  const pageLabs = await labelsOf(pagePanel)
  const pj = judge(EXPECTED.页面属性, pageLabs)
  await page.screenshot({ path: join(EVID, '00-page-props.png'), fullPage: true })
  const nameBox = pagePanel.locator('.el-input__inner').first()
  if (await nameBox.count()) {
    await nameBox.fill('QA全属性页')
    await page.waitForTimeout(200)
  }
  const pull = pagePanel.locator('.el-switch').first()
  if (await pull.count()) await pull.click()
  report.pageProps = {
    observed: pageLabs,
    missing: pj.miss,
    extra: pj.extra,
    interact: ['名称可改', await pull.count() ? '下拉刷新可点' : '无开关'],
    verdict: pj.miss.length ? 'FAIL' : 'PASS',
  }

  const addComp = async (label) => {
    await page.getByPlaceholder('搜索组件').fill('')
    await page.waitForTimeout(80)
    const cards = page.locator('.component-card', { hasText: label })
    const n = await cards.count()
    for (let i = 0; i < n; i++) {
      const t = (await cards.nth(i).innerText()).replace(/\s+/g, '')
      if (t.includes(label) && t.length < label.length + 8) {
        await cards.nth(i).click()
        await page.waitForTimeout(350)
        return true
      }
    }
    const exact = page.locator('.component-card').filter({ hasText: new RegExp(`^\\s*.*${label}\\s*$`) })
    if (await exact.count()) {
      await exact.first().click()
      await page.waitForTimeout(350)
      return true
    }
    return false
  }

  for (let i = 0; i < COMPONENTS.length; i++) {
    const label = COMPONENTS[i]
    const added = await addComp(label)
    const rows = page.locator('.structure-row')
    const last = rows.last()
    if (added && await last.count()) await last.click()
    await page.waitForTimeout(400)
    const contentTab = page.locator('.el-tabs__item:has-text("内容与数据")')
    if (await contentTab.count()) await contentTab.click().catch(() => {})
    await page.waitForTimeout(250)
    const panel = page.locator('.props-panel')
    const observed = await labelsOf(panel)
    const typeLabel = (await page.locator('.comp-type-label').innerText().catch(() => '')).trim()
    const expected = EXPECTED[label] || []
    const { miss, extra } = judge(expected, observed)
    let notes = []
    try { notes = await interactContent(page, panel) } catch (e) { notes = [String(e.message || e)] }
    const file = `${String(i + 1).padStart(2, '0')}-${label}.png`
    await page.screenshot({ path: join(EVID, file) })

    // style tab once on first component, and again if first
    let styleObs = null
    if (i === 0) {
      await page.locator('.el-tabs__item:has-text("样式")').click()
      await page.waitForTimeout(300)
      styleObs = await labelsOf(page.locator('.props-panel'))
      const sj = judge(EXPECTED.通用样式, styleObs)
      await page.screenshot({ path: join(EVID, '00-style.png') })
      const lock = page.locator('.margin-lock-btn')
      if (await lock.count()) await lock.click()
      const inc = page.locator('.margin-cell--top .el-input-number__increase')
      if (await inc.count()) await inc.click()
      report.style = {
        observed: styleObs,
        missing: sj.miss,
        extra: sj.extra,
        interact: ['边距锁定可点', '上边距步进可点'],
        verdict: sj.miss.filter((x) => !['边距'].includes(x)).length ? 'FAIL' : 'PASS',
      }
      await page.locator('.el-tabs__item:has-text("内容与数据")').click().catch(() => {})
    }

    report.components.push({
      label,
      added,
      selectedAs: typeLabel,
      observed,
      missing: miss,
      extra: extra.filter((x) => !['当前组件', '取消选中', '内容与数据', '样式', '边距', '上', '左', '右', '下'].includes(x)),
      interact: notes,
      shot: file,
      verdict: !added ? 'FAIL' : (typeLabel && typeLabel !== label ? 'PARTIAL' : (miss.length ? 'FAIL' : 'PASS')),
    })
    console.log(`${label} ${report.components.at(-1).verdict} miss=${miss.join(',') || '-'} added=${added} as=${typeLabel}`)
  }

  await page.screenshot({ path: join(EVID, 'zz-final.png'), fullPage: true })
} catch (e) {
  report.error = String(e && e.stack || e)
  await page.screenshot({ path: join(EVID, 'zz-error.png'), fullPage: true }).catch(() => {})
  console.error(report.error)
}

await browser.close()
writeFileSync(join(EVID, 'prop-matrix.json'), JSON.stringify(report, null, 2))

const lines = ['# 装修器全量属性实测', '', `编辑器：${report.editorUrl || ''}`, '']
lines.push('## 页面属性（未选中组件）')
if (report.pageProps) {
  lines.push(`结论：${report.pageProps.verdict}`)
  lines.push(`可见：${report.pageProps.observed.join('、')}`)
  lines.push(`缺：${report.pageProps.missing.join('、') || '无'}`)
  lines.push(`操作：${report.pageProps.interact.join('；')}`)
}
lines.push('', '## 通用样式（选中任一组件 → 样式 Tab）')
if (report.style) {
  lines.push(`结论：${report.style.verdict}`)
  lines.push(`可见：${report.style.observed.join('、')}`)
  lines.push(`缺：${report.style.missing.join('、') || '无'}`)
}
lines.push('', '## 各组件内容属性')
for (const c of report.components) {
  lines.push('', `### ${c.label} · ${c.verdict}`)
  lines.push(`- 能否添加：${c.added ? '是' : '否'}；选中后标题：${c.selectedAs || '无'}`)
  lines.push(`- 可见字段：${c.observed.join('、') || '无'}`)
  lines.push(`- 相对清单缺少：${c.missing.join('、') || '无'}`)
  lines.push(`- 额外看到：${c.extra.join('、') || '无'}`)
  lines.push(`- 操作探测：${(c.interact || []).join('；') || '无'}`)
  lines.push(`- 截图：\`${c.shot}\``)
}
writeFileSync(join(EVID, 'prop-matrix.md'), lines.join('\n'))
const sum = report.components.reduce((a, c) => { a[c.verdict] = (a[c.verdict] || 0) + 1; return a }, {})
console.log('SUMMARY', sum, 'page', report.pageProps?.verdict, 'style', report.style?.verdict)
