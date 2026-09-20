<template>
  <div class="warm-shell">
    <div class="warm-shell__kicker">NUANGE · 固定版式</div>
    <div class="warm-shell__title">{{ title }}</div>
    <div class="warm-shell__desc">
      发布后底栏仍打开原生暖阁固定版式。首页请改用可组合区块；此处仅作发现/商城/星球/我的的模板入口。
    </div>
    <div v-if="isHome" class="warm-shell__rows">
      <span>{{ component.props?.authors_title || '暖阁出品' }}</span>
      <span>{{ component.props?.columns_title || '精品专栏' }}</span>
      <span>{{ component.props?.planet_title || '我的星球' }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ComponentInstance } from '@/types/page'
import { ComponentType, ComponentTypeLabels } from '@/types/page'

const p = defineProps<{ component: ComponentInstance; previewMode?: boolean }>()

const isHome = computed(() => p.component.type === ComponentType.WarmHome)
const title = computed(() => {
  if (isHome.value) return '暖阁首页'
  return String(p.component.props?.title || ComponentTypeLabels[p.component.type as ComponentType] || '暖阁固定页')
})
</script>

<style scoped>
.warm-shell {
  padding: 28px 18px;
  text-align: center;
  background: linear-gradient(180deg, #fffaf3 0%, #fdf6ec 100%);
  border: 1px solid #f0dcc4;
  border-radius: 12px;
  color: #2a1c12;
}
.warm-shell__kicker {
  font-size: 11px;
  letter-spacing: 0.18em;
  color: #c2410c;
  font-weight: 700;
}
.warm-shell__title {
  margin-top: 8px;
  font-size: 18px;
  font-weight: 700;
}
.warm-shell__desc {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.6;
  color: #6b5443;
}
.warm-shell__rows {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 14px;
  flex-wrap: wrap;
}
.warm-shell__rows span {
  padding: 4px 10px;
  border-radius: 999px;
  background: #f8ecdd;
  font-size: 11px;
  color: #b45309;
}
</style>
