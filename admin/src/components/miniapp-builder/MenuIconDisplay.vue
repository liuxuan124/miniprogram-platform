<template>
  <span
    v-if="isLine"
    class="menu-icon-display menu-icon-display--line"
    :style="sizeStyle"
    v-html="svg"
  />
  <span v-else class="menu-icon-display menu-icon-display--emoji" :style="sizeStyle">{{ icon || fallback }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getMenuLineIconSvg, isMenuLineIcon } from './menuLineIcons'

const props = withDefaults(defineProps<{
  icon?: string
  fallback?: string
  size?: number
}>(), {
  fallback: '📦',
  size: 20,
})

const isLine = computed(() => isMenuLineIcon(props.icon))
const svg = computed(() => (props.icon ? getMenuLineIconSvg(props.icon) : ''))
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

.menu-icon-display--line :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
}

.menu-icon-display--emoji {
  font-size: inherit;
}
</style>
