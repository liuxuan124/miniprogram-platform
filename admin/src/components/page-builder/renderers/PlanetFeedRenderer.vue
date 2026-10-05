<template>
  <!-- has-bg：配了通栏底色时让卡片让位（见下方 CSS 注释） -->
  <section class="pf" :class="{ 'has-bg': hasSectionBg }" :style="rootStyle">
    <div
      class="pf__segments"
      :class="[`is-${tabStyle.variant}`, { 'is-sticky': tabStyle.sticky }]"
      :style="stickyTop > 0 ? { top: `${stickyTop}px` } : undefined"
    >
      <button
        v-for="(seg, i) in segs"
        :key="seg.key + '-' + i"
        type="button"
        class="pf__segment"
        :class="{ on: seg.key === activeSeg }"
        :style="segmentStyle(seg)"
        :title="segDesc(seg.key)"
        @click="onSegTap(seg.key, seg)"
      >{{ seg.label }}</button>
    </div>
    <div class="pf__feed">
      <article
        v-for="item in items"
        :key="item.uid || item.id"
        class="pf__card"
        :class="{ top: item.top }"
        :style="cardStyle"
      >
        <header class="pf__head">
          <img v-if="item.avatar" class="pf__avatar" :src="item.avatar" alt="" />
          <span v-else class="pf__avatar pf__avatar--fallback">{{ item.authorInitial }}</span>
          <div class="pf__who">
            <div class="pf__name">
              <strong>{{ item.author }}</strong>
              <span v-if="visibility.show_top_badge && item.tagGold" class="pf__tag gold">{{ item.tagGold }}</span>
              <span v-if="item.tag" class="pf__tag">{{ item.tag }}</span>
            </div>
            <span class="pf__time">{{ item.time }}</span>
          </div>
          <span class="pf__more">···</span>
        </header>
        <p class="pf__content" :style="contentStyle">{{ item.content }}</p>
        <div v-if="item.answer" class="pf__answer"><strong>星主已回答</strong><span>{{ item.answer }}</span></div>
        <div v-if="item.file" class="pf__file"><span class="pf__file-icon">📄</span><div><strong>{{ item.file.name }}</strong><span>{{ item.file.meta }}</span></div><em>预览 ›</em></div>
        <div
          v-if="item.images?.length"
          class="pf__images"
          :class="{ two: item.images.length === 2, auto: cs.image_ratio === 'auto' }"
        ><img v-for="image in item.images" :key="image" :src="image" alt="" /></div>
        <p v-if="item.topics" class="pf__topics">{{ item.topics }}</p>
        <footer v-if="visibility.show_interactions" class="pf__actions"><span :class="{ hot: item.liked || item.hot }">❤️ {{ item.likes }}</span><span>💬 {{ item.comments }}</span><span>{{ item.favorited ? '⭐️ 已收藏' : '⭐️ 收藏' }}</span><span>↗️ 分享</span></footer>
      </article>
    </div>
    <div class="pf__end">{{ footerText }}</div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ComponentInstance } from '@/types/page'
import { usePageStore } from '@/stores/page'
import {
  mapPlanetFeedItem,
  filterPlanetFeedBySeg,
  normalizePlanetSegs,
  normalizePlanetCardStyle,
  normalizePlanetTabStyle,
  normalizePlanetVisibility,
  planetShadowCss,
  resolvePlanetDefaultSeg,
  resolvePlanetStickyOffset,
  PLANET_DEFAULT_FEED,
  PLANET_DEFAULT_SEGS,
  PLANET_SEG_KEYS,
} from '@/utils/preview-planet'

const p = defineProps<{ component: ComponentInstance; previewMode?: boolean }>()
const emit = defineEmits<{
  'preview-action': [payload: any]
  /** 点了分段标签 → 属性面板定位到该分段 */
  'focus-seg': [key: string]
}>()
const source = computed(() => p.component.props || {})

const pageStore = usePageStore()

