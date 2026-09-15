<template>
  <div class="render-cube" :class="'is-' + layout" :style="{ gap: gap + 'px' }">
    <div
      v-for="(item, idx) in items"
      :key="idx"
      class="render-cube__cell"
      :style="{ borderRadius: radius + 'px' }"
    >
      <img v-if="item.image" :src="item.image" alt="" />
      <div v-else class="render-cube__ph">图 {{ idx + 1 }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ComponentInstance } from '@/types/page'

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

const layout = computed(() => String(props.component.props?.layout || '2x2'))
const gap = computed(() => Number(props.component.props?.gap ?? 6))
const radius = computed(() => Number(props.component.props?.radius ?? 8))
const items = computed(() => (Array.isArray(props.component.props?.items) ? props.component.props.items : []))
</script>

<style scoped>
.render-cube { display: grid; overflow: hidden; }
.render-cube.is-2x2 { grid-template-columns: 1fr 1fr; grid-template-rows: 72px 72px; }
.render-cube.is-1-2 { grid-template-columns: 1.2fr 1fr; grid-template-rows: 72px 72px; }
.render-cube.is-1-2 .render-cube__cell:first-child { grid-row: 1 / span 2; }
.render-cube.is-3x3 { grid-template-columns: 1fr 1fr 1fr; grid-template-rows: 56px 56px 56px; }
.render-cube__cell { overflow: hidden; background: #eef2f7; }
.render-cube__cell img { width: 100%; height: 100%; object-fit: cover; display: block; }
.render-cube__ph { height: 100%; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #94a3b8; }
</style>
