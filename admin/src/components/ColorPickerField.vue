<template>
  <div
    class="color-picker-field"
    :class="[`is-${size || 'default'}`, { 'is-disabled': disabled }]"
    v-bind="forwardAttrs"
  >
    <ColorInputRow
      :model-value="modelValue ?? undefined"
      :disabled="disabled"
      :size="size"
      :show-alpha="showAlpha"
      :color-format="colorFormat"
      :predefine="predefine"
      :clearable="clearable"
      :hex-input="hexInput"
      :teleported="teleported"
      :popper-class="popperClass"
      :host-style="hostStyle"
      @update:model-value="onUpdate"
      @change="onChange"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import ColorInputRow from './ColorInputRow.vue'

/**
 * 全局 `el-color-picker` 的替换件（见 `main.ts` 的 app.component 注册）。
 *
 * 🔴 2026-10-06 重构。原来这里内联裸 `el-color-picker` + 一个吸管按钮，靠
 * `.color-picker-field{display:inline-flex}` 兜住；加上 `props-panel-typography.scss`
 * 把 trigger 撑到 108px，EP 内部**绝对定位**的色块层与居中 clear 图标就
 * 盖在色块正中、还溢出上下边框（运营点一下就清色）。
 * 现在整体交给 `ColorInputRow`（色块 / Hex 输入 / 工具组 横向 Flex）。
 *
 * 对外 props / emits 与重构前逐字一致，历史调用方零改动即受益。
 * `hexInput=false` 是给极窄场景（工具条、表格单元格）留的逃生口。
 */
defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    modelValue?: string | null
    disabled?: boolean
    size?: 'large' | 'default' | 'small'
    showAlpha?: boolean
    /** EP 的色值格式；类型与 ColorInputRow 保持一致（手写 string 会报 TS2322） */
    colorFormat?: '' | 'name' | 'rgb' | 'prgb' | 'hex' | 'hex3' | 'hex4' | 'hex6' | 'hex8' | 'hsl' | 'hsv' | 'cmyk'
    predefine?: string[]
    clearable?: boolean
    /** 是否显示中间的色值输入框；默认开启 */
    hexInput?: boolean
    teleported?: boolean
    popperClass?: string
  }>(),
  {
    clearable: true,
    hexInput: true,
    teleported: true,
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string | null | undefined]
  change: [value: string | null | undefined]
  /** 保留历史事件名；ColorInputRow 不产生 activeChange，转发为当前值 */
  activeChange: [value: string | null]
}>()

const attrs = useAttrs()

/**
 * class / style 不下传给 EP 的 trigger（否则调用方写的 width 会被
 * 我们的固定色块宽度吃掉），但要落回容器 —— 容器才是布局的真正主体。
 */
const forwardAttrs = computed(() => {
  const next: Record<string, unknown> = { ...attrs }
  delete next.class
  delete next.style
  return next
})

const hostStyle = computed(() => (attrs.style as Record<string, string>) || {})

function onUpdate(value: string | null | undefined) {
  emit('update:modelValue', value)
  emit('activeChange', value ?? null)
}

function onChange(value: string | null | undefined) {
  emit('change', value)
  emit('update:modelValue', value)
}

void props
</script>

<style scoped>
.color-picker-field {
  display: block;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  vertical-align: middle;
}
.color-picker-field.is-disabled { opacity: 0.75; }
</style>