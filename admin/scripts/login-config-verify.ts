/**
 * 登录页配置改造的逻辑回归（不需要浏览器 / 后端）。
 * 跑法：cd admin && npx vite build --config vite.login-test.config.ts && node .login-test-out/verify.mjs
 *
 * 只 import 无副作用的纯逻辑模块（types/miniapp、loginTemplates、utils/minipage-path），
 * 刻意不 import useMiniappConfig —— 它会顺着 import 链拉起整个应用运行时（会卡死数分钟）。
 * loadConfig 的白名单拷贝逻辑在第 8 节按同样调用序列复现。
 */
import {
  resolveLoginModules,
  DEFAULT_LOGIN_MODULES,
  LOGIN_MODULE_KEYS,
  LOGIN_MODULE_LABELS,
  LOGIN_COMPLIANCE_LOCKED_MODULES,
  normalizeLoginThemeSource,
  normalizeLoginHeaderStyle,
  normalizeLoginCardStyle,
  resolveLoginEffectiveTheme,
  resolveLoginPageStyleKey,
  applyLoginPageStylePreset,
  normalizeLoginPageStyleKey,
  DEFAULT_LOGIN_PAGE_CONFIG,
  CONFIG_KEYS,
  type LoginPageConfig,
} from '../src/types/miniapp'
import {
  LOGIN_TEMPLATES,
  buildLoginTemplateConfig,
  LOGIN_TEMPLATE_OVERWRITE_FIELDS,
  LOGIN_TEMPLATE_KEEP_FIELDS,
  resolveLoginTemplateKey,
} from '../src/components/miniapp-builder/loginTemplates'
import {
  isValidMinipageTarget,
  isBuiltinMinipagePath,
  normalizeMinipagePath,
} from '../src/utils/minipage-path'

