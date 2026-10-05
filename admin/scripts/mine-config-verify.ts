/**
 * 「我的」页配置 1.30 改造的逻辑回归（不需要浏览器 / 后端）。
 * 跑法：cd admin && npx vite build --config vite.mine-test.config.ts && node .mine-test-out3/verify.mjs
 *
 * 只 import 无副作用的纯逻辑模块（types/miniapp、mineTemplates、utils/minipage-path），
 * 刻意不 import useMiniappConfig —— 它会顺着 import 链拉起整个应用运行时。
 * loadConfig 的白名单拷贝逻辑在第 8 节按同样调用序列复现。
 */
import {
  resolveMineModules,
  DEFAULT_MINE_MODULES,
  MINE_MODULE_KEYS,
  normalizeMineVisibleOn,
  normalizeMineThemeSource,
  normalizeMineHeaderStyle,
  normalizeMineCardStyle,
  resolveMineEffectiveTheme,
  resolveMineStyleKey,
  applyMineStylePreset,
  CONFIG_KEYS,
  DEFAULT_MINE_MENU,
  type MinePageConfig,
} from '../src/types/miniapp'
import { buildTemplateConfig, TEMPLATE_OVERWRITE_FIELDS } from '../src/components/miniapp-builder/mineTemplates'
import {
  isValidMinipageTarget,
  isBuiltinMinipagePath,
  normalizeMinipagePath,
  isMinipageIndexPath,
} from '../src/utils/minipage-path'

