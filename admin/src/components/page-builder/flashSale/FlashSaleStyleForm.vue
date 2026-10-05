<template>
  <div class="fsx-style">
    <!-- ============ 陈列布局 ============ -->
    <div class="fsx-sfield">
      <label class="fsx-slabel">
        陈列布局
        <FieldHint text="横滑最省高度；双列网格适合 4~6 件；单列大图适合主推 1~2 件爆款。" />
      </label>
      <div class="fsx-layout-row">
        <button
          v-for="opt in LAYOUT_OPTIONS"
          :key="opt.value"
          type="button"
          class="fsx-layout"
          :class="{ 'is-on': config.layout === opt.value }"
          @click="patch({ layout: opt.value })"
        >
          <span class="fsx-layout__demo" :class="`is-${opt.value}`">
            <i v-for="n in (opt.value === 'grid' ? 4 : 3)" :key="n" />
          </span>
          <span class="fsx-layout__label">{{ opt.label }}</span>
          <span class="fsx-layout__desc">{{ opt.desc }}</span>
        </button>
      </div>
    </div>

    <!-- ============ 主题色 ============ -->
    <div class="fsx-sfield">
      <label class="fsx-slabel">
        秒杀主题色
        <FieldHint text="一处改全联动：倒计时方块底色、秒杀价高亮、抢购按钮背景都跟着变。" />
      </label>
      <div class="fsx-color">
        <span class="fsx-color__label">主题色</span>
        <ColorPickerField
          class="fsx-color__ctrl"
          :model-value="config.theme_color"
          :default-value="DEFAULTS.theme_color"
          @update:model-value="(v: string) => patch({ theme_color: v })"
        />
      </div>
      <div class="fsx-theme-preview" :style="themePreviewStyle">
        <span class="fsx-theme-preview__cell" :style="{ background: config.theme_color }">{{ previewClock }}</span>
        <span class="fsx-theme-preview__price" :style="{ color: config.theme_color }">¥25</span>
        <span class="fsx-theme-preview__btn" :style="{ background: config.theme_color }">立即抢</span>
      </div>
    </div>

    <!-- ============ 卡片背景 ============ -->
    <div class="fsx-sfield">
      <label class="fsx-slabel">
        卡片背景形态
        <FieldHint text="透明无框适合页面已有底色；浅色渐变带大促氛围；纯色白卡片最干净。" />
      </label>
      <div class="fsx-surface-row">
        <button
          v-for="opt in SURFACE_OPTIONS"
          :key="opt.value"
          type="button"
          class="fsx-surface"
          :class="{ 'is-on': config.card_surface === opt.value }"
          @click="patch({ card_surface: opt.value })"
        >
          <span class="fsx-surface__demo" :class="`is-${opt.value}`"><i></i></span>
          <span class="fsx-surface__label">{{ opt.label }}</span>
          <span class="fsx-surface__desc">{{ opt.desc }}</span>
        </button>
      </div>
    </div>

    <!-- ============ 字号 ============ -->
    <div class="fsx-sfield">
      <label class="fsx-slabel">字号</label>
      <div class="fsx-size">
        <span class="fsx-size__label">标题</span>
        <NumSliderRow
          :model-value="config.title_font_size"
          :min="TITLE_SIZE.min"
          :max="TITLE_SIZE.max"
          :step="TITLE_SIZE.step"
          :fallback="TITLE_SIZE.fallback"
          @update:model-value="(v: number) => patch({ title_font_size: v })"
        />
      </div>
      <div class="fsx-size">
        <span class="fsx-size__label">元信息</span>
        <NumSliderRow
          :model-value="config.subtitle_font_size"
          :min="SUBTITLE_SIZE.min"
          :max="SUBTITLE_SIZE.max"
          :step="SUBTITLE_SIZE.step"
          :fallback="SUBTITLE_SIZE.fallback"
          @update:model-value="(v: number) => patch({ subtitle_font_size: v })"
        />
      </div>
    </div>

    <!-- ============ 外边距与圆角 ============ -->
    <div class="fsx-sfield">
      <label class="fsx-slabel">
        外边距与圆角
        <FieldHint text="「组件外边距」是卡片自身留白；组件与页面其它模块的间距在下方「外边距」里调。" />
      </label>
      <div class="fsx-size">
        <span class="fsx-size__label">组件外边距</span>
        <NumSliderRow
          :model-value="config.block_margin"
          :min="MARGIN.min"
          :max="MARGIN.max"
          :step="MARGIN.step"
          :fallback="MARGIN.fallback"
          @update:model-value="(v: number) => patch({ block_margin: v })"
        />
      </div>
      <div class="fsx-size">
        <span class="fsx-size__label">组件圆角</span>
        <NumSliderRow
          :model-value="config.block_radius"
          :min="RADIUS.min"
          :max="RADIUS.max"
          :step="RADIUS.step"
          :fallback="RADIUS.fallback"
          @update:model-value="(v: number) => patch({ block_radius: v })"
        />
      </div>
      <div class="fsx-box-preview" :style="boxPreviewStyle">
        <span class="fsx-box-preview__label">效果预览</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ColorPickerField from '../ColorPickerField.vue'