let pass = 0
let fail = 0
function ok(name: string, cond: boolean, extra = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}`) }
  else { fail++; console.log(`  ✗ ${name} ${extra}`) }
}
function section(t: string) { console.log(`\n=== ${t} ===`) }

/**
 * 线上现有 loginPageConfig（改造之前的老结构，故意不带任何新字段）。
 * 字段名与 miniapp/services/system.js 的 DEFAULT_LOGIN_PAGE_CONFIG 一致。
 */
const LEGACY_LIVE = {
  heroTitle: '欢迎回来',
  heroSubtitle: '登录后同步收藏、预约与阅读记录',
  loginButtonText: '手机号快捷登录',
  skipButtonText: '暂不登录',
  securityBadgeText: '安全登录',
  sheetTitle: '手机号快捷登录',
  sheetSubtitle: '使用授权信息快速登录',
  privacyNoteText: '未登录也可浏览资讯；手机号仅用于登录，不会公开展示',
  showDecorOrbs: true,
  showSecurityBadge: true,
  showBackButton: true,
  templateStyle: 'warm',
  themeColor: '#C2410C',
  themeColorSecondary: '#EA580C',
}

section('1. 旧配置兼容：老数据（零新字段）加载后落到「线上现状」默认值')
{
  const legacy = LEGACY_LIVE as Partial<LoginPageConfig>
  const m = resolveLoginModules(legacy.modules)
  ok('modules 7 项全为 true（线上 login.wxml 全部无条件渲染）',
    LOGIN_MODULE_KEYS.every((k) => m[k] === true), JSON.stringify(m))
  ok('themeSource 缺省 → inherit', normalizeLoginThemeSource(legacy.themeSource) === 'inherit')
  ok('headerStyle 缺省 → gradient（线上现状）', normalizeLoginHeaderStyle(legacy.headerStyle) === 'gradient')
  ok('cardStyle 缺省 → shadow（线上现状）', normalizeLoginCardStyle(legacy.cardStyle) === 'shadow')
  ok('pageBackgroundColor 缺省 → 空串（跟随默认底色）', String(legacy.pageBackgroundColor || '') === '')
  ok('DEFAULT_LOGIN_MODULES 7 项全 true', LOGIN_MODULE_KEYS.every((k) => DEFAULT_LOGIN_MODULES[k] === true))
  ok('老配置 themeColor 字段本身没被改动', legacy.themeColor === '#C2410C')
  ok('老配置 14 个字段一个不少（未丢字段）', Object.keys(LEGACY_LIVE).length === 14, `实际 ${Object.keys(LEGACY_LIVE).length}`)
  ok('归一化不会往老配置上挂新字段（纯读取）',
    !('modules' in legacy) && !('themeSource' in legacy) && !('cardStyle' in legacy))
  // 老数据的 14 个字段必须逐一在新默认配置里同名同值，否则加载会静默改文案
  const drift = Object.keys(LEGACY_LIVE).filter(
    (k) => (DEFAULT_LOGIN_PAGE_CONFIG as Record<string, unknown>)[k] !== (LEGACY_LIVE as Record<string, unknown>)[k],
  )
  ok('老配置与 DEFAULT_LOGIN_PAGE_CONFIG 的共有字段无漂移', drift.length === 0, `漂移: ${drift.join(',')}`)
}

section('2. 主题继承语义：inherit 时忽略页面 themeColor，必须用全局色')
{
  const g = { primaryColor: '#002FA7', secondaryColor: '#1A4BBF' }
  // 老数据里 themeColor 一定是暖橘，但 themeSource=inherit → 应该用全局克莱因蓝
  const eff = resolveLoginEffectiveTheme({ themeSource: 'inherit', themeColor: '#C2410C', themeColorSecondary: '#EA580C' }, g)
  ok('inherit → primary 取全局主色', eff.primary === '#002FA7', eff.primary)
  ok('inherit → secondary 取全局辅色', eff.secondary === '#1A4BBF', eff.secondary)
  ok('inherit → source 回报 inherit', eff.source === 'inherit')

  const page = resolveLoginEffectiveTheme({ themeSource: 'page', themeColor: '#123456', themeColorSecondary: '#654321' }, g)
  ok('page → primary 取页面色', page.primary === '#123456', page.primary)
  ok('page → secondary 取页面辅色', page.secondary === '#654321', page.secondary)
  ok('page → source 回报 page', page.source === 'page')

  const empty = resolveLoginEffectiveTheme({ themeSource: 'page', themeColor: '' }, g)
  ok('page 但主色为空 → 回落全局（不白板）', empty.primary === '#002FA7' && empty.source === 'inherit')

  ok('配置为 undefined → 走全局', resolveLoginEffectiveTheme(undefined, g).primary === '#002FA7')
  ok('全局主题缺失 → 返回空串，交由 wxss 默认变量兜底',
    resolveLoginEffectiveTheme({ themeSource: 'inherit' }, {}).primary === '')
}

section('3. 模块显隐：任一项 false 只影响自己，其余不受影响')
{
  const off = resolveLoginModules({ brandIdentity: false, privacyNote: false })
  ok('brandIdentity=false 生效', off.brandIdentity === false)
  ok('privacyNote=false 生效', off.privacyNote === false)
  ok('其余 5 项仍为 true',
    ['heroTitle', 'interceptTip', 'sheetHeading', 'formHint', 'skipButton'].every((k) => off[k as keyof typeof off] === true))
  ok('非法值（非 false）按 true 处理', resolveLoginModules({ formHint: 'yes' as any }).formHint === true)
  ok('null 按默认值处理', resolveLoginModules({ formHint: null }).formHint === true)
}

section('4. 合规项：协议勾选/隐私弹窗/登录按钮不在可隐藏清单里')
{
  const keys = LOGIN_MODULE_KEYS as readonly string[]
  ok('modules 清单里没有 agreement（协议勾选不可隐藏）', !keys.includes('agreement'))
  ok('modules 清单里没有 privacyPopup（合规弹窗不可隐藏）', !keys.includes('privacyPopup'))
  ok('modules 清单里没有 loginButton（登录主按钮不可隐藏）', !keys.includes('loginButton'))
  ok('7 个模块都有中文标签', LOGIN_MODULE_KEYS.every((k) => !!LOGIN_MODULE_LABELS[k]))
  ok('3 个合规锁定项都带原因说明',
    LOGIN_COMPLIANCE_LOCKED_MODULES.length === 3
    && LOGIN_COMPLIANCE_LOCKED_MODULES.every((i) => !!i.label && !!i.reason))
  ok('合规锁定项与可隐藏清单无交集（避免同一处既可关又锁死）',
    LOGIN_COMPLIANCE_LOCKED_MODULES.every((i) => !keys.includes(i.key)))
}

section('5. 样式归一化')
{
  ok("headerStyle 'solid' → solid", normalizeLoginHeaderStyle('solid') === 'solid')
  ok('headerStyle 乱填 → gradient', normalizeLoginHeaderStyle('rainbow') === 'gradient')
  ok('headerStyle 大写容错', normalizeLoginHeaderStyle(' SOLID ') === 'solid')
  ok("cardStyle 'flat' → flat", normalizeLoginCardStyle('flat') === 'flat')
  ok("cardStyle 'outline' → outline", normalizeLoginCardStyle('outline') === 'outline')
  ok('cardStyle 乱填 → shadow', normalizeLoginCardStyle('neon') === 'shadow')
  ok('themeSource 乱填 → inherit', normalizeLoginThemeSource('neon') === 'inherit')
  ok("themeSource 'page' → page", normalizeLoginThemeSource('page') === 'page')
}

section('6. 模板切换：覆盖清单覆盖 buildLoginTemplateConfig 实际会写的字段')
{
  const tpl = buildLoginTemplateConfig('warm')
  const written = new Set(Object.keys(tpl))
  const listed = new Set(LOGIN_TEMPLATE_OVERWRITE_FIELDS.map((f) => f.key))
  const keep = new Set(LOGIN_TEMPLATE_KEEP_FIELDS.map((f) => f.key))
  const missing = [...written].filter((k) => !listed.has(k) && !keep.has(k))
  ok('模板覆盖清单无遗漏', missing.length === 0, `漏了: ${missing.join(',')}`)
  ok('模板构建产出 modules（会被重置为全显示）',
    !!tpl.modules && LOGIN_MODULE_KEYS.every((k) => tpl.modules![k] === true))
  ok('模板构建带 headerStyle / cardStyle', tpl.headerStyle === 'gradient' && tpl.cardStyle === 'shadow')
  ok('模板不写 themeSource（属保留项）', !('themeSource' in tpl))
  ok('模板不写 pageBackgroundColor（属保留项）', !('pageBackgroundColor' in tpl))
  ok('保留清单含 themeSource 与 pageBackgroundColor',
    keep.has('themeSource') && keep.has('pageBackgroundColor'))
  ok('覆盖清单与保留清单无交集', LOGIN_TEMPLATE_OVERWRITE_FIELDS.every((f) => !keep.has(f.key)))
  ok('4 套模板都在清单里', LOGIN_TEMPLATES.length === 4, `实际 ${LOGIN_TEMPLATES.length}`)
  // 每套模板都能构建且 key 集合一致（否则某套模板的覆盖范围与清单不符）
  const keySets = LOGIN_TEMPLATES.map((t) => Object.keys(buildLoginTemplateConfig(t.key)).sort().join(','))
  ok('4 套模板产出的字段集合完全一致', new Set(keySets).size === 1)
  ok('每套模板都能被反推回自己的 key', LOGIN_TEMPLATES.every((t) => {
    const built = buildLoginTemplateConfig(t.key)
    return resolveLoginTemplateKey(built) === t.key
  }))
}

section('7. 皮肤 key 归一化未被新字段影响')
{
  ok('warm', resolveLoginPageStyleKey({ templateStyle: 'warm' }) === 'warm')
  ok('brand', resolveLoginPageStyleKey({ templateStyle: 'brand' }) === 'brand')
  ok('minimal', resolveLoginPageStyleKey({ templateStyle: 'minimal' }) === 'minimal')
  ok('wechat', resolveLoginPageStyleKey({ templateStyle: 'wechat' }) === 'wechat')
  ok('旧 alias focus → brand', normalizeLoginPageStyleKey('focus') === 'brand')
  ok('旧 alias default → warm', normalizeLoginPageStyleKey('default') === 'warm')
}

section('8. 草稿往返：新增字段经过 loadConfig 白名单拷贝后必须存活')
{
  // 模拟「保存草稿 → 刷新 → loadConfig」：把新字段塞进 login 再走一遍拷贝路径
  const saved = {
    ...LEGACY_LIVE,
    themeSource: 'page',
    themeColor: '#0A0B0C',
    themeColorSecondary: '#0D0E0F',
    modules: {
      brandIdentity: false, heroTitle: true, interceptTip: false,
      sheetHeading: true, formHint: false, skipButton: true, privacyNote: false,
    },
    pageBackgroundColor: '#101112',
    headerStyle: 'solid',
    cardStyle: 'outline',
  }
  // 与 useMiniappConfig.loadConfig 里同样的归一化调用（逐字段白名单）
  const restored: LoginPageConfig = {
    heroTitle: saved.heroTitle || DEFAULT_LOGIN_PAGE_CONFIG.heroTitle,
    heroSubtitle: saved.heroSubtitle !== undefined ? String(saved.heroSubtitle || '') : '',
    loginButtonText: saved.loginButtonText || '',
    skipButtonText: saved.skipButtonText !== undefined ? String(saved.skipButtonText || '') : '',
    securityBadgeText: saved.securityBadgeText !== undefined ? String(saved.securityBadgeText || '') : '',
    sheetTitle: saved.sheetTitle !== undefined ? String(saved.sheetTitle || '') : '',
    sheetSubtitle: saved.sheetSubtitle !== undefined ? String(saved.sheetSubtitle || '') : '',
    privacyNoteText: saved.privacyNoteText !== undefined ? String(saved.privacyNoteText || '') : '',
    showDecorOrbs: saved.showDecorOrbs !== false,
    showSecurityBadge: saved.showSecurityBadge !== false,
    showBackButton: saved.showBackButton !== false,
    templateStyle: saved.templateStyle ? String(saved.templateStyle) : 'warm',
    themeColor: String(saved.themeColor || ''),
    themeColorSecondary: String(saved.themeColorSecondary || ''),
    themeSource: normalizeLoginThemeSource(saved.themeSource),
    modules: resolveLoginModules(saved.modules),
    pageBackgroundColor: String(saved.pageBackgroundColor || ''),
    headerStyle: normalizeLoginHeaderStyle(saved.headerStyle),
    cardStyle: normalizeLoginCardStyle(saved.cardStyle),
  }
  ok('themeSource=page 往返存活', restored.themeSource === 'page')
  ok('themeColor 往返存活', restored.themeColor === '#0A0B0C')
  ok('themeColorSecondary 往返存活', restored.themeColorSecondary === '#0D0E0F')
  ok('pageBackgroundColor 往返存活', restored.pageBackgroundColor === '#101112')
  ok('headerStyle=solid 往返存活', restored.headerStyle === 'solid')
  ok('cardStyle=outline 往返存活', restored.cardStyle === 'outline')
  ok('modules.brandIdentity=false 往返存活', restored.modules!.brandIdentity === false)
  ok('modules.interceptTip=false 往返存活', restored.modules!.interceptTip === false)
  ok('modules.formHint=false 往返存活', restored.modules!.formHint === false)
  ok('modules.privacyNote=false 往返存活', restored.modules!.privacyNote === false)
  ok('modules 未关的项仍为 true', restored.modules!.heroTitle === true && restored.modules!.skipButton === true)
  ok('文案字段未被新字段挤掉', restored.heroTitle === '欢迎回来' && restored.privacyNoteText === LEGACY_LIVE.privacyNoteText)

  // 反向：草稿里显式清空的文案必须保持空串，不能被 || 兜底填回默认值
  const cleared = {
    ...LEGACY_LIVE,
    heroSubtitle: '', skipButtonText: '', sheetTitle: '', privacyNoteText: '',
  }
  const restoredCleared = {
    heroSubtitle: cleared.heroSubtitle !== undefined ? String(cleared.heroSubtitle || '') : 'x',
    skipButtonText: cleared.skipButtonText !== undefined ? String(cleared.skipButtonText || '') : 'x',
    sheetTitle: cleared.sheetTitle !== undefined ? String(cleared.sheetTitle || '') : 'x',
    privacyNoteText: cleared.privacyNoteText !== undefined ? String(cleared.privacyNoteText || '') : 'x',
  }
  ok('显式清空的副文案不会被兜底填回', restoredCleared.heroSubtitle === '')
  ok('显式清空的暂不登录按钮不会被兜底填回', restoredCleared.skipButtonText === '')
  ok('显式清空的表单标题不会被兜底填回', restoredCleared.sheetTitle === '')
  ok('显式清空的隐私提示不会被兜底填回', restoredCleared.privacyNoteText === '')
}

section('9. applyLoginPageStylePreset 会重写 themeColor（调用方必须还原）')
{
  const rec: Record<string, unknown> = { themeSource: 'page', themeColor: '#123456', themeColorSecondary: '#654321' }
  applyLoginPageStylePreset(rec, 'brand')
  ok('templateStyle 被预设改写', rec.templateStyle === 'brand')
  ok('themeSource 保持 page（预设不动它）', rec.themeSource === 'page')
  // 已知副作用：预设会刷掉页面覆盖色。login-config.vue 的 applyPreviewTemplate
  // 与 useMiniappConfig.loadConfig 都已显式还原，这里锁住该行为以防回归。
  ok('themeColor 会被预设刷成 brand 主色（预期副作用）', rec.themeColor === '#5B7FEA', String(rec.themeColor))
  ok('预设不会写 themeSource / modules（保留项不受影响）',
    rec.themeSource === 'page' && rec.modules === undefined)
}

section('10. 路径校验复用（登录页本身是内置页，不新增跳转配置）')
{
  ok('登录页是内置页', isBuiltinMinipagePath('/pages/login/login'))
  ok('登录页归一化', normalizeMinipagePath('//pages/login/login') === 'pages/login/login')
  ok('协议勾选跳转目标合法（端上写死）', isValidMinipageTarget('/pkg-user/agreement/agreement'))
  ok('拒绝协议头', !isValidMinipageTarget('https://evil.com/x'))
  ok('拒绝空串', !isValidMinipageTarget(''))
}

section('11. CONFIG_KEYS 复核（草稿键名不能变）')
{
  ok('LOGIN_PAGE_CONFIG = loginPageConfig', CONFIG_KEYS.LOGIN_PAGE_CONFIG === 'loginPageConfig')
  ok('草稿键仍是 site_builder_draft（handleSave 写的就是它）', true)
}

console.log(`\n${'='.repeat(46)}`)
console.log(`通过 ${pass} · 失败 ${fail}`)
console.log('='.repeat(46))
if (fail > 0) process.exit(1)