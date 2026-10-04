<template>
  <section class="pf">
    <div class="pf__segments">
      <button
        v-for="(seg, i) in segs"
        :key="seg.key + '-' + i"
        type="button"
        class="pf__segment"
        :class="{ on: seg.key === activeSeg }"
        :title="segDesc(seg.key)"
        @click="onSegTap(seg.key)"
      >{{ seg.label }}</button>
    </div>
    <div class="pf__feed">
      <article v-for="item in items" :key="item.uid || item.id" class="pf__card" :class="{ top: item.top }">
        <header class="pf__head">
          <img v-if="item.avatar" class="pf__avatar" :src="item.avatar" alt="" />
          <span v-else class="pf__avatar pf__avatar--fallback">{{ item.authorInitial }}</span>
          <div class="pf__who">
            <div class="pf__name"><strong>{{ item.author }}</strong><span v-if="item.tagGold" class="pf__tag gold">{{ item.tagGold }}</span><span v-if="item.tag" class="pf__tag">{{ item.tag }}</span></div>
            <span class="pf__time">{{ item.time }}</span>
          </div>
          <span class="pf__more">···</span>
        </header>
        <p class="pf__content">{{ item.content }}</p>
        <div v-if="item.answer" class="pf__answer"><strong>星主已回答</strong><span>{{ item.answer }}</span></div>
        <div v-if="item.file" class="pf__file"><span class="pf__file-icon">📄</span><div><strong>{{ item.file.name }}</strong><span>{{ item.file.meta }}</span></div><em>预览 ›</em></div>
        <div v-if="item.images?.length" class="pf__images" :class="{ two: item.images.length === 2 }"><img v-for="image in item.images" :key="image" :src="image" alt="" /></div>
        <p v-if="item.topics" class="pf__topics">{{ item.topics }}</p>
        <footer class="pf__actions"><span :class="{ hot: item.liked || item.hot }">❤️ {{ item.likes }}</span><span>💬 {{ item.comments }}</span><span>{{ item.favorited ? '⭐️ 已收藏' : '⭐️ 收藏' }}</span><span>↗️ 分享</span></footer>
      </article>
    </div>
    <div class="pf__end">{{ footerText }}</div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ComponentInstance } from '@/types/page'
import {
  mapPlanetFeedItem,
  filterPlanetFeedBySeg,
  normalizePlanetSegs,
  PLANET_DEFAULT_FEED,
  PLANET_DEFAULT_SEGS,
  PLANET_SEG_KEYS,
} from '@/utils/preview-planet'

const p = defineProps<{ component: ComponentInstance; previewMode?: boolean }>()
defineEmits<{ 'preview-action': [payload: any] }>()
const source = computed(() => p.component.props || {})
const segs = computed(() => {
  const rows = normalizePlanetSegs(source.value.segs)
  return rows.length ? rows : PLANET_DEFAULT_SEGS.map((it) => ({ ...it }))
})
const allItems = computed(() => {
  const rows = Array.isArray(source.value.items) && source.value.items.length ? source.value.items : PLANET_DEFAULT_FEED
  return rows.map(mapPlanetFeedItem)
})

// 分段可点：用与小程序端相同的筛选函数，让运营在预览里就能验证每个分段筛出什么。
// 原来这里写死 seg.key === 'all' 高亮、且不过滤，导致除 all 外的分段在预览里点了没反应。
const activeSeg = ref(segs.value[0]?.key || 'all')
watch(segs, (rows) => {
  if (!rows.some((it) => it.key === activeSeg.value)) activeSeg.value = rows[0]?.key || 'all'
})
const items = computed(() => filterPlanetFeedBySeg(allItems.value, activeSeg.value))

function segDesc(key: string): string {
  return PLANET_SEG_KEYS.find((it) => it.value === key)?.desc || '未定义类型，不会筛选'
}

function onSegTap(key: string) {
  if (!key || key === 'resources') return
  activeSeg.value = key
}

const footerText = computed(() => {
  if (source.value.footer_text) return source.value.footer_text
  const base = source.value._previewDataDemo ? '—— 演示数据 ——' : `—— 已加载 ${allItems.value.length} 条 ——`
  return activeSeg.value === segs.value[0]?.key ? base : `${base}（当前分段筛选后 ${items.value.length} 条）`
})
</script>