import FieldHint from '../FieldHint.vue'
// ⚠️ NumSliderRow 在 props/ 目录；写 ./NumSliderRow.vue 只在 vite build 报
//    Could not resolve，vue-tsc 查不出来。
import NumSliderRow from '../props/NumSliderRow.vue'
import {
  buildCountdownParts,
  defaultFlashSaleEndTime,
  parseFlashSaleTime,
  FLASH_SALE_DEFAULT_PROPS,
  FLASH_SALE_LAYOUT_OPTIONS,
  FLASH_SALE_MARGIN,
  FLASH_SALE_RADIUS,
  FLASH_SALE_SUBTITLE_SIZE,
  FLASH_SALE_SURFACE_OPTIONS,
  FLASH_SALE_TITLE_SIZE,
  type FlashSaleProps,
} from '../flashSale/flashSaleSchema'

/**
 * 限时秒杀「样式」窗格。
 * 需求要求把「标题字号 / 元信息字号」从内容面板迁来，并新增
 * 布局三档 / 主题色 / 卡片背景形态 / 外边距与圆角。
 */
const props = defineProps<{ config: FlashSaleProps }>()
const emit = defineEmits<{ patch: [partial: Record<string, unknown>] }>()

const LAYOUT_OPTIONS = FLASH_SALE_LAYOUT_OPTIONS
const SURFACE_OPTIONS = FLASH_SALE_SURFACE_OPTIONS
const TITLE_SIZE = FLASH_SALE_TITLE_SIZE
const SUBTITLE_SIZE = FLASH_SALE_SUBTITLE_SIZE
const MARGIN = FLASH_SALE_MARGIN
const RADIUS = FLASH_SALE_RADIUS
const DEFAULTS = FLASH_SALE_DEFAULT_PROPS

function patch(partial: Record<string, unknown>) {
  emit('patch', partial)
}

/* 主题色联动预览：让运营一眼看到「改一处会连带哪些地方」 */
const previewClock = computed(() => {
  const parts = buildCountdownParts(
    parseFlashSaleTime(props.config.end_time || defaultFlashSaleEndTime()),
    parseFlashSaleTime(props.config.start_time),
  )
  return parts.expired ? '已结束' : parts.text
})

const themePreviewStyle = computed(() => ({
  borderColor: props.config.theme_color,
}))

const boxPreviewStyle = computed(() => {
  const color = props.config.theme_color
  return {
    margin: `${props.config.block_margin / 2}px`,
    padding: `${props.config.block_margin}px`,
    borderRadius: `${props.config.block_radius}px`,
    background: props.config.card_surface === 'gradient'
      ? `linear-gradient(135deg, ${color}14, ${color}05)`
      : (props.config.card_surface === 'white' ? '#fff' : 'transparent'),
    border: props.config.card_surface === 'transparent' ? '1px dashed #ddd5c9' : `1px solid ${color}33`,
  }
})
</script>

<style lang="scss" scoped>
.fsx-sfield {
  margin-top: 14px;
}

.fsx-sfield:first-child {
  margin-top: 2px;
}

