<template>
  <Teleport to="body">
    <div
      v-show="visible"
      class="login-hp"
      :style="{ top: `${top}px`, left: `${left}px` }"
    >
      <div class="login-hp__hd">
        <b>登录页 · {{ templateName }}</b>
        <span class="login-hp__sub">{{ styleName }} 皮肤 · 点「配置模板」可切换</span>
      </div>
      <div class="login-hp__frame">
        <div class="login-hp__inner">
          <LoginPagePreview :login-config="loginConfig" :theme="theme" />
        </div>
      </div>
      <div class="login-hp__ft">悬停预览 · 按当前登录页配置真实渲染</div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * 登录页系统页的行悬停预览（仿 MineTemplateHoverPreview）。
 *
 * 登录页是原生页，H5 预览里没有 → 直接复用管理端自己的 LoginPagePreview。
 * pointer-events: none 防止卡片抢走行的 hover。
 */
import LoginPagePreview from '@/components/miniapp-builder/LoginPagePreview.vue'
import type { LoginPageConfig, ThemeConfig } from '@/types/miniapp'
import { LOGIN_PAGE_STYLE_TEMPLATES, resolveLoginPageStyleKey } from '@/types/miniapp'

const props = defineProps<{
  visible: boolean
  loginConfig: LoginPageConfig
  theme: Pick<ThemeConfig, 'primaryColor' | 'secondaryColor'>
  templateName: string
  top: number
  left: number
}>()

const styleName = LOGIN_PAGE_STYLE_TEMPLATES.find(
  (t) => t.key === resolveLoginPageStyleKey(props.loginConfig),
)?.name || '暖阁纸感'
</script>

<style scoped>
.login-hp {
  position: fixed;
  z-index: 3000;
  width: 200px;
  border-radius: 14px;
  background: #fffdf9;
  border: 1px solid #e8dfd2;
  box-shadow: 0 18px 44px rgba(60, 44, 30, 0.18);
  overflow: hidden;
  pointer-events: none;
  animation: lhp-in 0.14s ease-out;
}
@keyframes lhp-in {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
.login-hp__hd {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 12px;
  border-bottom: 1px solid #f0e8dc;
}
.login-hp__hd b {
  font-size: 13px;
  font-weight: 600;
  color: #3a2f26;
}
.login-hp__sub {
  font-size: 11px;
  color: #8a7863;
}
.login-hp__frame {
  height: 372px;
  overflow: hidden;
  background: #fffbf6;
}
/* LoginPagePreview 原生宽 375，按 194/375 缩放后正好铺满卡片内宽 */
.login-hp__inner {
  width: 375px;
  transform: scale(0.5173);
  transform-origin: top left;
}
.login-hp__ft {
  padding: 6px 12px 8px;
  font-size: 11px;
  color: #8a7863;
  border-top: 1px solid #f0e8dc;
}
</style>
