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
    <div v-else-if="isDiscover && discoverTabs.length" class="warm-shell__tabs">
      <div class="warm-shell__tab-row">
        <span v-for="tab in discoverTabs" :key="tab.key" class="warm-shell__tab">{{ tab.label }}</span>
      </div>
      <div v-if="activeChips.length" class="warm-shell__chip-row">
        <span v-for="(chip, i) in activeChips" :key="i" class="warm-shell__chip">{{ chip.label }}</span>
      </div>
      <p class="warm-shell__hint warm-shell__hint--left">
        列表数据来自内容/商品库；保存 Tab 与标签后，发现页真机会按配置筛选。
      </p>
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
import { DEFAULT_DISCOVER_TABS, type DiscoverTab } from '@/constants/warmDiscoverDefaults'

const p = defineProps<{ component: ComponentInstance; previewMode?: boolean }>()

const isHome = computed(() => p.component.type === ComponentType.WarmHome)
const isDiscover = computed(() => p.component.type === ComponentType.WarmDiscover)
const discoverTabs = computed<DiscoverTab[]>(() => {
  if (!isDiscover.value) return []
  const raw = p.component.props?.tabs
  if (Array.isArray(raw) && raw.length) return raw as DiscoverTab[]
  return DEFAULT_DISCOVER_TABS
})
const activeChips = computed(() => {
  const first = discoverTabs.value.find((t) => t.visible !== false) || discoverTabs.value[0]
  return (first?.chips || []).slice(0, 8)
})
const title = computed(() => {
  if (isHome.value) return String(p.component.props?.title || '暖阁首页')
  return String(p.component.props?.title || ComponentTypeLabels[p.component.type as ComponentType] || '暖阁固定页')
})
const desc = computed(() => {
  if (isHome.value) {
    return '首页用可组合区块搭建；保存后用户刷新即可看到。下列标题来自模板默认配置。'
  }
  if (isDiscover.value) {
    return '发现页：配置主 Tab、二级标签与长文排布；信息流在真机按接口拉取。'
  }
  return '此页对应小程序原生业务页（星球/商城/我的），底栏打开后走固定版式与真实数据。'
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
.warm-shell__tabs {
  margin-top: 14px;
  text-align: left;
}
.warm-shell__tab-row,
.warm-shell__chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}
.warm-shell__chip-row {
  margin-top: 10px;
}
.warm-shell__tab {
  padding: 6px 12px;
  border-radius: 999px;
  background: #fff;
  border: 1px solid #f0dcc4;
  font-size: 12px;
  font-weight: 600;
}
.warm-shell__chip {
  padding: 4px 10px;
  border-radius: 8px;
  background: #f8ecdd;
  font-size: 11px;
  color: #7c4a2a;
}
.warm-shell__hint--left {
  text-align: center;
}
</style>
