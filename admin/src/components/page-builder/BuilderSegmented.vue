<template>
  <div
    class="wb-seg"
    :class="[`wb-seg--${size}`, { 'wb-seg--block': block, 'wb-seg--disabled': disabled }]"
    role="radiogroup"
    :aria-label="ariaLabel"
  >
    <span
      class="wb-seg__thumb"
      :style="thumbStyle"
      aria-hidden="true"
    ></span>
    <button
      v-for="opt in options"
      :key="String(opt.value)"
      type="button"
      role="radio"
      class="wb-seg__item"
      :class="{ 'is-on': opt.value === modelValue, 'is-off': isOff(opt.value) }"
      :disabled="disabled || opt.disabled"
      :aria-checked="opt.value === modelValue"
      :title="opt.title"
      @click="pick(opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface SegOption {
  value: string | number
  label: string
  disabled?: boolean
  title?: string
}

const props = withDefaults(
  defineProps<{
    modelValue: string | number
    options: SegOption[]
    size?: 'sm' | 'md'
    /** 铺满整行；否则按内容宽度自适应 */
    block?: boolean
    disabled?: boolean
    /** 空字符串（跟随全局）不算选中项，滑块落到第一个可选项上做视觉兜底 */
    fallbackValue?: string | number
    ariaLabel?: string
  }>(),
  { size: 'sm', block: false, disabled: false, ariaLabel: '分段选择' },
)

const emit = defineEmits<{ 'update:modelValue': [value: string | number] }>()

/** 实际高亮下标：空值（跟随全局）时用 fallback 兜底，避免出现「没选中但滑块消失」 */
const activeIndex = computed(() => {
  const idx = props.options.findIndex((o) => o.value === props.modelValue)
  if (idx >= 0) return idx
  const fb = props.options.findIndex((o) => o.value === props.fallbackValue)
  return fb >= 0 ? fb : 0
})

/** 只有真选中的项才上高亮色（fallback 兜底位保持普通底色） */
function isOff(value: string | number) {
  return value !== props.modelValue
}

const thumbStyle = computed(() => {
  const n = Math.max(props.options.length, 1)
  const idx = activeIndex.value
  return {
    width: `calc((100% - 6px) / ${n})`,
    transform: `translateX(calc(${idx} * 100%))`,
    left: '3px',
  }
})

function pick(value: string | number) {
  if (props.disabled) return
  if (value === props.modelValue) return
  emit('update:modelValue', value)
}
</script>

<style scoped>
.wb-seg {
  position: relative;
  display: inline-flex;
  align-items: stretch;
  gap: 0;
  max-width: 100%;
  padding: 3px;
  background: var(--wb-soft, #f4efe8);
  border: 1px solid var(--wb-line, #e8dfd3);
  border-radius: 9px;
  isolation: isolate;
}

.wb-seg--block {
  display: flex;
  width: 100%;
}

.wb-seg--disabled {
  opacity: 0.55;
  pointer-events: none;
}

/* 滑动滑块：白底 + 极轻投影，选中态只有「白底 + 主色字」，不再用大色块 */
.wb-seg__thumb {
  position: absolute;
  top: 3px;
  bottom: 3px;
  z-index: 0;
  background: #fff;
  border-radius: 7px;
  box-shadow: 0 1px 2px rgb(42 31 23 / 10%), 0 0 0 1px rgb(42 31 23 / 5%);
  transition: transform 0.22s cubic-bezier(0.32, 0.72, 0, 1);
}

@media (prefers-reduced-motion: reduce) {
  .wb-seg__thumb { transition: none; }
}

.wb-seg__item {
  position: relative;
  z-index: 1;
  flex: 1 1 auto;
  min-width: 0;
  padding: 0 10px;
  color: var(--wb-mute, #6b5b4e);
  font-family: inherit;
  font-size: 12px;
  line-height: 24px;
  white-space: nowrap;
  text-align: center;
  background: transparent;
  border: 0;
  border-radius: 7px;
  cursor: pointer;
  transition: color 0.16s ease;
}

.wb-seg--sm .wb-seg__item {
  line-height: 22px;
}

.wb-seg--md .wb-seg__item {
  padding: 0 14px;
  font-size: 13px;
  line-height: 28px;
}

.wb-seg__item:hover:not(:disabled) {
  color: var(--el-color-primary, #c08e6e);
}

.wb-seg__item.is-on {
  color: var(--el-color-primary, #c08e6e);
  font-weight: 600;
}

.wb-seg__item:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
