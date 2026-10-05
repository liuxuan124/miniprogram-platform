<template>
  <div class="csr" :class="{ 'is-disabled': disabled }">
    <span v-if="label" class="csr__label">
      {{ label }}
      <el-tooltip v-if="hint" :content="hint" placement="top" :show-after="200">
        <span class="csr__q" :aria-label="`${label} 说明`" role="button" tabindex="0">?</span>
      </el-tooltip>
    </span>

    <el-slider
      class="csr__bar"
      :model-value="current"
      :min="min"
      :max="max"
      :step="step"
      :disabled="disabled"
      :show-tooltip="false"
      @update:model-value="onSlide"
    />

    <el-input-number
      class="csr__num"
      :model-value="current"
      :min="min"
      :max="max"
      :step="step"
      :disabled="disabled"
      :controls="false"
      size="small"
      @change="onInput"
    />
    <span class="csr__unit">{{ unit }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

/**
 * 紧凑单行「标签 + 滑块 + 数字」三联控件（2026-10-06 样式 Tab 降噪新增）。
 *
 * 🔴 为什么不用旧的 `NumSliderRow`：那个只有「滑块 + 数字 + px」，
 * 标签放在面板外层的 `fld__lab` 里，于是**一个字段要占两行**（标签行 + 控件行），
 * 标签一长还会换行。样式 Tab 里一个组件动辄 8~10 个数值字段，
 * 两行一套 = 面板高度翻倍，必须滚动很久才能看完。
 * 本控件把标签收进同一行，整行高度锁死 32px。
 *
 * 布局：`label 固定 80px`（`flex:none`，超长省略不撑破） + `slider flex:1` +
 * `number 68px` + `单位`。三段都在一行，且「?」说明挂在标签右侧而不是另起一行。
 */
const props = withDefaults(
  defineProps<{
    modelValue?: number | null
    min?: number
    max?: number
    step?: number
    /** 越界兜底值（留空用 min） */
    fallback?: number
    /** 字段名；留空则只出滑块+数字（兼容旧的纯数值用法） */
    label?: string
    /** 「?」悬浮说明；给了才渲染问号 */
    hint?: string
    /** 数字框后缀单位 */
    unit?: string
    disabled?: boolean
  }>(),
  { min: 0, max: 48, step: 1, label: '', hint: '', unit: 'px', disabled: false },
)

const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

const fallback = computed(() => props.fallback ?? props.min)

/** 展示值也夹紧：手输 999 时输入框立即回弹，不让非法值停留在界面 */
const current = computed(() => {
  const n = Number(props.modelValue)
  if (!Number.isFinite(n)) return fallback.value
  return Math.min(props.max, Math.max(props.min, n))
})

function onSlide(v: number | number[]) {
  emit('update:modelValue', clamp(Number(v)))
}

function onInput(v: number | undefined | null) {
  emit('update:modelValue', clamp(Number(v)))
}

/** 🔴 先判空再 Number：`Number('')` 是 0 且有限，直接夹会把清空动作变成「置 0」 */
function clamp(n: number): number {
  if (!Number.isFinite(n)) return fallback.value
  return Math.min(props.max, Math.max(props.min, Math.round(n / props.step) * props.step))
}
</script>

<style scoped>
.csr {
  display: flex;
  align-items: center;
  gap: 8px;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  height: 32px;
}

.csr__label {
  display: flex;
  align-items: center;
  gap: 3px;
  flex: none;
  width: 80px;
  min-width: 0;
  overflow: hidden;
  color: #64748b;
  font-size: 12px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* 问号：7px 实心圆，hover 才显出底色，不抢视觉 */
.csr__q {
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
.csr__q:hover,
.csr__q:focus-visible {
  color: #64748b;
  background: #f1f5f9;
  border-color: #cbd5e1;
  outline: none;
}

.csr__bar {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
}

/* EP slider 默认 6px 高轨 + 两侧 padding，单行里显得松；压到 4px 并去掉右侧留白 */
.csr__bar :deep(.el-slider__runway) { height: 4px; margin: 8px 0; }
.csr__bar :deep(.el-slider__bar) { height: 4px; }
.csr__bar :deep(.el-slider__button) { width: 12px; height: 12px; border-width: 2px; }

.csr__num {
  flex: none;
  width: 66px;
}

.csr__unit {
  flex: none;
  width: 16px;
  color: #a8b3c4;
  font-size: 11px;
}

:deep(.csr__num .el-input__inner) {
  height: 28px;
  padding-right: 4px;
  padding-left: 8px;
  text-align: right;
}

.csr.is-disabled { opacity: 0.6; }
</style>