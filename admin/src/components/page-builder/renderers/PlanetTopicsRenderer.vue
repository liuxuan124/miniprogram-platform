<template>
  <div class="pt">
    <div class="pt__t">
      <span class="pt__ic">{{ props.icon || '📈' }}</span>
      <span class="pt__h">{{ props.title || '本周星球话题预测' }}</span>
      <span v-if="props.badge" class="pt__badge">{{ props.badge }}</span>
    </div>
    <div class="pt__bar">
      <div v-for="(item, i) in items" :key="i" class="pt__row">
        <span class="pt__nm">{{ item.name }}</span>
        <div class="pt__tr"><div class="pt__fill" :style="{ width: `${item.width || 40}%` }"></div></div>
        <span class="pt__pct" :class="{ down: item.down }">{{ item.pct }}</span>
      </div>
    </div>
    <div v-if="props.note" class="pt__note">{{ props.note }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ComponentInstance } from '@/types/page'

const p = defineProps<{ component: ComponentInstance; previewMode?: boolean }>()
defineEmits<{ 'preview-action': [payload: any] }>()
const props = computed(() => p.component.props || {})
const items = computed(() => (Array.isArray(props.value.items) ? props.value.items : []))
</script>

<style scoped>
.pt {
  margin: 0 8px; margin-top: -8px; border-radius: 16px; padding: 12px;
  background: #fffaf3; border: 1px solid rgba(120,72,40,.12); box-shadow: 0 6px 18px rgba(120,72,40,.06);
}
.pt__t { display: flex; align-items: center; gap: 6px; }
.pt__ic { font-size: 16px; }
.pt__h { font-size: 13px; font-weight: 780; flex: 1; color: #3a2a1c; }
.pt__badge {
  font-size: 10px; padding: 2px 8px; border-radius: 99px;
  background: linear-gradient(135deg,#f6d9a8,#efc27a); color: #8a4b12; font-weight: 700;
}
.pt__bar { margin-top: 10px; display: flex; flex-direction: column; gap: 8px; }
.pt__row { display: flex; align-items: center; gap: 8px; font-size: 11px; }
.pt__nm { width: 78px; flex: none; color: #6b5443; font-weight: 620; }
.pt__tr { flex: 1; height: 6px; border-radius: 99px; background: #f3e3d0; overflow: hidden; }
.pt__fill { height: 100%; border-radius: 99px; background: linear-gradient(90deg,#f59e0b,#ea580c); }
.pt__pct { width: 42px; text-align: right; font-weight: 750; color: #c2410c; }
.pt__pct.down { color: #78716c; }
.pt__note {
  margin-top: 10px; font-size: 11px; color: #a1897a; line-height: 1.5;
  border-top: 1px dashed rgba(120,72,40,.18); padding-top: 8px;
}
</style>
