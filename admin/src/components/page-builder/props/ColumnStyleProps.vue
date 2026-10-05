<template>
  <el-form label-width="76px" size="small" class="col-style">
    <div class="col-style__lead">
      这些只影响外观显示，已从「内容」页签移到这里 —— 内容页签只管取哪些专栏、取几个。
    </div>

    <BuilderFieldItem
      label="布局方式"
      hint="单列大卡一屏一张适合主推；双列网格单屏看更多；横向滚动适合数量多要留余量。"
    >
      <BuilderSegmented
        :model-value="layout"
        :options="LAYOUT_OPTIONS"
        @update:model-value="(v: string | number) => emit('update', { layout: String(v) })"
      />
      <div class="ds-hint">{{ layoutHint }}</div>
    </BuilderFieldItem>

    <el-divider content-position="left">信息显隐</el-divider>

    <BuilderFieldItem
      label="专栏集数"
      hint="卡片上显示「已更 12 讲」这类集数信息。专栏商品没填集数时不显示这一行。"
    >
      <el-switch
        :model-value="showLessons !== false"
        @change="(v: boolean) => emit('update', { show_lessons: v })"
      />
    </BuilderFieldItem>
    <BuilderFieldItem
      label="主理人信息"
      hint="显示专栏主理人昵称。依赖专栏商品关联的作者档案，没关联时自动留空。"
    >
      <el-switch
        :model-value="showHost !== false"
        @change="(v: boolean) => emit('update', { show_host: v })"
      />
    </BuilderFieldItem>
    <BuilderFieldItem
      label="价格标签"
      hint="显示价格与会员标识。关闭后卡片只留标题与说明，适合做纯内容入口。"
    >
      <el-switch
        :model-value="showPrice !== false"
        @change="(v: boolean) => emit('update', { show_price: v })"
      />
    </BuilderFieldItem>

    <el-divider content-position="left">卡片样式</el-divider>

    <BuilderFieldItem label="卡片圆角">
      <NumSliderRow
        :model-value="Number(data.card_radius ?? 14)"
        :min="0"
        :max="20"
        :step="1"
        :fallback="14"
        @update:model-value="(v: number) => emit('update', { card_radius: v })"
      />
      <div class="ds-hint">0px = 直角，20px = 全圆角卡片</div>
    </BuilderFieldItem>

    <BuilderFieldItem label="条目间距">
      <NumSliderRow
        :model-value="Number(data.item_gap ?? 10)"
        :min="4"
        :max="24"
        :step="2"
        :fallback="10"
        @update:model-value="(v: number) => emit('update', { item_gap: v })"
      />
      <div class="ds-hint">
        单位 px，<template v-if="layout === 'grid'">双列网格下指两列之间与行之间。</template>
        <template v-else-if="layout === 'scroll'">横向滚动下指卡片之间的横向间隔。</template>
        <template v-else>单列大卡下指卡片之间的纵向间隔。</template>
      </div>
    </BuilderFieldItem>
  </el-form>
</template>

<script setup lang="ts">
/**
 * 品牌专栏（warm_columns）的「样式」子面板（在 PropsPanel 的样式页签渲染）。
 *
 * 为什么独立成文件：内容页签只该管「取哪些专栏、取几个、怎么兜底」；
 * 布局/显隐/圆角/间距是纯视觉规则，混在内容页签里会让运营为找一个开关滚过整屏。
 * PropsPanel 的 `stylePanelMap` 就是为此预留的（参照 ArticleListStyleProps）。
 */
import { computed } from 'vue'
import BuilderFieldItem from '../BuilderFieldItem.vue'
import BuilderSegmented from '../BuilderSegmented.vue'
import NumSliderRow from './NumSliderRow.vue'
import { COLUMN_LAYOUTS, resolveColumnLayout } from '../columnConfig'

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [patch: Record<string, any>] }>()

const LAYOUT_OPTIONS = COLUMN_LAYOUTS.map((l) => ({ value: l.value, label: l.label }))

const layout = computed(() => resolveColumnLayout(data.layout))

const layoutHint = computed(
  () => COLUMN_LAYOUTS.find((l) => l.value === layout.value)?.hint || '',
)

/** 三个显隐开关：老 DSL 没写过这些键 → 默认全开（保持历史页面外观不变） */
const showLessons = computed(() => data.show_lessons !== false)
const showHost = computed(() => data.show_host !== false)
const showPrice = computed(() => data.show_price !== false)
</script>

<style scoped lang="scss">
.col-style__lead {
  padding: 7px 9px;
  margin-bottom: 10px;
  color: #6b7a8d;
  font-size: 11px;
  line-height: 1.5;
  background: #f5f7fb;
  border-radius: 6px;
}

.ds-hint {
  margin: 4px 0 0;
  color: #7b8798;
  font-size: 11px;
  line-height: 1.4;
}
</style>