<style scoped>
.pf { box-sizing: border-box; width: 100%; min-height: 480px; padding-bottom: 20px; color: #3a2a1c; }
.pf__segments { position: sticky; top: 0; z-index: 10; display: flex; gap: 7px; min-height: 48px; padding: 16px; overflow-x: auto; box-sizing: border-box; white-space: nowrap; background: linear-gradient(180deg,#fdf6ec 72%,transparent); scrollbar-width: none; }
.pf__segments::-webkit-scrollbar { display: none; }
.pf__segment { flex: none; padding: 7px 14px; border: .5px solid rgba(120,72,40,.12); border-radius: 999px; color: #6b5443; background: #fffaf3; font-family: inherit; font-size: 12.5px; font-weight: 650; line-height: 1.4; white-space: nowrap; cursor: pointer; }
.pf__segment:hover { border-color: rgba(194,65,12,.45); color: #c2410c; }
.pf__segment.on { color: #fff; border-color: transparent; background: linear-gradient(135deg,#ea580c,#c2410c); }
.pf__segment.on:hover { color: #fff; }
.pf__feed { min-height: 480px; }
.pf__card { margin: 0 16px 11px; padding: 14px 15px 10px; border-radius: 18px; background: #fffdf9; box-shadow: 0 8px 24px rgba(120,72,40,.07); }
.pf__card.top { border: .5px solid #f0d3ad; background: linear-gradient(150deg,#fff7ec,#fffaf3); }
.pf__head { display: flex; align-items: center; gap: 9px; }
.pf__avatar { flex: none; width: 34px; height: 34px; border-radius: 50%; object-fit: cover; background: #f3e3d0; }
.pf__avatar--fallback { display: grid; place-items: center; color: #c2410c; background: #fbe6d4; font-weight: 700; }
.pf__who { flex: 1; min-width: 0; }
.pf__name { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; font-size: 13px; }
.pf__tag { padding: 2px 7px; border-radius: 999px; color: #c2410c; background: #fbe6d4; font-size: 9px; font-weight: 700; }
.pf__tag.gold { color: #8a4b12; background: linear-gradient(135deg,#f6d9a8,#efc27a); }
.pf__time { display: block; margin-top: 2px; color: #a1897a; font-size: 10.5px; }
.pf__more { flex: none; margin-left: auto; color: #a1897a; }
.pf__content { margin: 11px 0 0; font-size: 14.5px; line-height: 1.72; white-space: pre-wrap; }
.pf__answer { display: flex; flex-direction: column; gap: 5px; margin-top: 11px; padding: 12px 13px; border-radius: 13px; background: #f8ecdd; font-size: 13.5px; line-height: 1.65; }
.pf__answer strong { color: #d97706; font-size: 10px; letter-spacing: .1em; }
.pf__file { display: flex; align-items: center; gap: 10px; margin-top: 11px; padding: 10px 12px; border: .5px dashed #e3c9a8; border-radius: 13px; background: #fffdf9; }
.pf__file-icon { font-size: 20px; }
.pf__file div { flex: 1; min-width: 0; }
.pf__file strong,.pf__file div span { display: block; }
.pf__file strong { font-size: 12.5px; }
.pf__file div span { margin-top: 2px; color: #a1897a; font-size: 10px; }
.pf__file em { flex: none; color: #c2410c; font-size: 11px; font-style: normal; }
.pf__images { display: grid; grid-template-columns: repeat(3,1fr); gap: 5px; margin-top: 11px; }
.pf__images.two { grid-template-columns: repeat(2,1fr); }
.pf__images img { width: 100%; height: 84px; border-radius: 9px; object-fit: cover; background: #f3e3d0; }
.pf__images.two img { height: 112px; }
.pf__topics { margin: 10px 0 0; color: #c2410c; font-size: 12px; font-weight: 600; }
.pf__actions { display: flex; margin-top: 10px; padding-top: 9px; border-top: .5px solid rgba(120,72,40,.12); color: #a1897a; font-size: 11.5px; }
.pf__actions span { flex: 1; text-align: center; }
.pf__actions .hot { color: #c2410c; font-weight: 680; }
.pf__end { padding: 14px 0 6px; color: #a1897a; text-align: center; font-size: 10.5px; letter-spacing: .1em; }
</style>
