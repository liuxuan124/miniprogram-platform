<template>
  <div class="cp-style">
    <!-- ============ 排列布局 ============ -->
    <div class="cp-sfield">
      <label class="cp-slabel">
        排列布局
        <FieldHint text="横向滑动最省高度；双列网格信息密度高；纵向平铺每张能放更多信息。" />
      </label>
      <div class="cp-layout-row">
        <button
          v-for="opt in LAYOUT_OPTIONS"
          :key="opt.value"
          type="button"
          class="cp-layout"
          :class="{ 'is-on': config.layout === opt.value }"
          @click="patch({ layout: opt.value })"
        >
          <span class="cp-layout__demo" :class="`is-${opt.value}`">
            <i v-for="n in (opt.value === 'grid' ? 4 : 3)" :key="n" />
          </span>
          <span class="cp-layout__label">{{ opt.label }}</span>
        </button>
      </div>
    </div>

    <!-- ============ 票券风格 ============ -->
    <div class="cp-sfield">
      <label class="cp-slabel">
        票券风格
        <FieldHint text="撕边最有票券感；打孔更柔和；极简圆角最干净。风格只影响外观，不影响领取逻辑。" />
      </label>
      <div class="cp-theme-row">
        <button
          v-for="opt in THEME_OPTIONS"
          :key="opt.value"
          type="button"
          class="cp-theme"
          :class="{ 'is-on': config.theme === opt.value }"
          @click="patch({ theme: opt.value })"
        >
          <span class="cp-theme__demo" :class="`is-${opt.value}`">
            <span class="cp-theme__amount">¥30</span>
            <span class="cp-theme__body"></span>
          </span>
          <span class="cp-theme__label">{{ opt.label }}</span>
        </button>
      </div>
    </div>

    <!-- ============ 文字与色彩 ============ -->
    <div class="cp-sfield">
      <label class="cp-slabel">字号</label>
      <div class="cp-size-row">
        <div class="cp-size">
          <span class="cp-size__label">标题</span>
          <NumSliderRow
            :model-value="config.title_size"
            :min="TITLE_SIZE.min"
            :max="TITLE_SIZE.max"
            :step="TITLE_SIZE.step"
            :fallback="TITLE_SIZE.fallback"
            @update:model-value="(v: number) => patch({ title_size: v })"
          />
        </div>
        <div class="cp-size">
          <span class="cp-size__label">面额</span>
          <NumSliderRow
            :model-value="config.amount_size"
            :min="AMOUNT_SIZE.min"
            :max="AMOUNT_SIZE.max"
            :step="AMOUNT_SIZE.step"
            :fallback="AMOUNT_SIZE.fallback"
            @update:model-value="(v: number) => patch({ amount_size: v })"
          />
        </div>
        <div class="cp-size">
          <span class="cp-size__label">描述</span>
          <NumSliderRow
            :model-value="config.desc_size"
            :min="DESC_SIZE.min"
            :max="DESC_SIZE.max"
            :step="DESC_SIZE.step"
            :fallback="DESC_SIZE.fallback"
            @update:model-value="(v: number) => patch({ desc_size: v })"
          />
        </div>
      </div>
    </div>

    <div class="cp-sfield">
      <label class="cp-slabel">
        色彩
        <FieldHint text="已领取 / 已抢光的券会自动置灰并弱化按钮，灰度由系统按底色自动算，无需单独配。" />
      </label>
      <div class="cp-color">
        <span class="cp-color__label">券背景</span>
        <ColorPickerField
          class="cp-color__ctrl"
          :model-value="config.bg_color"
          :show-alpha="true"
          :default-value="DEFAULTS.bg_color"
          @update:model-value="(v: string) => patch({ bg_color: v })"
        />
      </div>
      <div class="cp-color">
        <span class="cp-color__label">金额色</span>
        <ColorPickerField
          class="cp-color__ctrl"
          :model-value="config.amount_color"
          :show-alpha="true"
          :default-value="DEFAULTS.amount_color"
          @update:model-value="(v: string) => patch({ amount_color: v })"
        />
      </div>
      <div class="cp-color">
        <span class="cp-color__label">按钮色</span>
        <ColorPickerField
          class="cp-color__ctrl"
          :model-value="config.btn_color"
          :show-alpha="true"
          :default-value="DEFAULTS.btn_color"
          @update:model-value="(v: string) => patch({ btn_color: v })"
        />
      </div>
    </div>

    <!-- ============ 间距 ============ -->
    <div class="cp-sfield">
      <label class="cp-slabel">间距</label>
      <div class="cp-size">
        <span class="cp-size__label">卡片间距</span>
        <NumSliderRow
          :model-value="config.card_gap"
          :min="GAP.min"
          :max="GAP.max"
          :step="GAP.step"
          :fallback="GAP.fallback"
          @update:model-value="(v: number) => patch({ card_gap: v })"
        />
      </div>
      <div class="cp-size">
        <span class="cp-size__label">上下边距</span>
        <NumSliderRow
          :model-value="config.block_padding"
          :min="PADDING.min"
          :max="PADDING.max"
          :step="PADDING.step"
          :fallback="PADDING.fallback"
          @update:model-value="(v: number) => patch({ block_padding: v })"
        />
      </div>
      <div class="cp-hint">
        「上下边距」是组件内边距；组件与页面其它模块之间的间距请在下方「外边距」里调。
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import ColorPickerField from '../ColorPickerField.vue'
import FieldHint from '../FieldHint.vue'
// ⚠️ NumSliderRow 在 props/ 目录，不在本目录；写 ./NumSliderRow.vue 会在vite build
//    报Could not resolve（vue-tsc 查不出相对路径解析失败）。
import NumSliderRow from '../props/NumSliderRow.vue'
import {
  COUPON_AMOUNT_SIZE,
  COUPON_DEFAULT_PROPS,
  COUPON_DESC_SIZE,
  COUPON_GAP,
  COUPON_LAYOUT_OPTIONS,
  COUPON_PADDING,
  COUPON_THEME_OPTIONS,
  COUPON_TITLE_SIZE,
  type CouponProps,
} from '../coupon/couponSchema'

