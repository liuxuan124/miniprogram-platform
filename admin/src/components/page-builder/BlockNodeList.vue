<template>
  <!--
    递归渲染组件树（最多 4 层，超出按 DSL v2 的两层容器上限留足余量）。
    刻意不复用 ComponentItem.vue：那个组件带选中态/工具条/拖拽语义，
    缩略图里要的是「纯渲染」，混进来会让缩略图出现虚线框和删除按钮。
  -->
  <div class="block-node-list">
    <template v-for="(node, i) in nodes" :key="node.id || i">
      <BlockNodeRenderer
        v-if="depth < maxDepth"
        :node="node"
        :depth="depth + 1"
        :max-depth="maxDepth"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ComponentInstance } from '@/types/page'
import BlockNodeRenderer from './BlockNodeRenderer.vue'

withDefaults(
  defineProps<{
    nodes: ComponentInstance[]
    depth?: number
    maxDepth?: number
  }>(),
  { depth: 0, maxDepth: 4 },
)
</script>

<style scoped>
.block-node-list {
  display: flow-root;
}
</style>