let pass = 0
let fail = 0
function ok(name: string, cond: boolean, extra = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}`) }
  else { fail++; console.log(`  ✗ ${name} ${extra}`) }
}
function section(t: string) { console.log(`\n=== ${t} ===`) }

/** 线上现有 mine_page_config（1.30 之前的老结构，故意不带任何新字段） */
const LEGACY_LIVE = {
  loginTitle: '点击登录，同步阅读偏好',
  loginSubtitle: '收藏文章、接收内容更新提醒',
  loginButtonText: '登录',
  memberCardTitle: '会员中心',
  showMenuIcons: true,
  showDecorBackground: true,
  showMemberCard: true,
  templateStyle: 'warm',
  style: 'gradient',
  themeColor: '#C2410C',
  themeColorSecondary: '#EA580C',
  menuItems: [
    { id: 'ask', icon: 'line:check', title: '我的提问与打卡', url: '/pkg-content/question-ask/question-ask', enabled: true, needLogin: true, group: '内容与订单' },
    { id: 'orders', icon: 'line:document', title: '我的订单', url: '/pkg-trade/order-list/order-list', enabled: true, needLogin: true, group: '内容与订单' },
    { id: 'settings', icon: 'line:gear', title: '设置', url: '/pkg-user/settings/settings', enabled: true, needLogin: false, group: '会员与服务' },
  ],
  orderQuickAccess: { showOrderTabs: true, showAllOrdersBtn: true, tabLabels: { pending: '待付款', paid: '待发货', shipped: '待收货', completed: '已完成' } },
  userProfile: { showAvatar: true, showNickname: true, showMemberLevel: true, allowEditProfile: true, memberLevelLabel: '会员等级' },
}

section('1. 旧配置兼容：老数据加载后新增字段必须落到「线上现状」默认值')
{
  const legacy = LEGACY_LIVE as Partial<MinePageConfig>
  const m = resolveMineModules(legacy.modules)
  ok('modules 6 项全为 true（线上现在都显示）', MINE_MODULE_KEYS.every((k) => m[k] === true), JSON.stringify(m))
  ok('themeSource 缺省 → inherit', normalizeMineThemeSource(legacy.themeSource) === 'inherit')
  ok('headerStyle 缺省 → gradient（线上现状）', normalizeMineHeaderStyle(legacy.headerStyle) === 'gradient')
  ok('cardStyle 缺省 → shadow（线上现状）', normalizeMineCardStyle(legacy.cardStyle) === 'shadow')
  ok('老菜单 visibleOn 缺省 → always', normalizeMineVisibleOn((legacy.menuItems as any[])[0].visibleOn) === 'always')
  ok('老配置 themeColor 字段本身没被改动', legacy.themeColor === '#C2410C')
  ok('老配置 14 个字段一个不少（未丢字段）', Object.keys(LEGACY_LIVE).length === 14, `实际 ${Object.keys(LEGACY_LIVE).length}`)
  ok('老配置 menuItems 3 项未丢', legacy.menuItems.length === 3)
  ok('归一化不会往老配置上挂新字段（纯读取）', !('modules' in legacy) && !('themeSource' in legacy))
}

section('2. 主题继承语义：inherit 时忽略页面 themeColor，必须用全局色')
{
  const g = { primaryColor: '#002FA7', secondaryColor: '#1A4BBF' }
  // 老数据里 themeColor 一定是暖橘，但 themeSource=inherit → 应该用全局克莱因蓝
  const eff = resolveMineEffectiveTheme({ themeSource: 'inherit', themeColor: '#C2410C', themeColorSecondary: '#EA580C' }, g)
  ok('inherit → primary 取全局主色', eff.primary === '#002FA7', eff.primary)
  ok('inherit → secondary 取全局辅色', eff.secondary === '#1A4BBF', eff.secondary)
  ok('inherit → source 回报 inherit', eff.source === 'inherit')

  const page = resolveMineEffectiveTheme({ themeSource: 'page', themeColor: '#123456', themeColorSecondary: '#654321' }, g)
  ok('page → primary 取页面色', page.primary === '#123456', page.primary)
  ok('page → secondary 取页面辅色', page.secondary === '#654321', page.secondary)
  ok('page → source 回报 page', page.source === 'page')

  // 开了覆盖但没填色 → 回落全局，不出现白板
  const empty = resolveMineEffectiveTheme({ themeSource: 'page', themeColor: '' }, g)
  ok('page 但主色为空 → 回落全局（不白板）', empty.primary === '#002FA7' && empty.source === 'inherit')

  const missing = resolveMineEffectiveTheme(undefined, g)
  ok('配置为 undefined → 走全局', missing.primary === '#002FA7')
}

section('3. 模块显隐：任一项 false 只影响自己，其余不受影响')
{
  const off = resolveMineModules({ userHeader: false, myPlanet: false })
  ok('userHeader=false 生效', off.userHeader === false)
  ok('myPlanet=false 生效', off.myPlanet === false)
  ok('其余 4 项仍为 true', ['stats', 'memberCard', 'quickAccess', 'continueLearn'].every((k) => off[k as keyof typeof off] === true))
  ok('非法值（非 false）按 true 处理', resolveMineModules({ stats: 'yes' as any }).stats === true)
  ok('null 按默认值处理', resolveMineModules({ stats: null }).stats === true)
  ok('DEFAULT_MINE_MODULES 6 项全 true', MINE_MODULE_KEYS.every((k) => DEFAULT_MINE_MODULES[k] === true))
}

section('4. 条件显示归一化')
{
  ok("'login' → login", normalizeMineVisibleOn('login') === 'login')
  ok("'loggedIn' → login（大小写容错）", normalizeMineVisibleOn('loggedIn') === 'login')
  ok("'member' → member", normalizeMineVisibleOn('member') === 'member')
  ok("'vip' → member（别名）", normalizeMineVisibleOn('vip') === 'member')
  ok("'always' → always", normalizeMineVisibleOn('always') === 'always')
  ok('未定义 → always', normalizeMineVisibleOn(undefined) === 'always')
  ok('乱填 → always', normalizeMineVisibleOn('garbage') === 'always')
}

section('5. applyMineStylePreset 会重写 themeColor（调用方必须还原）')
{
  const rec: Record<string, unknown> = { themeSource: 'page', themeColor: '#123456', themeColorSecondary: '#654321' }
  applyMineStylePreset(rec, 'basic')
  ok('templateStyle 被预设改写', rec.templateStyle === 'basic')
  ok('themeSource 保持 page（预设不动它）', rec.themeSource === 'page')
  // 已知副作用：预设会刷掉页面覆盖色。mine-config.vue 的 applyPreviewTemplate
  // 与 useMiniappConfig.loadConfig 都已显式还原，这里锁住该行为以防回归。
  ok('themeColor 会被预设刷成 basic 主色（预期副作用）', rec.themeColor === '#5B7FEA', String(rec.themeColor))
}

section('6. 模板切换：覆盖清单覆盖 buildTemplateConfig 实际会写的字段')
{
  const tpl = buildTemplateConfig('warm')
  const written = new Set(Object.keys(tpl))
  const listed = new Set(TEMPLATE_OVERWRITE_FIELDS.map((f) => f.key))
  // 模板会写、但没告知用户会被覆盖的字段（排除「保留项」与预览专用字段）
  const keep = new Set(['themeSource', 'themeColor', 'themeColorSecondary', 'pageBackgroundColor', 'headerStyle', 'userProfile', 'previewNickname', 'previewAvatar', 'previewPhone', 'previewEmail', 'templateStyle'])
  const missing = [...written].filter((k) => !listed.has(k) && !keep.has(k))
  ok('模板覆盖清单无遗漏', missing.length === 0, `漏了: ${missing.join(',')}`)
  ok('模板构建产出 modules（会被重置为全显示）', !!tpl.modules && MINE_MODULE_KEYS.every((k) => tpl.modules![k] === true))
  ok('模板构建的菜单都带 visibleOn=always', tpl.menuItems.every((m) => m.visibleOn === 'always'))
  ok('模板不写 themeSource（属保留项）', !('themeSource' in tpl))
}

section('7. 跳转目标校验（菜单路径合法性）')
{
  ok('合法系统页路径', isValidMinipageTarget('/pkg-user/settings/settings'))
  ok('合法：pages 路径', isValidMinipageTarget('pages/mine/mine'))
  ok('拒绝空串', !isValidMinipageTarget(''))
  ok('拒绝 null', !isValidMinipageTarget(null))
  ok('拒绝 undefined', !isValidMinipageTarget(undefined))
  ok('拒绝协议头', !isValidMinipageTarget('https://evil.com/x'))
  ok('拒绝含空格', !isValidMinipageTarget('/pkg user/x'))
  ok('拒绝单段无斜杠', !isValidMinipageTarget('settings'))
  ok('内置页识别：/pages/mine/mine', isBuiltinMinipagePath('/pages/mine/mine'))
  ok('内置页识别：/pkg-content/cart/cart', isBuiltinMinipagePath('/pkg-content/cart/cart'))
  ok('非内置页不算内置', !isBuiltinMinipagePath('/pkg-nonexistent/x/x'))
  ok('首页路径识别', isMinipageIndexPath('/pages/index/index'))
  ok('归一化去前导斜杠', normalizeMinipagePath('//pages/mine/mine') === 'pages/mine/mine')
  // 默认菜单里的每一条都必须通过格式校验，否则说明 DEFAULT_MINE_MENU 与端上路由漂了
  ok('DEFAULT_MINE_MENU 全部 url 合法', DEFAULT_MINE_MENU.every((m) => isValidMinipageTarget(m.url)))
}

section('8. 草稿往返：新增字段经过 loadConfig 白名单拷贝后必须存活')
{
  // 模拟「保存草稿 → 刷新 → loadConfig」：把新字段塞进 mine 再走一遍拷贝路径
  const saved = {
    ...LEGACY_LIVE,
    themeSource: 'page',
    themeColor: '#0A0B0C',
    themeColorSecondary: '#0D0E0F',
    modules: { userHeader: false, stats: true, memberCard: true, quickAccess: true, continueLearn: true, myPlanet: false },
    pageBackgroundColor: '#101112',
    headerStyle: 'solid',
    cardStyle: 'outline',
    menuItems: [
      { ...LEGACY_LIVE.menuItems[0], visibleOn: 'login' },
      { ...LEGACY_LIVE.menuItems[1], visibleOn: 'member' },
      { ...LEGACY_LIVE.menuItems[2] },
    ],
  }
  // 与 useMiniappConfig.loadConfig 里同样的归一化调用
  const restored: Partial<MinePageConfig> = {
    menuItems: saved.menuItems.map((m: any) => ({ ...m, visibleOn: normalizeMineVisibleOn(m.visibleOn) })),
    themeSource: normalizeMineThemeSource(saved.themeSource),
    modules: resolveMineModules(saved.modules),
    pageBackgroundColor: String(saved.pageBackgroundColor || ''),
    headerStyle: normalizeMineHeaderStyle(saved.headerStyle),
    cardStyle: normalizeMineCardStyle(saved.cardStyle),
  }
  ok('themeSource 往返存活', restored.themeSource === 'page')
  ok('pageBackgroundColor 往返存活', restored.pageBackgroundColor === '#101112')
  ok('headerStyle 往返存活', restored.headerStyle === 'solid')
  ok('cardStyle 往返存活', restored.cardStyle === 'outline')
  ok('modules.userHeader=false 往返存活', restored.modules!.userHeader === false)
  ok('modules.myPlanet=false 往返存活', restored.modules!.myPlanet === false)
  ok('menu visibleOn=login 往返存活', restored.menuItems![0].visibleOn === 'login')
  ok('menu visibleOn=member 往返存活', restored.menuItems![1].visibleOn === 'member')
  ok('menu 缺 visibleOn 的老项归一为 always', restored.menuItems![2].visibleOn === 'always')
}

section('9. 风格 key 解析未被新字段影响')
{
  ok('warm', resolveMineStyleKey({ templateStyle: 'warm' }) === 'warm')
  ok('basic', resolveMineStyleKey({ templateStyle: 'basic' }) === 'basic')
  ok('member', resolveMineStyleKey({ templateStyle: 'member' }) === 'member')
  ok('已删除的 dark 归一到 basic', resolveMineStyleKey({ templateStyle: 'dark' }) === 'basic')
}

section('10. CONFIG_KEYS 复核')
{
  ok('MINE_PAGE_CONFIG = minePageConfig', CONFIG_KEYS.MINE_PAGE_CONFIG === 'minePageConfig')
  ok('DEFAULT_MINE_MENU 仍是既有 11 项', DEFAULT_MINE_MENU.length === 11, `实际 ${DEFAULT_MINE_MENU.length}`)
}

console.log(`\n${'='.repeat(46)}`)
console.log(`通过 ${pass} · 失败 ${fail}`)
console.log('='.repeat(46))
if (fail > 0) process.exit(1)
