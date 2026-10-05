<template>
  <div
    class="wk-card wk-ms"
    :style="rootStyle"
  >
    <span v-if="editing" class="wk-edit-hint">编辑态：时间轴仅预览</span>

    <div v-if="p.title" class="wk-ms__head">
      <span class="wk-title">{{ p.title }}</span>
    </div>

    <div v-if="!items.length" class="wk-ms__empty">暂无政策节点</div>

    <div v-else class="wk-ms__track">
      <div
        v-for="(m, i) in items"
        :key="m.id || i"
        class="wk-ms__node"
        :class="{ 'wk-ms__node--last': i === items.length - 1 }"
      >
        <div class="wk-ms__rail">
          <span class="wk-ms__dot" :style="dotStyle(m)">
            <span
              v-if="i === activeIndex"
              class="wk-ms__pulse"
              :style="{ borderColor: statusMeta(m.status).color }"
            />
          </span>
          <span
            v-if="i !== items.length - 1"
            class="wk-ms__line"
            :style="{ background: p.lineColor || '#EDE0CB' }"
          />
        </div>

        <div class="wk-ms__content">
          <div class="wk-ms__meta">
            <span class="wk-ms__date">{{ m.date || '待定' }}</span>
            <span
              v-if="p.showStatus"
              class="wk-ms__badge"
              :style="badgeStyle(m)"
            >{{ statusMeta(m.status).label }}</span>
          </div>
          <h4 class="wk-ms__t">{{ m.title || '政策节点' }}</h4>
          <ul v-if="pointsOf(m).length" class="wk-ms__points">
            <li v-for="(pt, k) in pointsOf(m)" :key="k" class="wk-ms__point">
              <span class="wk-ms__bullet" :style="{ background: statusMeta(m.status).color }" />
              <span class="wk-ms__point-text">{{ pt }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useWarmKit } from '../../shared/useWarmKit'
import {
  contentMilestoneTrackerDefaultProps,
  MILESTONE_STATUS_META,
} from './schema'
import type { ContentMilestoneStatus } from './schema'
import type { ComponentInstance } from '@/types/page'

const props = defineProps<{
  component: ComponentInstance
}>()

const { safe: p, items, guard, editing, bg } = useWarmKit({
  defaults: contentMilestoneTrackerDefaultProps,
  source: computed(() => props.component?.props),
  editorMode: computed(() => false),
  itemKey: 'milestones',
})

/** -1 = 不高亮；超出范围自动回落为最后一个节点 */
const activeIndex = computed(() => {
  const n = Math.trunc(Number(p.value.activeIndex))
  if (!Number.isFinite(n) || n < 0 || !items.value.length) return -1
  return Math.min(n, items.value.length - 1)
})

const rootStyle = computed(() => ({
  background: bg.value || '#FDF6EC',
  boxShadow: '0 4px 16px rgba(180, 83, 9, 0.06)',
}))

function statusMeta(s: any) {
  return MILESTONE_STATUS_META[s as ContentMilestoneStatus] || MILESTONE_STATUS_META.upcoming
}

function pointsOf(m: any): string[] {
  return Array.isArray(m?.points) ? m.points.filter((x: any) => !!x) : []
}

function dotStyle(m: any) {
  const color = statusMeta(m.status).color
  return {
    background: color,
    borderColor: p.value.bgColor || '#FDF6EC',
  }
}

function badgeStyle(m: any) {
  const color = statusMeta(m.status).color
  return { color, borderColor: color, background: '#FFFAF3' }
}
</script>

<style scoped>
.wk-ms {
  position: relative;
  padding: 14px;
  border-radius: 14px;
}
.wk-ms__head {
  margin-bottom: 12px;
}
.wk-ms__track {
  display: flex;
  flex-direction: column;
}
.wk-ms__node {
  display: flex;
  align-items: stretch;
  gap: 10px;
}
.wk-ms__rail {
  position: relative;
  flex-shrink: 0;
  width: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.wk-ms__dot {
  position: relative;
  z-index: 2;
  flex-shrink: 0;
  width: 10px;
  height: 10px;
  margin-top: 5px;
  border-radius: 50%;
  border: 2px solid #FDF6EC;
}
.wk-ms__pulse {
  position: absolute;
  inset: -4px;
  border: 2px solid #F05B5B;
  border-radius: 50%;
  animation: wk-ms-pulse 1.8s ease-out infinite;
}
@keyframes wk-ms-pulse {
  0% {
    transform: scale(0.6);
    opacity: 0.7;
  }
  70% {
    transform: scale(1.5);
    opacity: 0;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}
.wk-ms__line {
  flex: 1 1 auto;
  width: 2px;
  margin: 4px 0;
  border-radius: 999px;
}
.wk-ms__content {
  flex: 1 1 auto;
  min-width: 0;
  padding-bottom: 16px;
}
.wk-ms__node--last .wk-ms__content {
  padding-bottom: 0;
}
.wk-ms__meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 4px;
}
.wk-ms__date {
  font-size: 11px;
  font-weight: 600;
  line-height: 1.6;
  color: #78716C;
  letter-spacing: 0.2px;
}
.wk-ms__badge {
  flex-shrink: 0;
  padding: 1px 7px;
  border: 1px solid #EDE0CB;
  border-radius: 999px;
  font-size: 10px;
  line-height: 1.7;
}
.wk-ms__t {
  margin: 0 0 6px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.6;
  color: #57534E;
}
.wk-ms__points {
  margin: 0;
  padding: 0;
  list-style: none;
}
.wk-ms__point {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 2px 0;
}
.wk-ms__bullet {
  flex-shrink: 0;
  width: 4px;
  height: 4px;
  margin-top: 8px;
  border-radius: 50%;
}
.wk-ms__point-text {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 12px;
  line-height: 1.7;
  color: #78716C;
}
.wk-ms__empty {
  padding: 24px 0;
  text-align: center;
  font-size: 13px;
  color: #78716C;
}
</style>
