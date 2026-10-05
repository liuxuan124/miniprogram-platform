<template>
  <!--
    登录页预览（管理端渲染，与小程序 pages/login/login.wxml 同源结构）。
    只渲染视觉，不实现授权流程：按钮是假的，协议勾选也是假的。
    styleKey 切 lg-page--{{styleKey}} 类，与小程序 wxss 的 4 套皮肤一一对应。

    identity 三态对应小程序端真实会遇到的场景：
    - guest：未登录（协议未勾选，主按钮 pending）
    - loggedin：已登录但被拦截回来（协议已勾选，主按钮可点）
    - member：会员被拦截回来（顶部多一条会员提示）
    不传 identity 时回落到旧的「协议未勾选」单态，pages.vue 等既有调用方零改动。
  -->
  <div
    class="login-page-preview"
    :class="`lg-page--${styleKey} lg-header--${headerStyle} lg-card--${cardStyle} ${isPageTheme ? 'lg-page--themed' : ''}`"
    :style="pageRootStyle"
  >
    <div class="login-backdrop">
      <div class="safe-top">
        <div v-if="showBackButton" class="back-button" aria-label="返回"><text>‹</text></div>
      </div>

      <div class="brand-hero">
        <template v-if="showDecorOrbs">
          <div class="brand-hero__orb brand-hero__orb--one"></div>
          <div class="brand-hero__orb brand-hero__orb--two"></div>
        </template>

        <block v-if="modules.brandIdentity">
          <div class="brand-identity">
            <div class="brand-mark brand-mark--text">{{ brandMark }}</div>
            <div class="brand-copy">
              <text class="brand-copy__eyebrow">{{ brandEyebrow }}</text>
              <text class="brand-copy__name">{{ brandName }}</text>
            </div>
          </div>
        </block>

        <block v-if="modules.heroTitle">
          <text class="brand-title">{{ loginConfig.heroTitle || '欢迎回来' }}</text>
          <text v-if="loginConfig.heroSubtitle" class="brand-description">{{ loginConfig.heroSubtitle }}</text>
        </block>

        <div v-if="showInterceptTip" class="intercept-tip">
          <text class="intercept-tip__icon">✓</text>
          <text>登录后即可{{ interceptAction || '继续操作' }}</text>
        </div>
      </div>
    </div>

    <div class="login-sheet login-sheet--auth">
      <div class="sheet-handle"></div>

      <block v-if="modules.sheetHeading && (loginConfig.sheetTitle || loginConfig.sheetSubtitle || showSecurityBadge)">
        <div class="sheet-heading">
          <div>
            <text v-if="loginConfig.sheetTitle" class="sheet-heading__title">{{ loginConfig.sheetTitle }}</text>
            <text v-if="loginConfig.sheetSubtitle" class="sheet-heading__description">{{ loginConfig.sheetSubtitle }}</text>
          </div>
          <div v-if="showSecurityBadge" class="security-badge">
            <span class="security-badge__dot"></span>
            <text>{{ loginConfig.securityBadgeText || '安全登录' }}</text>
          </div>
        </div>
      </block>

      <!--
        协议勾选：合规项，**不提供隐藏开关**。
        隐藏只是视觉的，onOneTapLogin 里的 agreePrivacy 校验端上照旧生效。
      -->
      <div class="agreement" :class="{ 'agreement--on': identity !== 'guest' }">
        <div class="agreement__check" :class="{ 'agreement__check--active': identity !== 'guest' }">
          <text v-if="identity !== 'guest'">✓</text>
        </div>
        <div class="agreement__copy">
          <text class="agreement__text">我已阅读并同意</text>
          <text class="agreement__link">《用户协议》</text>
          <text class="agreement__text">与</text>
          <text class="agreement__link">《隐私政策》</text>
        </div>
      </div>

      <text v-if="modules.formHint" class="form-hint form-hint--muted">{{ formHintText }}</text>

      <div class="login-button" :class="{ 'login-button--pending': identity === 'guest' }">
        <text class="login-button__title">{{ loginConfig.loginButtonText || '手机号快捷登录' }}</text>
      </div>

      <div v-if="modules.skipButton && loginConfig.skipButtonText" class="login-skip">{{ loginConfig.skipButtonText }}</div>

      <block v-if="modules.privacyNote && loginConfig.privacyNoteText">
        <div class="sheet-footer">
          <text class="privacy-note">{{ loginConfig.privacyNoteText }}</text>
        </div>
      </block>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { LoginPageConfig, ThemeConfig } from '@/types/miniapp'
