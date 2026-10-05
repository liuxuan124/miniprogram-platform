<template>
  <StyleFoldGroup v-model:open="open" title="排版与间距" :summary="summary">
    <CompactSliderRow
      :label="gap.label"
      :hint="gap.hint"
      :model-value="Number(data.item_gap ?? 8)"
      :min="0"
      :max="48"
      :step="2"
      :fallback="8"
      @update:model-value="(v: number) => emit('update', { item_gap: v })"
    />

    <CompactSliderRow
      label="标题字号"
      :hint="`${TITLE_FONT_MIN}–${TITLE_FONT_MAX} px 视觉舒适区间`"
      :model-value="Number(data.title_font_size ?? 13)"
      :min="TITLE_FONT_MIN"
      :max="TITLE_FONT_MAX"
      :step="1"
      :fallback="13"
      @update:model-value="(v: number) => emit('update', { title_font_size: v })"
    />

    <CompactSliderRow
      label="日期字号"
      :hint="`${DATE_FONT_MIN}–${DATE_FONT_MAX} px，不建议大于标题字号`"
      :model-value="Number(data.subtitle_font_size ?? 11)"
      :min="DATE_FONT_MIN"
      :max="DATE_FONT_MAX"
      :step="1"
      :fallback="11"
      @update:model-value="(v: number) => emit('update', { subtitle_font_size: v })"
    />

    <!--
      联动隐藏：某些排版的间距由布局本身决定，此时「条目间距」改了也没用。
      🔴 不用 v-if：删掉控件会让下方字段整体上移，运营刚调完标题字号
      再切一次排版就得重新找位置。改成「保留行 + 说明为什么无效」更稳。
    -->
    <p v-if="layoutMeta.gapScope === 'none'" class="al-note">
      「{{ layoutMeta.label }}」布局的间距由排版本身决定，条目间距对其无效
    </p>
  </StyleFoldGroup>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import CompactSliderRow from '../CompactSliderRow.vue'
import StyleFoldGroup from '../StyleFoldGroup.vue'
import { gapLabelOf, layoutMetaOf } from '../articleLayouts'

/**
 * 文章列表的「样式」子面板（在 PropsPanel 的样式页签渲染）。
 *
 * 为什么独立成文件而不是塞回 ArticleListProps：
 * 内容页签只该管数据源/文案/筛选；字号与间距是纯视觉规则，混在内容页签里
 * 会让运营为找一个字号滚过 6 个业务区块。PropsPanel 的 `stylePanelMap` 就是为此预留的。
 *
 * 2026-10-06 重构：删掉顶部灰横幅 + 三处独占行说明（全部收进 label 右侧的 `?`），
 * 改用 CompactSliderRow（标签与控件同行，32px 一行）。
 */

/** 字号安全区间：中文正文低于 12px 真机发虚，高于 20px 在 375 画幅下会折行 */
const TITLE_FONT_MIN = 12
const TITLE_FONT_MAX = 20
const DATE_FONT_MIN = 10
const DATE_FONT_MAX = 14

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [patch: Record<string, any>] }>()

const open = ref(true)

const gap = computed(() => gapLabelOf(data.layout || data.style_type))
const layoutMeta = computed(() => layoutMetaOf(data.layout || data.style_type))

/** 折叠态摘要：全部收起也能扫完配置 */
const summary = computed(() => {
  const parts = [`间隔 ${Number(data.item_gap ?? 8)}`]
  const t = Number(data.title_font_size ?? 13)
  const s = Number(data.subtitle_font_size ?? 11)
  if (t) parts.push(`标题 ${t}px`)
  if (s) parts.push(`日期 ${s}px`)
  return parts.join(' · ')
})
</script>

<style scoped>
/* 说明文字已全部收进 label 的 ? 悬浮气泡，这里只留「跨字段的整组说明」一种用法 */
.al-note {
  margin: 0;
  padding-left: 80px;
  color: #a8b3c4;
  font-size: 11px;
  line-height: 1.4;
}
</style>
