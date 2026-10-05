<template>
  <Teleport to="body">
    <div
      v-show="visible"
      class="mine-hp"
      :class="{ 'mine-hp--flip': flip }"
      :style="{ top: `${top}px`, left: `${left}px` }"
    >
      <div class="mine-hp__hd">
        <b>「我的」页 · {{ templateName }}</b>
        <span class="mine-hp__sub">{{ menuCount }} 项菜单 · 点「配置模板」可切换</span>
      </div>
      <div class="mine-hp__frame">
        <div class="mine-hp__inner">
          <MinePagePreview :mine-config="mineConfig" :theme="theme" />
        </div>
      </div>
      <div class="mine-hp__ft">悬停预览 · 按当前「我的」页配置真实渲染</div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * 「我的」系统页的行悬停预览。
 *
 * 与 PageHoverPreview 的区别：普通页面行可以塞一个 H5 iframe 进去看真实渲染，
 * 但「我的」是小程序原生页，H5 预览里没有这个页面——所以这里直接复用管理端
 * 自己的 MinePagePreview（同一份配置、同一套渲染），保证「所见即真机」。
 *
 * 定位用 fixed + Teleport 以免被列表容器裁掉；pointer-events: none
 * 是为了不抢走行的 hover，否则鼠标一移上去卡片就把自己关掉了。
 */
import MinePagePreview from '@/components/miniapp-builder/MinePagePreview.vue'
import type { MinePageConfig, ThemeConfig } from '@/types/miniapp'

defineProps<{
  visible: boolean
  mineConfig: MinePageConfig
  theme: Pick<ThemeConfig, 'primaryColor' | 'secondaryColor'>
  templateName: string
  menuCount: number
  top: number
  left: number
  /** 右侧空间不够时改为向左悬浮 */
  flip?: boolean
}>()
</script>

<style scoped>
.mine-hp {
  position: fixed;
  z-index: 3000;
  width: 200px;
  border-radius: 14px;
  background: #fffdf9;
  border: 1px solid #e8dfd2;
  box-shadow: 0 18px 44px rgba(60, 44, 30, 0.18);
  overflow: hidden;
  pointer-events: none;
  animation: mhp-in 0.14s ease-out;
}
@keyframes mhp-in {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
.mine-hp__hd {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 12px;
  border-bottom: 1px solid #f0e8dc;
}
.mine-hp__hd b {
  font-size: 13px;
  font-weight: 600;
  color: #3a2f26;
}
.mine-hp__sub {
  font-size: 11px;
  color: #8a7863;
}
.mine-hp__frame {
  height: 372px;
  overflow: hidden;
  background: #fffbf6;
}
/* MinePagePreview 原生宽 375，按 194/375 缩放后正好铺满卡片内宽 */
.mine-hp__inner {
  width: 375px;
  transform: scale(0.5173);
  transform-origin: top left;
}
.mine-hp__ft {
  padding: 6px 12px 8px;
  font-size: 11px;
  color: #8a7863;
  border-top: 1px solid #f0e8dc;
}
</style>
