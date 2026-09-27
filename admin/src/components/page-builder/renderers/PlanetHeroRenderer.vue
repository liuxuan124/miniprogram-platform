<template>
  <section class="ph">
    <div class="ph__rw">
      <div class="ph__logo">{{ data.logo_emoji }}</div>
      <div class="ph__meta">
        <strong class="ph__title">{{ data.title }}</strong>
        <span class="ph__subtitle">{{ data.subtitle }}</span>
      </div>
      <div class="ph__actions">
        <button type="button" class="ph__switch">切换</button>
        <button type="button" class="ph__join">{{ data.join_text }}</button>
      </div>
    </div>
    <div class="ph__kpis">
      <div v-for="kpi in data.kpis" :key="kpi.label" class="ph__kpi">
        <strong>{{ kpi.value }}</strong><span>{{ kpi.label }}</span>
      </div>
    </div>
    <div v-if="data.expire_text" class="ph__expire">🎫 {{ data.expire_text }}</div>
    <div class="ph__join-row"><span>{{ data.join_row_text }}</span><strong>{{ data.join_row_go }}</strong></div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ComponentInstance } from '@/types/page'
import { PLANET_DEFAULT_KPIS } from '@/utils/preview-planet'

const p = defineProps<{ component: ComponentInstance; previewMode?: boolean }>()
defineEmits<{ 'preview-action': [payload: any] }>()
const data = computed(() => {
  const source = p.component.props || {}
  return {
    ...source,
    logo_emoji: source.logo_emoji || '🪐',
    title: source.title || '暖阁星球',
    subtitle: source.subtitle || '内容创作者的自留地 · 由 墨白 主理',
    join_text: source.join_text || '加入',
    expire_text: source.expire_text || '',
    join_row_text: source.join_row_text || '👥 加入球友微信群，第一时间收到更新通知',
    join_row_go: source.join_row_go || '去加入 ›',
    kpis: Array.isArray(source.kpis) && source.kpis.length ? source.kpis : PLANET_DEFAULT_KPIS,
  }
})
</script>

<style scoped>
.ph { position: relative; overflow: hidden; box-sizing: border-box; width: 100%; padding: 32px 18px 18px; color: #fff; background: linear-gradient(150deg,#7c2d12 0%,#b45309 55%,#d97706 100%); }
.ph::after,.ph::before { content: ''; position: absolute; border-radius: 999px; background: rgba(255,255,255,.09); pointer-events: none; }
.ph::after { width: 230px; height: 230px; right: -80px; top: -96px; }
.ph::before { width: 150px; height: 150px; left: -60px; bottom: -80px; background: rgba(255,255,255,.07); }
.ph__rw { position: relative; z-index: 1; display: flex; align-items: center; gap: 13px; margin-top: 4px; }
.ph__logo { flex: none; display: grid; place-items: center; width: 58px; height: 58px; border: .5px solid rgba(255,255,255,.25); border-radius: 20px; background: rgba(255,255,255,.16); font-size: 28px; }
.ph__meta { flex: 1; min-width: 0; }
.ph__title { display: block; font-family: "Songti SC","Noto Serif SC",serif; font-size: 20px; font-weight: 750; letter-spacing: -.02em; }
.ph__subtitle { display: block; margin-top: 5px; font-size: 11.5px; line-height: 1.35; opacity: .82; }
.ph__actions { position: relative; z-index: 2; flex: none; display: flex; gap: 6px; margin-left: auto; }
.ph__actions button { height: 32px; padding: 0 12px; border-radius: 999px; font-size: 12px; font-weight: 700; cursor: default; }
.ph__switch { border: .5px solid rgba(255,255,255,.35); color: #fff; background: rgba(255,255,255,.18); }
.ph__join { border: 0; color: #9a3412; background: #fff; }
.ph__kpis { position: relative; z-index: 1; display: grid; grid-template-columns: repeat(4,1fr); gap: 7px; min-height: 56px; margin-top: 16px; }
.ph__kpi { padding: 9px 4px; text-align: center; border: .5px solid rgba(255,255,255,.14); border-radius: 13px; background: rgba(255,255,255,.12); }
.ph__kpi strong,.ph__kpi span { display: block; }
.ph__kpi strong { font-size: 15px; font-weight: 780; }
.ph__kpi span { margin-top: 2px; font-size: 9.5px; opacity: .78; }
.ph__expire { position: relative; z-index: 1; margin-top: 11px; font-size: 10.5px; opacity: .72; }
.ph__join-row { position: relative; z-index: 1; display: flex; align-items: center; gap: 6px; margin-top: 11px; padding: 9px 12px; border: .5px solid rgba(255,255,255,.16); border-radius: 12px; background: rgba(255,255,255,.14); font-size: 11.5px; }
.ph__join-row strong { flex: none; margin-left: auto; font-weight: 760; }
</style>
