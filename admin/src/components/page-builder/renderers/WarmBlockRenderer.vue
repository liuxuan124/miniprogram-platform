<template>
  <div class="wb" :class="'wb--' + kind">
    <div class="wb__kicker">{{ kicker }}</div>
    <div class="wb__title">{{ title }}</div>
    <div class="wb__desc">{{ desc }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ComponentInstance } from '@/types/page'
import { ComponentType, ComponentTypeLabels } from '@/types/page'

const p = defineProps<{ component: ComponentInstance; previewMode?: boolean }>()

const kind = computed(() => String(p.component.type || 'warm'))
const title = computed(() => {
  const props = p.component.props || {}
  if (p.component.type === ComponentType.WarmGreet) return String(props.greet_template || '你好')
  return String(props.title || ComponentTypeLabels[p.component.type as ComponentType] || '暖阁区块')
})
const kicker = computed(() => ComponentTypeLabels[p.component.type as ComponentType] || '暖阁')
const desc = computed(() => {
  const t = p.component.type
  if (t === ComponentType.WarmGreet) return '问候、搜索、快捷导航。连续天数来自当前登录用户。'
  if (t === ComponentType.WarmAuthors) return '作者列表来自首页聚合接口，可改标题与「全部」跳转。'
  if (t === ComponentType.WarmFeature) return '精选文章来自后台绑定的内容，无数据时显示空状态。'
  if (t === ComponentType.WarmColumns) return '专栏商品来自真实在售商品。'
  if (t === ComponentType.WarmPlanetRec) return '星球推荐来自星球接口，不是演示文案。'
  if (t === ComponentType.WarmFeed) return '信息流来自已发布内容，分类切换保留。'
  return '暖阁固定版式区块'
})
</script>

<style scoped>
.wb {
  padding: 16px 14px;
  background: linear-gradient(180deg, #fffaf3 0%, #fdf6ec 100%);
  border: 1px solid #f0dcc4;
  border-radius: 12px;
  color: #2a1c12;
}
.wb--warm_greet { background: linear-gradient(180deg, #f7e0c3 0%, #fdf6ec 100%); }
.wb--warm_planet_rec { background: linear-gradient(135deg, #7c2d12, #b45309); color: #fff; border-color: #9a3412; }
.wb__kicker { font-size: 11px; letter-spacing: 0.12em; color: #c2410c; font-weight: 700; }
.wb--warm_planet_rec .wb__kicker { color: #fed7aa; }
.wb__title { margin-top: 6px; font-size: 16px; font-weight: 700; }
.wb__desc { margin-top: 6px; font-size: 12px; line-height: 1.55; opacity: 0.78; }
</style>
