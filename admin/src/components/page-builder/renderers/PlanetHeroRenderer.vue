<template>
  <div class="ph">
    <div class="ph__rw">
      <div class="ph__lg">{{ props.logo_emoji || '🪐' }}</div>
      <div class="ph__meta">
        <div class="ph__title">{{ props.title || '暖阁星球' }}</div>
        <div class="ph__sb">{{ props.subtitle || '' }}</div>
      </div>
      <div class="ph__jn">{{ props.join_text || '加入' }}</div>
    </div>
    <div class="ph__kpi">
      <div v-for="(k, i) in kpis" :key="i" class="ph__kpi-item">
        <div class="ph__kpi-b">{{ k.value }}</div>
        <div class="ph__kpi-s">{{ k.label }}</div>
      </div>
    </div>
    <div v-if="props.expire_text" class="ph__exp">🎫 {{ props.expire_text }}</div>
    <div v-if="props.join_row_text" class="ph__join">
      <span>{{ props.join_row_text }}</span>
      <span class="ph__go">{{ props.join_row_go || '去加入 ›' }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ComponentInstance } from '@/types/page'

const p = defineProps<{ component: ComponentInstance; previewMode?: boolean }>()
defineEmits<{ 'preview-action': [payload: any] }>()
const props = computed(() => p.component.props || {})
const kpis = computed(() => (Array.isArray(props.value.kpis) ? props.value.kpis : []))
</script>

<style scoped>
.ph {
  color: #fff;
  padding: 14px 14px 16px;
  border-radius: 0;
  background: linear-gradient(150deg, #7c2d12 0%, #b45309 55%, #d97706 100%);
}
.ph__rw { display: flex; align-items: center; gap: 10px; }
.ph__lg {
  width: 42px; height: 42px; border-radius: 14px;
  background: rgba(255,255,255,.16); display: grid; place-items: center; font-size: 22px;
}
.ph__meta { flex: 1; min-width: 0; }
.ph__title { font-size: 16px; font-weight: 750; }
.ph__sb { margin-top: 4px; font-size: 11px; opacity: .82; }
.ph__jn {
  height: 28px; padding: 0 12px; border-radius: 99px; background: #fff; color: #9a3412;
  font-size: 12px; font-weight: 780; display: grid; place-items: center;
}
.ph__kpi { margin-top: 12px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
.ph__kpi-item {
  background: rgba(255,255,255,.12); border-radius: 10px; padding: 8px 4px; text-align: center;
}
.ph__kpi-b { font-size: 13px; font-weight: 780; }
.ph__kpi-s { font-size: 10px; opacity: .78; }
.ph__exp { margin-top: 10px; font-size: 11px; opacity: .72; }
.ph__join {
  margin-top: 10px; display: flex; align-items: center; gap: 8px;
  padding: 8px 10px; border-radius: 10px; background: rgba(255,255,255,.14); font-size: 11px;
}
.ph__go { margin-left: auto; font-weight: 760; }
</style>
