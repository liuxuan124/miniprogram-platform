<template>
  <div class="warm-shell" :class="{ 'warm-shell--preview': previewMode }">
    <div class="warm-shell__kicker">{{ isHome ? '暖阁首页' : '固定业务页' }}</div>
    <div class="warm-shell__title">{{ title }}</div>
    <div class="warm-shell__desc">{{ desc }}</div>
    <div v-if="isHome" class="warm-shell__rows">
      <span>{{ component.props?.authors_title || '暖阁出品' }}</span>
      <span>{{ component.props?.columns_title || '精品专栏' }}</span>
      <span>{{ component.props?.planet_title || '我的星球' }}</span>
    </div>
    <p v-if="isHome && previewMode" class="warm-shell__hint">
      真机首页按系统「暖阁首页配置」展示问候/精选/信息流；装修器里可展开为可组合区块再细调。
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ComponentInstance } from '@/types/page'
import { ComponentType, ComponentTypeLabels } from '@/types/page'

const p = defineProps<{ component: ComponentInstance; previewMode?: boolean }>()

const isHome = computed(() => p.component.type === ComponentType.WarmHome)
const title = computed(() => {
  if (isHome.value) return String(p.component.props?.title || '暖阁首页')
  return String(p.component.props?.title || ComponentTypeLabels[p.component.type as ComponentType] || '暖阁固定页')
})
const desc = computed(() => {
  if (isHome.value) {
    return '首页用可组合区块搭建；保存后用户刷新即可看到。下列标题来自模板默认配置。'
  }
  return '此页对应小程序原生业务页（发现/星球/商城/我的），底栏打开后走固定版式与真实数据；此处主要改页面标题。'
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
  letter-spacing: 0.12em;
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
.warm-shell__hint {
  margin: 12px 0 0;
  font-size: 11px;
  color: #8a7a6c;
  line-height: 1.5;
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