.fsx-slabel {
  display: flex;
  align-items: center;
  margin-bottom: 7px;
  font-size: 12px;
  color: #6b5b4e;
}

/* ---------- 布局 ---------- */
.fsx-layout-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.fsx-layout {
  display: grid;
  grid-template-columns: 56px 1fr;
  grid-template-rows: auto auto;
  gap: 1px 10px;
  align-items: center;
  padding: 8px 10px;
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

.fsx-layout__demo {
  display: grid;
  grid-row: 1 / 3;
  gap: 3px;
  width: 56px;
  height: 34px;
  padding: 3px;
  background: #f7f3ec;
  border-radius: 5px;

  i {
    display: block;
    background: #e8b4ae;
    border-radius: 2px;
  }
}

.fsx-layout__demo.is-scroll {
  grid-template-columns: repeat(3, 1fr);
  grid-auto-flow: column;
}

.fsx-layout__demo.is-grid {
  grid-template-columns: repeat(2, 1fr);
}

/* 单列大图：只有一张，卡片更高 */
.fsx-layout__demo.is-feature {
  grid-template-rows: 1fr;
}

.fsx-layout__demo.is-feature i:nth-child(n + 2) {
  display: none;
}

.fsx-layout__label {
  font-size: 12.5px;
  font-weight: 600;
  color: #3f3a35;
}

.fsx-layout__desc {
  font-size: 11px;
  color: #a89c8d;
}

.fsx-layout.is-on .fsx-layout__label {
  color: var(--el-color-primary, #c08e6e);
}

/* ---------- 主题色 ---------- */
.fsx-color {
  display: flex;
  gap: 8px;
  align-items: center;
}

.fsx-color__label {
  flex: none;
  width: 52px;
  font-size: 12px;
  color: #8a7d6f;
}

.fsx-color__ctrl {
  flex: 1;
  min-width: 0;
}

.fsx-theme-preview {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 9px;
  padding: 9px 10px;
  background: #faf8f5;
  border: 1px solid #eee7dd;
  border-left-width: 3px;
  border-radius: 7px;
}

.fsx-theme-preview__cell {
  padding: 2px 6px;
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #fff;
  border-radius: 4px;
}

.fsx-theme-preview__price {
  font-size: 15px;
  font-weight: 700;
}

.fsx-theme-preview__btn {
  margin-left: auto;
  padding: 3px 10px;
  font-size: 11px;
  color: #fff;
  border-radius: 999px;
}

/* ---------- 背景形态 ---------- */
.fsx-surface-row {
  display: flex;
  gap: 6px;
}

.fsx-surface {
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

.fsx-surface__demo {
  display: grid;
  place-items: center;
  height: 30px;
  margin-bottom: 2px;
  border-radius: 6px;

  i {
    display: block;
    width: 60%;
    height: 14px;
    background: #f0c8c4;
    border-radius: 3px;
  }
}

.fsx-surface__demo.is-white {
  background: #fff;
  border: 1px solid #e8e2d9;
}

.fsx-surface__demo.is-gradient {
  background: linear-gradient(135deg, #ffe9e6, #fff6f4);
}

.fsx-surface__demo.is-transparent {
  background: repeating-linear-gradient(45deg, #fbfaf8, #fbfaf8 5px, #f5f1eb 5px, #f5f1eb 10px);
  border: 1px dashed #ddd5c9;
}

.fsx-surface__label {
  font-size: 12px;
  font-weight: 600;
  color: #3f3a35;
}

.fsx-surface__desc {
  font-size: 10.5px;
  line-height: 1.4;
  color: #a89c8d;
}

.fsx-surface.is-on .fsx-surface__label {
  color: var(--el-color-primary, #c08e6e);
}

/* ---------- 字号 / 间距 ---------- */
.fsx-size {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 7px;
}

.fsx-size__label {
  flex: none;
  width: 62px;
  font-size: 12px;
  color: #8a7d6f;
}

.fsx-box-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 54px;
  margin-top: 9px;
  overflow: hidden;
  background: #fcfbf9;
  border-radius: 6px;
}

.fsx-box-preview__label {
  font-size: 11.5px;
  color: #a89c8d;
}
</style>
