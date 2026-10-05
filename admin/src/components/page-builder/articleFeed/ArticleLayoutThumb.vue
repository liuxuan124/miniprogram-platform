<script setup lang="ts">
/**
 * 文章列表布局的微缩骨架示意图。
 *
 * 为什么用 CSS 画而不是渲染真实组件：
 * 渲染真组件要把 7 套 renderer 都实例化一遍，装修器面板每次 hover/切换都会重绘，
 * 实测会明显卡顿；而运营要看的只是「大致排版长什么样」，CSS 骨架足够且零依赖。
 *
 * 尺寸定 96×64：够看出「大图在上」「左图右文」「两列」这三类关键差异，
 * 又能在 4 列网格里放下不挤。
 */
import type { ArticleLayoutMeta } from '../articleLayouts'

withDefaults(
  defineProps<{
    thumb: ArticleLayoutMeta['thumb']
    /**
     * 自适应宽度模式（2026-10-06）：跟随父容器宽度、按 3:2 比例撑高。
     * 选择器从 2 列改 3 列后格子只有约 62px 宽，固定 96px 骨架会溢出压变形，
     * 故窄容器必须用这个模式。用默认 false 则保持 96×64 固定尺寸。
     */
    fluid?: boolean
  }>(),
  { fluid: false },
)
</script>

<template>
  <div class="alt" :class="[`alt--${thumb}`, { 'alt--fluid': fluid }]" aria-hidden="true">
    <!-- 大图卡：图块在上 + 两条文字 -->
    <template v-if="thumb === 'stack-card' || thumb === 'big-hero'">
      <i class="alt__hero" />
      <i class="alt__line alt__line--w80" />
      <i class="alt__line alt__line--w50" />
    </template>

    <!-- 首图大 + 下方两条纯文字 -->
    <template v-else-if="thumb === 'hero-plus'">
      <i class="alt__hero alt__hero--tall" />
      <i class="alt__line alt__line--w90" />
      <i class="alt__line alt__line--w60" />
    </template>

    <!-- 左图右文 ×2 行 -->
    <template v-else-if="thumb === 'row-thumb'">
      <i class="alt__row">
        <b class="alt__pic" />
        <span class="alt__lines"><i class="alt__line alt__line--w90" /><i class="alt__line alt__line--w40" /></span>
      </i>
      <i class="alt__row">
        <b class="alt__pic" />
        <span class="alt__lines"><i class="alt__line alt__line--w70" /><i class="alt__line alt__line--w50" /></span>
      </i>
    </template>

    <!-- 纯文字列表 ×3 行 -->
    <template v-else-if="thumb === 'row-text'">
      <i class="alt__row alt__row--flat">
        <span class="alt__lines"><i class="alt__line alt__line--w90" /><i class="alt__line alt__line--w40" /></span>
      </i>
      <i class="alt__row alt__row--flat">
        <span class="alt__lines"><i class="alt__line alt__line--w70" /><i class="alt__line alt__line--w55" /></span>
      </i>
      <i class="alt__row alt__row--flat">
        <span class="alt__lines"><i class="alt__line alt__line--w85" /><i class="alt__line alt__line--w35" /></span>
      </i>
    </template>

    <!-- 两列网格 -->
    <template v-else-if="thumb === 'grid-2col'">
      <span class="alt__grid">
        <b class="alt__cell"><i class="alt__line alt__line--w80" /></b>
        <b class="alt__cell"><i class="alt__line alt__line--w80" /></b>
        <b class="alt__cell"><i class="alt__line alt__line--w60" /></b>
        <b class="alt__cell"><i class="alt__line alt__line--w60" /></b>
      </span>
    </template>

    <!-- 报刊细排：粗标题 + 细分栏线 -->
    <template v-else-if="thumb === 'news-column'">
      <i class="alt__line alt__line--w60 alt__line--thick" />
      <i class="alt__line alt__line--w90" />
      <span class="alt__cols">
        <b /><b /><b />
      </span>
    </template>
  </div>
</template>

<style scoped lang="scss">
.alt {
  display: flex;
  flex-direction: column;
  gap: 3px;
  box-sizing: border-box;
  width: 96px;
  height: 64px;
  padding: 7px 8px;
  overflow: hidden;
  background: #fbf8f4;
  border: 1px solid #e8dfd3;
  border-radius: 6px;
}

/* 自适应模式：3 列窄格子用。宽 = 容器宽，高按 3:2 比例（96×64），
   padding/gap 同步收窄，否则 62px 宽里 padding 就吃掉一半。 */
.alt--fluid {
  width: 100%;
  height: auto;
  aspect-ratio: 3 / 2;
  gap: 2px;
  padding: 4px 5px;
}

/* 所有骨架元素统一灰蓝，只用明度表达层级 —— 缩略图不该抢过选中态。
   2026-10-06 加深一档：原 #d9e2ec/#dfe6ee 在 3 列窄尺寸下对比太弱，
   「大图在上」和「左图右文」分不出来，缩略图就失去意义。 */
.alt__hero {
  height: 22px;
  background: #b9c7d6;
  border-radius: 3px;
}

.alt--fluid .alt__hero {
  height: 38%;
  min-height: 10px;
}

.alt__hero--tall {
  height: 30px;
}

.alt--fluid .alt__hero--tall {
  height: 46%;
}

.alt__line {
  display: block;
  height: 4px;
  background: #cbd6e2;
  border-radius: 2px;
}

.alt__line--thick {
  height: 6px;
  background: #a8b8ca;
}

.alt__line--w90 { width: 90%; }
.alt__line--w80 { width: 80%; }
.alt__line--w70 { width: 70%; }
.alt__line--w60 { width: 60%; }
.alt__line--w55 { width: 55%; }
.alt__line--w50 { width: 50%; }
.alt__line--w40 { width: 40%; }
.alt__line--w35 { width: 35%; }

.alt__row {
  display: flex;
  gap: 5px;
  align-items: center;
}

.alt__row--flat {
  padding: 2px 0;
}

.alt__pic {
  flex: 0 0 24px;
  height: 20px;
  background: #b9c7d6;
  border-radius: 3px;
}

.alt--fluid .alt__pic {
  flex: 0 0 30%;
  height: 42%;
}

.alt__lines {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.alt__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  flex: 1;
}

.alt--fluid .alt__grid {
  gap: 2px;
}

.alt__cell {
  display: flex;
  align-items: center;
  height: 22px;
  padding: 0 4px;
  background: #dde5ee;
  border-radius: 3px;
}

.alt--fluid .alt__cell {
  height: 44%;
  padding: 0 2px;
}

.alt__cols {
  display: flex;
  gap: 4px;
  flex: 1;
}

.alt__cols b {
  flex: 1;
  border-top: 2px solid #cbd6e2;
  border-bottom: 2px solid #cbd6e2;
}
</style>