const segs = computed(() => {
  const rows = normalizePlanetSegs(source.value.segs)
  return rows.length ? rows : PLANET_DEFAULT_SEGS.map((it) => ({ ...it }))
})

/** 样式三件套：与属性面板 / 小程序端同规则（preview-planet.ts 里归一） */
const ts = computed(() => normalizePlanetTabStyle(source.value.tabStyle))
const cs = computed(() => normalizePlanetCardStyle(source.value.cardStyle))
const visibility = computed(() => normalizePlanetVisibility(source.value.visibility))

/**
 * 🔴 吸顶层级穿透修正：算本组件**上方**那些顶部常驻组件（星球顶栏 / 通知公告 / 话题条）
 * 的累计高度，作为标签栏吸顶时的 top 偏移。
 * 只有排在本组件之前的才算 —— 后面的组件不影响吸顶位置。
 * 口径与端上 `resolveStickyOffset` 同规则，否则预览不穿透、真机穿透。
 */
const stickyTop = computed(() => {
  if (!ts.value.sticky) return 0
  if (ts.value.sticky_offset_mode === 'manual') return ts.value.sticky_offset
  const all = pageStore.dsl?.components || []
  const selfIdx = all.findIndex((it) => it.id === p.component.id)
  // 找不到自己（理论上不会）时按整页算，宁可偏移大一点也不层叠
  const above = selfIdx >= 0 ? all.slice(0, selfIdx) : all
  return resolvePlanetStickyOffset(above)
})
// 模板里用短名，读起来比全名省事；computed 只做一次归一
const tabStyle = ts
const cardCfg = cs

/** 手动模式下用配置的静态清单；否则退回内置演示数据 */
const allItems = computed(() => {
  const rows = Array.isArray(source.value.items) && source.value.items.length
    ? source.value.items
    : PLANET_DEFAULT_FEED
  return rows.map(mapPlanetFeedItem)
})

// 分段可点：用与小程序端相同的筛选函数，让运营在预览里就能验证每个分段筛出什么。
// 原来这里写死 seg.key === 'all' 高亮、且不过滤，导致除 all 外的分段在预览里点了没反应。
const activeSeg = ref(resolvePlanetDefaultSeg(segs.value, source.value.default_seg))
watch(segs, (rows) => {
  const next = resolvePlanetDefaultSeg(rows, source.value.default_seg)
  if (!rows.some((it) => it.key === activeSeg.value)) activeSeg.value = next
})
// default_seg 改动要立刻反映（面板上换默认高亮段，画布跟着变）
watch(() => source.value.default_seg, () => {
  activeSeg.value = resolvePlanetDefaultSeg(segs.value, source.value.default_seg)
})
const items = computed(() => filterPlanetFeedBySeg(allItems.value, activeSeg.value))

/* ---------------- 样式映射 ---------------- */

/**
 * 根容器样式：消费通用「背景色」。
 *
 * 🔴 这个 computed 此前是 `() => ({})` —— 永远返回空对象，于是：
 *   面板把颜色写进 `component.style.background_color`
 *   → store 正常保存、DSL 里也确实有值
 *   → BaseRenderer 的 `surfaceStyle` 又**硬编码 backgroundColor:'transparent'**
 *     （外壳刻意透明，避免「整块白外框」）
 *   → 渲染器本该自己把颜色设到根容器上，可它什么都没做
 *   ⇒ 背景色在画布与移动端预览里完全不生效，且没有任何报错。
 *
 * 为什么放渲染器而不是改 BaseRenderer：BaseRenderer 是**全部组件共用**的外壳，
 * 在那里刷背景会让每个组件都套上白底，破坏「外壳透明」的既有设计。
 * 端上不需要改：`miniapp/utils/render.js` 的 `parseStyle` 会把
 * `background_color` 自动转成 `background-color` 下发，真机一直是好的 ——
 * 这也是本 bug 只在后台预览暴露的原因。
 */
