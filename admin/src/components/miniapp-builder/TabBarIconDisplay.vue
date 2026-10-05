<template>
  <img v-if="isImage" :src="displaySrc" alt="" class="tab-bar-icon-img" />
  <span v-else class="tab-bar-icon-emoji">{{ resolvedIcon || fallback }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { isNavImageIcon, navIconDisplaySrc, migrateTabBarIcon } from '@/components/page-builder/navIconSet'

const props = defineProps<{
  icon?: string
  /** 选中态图标；缺省时退回 icon（与小程序 selected===index?selectedIcon:icon 对齐） */
  selectedIcon?: string
  /** 当前是否选中——为 true 时优先用 selectedIcon */
  active?: boolean
  fallback?: string
}>()

const picked = computed(() => {
  if (props.active && props.selectedIcon) return props.selectedIcon
  return props.icon
})
const resolvedIcon = computed(() => migrateTabBarIcon(picked.value))
const isImage = computed(() => isNavImageIcon(resolvedIcon.value))
const displaySrc = computed(() => navIconDisplaySrc(resolvedIcon.value))
</script>

<style scoped>
.tab-bar-icon-img {
  width: 22px;
  height: 22px;
  object-fit: contain;
  display: block;
  margin: 0 auto;
}

.tab-bar-icon-emoji {
  display: block;
  line-height: 1.3;
}
</style>
