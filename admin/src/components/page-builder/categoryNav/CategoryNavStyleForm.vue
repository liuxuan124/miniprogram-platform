<template>
  <div class="cnv-style">
    <!-- 图标形状 -->
    <div class="cnv-sfield">
      <label class="cnv-slabel">
        图标形状
        <FieldHint text="圆形最通用；圆角矩形偏「卡片感」；直角更硬朗；无背景原图适合已自带底色的图标。" />
      </label>
      <div class="cnv-shape-row">
        <button
          v-for="opt in SHAPE_OPTIONS"
          :key="opt.value"
          type="button"
          class="cnv-shape"
          :class="{ 'is-on': config.icon_shape === opt.value }"
          @click="patch({ icon_shape: opt.value })"
        >
          <span class="cnv-shape__demo" :class="`is-${opt.value}`">
            <span class="cnv-shape__ico"></span>
          </span>
          <span class="cnv-shape__label">{{ opt.label }}</span>
        </button>
      </div>
    </div>

    <!-- 文字颜色 -->
    <div class="cnv-sfield">
      <label class="cnv-slabel">
        文字
        <FieldHint text="分类名与副标题分两组配色；副标题建议比主标题浅一档，层次更清楚。" />
      </label>
      <div class="cnv-color">
        <span class="cnv-color__label">分类名</span>
        <ColorPickerField
          class="cnv-color__ctrl"
          :model-value="config.title_color"
          :show-alpha="true"
          :default-value="DEFAULTS.title_color"
          @update:model-value="(v: string) => patch({ title_color: v })"
        />
      </div>
      <div class="cnv-color">
        <span class="cnv-color__label">副标题</span>
        <ColorPickerField
          class="cnv-color__ctrl"
          :model-value="config.subtitle_color"
          :show-alpha="true"
          :default-value="DEFAULTS.subtitle_color"
          @update:model-value="(v: string) => patch({ subtitle_color: v })"
        />
      </div>
    </div>

    <!-- 副标题字号 -->
    <div class="cnv-sfield">
      <label class="cnv-slabel">副标题字号</label>
      <NumSliderRow
        :model-value="config.subtitle_size"
        :min="SUB_SIZE.min"
        :max="SUB_SIZE.max"
        :step="SUB_SIZE.step"
        :fallback="SUB_SIZE.fallback"
        @update:model-value="(v: number) => patch({ subtitle_size: v })"
      />
      <div class="cnv-hint">
        留空副标题的分类项不受此设置影响（画布只显示单行标题）。
      </div>
    </div>

    <!-- 模块背景 -->
    <div class="cnv-sfield">
      <label class="cnv-slabel">
        模块背景
        <FieldHint text="页面本身已有底色时选通栏透明；想让分类位从长列表里跳出来就选白色卡片。" />
      </label>
      <div class="cnv-surface-row">
        <button
          v-for="opt in SURFACE_OPTIONS"
          :key="opt.value"
          type="button"
          class="cnv-surface"
          :class="{ 'is-on': config.surface === opt.value }"
          @click="patch({ surface: opt.value })"
        >
          <span class="cnv-surface__demo" :class="`is-${opt.value}`">
            <i></i><i></i><i></i>
          </span>
          <span class="cnv-surface__label">{{ opt.label }}</span>
          <span class="cnv-surface__desc">{{ opt.desc }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import ColorPickerField from '../ColorPickerField.vue'
import FieldHint from '../FieldHint.vue'
// ⚠️ NumSliderRow 在 props/ 目录，不在本目录 —— 相对路径写 ../NumSliderRow.vue
// 会解析成 categoryNav/NumSliderRow.vue，构建直接报 Could not resolve。
import NumSliderRow from '../props/NumSliderRow.vue'
import {
  CATEGORY_NAV_DEFAULT_PROPS,
  CATEGORY_NAV_ICON_SHAPE_OPTIONS,
  CATEGORY_NAV_SURFACE_OPTIONS,
  CATEGORY_NAV_SUBTITLE_SIZE,
  type CategoryNavIconShape,
  type CategoryNavProps,
  type CategoryNavSurface,
} from '../categoryNav/categoryNavSchema'

const props = defineProps<{ config: CategoryNavProps }>()
const emit = defineEmits<{ patch: [partial: Record<string, unknown>] }>()

const SHAPE_OPTIONS = CATEGORY_NAV_ICON_SHAPE_OPTIONS
const SURFACE_OPTIONS = CATEGORY_NAV_SURFACE_OPTIONS
const SUB_SIZE = CATEGORY_NAV_SUBTITLE_SIZE
const DEFAULTS = CATEGORY_NAV_DEFAULT_PROPS

function patch(partial: Record<string, unknown>) {
  emit('patch', partial)
}
</script>

<style lang="scss" scoped>
.cnv-sfield {
  margin-top: 14px;
}

.cnv-sfield:first-child {
  margin-top: 2px;
}

.cnv-slabel {
  display: flex;
  align-items: center;
  margin-bottom: 7px;
  font-size: 12px;
  color: #6b5b4e;
}

.cnv-hint {
  margin-top: 6px;
  font-size: 11px;
  line-height: 1.5;
  color: #a89c8d;
}

/* ---------- 图标形状 ---------- */
.cnv-shape-row {
  display: flex;
  gap: 6px;
}

.cnv-shape {
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

.cnv-shape__demo {
  display: grid;
  place-items: center;
  width: 100%;
  height: 30px;
  background: #f1ede6;
  border: 1px solid #ddd5c9;
  border-radius: 6px;
}

.cnv-shape__ico {
  display: block;
  width: 18px;
  height: 18px;
  background: #b8a99a;
}

.cnv-shape__demo.is-circle .cnv-shape__ico { border-radius: 50%; }
.cnv-shape__demo.is-round .cnv-shape__ico { border-radius: 6px; }
.cnv-shape__demo.is-square .cnv-shape__ico { border-radius: 0; }

/* 无背景：只画图标本身，不给色块 */
.cnv-shape__demo.is-none {
  background: transparent;
  border-style: dashed;
}

.cnv-shape__demo.is-none .cnv-shape__ico {
  background: #c8bcae;
  border-radius: 50%;
}

.cnv-shape__label {
  font-size: 11px;
  color: #6b5b4e;
}

.cnv-shape.is-on .cnv-shape__label {
  font-weight: 600;
  color: var(--el-color-primary, #c08e6e);
}

/* ---------- 颜色 ---------- */
.cnv-color {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 7px;
}

.cnv-color__label {
  flex: none;
  width: 52px;
  font-size: 12px;
  color: #8a7d6f;
}

.cnv-color__ctrl {
  flex: 1;
  min-width: 0;
}

/* ---------- 模块背景 ---------- */
.cnv-surface-row {
  display: flex;
  gap: 6px;
}

.cnv-surface {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 3px;
  padding: 8px 8px 7px;
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

.cnv-surface__demo {
  display: flex;
  gap: 3px;
  align-items: center;
  justify-content: center;
  height: 28px;
  margin-bottom: 2px;

  i {
    display: block;
    width: 12px;
    height: 12px;
    background: #d8cfc2;
    border-radius: 3px;
  }
}

/* 通栏透明：底色与面板一致，只有图标块 */
.cnv-surface__demo.is-transparent {
  background: repeating-linear-gradient(45deg, #fbfaf8, #fbfaf8 5px, #f5f1eb 5px, #f5f1eb 10px);
  border: 1px dashed #ddd5c9;
  border-radius: 6px;
}

/* 白色卡片：白底 + 圆角 + 投影 */
.cnv-surface__demo.is-card {
  background: #fff;
  border-radius: 7px;
  box-shadow: 0 2px 8px rgba(42, 31, 23, 0.12);
}

.cnv-surface__label {
  font-size: 12px;
  font-weight: 600;
  color: #3f3a35;
}

.cnv-surface__desc {
  font-size: 10.5px;
  line-height: 1.4;
  color: #a89c8d;
}

.cnv-surface.is-on .cnv-surface__label {
  color: var(--el-color-primary, #c08e6e);
}
</style>