/**
 * 优惠券「样式」窗格。
 * 需求明确要求把「标题字号 / 内容字号 / 样式（横向纵向）」从内容面板迁到这里 ——
 * 这三项此前混在内容页签里，导致运营改字号要穿过数据源配置。
 */
const props = defineProps<{ config: CouponProps }>()
const emit = defineEmits<{ patch: [partial: Record<string, unknown>] }>()

const LAYOUT_OPTIONS = COUPON_LAYOUT_OPTIONS
const THEME_OPTIONS = COUPON_THEME_OPTIONS
const TITLE_SIZE = COUPON_TITLE_SIZE
const AMOUNT_SIZE = COUPON_AMOUNT_SIZE
const DESC_SIZE = COUPON_DESC_SIZE
const GAP = COUPON_GAP
const PADDING = COUPON_PADDING
const DEFAULTS = COUPON_DEFAULT_PROPS

function patch(partial: Record<string, unknown>) {
  emit('patch', partial)
}
</script>

<style lang="scss" scoped>
.cp-sfield {
  margin-top: 14px;
}

.cp-sfield:first-child {
  margin-top: 2px;
}

.cp-slabel {
  display: flex;
  align-items: center;
  margin-bottom: 7px;
  font-size: 12px;
  color: #6b5b4e;
}

.cp-hint {
  margin-top: 6px;
  font-size: 11px;
  line-height: 1.5;
  color: #a89c8d;
}

/* ---------- 布局 ---------- */
.cp-layout-row {
  display: flex;
  gap: 6px;
}

.cp-layout {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 5px;
  align-items: center;
  padding: 8px 3px 6px;
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

.cp-layout__demo {
  display: grid;
  gap: 3px;
  width: 100%;
  height: 32px;
  padding: 3px;
  background: #f7f3ec;
  border-radius: 5px;

  i {
    display: block;
    background: #e8b4ae;
    border-radius: 2px;
  }
}

.cp-layout__demo.is-scroll {
  grid-template-columns: repeat(3, 1fr);
  grid-auto-flow: column;
}

.cp-layout__demo.is-grid {
  grid-template-columns: repeat(2, 1fr);
}

.cp-layout__demo.is-stack {
  grid-template-rows: repeat(3, 1fr);
}

.cp-layout__label {
  font-size: 11px;
  color: #6b5b4e;
}

.cp-layout.is-on .cp-layout__label {
  font-weight: 600;
  color: var(--el-color-primary, #c08e6e);
}

/* ---------- 票券风格 ---------- */
.cp-theme-row {
  display: flex;
  gap: 6px;
}

.cp-theme {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 5px;
  align-items: center;
  padding: 8px 3px 6px;
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

.cp-theme__demo {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  height: 26px;
  overflow: hidden;
  background: #ffeceb;
  border: 1px solid #f6d5d2;
}

.cp-theme__amount {
  flex: none;
  width: 24%;
  font-size: 10px;
  font-weight: 700;
  color: #f56c6c;
  text-align: center;
}

.cp-theme__body {
  flex: 1;
  height: 12px;
  background: rgba(245, 108, 108, 0.28);
  border-radius: 2px;
}

/* 经典锯齿撕边：右侧用 CSS 渐变做出锯齿缺口 */
.cp-theme__demo.is-tear .cp-theme__body {
  margin-right: 3px;
  -webkit-mask-image: repeating-linear-gradient(90deg, #000 0 3px, transparent 3px 6px);
  mask-image: repeating-linear-gradient(90deg, #000 0 3px, transparent 3px 6px);
}

/* 内凹打孔：左右各一个半圆缺口 */
.cp-theme__demo.is-punch::before,
.cp-theme__demo.is-punch::after {
  position: absolute;
  top: 50%;
  width: 8px;
  height: 16px;
  content: '';
  background: #fff;
  border-radius: 50%;
  transform: translateY(-50%);
}

.cp-theme__demo.is-punch::before { left: -4px; }
.cp-theme__demo.is-punch::after { right: -4px; }

/* 极简圆角 */
.cp-theme__demo.is-rounded {
  border-radius: 7px;
}

.cp-theme__label {
  font-size: 11px;
  color: #6b5b4e;
}

.cp-theme.is-on .cp-theme__label {
  font-weight: 600;
  color: var(--el-color-primary, #c08e6e);
}

/* ---------- 字号 / 间距 ---------- */
.cp-size-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cp-size {
  display: flex;
  gap: 8px;
  align-items: center;
}

.cp-size__label {
  flex: none;
  width: 52px;
  font-size: 12px;
  color: #8a7d6f;
}

/* ---------- 颜色 ---------- */
.cp-color {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 7px;
}

.cp-color__label {
  flex: none;
  width: 52px;
  font-size: 12px;
  color: #8a7d6f;
}

.cp-color__ctrl {
  flex: 1;
  min-width: 0;
}
</style>
