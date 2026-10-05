<template>
  <!-- 必须用 component :is 绑原生 ElSwitch，不能写 <el-switch>：
       本组件已被注册为全局 el-switch，模板里的同名词会解析回自己造成无限递归 -->
  <component
    :is="ElSwitch"
    ref="innerRef"
    :model-value="modelValue"
    :disabled="disabled"
    :loading="loading"
    :size="size"
    :width="resolvedWidth"
    :inline-prompt="resolvedInlinePrompt"
    :inactive-action-icon="inactiveActionIcon"
    :active-action-icon="activeActionIcon"
    :active-icon="activeIcon"
    :inactive-icon="inactiveIcon"
    :active-text="resolvedActiveText"
    :inactive-text="resolvedInactiveText"
    :active-value="activeValue"
    :inactive-value="inactiveValue"
    :name="name"
    :validate-event="validateEvent"
    :before-change="beforeChange"
    :id="id"
    :tabindex="tabindex"
    :aria-label="ariaLabel"
    @update:model-value="onUpdate"
    @change="onChange"
  >
    <template v-for="(_, slotName) in $slots" #[slotName]="slotProps">
      <slot :name="slotName" v-bind="slotProps || {}" />
    </template>
  </component>
</template>

<script lang="ts">
/** 显式命名，避免与全局注册的 el-switch 混淆 */
export default { name: 'DsSwitch' }
</script>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Component } from 'vue'
import { ElSwitch } from 'element-plus'

/** element-plus 的 IconPropType 未从包根导出，这里按其真实定义（string | Component）等价声明 */
type IconPropType = string | Component

/**
 * 全局 el-switch 包装。
 *
 * 要解决的问题：属性面板里的 el-switch 只有颜色变化（关 = 浅灰底 + 白滑块 / 开 = 主题色底），
 * 窄侧栏里两态区分度不够，运营扫一眼看不出当前是开还是关。
 *
 * 处理方式：调用方没给文字时，自动补 inline-prompt +「开 / 关」，
 * 形成「颜色 + 文字」双重提示。
 *
 * 兼容性红线（不能破坏现有上百处调用）：
 *  - 调用方传了 active-text / inactive-text / active-icon / inactive-icon
 *    → 视为它自己管文字，不强塞 inline-prompt、不改 width，完全保持原行为；
 *  - 调用方传了 inline-prompt → 原样沿用；
 *  - 其余 props / emits / slots 全量透传，行为与原生 el-switch 一致。
 */
/**
 * 注意：Boolean 类型的 prop 在 Vue 里会被强转（未传 = false），这会坑掉两处逻辑——
 *  1) inlinePrompt 未传时是 false 而不是 undefined，「调用方没管」的判断会失效；
 *  2) activeValue 未传时是 false，而 Element 语义里默认值应为 true，
 *     若被强转成 false，所有开关都会恒定显示为「开」。
 * 所以这里用 withDefaults 显式写死语义默认值，不用 Boolean 简写。
 */
const props = withDefaults(
  defineProps<{
    modelValue?: boolean | string | number
    disabled?: boolean
    loading?: boolean
    size?: '' | 'default' | 'small' | 'large'
    width?: string | number
    inlinePrompt?: boolean
    inactiveActionIcon?: IconPropType
    activeActionIcon?: IconPropType
    activeIcon?: IconPropType
    inactiveIcon?: IconPropType
    activeText?: string
    inactiveText?: string
    activeValue?: boolean | string | number
    inactiveValue?: boolean | string | number
    name?: string
    validateEvent?: boolean
    beforeChange?: () => Promise<boolean> | boolean
    id?: string
    tabindex?: string | number
    ariaLabel?: string
  }>(),
  {
    inlinePrompt: undefined,
    activeValue: true,
    inactiveValue: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [val: boolean | string | number]
  change: [val: boolean | string | number]
  input: [val: boolean | string | number]
}>()

const innerRef = ref<InstanceType<typeof ElSwitch> | null>(null)

/** 调用方是否自带文字/图标（自带就别插手，避免把并排文字塞进轨道） */
const callerOwnsText = computed(
  () => !!(props.activeText || props.inactiveText || props.activeIcon || props.inactiveIcon),
)

/** 只在「调用方没管文字、也没显式关掉 inline-prompt」时才补默认的 开 / 关 */
const usesDefaultPrompt = computed(() => !callerOwnsText.value && props.inlinePrompt !== false)

const resolvedInlinePrompt = computed(() =>
  props.inlinePrompt === undefined ? usesDefaultPrompt.value : props.inlinePrompt,
)

const resolvedActiveText = computed(() => (usesDefaultPrompt.value ? '开' : props.activeText))
const resolvedInactiveText = computed(() => (usesDefaultPrompt.value ? '关' : props.inactiveText))

/**
 * 内嵌文字时轨道要够宽，否则 Element 默认 40px 会把文字挤掉/裁切
 * （实测 active-text="Tab" 这种 3 个字母会被截掉半截）。
 * 算法：按两态里较长的那个估宽（中文全宽 12px / ASCII 半宽 7.5px，12px 粗体口径），
 *      再加左右滑块各 20px 的空间，取 max(基础宽度, 估算宽度)，避免切换时轨道宽度跳变。
 */
const resolvedWidth = computed(() => {
  if (props.width !== undefined) return props.width
  if (!resolvedInlinePrompt.value) return undefined

  const measure = (s: string | undefined) => {
    let w = 0
    for (const ch of String(s ?? '')) w += /[\u4e00-\u9fff]/.test(ch) ? 12 : 7.5
    return w
  }
  const longest = Math.max(
    measure(resolvedActiveText.value),
    measure(resolvedInactiveText.value),
  )
  const base = props.size === 'small' ? 44 : 52
  return Math.max(base, Math.ceil(longest + 32))
})

function onUpdate(val: boolean | string | number) {
  emit('update:modelValue', val)
  emit('input', val)
}

function onChange(val: boolean | string | number) {
  emit('change', val)
}

defineExpose({
  /** 透出底层实例，现有调用方若用 ref 调 focus/blur 不受影响 */
  focus: () => (innerRef.value as any)?.focus?.(),
  blur: () => (innerRef.value as any)?.blur?.(),
})
</script>