import {
  resolveLoginPageStyleKey,
  resolveLoginEffectiveTheme,
  resolveLoginModules,
  normalizeLoginHeaderStyle,
  normalizeLoginCardStyle,
} from '@/types/miniapp'

/**
 * 预览身份态：guest / loggedin / member。
 * 与小程序端 login.js 的 agreePrivacy + 会员态一一对应：
 * guest=协议未勾选；loggedin=已登录非会员；member=会员。
 */
export type LoginIdentity = 'guest' | 'loggedin' | 'member'

const props = defineProps<{
  loginConfig: LoginPageConfig
  theme?: Pick<ThemeConfig, 'primaryColor' | 'secondaryColor'>
  brandName?: string
  brandMark?: string
  brandEyebrow?: string
  /**
   * 预览身份态。**不传时回落到旧的单态表现**（协议未勾选），
   * 保证 pages.vue 悬停预览等既有调用方完全不受影响。
   */
  identity?: LoginIdentity
  /** 已登录/会员态时的拦截动作文案（对应小程序 login.js 的 interceptAction） */
  interceptAction?: string
}>()

const styleKey = computed(() => resolveLoginPageStyleKey(props.loginConfig))

const showDecorOrbs = computed(() => props.loginConfig.showDecorOrbs !== false)
const showSecurityBadge = computed(() => props.loginConfig.showSecurityBadge !== false)
const showBackButton = computed(() => props.loginConfig.showBackButton !== false)

const brandName = computed(() => props.brandName || '暖阁')
const brandMark = computed(() => props.brandMark || '暖')
const brandEyebrow = computed(() => props.brandEyebrow || 'NUANGE · 暖阁')

/** 显式传值优先；不传时按 guest 处理（= 旧行为） */
const identity = computed<LoginIdentity>(() => {
  const raw = String(props.identity || '')
  if (raw === 'guest' || raw === 'loggedin' || raw === 'member') return raw
  return 'guest'
})

/** 模块显隐：缺字段按 true（= 线上现状） */
const modules = computed(() => resolveLoginModules(props.loginConfig.modules))

const headerStyle = computed(() => normalizeLoginHeaderStyle(props.loginConfig.headerStyle))
const cardStyle = computed(() => normalizeLoginCardStyle(props.loginConfig.cardStyle))

/**
 * 生效主题色 —— 与小程序端 `system.js` 的 resolveLoginEffectiveTheme 同源同语义。
 * themeSource=inherit（默认）时忽略 loginPageConfig.themeColor，一律用全局品牌色。
 */
const effectiveTheme = computed(() =>
  resolveLoginEffectiveTheme(
    {
      themeSource: props.loginConfig.themeSource,
      themeColor: props.loginConfig.themeColor,
      themeColorSecondary: props.loginConfig.themeColorSecondary,
    },
    props.theme,
  ),
)

/** 页面根节点：注入生效品牌色变量；页面级背景色优先，空值回落到默认底色 */
const pageRootStyle = computed(() => {
  const pageBg = String(props.loginConfig.pageBackgroundColor || '').trim()
  // 全局品牌色为空时**不要**注入空变量，否则会把皮肤自带的兜底色顶掉
  const vars: Record<string, string> = {}
  if (effectiveTheme.value.primary) vars['--lg-brand'] = effectiveTheme.value.primary
  if (effectiveTheme.value.secondary) vars['--lg-brand-2'] = effectiveTheme.value.secondary
  return { ...vars, ...(pageBg ? { background: pageBg } : {}) }
})

/**
 * 页面独立配色态：brand/minimal/wechat 三套皮肤在 wxss 里写死了按钮色，
 * 特异性比基础规则高。开了「页面独立」时必须由一个更高特异性的类把颜色接管回来，
 * 否则后台选了覆盖色、真机却还是皮肤色。
 */
const isPageTheme = computed(() => effectiveTheme.value.source === 'page')

/** 拦截提示：默认只在已登录/会员态出现（未登录时端上不会有这条） */
const showInterceptTip = computed(() =>
  modules.value.interceptTip && identity.value !== 'guest')

/** 协议下方的提示文案：guest 态给引导语，已登录态给登录后说明 */
const formHintText = computed(() =>
  identity.value === 'guest'
    ? '勾选协议后即可授权手机号登录'
    : '将使用授权信息完成登录')
</script>

<style scoped>
.login-page-preview {
  width: 375px;
  /* 兜底值 = 线上现状（暖阁砖橘）；页面覆盖时由 --lg-brand 覆盖 */
  --lg-brand: #c2410c;
  --lg-brand-2: #ea580c;
  background: #fffbf6;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', sans-serif;
  overflow: hidden;
}

