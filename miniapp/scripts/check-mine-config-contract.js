/**
 * 小程序端「我的」页配置归一化回归（纯逻辑，无需小程序运行时）。
 * 跑法：cd miniapp && node scripts/check-mine-config-contract.js
 *
 * 验证 system.js 的 1.30 归一化与 admin/src/types/miniapp.ts 同语义。
 */
const path = require('path')
const Module = require('module')

// system.js 顶层 require 了 wx / StorageUtil 等小程序运行时，这里只取纯函数，
// 做法是把它当源码读出来、在沙箱里只注入需要的依赖。
const SystemService = require('../services/system')

let pass = 0
let fail = 0
function ok(name, cond, extra = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}`) }
  else { fail++; console.log(`  ✗ ${name} ${extra}`) }
}
function section(t) { console.log(`\n=== ${t} ===`) }

section('1. 导出面：1.30 新增的归一化函数都已导出')
{
  const required = [
    'resolveMineEffectiveTheme', 'resolveMineModules', 'normalizeMineVisibleOn',
    'normalizeMineThemeSource', 'normalizeMineHeaderStyle', 'normalizeMineCardStyle',
    'MINE_MODULE_DEFAULTS', 'fetchMinePageConfig',
  ]
  for (const k of required) {
    ok(`导出 ${k}`, SystemService[k] !== undefined)
  }
}

section('2. 模块显隐：老配置（无 modules）→ 6 项全 true（= 线上现状）')
{
  const norm = SystemService.normalizeMinePageConfig({ loginTitle: 'x' })
  const m = SystemService.resolveMineModules(norm.modules)
  ok('6 项全为 true', Object.values(m).every((v) => v === true), JSON.stringify(m))
  ok('userHeader 存在', m.userHeader === true)
  ok('myPlanet 存在', m.myPlanet === true)
  ok('MINE_MODULE_DEFAULTS 6 项全 true',
    Object.values(SystemService.MINE_MODULE_DEFAULTS).every((v) => v === true))
  ok('DEFAULT_MINE_PAGE_CONFIG 带 modules 归一化后仍全 true',
    Object.values(SystemService.resolveMineModules(SystemService.DEFAULT_MINE_PAGE_CONFIG.modules)).every((v) => v === true))
}

section('3. 主题继承：inherit 时用全局色，page 时用页面色')
{
  const g = { primaryColor: '#002FA7', secondaryColor: '#1A4BBF' }
  const legacy = { themeColor: '#C2410C', themeColorSecondary: '#EA580C' } // 老数据必带 themeColor
  const eff = SystemService.resolveMineEffectiveTheme(legacy, g)
  ok('无 themeSource → 判定为 inherit', eff.source === 'inherit')
  ok('inherit 忽略页面 themeColor，取全局主色', eff.primary === '#002FA7', eff.primary)
  ok('inherit 取全局辅色', eff.secondary === '#1A4BBF', eff.secondary)

  const page = SystemService.resolveMineEffectiveTheme({ themeSource: 'page', themeColor: '#123456', themeColorSecondary: '#654321' }, g)
  ok('page → 用页面主色', page.primary === '#123456')
  ok('page → 用页面辅色', page.secondary === '#654321')

  const noColor = SystemService.resolveMineEffectiveTheme({ themeSource: 'page', themeColor: '' }, g)
  ok('page 但主色为空 → 回落全局（不白板）', noColor.primary === '#002FA7' && noColor.source === 'inherit')

  const noTheme = SystemService.resolveMineEffectiveTheme(legacy, {})
  ok('全局主题缺失 → 返回空串，交由 wxss 默认变量兜底', noTheme.primary === '')
}

section('4. 条件显示与样式归一化')
{
  ok("'login' → login", SystemService.normalizeMineVisibleOn('login') === 'login')
  ok("'vip' → member", SystemService.normalizeMineVisibleOn('vip') === 'member')
  ok('未定义 → always', SystemService.normalizeMineVisibleOn(undefined) === 'always')
  ok('headerStyle 未定义 → gradient（线上现状）', SystemService.normalizeMineHeaderStyle(undefined) === 'gradient')
  ok("headerStyle 'solid' → solid", SystemService.normalizeMineHeaderStyle('solid') === 'solid')
  ok('cardStyle 未定义 → shadow（线上现状）', SystemService.normalizeMineCardStyle(undefined) === 'shadow')
  ok("cardStyle 'outline' → outline", SystemService.normalizeMineCardStyle('outline') === 'outline')
}

section('5. normalizeMinePageConfig：老结构不丢字段 + 新字段归位')
{
  const legacy = {
    loginTitle: '点击登录，同步阅读偏好',
    loginSubtitle: '收藏文章、接收内容更新提醒',
    memberCardTitle: '会员中心',
    showMenuIcons: true,
    showDecorBackground: true,
    showMemberCard: true,
    templateStyle: 'warm',
    style: 'gradient',
    themeColor: '#C2410C',
    themeColorSecondary: '#EA580C',
    menuItems: [
      { id: 'ask', title: '我的提问与打卡', url: '/pkg-content/question-ask/question-ask', enabled: true, needLogin: true, group: '内容与订单' },
    ],
    orderQuickAccess: { showOrderTabs: true, showAllOrdersBtn: true, tabLabels: { pending: '待付款', paid: '待发货', shipped: '待收货', completed: '已完成' } },
    userProfile: { showAvatar: true, showNickname: true, showMemberLevel: true, allowEditProfile: true, memberLevelLabel: '会员等级' },
  }
  const n = SystemService.normalizeMinePageConfig(legacy)
  ok('loginTitle 保留', n.loginTitle === legacy.loginTitle)
  ok('memberCardTitle 保留', n.memberCardTitle === legacy.memberCardTitle)
  ok('templateStyle 保留', n.templateStyle === 'warm')
  ok('themeColor 保留（不被归一化改写）', n.themeColor === '#C2410C')
  ok('menuItems 保留', n.menuItems.length === 1)
  ok('菜单原有字段未丢（needLogin/group/enabled）',
    n.menuItems[0].needLogin === true && n.menuItems[0].group === '内容与订单' && n.menuItems[0].enabled === true)
  ok('老菜单补上 visibleOn=always', n.menuItems[0].visibleOn === 'always')
  ok('orderQuickAccess.tabLabels 完整',
    n.orderQuickAccess.tabLabels.pending === '待付款' && n.orderQuickAccess.tabLabels.completed === '已完成')
  ok('userProfile 完整', n.userProfile.memberLevelLabel === '会员等级')
  ok('新字段 themeSource 归位为 inherit', n.themeSource === 'inherit')
  ok('新字段 headerStyle 归位为 gradient', n.headerStyle === 'gradient')
  ok('新字段 cardStyle 归位为 shadow', n.cardStyle === 'shadow')
  ok('新字段 pageBackgroundColor 归位为空串', n.pageBackgroundColor === '')
  ok('新字段 modules 6 项全 true', Object.values(n.modules).every((v) => v === true))
}

section('6. 会员模块 gate 关闭时，会员卡模块也必须一起关')
{
  const gated = SystemService.applyMemberModuleGate(
    SystemService.normalizeMinePageConfig({ menuItems: [{ id: 'a', title: '会员中心', url: '/pkg-user/member-center/member-center', enabled: true }] }),
    [{ key: 'member', enabled: false }],
  )
  ok('showMemberCard 被 gate 关闭', gated.showMemberCard === false)
  ok('modules.memberCard 同步关闭（否则空卡会露出来）', gated.modules.memberCard === false, JSON.stringify(gated.modules))
  ok('会员菜单项被过滤', gated.menuItems.every((m) => m.title !== '会员中心'))
  ok('其余模块不受 gate 影响', gated.modules.stats === true && gated.modules.myPlanet === true)
}

section('7. 菜单 enabled 过滤（老行为不回归）')
{
  const n = SystemService.normalizeMinePageConfig({
    menuItems: [
      { id: 'a', title: '开启的', url: '/pkg-user/settings/settings', enabled: true },
      { id: 'b', title: '关掉的', url: '/pkg-user/feedback/feedback', enabled: false },
      { id: 'c', title: '没写 enabled', url: '/pkg-content/join/join' },
    ],
  })
  ok('enabled=false 保留在归一化结果里（过滤发生在 fetch 阶段）', n.menuItems.length === 3)
  ok('关掉项确实标着 false', n.menuItems[1].enabled === false)
  ok('未写 enabled 的项原样保留 undefined', n.menuItems[2].enabled === undefined)
}

console.log(`\n${'='.repeat(46)}`)
console.log(`通过 ${pass} · 失败 ${fail}`)
console.log('='.repeat(46))
if (fail > 0) process.exit(1)
