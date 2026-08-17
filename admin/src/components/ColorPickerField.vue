<template>
  <div class="color-picker-field" :class="[`is-${size || 'default'}`, { 'is-disabled': disabled }]">
    <BaseColorPicker
      :model-value="modelValue ?? undefined"
      :disabled="disabled"
      :size="size"
      :show-alpha="showAlpha"
      :color-format="colorFormat as any"
      :predefine="predefine"
      :clearable="clearable"
      :teleported="teleported"
      :popper-class="popperClass"
      v-bind="forwardAttrs"
      @update:model-value="onUpdate"
      @change="onChange"
      @active-change="(v: string | null) => emit('activeChange', v)"
    />
    <button
      v-if="eyedropperSupported"
      type="button"
      class="eyedropper-btn"
      :disabled="disabled || picking"
      title="吸管取色（点击后吸取屏幕颜色）"
      aria-label="吸管取色"
      @click.stop="pickFromScreen"
    >
      <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
        <path
          fill="currentColor"
          d="M20.71 5.63l-2.34-2.34a1 1 0 0 0-1.41 0l-3.12 3.12-1.23-1.21-1.42 1.42 1.21 1.23-6.96 6.96c-.39.39-.39 1.02 0 1.41l.2.2-2.54 2.54a1.25 1.25 0 0 0 1.77 1.77l2.54-2.54.2.2c.39.39 1.02.39 1.41 0l6.96-6.96 1.23 1.21 1.42-1.42-1.21-1.23 3.12-3.12a1 1 0 0 0 0-1.41zM7.5 15.09L13.59 9H15l-6.09 6.09H7.5z"
        />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useAttrs } from 'vue'
import { ElColorPicker as BaseColorPicker, ElMessage } from 'element-plus'

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  modelValue?: string | null
  disabled?: boolean
  size?: 'large' | 'default' | 'small'
  showAlpha?: boolean
  colorFormat?: string
  predefine?: string[]
  clearable?: boolean
  teleported?: boolean
  popperClass?: string
}>(), {
  clearable: true,
  teleported: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: string | null | undefined]
  change: [value: string | null | undefined]
  activeChange: [value: string | null]
}>()

const attrs = useAttrs()
const picking = ref(false)

const eyedropperSupported = computed(() => typeof window !== 'undefined' && 'EyeDropper' in window)

const forwardAttrs = computed(() => {
  const next: Record<string, unknown> = { ...attrs }
  delete next.class
  delete next.style
  return next
})

function onUpdate(value: string | null | undefined) {
  emit('update:modelValue', value)
}

function onChange(value: string | null | undefined) {
  emit('change', value)
  emit('update:modelValue', value)
}

async function pickFromScreen() {
  if (!eyedropperSupported.value || props.disabled || picking.value) return
  const EyeDropperCtor = (window as any).EyeDropper
  if (!EyeDropperCtor) return
  picking.value = true
  try {
    const dropper = new EyeDropperCtor()
    const result = await dropper.open()
    const hex = String(result?.sRGBHex || '').trim()
    if (!hex) return
    onChange(hex)
  } catch (err: any) {
    if (err?.name !== 'AbortError') {
      ElMessage.warning('取色失败，请重试或改用色板')
    }
  } finally {
    picking.value = false
  }
}
</script>

<style scoped lang="scss">
.color-picker-field {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  vertical-align: middle;
}

.eyedropper-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  background: #fff;
  color: #606266;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s;

  &:hover:not(:disabled) {
    border-color: #1769ff;
    color: #1769ff;
    background: #f0f6ff;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.color-picker-field.is-small .eyedropper-btn {
  width: 24px;
  height: 24px;
  border-radius: 4px;
}

.color-picker-field.is-large .eyedropper-btn {
  width: 32px;
  height: 32px;
}
</style>
