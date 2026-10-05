<template>
  <!--
    统一按小程序规则降级为 emoji，保证「预览 = 真机」。
    小程序端 pages/mine/mine.js 的 resolveMenuIconText() 没有 line:* 的矢量实现，
    一律降级 emoji（见 menuIconEmoji.ts，与小程序 MENU_ICON_EMOJI 一字不差）。
    预览原本渲染矢量线条 SVG → 运营看到的图形真机上根本不存在。
  -->
  <span
    class="menu-icon-display menu-icon-display--emoji"
    :style="sizeStyle"
  >{{ resolvedEmoji }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { resolveMenuIconEmoji, MENU_ICON_FALLBACK } from './menuIconEmoji'

const props = withDefaults(defineProps<{
  icon?: string
  fallback?: string
  size?: number
}>(), {
  fallback: '📦',
  size: 20,
})

const resolvedEmoji = computed(() => {
  const raw = String(props.icon || '').trim()
  if (!raw) return props.fallback || MENU_ICON_FALLBACK
  return resolveMenuIconEmoji(raw)
})
const sizeStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  fontSize: `${props.size}px`,
}))
</script>

<style scoped>
.menu-icon-display {
  display: inline-grid;
  place-items: center;
  flex-shrink: 0;
  line-height: 1;
}

.menu-icon-display--emoji {
  font-size: inherit;
}
</style>
