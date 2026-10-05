<template>
  <div class="color-field">
    <span v-if="label" class="color-field__label">
      {{ label }}
      <FieldHint v-if="hint" :text="hint" />
    </span>

    <div class="color-field__control">
      <ColorInputRow
        :model-value="modelValue"
        :size="size"
        :show-alpha="showAlpha"
        :default-value="defaultValue"
        :predefine="predefine"
        :aria-label="`${label || '颜色'}色号`"
        @update:model-value="(v: string | null) => emit('update:modelValue', v || '')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import ColorInputRow from '@/components/ColorInputRow.vue'
import FieldHint from './FieldHint.vue'

/**
 * 配色字段基件 —— 装修器右侧属性面板里的统一入口。
 *
 * 布局：左标签（可带 ? 说明）+ 右「色块 + Hex 输入 + 工具组」。
 * 三段式结构与取色细节全部由 `ColorInputRow` 承担，本组件只负责
 * 「标签 + 受控值 + 归一化回写」这一层语义。
 *
 * 🔴 2026-10-06：原来这里是裸 `el-color-picker` + 独立 input。
 * EP 的 trigger 内部有绝对定位的色块层 + 居中 clear 图标，在 108px 宽
 * trigger 里会盖住色块并溢出上下边框；现在统一走 ColorInputRow。
 *
 * Hex 输入接受 #rgb / #rrggbb / rrggbb / rgb(...) / rgba(...,a)，
 * 非法值静默打回不抛错（面板里高频输入，弹 toast 会烦）。
 */
const props = withDefaults(
  defineProps<{
    modelValue?: string | null
    /** 字段标签；由外层 el-form-item 提供 label 时可省略 */
    label?: string
    /** 「?」悬浮说明 */
    hint?: string
    /** 当前值偏离该默认色时，在工具组里显示「恢复默认」 */
    defaultValue?: string
    /** 预设主题色（不传则用品牌默认色板） */
    predefine?: string[]
    showAlpha?: boolean
    size?: 'large' | 'default' | 'small'
  }>(),
  {
    modelValue: '',
    label: '',
    hint: '',
    defaultValue: '',
    showAlpha: false,
    size: 'small',
  }
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

void props
</script>

<style scoped>
.color-field {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.color-field__label {
  display: inline-flex;
  align-items: center;
  flex: none;
  color: #6b5b4e;
  font-size: 13px;
  white-space: nowrap;
}

/* 控件区占满剩余宽度，与面板右边缘对齐 */
.color-field__control {
  flex: 1 1 auto;
  min-width: 0;
}
</style>