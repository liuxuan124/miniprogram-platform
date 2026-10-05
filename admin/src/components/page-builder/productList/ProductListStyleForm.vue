<template>
  <div class="pls-style">
    <!-- ============ 布局模式 ============ -->
    <div class="pls-sfield">
      <label class="pls-slabel">
        布局模式
        <FieldHint text="横向单列与横向滑动的列数由布局固定，宫格可切两列/三列。" />
      </label>
      <BuilderSegmented
        :model-value="config.layout"
        block
        :options="LAYOUT_OPTIONS"
        @update:model-value="(v) => patch({ layout: v as ProductListLayout })"
      />
      <div class="pls-layout-preview" :class="previewClass">
        <span
          v-for="n in previewCells"
          :key="n"
          class="pls-layout-preview__cell"
        ></span>
      </div>
    </div>

    <!-- ============ 列数（仅宫格） ============ -->
    <div class="pls-sfield">
      <label class="pls-slabel">
        列数
        <FieldHint text="只在「宫格网格」下生效。" />
      </label>
      <!-- 🔴 联动约束：非宫格时锁定并说明原因，而不是直接消失
           （直接消失会让运营以为「列数」这个功能坏了） -->
      <BuilderSegmented
        :model-value="config.columns"
        block
        disabled
        :options="COLUMN_OPTIONS"
      />
      <div v-if="ignoresColumns" class="pls-lock-note">
        「{{ layoutLabel }}」的列数由布局固定（{{ fixedColumns }}），已锁定。
      </div>
    </div>

    <!-- ============ 度量参数 ============ -->
    <div class="pls-sfield">
      <label class="pls-slabel">
        度量参数
        <FieldHint text="单位 px。数值控件右侧直接标单位，不需要另起一行说明文案。" />
      </label>
      <div class="pls-metric">
        <span class="pls-metric__label">卡片间距</span>
        <NumSliderRow
          :model-value="config.item_gap"
          :min="GAP.min"
          :max="GAP.max"
          :step="GAP.step"
          :fallback="GAP.fallback"
          @update:model-value="(v: number) => patch({ item_gap: v })"
        />
      </div>
      <div class="pls-metric">
        <span class="pls-metric__label">外框圆角</span>
        <NumSliderRow
          :model-value="config.item_border_radius"
          :min="CARD_RADIUS.min"
          :max="CARD_RADIUS.max"
          :step="CARD_RADIUS.step"
          :fallback="CARD_RADIUS.fallback"
          @update:model-value="(v: number) => patch({ item_border_radius: v })"
        />
      </div>
      <div class="pls-metric">
        <span class="pls-metric__label">图片圆角</span>
        <NumSliderRow
          :model-value="config.image_border_radius"
          :min="IMAGE_RADIUS.min"
          :max="IMAGE_RADIUS.max"
          :step="IMAGE_RADIUS.step"
          :fallback="IMAGE_RADIUS.fallback"
          @update:model-value="(v: number) => patch({ image_border_radius: v })"
        />
      </div>
    </div>

    <!-- ============ 排版 ============ -->
    <div class="pls-sfield">
      <label class="pls-slabel">
        字号
        <FieldHint text="商品名加粗开关与三组字号放一起，都是文字视觉规则。" />
      </label>
      <div class="pls-switch-row">
        <span class="pls-switch-row__label">商品名加粗</span>
        <el-switch
          :model-value="config.title_bold"
          @update:model-value="(v: boolean) => patch({ title_bold: v })"
        />
      </div>
      <div class="pls-metric">
        <span class="pls-metric__label">标题字号</span>
        <NumSliderRow
          :model-value="config.title_font_size"
          :min="TITLE_SIZE.min"
          :max="TITLE_SIZE.max"
          :step="TITLE_SIZE.step"
          :fallback="TITLE_SIZE.fallback"
          @update:model-value="(v: number) => patch({ title_font_size: v })"
        />
      </div>
      <div class="pls-metric">
        <span class="pls-metric__label">价格字号</span>
        <NumSliderRow
          :model-value="config.price_font_size"
          :min="PRICE_SIZE.min"
          :max="PRICE_SIZE.max"
          :step="PRICE_SIZE.step"
          :fallback="PRICE_SIZE.fallback"
          @update:model-value="(v: number) => patch({ price_font_size: v })"
        />
      </div>
      <div class="pls-metric">
        <span class="pls-metric__label">已售字号</span>
        <NumSliderRow
          :model-value="config.sales_font_size"
          :min="SALES_SIZE.min"
          :max="SALES_SIZE.max"
          :step="SALES_SIZE.step"
          :fallback="SALES_SIZE.fallback"
          @update:model-value="(v: number) => patch({ sales_font_size: v })"
        />
      </div>
    </div>

    <!-- ============ 色彩与卡片风格 ============ -->
    <div class="pls-sfield">
      <label class="pls-slabel">
        价格高亮色
        <FieldHint text="品牌色已内置在取色器预设里；0 元商品会自动用绿色区分，不跟随此色。" />
      </label>
      <div class="pls-color">
        <span class="pls-color__label">价格色</span>
        <ColorPickerField
          class="pls-color__ctrl"
          :model-value="config.price_color"
          :default-value="DEFAULTS.price_color"
          @update:model-value="(v: string) => patch({ price_color: v })"
        />
      </div>
      <div class="pls-color-preview">
        <span class="pls-color-preview__paid" :style="{ color: config.price_color }">¥199.00</span>
        <span class="pls-color-preview__free">免费领取</span>
      </div>
    </div>

    <div class="pls-sfield">
      <label class="pls-slabel">
        卡片风格
        <FieldHint text="描边卡片在浅色底页面上更轻；平铺适合卡片本身已有底色的场景。" />
      </label>
      <div class="pls-surface-row">
        <button
          v-for="opt in SURFACE_OPTIONS"
          :key="opt.value"
          type="button"
          class="pls-surface"
          :class="{ 'is-on': config.card_style === opt.value }"
          @click="patch({ card_style: opt.value })"
        >
          <span class="pls-surface__demo" :class="`is-${opt.value}`"><i></i></span>
          <span class="pls-surface__label">{{ opt.label }}</span>
          <span class="pls-surface__desc">{{ opt.desc }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BuilderSegmented from '../BuilderSegmented.vue'
import ColorPickerField from '../ColorPickerField.vue'
import FieldHint from '../FieldHint.vue'
// ⚠️ NumSliderRow 在 props/ 目录；写 ./NumSliderRow.vue 只在 vite build 报
//    Could not resolve，vue-tsc 查不出来。
// 2026-10-05 修正：路径补 ../props/，否则整个 admin 构建失败（非本文件作者）。
import NumSliderRow from '../props/NumSliderRow.vue'
import {
  PRODUCT_LIST_CARD_RADIUS,
  PRODUCT_LIST_CARD_STYLE_OPTIONS,
  PRODUCT_LIST_COLUMN_OPTIONS,
  PRODUCT_LIST_DEFAULT_PROPS,
  PRODUCT_LIST_GAP,
  PRODUCT_LIST_IMAGE_RADIUS,
  PRODUCT_LIST_LAYOUT_OPTIONS,
  PRODUCT_LIST_PRICE_SIZE,
  PRODUCT_LIST_SALES_SIZE,
  PRODUCT_LIST_TITLE_SIZE,
  layoutIgnoresColumns,
  resolveColumnCount,
  type ProductListLayout,
  type ProductListProps,
} from '../productList/productListSchema'

/**
 * 商品列表「样式」窗格。
 *
 * 需求要求把这批字段从「内容」Tab 迁到这里：
 *   布局形态 / 列数 / 卡片间距 / 商品卡圆角 / 图片圆角 / 商品名加粗 /
 *   标题字号 / 价格字号 / 已售字号
 * —— 它们都是**纯视觉规则**，与「选哪些商品」无关，混在一起会让运营为找圆角滚过数据源。
 */
const props = defineProps<{ config: ProductListProps }>()
const emit = defineEmits<{ patch: [partial: Record<string, unknown>] }>()

const LAYOUT_OPTIONS = PRODUCT_LIST_LAYOUT_OPTIONS
const COLUMN_OPTIONS = PRODUCT_LIST_COLUMN_OPTIONS
const SURFACE_OPTIONS = PRODUCT_LIST_CARD_STYLE_OPTIONS
const GAP = PRODUCT_LIST_GAP
const CARD_RADIUS = PRODUCT_LIST_CARD_RADIUS
const IMAGE_RADIUS = PRODUCT_LIST_IMAGE_RADIUS
const TITLE_SIZE = PRODUCT_LIST_TITLE_SIZE
const PRICE_SIZE = PRODUCT_LIST_PRICE_SIZE
const SALES_SIZE = PRODUCT_LIST_SALES_SIZE
const DEFAULTS = PRODUCT_LIST_DEFAULT_PROPS

function patch(partial: Record<string, unknown>) {
  emit('patch', partial)
}

/** 非宫格时列数被布局固定 → 锁定并说明原因 */
const ignoresColumns = computed(() => layoutIgnoresColumns(props.config.layout))
const fixedColumns = computed(() => resolveColumnCount(props.config.layout, props.config.columns))
const layoutLabel = computed(
  () => PRODUCT_LIST_LAYOUT_OPTIONS.find((o) => o.value === props.config.layout)?.label || '',
)

/** 布局缩略预览的格子数（宫格按实际列数取） */
const previewCells = computed(() => {
  const cols = resolveColumnCount(props.config.layout, props.config.columns)
  if (props.config.layout === 'row') return 2
  return Math.min(6, cols * 2)
})

/**
 * 预览的列数class。
 * 🔴 宫格要区分 2/3 列，只写 `is-grid` 一个类的话两档看起来一模一样，
 *    运营切了列数发现预览没变化，会以为功能没生效。
 */
const previewClass = computed(() => {
  if (props.config.layout !== 'grid') return `is-${props.config.layout}`
  return `is-grid cols-${resolveColumnCount(props.config.layout, props.config.columns)}`
})
</script>

<style lang="scss" scoped>
.pls-sfield {
  margin-top: 14px;
}

.pls-sfield:first-child {
  margin-top: 2px;
}

.pls-slabel {
  display: flex;
  align-items: center;
  margin-bottom: 7px;
  font-size: 12px;
  color: #6b5b4e;
}

.pls-lock-note {
  margin-top: 6px;
  font-size: 11px;
  line-height: 1.5;
  color: #a89c8d;
}

/* ---------- 布局缩略预览 ---------- */
.pls-layout-preview {
  display: grid;
  gap: 3px;
  height: 42px;
  margin-top: 8px;
  padding: 4px;
  background: #f7f3ec;
  border-radius: 6px;
}

.pls-layout-preview.is-grid { grid-template-columns: repeat(2, 1fr); }
.pls-layout-preview.is-grid.cols-3 { grid-template-columns: repeat(3, 1fr); }
.pls-layout-preview.is-row { grid-template-columns: 1fr; }
.pls-layout-preview.is-waterfall { grid-template-columns: repeat(2, 1fr); }
.pls-layout-preview.is-scroll { grid-template-columns: repeat(4, 1fr); }

.pls-layout-preview__cell {
  display: block;
  background: #e8b4ae;
  border-radius: 2px;
}

/* ---------- 开关行 ---------- */
.pls-switch-row {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  padding: 3px 0 7px;
}

.pls-switch-row__label {
  font-size: 12px;
  color: #6b5b4e;
}

/* ---------- 度量 ---------- */
.pls-metric {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 7px;
}

.pls-metric__label {
  flex: none;
  width: 58px;
  font-size: 12px;
  color: #8a7d6f;
}

/* ---------- 色彩 ---------- */
.pls-color {
  display: flex;
  gap: 8px;
  align-items: center;
}

.pls-color__label {
  flex: none;
  width: 58px;
  font-size: 12px;
  color: #8a7d6f;
}

.pls-color__ctrl {
  flex: 1;
  min-width: 0;
}

.pls-color-preview {
  display: flex;
  gap: 12px;
  align-items: baseline;
  margin-top: 8px;
  padding: 8px 10px;
  background: #faf8f5;
  border: 1px solid #eee7dd;
  border-radius: 7px;
}

.pls-color-preview__paid {
  font-size: 17px;
  font-weight: 800;
}

/* 🔴 0 元商品的绿色是固定的，不跟随价格色 —— 画布与真机必须一致 */
.pls-color-preview__free {
  font-size: 13px;
  font-weight: 700;
  color: #1fa97a;
}

/* ---------- 卡片风格 ---------- */
.pls-surface-row {
  display: flex;
  gap: 6px;
}

.pls-surface {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 3px;
  padding: 8px 6px 7px;
  text-align: left;
  cursor: pointer;
  background: #fff;
  border: 1px solid #e8e2d9;
  border-radius: 8px;

  &:hover {
    border-color: #d8cfc2;
  }

  &.is-on {
    background: #fdf6f1;
    border-color: var(--el-color-primary, #c08e6e);
  }
}

.pls-surface__demo {
  display: grid;
  place-items: center;
  height: 32px;
  margin-bottom: 2px;
  background: #fcfbf9;
  border-radius: 6px;

  i {
    display: block;
    width: 62%;
    height: 20px;
    background: #f0c8c4;
    border-radius: 3px;
  }
}

.pls-surface__demo.is-shadow i {
  background: #fff;
  box-shadow: 0 2px 6px rgba(28, 43, 76, 0.12);
}

.pls-surface__demo.is-outline i {
  background: transparent;
  border: 1px solid #e8e2d9;
}

.pls-surface__demo.is-flat i {
  background: #f5f1eb;
}

.pls-surface__label {
  font-size: 12px;
  font-weight: 600;
  color: #3f3a35;
}

.pls-surface__desc {
  font-size: 10.5px;
  line-height: 1.4;
  color: #a89c8d;
}

.pls-surface.is-on .pls-surface__label {
  color: var(--el-color-primary, #c08e6e);
}
</style>
