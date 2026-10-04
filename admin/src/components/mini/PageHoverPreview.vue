<template>
  <Teleport to="body">
    <div
      v-show="visible"
      class="hover-preview"
      :class="{ 'hover-preview--flip': flip }"
      :style="{ top: `${top}px`, left: `${left}px` }"
    >
      <div class="hover-preview__hd">
        <b>{{ title }}</b>
        <span class="faint">{{ hint }}</span>
      </div>
      <div class="hover-preview__frame">
        <iframe
          v-if="src"
          :key="src"
          :src="src"
          frameborder="0"
          scrolling="no"
          loading="lazy"
        />
        <div class="hover-preview__mask" />
      </div>
      <div class="hover-preview__ft faint">悬停预览 · 点「预览」看完整版</div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * 页面行悬停预览卡：鼠标停留在页面行约 0.6s 后，在行右侧浮出真实渲染的小预览，
 * 免去「想知道这页长什么样就得新开一个 tab」的来回。
 * 定位用 fixed + Teleport，避免被父级 overflow 裁掉；iframe 只展示不可点。
 */
defineProps<{
  visible: boolean
  src: string
  title: string
  hint?: string
  top: number
  left: number
  /** 右侧空间不够时改为向左悬浮 */
  flip?: boolean
}>()
</script>

<style scoped>
.hover-preview {
  position: fixed;
  z-index: 3000;
  width: 232px;
  border-radius: 14px;
  background: #fffdf9;
  border: 1px solid #e8dfd2;
  box-shadow: 0 18px 44px rgba(60, 44, 30, 0.18);
  overflow: hidden;
  pointer-events: none;
  animation: hp-in 0.14s ease-out;
}
@keyframes hp-in {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
.hover-preview__hd {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 12px;
  border-bottom: 1px solid #f0e8dc;
}
.hover-preview__hd b {
  font-size: 13px;
  font-weight: 600;
  color: #3a2f26;
}
.hover-preview__frame {
  position: relative;
  height: 440px;
  background: #fffbf6;
  overflow: hidden;
}
.hover-preview__frame iframe {
  width: 375px;
  height: 812px;
  border: 0;
  transform: scale(0.618);
  transform-origin: top left;
}
/* 遮罩拦截鼠标事件，防止悬停卡抢走行的 hover */
.hover-preview__mask {
  position: absolute;
  inset: 0;
}
.hover-preview__ft {
  padding: 6px 12px 8px;
  font-size: 11px;
  border-top: 1px solid #f0e8dc;
  color: #8a7863;
}
</style>
