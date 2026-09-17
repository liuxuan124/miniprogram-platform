<template>
  <div class="render-tabs">
    <div class="render-tabs__nav">
      <span
        v-for="(pane, idx) in panes"
        :key="idx"
        class="render-tabs__tab"
        :class="{ active: idx === 0 }"
      >{{ pane.title || '分页' }}</span>
    </div>
    <div class="render-tabs__list">
      <div v-for="(item, idx) in firstItems" :key="idx" class="render-tabs__item">
        {{ item.title || '条目' }}
      </div>
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

const panes = computed(() => (Array.isArray(props.component.props?.panes) ? props.component.props.panes : []))
const firstItems = computed(() => panes.value[0]?.items || [])
</script>

<style scoped>
.render-tabs { background: #fff; border-radius: 10px; overflow: hidden; }
.render-tabs__nav { display: flex; border-bottom: 1px solid #eef2f7; }
.render-tabs__tab { flex: 1; text-align: center; padding: 8px 0; font-size: 13px; color: #64748b; }
.render-tabs__tab.active { color: #002FA7; font-weight: 700; }
.render-tabs__item { padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #f4f6fb; }
</style>
