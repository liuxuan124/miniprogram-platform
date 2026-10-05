<template>
  <div class="col-style">
    <!-- ==================== 布局方式 ==================== -->
    <div class="col-fld">
      <span class="col-fld__lab">
        布局方式
        <el-tooltip :content="layoutHint" placement="top" :show-after="200">
          <span class="col-q" role="button" tabindex="0">?</span>
        </el-tooltip>
      </span>
      <BuilderSegmented
        :model-value="layout"
        :options="LAYOUT_OPTIONS"
        block
        aria-label="布局方式"
        @update:model-value="(v: string | number) => emit('update', { layout: String(v) })"
      />
    </div>

    <!--
      🔴 「信息显隐」与「卡片样式」合并成一个折叠组（2026-10-06）。
      原来用 el-divider 分成两段平铺，六个字段一路排下来占掉大半屏，
      而且无法折叠 —— 只能整体滚。合并后标题行右侧显示摘要，
      全部收起时也能一眼扫完。
    -->
    <StyleFoldGroup v-model:open="groupOpen" title="卡片外观与样式" :summary="groupSummary">
      <div class="switch-row">
        <span class="switch-row__lab">
          专栏集数
          <el-tooltip text="卡片上显示「已更 12 讲」这类集数信息。专栏商品没填集数时不显示这一行。" placement="top" :show-after="200">
            <span class="col-q" role="button" tabindex="0">?</span>
          </el-tooltip>
        </span>
        <el-switch
          :model-value="showLessons"
          @change="(v: boolean) => emit('update', { show_lessons: v })"
        />
      </div>

      <div class="switch-row">
        <span class="switch-row__lab">
          主理人信息
          <el-tooltip text="显示专栏主理人昵称。依赖专栏商品关联的作者档案，没关联时自动留空。" placement="top" :show-after="200">
            <span class="col-q" role="button" tabindex="0">?</span>
          </el-tooltip>
        </span>
        <el-switch
          :model-value="showHost"
          @change="(v: boolean) => emit('update', { show_host: v })"
        />
      </div>

      <div class="switch-row">
        <span class="switch-row__lab">
          价格标签
          <el-tooltip text="显示价格与会员标识。关闭后卡片只留标题与说明，适合做纯内容入口。" placement="top" :show-after="200">
            <span class="col-q" role="button" tabindex="0">?</span>
          </el-tooltip>
        </span>
        <el-switch
          :model-value="showPrice"
          @change="(v: boolean) => emit('update', { show_price: v })"
        />
      </div>

      <CompactSliderRow
        label="卡片圆角"
        hint="0px = 直角，20px = 全圆角卡片"
        :model-value="Number(data.card_radius ?? 14)"
        :min="0"
        :max="20"
        :step="1"
        :fallback="14"
        @update:model-value="(v: number) => emit('update', { card_radius: v })"
      />

      <!--
        条目间距的语义随布局而变：同一个数字在三种布局下控制不同的东西。
        🔴 只改文案、**不改字段名与数值**：三个布局共用一个 item_gap，
        拆成三个独立字段会让老页面切布局时被静默解释成另一种含义。
      -->
      <CompactSliderRow
        label="条目间距"
        :hint="gapHint"
        :model-value="Number(data.item_gap ?? 10)"
        :min="4"
        :max="24"
        :step="2"
        :fallback="10"
        @update:model-value="(v: number) => emit('update', { item_gap: v })"
      />
    </StyleFoldGroup>
  </div>
</template>

<script setup lang="ts">
/**
 * 品牌专栏（warm_columns）的「样式」子面板（在 PropsPanel 的样式页签渲染）。
 *
 * 为什么独立成文件：内容页签只该管「取哪些专栏、取几个、怎么兜底」；
 * 布局/显隐/圆角/间距是纯视觉规则，混在内容页签里会让运营为找一个开关滚过整屏。
 * PropsPanel 的 `stylePanelMap` 就是为此预留的（参照 ArticleListStyleProps）。
 */
import { computed, ref } from 'vue'
import BuilderSegmented from '../BuilderSegmented.vue'
import CompactSliderRow from '../CompactSliderRow.vue'
import StyleFoldGroup from '../StyleFoldGroup.vue'
import { COLUMN_LAYOUTS, resolveColumnLayout } from '../columnConfig'

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [patch: Record<string, any>] }>()

const LAYOUT_OPTIONS = COLUMN_LAYOUTS.map((l) => ({ value: l.value, label: l.label }))

const groupOpen = ref(true)

const layout = computed(() => resolveColumnLayout(data.layout))

const layoutHint = computed(
  () => COLUMN_LAYOUTS.find((l) => l.value === layout.value)?.hint || '',
)

/** 三个显隐开关：老 DSL 没写过这些键 → 默认全开（保持历史页面外观不变） */
const showLessons = computed(() => data.show_lessons !== false)
const showHost = computed(() => data.show_host !== false)
const showPrice = computed(() => data.show_price !== false)

/**
 * 条目间距的语义随布局而变 —— 需求点名的联动。
 * ⚠️ 只改文案、**不改字段名与数值**：三个布局共用一个 item_gap，
 * 拆成三个字段会让老页面切布局时被静默解释成另一种含义。
 */
const gapHint = computed(() => {
  const v = layout.value
  if (v === 'grid') return '网格行距与列距：控制两列之间与每行之间的空隙'
  if (v === 'scroll') return '横向滑动间隙：控制卡片之间的横向间隔'
  return '单列大卡下指卡片之间的纵向间隔'
})

const groupSummary = computed(() => {
  const parts: string[] = [`圆角 ${Number(data.card_radius ?? 14)}`, `间距 ${Number(data.item_gap ?? 10)}`]
  const off: string[] = []
  if (!showLessons.value) off.push('集数')
  if (!showHost.value) off.push('主理人')
  if (!showPrice.value) off.push('价格')
  if (off.length) parts.push(`已隐藏 ${off.join('/')}`)
  return parts.join(' · ')
})
</script>

<style scoped>
.col-style { display: flex; flex-direction: column; }

/* 布局方式：标签一行 + 分段控件一行（3 个中文选项放不下一行 80px） */
.col-fld { display: flex; flex-direction: column; gap: 4px; }
.col-fld__lab {
  display: flex;
  align-items: center;
  gap: 3px;
  color: #64748b;
  font-size: 12px;
}

.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 28px;
}
.switch-row__lab {
  display: flex;
  align-items: center;
  gap: 3px;
  color: #64748b;
  font-size: 12px;
}

.col-q {
  display: inline-grid;
  place-items: center;
  flex: none;
  width: 13px;
  height: 13px;
  color: #a8b3c4;
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
  border: 1px solid #dbe2ec;
  border-radius: 50%;
  cursor: help;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}
.col-q:hover,
.col-q:focus-visible {
  color: #64748b;
  background: #f1f5f9;
  border-color: #cbd5e1;
  outline: none;
}
</style>