<template>
  <img v-if="isImage" :src="displaySrc" alt="" class="tab-bar-icon-img" />
  <span v-else class="tab-bar-icon-emoji">{{ icon || fallback }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { isNavImageIcon, navIconDisplaySrc } from '@/components/page-builder/navIconSet'

const props = defineProps<{
  icon?: string
  fallback?: string
}>()

const isImage = computed(() => isNavImageIcon(props.icon))
const displaySrc = computed(() => navIconDisplaySrc(props.icon))
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
