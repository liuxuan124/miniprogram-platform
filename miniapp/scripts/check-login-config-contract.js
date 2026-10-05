/**
 * 小程序端「登录」页配置归一化回归（纯逻辑，无需小程序运行时）。
 * 跑法：cd miniapp && node scripts/check-login-config-contract.js
 *
 * 验证 system.js 的登录页归一化与 admin/src/types/miniapp.ts 同语义，
 * 并静态检查 login.wxml / login.wxss / login.js 确实消费了这些新字段
 * （后台能选、端上不生效是最典型的「假功能」）。
 */
const fs = require('fs')
const path = require('path')

const SystemService = require('../services/system')

const PAGE_DIR = path.join(__dirname, '..', 'pages', 'login')
const readWxml = () => fs.readFileSync(path.join(PAGE_DIR, 'login.wxml'), 'utf8')
const readWxss = () => fs.readFileSync(path.join(PAGE_DIR, 'login.wxss'), 'utf8')
const readJs = () => fs.readFileSync(path.join(PAGE_DIR, 'login.js'), 'utf8')

let pass = 0
let fail = 0
function ok(name, cond, extra = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}`) }
  else { fail++; console.log(`  ✗ ${name} ${extra}`) }
}
function section(t) { console.log(`\n=== ${t} ===`) }

section('1. 导出面：登录页新增的归一化函数都已导出')
{
  const required = [
    'resolveLoginEffectiveTheme', 'resolveLoginModules', 'normalizeLoginThemeSource',
    'normalizeLoginHeaderStyle', 'normalizeLoginCardStyle',
    'LOGIN_MODULE_DEFAULTS', 'normalizeLoginPageConfig', 'fetchLoginPageConfig',
  ]
  for (const k of required) {
    ok(`导出 ${k}`, SystemService[k] !== undefined)
  }
}

section('2. 模块显隐：老配置（无 modules）→ 7 项全 true（= 线上现状）')
{
  const m = SystemService.resolveLoginModules(undefined)
  ok('7 项全为 true', Object.values(m).every((v) => v === true), JSON.stringify(m))
  ok('brandIdentity 存在', m.brandIdentity === true)
  ok('privacyNote 存在', m.privacyNote === true)
  ok('LOGIN_MODULE_DEFAULTS 7 项全 true',
    Object.values(SystemService.LOGIN_MODULE_DEFAULTS).every((v) => v === true))
  ok('DEFAULT_LOGIN_PAGE_CONFIG 归一化后 modules 仍全 true',
    Object.values(SystemService.resolveLoginModules(SystemService.DEFAULT_LOGIN_PAGE_CONFIG.modules))
      .every((v) => v === true))
}

section('3. 主题继承：inherit 用全局色，page 用页面色（与管理端同语义）')
{
  const g = { primaryColor: '#002FA7', secondaryColor: '#1A4BBF' }
  const legacy = { themeColor: '#C2410C', themeColorSecondary: '#EA580C' } // 老数据必带 themeColor
  const eff = SystemService.resolveLoginEffectiveTheme(legacy, g)
  ok('无 themeSource → 判定为 inherit', eff.source === 'inherit')
  ok('inherit 忽略页面 themeColor，取全局主色', eff.primary === '#002FA7', eff.primary)
  ok('inherit 取全局辅色', eff.secondary === '#1A4BBF', eff.secondary)

  const page = SystemService.resolveLoginEffectiveTheme(
    { themeSource: 'page', themeColor: '#123456', themeColorSecondary: '#654321' }, g)
  ok('page → 用页面主色', page.primary === '#123456')
  ok('page → 用页面辅色', page.secondary === '#654321')

  const noColor = SystemService.resolveLoginEffectiveTheme({ themeSource: 'page', themeColor: '' }, g)
  ok('page 但主色为空 → 回落全局（不白板）', noColor.primary === '#002FA7' && noColor.source === 'inherit')

  const noTheme = SystemService.resolveLoginEffectiveTheme(legacy, {})
  ok('全局主题缺失 → 空串，交由 wxss 默认变量兜底', noTheme.primary === '')
}

section('4. 样式归一化（缺省一律 = 线上现状）')
{
  ok('themeSource 未定义 → inherit', SystemService.normalizeLoginThemeSource(undefined) === 'inherit')
  ok("themeSource 'page' → page", SystemService.normalizeLoginThemeSource('page') === 'page')
  ok('headerStyle 未定义 → gradient', SystemService.normalizeLoginHeaderStyle(undefined) === 'gradient')
  ok("headerStyle 'solid' → solid", SystemService.normalizeLoginHeaderStyle('solid') === 'solid')
  ok('cardStyle 未定义 → shadow', SystemService.normalizeLoginCardStyle(undefined) === 'shadow')
  ok("cardStyle 'flat' → flat", SystemService.normalizeLoginCardStyle('flat') === 'flat')
  ok("cardStyle 'outline' → outline", SystemService.normalizeLoginCardStyle('outline') === 'outline')
}

section('5. normalizeLoginPageConfig：老结构不丢字段 + 新字段归位')
{
  // 线上现有结构，零新字段
  const legacy = {
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
  const n = SystemService.normalizeLoginPageConfig(legacy)
  ok('heroTitle 保留', n.heroTitle === legacy.heroTitle)
  ok('heroSubtitle 保留', n.heroSubtitle === legacy.heroSubtitle)
  ok('privacyNoteText 保留', n.privacyNoteText === legacy.privacyNoteText)
  ok('templateStyle 保留', n.templateStyle === 'warm')
  ok('themeColor 保留（不被归一化改写）', n.themeColor === '#C2410C')
  ok('styleKey 解析为 warm', n.styleKey === 'warm')
  ok('老数据 14 个字段一个不少',
    Object.keys(legacy).every((k) => n[k] === legacy[k]), '有字段被改写')
  ok('新字段 themeSource 归位为 inherit', n.themeSource === 'inherit')
  ok('新字段 headerStyle 归位为 gradient', n.headerStyle === 'gradient')
  ok('新字段 cardStyle 归位为 shadow', n.cardStyle === 'shadow')
  ok('新字段 pageBackgroundColor 归位为空串', n.pageBackgroundColor === '')
  ok('新字段 modules 7 项全 true', Object.values(n.modules).every((v) => v === true))

  // 显式清空的文案必须保持空串，不能被默认值填回
  const cleared = SystemService.normalizeLoginPageConfig({ heroSubtitle: '', skipButtonText: '' })
  ok('显式清空的副文案保持空串', cleared.heroSubtitle === '')
  ok('显式清空的暂不登录按钮保持空串', cleared.skipButtonText === '')
}

section('6. 合规项：协议勾选 / 隐私弹窗 / 登录按钮不可被模块开关隐藏')
{
  const wxml = readWxml()
  const modules = SystemService.resolveLoginModules({
    agreement: false, privacyPopup: false, loginButton: false, brandIdentity: false,
  })
  // 即使配置里塞了这些 key，归一化后也必须只剩 7 项（多余的被丢弃）
  ok('modules 归一化后恰好 7 项', Object.keys(modules).length === 7, Object.keys(modules).join(','))
  ok('配置里塞 agreement=false 不产生该键', !('agreement' in modules))
  ok('配置里塞 privacyPopup=false 不产生该键', !('privacyPopup' in modules))
  ok('配置里塞 loginButton=false 不产生该键', !('loginButton' in modules))
  ok('正常模块 brandIdentity=false 仍生效', modules.brandIdentity === false)

  // wxml 静态检查：协议勾选按钮与隐私弹窗不受任何 modules.* 条件包裹
  ok('wxml 含 agreePrivacyAuthorization 授权按钮',
    wxml.includes('open-type="agreePrivacyAuthorization"'))
  ok('wxml 含隐私弹层 showPrivacyPopup', wxml.includes('wx:if="{{showPrivacyPopup}}"'))
  ok('wxml 含隐私弹层的同意按钮 privacy-agree-btn', wxml.includes('id="privacy-agree-btn"'))
  ok('wxml 含主按钮 getPhoneNumber', wxml.includes('open-type="getPhoneNumber"'))

  // 逐块检查：协议勾选所在的 view 不能被 modules.* 包住
  const agreementIdx = wxml.indexOf('class="agreement ')
  ok('协议勾选块存在', agreementIdx > 0)
  const beforeAgreement = wxml.slice(Math.max(0, agreementIdx - 400), agreementIdx)
  ok('协议勾选块前最近的 block 不是 modules.agreement 条件',
    !/block wx:if="\{\{modules\.[^"]*agreement[^"]*\}\}"[\s\S]*$/.test(beforeAgreement))

  const js = readJs()
  ok('login.js 的合规校验仍在（agreePrivacy 拦截）',
    js.includes('if (!this.data.agreePrivacy)'))
  ok('login.js 未勾选时强制弹隐私弹窗', js.includes('showPrivacyPopup: true'))
  ok('login.js 仍强制拉起授权 code', js.includes('AuthService.prefetchLoginCodeSafely()'))
  ok('login.js 仍保留勾选回调', js.includes('onAgreePrivacyAuthorization'))
  ok('login.js 仍保留取消勾选回调', js.includes('onUncheckPrivacy'))
}

section('7. 端上真正消费新字段（防止「后台能选、端上不生效」的假功能）')
{
  const wxml = readWxml()
  const wxss = readWxss()
  const js = readJs()

  // 7 个模块在 wxml 里都有 wx:if 整块包裹
  const keys = Object.keys(SystemService.LOGIN_MODULE_DEFAULTS)
  for (const k of keys) {
    ok(`wxml 用 modules.${k} 做整块显隐`, wxml.includes(`wx:if="{{modules.${k}}}"`))
  }
  // 主题来源 → themed 类 → wxss 规则
  ok('wxml 根节点带 lg-header--{{headerStyle}}', wxml.includes('lg-header--{{headerStyle}}'))
  ok('wxml 根节点带 lg-card--{{cardStyle}}', wxml.includes('lg-card--{{cardStyle}}'))
  ok('wxml 根节点按 theme.source 带 lg-page--themed', wxml.includes('lg-page--themed'))
  ok('wxml 根节点注入 loginThemeStyle', wxml.includes('style="{{loginThemeStyle'))
  ok('wxml 根节点注入 loginPageBg', wxml.includes('loginPageBg'))

  // login.js 真的算了 theme 并注入 CSS 变量
  ok('login.js 读取 cfg.theme 注入 CSS 变量', js.includes('theme.primary') && js.includes('--lg-brand'))
  ok('login.js 用 resolveLoginModules 口径的 modules 覆盖', js.includes('DEFAULT_LOGIN_MODULES'))
  ok('login.js 下发 headerStyle', js.includes('headerStyle: cfg.headerStyle'))
  ok('login.js 下发 cardStyle', js.includes('cardStyle: cfg.cardStyle'))
  ok('login.js 下发 loginPageBg', js.includes('loginPageBg: cfg.pageBackgroundColor'))
  ok('login.js 全局色为空时不注入空变量', js.includes('if (theme && theme.primary)'))

  // wxss 必须真的消费这些变量 / 类，否则改了也不生效
  ok('wxss 定义 --lg-brand 兜底为全局 --brand',
    /--lg-brand:\s*var\(--brand\)/.test(wxss))
  ok('wxss 主按钮消费 --lg-brand', /\.login-button[\s\S]*?var\(--lg-brand\)/.test(wxss))
  ok('wxss 协议链接消费 --lg-brand', /\.agreement__link[\s\S]*?var\(--lg-brand\)/.test(wxss))
  ok('wxss themed 下品牌区渐变消费 --lg-brand-2（辅色真正生效）',
    /\.lg-page--themed \.brand-hero[\s\S]*?var\(--lg-brand-2\)/.test(wxss))
  ok('wxss 有 lg-page--themed 覆盖规则', wxss.includes('.lg-page--themed .login-button'))
  ok('wxss 有 lg-header--solid 规则', wxss.includes('.lg-header--solid .login-backdrop'))
  ok('wxss 有 lg-card--flat 规则', wxss.includes('.lg-card--flat .login-sheet'))
  ok('wxss 有 lg-card--outline 规则', wxss.includes('.lg-card--outline .login-sheet'))
  // themed 必须排在 4 套皮肤之后才能靠「同特异性后者胜」接管颜色
  const themedIdx = wxss.indexOf('.lg-page--themed .login-button')
  const wechatIdx = wxss.indexOf('.lg-page--wechat .login-button')
  ok('themed 规则排在 wechat 皮肤规则之后（同特异性后者胜）',
    themedIdx > wechatIdx && wechatIdx > 0, `themed=${themedIdx} wechat=${wechatIdx}`)
  // 线上现状不能被破坏：默认按钮仍是原渐变
  ok('默认主按钮仍是线上渐变（未被改成纯色）',
    wxss.includes('linear-gradient(135deg, var(--lg-brand), #5980ff)'))
}

section('8. wxml 结构检查：block 成对 + 花括号配平')
{
  const wxml = readWxml()
  const openBlocks = (wxml.match(/<block\b/g) || []).length
  const closeBlocks = (wxml.match(/<\/block>/g) || []).length
  ok(`block 标签成对（${openBlocks} 开 / ${closeBlocks} 闭）`, openBlocks === closeBlocks)

  // 花括号配平（{{ }} 与 wx:if="{{ }}"）
  const opens = (wxml.match(/\{\{/g) || []).length
  const closes = (wxml.match(/\}\}/g) || []).length
  ok(` moustache 花括号配平（${opens} 开 / ${closes} 闭）`, opens === closes)

  // 标签闭合粗检：view / block / button / text / image
  for (const tag of ['view', 'block', 'button', 'text', 'image']) {
    const o = (wxml.match(new RegExp(`<${tag}\\b`, 'g')) || []).length
    // button 含自闭合的 <image ... />，这里只统计成对标签
    const selfClosing = (wxml.match(new RegExp(`<${tag}\\b[^>]*/>`, 'g')) || []).length
    const c = (wxml.match(new RegExp(`</${tag}>`, 'g')) || []).length
    ok(`${tag} 标签成对（${o} 开含 ${selfClosing} 自闭合 / ${c} 闭）`, o - selfClosing === c)
  }

  // 只有一个根节点式的 page-meta + login-page 结构没被破坏
  ok('保留 page-meta', wxml.includes('<page-meta'))
  ok('保留 themePageStyle', wxml.includes('themePageStyle'))
  ok('登录弹层仍在 wxml 内', wxml.includes('privacy-layer__agree'))
}

section('9. wxss 变量消费：新增变量都被真实用到（没有定义了却没用的情况）')
{
  const wxss = readWxss()
  for (const v of ['--lg-brand', '--lg-brand-2']) {
    const uses = (wxss.match(new RegExp(`var\\(${v}\\)`, 'g')) || []).length
    ok(`${v} 被引用 ${uses} 次（不是死变量）`, uses >= 2, `实际 ${uses}`)
  }
}

console.log(`\n${'='.repeat(46)}`)
console.log(`通过 ${pass} · 失败 ${fail}`)
console.log('='.repeat(46))
if (fail > 0) process.exit(1)