const rootStyle = computed<Record<string, string>>(() => {
  const style: Record<string, string> = {}
  const bg = String(p.component.style?.background_color || '').trim()
  if (bg) {
    style.background = bg
    // 同时下发变量：吸顶标签条需要一个**不透明**底色盖住滚上来的内容，
    // 但不能写死米白（会把通栏底色在顶部切掉一块）。用变量让它跟随同一色。
    style['--pf-bg'] = bg
  }
  return style
})

/** 运营是否给组件配了通栏底色（卡片是否需要让位给它） */
const hasSectionBg = computed(() => !!String(p.component.style?.background_color || '').trim())

/**
 * 标签栏配色。
 *
 * ⚠️ 「继承品牌色」时一律留空，由 CSS 里的默认色（预���里的暖橙）兜底 ——
 * 后台预览拿不到小程序端 CSS 变量，两端各自用各自写死的同名默认值，
 * 视觉一致但变量不共享（预览非目标是真机，这里保持同色即可）。
 */
function segmentStyle(seg: { key: string }): Record<string, string> {
  if (seg.key !== activeSeg.value) {
    return ts.value.text ? { color: ts.value.text } : {}
  }
  const s: Record<string, string> = {}
  if (!ts.value.inherit_brand) {
    if (ts.value.variant === 'pill' && ts.value.active_bg) s.background = ts.value.active_bg
    if (ts.value.active_text) s.color = ts.value.active_text
  }
  return s
}

/**
 * 卡片：外间距 / 内边距 / 圆角 / 阴影。
 *
 * ⚠️ 底色不在这里设 —— 交给 CSS 的 `.pf.has-bg .pf__card` 处理。
 * 之前想过在这里内联 `rgba(...,.82)`，但那样会出现「样式真源分散在两处」：
 * 内联与 CSS 同时存在时，改 CSS 不生效、改内联不生效，很难排查。
 * 单一真源 = CSS（带 `has-bg` 条件），内联只管几何。
 */
const cardStyle = computed<Record<string, string>>(() => ({
  margin: `0 16px ${cardCfg.value.margin_bottom}px`,
  padding: `${cardCfg.value.padding}px ${cardCfg.value.padding + 1}px ${Math.max(6, cardCfg.value.padding - 4)}px`,
  borderRadius: `${cardCfg.value.radius}px`,
  boxShadow: planetShadowCss(cardCfg.value.shadow),
}))

/**
 * 正文截断：0 行 = 不截断；>0 用 line-clamp。
 * 走 CSS 变量而非直接写 -webkit-line-clamp —— 后者不在 CSSStyleDeclaration 的
 * TS 类型里，直接写进 style 对象会报 TS2322；变量则由下方 CSS 规则消费。
 */
const contentStyle = computed<Record<string, string>>(() => {
  const n = visibility.value.clamp_lines
  const s: Record<string, string> = {}
  if (n > 0) s['--pf-clamp'] = String(n)
  return s
})

function segDesc(key: string): string {
  return PLANET_SEG_KEYS.find((it) => it.value === key)?.desc || '未定义类型，不会筛选'
}

function onSegTap(key: string, seg: { key: string }) {
  if (!key || key === 'resources') return
  activeSeg.value = key
  // 通知属性面板滚到该分段配置项（画布 → 面板联动）
  emit('focus-seg', seg.key)
}

const footerText = computed(() => {
  if (source.value.footer_text) return source.value.footer_text
  const demo = source.value.source_mode === 'manual'
  const base = demo ? '—— 演示数据 ——' : `—— 已加载 ${allItems.value.length} 条 ——`
  return activeSeg.value === segs.value[0]?.key ? base : `${base}（当前分段筛选后 ${items.value.length} 条）`
})
</script>

