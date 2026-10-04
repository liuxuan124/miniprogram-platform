<template>
  <!--
    区块缩略图：用**真实 renderer** 在 375px 手机画幅里渲染组件树，
    再用 CSS transform 缩到卡片宽度。不用 html2canvas 位图，原因：
      1. 所见即所得 —— 卡片里看到的就是画布/线上的真实效果，不会骗运营；
      2. 零新增依赖，不会因跨域图片污染 canvas 而截出空白封面；
      3. 组件改版后缩略图自动跟随，不存在「死图要重新生成」。
    pointer-events 全关，缩放层不吃鼠标事件，hover 预览由父级浮层负责。
  -->
  <div class="block-thumb" :style="wrapStyle">
    <div class="block-thumb__scale" :style="scaleStyle">
      <div class="block-thumb__canvas">
        <BlockNodeList :nodes="nodes" />
      </div>
    </div>
    <div v-if="!nodes.length" class="block-thumb__empty">空区块</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ComponentInstance } from '@/types/page'
import BlockNodeList from './BlockNodeList.vue'

const props = withDefaults(
  defineProps<{
    nodes: ComponentInstance[]
    /** 卡片内实际显示宽度（px），内部按 375 画幅等比缩放 */
    width?: number
    /** 卡片高度（px）；超出部分裁切，模拟手机首屏 */
    height?: number
    /** 手机画幅基准宽度，悬浮 1:1 预览时传 375，卡片缩略图也用 375 保持一致 */
    frameWidth?: number
  }>(),
  { width: 150, height: 190, frameWidth: 375 },
)

const scale = computed(() => props.width / props.frameWidth)

const wrapStyle = computed(() => ({
  width: `${props.width}px`,
  height: `${props.height}px`,
}))

const scaleStyle = computed(() => ({
  width: `${props.frameWidth}px`,
  transform: `scale(${scale.value})`,
  transformOrigin: 'top left',
}))
</script>

<style scoped>
.block-thumb {
  position: relative;
  overflow: hidden;
  background: #f4f1ec;
  border-radius: 8px;
  pointer-events: none;
  contain: paint;
}

.block-thumb__scale {
  /* 用 width 固定 375 画幅 + transform 缩放，避免重排 */
  will-change: transform;
}

.block-thumb__canvas {
  display: flow-root;
  min-height: 100%;
  padding: 0;
  background: #fff;
  font-size: 12px;
}

.block-thumb__empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #a99c8e;
  font-size: 12px;
}
</style>
