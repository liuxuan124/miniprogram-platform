<template>
  <div class="render-hotspot">
    <img v-if="imageUrl" :src="imageUrl" alt="" class="render-hotspot__img" />
    <div v-else class="render-hotspot__empty">图片热区 · 请配置底图</div>
    <div
      v-for="(spot, idx) in hotspots"
      :key="idx"
      class="render-hotspot__spot"
      :style="spotStyle(spot)"
    >{{ idx + 1 }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { normalizeUploadUrl } from '@/api/system'
import type { ComponentInstance } from '@/types/page'

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

defineEmits<{
  'preview-action': [payload: { tab: string; message: string; detailType?: string; detailTitle?: string; detailDesc?: string }]
}>()

const imageUrl = computed(() => normalizeUploadUrl(props.component.props?.image || ''))
const hotspots = computed(() => Array.isArray(props.component.props?.hotspots) ? props.component.props.hotspots : [])

function spotStyle(spot: any) {
  return {
    left: `${Number(spot.x) || 0}%`,
    top: `${Number(spot.y) || 0}%`,
    width: `${Number(spot.w) || 20}%`,
    height: `${Number(spot.h) || 15}%`,
  }
}
</script>

<style scoped>
.render-hotspot {
  position: relative;
  overflow: hidden;
  background: #f1f5f9;
  border-radius: 6px;
  min-height: 120px;
}
.render-hotspot__img {
  display: block;
  width: 100%;
}
.render-hotspot__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  color: #94a3b8;
  font-size: 12px;
}
.render-hotspot__spot {
  position: absolute;
  box-sizing: border-box;
  border: 1.5px dashed rgba(23, 105, 255, 0.85);
  background: rgba(23, 105, 255, 0.12);
  color: var(--color-primary);
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}
</style>