<style scoped>
.pf { box-sizing: border-box; width: 100%; min-height: 480px; padding-bottom: 20px; color: #3a2a1c; }
.pf__segments { display: flex; gap: 7px; min-height: 48px; padding: 16px; overflow-x: auto; box-sizing: border-box; white-space: nowrap; scrollbar-width: none; }
.pf__segments::-webkit-scrollbar { display: none; }
/* 吸顶：top 由 stickyTop 动态注入（页面上方有顶栏/公告时自动下沉，避免层叠穿透）；
   预览容器没有真实滚动上下文，这里主要用于与真机保持同一套类名口径 */
.pf__segments.is-sticky { position: sticky; top: 0; z-index: 10; background: linear-gradient(180deg,#fdf6ec 72%,transparent); }
/* 下沉后渐变背景不够盖住下方内容，改成不透明底 + 投影，否则滚动时内容透上来 */
.pf__segments.is-sticky[style] { background: #fdf6ec; box-shadow: 0 2px 6px rgba(120,72,40,.08); }
/* 配了通栏底色时，吸顶条跟随同一色（--pf-bg 由 rootStyle 下发），
   否则顶部会留一条米白，与下面的底色割裂成两块 */
.pf.has-bg .pf__segments.is-sticky { background: var(--pf-bg, #fdf6ec); }
.pf.has-bg .pf__segments.is-sticky[style] { background: var(--pf-bg, #fdf6ec); }
.pf__segment { flex: none; padding: 7px 14px; color: #6b5443; font-family: inherit; font-size: 12.5px; font-weight: 650; line-height: 1.4; white-space: nowrap; background: #fffaf3; cursor: pointer; transition: color 0.15s, background 0.15s; }

/* —— 三种外观 —— */
.pf__segments.is-pill .pf__segment { border: .5px solid rgba(120,72,40,.12); border-radius: 999px; }
.pf__segments.is-pill .pf__segment:hover { border-color: rgba(194,65,12,.45); color: #c2410c; }
.pf__segments.is-pill .pf__segment.on { color: #fff; border-color: transparent; background: linear-gradient(135deg,#ea580c,#c2410c); }

.pf__segments.is-line { gap: 0; padding: 0 16px; }
.pf__segments.is-line .pf__segment { padding: 9px 12px; background: transparent; border-bottom: 2px solid transparent; border-radius: 0; }
.pf__segments.is-line .pf__segment.on { color: #c2410c; border-bottom-color: #c2410c; background: transparent; }

.pf__segments.is-text { gap: 0; padding: 0 16px; }
.pf__segments.is-text .pf__segment { padding: 8px 11px; background: transparent; }
.pf__segments.is-text .pf__segment.on { color: #c2410c; background: transparent; }

.pf__feed { min-height: 480px; }
/* 卡片底色默认值（米白）。配了组件通栏背景时由 cardStyle 覆盖成半透明。 */
.pf__card { background: #fffdf9; transition: box-shadow 0.15s; }
/* 置顶卡：默认是暖色渐变；配了通栏背景时同样让位（保持「置顶仍有区分度」但不遮死底色） */
.pf__card.top { border: .5px solid #f0d3ad; background: linear-gradient(150deg,#fff7ec,#fffaf3); }
.pf.has-bg .pf__card { background: rgba(255, 253, 249, 0.82); }
.pf.has-bg .pf__card.top { background: linear-gradient(150deg, rgba(255,247,236,.9), rgba(255,250,243,.82)); }
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
/* 截断：--pf-clamp 由 contentStyle 注入行数，0 时不注入（= 整段展示） */
.pf__content[style*="--pf-clamp"] {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: var(--pf-clamp);
  overflow: hidden;
}
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
/* 原图比例：不裁切，高度由图片自身比例决定 */
.pf__images.auto img { height: auto; aspect-ratio: auto; object-fit: contain; }
.pf__images.auto.two img { height: auto; }
.pf__topics { margin: 10px 0 0; color: #c2410c; font-size: 12px; font-weight: 600; }
.pf__actions { display: flex; margin-top: 10px; padding-top: 9px; border-top: .5px solid rgba(120,72,40,.12); color: #a1897a; font-size: 11.5px; }
.pf__actions span { flex: 1; text-align: center; }
.pf__actions .hot { color: #c2410c; font-weight: 680; }
.pf__end { padding: 14px 0 6px; color: #a1897a; text-align: center; font-size: 10.5px; letter-spacing: .1em; }
</style>