/* ===== 顶部品牌区 ===== */
.login-backdrop {
  position: relative;
  padding: 0 20px 28px;
  background: linear-gradient(160deg, #faf3ea 0%, #f4e8d8 100%);
  overflow: hidden;
}
.safe-top { height: 44px; display: flex; align-items: center; }
.back-button {
  width: 32px; height: 32px; border-radius: 50%;
  background: rgba(255,255,255,0.6); display: grid; place-items: center;
  font-size: 22px; color: #6b4f3a; font-weight: 300;
}
.brand-hero {
  position: relative;
  padding: 24px 0 12px;
  display: flex; flex-direction: column; align-items: center; text-align: center;
}
.brand-hero__orb {
  position: absolute; border-radius: 50%; filter: blur(28px); opacity: 0.5;
}
.brand-hero__orb--one { width: 140px; height: 140px; background: var(--lg-brand); top: -20px; left: -30px; }
.brand-hero__orb--two { width: 120px; height: 120px; background: var(--lg-brand-2); bottom: -10px; right: -20px; }
.brand-identity { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; position: relative; }
.brand-mark {
  width: 44px; height: 44px; border-radius: 12px;
  background: var(--lg-brand); color: #fff;
  display: grid; place-items: center;
  font-size: 20px; font-weight: 700;
}
.brand-copy { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; }
.brand-copy__eyebrow { font-size: 10px; letter-spacing: 1px; color: #8a6d4a; text-transform: uppercase; }
.brand-copy__name { font-size: 16px; font-weight: 700; color: #3a2f26; }
.brand-title { font-size: 24px; font-weight: 700; color: #2a1f16; margin-top: 4px; position: relative; }
.brand-description { font-size: 13px; color: #6b5e52; margin-top: 6px; position: relative; max-width: 280px; }

/* 拦截提示（对应小程序 .intercept-tip） */
.intercept-tip {
  position: relative;
  display: inline-flex; align-items: center; gap: 4px;
  margin-top: 10px; padding: 4px 10px;
  font-size: 12px; color: #6b5e52;
  background: rgba(255, 255, 255, 0.72);
  border-radius: 999px;
}
.intercept-tip__icon { font-size: 11px; color: var(--lg-brand); font-weight: 700; }

/* ===== 登录卡片 ===== */
.login-sheet {
  position: relative; margin: -20px 16px 0;
  background: #fff; border-radius: 18px 18px 0 0;
  padding: 16px 20px 20px;
  box-shadow: 0 -4px 24px rgba(60,44,30,0.06);
}
.sheet-handle { width: 36px; height: 4px; border-radius: 2px; background: #e8dfd2; margin: 0 auto 14px; }
.sheet-heading { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.sheet-heading__title { display: block; font-size: 16px; font-weight: 600; color: #2a1f16; }
.sheet-heading__description { display: block; font-size: 12px; color: #8a7863; margin-top: 2px; }
.security-badge {
  display: flex; align-items: center; gap: 4px;
  font-size: 11px; color: #2f6b3a;
  background: #e8f2e9; padding: 3px 8px; border-radius: 999px;
}
.security-badge__dot { width: 6px; height: 6px; border-radius: 50%; background: #2f6b3a; }

.agreement { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 8px; }
.agreement__check {
  width: 16px; height: 16px; border-radius: 50%; border: 1.5px solid #d4c8bc;
  flex-shrink: 0; margin-top: 1px;
}
.agreement__copy { font-size: 12px; color: #6b5e52; line-height: 1.5; }
.agreement__text { color: #6b5e52; }
.agreement__link { color: var(--lg-brand); }
.agreement--on .agreement__check { border-color: var(--lg-brand); }
.agreement__check--active {
  background: var(--lg-brand);
  color: #fff;
  display: grid; place-items: center;
  font-size: 11px;
}

.form-hint { display: block; font-size: 11px; color: #b4a596; margin-bottom: 14px; padding-left: 24px; }

.login-button {
  background: var(--lg-brand);
  color: #fff;
  border-radius: 12px;
  padding: 13px;
  text-align: center;
  font-size: 15px; font-weight: 600;
  box-shadow: 0 4px 12px rgba(194,65,12,0.25);
}
/* 未勾选协议：主按钮置灰（与小程序 canSubmit=false 的 pending 态对应） */
.login-button--pending { opacity: 0.55; }
.login-button__title { color: #fff; }

.login-skip {
  margin-top: 10px; text-align: center; font-size: 13px;
  color: #8a7863; padding: 6px;
}

.sheet-footer { margin-top: 14px; text-align: center; }
.privacy-note { font-size: 11px; color: #b4a596; line-height: 1.5; }

/* ===== 4 套皮肤变体（与小程序 login.wxss 对齐） ===== */
.lg-page--warm {
  --lg-accent: #c2410c;
  --lg-accent-2: #ea580c;
}
.lg-page--warm .login-backdrop {
  background: linear-gradient(160deg, #f6ddbf 0%, #f4e8d8 100%);
}
.lg-page--warm .login-button { box-shadow: 0 4px 12px rgba(194,65,12,0.25); }

.lg-page--brand {
  --lg-accent: #5b7fea;
  --lg-accent-2: #6b6fe8;
}
.lg-page--brand .login-backdrop {
  background: linear-gradient(160deg, #c5d8f0 0%, #e8eef8 100%);
}
.lg-page--brand .brand-mark { background: #4338ca; }
.lg-page--brand .brand-copy__eyebrow { color: #4338ca; }
.lg-page--brand .login-button { box-shadow: 0 4px 12px rgba(91,127,234,0.3); }

.lg-page--minimal {
  --lg-accent: #1f2937;
  --lg-accent-2: #6b7280;
}
.lg-page--minimal .login-backdrop {
  background: #ffffff;
  padding-bottom: 20px;
}
.lg-page--minimal .brand-hero { padding: 20px 0 8px; }
.lg-page--minimal .brand-title { font-size: 20px; }
.lg-page--minimal .login-sheet {
  box-shadow: none;
  border-top: 1px solid #f3f4f6;
}
.lg-page--minimal .sheet-heading__title { font-size: 15px; }
.lg-page--minimal .login-button {
  box-shadow: none;
  border-radius: 8px;
}

.lg-page--wechat {
  --lg-accent: #07c160;
  --lg-accent-2: #06ad56;
}
.lg-page--wechat .login-backdrop {
  background: #ededed;
  padding-bottom: 20px;
}
.lg-page--wechat .brand-hero { padding: 20px 0 8px; }
.lg-page--wechat .brand-title { font-size: 18px; }
.lg-page--wechat .brand-identity { display: none; }
.lg-page--wechat .login-sheet {
  box-shadow: none;
  border-radius: 0;
  margin: 0 0 0 0;
  background: #f7f7f7;
}
.lg-page--wechat .login-button {
  background: #07c160;
  box-shadow: 0 2px 8px rgba(7,193,96,0.25);
  border-radius: 6px;
}
.lg-page--wechat .security-badge { background: #e8f5ee; color: #07c160; }
.lg-page--wechat .security-badge__dot { background: #07c160; }

/* ============================================================
 * 页面独立配色（themeSource=page）
 *
 * 写在 4 套皮肤**之后**：靠「同特异性、后出现者胜」把皮肤写死的按钮色接管回来。
 * 只覆盖颜色相关的属性，padding/border-radius 等版式仍归皮肤 —— 换色不该改版式。
 * 与小程序 login.wxss 的 lg-page--themed 段落一一对应。
 * ============================================================ */
.lg-page--themed .brand-mark { background: var(--lg-brand); }
.lg-page--themed .brand-hero__orb--one { background: var(--lg-brand); }
.lg-page--themed .brand-hero__orb--two { background: var(--lg-brand-2); }
.lg-page--themed .agreement__link { color: var(--lg-brand); }
.lg-page--themed .login-button { background: var(--lg-brand); }
.lg-page--themed .login-button__title { color: #fff; }

/* 顶部样式：gradient（默认，线上现状）| solid */
.lg-header--solid .login-backdrop { background: var(--lg-brand); }
.lg-header--solid .brand-title { color: #fff; }
.lg-header--solid .brand-description { color: rgba(255, 255, 255, 0.78); }
.lg-header--solid .brand-copy__eyebrow { color: rgba(255, 255, 255, 0.7); }
.lg-header--solid .brand-copy__name { color: #fff; }
.lg-header--solid .intercept-tip { background: rgba(255, 255, 255, 0.22); color: #fff; }
.lg-header--solid .intercept-tip__icon { color: #fff; }

/* 卡片样式：shadow（默认，线上现状）| flat | outline */
.lg-card--flat .login-sheet { box-shadow: none; }
.lg-card--outline .login-sheet {
  box-shadow: none;
  border: 1px solid var(--lg-brand);
  border-radius: 18px 18px 0 0;
  margin: -20px 16px 0;
}
</style>
