<template>
  <div class="srch-style">
    <!-- 框体风格 -->
    <div class="srch-sfield">
      <label class="srch-slabel">
        框体风格
        <FieldHint text="三档圆角对应移动端常见搜索框形态：胶囊最柔和，直角最硬朗。" />
      </label>
      <div class="srch-shape-row">
        <button
          v-for="opt in SHAPE_OPTIONS"
          :key="opt.value"
          type="button"
          class="srch-shape"
          :class="{ 'is-on': config.shape === opt.value }"
          :title="`圆角 ${opt.radius}px`"
          @click="patch({ shape: opt.value })"
        >
          <span class="srch-shape__demo" :style="{ borderRadius: `${opt.radius}px` }"></span>
          <span class="srch-shape__label">{{ opt.label }}</span>
        </button>
      </div>
    </div>

    <!-- 内容对齐 -->
    <div class="srch-sfield">
      <label class="srch-slabel">
        内容对齐
        <FieldHint text="居中时搜索图标会跟着一起居右，适合窄条搜索位。" />
      </label>
      <BuilderSegmented
        :model-value="config.align"
        block
        :options="ALIGN_OPTIONS"
        @update:model-value="(v) => patch({ align: v as SearchAlign })"
      />
    </div>

    <!-- 颜色系统 -->
    <div class="srch-sfield">
      <label class="srch-slabel">
        颜色系统
        <FieldHint text="支持色号直接录入与透明度调节（Alpha）。" />
      </label>
      <div class="srch-color">
        <span class="srch-color__label">搜索框底色</span>
        <ColorPickerField
          class="srch-color__ctrl"
          :model-value="config.bg_color"
          :show-alpha="true"
          :default-value="DEFAULTS.bg_color"
          @update:model-value="(v: string) => patch({ bg_color: v })"
        />
      </div>
      <div class="srch-color">
        <span class="srch-color__label">文字/图标</span>
        <ColorPickerField
          class="srch-color__ctrl"
          :model-value="config.text_color"
          :show-alpha="true"
          :default-value="DEFAULTS.text_color"
          @update:model-value="(v: string) => patch({ text_color: v })"
        />
      </div>
      <div class="srch-border">
        <div class="srch-color">
          <span class="srch-color__label">边框粗细</span>
          <div class="srch-border__ctrl">
            <el-slider
              class="srch-border__bar"
              :model-value="config.border_width"
              :min="BORDER.min"
              :max="BORDER.max"
              :step="BORDER.step"
              :show-tooltip="false"
              @update:model-value="(v: number | number[]) => patch({ border_width: Number(v) })"
            />
            <span class="srch-border__val">{{ config.border_width }}px</span>
          </div>
        </div>
        <div class="srch-color">
          <span class="srch-color__label">边框颜色</span>
          <ColorPickerField
            class="srch-color__ctrl"
            :model-value="config.border_color"
            :show-alpha="true"
            :default-value="DEFAULTS.border_color"
            @update:model-value="(v: string) => patch({ border_color: v })"
          />
        </div>
        <div class="srch-border__hint">
          粗细设为 0 即为无边框，此时边框颜色不生效。
        </div>
      </div>
    </div>

    <!-- 吸顶常驻 -->
    <div class="srch-sfield">
      <label class="srch-slabel">
        吸顶常驻
        <FieldHint text="开启后页面下滑时搜索框固定在顶部。适合活动页/长文页的强检索入口。" />
      </label>
      <el-switch
        :model-value="config.sticky"
        active-text="页面滚动时吸顶"
        @update:model-value="(v: boolean) => patch({ sticky: v })"
      />
      <div v-if="config.sticky" class="srch-sticky">
        <div class="srch-color">
          <span class="srch-color__label">吸顶底色</span>
          <ColorPickerField
            class="srch-color__ctrl"
            :model-value="config.sticky_bg"
            :show-alpha="true"
            :default-value="DEFAULTS.sticky_bg"
            @update:model-value="(v: string) => patch({ sticky_bg: v })"
          />
        </div>
        <div class="srch-border__hint">
          留空则沿用常态底色；内容从搜索框下方穿过时建议给不透明底色。
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import BuilderSegmented from '../BuilderSegmented.vue'
import ColorPickerField from '../ColorPickerField.vue'
import FieldHint from '../FieldHint.vue'
import {
  SEARCH_ALIGN_OPTIONS,
  SEARCH_BORDER_WIDTH,
  SEARCH_DEFAULT_PROPS,
  SEARCH_SHAPE_OPTIONS,
  type SearchAlign,
  type SearchProps,
} from './searchSchema'

/**
 * 搜索组件「样式」窗格。
 * 独立成组件的原因：PropsPanel 在分区模式下会把内容/样式拍平成两个一级 tab，
 * 本表单需要在两种宿主下都出现一次，故抽成可复用块而不是写在 SearchProps 里。
 */
const props = defineProps<{ config: SearchProps }>()
const emit = defineEmits<{ patch: [partial: Record<string, unknown>] }>()

const SHAPE_OPTIONS = SEARCH_SHAPE_OPTIONS
const ALIGN_OPTIONS = SEARCH_ALIGN_OPTIONS
const BORDER = SEARCH_BORDER_WIDTH
const DEFAULTS = SEARCH_DEFAULT_PROPS

function patch(partial: Record<string, unknown>) {
  emit('patch', partial)
}
</script>

<style lang="scss" scoped>
.srch-sfield {
  margin-top: 14px;
}

.srch-sfield:first-child {
  margin-top: 2px;
}

.srch-slabel {
  display: flex;
  align-items: center;
  margin-bottom: 7px;
  font-size: 12px;
  color: #6b5b4e;
}

/* ---------- 框体风格 ---------- */
.srch-shape-row {
  display: flex;
  gap: 6px;
}

.srch-shape {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 5px;
  align-items: center;
  padding: 8px 4px 6px;
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

.srch-shape__demo {
  width: 100%;
  height: 16px;
  background: #f1ede6;
  border: 1px solid #ddd5c9;
}

.srch-shape__label {
  font-size: 11.5px;
  color: #6b5b4e;
}

.srch-shape.is-on .srch-shape__label {
  font-weight: 600;
  color: var(--el-color-primary, #c08e6e);
}

/* ---------- 颜色 ---------- */
.srch-color {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 7px;
}

.srch-color__label {
  flex: none;
  width: 58px;
  font-size: 12px;
  color: #8a7d6f;
}

.srch-color__ctrl {
  flex: 1;
  min-width: 0;
}

.srch-border {
  margin-top: 2px;
  padding-top: 2px;
}

.srch-border__ctrl {
  display: flex;
  flex: 1;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.srch-border__bar {
  flex: 1;
  min-width: 0;
  padding-right: 4px;
}

.srch-border__val {
  flex: none;
  min-width: 30px;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: #475569;
  text-align: right;
}

.srch-border__hint {
  margin-top: 6px;
  font-size: 11px;
  line-height: 1.5;
  color: #a89c8d;
}

.srch-sticky {
  margin-top: 8px;
  padding: 9px 10px 2px;
  background: #faf8f5;
  border-radius: 8px;
}
</style>